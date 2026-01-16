#!/usr/bin/env python3
import os
import re

BASE = '/var/www/attendance-system/backend/src'

# Fix smart-policies.controller.ts - remove ALL imports for disabled services
controller_path = os.path.join(BASE, 'modules/smart-policies/smart-policies.controller.ts')
if os.path.exists(controller_path):
    with open(controller_path, 'r') as f:
        content = f.read()
    
    # Remove import lines completely
    disabled_modules = [
        'policy-approval.service',
        'policy-exception.service',
        'policy-simulation.service',
        'policy-templates.service',
        'policy-versioning.service',
        'retroactive-policy.service',
        'tiered-penalty.service',
    ]
    
    for module in disabled_modules:
        # Remove entire import line
        content = re.sub(
            rf"import \{{[^}}]*\}} from '\.\/{re.escape(module)}';\s*\n?",
            "",
            content
        )
    
    with open(controller_path, 'w') as f:
        f.write(content)
    print("Fixed smart-policies.controller.ts imports")

# Fix smart-policies.module.ts - remove all imports for disabled services
module_path = os.path.join(BASE, 'modules/smart-policies/smart-policies.module.ts')
if os.path.exists(module_path):
    with open(module_path, 'r') as f:
        content = f.read()
    
    disabled_modules = [
        'policy-approval.service',
        'policy-exception.service',
        'policy-simulation.service',
        'policy-templates.service',
        'policy-versioning.service',
        'retroactive-policy.service',
        'tiered-penalty.service',
    ]
    
    for module in disabled_modules:
        # Remove entire import line
        content = re.sub(
            rf"import \{{[^}}]*\}} from ['\"]\./{re.escape(module)}['\"];\s*\n?",
            "",
            content
        )
    
    with open(module_path, 'w') as f:
        f.write(content)
    print("Fixed smart-policies.module.ts imports")

# Fix smart-policy-executor.service.ts - ensure all disabled imports are removed
executor_path = os.path.join(BASE, 'modules/smart-policies/smart-policy-executor.service.ts')
if os.path.exists(executor_path):
    with open(executor_path, 'r') as f:
        content = f.read()
    
    disabled_modules = [
        'policy-approval.service',
        'policy-exception.service',
        'policy-simulation.service',
        'policy-templates.service',
        'policy-versioning.service',
        'retroactive-policy.service',
        'tiered-penalty.service',
    ]
    
    for module in disabled_modules:
        # Remove entire import line
        content = re.sub(
            rf"import \{{[^}}]*\}} from ['\"]\./{re.escape(module)}['\"];\s*\n?",
            "",
            content
        )
    
    with open(executor_path, 'w') as f:
        f.write(content)
    print("Fixed smart-policy-executor.service.ts imports")

print("\nDone!")
