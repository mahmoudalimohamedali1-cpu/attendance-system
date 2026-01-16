"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PolicyRuleEvaluatorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyRuleEvaluatorService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../common/prisma/prisma.service");
const policies_service_1 = require("../../policies/policies.service");
const create_policy_dto_1 = require("../../policies/dto/create-policy.dto");
let PolicyRuleEvaluatorService = PolicyRuleEvaluatorService_1 = class PolicyRuleEvaluatorService {
    constructor(prisma, policiesService) {
        this.prisma = prisma;
        this.policiesService = policiesService;
        this.logger = new common_1.Logger(PolicyRuleEvaluatorService_1.name);
    }
    async evaluate(context) {
        const lines = [];
        const { employee } = context;
        const typeEvaluators = [
            { type: create_policy_dto_1.PolicyType.OVERTIME, hasData: () => (context.attendance?.otHours || 0) > 0 },
            { type: create_policy_dto_1.PolicyType.DEDUCTION, hasData: () => (context.attendance?.lateMinutes || 0) > 0 || (context.attendance?.absentDays || 0) > 0 },
            { type: create_policy_dto_1.PolicyType.LEAVE, hasData: () => (context.leaves?.paidDays || 0) > 0 || (context.leaves?.unpaidDays || 0) > 0 },
            { type: create_policy_dto_1.PolicyType.ALLOWANCE, hasData: () => true },
            { type: create_policy_dto_1.PolicyType.ATTENDANCE, hasData: () => !!context.attendance },
        ];
        for (const { type, hasData } of typeEvaluators) {
            if (!hasData())
                continue;
            try {
                const policy = await this.policiesService.resolvePolicy(type, employee.id, employee.companyId, context.period.endDate);
                if (!policy || !policy.rules?.length)
                    continue;
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
            }
            catch (err) {
                this.logger.warn(`Failed to evaluate ${type} policy for ${employee.id}: ${err.message}`);
            }
        }
        return lines;
    }
    async evaluateRule(type, rule, context) {
        switch (type) {
            case create_policy_dto_1.PolicyType.OVERTIME:
                return this.evaluateOvertimeRule(rule, context);
            case create_policy_dto_1.PolicyType.DEDUCTION:
                return this.evaluateDeductionRule(rule, context);
            case create_policy_dto_1.PolicyType.LEAVE:
                return this.evaluateLeaveRule(rule, context);
            case create_policy_dto_1.PolicyType.ALLOWANCE:
                return this.evaluateAllowanceRule(rule, context);
            default:
                return { success: false, amount: 0, description: 'Unsupported policy type' };
        }
    }
    evaluateOvertimeRule(rule, context) {
        const att = context.attendance;
        if (!att || att.otHours <= 0) {
            return { success: false, amount: 0, description: 'No overtime hours' };
        }
        const conditions = rule.conditions || {};
        let hours = 0;
        let rate = 1.5;
        if (conditions.dayType === 'WEEKDAY')
            hours = att.otHoursWeekday;
        else if (conditions.dayType === 'WEEKEND')
            hours = att.otHoursWeekend;
        else if (conditions.dayType === 'HOLIDAY')
            hours = att.otHoursHoliday;
        else
            hours = att.otHours;
        if (hours <= 0)
            return { success: false, amount: 0, description: 'No matching OT hours' };
        const hourlyRate = context.employee.hourlyRate || (context.employee.basicSalary / (30 * 8));
        if (rule.valueType === 'PERCENTAGE') {
            rate = parseFloat(rule.value) / 100;
        }
        else if (rule.valueType === 'FIXED') {
            rate = parseFloat(rule.value) / hourlyRate;
        }
        else if (rule.valueType === 'FORMULA') {
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
    evaluateDeductionRule(rule, context) {
        const att = context.attendance;
        if (!att)
            return { success: false, amount: 0, description: 'No attendance data' };
        const conditions = rule.conditions || {};
        const deductionType = conditions.type || 'LATE';
        let amount = 0;
        let units = 0;
        let description = '';
        const hourlyRate = context.employee.hourlyRate || (context.employee.basicSalary / (30 * 8));
        const dailyRate = context.employee.basicSalary / 30;
        if (deductionType === 'LATE') {
            units = att.lateMinutes;
            if (units <= 0)
                return { success: false, amount: 0, description: 'No late minutes' };
            if (rule.valueType === 'FIXED') {
                amount = parseFloat(rule.value);
            }
            else if (rule.valueType === 'PERCENTAGE') {
                amount = (units / 60) * hourlyRate * (parseFloat(rule.value) / 100);
            }
            else {
                amount = (units / 60) * hourlyRate;
            }
            description = `خصم تأخير - ${units} دقيقة`;
        }
        else if (deductionType === 'ABSENCE') {
            units = att.absentDays;
            if (units <= 0)
                return { success: false, amount: 0, description: 'No absent days' };
            if (rule.valueType === 'FIXED') {
                amount = parseFloat(rule.value) * units;
            }
            else {
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
    evaluateLeaveRule(rule, context) {
        const leaves = context.leaves;
        if (!leaves)
            return { success: false, amount: 0, description: 'No leave data' };
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
    evaluateAllowanceRule(rule, context) {
        const conditions = rule.conditions || {};
        let amount = 0;
        if (rule.valueType === 'FIXED') {
            amount = parseFloat(rule.value);
        }
        else if (rule.valueType === 'PERCENTAGE') {
            amount = context.employee.basicSalary * (parseFloat(rule.value) / 100);
        }
        if (conditions.minServiceMonths) {
        }
        return {
            success: amount > 0,
            amount: Math.round(amount * 100) / 100,
            description: rule.nameAr || 'بدل',
        };
    }
    createPayrollLine(policy, rule, result, context) {
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
            wpsIncluded: component?.wpsIncluded !== false,
        };
    }
};
exports.PolicyRuleEvaluatorService = PolicyRuleEvaluatorService;
exports.PolicyRuleEvaluatorService = PolicyRuleEvaluatorService = PolicyRuleEvaluatorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        policies_service_1.PoliciesService])
], PolicyRuleEvaluatorService);
//# sourceMappingURL=policy-rule-evaluator.service.js.map