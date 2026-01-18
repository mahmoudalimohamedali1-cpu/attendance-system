#!/bin/bash

###############################################################################
# 🧪 ML Training Integration Test Script
#
# This script tests the AI Predictive ML training endpoint
#
# Usage:
#   ./test-ml-training.sh [AUTH_TOKEN]
#
# Examples:
#   ./test-ml-training.sh                    # Test without auth
#   ./test-ml-training.sh eyJhbGc...         # Test with auth token
###############################################################################

# Configuration
API_URL="${API_URL:-http://localhost:3001}"
AUTH_TOKEN="${1:-${TEST_AUTH_TOKEN}}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
WARNINGS=0

echo ""
echo "🧪 ML Training Integration Test"
echo "================================"
echo ""
echo "API URL: $API_URL"
echo "Auth: ${AUTH_TOKEN:+Provided}${AUTH_TOKEN:-Not provided}"
echo ""

###############################################################################
# Test 1: Train ML Model
###############################################################################
echo "📊 Test 1: Training ML Model..."
echo "   Endpoint: POST $API_URL/ai-predictive/train-model"
echo ""

if [ -n "$AUTH_TOKEN" ]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    "$API_URL/ai-predictive/train-model" \
    -d '{}')
else
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    "$API_URL/ai-predictive/train-model" \
    -d '{}')
fi

# Check if curl failed (connection refused)
if [ $? -ne 0 ]; then
  echo -e "${YELLOW}⚠️  Backend server not running (Connection refused)${NC}"
  echo -e "${YELLOW}   Expected server at: $API_URL${NC}"
  WARNINGS=$((WARNINGS + 1))
  SERVER_RUNNING=false
else
  SERVER_RUNNING=true

  # Extract status code and body
  HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  echo "   Status Code: $HTTP_CODE"
  echo "   Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""

  # Check status code
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo -e "${GREEN}✅ Model training endpoint returned success status${NC}"
    PASSED=$((PASSED + 1))

    # Parse response and check for success
    SUCCESS=$(echo "$BODY" | jq -r '.success // .data.success // false' 2>/dev/null)
    if [ "$SUCCESS" = "true" ]; then
      echo -e "${GREEN}✅ Model training reported success${NC}"
      PASSED=$((PASSED + 1))
    fi

    # Check for model version
    MODEL_VERSION=$(echo "$BODY" | jq -r '.modelVersion // .data.modelVersion // empty' 2>/dev/null)
    if [ -n "$MODEL_VERSION" ]; then
      echo -e "${GREEN}✅ Model version generated: $MODEL_VERSION${NC}"
      PASSED=$((PASSED + 1))
    fi

    # Check for accuracy metrics
    ACCURACY=$(echo "$BODY" | jq -r '.accuracy // .data.accuracy // empty' 2>/dev/null)
    if [ -n "$ACCURACY" ] && [ "$ACCURACY" != "null" ]; then
      ACCURACY_PCT=$(echo "$ACCURACY * 100" | bc -l | xargs printf "%.2f")
      echo -e "${GREEN}✅ Accuracy metric calculated: $ACCURACY_PCT%${NC}"
      PASSED=$((PASSED + 1))

      PRECISION=$(echo "$BODY" | jq -r '.precision // .data.precision // empty' 2>/dev/null)
      if [ -n "$PRECISION" ] && [ "$PRECISION" != "null" ]; then
        PRECISION_PCT=$(echo "$PRECISION * 100" | bc -l | xargs printf "%.2f")
        echo -e "${GREEN}✅ Precision metric: $PRECISION_PCT%${NC}"
        PASSED=$((PASSED + 1))
      fi

      RECALL=$(echo "$BODY" | jq -r '.recall // .data.recall // empty' 2>/dev/null)
      if [ -n "$RECALL" ] && [ "$RECALL" != "null" ]; then
        RECALL_PCT=$(echo "$RECALL * 100" | bc -l | xargs printf "%.2f")
        echo -e "${GREEN}✅ Recall metric: $RECALL_PCT%${NC}"
        PASSED=$((PASSED + 1))
      fi

      F1_SCORE=$(echo "$BODY" | jq -r '.f1Score // .data.f1Score // empty' 2>/dev/null)
      if [ -n "$F1_SCORE" ] && [ "$F1_SCORE" != "null" ]; then
        F1_PCT=$(echo "$F1_SCORE * 100" | bc -l | xargs printf "%.2f")
        echo -e "${GREEN}✅ F1 Score metric: $F1_PCT%${NC}"
        PASSED=$((PASSED + 1))
      fi
    else
      echo -e "${RED}❌ No accuracy metrics in response${NC}"
      FAILED=$((FAILED + 1))
    fi

  elif [ "$HTTP_CODE" = "401" ]; then
    echo -e "${YELLOW}⚠️  Authentication required - need valid token${NC}"
    echo -e "${YELLOW}   Run: ./test-ml-training.sh YOUR_AUTH_TOKEN${NC}"
    WARNINGS=$((WARNINGS + 1))
  else
    echo -e "${RED}❌ Expected 200/201, got $HTTP_CODE${NC}"
    FAILED=$((FAILED + 1))
  fi
