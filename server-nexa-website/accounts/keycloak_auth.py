"""
Backend-for-Frontend (BFF) client for Keycloak's OpenID token endpoint.

Option 3 of the Keycloak migration: the custom React UI keeps its own login form, and
Django brokers the credentials to Keycloak server-side using the *confidential* BFF
client (`nexa-backend-bff`). This keeps the client secret and the credential exchange
off the browser — the defensible way to use the Direct Access Grant (password) flow.

Social logins (Google/Microsoft/GitHub) do NOT come through here — they cannot, as
external IdPs require the redirect (Authorization Code) flow. Those land in
`exchange_code()` after the browser returns from Keycloak with an authorization code.

See .claude/docs/KEYCLOAK_MIGRATION_REFINED.md (Phase 4 / Option 3).
"""
import logging
from urllib.parse import quote

import requests
from django.conf import settings
from rest_framework.exceptions import AuthenticationFailed

logger = logging.getLogger(__name__)

_TIMEOUT = 15


def _realm_base() -> str:
    return f'{settings.KEYCLOAK_SERVER_URL}/realms/{quote(settings.KEYCLOAK_REALM)}'


def _token_url() -> str:
    return f'{_realm_base()}/protocol/openid-connect/token'


def _logout_url() -> str:
    return f'{_realm_base()}/protocol/openid-connect/logout'


def _client_creds() -> dict:
    return {
        'client_id': settings.KEYCLOAK_BFF_CLIENT_ID,
        'client_secret': settings.KEYCLOAK_BFF_CLIENT_SECRET,
    }


def _configured() -> bool:
    return bool(settings.KEYCLOAK_SERVER_URL and settings.KEYCLOAK_BFF_CLIENT_SECRET)


def password_grant(username: str, password: str, otp: str | None = None) -> dict:
    """Direct Access Grant. Returns the Keycloak token set, or raises AuthenticationFailed."""
    data = {
        **_client_creds(),
        'grant_type': 'password',
        'username': username,
        'password': password,
        'scope': 'openid profile email',
    }
    if otp:
        data['totp'] = otp  # Keycloak accepts `totp` for direct-grant OTP flows
    return _post_token(data, generic_error='Incorrect email or password.')


def exchange_code(code: str, code_verifier: str, redirect_uri: str) -> dict:
    """Exchange an authorization code (from a social/redirect login) for tokens."""
    data = {
        **_client_creds(),
        'grant_type': 'authorization_code',
        'code': code,
        'code_verifier': code_verifier,
        'redirect_uri': redirect_uri,
    }
    return _post_token(data, generic_error='Sign-in could not be completed.')


def refresh_grant(refresh_token: str) -> dict:
    data = {**_client_creds(), 'grant_type': 'refresh_token', 'refresh_token': refresh_token}
    return _post_token(data, generic_error='Session expired.')


def logout(refresh_token: str) -> None:
    """Best-effort revocation of the Keycloak session. Never raises."""
    if not (_configured() and refresh_token):
        return
    try:
        requests.post(_logout_url(), data={**_client_creds(), 'refresh_token': refresh_token},
                      timeout=_TIMEOUT)
    except requests.RequestException:
        logger.warning('Keycloak logout call failed', exc_info=True)


def _post_token(data: dict, generic_error: str) -> dict:
    if not _configured():
        raise AuthenticationFailed('Keycloak BFF client is not configured.')
    try:
        resp = requests.post(_token_url(), data=data, timeout=_TIMEOUT)
    except requests.RequestException:
        logger.error('Keycloak token endpoint unreachable', exc_info=True)
        raise AuthenticationFailed('Authentication service is unavailable. Please try again.')

    if resp.status_code == 200:
        return resp.json()

    try:
        body = resp.json()
    except ValueError:
        body = {}
    error = body.get('error', '')
    desc = body.get('error_description', '')
    # invalid_grant covers bad password, disabled account, unset password and OTP issues.
    # The client always gets one generic message (never reveal which), but log Keycloak's
    # real reason server-side — without it these failures are undiagnosable.
    if error == 'invalid_grant':
        logger.warning('Keycloak rejected credentials for %s: %s',
                       data.get('username', '<no username>'), desc or '(no description)')
        raise AuthenticationFailed(generic_error)
    logger.warning('Keycloak token error: %s %s', error, desc)
    raise AuthenticationFailed(desc or generic_error)
