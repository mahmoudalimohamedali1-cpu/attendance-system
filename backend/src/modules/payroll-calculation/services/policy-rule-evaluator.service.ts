import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PoliciesService } from '../../policies/policies.service';
import { PolicyType } from '../../policies/dto/create-policy.dto';
import { PolicyPayrollLine } from '../dto/calculation.types';
import { PolicyEvaluationContext, PolicyRuleResult } from '../dto/policy-context.types';

/**
 * Policy Rule Evaluator Service
 * Evaluates policy rules and produces PolicyPayrollLines
 * Uses strategy pattern per policy type
 */
@Injectable()
export class PolicyRuleEvaluatorService {
    private readonly logger = new Logger(PolicyRuleEvaluatorService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly policiesService: PoliciesService,
    ) { }

    /**
     * Main entry point - evaluate all applicable policies for an employee
     */
    async evaluate(context: PolicyEvaluationContext): Promise<PolicyPayrollLine[]> {
        const lines: PolicyPayrollLine[] = [];
        const { employee } = context;

        // Evaluate each policy type that has relevant context data
        const typeEvaluators: Array<{ type: PolicyType; hasData: () => boolean }> = [
            { type: PolicyType.OVERTIME, hasData: () => (context.attendance?.otHours || 0) > 0 },
            // 🔧 DISABLED: Using PayrollSettings for deductions instead of Smart Policies
            // { type: PolicyType.DEDUCTION, hasData: () => (context.attendance?.lateMinutes || 0) > 0 || (context.attendance?.absentDays || 0) > 0 },
            { type: PolicyType.LEAVE, hasData: () => (context.leaves?.paidDays || 0) > 0 || (context.leaves?.unpaidDays || 0) > 0 },
            { type: PolicyType.ALLOWANCE, hasData: () => true }, // Always evaluate allowances
            { type: PolicyType.ATTENDANCE, hasData: () => !!context.attendance },
        ];

        for (const { type, hasData } of typeEvaluators) {
            // Skip if no relevant data
            if (!hasData()) continue;

            try {
                const policy = await this.policiesService.resolvePolicy(
                    type,
                    employee.id,
                    employee.companyId,
                    context.period.endDate
                );

                if (!policy || !policy.rules?.length) continue;

                for (const rule of policy.rules) {
                    if (!rule.outputComponentId) {
                        this.logger.debug(`Skipping rule ${rule.id} because it has no output component`);
                        continue;
                    }
                    const result = await this.evaluateRule(type, rule, context);
                    if (result.success && result.amount !== 0) {
                        lines.push(this.createPayrollLine(policy, rule, result, context));
                    }
                }
            } catch (err) {
                this.logger.warn(`Failed to evaluate ${type} policy for ${employee.id}: ${err.message}`);
            }
        }

        // 🔧 FIX: Consolidate duplicate lines by componentCode (merge amounts)
        // This prevents showing 3 separate "خصم تأخير" lines
        const consolidatedLines = this.consolidateLines(lines);

        return consolidatedLines;
    }

    /**
     * Consolidate duplicate lines by componentCode
     * Merges amounts for deductions (LATE_DED, ABSENCE_DED) and earnings (OVERTIME)
     */
    private consolidateLines(lines: PolicyPayrollLine[]): PolicyPayrollLine[] {
        const consolidated = new Map<string, PolicyPayrollLine>();

        for (const line of lines) {
            const key = line.componentCode;

            if (consolidated.has(key)) {
                // Merge with existing line
                const existing = consolidated.get(key)!;
                existing.amount += line.amount;
                existing.units = (existing.units || 0) + (line.units || 0);
                // Update description to show combined
                if (line.componentCode === 'LATE_DED' || line.componentCode === 'LATE') {
                    existing.descriptionAr = `خصم تأخير - ${existing.units} دقيقة (مجمّع)`;
                } else if (line.componentCode === 'ABSENCE_DED' || line.componentCode === 'ABSENCE') {
                    existing.descriptionAr = `خصم غياب - ${existing.units} يوم (مجمّع)`;
                } else if (line.componentCode === 'OVERTIME' || line.componentCode === 'OT') {
                    existing.descriptionAr = `وقت إضافي - ${existing.units} ساعة (مجمّع)`;
                }
            } else {
                // Add new line (clone to avoid mutation)
                consolidated.set(key, { ...line });
            }
        }

        return Array.from(consolidated.values());
    }