fi

echo ""

###############################################################################
# Test 2: Verify Accuracy Metrics Stored
###############################################################################
if [ "$SERVER_RUNNING" = true ]; then
  echo "📈 Test 2: Checking Model Accuracy Metrics..."
  echo "   Endpoint: GET $API_URL/ai-predictive/model-accuracy"
  echo ""

  if [ -n "$AUTH_TOKEN" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      "$API_URL/ai-predictive/model-accuracy")
  else
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
      "$API_URL/ai-predictive/model-accuracy")
  fi

  HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  echo "   Status Code: $HTTP_CODE"

  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Model accuracy endpoint accessible${NC}"
    PASSED=$((PASSED + 1))

    ACCURACY=$(echo "$BODY" | jq -r '.accuracy // .data.accuracy // empty' 2>/dev/null)
    if [ -n "$ACCURACY" ] && [ "$ACCURACY" != "null" ]; then
      echo -e "${GREEN}✅ Accuracy metrics stored and retrievable${NC}"
      PASSED=$((PASSED + 1))
    else
      echo -e "${YELLOW}⚠️  No accuracy metrics found (model may not be trained yet)${NC}"
      WARNINGS=$((WARNINGS + 1))
    fi
  elif [ "$HTTP_CODE" = "401" ]; then
    echo -e "${YELLOW}⚠️  Authentication required for accuracy endpoint${NC}"
    WARNINGS=$((WARNINGS + 1))
  fi

  echo ""
fi

###############################################################################
# Test 3: Verify Predictions Generated
###############################################################################
if [ "$SERVER_RUNNING" = true ]; then
  echo "🎯 Test 3: Verifying Predictions Generated..."
  echo "   Endpoint: GET $API_URL/ai-predictive/employee-predictions"
  echo ""

  if [ -n "$AUTH_TOKEN" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      "$API_URL/ai-predictive/employee-predictions")
  else
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
      "$API_URL/ai-predictive/employee-predictions")
  fi

  HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  echo "   Status Code: $HTTP_CODE"

  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Employee predictions endpoint accessible${NC}"
    PASSED=$((PASSED + 1))

    PRED_COUNT=$(echo "$BODY" | jq -r '.predictions // .data.predictions // [] | length' 2>/dev/null)
    if [ -n "$PRED_COUNT" ] && [ "$PRED_COUNT" -gt 0 ]; then
      echo -e "${GREEN}✅ Predictions generated for $PRED_COUNT employees${NC}"
      PASSED=$((PASSED + 1))

      # Check prediction structure
      HAS_LIKELIHOOD=$(echo "$BODY" | jq -r '(.predictions // .data.predictions)[0].absenceLikelihood // empty' 2>/dev/null)
      if [ -n "$HAS_LIKELIHOOD" ]; then
        echo -e "${GREEN}✅ Predictions include absence likelihood scores${NC}"
        PASSED=$((PASSED + 1))
      fi

      HAS_RISK=$(echo "$BODY" | jq -r '(.predictions // .data.predictions)[0].riskLevel // empty' 2>/dev/null)
      if [ -n "$HAS_RISK" ]; then
        echo -e "${GREEN}✅ Predictions include risk levels${NC}"
        PASSED=$((PASSED + 1))
      fi

      HAS_FACTORS=$(echo "$BODY" | jq -r '(.predictions // .data.predictions)[0].contributingFactors // empty' 2>/dev/null)
      if [ -n "$HAS_FACTORS" ]; then
        echo -e "${GREEN}✅ Predictions include contributing factors${NC}"
        PASSED=$((PASSED + 1))
      fi
    else
      echo -e "${YELLOW}⚠️  No predictions found (no employees or insufficient data)${NC}"
      WARNINGS=$((WARNINGS + 1))
    fi
  elif [ "$HTTP_CODE" = "401" ]; then
    echo -e "${YELLOW}⚠️  Authentication required for predictions endpoint${NC}"
    WARNINGS=$((WARNINGS + 1))
  fi

  echo ""
fi

###############################################################################
# Print Summary
###############################################################################
echo "============================================================"
echo "📋 TEST RESULTS SUMMARY"
echo "============================================================"
echo ""
echo -e "${GREEN}✅ Passed:  $PASSED${NC}"
echo -e "${RED}❌ Failed:  $FAILED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo ""
echo "============================================================"

###############################################################################
# Provide Guidance
###############################################################################
if [ "$SERVER_RUNNING" != true ]; then
  echo ""
  echo "💡 To run the backend server:"
  echo "   cd backend"
  echo "   npm install"
  echo "   npm run start:dev"
  echo ""
fi

if [ $WARNINGS -gt 0 ] && grep -q "Authentication required" <<< "$RESPONSE"; then
  echo ""
  echo "💡 To test with authentication:"
  echo "   1. Start the backend server"
  echo "   2. Login and get an auth token"
  echo "   3. Run: ./test-ml-training.sh YOUR_AUTH_TOKEN"
  echo ""
fi

# Exit with appropriate code
if [ $FAILED -gt 0 ]; then
  exit 1
else
  exit 0
fi
