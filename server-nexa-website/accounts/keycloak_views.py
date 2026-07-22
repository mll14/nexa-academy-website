"""
Option 3 BFF auth endpoints. The React app keeps its own login UI and posts credentials
here; Django brokers them to Keycloak (see accounts/keycloak_auth.py) and manages the
session via an httpOnly cookie holding the Keycloak *refresh* token — mirroring the
native-auth cookie pattern so the frontend contract barely changes.

Endpoints (mounted under /api/auth/keycloak/):
  POST login/          {email, password}            -> {access} + cookie  | {requires_2fa, temp_token}
  POST 2fa/complete/   {temp_token, code}           -> {access} + cookie
  POST social/exchange/{code, code_verifier, redirect_uri} -> {access} + cookie
  POST refresh/        (cookie)                      -> {access} + rotated cookie
  POST logout/         (cookie)                      -> 205

Password logins keep using the existing Django TwoFADevice 2FA (reliable, already built);
detecting "OTP required" over a Direct Access Grant is deliberately ambiguous in Keycloak.
Social logins are 2FA-gated by Keycloak itself during the redirect.
"""
import hashlib
import logging

import pyotp
from django.conf import settings
from django.core import signing
from django.core.cache import cache
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from . import keycloak_auth
from .authentication import KeycloakJWTAuthentication
from .views import LoginRateThrottle, TwoFARateThrottle, User

logger = logging.getLogger(__name__)

_KC_COOKIE = 'kc_refresh_token'
_KC_COOKIE_PATH = '/api/auth/'
_KC_COOKIE_MAX_AGE = 30 * 24 * 60 * 60


def _set_kc_cookie(response, refresh_token: str) -> None:
    response.set_cookie(
        _KC_COOKIE, refresh_token, max_age=_KC_COOKIE_MAX_AGE, httponly=True,
        secure=not settings.DEBUG, samesite='Lax', path=_KC_COOKIE_PATH,
    )


def _clear_kc_cookie(response) -> None:
    response.delete_cookie(_KC_COOKIE, path=_KC_COOKIE_PATH)


def _resolve_user(access_token: str):
    """Verify a Keycloak access token and map it to the Django user (JIT-creates/links)."""
    authr = KeycloakJWTAuthentication()
    payload = authr._verify(access_token)
    return authr._resolve_user(payload)


def _session_response(kc_tokens: dict) -> Response:
    """Adopt the Keycloak token set: access to the client, refresh into the httpOnly cookie."""
    response = Response({'access': kc_tokens['access_token']})
    if kc_tokens.get('refresh_token'):
        _set_kc_cookie(response, kc_tokens['refresh_token'])
    return response


class KeycloakLoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        password = request.data.get('password') or ''
        if not email or not password:
            return Response({'detail': 'Email and password are required.'},
                            status=status.HTTP_400_BAD_REQUEST)

        kc_tokens = keycloak_auth.password_grant(email, password)  # raises 401 on bad creds
        user = _resolve_user(kc_tokens['access_token'])

        device = getattr(user, 'two_fa_device', None)
        if device and device.enabled:
            temp_token = signing.dumps({'uid': str(user.uid)}, salt='2fa-login')
            # Stash the Keycloak refresh token until 2FA is verified, so we never re-send
            # the password. Keyed by the temp_token; short TTL matching the 2FA window.
            cache.set(f'kc_2fa:{hashlib.sha256(temp_token.encode()).hexdigest()}',
                      kc_tokens['refresh_token'], timeout=300)
            return Response({'requires_2fa': True, 'temp_token': temp_token})

        return _session_response(kc_tokens)


class KeycloakTwoFACompleteView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [TwoFARateThrottle]

    def post(self, request):
        temp_token = request.data.get('temp_token', '')
        code = (request.data.get('code') or '').strip()
        if not temp_token or not code:
            return Response({'error': 'temp_token and code are required.'},
                            status=status.HTTP_400_BAD_REQUEST)

        digest = hashlib.sha256(temp_token.encode()).hexdigest()
        used_key = f'2fa_used:{digest}'
        stash_key = f'kc_2fa:{digest}'
        if cache.get(used_key):
            return Response({'error': 'Token expired. Please log in again.'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            payload = signing.loads(temp_token, salt='2fa-login', max_age=300)
        except signing.SignatureExpired:
            return Response({'error': 'Token expired. Please log in again.'},
                            status=status.HTTP_400_BAD_REQUEST)
        except signing.BadSignature:
            return Response({'error': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)

        user = get_object_or_404(User, uid=payload.get('uid'))
        device = getattr(user, 'two_fa_device', None)
        if not device or not device.enabled:
            return Response({'error': '2FA not configured.'}, status=status.HTTP_400_BAD_REQUEST)
        if not pyotp.TOTP(device.secret).verify(code, valid_window=1):
            return Response({'error': 'Invalid code.'}, status=status.HTTP_400_BAD_REQUEST)

        kc_refresh = cache.get(stash_key)
        if not kc_refresh:
            return Response({'error': 'Session expired. Please log in again.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if not cache.add(used_key, True, timeout=300):
            return Response({'error': 'Token expired. Please log in again.'},
                            status=status.HTTP_400_BAD_REQUEST)
        cache.delete(stash_key)

        # Exchange the stashed refresh token for a fresh access token to hand back.
        kc_tokens = keycloak_auth.refresh_grant(kc_refresh)
        return _session_response(kc_tokens)


class KeycloakSocialExchangeView(APIView):
    """Completes a social/redirect login: exchanges the authorization code for tokens."""
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        code = request.data.get('code')
        code_verifier = request.data.get('code_verifier')
        redirect_uri = request.data.get('redirect_uri')
        if not (code and code_verifier and redirect_uri):
            return Response({'detail': 'code, code_verifier and redirect_uri are required.'},
                            status=status.HTTP_400_BAD_REQUEST)
        kc_tokens = keycloak_auth.exchange_code(code, code_verifier, redirect_uri)
        _resolve_user(kc_tokens['access_token'])  # JIT-create/link the Django user
        return _session_response(kc_tokens)


class KeycloakRefreshView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        kc_refresh = request.COOKIES.get(_KC_COOKIE, '')
        if not kc_refresh:
            return Response({'detail': 'No session.'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            kc_tokens = keycloak_auth.refresh_grant(kc_refresh)
        except Exception:
            resp = Response({'detail': 'Session expired.'}, status=status.HTTP_401_UNAUTHORIZED)
            _clear_kc_cookie(resp)
            return resp
        return _session_response(kc_tokens)


class KeycloakLogoutView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        kc_refresh = request.COOKIES.get(_KC_COOKIE, '')
        keycloak_auth.logout(kc_refresh)
        response = Response(status=status.HTTP_205_RESET_CONTENT)
        _clear_kc_cookie(response)
        return response
