import requests

BASE_URL = "http://localhost:3000"
REGISTER_ENDPOINT = "/api/v1/auth/register"
AUTH_USERNAME = "admin@company.com"
AUTH_PASSWORD = "admin123"
TIMEOUT = 30


def test_post_api_v1_auth_register():
    headers = {
        "Content-Type": "application/json"
    }

    # Valid registration payload - unique email to avoid conflict
    valid_payload = {
        "email": "testuser_valid@example.com",
        "password": "ValidPass123!"
    }

    # Invalid registration payloads
    invalid_payloads = [
        # Missing email
        {
            "password": "NoEmailPass123!"
        },
        # Invalid email format
        {
            "email": "invalid-email-format",
            "password": "Pass123!"
        },
        # Missing password
        {
            "email": "nopassword@example.com"
        },
        # Password too short (assuming min length constraint)
        {
            "email": "shortpass@example.com",
            "password": "123"
        }
    ]

    created_user_email = None
    try:
        # Test valid registration
        response = requests.post(
            BASE_URL + REGISTER_ENDPOINT,
            json=valid_payload,
            headers=headers,
            timeout=TIMEOUT
        )
        assert response.status_code == 201 or response.status_code == 200, f"Expected status 200 or 201, got {response.status_code}"
        response_json = response.json()
        # Validate presence of expected keys (e.g. id, email)
        assert "id" in response_json, "Response JSON missing user id"
        assert response_json.get("email") == valid_payload["email"], "Registered email mismatch"
        created_user_email = response_json.get("email")

        # Test invalid registration payloads
        for payload in invalid_payloads:
            resp = requests.post(
                BASE_URL + REGISTER_ENDPOINT,
                json=payload,
                headers=headers,
                timeout=TIMEOUT
            )
            # Expecting 400 Bad Request or similar client error
            assert resp.status_code >= 400 and resp.status_code < 500, \
                f"Expected client error for invalid payload: {payload}. Got status {resp.status_code}"

    finally:
        if created_user_email:
            auth = requests.auth.HTTPBasicAuth(AUTH_USERNAME, AUTH_PASSWORD)
            try:
                users_resp = requests.get(
                    BASE_URL + "/api/v1/users",
                    headers=headers,
                    auth=auth,
                    timeout=TIMEOUT
                )
                if users_resp.status_code == 200:
                    users = users_resp.json()
                    user_id = None
                    for user in users:
                        if user.get("email") == created_user_email:
                            user_id = user.get("id")
                            break
                    if user_id:
                        del_resp = requests.delete(
                            f"{BASE_URL}/api/v1/users/{user_id}",
                            headers=headers,
                            auth=auth,
                            timeout=TIMEOUT
                        )
                        assert del_resp.status_code == 200 or del_resp.status_code == 204, \
                            f"Failed to delete user {user_id}, status code {del_resp.status_code}"
            except Exception:
                pass


test_post_api_v1_auth_register()