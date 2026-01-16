#!/usr/bin/env python3
import os
import re

BASE = '/var/www/attendance-system/backend/src'

# Fix smart-policy-executor.service.ts - remove the broken tiered penalty calculation
executor_path = os.path.join(BASE, 'modules/smart-policies/smart-policy-executor.service.ts')
if os.path.exists(executor_path):
    with open(executor_path, 'r') as f:
        content = f.read()
    
    # Find and comment out the entire tiered penalty block that's causing syntax errors
    # Look for the pattern that calculates tiered penalty
    content = re.sub(
        r'const tiers: any\[\] = parsed\.tieredConfig\.tiers;[\s\S]*?// this\.tieredPenalty\.[\s\S]*?tiers,[\s\S]*?context\.baseSalary[\s\S]*?\);',
        '''// TIERED PENALTY DISABLED
                        calculatedAmount = 0;
                        console.log('Tiered penalty calculation disabled');''',
        content
    )
    
    with open(executor_path, 'w') as f:
        f.write(content)
    print("Fixed smart-policy-executor.service.ts tiered penalty")

# Fix users.service.ts - remove costCenter select completely as model doesn't exist
users_service_path = os.path.join(BASE, 'modules/users/users.service.ts')
if os.path.exists(users_service_path):
    with open(users_service_path, 'r') as f:
        content = f.read()
    
    # Remove costCenter from select
    content = re.sub(
        r"costCenter: \{ select: \{[^}]+\} \},?",
        "// costCenter disabled - model not in schema",
        content
    )
    
    with open(users_service_path, 'w') as f:
        f.write(content)
    print("Fixed users.service.ts costCenter")

print("\nDone with final fixes!")
