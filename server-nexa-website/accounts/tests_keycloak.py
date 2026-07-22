"""
Unit tests for the Keycloak password-hash translation — the one migration step that can
silently corrupt logins if the encoding is wrong. The key test recomputes the derived key
the way Keycloak's pbkdf2-sha256 provider will (base64-decode the salt → PBKDF2-HMAC-SHA256)
and asserts it matches the value we hand Keycloak.
"""
import base64
import hashlib
import json

from django.contrib.auth.hashers import make_password
from django.test import SimpleTestCase

from accounts.keycloak_utils import parse_django_pbkdf2, split_name


class ParseDjangoPbkdf2Tests(SimpleTestCase):
    def test_translation_is_verifiable_by_keycloak(self):
        password = 'S3cret!passw0rd'
        encoded = make_password(password)  # default hasher = pbkdf2_sha256
        self.assertTrue(encoded.startswith('pbkdf2_sha256$'))

        cred = parse_django_pbkdf2(encoded)
        self.assertIsNotNone(cred)
        self.assertEqual(cred['type'], 'password')

        secret = json.loads(cred['secretData'])
        cdata = json.loads(cred['credentialData'])
        self.assertEqual(cdata['algorithm'], 'pbkdf2-sha256')

        # Recompute exactly as Keycloak does: salt is base64-decoded to bytes, then
        # PBKDF2-HMAC-SHA256 with the stored iteration count and a 32-byte derived key.
        salt_bytes = base64.b64decode(secret['salt'])
        dk = hashlib.pbkdf2_hmac(
            'sha256', password.encode(), salt_bytes, cdata['hashIterations'], dklen=32
        )
        self.assertEqual(base64.b64encode(dk).decode('ascii'), secret['value'])

    def test_salt_roundtrips_to_original_string(self):
        encoded = make_password('anything')
        _, _, salt, _ = encoded.split('$')
        cred = parse_django_pbkdf2(encoded)
        salt_bytes = base64.b64decode(json.loads(cred['secretData'])['salt'])
        # Django uses the salt string's utf-8 bytes directly; Keycloak must see the same.
        self.assertEqual(salt_bytes, salt.encode('utf-8'))

    def test_rejects_unusable_and_foreign_hashes(self):
        self.assertIsNone(parse_django_pbkdf2(''))
        self.assertIsNone(parse_django_pbkdf2(None))
        self.assertIsNone(parse_django_pbkdf2('!'))  # unusable password
        self.assertIsNone(parse_django_pbkdf2(make_password('x', hasher='pbkdf2_sha1')))
        self.assertIsNone(parse_django_pbkdf2('bcrypt_sha256$2b$12$abcdef'))
        self.assertIsNone(parse_django_pbkdf2('pbkdf2_sha256$notanint$salt$hash'))


class SplitNameTests(SimpleTestCase):
    def test_split(self):
        self.assertEqual(split_name('Jane Wanjiru Doe'), ('Jane', 'Wanjiru Doe'))
        # A single word must fill BOTH fields — Keycloak requires lastName, and an empty
        # required field triggers VERIFY_PROFILE ("Account is not fully set up") on login.
        self.assertEqual(split_name('Mononym'), ('Mononym', 'Mononym'))
        # Blank display_name falls back to the email local-part.
        self.assertEqual(split_name('  ', 'jane@example.com'), ('jane', 'jane'))
        self.assertEqual(split_name('', 'jane@example.com'), ('jane', 'jane'))

    def test_never_returns_an_empty_component(self):
        """An empty firstName/lastName silently locks the user out of Keycloak login."""
        for display_name, email in [
            ('Jane Doe', 'j@x.com'), ('Solo', 'j@x.com'), ('', 'jane@example.com'),
            ('   ', 'jane@example.com'), ('', ''), ('   ', '   '),
        ]:
            first, last = split_name(display_name, email)
            self.assertTrue(first.strip(), f'empty firstName for {display_name!r}/{email!r}')
            self.assertTrue(last.strip(), f'empty lastName for {display_name!r}/{email!r}')
