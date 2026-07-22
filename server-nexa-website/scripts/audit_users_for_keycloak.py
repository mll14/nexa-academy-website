#!/usr/bin/env python3
"""
READ-ONLY pre-flight audit for the Django -> Keycloak user migration.

Writes NOTHING to Django or Keycloak. Run this against the PRODUCTION database before
`migrate_users_to_keycloak.py --commit` so there are no surprises: it reports exactly how
many users keep their password, who becomes Google-only, and — most importantly — who
would be silently locked out.

Usage (from server-nexa-website/, with the PROD DATABASE_URL in the environment):
    python3 scripts/audit_users_for_keycloak.py
    python3 scripts/audit_users_for_keycloak.py --check-keycloak   # also query the realm
"""
import argparse
import os
import sys
from collections import Counter

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ubuntu_labs.settings')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
django.setup()

from django.conf import settings  # noqa: E402
from django.contrib.auth import get_user_model  # noqa: E402

from accounts.keycloak_utils import parse_django_pbkdf2, split_name  # noqa: E402

User = get_user_model()


def hash_algo(pw: str) -> str:
    if not pw:
        return '(empty)'
    if pw.startswith('!'):
        return 'unusable (!)'
    return pw.split('$')[0]


def main():
    ap = argparse.ArgumentParser(description='Read-only Keycloak migration audit.')
    ap.add_argument('--check-keycloak', action='store_true',
                    help='Also report which users already exist in the realm.')
    args = ap.parse_args()

    users = list(User.objects.all())
    print(f'DATABASE : {settings.DATABASES["default"].get("NAME")}')
    print(f'REALM    : {settings.KEYCLOAK_REALM} @ {settings.KEYCLOAK_SERVER_URL}')
    print(f'TOTAL USERS: {len(users)}\n')

    algos = Counter(hash_algo(u.password) for u in users)
    keeps_password, google_only, needs_reset = [], [], []
    blank_names, inactive, already_linked = [], [], []
    emails = Counter((u.email or '').strip().lower() for u in users)

    for u in users:
        if u.has_usable_password():
            (keeps_password if parse_django_pbkdf2(u.password) else needs_reset).append(u)
        else:
            google_only.append(u)
        if not (u.display_name or '').strip():
            blank_names.append(u)
        if not u.is_active:
            inactive.append(u)
        if u.keycloak_sub:
            already_linked.append(u)

    print('PASSWORD HASHERS IN USE:')
    for a, n in algos.most_common():
        print(f'  {a:22} {n}')
    print()
    print(f'✅ keep their existing password : {len(keeps_password)}')
    print(f'🔵 Google-only (no password)    : {len(google_only)}  -> must use Google or reset')
    print(f'⚠️  NON-pbkdf2 hash             : {len(needs_reset)}  -> CANNOT import; MUST reset password')
    for u in needs_reset:
        print(f'      {u.email}  ({hash_algo(u.password)})')
    print()
    print(f'blank display_name (falls back to email local-part): {len(blank_names)}')
    print(f'inactive users (created disabled in Keycloak)      : {len(inactive)}')
    print(f'already linked (keycloak_sub set)                  : {len(already_linked)}')

    dupes = [e for e, n in emails.items() if n > 1 and e]
    if dupes:
        print(f'\n🚨 DUPLICATE EMAILS (case-insensitive) — these WILL collide in Keycloak:')
        for e in dupes:
            print(f'      {e}')

    # Every user must yield non-empty first/last or Keycloak blocks login entirely.
    bad_names = [u for u in users
                 if not all(p.strip() for p in split_name(u.display_name, u.email))]
    print(f'\nusers that would get an empty firstName/lastName (would be locked out): {len(bad_names)}')
    for u in bad_names:
        print(f'      {u.email}')

    if args.check_keycloak:
        import requests
        from urllib.parse import quote
        b = f'{settings.KEYCLOAK_SERVER_URL}/realms/{quote(settings.KEYCLOAK_REALM)}'
        ab = f'{settings.KEYCLOAK_SERVER_URL}/admin/realms/{quote(settings.KEYCLOAK_REALM)}'
        tok = requests.post(b + '/protocol/openid-connect/token', data={
            'grant_type': 'client_credentials',
            'client_id': settings.KEYCLOAK_ADMIN_CLIENT_ID,
            'client_secret': settings.KEYCLOAK_ADMIN_CLIENT_SECRET}, timeout=15).json()
        if 'access_token' not in tok:
            print('\nKeycloak admin auth FAILED:', tok.get('error_description'))
            return
        H = {'Authorization': 'Bearer ' + tok['access_token']}
        realm_total = requests.get(ab + '/users/count', headers=H, timeout=15).json()
        django_emails = {(u.email or '').lower() for u in users}
        realm_users = requests.get(ab + '/users', headers=H,
                                   params={'max': 1000}, timeout=30).json()
        realm_emails = {(x.get('email') or '').lower() for x in realm_users}
        orphans = sorted(realm_emails - django_emails - {''})
        print(f'\nusers currently in realm : {realm_total}')
        print(f'already present (will be repaired, not duplicated): '
              f'{len(realm_emails & django_emails)}')
        print(f'in realm but NOT in this database (orphans): {len(orphans)}')
        for e in orphans:
            print(f'      {e}')


if __name__ == '__main__':
    main()
