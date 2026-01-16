#!/bin/bash
cd /var/www/attendance-system/backend
curl -s -X POST http://localhost:3000/api/v1/smart-policies/auto-extend \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer test' \
  -d '{"text":"test policy"}'
