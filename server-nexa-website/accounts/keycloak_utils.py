"""
Pure helpers for the Django → Keycloak user migration. Kept free of Django/network
side effects so they can be unit-tested in isolation (see accounts/tests_keycloak.py).
"""
import base64
import json


def split_name(display_name: str, email: str = ''):
    """
    Split a display name into (first, last) for Keycloak's firstName/lastName.
    **Never returns an empty component.**

    Keycloak's default user profile marks firstName/lastName **required**, and an empty
    required attribute makes Keycloak raise the VERIFY_PROFILE action dynamically — which
    a Direct Access Grant reports as "Account is not fully set up", blocking login
    entirely. Django only stores a single `display_name`, which may be one word or blank,
    so fall back rather than ever emit an empty required field:
        "Jane Wanjiru Doe" -> ("Jane", "Wanjiru Doe")
        "Mononym"          -> ("Mononym", "Mononym")
        ""                 -> local-part of the email, e.g. ("jane", "jane")
    """
    parts = (display_name or '').strip().split()
    if parts:
        if len(parts) == 1:
            return parts[0], parts[0]
        return parts[0], ' '.join(parts[1:])
    local = (email or '').split('@')[0].strip()
    if local:
        return local, local
    return 'User', 'User'  # last resort — an empty required field locks the user out


def parse_django_pbkdf2(encoded: str):
    """
    Translate a Django ``pbkdf2_sha256$<iter>$<salt>$<hash_b64>`` password string into a
    Keycloak password *credential representation* that Keycloak can verify natively, so
    migrated users keep their existing password.

    Returns ``None`` for anything that is not a default Django PBKDF2-SHA256 hash
    (bcrypt/argon2/pbkdf2_sha1, or ``!`` unusable passwords) — those users must reset.

    Encoding notes (the part that must be exactly right):
      * Django uses the salt **string** directly as PBKDF2 salt bytes and stores the
        derived key as ``base64(dk)`` where ``dk`` is 32 bytes for sha256.
      * Keycloak's ``pbkdf2-sha256`` provider expects ``secretData.salt`` = base64(salt
        bytes) and ``secretData.value`` = base64(dk). So the value carries over verbatim
        and the salt string is base64-encoded.
    """
    if not encoded or '$' not in encoded:
        return None
    parts = encoded.split('$')
    if len(parts) != 4 or parts[0] != 'pbkdf2_sha256':
        return None
    _, iterations, salt, hash_b64 = parts
    try:
        iterations = int(iterations)
    except ValueError:
        return None
    salt_b64 = base64.b64encode(salt.encode('utf-8')).decode('ascii')
    return {
        'type': 'password',
        'secretData': json.dumps(
            {'value': hash_b64, 'salt': salt_b64, 'additionalParameters': {}}
        ),
        'credentialData': json.dumps(
            {'hashIterations': iterations, 'algorithm': 'pbkdf2-sha256',
             'additionalParameters': {}}
        ),
    }
