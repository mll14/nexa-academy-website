"""
Keycloak Admin REST API client for *runtime* account management.

Distinct from `keycloak_auth.py` (the BFF token-endpoint client, used at login) and from
`scripts/migrate_users_to_keycloak.py` (a one-shot bulk import). This module is what the
account-management endpoints call when a user changes their password, email, or account
state, so Django and Keycloak stop drifting apart.

Why it exists: Keycloak owns authentication once `KEYCLOAK_SERVER_URL` is configured.
Writing a new password hash into the Django `users` row is a **silent no-op** for login —
the user keeps signing in with the old password. Every mutation that touches an
authentication fact must therefore go through here.

All functions raise `KeycloakAdminError` on failure. Callers must let that surface (a
failed sync is a real failure, not something to swallow) — except `is_configured()`,
which lets callers degrade to Django-only behaviour when Keycloak is not deployed.
"""
import logging
import threading
import time
from urllib.parse import quote

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

_TIMEOUT = 15

# The service-account token is reused across requests; fetching one per call would double
# the round-trips on every profile save. Refreshed slightly before Keycloak expires it.
_token_lock = threading.Lock()
_token_cache: dict = {'value': None, 'expires_at': 0.0}
_TOKEN_EXPIRY_MARGIN = 30  # seconds


class KeycloakAdminError(Exception):
    """A Keycloak Admin API call failed. Never swallow — it means the two stores diverged."""


class KeycloakSessionNotFound(KeycloakAdminError):
    """The requested session does not belong to the user (or no longer exists)."""


def is_configured() -> bool:
    """True when the admin client can actually talk to Keycloak."""
    return bool(settings.KEYCLOAK_SERVER_URL and settings.KEYCLOAK_ADMIN_CLIENT_SECRET)


def _realm() -> str:
    return quote(settings.KEYCLOAK_REALM)


def _admin_base() -> str:
    return f'{settings.KEYCLOAK_SERVER_URL}/admin/realms/{_realm()}'


def _token_url() -> str:
    return f'{settings.KEYCLOAK_SERVER_URL}/realms/{_realm()}/protocol/openid-connect/token'


def get_admin_token() -> str:
    """Client-credentials token for the admin automation client, cached until expiry."""
    if not is_configured():
        raise KeycloakAdminError('Keycloak admin client is not configured.')

    now = time.monotonic()
    with _token_lock:
        if _token_cache['value'] and now < _token_cache['expires_at']:
            return _token_cache['value']

        try:
            resp = requests.post(
                _token_url(),
                data={
                    'grant_type': 'client_credentials',
                    'client_id': settings.KEYCLOAK_ADMIN_CLIENT_ID,
                    'client_secret': settings.KEYCLOAK_ADMIN_CLIENT_SECRET,
                },
                timeout=_TIMEOUT,
            )
        except requests.RequestException as exc:
            raise KeycloakAdminError('Keycloak is unreachable.') from exc

        if resp.status_code != 200:
            logger.error('Keycloak admin token request failed: %s %s',
                         resp.status_code, resp.text)
            raise KeycloakAdminError('Could not authenticate with Keycloak.')

        body = resp.json()
        _token_cache['value'] = body['access_token']
        _token_cache['expires_at'] = now + max(
            body.get('expires_in', 60) - _TOKEN_EXPIRY_MARGIN, 5
        )
        return _token_cache['value']


def _request(method: str, path: str, **kwargs) -> requests.Response:
    token = get_admin_token()
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    try:
        return requests.request(
            method, f'{_admin_base()}{path}', headers=headers, timeout=_TIMEOUT, **kwargs
        )
    except requests.RequestException as exc:
        raise KeycloakAdminError('Keycloak is unreachable.') from exc


# ── User lookup ───────────────────────────────────────────────────────────────

def find_user_id_by_email(email: str):
    resp = _request('GET', '/users', params={'email': email, 'exact': 'true'})
    if resp.status_code != 200:
        raise KeycloakAdminError(f'User lookup failed ({resp.status_code}).')
    results = resp.json()
    return results[0]['id'] if results else None


def resolve_user_id(user) -> str:
    """
    Keycloak id for a Django user. Prefers the stored `keycloak_sub`; falls back to an
    email lookup and backfills the link, so accounts created before the migration (or by
    a social login that never round-tripped) still resolve.
    """
    if user.keycloak_sub:
        return user.keycloak_sub

    kc_id = find_user_id_by_email(user.email)
    if not kc_id:
        raise KeycloakAdminError('No matching Keycloak account was found.')

    user.keycloak_sub = kc_id
    user.save(update_fields=['keycloak_sub'])
    return kc_id


def get_user(user) -> dict:
    resp = _request('GET', f'/users/{resolve_user_id(user)}')
    if resp.status_code != 200:
        raise KeycloakAdminError(f'Could not read the Keycloak account ({resp.status_code}).')
    return resp.json()


# ── Credentials ───────────────────────────────────────────────────────────────