    /**
     * Evaluate a single rule based on policy type
     */
    private async evaluateRule(
        type: PolicyType,
        rule: any,
        context: PolicyEvaluationContext
    ): Promise<PolicyRuleResult> {
        switch (type) {
            case PolicyType.OVERTIME:
                return this.evaluateOvertimeRule(rule, context);
            case PolicyType.DEDUCTION:
                return this.evaluateDeductionRule(rule, context);
            case PolicyType.LEAVE:
                return this.evaluateLeaveRule(rule, context);
            case PolicyType.ALLOWANCE:
                return this.evaluateAllowanceRule(rule, context);
            default:
                return { success: false, amount: 0, description: 'Unsupported policy type' };
        }
    }

    /**
     * Overtime rule evaluation
     */
    private evaluateOvertimeRule(rule: any, context: PolicyEvaluationContext): PolicyRuleResult {
        const att = context.attendance;
        if (!att || att.otHours <= 0) {
            return { success: false, amount: 0, description: 'No overtime hours' };
        }

        const conditions = rule.conditions || {};
        let hours = 0;
        let rate = 1.5; // Default rate

        // Check which OT type this rule applies to
        if (conditions.dayType === 'WEEKDAY') hours = att.otHoursWeekday;
        else if (conditions.dayType === 'WEEKEND') hours = att.otHoursWeekend;
        else if (conditions.dayType === 'HOLIDAY') hours = att.otHoursHoliday;
        else hours = att.otHours;

        if (hours <= 0) return { success: false, amount: 0, description: 'No matching OT hours' };

        // Calculate amount based on rule valueType
        const hourlyRate = context.employee.hourlyRate || (context.employee.basicSalary / (30 * 8));

        if (rule.valueType === 'PERCENTAGE') {
            rate = parseFloat(rule.value) / 100;
        } else if (rule.valueType === 'FIXED') {
            rate = parseFloat(rule.value) / hourlyRate;
        } else if (rule.valueType === 'FORMULA') {
            // Simple formula evaluation for OT: e.g., "1.5" or "2.0"
            rate = parseFloat(rule.value) || 1.5;
        }

        const amount = hours * hourlyRate * rate;

        return {
            success: true,
            amount: Math.round(amount * 100) / 100,
            units: hours,
            rate,
            description: `وقت إضافي ${conditions.dayType || 'عام'} - ${hours} ساعة × ${rate}`,
            eventRef: att.attendanceIds?.[0],
        };
    }

    /**
     * Deduction rule evaluation (late, absence, etc.)
     * 🔧 FIX: Now properly checks MongoDB-style conditions like {lateMinutes: {gte: 15, lt: 30}}
     */
    private evaluateDeductionRule(rule: any, context: PolicyEvaluationContext): PolicyRuleResult {
        const att = context.attendance;
        if (!att) return { success: false, amount: 0, description: 'No attendance data' };

        const conditions = rule.conditions || {};
        const deductionType = conditions.type || 'LATE';
        let amount = 0;
        let units = 0;
        let description = '';

        const hourlyRate = context.employee.hourlyRate || (context.employee.basicSalary / (30 * 8));
        const dailyRate = context.employee.basicSalary / 30;

        if (deductionType === 'LATE') {
            units = att.lateMinutes;
            if (units <= 0) return { success: false, amount: 0, description: 'No late minutes' };

            // 🔧 FIX: Parse MongoDB-style conditions: {lateMinutes: {gte: 15, lt: 30}}
            const lateCondition = conditions.lateMinutes;
            if (lateCondition && typeof lateCondition === 'object') {
                const gte = lateCondition.gte ?? lateCondition.$gte ?? 0;
                const gt = lateCondition.gt ?? lateCondition.$gt ?? -Infinity;
                const lt = lateCondition.lt ?? lateCondition.$lt ?? Infinity;
                const lte = lateCondition.lte ?? lateCondition.$lte ?? Infinity;

                // Check if late minutes is within the specified range
                const matchesGte = units >= gte;
                const matchesGt = units > gt;
                const matchesLt = units < lt;
                const matchesLte = units <= lte;

                if (!matchesGte || !matchesGt || !matchesLt || !matchesLte) {
                    this.logger.debug(`Skipping late rule: ${units} minutes doesn't match condition (gte:${gte}, lt:${lt})`);
                    return { success: false, amount: 0, description: `Late minutes ${units} doesn't match condition` };
                }
            }

            if (rule.valueType === 'FIXED') {
                amount = parseFloat(rule.value);
            } else if (rule.valueType === 'PERCENTAGE') {
                // Percentage of daily rate for the deduction
                amount = dailyRate * (parseFloat(rule.value) / 100);
            } else {
                amount = (units / 60) * hourlyRate; // Default: deduct per hour
            }
            description = `خصم تأخير - ${units} دقيقة`;

        } else if (deductionType === 'ABSENCE') {
            units = att.absentDays;
            if (units <= 0) return { success: false, amount: 0, description: 'No absent days' };

            // 🔧 FIX: Parse MongoDB-style conditions for absence too
            const absenceCondition = conditions.absentDays;
            if (absenceCondition && typeof absenceCondition === 'object') {
                const gte = absenceCondition.gte ?? absenceCondition.$gte ?? 0;
                const gt = absenceCondition.gt ?? absenceCondition.$gt ?? -Infinity;
                const lt = absenceCondition.lt ?? absenceCondition.$lt ?? Infinity;
                const lte = absenceCondition.lte ?? absenceCondition.$lte ?? Infinity;

                const matchesGte = units >= gte;
                const matchesGt = units > gt;
                const matchesLt = units < lt;
                const matchesLte = units <= lte;

                if (!matchesGte || !matchesGt || !matchesLt || !matchesLte) {
                    this.logger.debug(`Skipping absence rule: ${units} days doesn't match condition`);
                    return { success: false, amount: 0, description: `Absent days ${units} doesn't match condition` };
                }
            }

            if (rule.valueType === 'FIXED') {
                amount = parseFloat(rule.value) * units;
            } else if (rule.valueType === 'PERCENTAGE') {
                amount = dailyRate * units * (parseFloat(rule.value) / 100);
            } else {
                amount = dailyRate * units;
            }
            description = `خصم غياب - ${units} يوم`;
        }

        return {
            success: amount > 0,
            amount: Math.round(amount * 100) / 100,
            units,
            description,
            eventRef: att.attendanceIds?.[0],
        };
    }

