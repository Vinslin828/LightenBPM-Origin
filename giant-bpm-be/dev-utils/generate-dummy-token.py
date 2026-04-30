#!/usr/bin/env python3

"""
This script generates a dummy JWT token for development and testing purposes.
It is based on the `generate_fake_token` function in the E2E tests.
"""

import base64
import json
import argparse

def generate_fake_token(
    user_sub: str,
    user_email: str,
    user_name: str,
    user_code: str = None,
    job_grade: int = 1,
    bpm_role: str = "user",
) -> str:
    """Generates a fake JWT token with a specified sub, email, and name."""
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": user_sub,
        "email": user_email,
        "name": user_name,
        "Job_Grade": job_grade,
        "BPM_Role": bpm_role,
    }

    if user_code:
        payload["code"] = user_code

    # In a real JWT, the payload is base64url encoded.
    # For this test, standard base64 encoding is sufficient as we are mocking the token.
    encoded_header = (
        base64.urlsafe_b64encode(json.dumps(header).encode()).decode().strip("=")
    )
    encoded_payload = (
        base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().strip("=")
    )
    # Format is header.payload.signature. We only need a dummy signature.
    return f"{encoded_header}.{encoded_payload}.dummy_signature"

def main():
    """Parses command-line arguments and prints a generated token."""
    parser = argparse.ArgumentParser(
        description="Generate a dummy JWT token for development and testing.",
        formatter_class=argparse.RawTextHelpFormatter,
        epilog="""
Example usage:
  ./dev-utils/generate-dummy-token.py --sub 'test-sub' --email 'test@example.com' --name 'Test User'
  ./dev-utils/generate-dummy-token.py --sub 'admin-sub' --email 'admin@example.com' --name 'Admin User' --code 'ADMIN001' --job-grade 5 --bpm-role 'admin'
""",
    )
    parser.add_argument("--sub", required=True, help="The user's subject (sub) claim.")
    parser.add_argument("--email", required=True, help="The user's email address.")
    parser.add_argument("--name", required=True, help="The user's full name.")
    parser.add_argument("--code", help="The user's external code (optional).")
    parser.add_argument(
        "--job-grade",
        type=int,
        default=1,
        help="The user's job grade. Defaults to 1 if not specified.",
    )
    parser.add_argument(
        "--bpm-role",
        default="user",
        help="The user's BPM role. Defaults to 'user' if not specified.",
    )

    args = parser.parse_args()

    token = generate_fake_token(
        args.sub, args.email, args.name, args.code, args.job_grade, args.bpm_role
    )
    print(token)

if __name__ == "__main__":
    main()