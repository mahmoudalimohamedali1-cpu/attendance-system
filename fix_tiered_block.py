#!/usr/bin/env python3
import os
import re

BASE = '/var/www/attendance-system/backend/src'

executor_path = os.path.join(BASE, 'modules/smart-policies/smart-policy-executor.service.ts')
if os.path.exists(executor_path):
    with open(executor_path, 'r') as f:
        content = f.read()
    
    # Replace the entire tiered penalty if block with a skip
    old_block = '''if (parsed.tieredConfig && parsed.tieredConfig.tiers) {
                        // Use tiered penalty engine
                        const tiers: any[] = parsed.tieredConfig.tiers;
                        const occurrenceType = parsed.tieredConfig.occurrenceType || 'LATE';

                        const penaltyResult = await 0;

                        if (penaltyResult.calculatedAmount > 0) {
                            const sign: "EARNING" | "DEDUCTION" = penaltyResult.action.type === 'DEDUCT' ? 'DEDUCTION' : 'EARNING';
                            result = {
                                success: true,
                                amount: penaltyResult.calculatedAmount,
                                policyLine: {
                                    componentId: "SMART-TIER-" + policy.id.substring(0, 8),
                                    componentName: policy.name || "عقوبة متدرجة",
                                    componentCode: "SMART_TIERED",
                                    amount: penaltyResult.calculatedAmount,
                                    sign,
                                    descriptionAr: penaltyResult.explanation,
                                    source: {
                                        policyId: policy.id,
                                        policyCode: "SMART_TIERED",
                                        ruleId: `TIER-${penaltyResult.tier}`,
                                        ruleCode: "TIERED_PENALTY",
                                    },
                                },
                                explanation: penaltyResult.explanation,
                            };
                        } else {
                            result = { success: false, amount: 0 };
                        }
                    } else {'''
    
    new_block = '''if (parsed.tieredConfig && parsed.tieredConfig.tiers) {
                        // Tiered penalty engine DISABLED
                        this.logger.warn('Tiered penalty engine is disabled');
                        result = { success: false, amount: 0 };
                    } else {'''
    
    content = content.replace(old_block, new_block)
    
    # Also fix the excluded null check
    content = content.replace(
        'if (excluded.isExcluded) continue;',
        'if (excluded && excluded.isExcluded) continue;'
    )
    
    with open(executor_path, 'w') as f:
        f.write(content)
    print("Fixed tiered penalty block and null checks")

print("\nDone!")
