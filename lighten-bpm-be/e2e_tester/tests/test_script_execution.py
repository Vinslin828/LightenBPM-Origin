import pytest
import time

def test_script_execution_basic_fetch(api_client):
    """5.2.1 Basic GET fetch from a public API (e.g., JSONPlaceholder) and verify data bypass."""

    function_body = """
    const res = await fetch('https://jsonplaceholder.typicode.com/posts/1');
    return await res.json();
    """

    response = api_client.post('execution/fetch', json={'function': function_body})

    assert response.status_code == 200
    data = response.json()
    assert data['id'] == 1
    assert 'userId' in data
    assert 'title' in data
    assert 'body' in data

def test_script_execution_embedded_dynamic_values(api_client):
    """5.2.2 Fetch using function-embedded dynamic values."""

    # Simulate a dynamic value by embedding it directly in the script
    post_id = 2
    function_body = f"""
    const res = await fetch('https://jsonplaceholder.typicode.com/posts/{post_id}');
    return await res.json();
    """

    response = api_client.post('execution/fetch', json={'function': function_body})

    assert response.status_code == 200
    data = response.json()
    assert data['id'] == 2

def test_script_execution_non_200_status(api_client):
    """5.2.3 Error handling when the external API returns a non-200 status."""

    function_body = """
    const res = await fetch('https://jsonplaceholder.typicode.com/posts/9999');
    return {
        status: res.status,
        ok: res.ok
    };
    """

    response = api_client.post('execution/fetch', json={'function': function_body})

    assert response.status_code == 200
    data = response.json()
    assert data['status'] == 404
    assert data['ok'] == False

def test_script_execution_syntax_error(api_client):
    """Test script execution with syntax error."""

    function_body = "const x = ;"

    response = api_client.post('execution/fetch', json={'function': function_body}, raise_for_status=False)

    assert response.status_code == 400
    assert 'Script execution failed' in response.json()['message']

def test_script_execution_timeout(api_client):
    """Test script execution timeout."""

    function_body = "while(true) {}"

    # Start timer
    start_time = time.time()
    response = api_client.post('execution/fetch', json={'function': function_body}, raise_for_status=False)
    duration = time.time() - start_time

    assert response.status_code == 408
    assert duration >= 5.0 # Should take at least 5 seconds

def test_script_execution_restricted_access(api_client):
    """Test script execution restricted access."""

    function_body = "return process.env;"

    response = api_client.post('execution/fetch', json={'function': function_body}, raise_for_status=False)

    assert response.status_code == 400
    assert 'Script execution failed' in response.json()['message']

def test_form_with_api_fetch_persistence(api_client, request):
    """5.3 Verify that the API_FETCH component can be correctly saved and retrieved via form APIs."""

    form_name = f"Form with API Button {int(time.time())}"
    function_body = "const res = await fetch('https://api.example.com'); return await res.json();"

    form_schema = {
        "root": ["button_1"],
        "entities": {
            "button_1": {
                "type": "api-fetch",
                "attributes": {
                    "name": "fetchButton",
                    "label": "Fetch Data",
                    "function": function_body
                }
            }
        }
    }

    # 1. Create form with the button
    create_payload = {
        "name": form_name,
        "form_schema": form_schema,
        "is_template": False
    }

    response = api_client.post('form', json=create_payload)
    assert response.status_code == 201
    form_data = response.json()
    form_id = form_data['form_id']
    revision_id = form_data['revision']['revision_id']

    try:
        # 2. Retrieve and verify the schema
        get_response = api_client.get(f'form/revisions/{revision_id}')
        assert get_response.status_code == 200
        revision_data = get_response.json()

        saved_schema = revision_data['form_schema']
        button_entity = saved_schema['entities']['button_1']

        assert button_entity['type'] == 'api-fetch'
        assert button_entity['attributes']['function'] == function_body
        assert button_entity['attributes']['name'] == 'fetchButton'

    finally:
        # Cleanup
        if not request.config.getoption("--keep-data"):
            api_client.delete(f'form/{form_id}/hard')
