#!/bin/bash
cd /var/www/attendance-system/backend
API_KEY=$(grep GEMINI_API_KEY .env | cut -d'=' -f2)
echo "API Key (first 10 chars): ${API_KEY:0:10}..."
curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=$API_KEY" | python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'models' in data:
    for m in data['models']:
        name = m.get('name', '').replace('models/', '')
        methods = m.get('supportedGenerationMethods', [])
        if 'generateContent' in methods:
            print(f'✅ {name}')
else:
    print('Error:', data)
"
