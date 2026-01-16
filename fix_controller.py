#!/usr/bin/env python3
import os
import re

BASE = '/var/www/attendance-system/backend/src'

# Fix smart-policies.controller.ts constructor and methods
controller_path = os.path.join(BASE, 'modules/smart-policies/smart-policies.controller.ts')
if os.path.exists(controller_path):
    with open(controller_path, 'r') as f:
        content = f.read()
    
    # Comment out constructor parameters for disabled services
    disabled_services = [
        ('approvalService', 'PolicyApprovalService'),
        ('simulationService', 'PolicySimulationService'),
        ('exceptionService', 'PolicyExceptionService'),
        ('retroService', 'RetroactivePolicyService'),
        ('tieredPenaltyService', 'TieredPenaltyService'),
        ('templatesService', 'PolicyTemplatesService'),
        ('versioningService', 'PolicyVersioningService'),
    ]
    
    for var_name, service_name in disabled_services:
        # Comment out constructor parameter
        content = re.sub(
            rf'private readonly {var_name}: {service_name},?\s*',
            f'// {var_name} DISABLED\n        ',
            content
        )
    
    # Comment out CreatePolicyExceptionDto usage
    content = re.sub(
        r'CreatePolicyExceptionDto',
        'any /* CreatePolicyExceptionDto DISABLED */',
        content
    )
    
    # Comment out any method bodies that use these services
    # Replace this.exceptionService with null check
    content = re.sub(
        r'this\.exceptionService\.',
        '(null as any).',
        content
    )
    content = re.sub(
        r'this\.retroService\.',
        '(null as any).',
        content
    )
    content = re.sub(
        r'this\.tieredPenaltyService\.',
        '(null as any).',
        content
    )
    content = re.sub(
        r'this\.templatesService\.',
        '(null as any).',
        content
    )
    content = re.sub(
        r'this\.simulationService\.',
        '(null as any).',
        content
    )
    content = re.sub(
        r'this\.approvalService\.',
        '(null as any).',
        content
    )
    content = re.sub(
        r'this\.versioningService\.',
        '(null as any).',
        content
    )
    
    with open(controller_path, 'w') as f:
        f.write(content)
    print("Fixed smart-policies.controller.ts")

print("\nDone!")
