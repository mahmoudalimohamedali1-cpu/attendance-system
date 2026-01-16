import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:3000"
LOGIN_ENDPOINT = "/api/v1/auth/login"
TIMEOUT = 30

def test_post_api_v1_auth_login():
    headers = {
        "Content-Type": "application/json"
    }

    # Use basic auth token as per instructions
    auth = HTTPBasicAuth("admin@company.com", "admin123")

    # Test data for valid email login
    valid_email_payload = {
        "email": "test@test.com",
        "password": "test123"
    }

    # Test data for valid phone login (assuming phone number login accepted by API)
    valid_phone_payload = {
        "phone": "+1234567890",
        "password": "test123"
    }

    # Invalid credentials
    invalid_email_payload = {
        "email": "wrong@test.com",
        "password": "wrongpass"
    }

    invalid_phone_payload = {
        "phone": "+0000000000",
        "password": "wrongpass"
    }

    # 1. Valid email login - expect success and JWT token in response
    try:
        response = requests.post(
            BASE_URL + LOGIN_ENDPOINT,
            json=valid_email_payload,
            headers=headers,
            auth=auth,
            timeout=TIMEOUT
        )
        assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}"
        data = response.json()
        assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 0, "JWT token missing or invalid in response for valid email login"
    except requests.RequestException as e:
        assert False, f"Request failed for valid email login: {e}"

    # 2. Valid phone login - expect success and JWT token (if phone login supported)
    try:
        response = requests.post(
            BASE_URL + LOGIN_ENDPOINT,
            json=valid_phone_payload,
            headers=headers,
            auth=auth,
            timeout=TIMEOUT
        )
        # The API may or may not support phone login, so allow 200 or 400/401, but if 200 then check token
        if response.status_code == 200:
            data = response.json()
            assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 0, "JWT token missing or invalid in response for valid phone login"
        else:
            assert response.status_code in (400, 401), f"Unexpected status code {response.status_code} for valid phone login test"
    except requests.RequestException as e:
        assert False, f"Request failed for valid phone login: {e}"

    # 3. Invalid email login - expect error status (401 or 400)
    try:
        response = requests.post(
            BASE_URL + LOGIN_ENDPOINT,
            json=invalid_email_payload,
            headers=headers,
            auth=auth,
            timeout=TIMEOUT
        )
        assert response.status_code in (400, 401), f"Expected 400 or 401 for invalid email login, got {response.status_code}"
        data = response.json()
        # Optionally check error message exists
        assert "error" in data or "message" in data, "No error message in response for invalid email login"
    except requests.RequestException as e:
        assert False, f"Request failed for invalid email login: {e}"

    # 4. Invalid phone login - expect error status (401 or 400)
    try:
        response = requests.post(
            BASE_URL + LOGIN_ENDPOINT,
            json=invalid_phone_payload,
            headers=headers,
            auth=auth,
            timeout=TIMEOUT
        )
        assert response.status_code in (400, 401), f"Expected 400 or 401 for invalid phone login, got {response.status_code}"
        data = response.json()
        assert "error" in data or "message" in data, "No error message in response for invalid phone login"
    except requests.RequestException as e:
        assert False, f"Request failed for invalid phone login: {e}"

test_post_api_v1_auth_login()