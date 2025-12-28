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
            { type: PolicyType.DEDUCTION, hasData: () => (context.attendance?.lateMinutes || 0) > 0 || (context.attendance?.absentDays || 0) > 0 },
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

        return lines;
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

            if (rule.valueType === 'FIXED') {
                amount = parseFloat(rule.value);
            } else if (rule.valueType === 'PERCENTAGE') {
                amount = (units / 60) * hourlyRate * (parseFloat(rule.value) / 100);
            } else {
                amount = (units / 60) * hourlyRate; // Default: deduct per hour
            }
            description = `خصم تأخير - ${units} دقيقة`;

        } else if (deductionType === 'ABSENCE') {
            units = att.absentDays;
            if (units <= 0) return { success: false, amount: 0, description: 'No absent days' };

            if (rule.valueType === 'FIXED') {
                amount = parseFloat(rule.value) * units;
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

        return {
            componentId: rule.outputComponentId || '',
            componentCode: component?.code || 'UNKNOWN',
            componentName: component?.nameAr || component?.code || 'Unknown',
            sign: rule.outputSign || 'EARNING',
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
