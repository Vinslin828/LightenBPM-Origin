import logging
from typing import Dict, Any, Generator
import pytest
from api_client import APIClient

log = logging.getLogger(__name__)


def test_get_tag(
    api_client: APIClient,
    temporary_tag: Dict[str, Any],
):
    """
    Tests getting a Tag by ID.
    """
    tag_endpoint = "tags"
    tag_id = temporary_tag["id"]

    get_response = api_client.get(f"{tag_endpoint}/{tag_id}")
    fetched_tag = get_response.json()

    assert fetched_tag["id"] == tag_id
    assert fetched_tag["name"] == temporary_tag["name"]

def test_update_tag(
    api_client: APIClient,
    temporary_tag: Dict[str, Any],
):
    """
    Tests updating a Tag.
    """
    tag_endpoint = "tags"
    tag_id = temporary_tag["id"]

    updated_name = f"{temporary_tag['name']}-updated"
    update_payload = {"name": updated_name}

    update_response = api_client.patch(f"{tag_endpoint}/{tag_id}", json=update_payload)
    updated_tag = update_response.json()

    assert updated_tag["name"] == updated_name

def test_list_tags(
    api_client: APIClient,
    temporary_tag: Dict[str, Any],
):
    """
    Tests listing all Tags.
    """
    tag_endpoint = "tags"

    list_response = api_client.get(tag_endpoint)
    listed_tags = list_response.json()

    assert any(t["id"] == temporary_tag["id"] for t in listed_tags)
