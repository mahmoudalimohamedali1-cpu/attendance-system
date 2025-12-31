#!/bin/bash
# Tenant Isolation Test Script
# Tests company A cannot access company B data

BASE_URL=${1:-"https://attendance.saudicx.com/api"}
TOKEN_A=${2:-"YOUR_COMPANY_A_TOKEN"}
TOKEN_B=${3:-"YOUR_COMPANY_B_TOKEN"}
ENTITY_ID_B=${4:-"ENTITY_ID_FROM_COMPANY_B"}

echo "=== Tenant Isolation Tests ==="
echo "Base URL: $BASE_URL"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

test_count=0
pass_count=0
fail_count=0

run_test() {
    local name=$1
    local expected_status=$2
    local actual_status=$3
    
    test_count=$((test_count + 1))
    if [ "$actual_status" == "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $name (HTTP $actual_status)"
        pass_count=$((pass_count + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: $name (Expected $expected_status, Got $actual_status)"
        fail_count=$((fail_count + 1))
    fi
}

echo "--- Test 1: No Token → 401 ---"
status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/mudad")
run_test "GET /mudad without token" "401" "$status"

echo ""
echo "--- Test 2: Cross-Company Access → 403/404 ---"

# Test Mudad cross-company access
status=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN_A" \
    "$BASE_URL/mudad/$ENTITY_ID_B")
run_test "GET /mudad/:id (Company A token → Company B entity)" "404" "$status"

# Test WPS cross-company access
status=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN_A" \
    "$BASE_URL/wps-tracking/$ENTITY_ID_B")
run_test "GET /wps-tracking/:id (Company A token → Company B entity)" "404" "$status"

# Test Qiwa (should return empty, not other company data)
echo ""
echo "--- Test 3: Stats Isolation ---"
response=$(curl -s -H "Authorization: Bearer $TOKEN_A" "$BASE_URL/mudad/stats?year=2024")
echo "Mudad stats response: $response"

response=$(curl -s -H "Authorization: Bearer $TOKEN_A" "$BASE_URL/wps-tracking/stats")
echo "WPS stats response: $response"

echo ""
echo "--- Test 4: Status Update Cross-Company → 403/404 ---"
status=$(curl -s -o /dev/null -w "%{http_code}" \
    -X PUT \
    -H "Authorization: Bearer $TOKEN_A" \
    -H "Content-Type: application/json" \
    -d '{"status":"SUBMITTED"}' \
    "$BASE_URL/mudad/$ENTITY_ID_B/status")
run_test "PUT /mudad/:id/status (Cross-company)" "404" "$status"

echo ""
echo "========================================="
echo "Results: $pass_count/$test_count passed"
if [ $fail_count -gt 0 ]; then
    echo -e "${RED}$fail_count tests failed!${NC}"
    exit 1
else
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
fi
