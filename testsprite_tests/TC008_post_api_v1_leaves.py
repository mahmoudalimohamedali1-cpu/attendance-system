import requests
from requests.auth import HTTPBasicAuth
from datetime import datetime, timedelta

BASE_URL = "http://localhost:3000"
AUTH_CREDENTIALS = ("test@test.com", "test123")
TIMEOUT = 30


def test_post_api_v1_leaves():
    auth = HTTPBasicAuth(*AUTH_CREDENTIALS)
    headers = {"Content-Type": "application/json"}

    # Helper function to create leave request
    def create_leave(payload):
        response = requests.post(
            f"{BASE_URL}/api/v1/leaves",
            json=payload,
            auth=auth,
            headers=headers,
            timeout=TIMEOUT,
        )
        return response

    # Valid leave request payload
    today = datetime.utcnow().date()
    valid_payload = {
        "leave_type": "annual",  # assuming valid leave types like 'annual', 'sick', etc.
        "start_date": str(today + timedelta(days=1)),
        "end_date": str(today + timedelta(days=3)),
        "reason": "Family event",
    }

    # Invalid leave request payloads
    invalid_payloads = [
        # Invalid leave_type
        {
            "leave_type": "invalid_type",
            "start_date": str(today + timedelta(days=1)),
            "end_date": str(today + timedelta(days=3)),
            "reason": "Invalid leave type test",
        },
        # End date before start date
        {
            "leave_type": "annual",
            "start_date": str(today + timedelta(days=5)),
            "end_date": str(today + timedelta(days=3)),
            "reason": "End date before start date test",
        },
        # Missing leave_type
        {
            "start_date": str(today + timedelta(days=1)),
            "end_date": str(today + timedelta(days=3)),
            "reason": "Missing leave type test",
        },
        # Missing dates
        {
            "leave_type": "annual",
            "reason": "Missing dates test",
        },
    ]

    created_leave_id = None
    try:
        # Test valid leave creation
        valid_response = create_leave(valid_payload)
        assert valid_response.status_code == 201, f"Expected 201, got {valid_response.status_code}"
        valid_data = valid_response.json()
        assert "id" in valid_data, "Response missing leave request ID"
        created_leave_id = valid_data["id"]
        # Validate fields returned match request (except possibly extra fields)
        assert valid_data.get("leave_type") == valid_payload["leave_type"]
        assert valid_data.get("start_date") == valid_payload["start_date"]
        assert valid_data.get("end_date") == valid_payload["end_date"]
        assert valid_data.get("reason") == valid_payload["reason"]

        # Test invalid leave requests
        for payload in invalid_payloads:
            resp = create_leave(payload)
            assert resp.status_code >= 400 and resp.status_code < 500, (
                f"Expected client error for payload {payload}, got {resp.status_code}"
            )
            # Optionally check error message structure
            json_resp = resp.json()
            assert "error" in json_resp or "message" in json_resp, (
                f"Error response should contain 'error' or 'message' field: {json_resp}"
            )

    finally:
        # Cleanup: delete created leave request if created
        if created_leave_id:
            try:
                del_resp = requests.delete(
                    f"{BASE_URL}/api/v1/leaves/{created_leave_id}",
                    auth=auth,
                    timeout=TIMEOUT,
                )
                assert del_resp.status_code == 200 or del_resp.status_code == 204, (
                    f"Failed to delete leave request id {created_leave_id}, status {del_resp.status_code}"
                )
            except Exception:
                pass


test_post_api_v1_leaves()