import requests
import json
from typing import Dict, Any

class APIClient:
    def __init__(self, base_url: str, auth_headers: Dict[str, Any]):
        self.base_url = base_url
        self.auth_headers = auth_headers

    def get(self, endpoint: str, raise_for_status: bool = True, **kwargs) -> requests.Response:
        return self._request("GET", endpoint, raise_for_status=raise_for_status, **kwargs)

    def post(self, endpoint: str, raise_for_status: bool = True, **kwargs) -> requests.Response:
        return self._request("POST", endpoint, raise_for_status=raise_for_status, **kwargs)

    def put(self, endpoint: str, raise_for_status: bool = True, **kwargs) -> requests.Response:
        return self._request("PUT", endpoint, raise_for_status=raise_for_status, **kwargs)

    def patch(self, endpoint: str, raise_for_status: bool = True, **kwargs) -> requests.Response:
        return self._request("PATCH", endpoint, raise_for_status=raise_for_status, **kwargs)

    def delete(self, endpoint: str, raise_for_status: bool = True, **kwargs) -> requests.Response:
        return self._request("DELETE", endpoint, raise_for_status=raise_for_status, **kwargs)

    def _request(self, method: str, endpoint: str, raise_for_status: bool = True, **kwargs) -> requests.Response:
        url = f"{self.base_url}/{endpoint}"
        headers = {**self.auth_headers, **kwargs.pop("headers", {})}

        response = requests.request(method, url, headers=headers, **kwargs)

        if raise_for_status and response.status_code >= 400:
            try:
                print(f"\nError Response Body: {json.dumps(response.json(), indent=2)}")
            except:
                print(f"\nError Response Text: {response.text}")
            response.raise_for_status()

        return response
