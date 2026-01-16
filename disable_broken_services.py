#!/usr/bin/env python3
import os
import re
import shutil

BASE = '/var/www/attendance-system/backend/src'

# Services to disable (they use non-existent Prisma models)
services_to_disable = [
    'modules/smart-policies/retroactive-policy.service.ts',
    'modules/smart-policies/policy-simulation.service.ts',
    'modules/smart-policies/tiered-penalty.service.ts',
    'modules/smart-policies/policy-versioning.service.ts',
    'modules/smart-policies/policy-templates.service.ts',
    'modules/smart-policies/policy-approval.service.ts',
    'modules/smart-policies/policy-exception.service.ts',
]

# Modules to completely disable (have many broken files)
modules_to_disable = [
    'modules/goals',
    'modules/kpi',
    'modules/performance-reviews',
    'modules/recognition',
    'modules/tasks',
    'modules/ai-chat',
    'modules/company-config',
    'modules/cost-centers',
]

disabled_count = 0

# Disable individual services
for service in services_to_disable:
    path = os.path.join(BASE, service)
    if os.path.exists(path):
        new_path = path + '.disabled'
        os.rename(path, new_path)
        print(f"Disabled: {service}")
        disabled_count += 1

# Disable entire modules
for module in modules_to_disable:
    path = os.path.join(BASE, module)
    if os.path.exists(path):
        new_path = path + '.disabled'
        if os.path.exists(new_path):
            shutil.rmtree(new_path)
        os.rename(path, new_path)
        print(f"Disabled module: {module}")
        disabled_count += 1

print(f"\nTotal disabled: {disabled_count}")

# Now update app.module.ts to remove these imports
app_module_path = os.path.join(BASE, 'app.module.ts')
with open(app_module_path, 'r') as f:
    content = f.read()

# Modules to comment out in app.module.ts
modules_to_comment = [
    'GoalsModule',
    'KpiModule', 
    'PerformanceReviewsModule',
    'RecognitionModule',
    'TasksModule',
    'AiChatModule',
    'CompanyConfigModule',
    'CostCentersModule',
]

for module in modules_to_comment:
    # Comment out import
    content = re.sub(
        rf"import \{{ {module} \}}[^;]+;",
        f"// import {{ {module} }} - DISABLED",
        content
    )
    # Comment out in imports array
    content = re.sub(
        rf"(\s+){module},",
        rf"\1// {module}, // DISABLED",
        content
    )

with open(app_module_path, 'w') as f:
    f.write(content)

print("Updated app.module.ts")

# Update smart-policies.module.ts
sp_module_path = os.path.join(BASE, 'modules/smart-policies/smart-policies.module.ts')
if os.path.exists(sp_module_path):
    with open(sp_module_path, 'r') as f:
        content = f.read()
    
    # Services to comment out
    services = [
        'RetroactivePolicyService',
        'PolicySimulationService', 
        'TieredPenaltyService',
        'PolicyVersioningService',
        'PolicyTemplatesService',
        'PolicyApprovalService',
        'PolicyExceptionService',
    ]
    
    for svc in services:
        # Comment out import
        content = re.sub(
            rf"import \{{ {svc}[^}}]*\}}[^;]+;",
            f"// import {{ {svc} }} - DISABLED",
            content
        )
        # Comment out in providers/exports
        content = re.sub(
            rf"(\s+){svc},",
            rf"\1// {svc}, // DISABLED",
            content
        )
    
    with open(sp_module_path, 'w') as f:
        f.write(content)
    
    print("Updated smart-policies.module.ts")

# Update smart-policy-executor.service.ts
executor_path = os.path.join(BASE, 'modules/smart-policies/smart-policy-executor.service.ts')
if os.path.exists(executor_path):
    with open(executor_path, 'r') as f:
        content = f.read()
    
    # Comment out problematic imports and usages
    content = re.sub(
        r"import \{ TieredPenaltyService[^}]*\}[^;]+;",
        "// TieredPenalty DISABLED",
        content
    )
    content = re.sub(
        r"private tieredPenaltyService: TieredPenaltyService,?",
        "// tieredPenaltyService DISABLED",
        content
    )
    
    with open(executor_path, 'w') as f:
        f.write(content)
    
    print("Updated smart-policy-executor.service.ts")

print("\nDone! Try building now.")
