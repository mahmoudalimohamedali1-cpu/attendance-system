#!/usr/bin/env python3
import re

with open('/var/www/attendance-system/backend/src/modules/smart-policies/smart-policies.module.ts', 'r') as f:
    content = f.read()

# Comment out TieredPenaltyService
content = re.sub(r'import \{ TieredPenaltyService \}', '// import { TieredPenaltyService }', content)
content = re.sub(r'TieredPenaltyService,', '// TieredPenaltyService,', content)

with open('/var/www/attendance-system/backend/src/modules/smart-policies/smart-policies.module.ts', 'w') as f:
    f.write(content)

print('Done - TieredPenaltyService commented out')
