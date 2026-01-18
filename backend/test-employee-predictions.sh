#!/bin/bash

##
# 🧪 Employee Predictions Integration Test Script
#
# This script tests the employee predictions endpoints using curl
# to verify individual employee absence predictions with explanations.
#
# Usage:
#   ./test-employee-predictions.sh [AUTH_TOKEN]
#
# Example:
#   ./test-employee-predictions.sh eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
##

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3001}"
AUTH_TOKEN="${1:-}"

# Test counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_test() {
    echo -e "\n${BLUE}🧪 $1${NC}"
}

print_pass() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++))
}

print_fail() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED++))
}

print_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

# Check if jq is available
if ! command -v jq &> /dev/null; then
    print_warn "jq not found - JSON parsing will be limited"
    HAS_JQ=false
else
    HAS_JQ=true
fi

# Main tests
print_header "🧪 Employee Predictions Integration Test"
echo "Testing endpoint: ${API_URL}/ai-predictive/employee-predictions"
echo "Auth Token: ${AUTH_TOKEN:+Provided}${AUTH_TOKEN:-Not provided (may cause 401 errors)}"
echo ""

##
# Test 1: Get All Employee Predictions
##
print_test "Test 1: Getting All Employee Predictions"

if [ -z "$AUTH_TOKEN" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" "${API_URL}/ai-predictive/employee-predictions")
else
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer ${AUTH_TOKEN}" \
        "${API_URL}/ai-predictive/employee-predictions")
fi

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "   Status Code: ${HTTP_CODE}"

if [ "$HTTP_CODE" == "200" ]; then
    print_pass "Employee predictions endpoint returned success status"

    if [ "$HAS_JQ" = true ]; then
        # Check response structure
        SUCCESS=$(echo "$BODY" | jq -r '.success // .data.success // "null"')

        if [ "$SUCCESS" == "true" ]; then
            print_pass "Predictions request reported success"
        fi

        # Get predictions array
        PREDICTIONS=$(echo "$BODY" | jq -r '.predictions // .data.predictions // []')
        PRED_COUNT=$(echo "$PREDICTIONS" | jq 'length')

        if [ "$PRED_COUNT" -gt 0 ]; then
            print_pass "Found predictions for ${PRED_COUNT} employees"

            # Check if all have likelihood scores
            ALL_HAVE_LIKELIHOOD=$(echo "$PREDICTIONS" | jq 'all(.[]; .absenceLikelihood != null)')
            if [ "$ALL_HAVE_LIKELIHOOD" == "true" ]; then
                print_pass "All employees have absence likelihood scores"
            else
                print_fail "Some employees missing absence likelihood scores"
            fi

            # Check if all have risk levels
            ALL_HAVE_RISK=$(echo "$PREDICTIONS" | jq 'all(.[]; .riskLevel != null)')
            if [ "$ALL_HAVE_RISK" == "true" ]; then
                print_pass "All employees have risk levels"
            else
                print_fail "Some employees missing risk levels"
            fi

            # Check if all have contributing factors
            ALL_HAVE_FACTORS=$(echo "$PREDICTIONS" | jq 'all(.[]; .contributingFactors != null and (.contributingFactors | length) > 0)')
            if [ "$ALL_HAVE_FACTORS" == "true" ]; then
                print_pass "All employees have contributing factors"
            else
                print_fail "Some employees missing contributing factors"
            fi

            # Display sample prediction
            echo "   Sample Prediction:"
            SAMPLE_NAME=$(echo "$PREDICTIONS" | jq -r '.[0].employeeName // .[0].userId')
            SAMPLE_LIKELIHOOD=$(echo "$PREDICTIONS" | jq -r '.[0].absenceLikelihood')
            SAMPLE_RISK=$(echo "$PREDICTIONS" | jq -r '.[0].riskLevel')
            SAMPLE_FACTORS=$(echo "$PREDICTIONS" | jq -r '.[0].contributingFactors | length')

            echo "     - Employee: ${SAMPLE_NAME}"
            echo "     - Likelihood: ${SAMPLE_LIKELIHOOD}%"
            echo "     - Risk Level: ${SAMPLE_RISK}"
            echo "     - Contributing Factors: ${SAMPLE_FACTORS} factors"

            # Store first employee ID for next test
            FIRST_EMPLOYEE_ID=$(echo "$PREDICTIONS" | jq -r '.[0].userId')

        else
            print_warn "No predictions found (no employees or model not trained)"
        fi
    else
        # Without jq, just check if response is not empty
        if [ -n "$BODY" ]; then
            print_pass "Response received (install jq for detailed validation)"
        fi
    fi

elif [ "$HTTP_CODE" == "401" ]; then
    print_warn "Authentication required - need valid token"
    FIRST_EMPLOYEE_ID=""
elif [ "$HTTP_CODE" == "000" ]; then
    print_warn "Backend server not running (Connection refused)"
    print_warn "Expected server at: ${API_URL}"
    FIRST_EMPLOYEE_ID=""
else
    print_fail "Expected 200, got ${HTTP_CODE}"
    FIRST_EMPLOYEE_ID=""
fi

##
# Test 2: Get Individual Employee Prediction with Explanation
##
print_test "Test 2: Getting Individual Employee Prediction with Explanation"

if [ -z "$FIRST_EMPLOYEE_ID" ]; then
    print_warn "Skipping individual prediction test (no employee ID available)"
else
    echo "   Testing employee ID: ${FIRST_EMPLOYEE_ID}"

    if [ -z "$AUTH_TOKEN" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" \
            "${API_URL}/ai-predictive/employee-predictions/${FIRST_EMPLOYEE_ID}")
    else
        RESPONSE=$(curl -s -w "\n%{http_code}" \
            -H "Authorization: Bearer ${AUTH_TOKEN}" \
            "${API_URL}/ai-predictive/employee-predictions/${FIRST_EMPLOYEE_ID}")
    fi

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    echo "   Status Code: ${HTTP_CODE}"

    if [ "$HTTP_CODE" == "200" ]; then
        print_pass "Individual employee prediction endpoint returned success status"

        if [ "$HAS_JQ" = true ]; then
            # Check for prediction object
            HAS_PREDICTION=$(echo "$BODY" | jq 'has("prediction") or (.data | has("prediction"))')
            if [ "$HAS_PREDICTION" == "true" ]; then
                print_pass "Prediction object present in response"
            else
                print_fail "Response missing prediction object"
            fi

            # Check for explanation object
            HAS_EXPLANATION=$(echo "$BODY" | jq 'has("explanation") or (.data | has("explanation"))')
            if [ "$HAS_EXPLANATION" == "true" ]; then
                print_pass "Explanation object present in response"

                EXPLANATION=$(echo "$BODY" | jq -r '.explanation // .data.explanation')

                # Check explanation structure
                HAS_SUMMARY=$(echo "$EXPLANATION" | jq 'has("summary")')
                if [ "$HAS_SUMMARY" == "true" ]; then
                    print_pass "Explanation includes summary"
                else
                    print_fail "Explanation missing summary"
                fi

                HAS_RISK=$(echo "$EXPLANATION" | jq 'has("riskLevel")')
                if [ "$HAS_RISK" == "true" ]; then
                    print_pass "Explanation includes risk level"
                else
                    print_fail "Explanation missing risk level"
                fi

                HAS_LIKELIHOOD=$(echo "$EXPLANATION" | jq 'has("likelihood")')
                if [ "$HAS_LIKELIHOOD" == "true" ]; then
                    print_pass "Explanation includes likelihood score"
                else
                    print_fail "Explanation missing likelihood score"
                fi

                # Check for top factors
                TOP_FACTORS=$(echo "$EXPLANATION" | jq -r '.topFactors // []')
                FACTORS_COUNT=$(echo "$TOP_FACTORS" | jq 'length')

                if [ "$FACTORS_COUNT" -gt 0 ]; then
                    print_pass "Explanation includes ${FACTORS_COUNT} top contributing factors"

                    # Display top factors
                    echo "   Top Contributing Factors:"
                    echo "$TOP_FACTORS" | jq -r '.[] | "     - \(.feature) (\(.impact)): \(.description)"' | head -3

                    # Check factor structure
                    FACTOR_HAS_FIELDS=$(echo "$TOP_FACTORS" | jq 'all(.[]; has("feature") and has("impact") and has("description"))')
                    if [ "$FACTOR_HAS_FIELDS" == "true" ]; then
                        print_pass "Contributing factors have proper structure"
                    else
                        print_warn "Contributing factors missing some fields"
                    fi
                else
                    print_warn "No top factors found in explanation"
                fi

                # Check for detailed explanation
                DETAILED=$(echo "$EXPLANATION" | jq -r '.detailedExplanation // ""')
                if [ -n "$DETAILED" ] && [ "${#DETAILED}" -gt 50 ]; then
                    print_pass "Detailed explanation provided and comprehensive"
                elif [ -n "$DETAILED" ]; then
                    print_warn "Detailed explanation seems too short"
                else
                    print_fail "Explanation missing detailed explanation text"
                fi

                # Check for recommendations
                RECOMMENDATIONS=$(echo "$EXPLANATION" | jq -r '.recommendations // []')
                REC_COUNT=$(echo "$RECOMMENDATIONS" | jq 'length')

                if [ "$REC_COUNT" -gt 0 ]; then
                    print_pass "Explanation includes ${REC_COUNT} recommendations"
                    echo "   Recommendations:"
                    echo "$RECOMMENDATIONS" | jq -r '.[] | "     - \(.)"'
                else
                    print_warn "No recommendations in explanation"
                fi

            else
                print_fail "Response missing explanation object"
            fi
        else
            print_pass "Response received (install jq for detailed validation)"
        fi

    elif [ "$HTTP_CODE" == "401" ]; then
        print_warn "Authentication required for individual prediction"
    else
        print_fail "Expected 200, got ${HTTP_CODE}"
    fi
fi

##
# Print Summary
##
print_header "📋 TEST RESULTS SUMMARY"
echo ""
echo -e "${GREEN}✅ Passed: ${PASSED}${NC}"
echo -e "${RED}❌ Failed: ${FAILED}${NC}"
echo -e "${YELLOW}⚠️  Warnings: ${WARNINGS}${NC}"
echo ""

if [ $WARNINGS -gt 0 ]; then
    echo "💡 Troubleshooting Tips:"

    if grep -q "not running" <(echo "$WARNINGS"); then
        echo "   • Start backend: cd backend && npm run start:dev"
    fi

    if grep -q "Authentication" <(echo "$WARNINGS"); then
        echo "   • Get auth token: curl -X POST http://localhost:3001/auth/login ..."
        echo "   • Run with token: ./test-employee-predictions.sh YOUR_TOKEN"
    fi

    if grep -q "model not trained" <(echo "$WARNINGS"); then
        echo "   • Train model first: ./test-ml-training.sh YOUR_TOKEN"
    fi

    echo ""
fi

# Exit with appropriate code
if [ $FAILED -gt 0 ]; then
    exit 1
else
    exit 0
fi
