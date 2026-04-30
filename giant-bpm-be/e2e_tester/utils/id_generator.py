import secrets
import string
import os

ALPHABET = string.ascii_letters + string.digits

def generate_public_id() -> str:
    # Default to 'L' if not set, to match local development default
    prefix = os.environ.get('PUBLIC_ID_PREFIX', 'L')
    random_part = ''.join(secrets.choice(ALPHABET) for _ in range(12))
    return f"{prefix}{random_part}"
