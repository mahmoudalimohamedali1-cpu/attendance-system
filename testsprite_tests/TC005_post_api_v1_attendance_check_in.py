import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

AUTH_EMAIL = "test@test.com"
AUTH_PASSWORD = "test123"

def get_auth_token():
    url = f"{BASE_URL}/api/v1/auth/login"
    payload = {"email": AUTH_EMAIL, "password": AUTH_PASSWORD}
    headers = {"Content-Type": "application/json"}
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=TIMEOUT)
        response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Login request failed with exception: {e}"
    json_response = response.json()
    assert 'access_token' in json_response, "Login response missing 'access_token'"
    return json_response['access_token']


def test_post_api_v1_attendance_check_in():
    token = get_auth_token()
    url = f"{BASE_URL}/api/v1/attendance/check-in"
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}

    valid_payload = {
        "geofencing": {
            "latitude": 40.712776,
            "longitude": -74.005974,
            "radius": 100  # in meters
        },
        "face_recognition": {
            "face_id": "face12345",
            "confidence": 0.98
        }
    }

    invalid_payloads = [
        {},
        {"geofencing": {"latitude": 40.712776}},
        {"face_recognition": {"confidence": 0.9}},
        {"geofencing": {"latitude": None, "longitude": None, "radius": -10}},
        {"face_recognition": {"face_id": "", "confidence": 1.1}},
        {"geofencing": {"latitude": 40.712776, "longitude": -74.005974, "radius": 100}},
        {"face_recognition": {"face_id": "face12345", "confidence": 0.98}}
    ]

    try:
        response = requests.post(url, headers=headers, json=valid_payload, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request failed with exception: {e}"
    assert response.status_code == 200, f"Expected 200 OK for valid data, got {response.status_code}"
    json_response = response.json()
    assert isinstance(json_response, dict), "Response should be a JSON object"
    assert "check_in_id" in json_response, "Response missing 'check_in_id'"
    assert json_response.get("status") in ["success", "checked_in"], "Unexpected status in response"

    for invalid_payload in invalid_payloads:
        try:
            resp = requests.post(url, headers=headers, json=invalid_payload, timeout=TIMEOUT)
        except requests.RequestException as e:
            assert False, f"Request with invalid payload failed with exception: {e}"
        assert resp.status_code in [400, 422], (
            f"Expected 4xx error for invalid payload {invalid_payload}, got {resp.status_code}"
        )
        error_json = {}
        try:
            error_json = resp.json()
        except ValueError:
            pass
        assert isinstance(error_json, dict), "Error response should be a JSON object if possible"
        if error_json:
            assert "error" in error_json or "message" in error_json, (
                "Error response should contain 'error' or 'message' key"
            )


test_post_api_v1_attendance_check_in()