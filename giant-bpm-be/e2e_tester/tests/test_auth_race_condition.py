import base64
import json
import logging
from utils.id_generator import generate_public_id
from multiprocessing.pool import ThreadPool
import pytest
from api_client import APIClient

log = logging.getLogger(__name__)


def generate_fake_token(user_sub: str, user_email: str, user_name: str) -> str:
    """Generates a fake JWT token with a specified sub, email, and name."""
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": user_sub,
        "email": user_email,
        "name": user_name,
        "Job_Grade": 1,
        "BPM_Role": "user",
    }
    # In a real JWT, the payload is base64url encoded.
    # For this test, standard base64 encoding is sufficient as we are mocking the token.
    encoded_header = (
        base64.urlsafe_b64encode(json.dumps(header).encode()).decode().strip("=")
    )
    encoded_payload = (
        base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().strip("=")
    )
    # Format is header.payload.signature. We only need the payload.
    return f"{encoded_header}.{encoded_payload}.dummy_signature"


def list_users_task(api_client: APIClient, auth_header: dict):
    """Task to be run in a thread to list users."""
    try:
        # The first time this is called for a new user, it should trigger user creation.
        # Subsequent concurrent calls should not fail.
        api_client.get("users", headers=auth_header)
        return True
    except Exception as e:
        log.error(f"API call failed in thread: {e}")
        return False


def test_user_creation_race_condition(
    api_client: APIClient, request: pytest.FixtureRequest, env: str
):
    """
    Tests that concurrent requests for a new user only create the user once.
    Also includes teardown logic to clean up the created user.
    This test is limited to the 'local' environment.
    """
    if env != "local":
        pytest.skip("Race condition test is only for local environment.")

    user_uuid = generate_public_id()
    user_sub = f"race-condition-test-sub-{user_uuid}"
    user_email = f"race.condition.{user_uuid}@example.com"
    user_name = f"Race Condition Test User {user_uuid}"
    created_user_id = None

    try:
        # 1. Generate a token for a user that does not exist yet.
        new_user_token = generate_fake_token(user_sub, user_email, user_name)
        auth_header = {"Authorization": f"Bearer {new_user_token}"}

        # 2. Make multiple concurrent requests.
        num_concurrent_requests = 5
        with ThreadPool(processes=num_concurrent_requests) as pool:
            results = pool.starmap(
                list_users_task,
                [(api_client, auth_header) for _ in range(num_concurrent_requests)],
            )

        assert all(results), "Not all concurrent API calls were successful."
        log.info(
            f"All {num_concurrent_requests} concurrent requests completed successfully."
        )

        # 3. Verify that only one user was created.
        response = api_client.get("users", params={"limit": 200})
        users = response.json()["items"]
        created_users = [user for user in users if user["sub"] == user_sub]

        assert (
            len(created_users) == 1
        ), f"Expected 1 user to be created, but found {len(created_users)}."
        created_user_id = created_users[0]["id"]
        log.info(
            f"Successfully verified that only one user with sub '{user_sub}' was created."
        )

    finally:
        # 4. Teardown: Clean up the created user.
        if not request.config.getoption("--keep-data") and created_user_id:
            try:
                api_client.delete(f"users/{created_user_id}")
                log.info(f"Successfully deleted test user with ID {created_user_id}.")
            except Exception as e:
                log.error(f"Failed to delete test user with ID {created_user_id}: {e}")
