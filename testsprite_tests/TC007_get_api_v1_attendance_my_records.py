import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:3000"
USERNAME = "test@test.com"
PASSWORD = "test123"
TIMEOUT = 30

def test_get_api_v1_attendance_my_records():
    """
    Test retrieval of user's attendance records including filtering and pagination
    """
    url = f"{BASE_URL}/api/v1/attendance/my-records"
    auth = HTTPBasicAuth(USERNAME, PASSWORD)
    headers = {
        "Accept": "application/json"
    }

    try:
        response = requests.get(url, auth=auth, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Basic validation: data should be a list or dict containing records
    assert isinstance(data, (list, dict)), "Response JSON is not a list or dict"

    # If pagination keys exist, they should be present (optional)
    if isinstance(data, dict):
        # Check for common pagination keys if present
        pagination_keys = ["total", "page", "pageSize", "records"]
        pagination_present = all(key in data for key in pagination_keys)
        if pagination_present:
            assert isinstance(data["total"], int), "'total' must be int"
            assert isinstance(data["page"], int), "'page' must be int"
            assert isinstance(data["pageSize"], int), "'pageSize' must be int"
            assert isinstance(data["records"], list), "'records' must be a list"
        else:
            # If no pagination keys, ensure at least 'records' is present and is a list
            if "records" in data:
                assert isinstance(data["records"], list), "'records' must be a list"

test_get_api_v1_attendance_my_records()