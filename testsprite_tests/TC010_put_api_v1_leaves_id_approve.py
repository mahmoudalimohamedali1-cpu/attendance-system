import requests

BASE_URL = "http://localhost:3000"
AUTH_EMAIL = "test@test.com"
AUTH_PASSWORD = "test123"
TIMEOUT = 30


def test_put_api_v1_leaves_id_approve():
    session = requests.Session()
    headers = {"Content-Type": "application/json"}

    # Step 0: Login to get auth token
    login_payload = {"email": AUTH_EMAIL, "password": AUTH_PASSWORD}
    login_resp = session.post(
        f"{BASE_URL}/api/v1/auth/login",
        json=login_payload,
        headers=headers,
        timeout=TIMEOUT
    )
    assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
    login_data = login_resp.json()
    assert "access_token" in login_data, "Login response missing access_token"
    token = login_data["access_token"]

    # Use bearer token for auth
    auth_headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    leave_id = None
    try:
        # Step 1: Create a new leave request to approve
        leave_request_payload = {
            "type": "annual",         
            "start_date": "2024-07-01",  
            "end_date": "2024-07-02",
            "reason": "Test leave approval"
        }
        create_resp = session.post(
            f"{BASE_URL}/api/v1/leaves",
            json=leave_request_payload,
            headers=auth_headers,
            timeout=TIMEOUT
        )
        assert create_resp.status_code == 201, f"Expected 201 Created, got {create_resp.status_code}"
        created_leave = create_resp.json()
        assert "id" in created_leave, "Created leave response missing 'id'"
        leave_id = created_leave["id"]

        # Step 2: Approve the created leave request
        approve_resp = session.put(
            f"{BASE_URL}/api/v1/leaves/{leave_id}/approve",
            headers=auth_headers,
            timeout=TIMEOUT
        )
        assert approve_resp.status_code == 200, f"Expected 200 OK on approve, got {approve_resp.status_code}"
        approve_data = approve_resp.json()
        # Validate that leave status changed to approved (assuming 'status' field)
        assert approve_data.get("status") == "approved", f"Leave status is not 'approved', got {approve_data.get('status')}"

        # Step 3: Validate permission - trying approve with unauthorized user
        # Using a session without auth or with different creds to test permission
        unauthorized_session = requests.Session()
        unauthorized_login_payload = {"email": "unauthorized@company.com", "password": "wrongpass"}
        unauthorized_login_resp = unauthorized_session.post(
            f"{BASE_URL}/api/v1/auth/login",
            json=unauthorized_login_payload,
            headers=headers,
            timeout=TIMEOUT
        )
        if unauthorized_login_resp.status_code == 200:
            unauthorized_token = unauthorized_login_resp.json().get("access_token")
            unauthorized_headers = {"Authorization": f"Bearer {unauthorized_token}", "Content-Type": "application/json"}
        else:
            # No token, so no auth header
            unauthorized_headers = {"Content-Type": "application/json"}

        unauthorized_approve_resp = unauthorized_session.put(
            f"{BASE_URL}/api/v1/leaves/{leave_id}/approve",
            headers=unauthorized_headers,
            timeout=TIMEOUT
        )
        assert unauthorized_approve_resp.status_code in (401, 403), (
            f"Expected 401 Unauthorized or 403 Forbidden for unauthorized approval, got {unauthorized_approve_resp.status_code}"
        )

        # Step 4: Validate approving an already approved leave returns appropriate error or idempotent success
        repeat_approve_resp = session.put(
            f"{BASE_URL}/api/v1/leaves/{leave_id}/approve",
            headers=auth_headers,
            timeout=TIMEOUT
        )
        assert repeat_approve_resp.status_code in (200, 400, 409), (
            f"Expected 200, 400 or 409 on re-approve, got {repeat_approve_resp.status_code}"
        )

    finally:
        # Clean up: delete the created leave request if exists
        if leave_id:
            try:
                del_resp = session.delete(
                    f"{BASE_URL}/api/v1/leaves/{leave_id}",
                    headers=auth_headers,
                    timeout=TIMEOUT
                )
                assert del_resp.status_code in (200, 204, 404), f"Failed to delete leave id {leave_id}"
            except Exception:
                pass


test_put_api_v1_leaves_id_approve()
