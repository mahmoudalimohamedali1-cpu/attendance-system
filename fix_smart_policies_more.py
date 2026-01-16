#!/usr/bin/env python3
import os
import re

BASE = '/var/www/attendance-system/backend/src'

# Fix smart-policies.controller.ts
controller_path = os.path.join(BASE, 'modules/smart-policies/smart-policies.controller.ts')
if os.path.exists(controller_path):
    with open(controller_path, 'r') as f:
        content = f.read()
    
    # Comment out all disabled service imports
    disabled_imports = [
        'RetroactivePolicyService',
        'CreateRetroApplicationDto',
        'TieredPenaltyService',
        'PolicyTemplatesService',
        'PolicyVersioningService',
        'PolicySimulationService',
        'PolicyApprovalService',
        'PolicyExceptionService',
    ]
    
    for svc in disabled_imports:
        # Comment out any import containing this name
        content = re.sub(
            rf"import \{{[^}}]*{svc}[^}}]*\}}[^;]*;",
            f"// {svc} import DISABLED",
            content
        )
    
    # Also comment out constructor parameters using these services
    content = re.sub(
        r'private retroactivePolicyService: RetroactivePolicyService,?',
        '// retroactivePolicyService DISABLED',
        content
    )
    content = re.sub(
        r'private tieredPenaltyService: TieredPenaltyService,?',
        '// tieredPenaltyService DISABLED',
        content
    )
    content = re.sub(
        r'private policyTemplatesService: PolicyTemplatesService,?',
        '// policyTemplatesService DISABLED',
        content
    )
    
    with open(controller_path, 'w') as f:
        f.write(content)
    print("Fixed smart-policies.controller.ts")

# Fix smart-policy-executor.service.ts more thoroughly
executor_path = os.path.join(BASE, 'modules/smart-policies/smart-policy-executor.service.ts')
if os.path.exists(executor_path):
    with open(executor_path, 'r') as f:
        content = f.read()
    
    # Comment out all disabled imports
    content = re.sub(
        r"import \{[^}]*PolicyExceptionService[^}]*\}[^;]*;",
        "// PolicyExceptionService import DISABLED",
        content
    )
    content = re.sub(
        r"import \{[^}]*TieredPenaltyService[^}]*\}[^;]*;",
        "// TieredPenaltyService import DISABLED", 
        content
    )
    
    # Comment out constructor parameters
    content = re.sub(
        r'private policyExceptionService: PolicyExceptionService,?',
        '// policyExceptionService DISABLED',
        content
    )
    content = re.sub(
        r'private tieredPenalty: TieredPenaltyService,?',
        '// tieredPenalty DISABLED',
        content
    )
    
    # Replace usages of TieredPenaltyConfig with any
    content = re.sub(r'TieredPenaltyConfig\[\]', 'any[]', content)
    content = re.sub(r'TieredPenaltyConfig', 'any', content)
    
    # Comment out usages of disabled services
    content = re.sub(
        r'this\.tieredPenalty\.',
        '// this.tieredPenalty.',
        content
    )
    content = re.sub(
        r'this\.policyExceptionService\.',
        '// this.policyExceptionService.',
        content
    )
    
    with open(executor_path, 'w') as f:
        f.write(content)
    print("Fixed smart-policy-executor.service.ts")

# Fix users.service.ts - nameAr issue with CostCenter
users_service_path = os.path.join(BASE, 'modules/users/users.service.ts')
if os.path.exists(users_service_path):
    with open(users_service_path, 'r') as f:
        content = f.read()
    
    # Replace nameAr with name for costCenter
    content = re.sub(
        r'costCenter: \{ select: \{ id: true, nameAr: true',
        'costCenter: { select: { id: true, name: true',
        content
    )
    
    with open(users_service_path, 'w') as f:
        f.write(content)
    print("Fixed users.service.ts")

print("\nDone with additional fixes!")