    /**
     * Leave rule evaluation
     */
    private evaluateLeaveRule(rule: any, context: PolicyEvaluationContext): PolicyRuleResult {
        const leaves = context.leaves;
        if (!leaves) return { success: false, amount: 0, description: 'No leave data' };

        const conditions = rule.conditions || {};
        const dailyRate = context.employee.basicSalary / 30;
        let amount = 0;
        let units = 0;

        if (conditions.leaveType === 'UNPAID' && leaves.unpaidDays > 0) {
            units = leaves.unpaidDays;
            amount = dailyRate * units;
            return {
                success: true,
                amount: Math.round(amount * 100) / 100,
                units,
                description: `خصم إجازة بدون راتب - ${units} يوم`,
                eventRef: leaves.leaveIds?.[0],
            };
        }

        return { success: false, amount: 0, description: 'No matching leave conditions' };
    }

    /**
     * Allowance rule evaluation
     */
    private evaluateAllowanceRule(rule: any, context: PolicyEvaluationContext): PolicyRuleResult {
        const conditions = rule.conditions || {};
        let amount = 0;

        if (rule.valueType === 'FIXED') {
            amount = parseFloat(rule.value);
        } else if (rule.valueType === 'PERCENTAGE') {
            amount = context.employee.basicSalary * (parseFloat(rule.value) / 100);
        }

        // Check if conditions are met (e.g., minimum service period, job title, etc.)
        if (conditions.minServiceMonths) {
            // This would need employee service duration - skip for now
        }

        return {
            success: amount > 0,
            amount: Math.round(amount * 100) / 100,
            description: rule.nameAr || 'بدل',
        };
    }

    /**
     * Create a PolicyPayrollLine from evaluation result
     */
    private createPayrollLine(
        policy: any,
        rule: any,
        result: PolicyRuleResult,
        context: PolicyEvaluationContext
    ): PolicyPayrollLine {
        const component = rule.outputComponent;

        // 🔧 FIX: Determine sign based on policy type if outputSign is not explicitly set
        let sign = rule.outputSign;
        if (!sign) {
            // Infer sign from policy type or component code
            const policyType = policy.type?.toUpperCase() || '';
            const componentCode = (component?.code || '').toUpperCase();

            if (policyType === 'DEDUCTION' ||
                componentCode.includes('DED') ||
                componentCode.includes('DEDUCTION') ||
                componentCode.includes('LATE') ||
                componentCode.includes('ABSENCE')) {
                sign = 'DEDUCTION';
            } else {
                sign = 'EARNING';
            }
        }

        return {
            componentId: rule.outputComponentId || '',
            componentCode: component?.code || 'UNKNOWN',
            componentName: component?.nameAr || component?.code || 'Unknown',
            sign,
            amount: result.amount,
            descriptionAr: result.description,
            units: result.units,
            rate: result.rate,
            source: {
                policyId: policy.id,
                policyCode: policy.code,
                ruleId: rule.id,
                ruleCode: rule.code,
                eventRef: result.eventRef,
            },
            taxable: component?.taxable,
            gosiEligible: component?.gosiEligible,
            wpsIncluded: component?.wpsIncluded !== false, // Default true
        };
    }
}