def set_password(user, new_password: str, temporary: bool = False) -> None:
    """Replace the user's Keycloak password. This is the only write that affects login."""
    resp = _request(
        'PUT', f'/users/{resolve_user_id(user)}/reset-password',
        json={'type': 'password', 'value': new_password, 'temporary': temporary},
    )
    if resp.status_code not in (204, 200):
        logger.error('Keycloak reset-password failed for %s: %s %s',
                     user.email, resp.status_code, resp.text)
        raise KeycloakAdminError(_password_error(resp))


def _password_error(resp) -> str:
    """Surface Keycloak's own policy message — a generic error here is unhelpful."""
    try:
        body = resp.json()
    except ValueError:
        return 'Could not update the password.'
    return body.get('errorMessage') or body.get('error') or 'Could not update the password.'


def list_credentials(user) -> list:
    resp = _request('GET', f'/users/{resolve_user_id(user)}/credentials')
    if resp.status_code != 200:
        raise KeycloakAdminError(f'Could not read credentials ({resp.status_code}).')
    return resp.json()


def has_password_credential(user) -> bool:
    """
    False for social-only accounts, which have no password to "change". The UI needs this
    to offer *Set password* instead of a change form asking for a password they never had.
    """
    return any(c.get('type') == 'password' for c in list_credentials(user))


def has_otp_credential(user) -> bool:
    """Whether Keycloak itself holds an OTP credential (enrolled via its Account Console)."""
    return any(c.get('type') == 'otp' for c in list_credentials(user))


def verify_password(email: str, password: str) -> bool:
    """
    Confirm a current password by attempting a Direct Access Grant. Used to re-authenticate
    before a sensitive change, because `User.check_password()` now reads a Django hash that
    Keycloak no longer honours and may be stale.
    """
    from . import keycloak_auth
    from rest_framework.exceptions import AuthenticationFailed

    try:
        keycloak_auth.password_grant(email, password)
        return True
    except AuthenticationFailed:
        return False


# ── Profile & account state ───────────────────────────────────────────────────

def update_user(user, **fields) -> None:
    """
    Patch Keycloak's user representation (email, firstName, lastName, enabled, …).

    Deliberately sends no `credentials` key: a PUT that omits it leaves the existing
    password untouched.
    """
    if not fields:
        return
    resp = _request('PUT', f'/users/{resolve_user_id(user)}', json=fields)
    if resp.status_code not in (204, 200):
        logger.error('Keycloak user update failed for %s: %s %s',
                     user.email, resp.status_code, resp.text)
        if resp.status_code == 409:
            raise KeycloakAdminError('That email is already in use.')
        raise KeycloakAdminError('Could not update the account in Keycloak.')


def update_email(user, new_email: str) -> None:
    """
    Email is also the Keycloak *username*. Both must move together or the user ends up
    signing in with their old address while the portal shows the new one.
    """
    update_user(
        user,
        email=new_email,
        username=new_email,
        emailVerified=True,
    )


def set_enabled(user, enabled: bool) -> None:
    """Mirror activation state. A Django-only `is_active=False` still authenticates."""
    update_user(user, enabled=bool(enabled))


# ── Sessions ──────────────────────────────────────────────────────────────────

def list_sessions(user) -> list:
    resp = _request('GET', f'/users/{resolve_user_id(user)}/sessions')
    if resp.status_code != 200:
        raise KeycloakAdminError(f'Could not read sessions ({resp.status_code}).')
    return resp.json()


def logout_all(user) -> None:
    """Terminate every Keycloak session for this user (real sign-out on all devices)."""
    resp = _request('POST', f'/users/{resolve_user_id(user)}/logout')
    if resp.status_code not in (204, 200):
        raise KeycloakAdminError(f'Could not sign out all sessions ({resp.status_code}).')


def delete_session(user, session_id: str) -> None:
    """
    Revoke a single Keycloak session **that belongs to this user**.

    `DELETE /sessions/{id}` is a realm-wide admin endpoint — it will terminate *any*
    session by id — so we must confirm the id is one of this user's own sessions first.
    Without that check any authenticated user could revoke anyone else's session (IDOR).
    """
    owned = {s.get('id') for s in list_sessions(user)}
    if session_id not in owned:
        raise KeycloakSessionNotFound('Session not found.')
    resp = _request('DELETE', f'/sessions/{quote(session_id)}')
    if resp.status_code not in (204, 200, 404):
        raise KeycloakAdminError(f'Could not revoke the session ({resp.status_code}).')


def account_console_url() -> str:
    """
    Keycloak's own Account Console. Enrolling a TOTP credential *in Keycloak* is only
    possible through this browser flow — the Admin API has no endpoint for it — so the UI
    links out here rather than pretending it can enrol one.
    """
    if not settings.KEYCLOAK_SERVER_URL:
        return ''
    return (f'{settings.KEYCLOAK_SERVER_URL}/realms/{_realm()}'
            f'/account/#/security/signing-in')
