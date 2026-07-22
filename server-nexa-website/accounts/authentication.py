import logging

import jwt
from jwt import PyJWKClient
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from rest_framework import authentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed

logger = logging.getLogger(__name__)

# One JWKS client per process — it caches signing keys internally (default 300s).
_jwks_client = None


def _get_jwks_client():
    global _jwks_client
    if _jwks_client is None and settings.KEYCLOAK_JWKS_URL:
        _jwks_client = PyJWKClient(settings.KEYCLOAK_JWKS_URL)
    return _jwks_client


class KeycloakJWTAuthentication(authentication.BaseAuthentication):
    """
    Validates Keycloak-issued access tokens against the realm JWKS and resolves the
    Django user by `keycloak_sub` (falling back to email, then just-in-time creation).

    Returns None — rather than raising — for anything that is not a Keycloak token
    (no bearer header, or a token from a different issuer, e.g. a legacy SimpleJWT
    session). That lets DRF fall through to the next authentication class during the
    dual-run migration window. It only raises AuthenticationFailed when a token
    *claims* to be from Keycloak but fails verification.
    """

    keyword = 'Bearer'

    def authenticate(self, request):
        if not settings.KEYCLOAK_ISSUER:
            return None  # Keycloak not configured — stay inert.

        auth = authentication.get_authorization_header(request).split()
        if not auth or auth[0].decode().lower() != self.keyword.lower():
            return None
        if len(auth) != 2:
            return None
        raw_token = auth[1].decode()

        # Peek at the unverified issuer. If it isn't our realm, this isn't a Keycloak
        # token — let the legacy authentication class handle it.
        try:
            unverified = jwt.decode(raw_token, options={'verify_signature': False})
        except jwt.PyJWTError:
            return None
        if unverified.get('iss') != settings.KEYCLOAK_ISSUER:
            return None

        payload = self._verify(raw_token)
        user = self._resolve_user(payload)
        return (user, payload)

    def _verify(self, raw_token):
        client = _get_jwks_client()
        if client is None:
            raise AuthenticationFailed('Keycloak JWKS is not configured.')
        try:
            signing_key = client.get_signing_key_from_jwt(raw_token)
            # Keycloak's default `aud` is often "account"; the client id lands in `azp`.
            # Verify signature/issuer/expiry here and check the audience manually below.
            payload = jwt.decode(
                raw_token,
                signing_key.key,
                algorithms=['RS256'],
                issuer=settings.KEYCLOAK_ISSUER,
                options={'verify_aud': False, 'require': ['exp', 'iss', 'sub']},
            )
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token has expired.')
        except jwt.PyJWTError as exc:
            logger.warning('Keycloak token verification failed: %s', exc)
            raise AuthenticationFailed('Invalid authentication token.')

        if not self._audience_ok(payload):
            raise AuthenticationFailed('Token audience is not accepted.')
        return payload

    @staticmethod
    def _audience_ok(payload) -> bool:
        allowed = getattr(settings, 'KEYCLOAK_ALLOWED_AUDIENCES', None)
        if not allowed:
            expected = settings.KEYCLOAK_AUDIENCE
            allowed = [expected] if expected else []
        if not allowed:
            return True
        aud = payload.get('aud')
        aud_set = set(aud) if isinstance(aud, (list, tuple)) else {aud}
        azp = payload.get('azp')
        return any(a in aud_set or a == azp for a in allowed)

    def _resolve_user(self, payload):
        User = get_user_model()
        sub = payload['sub']
        email = (payload.get('email') or '').strip().lower()

        user = User.objects.filter(keycloak_sub=sub).first()
        if user:
            self._sync_role(user, payload)
            return user

        # Linking or creating by email is only safe if Keycloak has verified that address.
        # An unverified email could be attacker-controlled — linking it to an existing
        # Django account (or provisioning a new one) would be account takeover.
        if email and not payload.get('email_verified', False):
            raise AuthenticationFailed('Email address is not verified.')

        # First request for a user that exists in Django but wasn't linked yet
        # (e.g. created in Keycloak before the migration script backfilled the sub).
        if email:
            user = User.objects.filter(email__iexact=email).first()
            if user:
                user.keycloak_sub = sub
                try:
                    user.save(update_fields=['keycloak_sub'])
                except IntegrityError:
                    user.refresh_from_db(fields=['keycloak_sub'])
                self._sync_role(user, payload)
                return user

        # Just-in-time provisioning for brand-new identities (e.g. a first Google login
        # brokered by Keycloak). Mirrors the old GoogleLoginView auto-create behaviour.
        if not email:
            raise AuthenticationFailed('Token has no email; cannot provision account.')
        display_name = (
            payload.get('name')
            or ' '.join(filter(None, [payload.get('given_name'), payload.get('family_name')]))
            or email.split('@')[0]
        )
        role = 'admin' if 'admin' in self._realm_roles(payload) else 'student'
        user, _ = User.objects.get_or_create(
            email=email,
            defaults={
                'display_name': display_name,
                'role': role,
                'status': 'active',
                'keycloak_sub': sub,
            },
        )
        if not user.keycloak_sub:
            user.keycloak_sub = sub
            user.save(update_fields=['keycloak_sub'])
        return user

    @staticmethod
    def _realm_roles(payload) -> set:
        return set((payload.get('realm_access') or {}).get('roles') or [])

    def _sync_role(self, user, payload):
        """Keep the coarse identity role in step with the token. Never touches the
        Django-owned RBAC (staff_role / individual_permissions)."""
        desired = 'admin' if 'admin' in self._realm_roles(payload) else 'student'
        if user.role != desired:
            user.role = desired
            user.save(update_fields=['role', 'is_staff'] if desired == 'admin' else ['role'])

    def authenticate_header(self, request):
        return self.keyword


class SessionAwareJWTAuthentication(JWTAuthentication):
    """
    Extends JWTAuthentication to reject tokens whose session has been revoked.
    One extra DB query per request — acceptable for an admin/student portal.
    """

    def authenticate(self, request):
        result = super().authenticate(request)
        if result is None:
            return None
        user, token = result
        session_id = token.get('session_id')
        if session_id:
            from .models import LoginSession
            if LoginSession.objects.filter(id=session_id, is_revoked=True).exists():
                raise AuthenticationFailed('This session has been revoked. Please log in again.')
        return user, token
