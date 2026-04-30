import requests
import logging

log = logging.getLogger(__name__)

def test_health_check(api_base_url: str):
    """
    Tests that the API health check endpoint is working.
    """
    health_endpoint = f"{api_base_url}/healthy/status"
    log.info(f"Testing health endpoint: {health_endpoint}")

    response = requests.get(health_endpoint)
    response.raise_for_status()  # Raises an exception for 4xx/5xx errors

    response_json = response.json()
    assert response_json.get("status") == "ok"
    assert response_json.get("info", {}).get("database", {}).get("status") == "up"
