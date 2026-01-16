import requests

BASE_URL = "http://localhost:3000"
AUTH_CREDENTIALS = {"email": "test@test.com", "password": "test123"}
TIMEOUT = 30


def test_post_api_v1_attendance_check_out():
    headers = {"Content-Type": "application/json"}

    # Login to get auth token
    login_url = f"{BASE_URL}/api/v1/auth/login"
    login_resp = requests.post(login_url, json=AUTH_CREDENTIALS, headers=headers, timeout=TIMEOUT)
    assert login_resp.status_code == 200, f"Login failed with status code {login_resp.status_code}"
    login_json = login_resp.json()
    assert "accessToken" in login_json, "Login response missing accessToken"
    token = login_json["accessToken"]

    # Update headers with Bearer token
    auth_headers = headers.copy()
    auth_headers["Authorization"] = f"Bearer {token}"

    # Helper function to perform check-in (required before check-out)
    def check_in():
        url = f"{BASE_URL}/api/v1/attendance/check-in"
        payload = {
            "geofence": {"lat": 40.7128, "lng": -74.0060, "radius": 100},
            "faceRecognitionData": "base64encodedfacestring123"
        }
        response = requests.post(url, json=payload, headers=auth_headers, timeout=TIMEOUT)
        response.raise_for_status()
        return response.json()

    # Valid check-out payload
    check_out_valid_payload = {
        "geofence": {"lat": 40.7128, "lng": -74.0060, "radius": 100},
        "faceRecognitionData": "base64encodedfacestring123"
    }

    # Invalid payloads - missing or bad data
    check_out_invalid_payloads = [
        # Missing geofence
        {"faceRecognitionData": "base64encodedfacestring123"},
        # Missing faceRecognitionData
        {"geofence": {"lat": 40.7128, "lng": -74.0060, "radius": 100}},
        # Empty payload
        {},
        # Invalid geofence data (non-numeric lat)
        {"geofence": {"lat": "invalid", "lng": -74.0060, "radius": 100}, "faceRecognitionData": "base64encodedfacestring123"},
        # Invalid faceRecognitionData type (int instead of string)
        {"geofence": {"lat": 40.7128, "lng": -74.0060, "radius": 100}, "faceRecognitionData": 12345},
    ]

    # First do a check-in to have a valid attendance session
    try:
        check_in_response = check_in()
        assert "attendanceId" in check_in_response or check_in_response.get("status") == "success"
    except Exception as e:
        raise AssertionError(f"Precondition check-in failed: {e}")

    # Test valid check-out
    try:
        url = f"{BASE_URL}/api/v1/attendance/check-out"
        resp = requests.post(url, json=check_out_valid_payload, headers=auth_headers, timeout=TIMEOUT)
        assert resp.status_code == 200 or resp.status_code == 201
        json_resp = resp.json()
        assert "checkoutTime" in json_resp or json_resp.get("status") == "success"
    except Exception as e:
        raise AssertionError(f"Valid check-out failed: {e}")

    # Test invalid/missing data scenarios
    for idx, payload in enumerate(check_out_invalid_payloads, start=1):
        try:
            resp = requests.post(url, json=payload, headers=auth_headers, timeout=TIMEOUT)
            # Expecting client error 4xx for invalid data
            assert resp.status_code >= 400 and resp.status_code < 500
            json_err = resp.json()
            assert "error" in json_err or "message" in json_err
        except requests.exceptions.RequestException as re:
            # Network or request errors should fail the test
            raise AssertionError(f"Request exception in invalid payload test {idx}: {re}")
        except Exception as e:
            raise AssertionError(f"Unexpected error in invalid payload test {idx}: {e}")


test_post_api_v1_attendance_check_out()
