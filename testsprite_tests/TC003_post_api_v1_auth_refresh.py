import requests

BASE_URL = "http://localhost:3000"
LOGIN_ENDPOINT = "/api/v1/auth/login"
REFRESH_ENDPOINT = "/api/v1/auth/refresh"

USERNAME = "test@test.com"
PASSWORD = "test123"
TIMEOUT = 30


def test_post_api_v1_auth_refresh():
    # Step 1: Login to get initial tokens
    login_url = f"{BASE_URL}{LOGIN_ENDPOINT}"
    login_payload = {
        "email": USERNAME,
        "password": PASSWORD
    }
    try:
        login_resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        login_resp.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Login request failed: {e}"

    login_data = login_resp.json()
    assert "access_token" in login_data, "Login response missing access_token"
    assert "refresh_token" in login_data, "Login response missing refresh_token"

    access_token = login_data["access_token"]
    refresh_token = login_data["refresh_token"]

    # Step 2: Refresh token with valid (unexpired) refresh token
    refresh_url = f"{BASE_URL}{REFRESH_ENDPOINT}"
    refresh_payload = {"refresh_token": refresh_token}
    try:
        refresh_resp = requests.post(refresh_url, json=refresh_payload, timeout=TIMEOUT)
        refresh_resp.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Refresh token request failed with valid token: {e}"

    refresh_data = refresh_resp.json()
    assert "access_token" in refresh_data, "Refresh response missing new access_token"
    assert "refresh_token" in refresh_data, "Refresh response missing new refresh_token"
    new_access_token = refresh_data["access_token"]
    new_refresh_token = refresh_data["refresh_token"]
    assert new_access_token != access_token, "New access token should differ from old one"
    assert new_refresh_token != refresh_token, "New refresh token should differ from old one"

    # Step 3: Attempt refresh with invalid/expired token and expect error response
    invalid_payload = {"refresh_token": "invalid_or_expired_token"}
    try:
        invalid_resp = requests.post(refresh_url, json=invalid_payload, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Refresh request with invalid token raised exception: {e}"

    # Should reject invalid token
    assert invalid_resp.status_code in (401, 403), f"Expected 401 or 403 for invalid token, got {invalid_resp.status_code}"

    # Optional: Validate error message present
    try:
        error_data = invalid_resp.json()
        assert "error" in error_data or "message" in error_data, "Error response should contain error or message field"
    except ValueError:
        # Not a JSON response; still acceptable if status code is 401/403
        pass


test_post_api_v1_auth_refresh()
