import requests

BASE_URL = "http://localhost:3000"
LOGIN_ENDPOINT = "/api/v1/auth/login"
LOGOUT_ENDPOINT = "/api/v1/auth/logout"
TIMEOUT = 30

USERNAME = "admin@company.com"
PASSWORD = "admin123"


def test_post_api_v1_auth_logout():
    try:
        # Step 1: Login to get the access token
        login_payload = {
            "email": USERNAME,
            "password": PASSWORD
        }
        login_response = requests.post(
            f"{BASE_URL}{LOGIN_ENDPOINT}",
            json=login_payload,
            timeout=TIMEOUT
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        login_data = login_response.json()
        assert "access_token" in login_data, "No access_token in login response"
        access_token = login_data["access_token"]

        # Step 2: Logout using the obtained access token
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        logout_response = requests.post(
            f"{BASE_URL}{LOGOUT_ENDPOINT}",
            headers=headers,
            timeout=TIMEOUT
        )
        assert logout_response.status_code == 200, f"Logout failed: {logout_response.text}"
        logout_data = logout_response.json()
        # Allow empty dict {} or dict with 'message' key
        assert (logout_data == {} or ("message" in logout_data and logout_data["message"])), "Unexpected logout response content"

        # Step 3: Verify token is invalidated by accessing a protected resource
        profile_response = requests.get(
            f"{BASE_URL}/api/v1/users/profile",
            headers=headers,
            timeout=TIMEOUT
        )
        assert profile_response.status_code == 401 or profile_response.status_code == 403, \
            "Access with logged out token did not fail as expected"
    except requests.RequestException as e:
        assert False, f"HTTP request failed with exception: {e}"


test_post_api_v1_auth_logout()
