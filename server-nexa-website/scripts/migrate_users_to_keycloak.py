#!/usr/bin/env python3
"""
Migrate Django users into the Keycloak "Nexa Academy Auth" realm.

Keycloak becomes the system of record for authentication; Django keeps the User row
(business data + RBAC). This script is idempotent — safe to re-run — and defaults to a
dry run. It reads all Keycloak config from Django settings (see settings.KEYCLOAK_*).

What it does, per Django user:
  1. Look the user up in Keycloak by email (skip create if already present).
  2. Create the Keycloak user (emailVerified=True, enabled=is_active, names).
  3. If the user has a usable Django pbkdf2_sha256 password, import that hash natively
     so the user keeps their existing password. google-linked / unusable-password users
     get no credential — they sign in with Google or use "forgot password".
  4. Assign the realm role (`admin` or `student`).
  5. Write the Keycloak user id back into User.keycloak_sub.

Usage (run from server-nexa-website/):
    python3 scripts/migrate_users_to_keycloak.py --dry-run            # preview (default)
    python3 scripts/migrate_users_to_keycloak.py --commit             # actually write
    python3 scripts/migrate_users_to_keycloak.py --commit --emails a@x.com b@y.com
    python3 scripts/migrate_users_to_keycloak.py --commit --limit 20  # first 20 only

⚠️  Validate on a STAGING realm against a COPY of prod before touching production.
    After a staging run, manually log in 10–20 real accounts with their real passwords.
"""

import argparse
import base64
import json
import logging
import os
import sys
from urllib.parse import quote

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ubuntu_labs.settings')
# Allow running as `python3 scripts/migrate_users_to_keycloak.py` from the project root.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
django.setup()

import requests  # noqa: E402
from django.conf import settings  # noqa: E402
from django.contrib.auth import get_user_model  # noqa: E402
from django.utils import timezone  # noqa: E402

from accounts.keycloak_utils import parse_django_pbkdf2, split_name  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('keycloak_migration.log'),
    ],
)
log = logging.getLogger('kc-migrate')

User = get_user_model()

REALM = quote(settings.KEYCLOAK_REALM)
TOKEN_URL = f'{settings.KEYCLOAK_SERVER_URL}/realms/{REALM}/protocol/openid-connect/token'
ADMIN_BASE = f'{settings.KEYCLOAK_SERVER_URL}/admin/realms/{REALM}'


class MigrationError(Exception):
    pass


# ── Keycloak admin API helpers ────────────────────────────────────────────────

def get_admin_token() -> str:
    resp = requests.post(
        TOKEN_URL,
        data={
            'grant_type': 'client_credentials',
            'client_id': settings.KEYCLOAK_ADMIN_CLIENT_ID,
            'client_secret': settings.KEYCLOAK_ADMIN_CLIENT_SECRET,
        },
        timeout=30,
    )
    if resp.status_code != 200:
        raise MigrationError(f'Failed to obtain admin token: {resp.status_code} {resp.text}')
    return resp.json()['access_token']


def _headers(token: str) -> dict:
    return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}


def find_user_id_by_email(token: str, email: str):
    resp = requests.get(
        f'{ADMIN_BASE}/users',
        headers=_headers(token),
        params={'email': email, 'exact': 'true'},
        timeout=30,
    )
    resp.raise_for_status()
    results = resp.json()
    return results[0]['id'] if results else None


def create_user(token: str, representation: dict) -> str:
    resp = requests.post(
        f'{ADMIN_BASE}/users', headers=_headers(token), json=representation, timeout=30
    )
    if resp.status_code == 201:
        # Keycloak returns the new id in the Location header.
        return resp.headers['Location'].rsplit('/', 1)[-1]
    if resp.status_code == 409:
        # Created concurrently / already exists — fall back to lookup.
        existing = find_user_id_by_email(token, representation['email'])
        if existing:
            return existing
    raise MigrationError(f'Create user failed: {resp.status_code} {resp.text}')


def update_user_profile(token: str, user_id: str, user) -> None:
    """
    Repair an already-migrated Keycloak user's profile on a re-run.

    Deliberately sends **no credentials** — a PUT without them leaves existing passwords
    untouched, so neither the imported hash nor a manually-set password is wiped.
    """
    first, last = split_name(user.display_name, user.email)
    resp = requests.put(
        f'{ADMIN_BASE}/users/{user_id}',
        headers=_headers(token),
        json={'firstName': first, 'lastName': last,
              'emailVerified': True, 'enabled': bool(user.is_active)},
        timeout=30,
    )
    if resp.status_code not in (204, 200):
        log.warning('Profile update failed for %s: %s %s', user.email, resp.status_code, resp.text)


