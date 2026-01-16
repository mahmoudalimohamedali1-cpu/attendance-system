#!/bin/bash

echo "=== Testing Task Management System APIs ==="
echo ""

# Login and get token
echo "Logging in..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"123456"}')

TOKEN=$(echo $RESPONSE | jq -r '.accessToken')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "Login failed: $RESPONSE"
  exit 1
fi

echo "Login successful! Token obtained."
echo ""

# PHASE 8: Analytics
echo "=== PHASE 8: Analytics Dashboard ==="
echo ""

echo "1. Productivity Metrics:"
curl -s http://localhost:3000/api/v1/tasks/analytics/metrics \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

echo "2. Team Performance:"
curl -s http://localhost:3000/api/v1/tasks/analytics/team \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

echo "3. Time Analytics:"
curl -s http://localhost:3000/api/v1/tasks/analytics/time \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

echo "4. Task Trends (last 7 days):"
curl -s "http://localhost:3000/api/v1/tasks/analytics/trends?days=7" \
  -H "Authorization: Bearer $TOKEN" | jq '.[0:3]'
echo ""

# PHASE 9: Automations
echo "=== PHASE 9: Automations ==="
echo ""

echo "5. Get Automations:"
curl -s http://localhost:3000/api/v1/tasks/automations \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

echo "6. Create Automation (test):"
AUTOMATION=$(curl -s -X POST http://localhost:3000/api/v1/tasks/automations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Auto Rule","description":"When task completed, notify","trigger":"TASK_COMPLETED","action":"SEND_NOTIFICATION","actionConfig":{"message":"Task done!"}}')
echo $AUTOMATION | jq '.'
AUTOMATION_ID=$(echo $AUTOMATION | jq -r '.id')
echo ""

if [ "$AUTOMATION_ID" != "null" ] && [ -n "$AUTOMATION_ID" ]; then
  echo "7. Toggle Automation:"
  curl -s -X PATCH "http://localhost:3000/api/v1/tasks/automations/$AUTOMATION_ID/toggle" \
    -H "Authorization: Bearer $TOKEN" | jq '{id, isActive}'
  echo ""

  echo "8. Automation Logs:"
  curl -s "http://localhost:3000/api/v1/tasks/automations/$AUTOMATION_ID/logs" \
    -H "Authorization: Bearer $TOKEN" | jq '.'
  echo ""

  echo "9. Delete Automation:"
  curl -s -X DELETE "http://localhost:3000/api/v1/tasks/automations/$AUTOMATION_ID" \
    -H "Authorization: Bearer $TOKEN" | jq '.'
  echo ""
fi

# PHASE 7: Communication Hub
echo "=== PHASE 7: Communication Hub ==="
echo ""

# Get first task
TASK_ID=$(curl -s http://localhost:3000/api/v1/tasks \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id // empty')

if [ -n "$TASK_ID" ]; then
  echo "10. Threaded Comments (Task: $TASK_ID):"
  curl -s "http://localhost:3000/api/v1/tasks/$TASK_ID/comments/threaded" \
    -H "Authorization: Bearer $TOKEN" | jq '.'
  echo ""

  echo "11. Activity Feed:"
  curl -s "http://localhost:3000/api/v1/tasks/$TASK_ID/activity?limit=5" \
    -H "Authorization: Bearer $TOKEN" | jq '.[0:2]'
  echo ""
else
  echo "No tasks found to test comments/activity"
fi

# PHASE 6: Dependencies & Gantt
echo "=== PHASE 6: Dependencies & Gantt ==="
echo ""

echo "12. Gantt Data:"
curl -s http://localhost:3000/api/v1/tasks/gantt \
  -H "Authorization: Bearer $TOKEN" | jq '.[0:3]'
echo ""

echo "=== ALL TESTS COMPLETE ==="
