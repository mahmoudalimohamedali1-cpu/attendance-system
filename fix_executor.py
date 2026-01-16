#!/usr/bin/env python3
import re

with open('/var/www/attendance-system/backend/src/modules/smart-policies/smart-policy-executor.service.ts', 'r') as f:
    content = f.read()

# Comment out TieredPenaltyService import
content = re.sub(r'import \{ TieredPenaltyService, TieredPenaltyConfig \}[^;]+;', '// TieredPenalty disabled', content)
content = re.sub(r'TieredPenaltyService[,]?', '', content)
content = re.sub(r'private tieredPenaltyService: TieredPenaltyService,?', '', content)

with open('/var/www/attendance-system/backend/src/modules/smart-policies/smart-policy-executor.service.ts', 'w') as f:
    f.write(content)

print('Done - TieredPenaltyService removed from executor')
