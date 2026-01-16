import requests
from requests.auth import HTTPBasicAuth
import datetime

BASE_URL = "http://localhost:3000"
USERNAME = "test@test.com"
PASSWORD = "test123"
TIMEOUT = 30

def test_get_api_v1_leaves():
    auth = HTTPBasicAuth(USERNAME, PASSWORD)
    headers = {"Accept": "application/json"}

    try:
        # Test retrieving leave requests without any filters
        response = requests.get(
            f"{BASE_URL}/api/v1/leaves",
            headers=headers,
            auth=auth,
            timeout=TIMEOUT
        )
        assert response.status_code == 200, f"Expected 200 OK but got {response.status_code}"
        json_data = response.json()
        assert isinstance(json_data, list), "Response should be a list"

        # If there are items, basic check keys
        for leave in json_data:
            assert isinstance(leave, dict), "Each leave item should be a dict"
            assert 'status' in leave, "Leave item missing 'status'"
            assert 'startDate' in leave and 'endDate' in leave, "Leave item missing date fields"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"


test_get_api_v1_leaves()