def assign_realm_role(token: str, user_id: str, role_name: str) -> None:
    role_resp = requests.get(
        f'{ADMIN_BASE}/roles/{role_name}', headers=_headers(token), timeout=30
    )
    if role_resp.status_code != 200:
        log.warning('Realm role %r not found (%s) — skipping role assignment.',
                    role_name, role_resp.status_code)
        return
    role = role_resp.json()
    resp = requests.post(
        f'{ADMIN_BASE}/users/{user_id}/role-mappings/realm',
        headers=_headers(token),
        json=[{'id': role['id'], 'name': role['name']}],
        timeout=30,
    )
    if resp.status_code not in (204, 200):
        log.warning('Role assignment failed for %s: %s %s', user_id, resp.status_code, resp.text)


# ── Per-user migration ────────────────────────────────────────────────────────

def build_representation(user) -> dict:
    first, last = split_name(user.display_name, user.email)
    rep = {
        'username': user.email,
        'email': user.email,
        'emailVerified': True,
        'enabled': bool(user.is_active),
        'firstName': first,
        'lastName': last,
    }
    if user.has_usable_password():
        cred = parse_django_pbkdf2(user.password)
        if cred:
            rep['credentials'] = [cred]
        else:
            log.warning('User %s has a non-pbkdf2/unsupported hash — creating without a '
                        'password (will need reset).', user.email)
    return rep


def migrate_user(token: str, user, commit: bool) -> str:
    role = 'admin' if user.role == 'admin' else 'student'
    existing_id = find_user_id_by_email(token, user.email)

    if existing_id:
        status = 'exists'
        kc_id = existing_id
        if not commit:
            log.info('[dry-run] %s already in Keycloak (%s) — would repair profile + role %s',
                     user.email, kc_id, role)
        else:
            update_user_profile(token, kc_id, user)
    else:
        status = 'created'
        if not commit:
            has_pw = bool(user.has_usable_password() and parse_django_pbkdf2(user.password))
            log.info('[dry-run] would CREATE %s (role=%s, password=%s)',
                     user.email, role, 'imported' if has_pw else 'none')
            return status
        kc_id = create_user(token, build_representation(user))

    if commit:
        assign_realm_role(token, kc_id, role)
        if user.keycloak_sub != kc_id:
            user.keycloak_sub = kc_id
            user.save(update_fields=['keycloak_sub'])
        log.info('%s %s → keycloak_sub=%s (role=%s)', status, user.email, kc_id, role)
    return status


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Migrate Django users into Keycloak.')
    parser.add_argument('--commit', action='store_true',
                        help='Actually write to Keycloak/DB. Without this it is a dry run.')
    parser.add_argument('--emails', nargs='*', help='Only migrate these email addresses.')
    parser.add_argument('--limit', type=int, help='Migrate at most N users.')
    args = parser.parse_args()

    if not settings.KEYCLOAK_SERVER_URL or not settings.KEYCLOAK_ADMIN_CLIENT_SECRET:
        log.error('KEYCLOAK_SERVER_URL / KEYCLOAK_ADMIN_CLIENT_SECRET not configured. '
                  'Complete Phase 0 and set the env vars first.')
        sys.exit(1)

    commit = args.commit
    log.info('=== Keycloak migration %s at %s ===',
             'COMMIT' if commit else 'DRY-RUN', timezone.now().isoformat())
    log.info('Realm=%s  Server=%s', settings.KEYCLOAK_REALM, settings.KEYCLOAK_SERVER_URL)

    qs = User.objects.all().order_by('created_at')
    if args.emails:
        qs = qs.filter(email__in=[e.lower() for e in args.emails])
    if args.limit:
        qs = qs[:args.limit]

    token = get_admin_token()
    counts = {'created': 0, 'exists': 0, 'error': 0}
    for user in qs:
        try:
            status = migrate_user(token, user, commit)
            counts[status] = counts.get(status, 0) + 1
        except Exception:
            counts['error'] += 1
            log.exception('FAILED migrating %s', user.email)

    log.info('=== Done. created=%(created)s exists=%(exists)s error=%(error)s ===', counts)
    if not commit:
        log.info('This was a DRY RUN. Re-run with --commit to apply.')


if __name__ == '__main__':
    main()
