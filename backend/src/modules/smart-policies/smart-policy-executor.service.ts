import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { PolicyPayrollLine } from "../payroll-calculation/dto/calculation.types";
import { PolicyContextService, EnrichedPolicyContext } from "./policy-context.service";
import { FormulaParserService } from "./formula-parser.service";

export interface SmartPolicyExecutionResult {
    success: boolean;
    amount: number;
    policyLine?: PolicyPayrollLine;
    explanation?: string;
    error?: string;
}

export interface SmartPolicyExecutionContext {
    employee: any;
    baseSalary: number;
    workingDays: number;
    absentDays: number;
    lateDays: number;
    overtimeHours: number;
    month: number;
    year: number;
    presentDays?: number;
    attendancePercentage?: number;
    yearsOfService?: number;
}

@Injectable()
export class SmartPolicyExecutorService {
    private readonly logger = new Logger(SmartPolicyExecutorService.name);

    constructor(
        private prisma: PrismaService,
        private policyContext: PolicyContextService,
        private formulaParser: FormulaParserService
    ) { }

    async executeSmartPolicies(
        companyId: string,
        context: SmartPolicyExecutionContext
    ): Promise<SmartPolicyExecutionResult[]> {
        const results: SmartPolicyExecutionResult[] = [];
        const employeeId = context.employee?.id;

        try {
            //  إثراء السياق بكل البيانات المطلوبة
            const enrichedContext = await this.policyContext.enrichContext(
                employeeId,
                context.month,
                context.year
            );

            this.logger.log(`Enriched context for employee ${employeeId}: tenure=${enrichedContext.employee.tenure.months}mo, attendance=${enrichedContext.attendance.currentPeriod.attendancePercentage}%`);

            // 1. Execute ALL_EMPLOYEES and PAYROLL trigger policies
            const allEmployeePolicies = await this.prisma.smartPolicy.findMany({
                where: {
                    companyId,
                    isActive: true,
                },
            });

            this.logger.log(`Found ${allEmployeePolicies.length} active smart policies for company ${companyId}`);

            for (const policy of allEmployeePolicies) {
                const parsed = policy.parsedRule as any;
                if (!parsed?.understood) continue;

                // Handle ALL_EMPLOYEES or PAYROLL triggered policies
                if (parsed.scope?.type === "ALL_EMPLOYEES" || parsed.scope?.type === "DEPARTMENT" || policy.triggerEvent === "PAYROLL") {
                    const result = await this.evaluateAdvancedPolicy(policy, enrichedContext);
                    if (result.success && result.amount !== 0) {
                        results.push(result);
                        this.logger.log(`Policy ${policy.name} applied: ${result.amount} SAR`);
                    }
                }
            }

            // 2. Collect pending event-driven adjustments for this employee
            if (employeeId) {
                const payrollPeriod = `${context.year}-${String(context.month).padStart(2, "0")}`;
                const pendingAdjustments = await this.prisma.smartPolicyExecution.findMany({
                    where: {
                        employeeId,
                        conditionsMet: true,
                        isSuccess: true,
                        payrollPeriod: null,
                    },
                    include: { policy: true },
                });

                this.logger.log(`Found ${pendingAdjustments.length} pending adjustments for employee ${employeeId}`);

                for (const adj of pendingAdjustments) {
                    const amount = Number(adj.actionValue) || 0;
                    if (amount === 0) continue;

                    const isDeduction = adj.actionType?.includes("DEDUCT");
                    const sign: "EARNING" | "DEDUCTION" = isDeduction ? "DEDUCTION" : "EARNING";

                    results.push({
                        success: true,
                        amount,
                        policyLine: {
                            componentId: "SMART-" + adj.policyId.substring(0, 8),
                            componentName: adj.policy?.name || "Smart Policy Adjustment",
                            componentCode: "SMART",
                            amount,
                            sign,
                            descriptionAr: `سياسة ذكية: ${adj.policy?.name || ""} (${adj.triggerEvent}.${adj.triggerSubEvent || "*"})`,
                            source: {
                                policyId: adj.policyId,
                                policyCode: "SMART",
                                ruleId: adj.id,
                                ruleCode: "SMART-EVENT",
                            },
                        },
                    });

                    // Mark as applied
                    await this.prisma.smartPolicyExecution.update({
                        where: { id: adj.id },
                        data: {
                            payrollPeriod,
                            actionResult: { applied: true, appliedAt: new Date().toISOString() },
                        },
                    });
                }
            }
        } catch (error) {
            this.logger.error(`Error executing smart policies: ${error.message}`, error.stack);
        }

        return results;
    }

    /**
     * تقييم سياسة متقدمة باستخدام السياق المُثرى والمعادلات المعقدة
     */
    private async evaluateAdvancedPolicy(
        policy: any,
        context: EnrichedPolicyContext
    ): Promise<SmartPolicyExecutionResult> {
        const parsed = policy.parsedRule;
        if (!parsed || !parsed.understood) {
            return { success: false, amount: 0, error: "Policy not understood" };
        }

        const actions = parsed.actions || [];
        this.logger.log(`Evaluating policy: ${policy.name || policy.id} with ${actions.length} actions`);

        // فحص الشروط أولاً
        const conditions = parsed.conditions || [];
        if (conditions.length > 0) {
            const conditionsMet = await this.evaluateAdvancedConditions(conditions, context);
            if (!conditionsMet) {
                this.logger.debug(`Conditions not met for policy ${policy.name}`);
                return { success: false, amount: 0 };
            }
        }

        // فحص scope: DEPARTMENT
        if (parsed.scope?.type === "DEPARTMENT") {
            // السياسة تُطبق فقط إذا القسم حقق الشرط
            // مثال: department.departmentAttendance > 90
            // الموظف الحالي سيستفيد من السياسة
            this.logger.log(`Department-level policy applied for ${context.department.name}`);
        }

        let totalAmount = 0;
        let componentName = policy.name || "Smart Policy Adjustment";
        let sign: "EARNING" | "DEDUCTION" = "EARNING";

        for (const action of actions) {
            const actionType = (action.type || "").toString().toUpperCase();
            const valueType = (action.valueType || "FIXED").toString().toUpperCase();
            const base = (action.base || "BASIC").toString().toUpperCase();

            let amount = 0;

            try {
                if (valueType === "FORMULA") {
                    // تنفيذ معادلة معقدة
                    const formula = action.value || "";
                    this.logger.log(`Evaluating formula: ${formula}`);
                    amount = await this.formulaParser.evaluateFormula(formula, context);
                    this.logger.log(`Formula result: ${amount}`);
                } else if (valueType === "PERCENTAGE") {
                    // حساب نسبة
                    const percentage = parseFloat(action.value) || 0;
                    const baseAmount = base === "TOTAL"
                        ? context.contract.totalSalary
                        : context.contract.basicSalary;
                    amount = (baseAmount * percentage) / 100;
                } else {
                    // قيمة ثابتة
                    amount = parseFloat(action.value) || 0;
                }

                if (actionType === "ADD_TO_PAYROLL" || actionType === "BONUS" || actionType === "ALLOWANCE" || actionType === "ADD") {
                    totalAmount += amount;
                    sign = "EARNING";
                } else if (actionType === "DEDUCT_FROM_PAYROLL" || actionType === "DEDUCTION" || actionType === "DEDUCT") {
                    totalAmount += amount;
                    sign = "DEDUCTION";
                } else if (actionType === "ALERT_HR" || actionType === "SEND_NOTIFICATION") {
                    // هذه actions لا تؤثر على الراتب
                    this.logger.log(`Non-payroll action: ${actionType} - ${action.message || ""}`);
                    continue;
                }
            } catch (error) {
                this.logger.error(`Error evaluating action: ${error.message}`);
                return { success: false, amount: 0, error: error.message };
            }
        }

        if (totalAmount === 0) {
            return { success: false, amount: 0 };
        }

        const policyLine: PolicyPayrollLine = {
            componentId: "SMART-" + policy.id.substring(0, 8),
            componentName: componentName,
            componentCode: "SMART",
            amount: Math.abs(totalAmount),
            sign: sign,
            descriptionAr: "سياسة ذكية: " + (policy.name || parsed.explanation || ""),
            source: {
                policyId: policy.id,
                policyCode: "SMART",
                ruleId: "SMART-EXEC",
                ruleCode: "SMART",
            },
        };

        return {
            success: true,
            amount: Math.abs(totalAmount),
            policyLine,
            explanation: `Smart policy ${policy.name} applied: ${totalAmount} SAR`,
        };
    }

    /**
     * تقييم شروط متقدمة باستخدام السياق المُثرى
     */
    private async evaluateAdvancedConditions(
        conditions: any[],
        context: EnrichedPolicyContext
    ): Promise<boolean> {
        if (!conditions || conditions.length === 0) {
            return true;
        }

        for (const condition of conditions) {
            const field = condition.field || "";
            const operator = condition.operator || "EQUALS";
            const expectedValue = condition.value;

            try {
                // جلب القيمة الفعلية من السياق المُثرى
                const actualValue = this.getNestedValue(context, field);

                if (actualValue === undefined || actualValue === null) {
                    this.logger.warn(`Field ${field} not found in context`);
                    return false;
                }

                // تطبيق المعامل
                const met = this.applyOperator(actualValue, operator, expectedValue);

                if (!met) {
                    this.logger.debug(`Condition not met: ${field} ${operator} ${expectedValue} (actual: ${actualValue})`);
                    return false;
                }
            } catch (error) {
                this.logger.error(`Error evaluating condition for field ${field}: ${error.message}`);
                return false;
            }
        }

        return true;
    }

    /**
     * جلب قيمة متداخلة من السياق
     * مثال: getNestedValue(context, "employee.tenure.months") -> 4
     */
    private getNestedValue(obj: any, path: string): any {
        try {
            return path.split('.').reduce((current, key) => {
                if (current === null || current === undefined) {
                    return undefined;
                }
                return current[key];
            }, obj);
        } catch {
            return undefined;
        }
    }

    /**
     * تطبيق معامل المقارنة
     */
    private applyOperator(actual: any, operator: string, expected: any): boolean {
        const op = operator.toUpperCase();

        // تحويل القيم للأرقام إذا لزم الأمر
        const actualNum = typeof actual === 'number' ? actual : parseFloat(actual);
        const expectedNum = typeof expected === 'number' ? expected : parseFloat(expected);

        switch (op) {
            case 'GREATER_THAN':
            case '>':
                return actualNum > expectedNum;

            case 'LESS_THAN':
            case '<':
                return actualNum < expectedNum;

            case 'GREATER_THAN_OR_EQUAL':
            case '>=':
                return actualNum >= expectedNum;

            case 'LESS_THAN_OR_EQUAL':
            case '<=':
                return actualNum <= expectedNum;

            case 'EQUALS':
            case '===':
            case '==':
                // للأرقام
                if (typeof actual === 'number' && typeof expected === 'number') {
                    return actual === expected;
                }
                // للنصوص (case-insensitive)
                return String(actual).toLowerCase() === String(expected).toLowerCase();

            case 'NOT_EQUALS':
            case '!==':
            case '!=':
                if (typeof actual === 'number' && typeof expected === 'number') {
                    return actual !== expected;
                }
                return String(actual).toLowerCase() !== String(expected).toLowerCase();

            case 'CONTAINS':
                return String(actual).toLowerCase().includes(String(expected).toLowerCase());

            default:
                this.logger.warn(`Unknown operator: ${operator}`);
                return false;
        }
    }

    /**
     * Backward compatibility: keep old method for existing code
     */
    private evaluateConditions(conditions: any[], context: SmartPolicyExecutionContext): boolean {
        if (!conditions || conditions.length === 0) {
            return true;
        }

        for (const condition of conditions) {
            const field = condition.field || "";
            const operator = condition.operator || "EQUALS";
            const value = condition.value;

            // Attendance percentage conditions
            if (field.includes("attendancePercentage") || field.includes("attendance.percentage")) {
                const percentage = context.attendancePercentage || 0;
                const threshold = parseFloat(value) || 0;
                if (operator === "GREATER_THAN" && percentage <= threshold) return false;
                if (operator === "GREATER_THAN_OR_EQUAL" && percentage < threshold) return false;
                if (operator === "LESS_THAN" && percentage >= threshold) return false;
                if (operator === "EQUALS" && percentage !== threshold) return false;
            }

            // Absent days conditions
            if (field.includes("absentDays") || field.includes("absence")) {
                const absent = context.absentDays || 0;
                const threshold = parseFloat(value) || 0;
                if (operator === "GREATER_THAN" && absent <= threshold) return false;
                if (operator === "GREATER_THAN_OR_EQUAL" && absent < threshold) return false;
                if (operator === "LESS_THAN" && absent >= threshold) return false;
                if (operator === "EQUALS" && absent !== threshold) return false;
            }

            // Years of service conditions
            if (field.includes("yearsOfService") || field.includes("service.years")) {
                const years = context.yearsOfService || 0;
                const threshold = parseFloat(value) || 0;
                if (operator === "GREATER_THAN" && years <= threshold) return false;
                if (operator === "GREATER_THAN_OR_EQUAL" && years < threshold) return false;
                if (operator === "LESS_THAN" && years >= threshold) return false;
                if (operator === "EQUALS" && years !== threshold) return false;
            }

            // Late days conditions
            if (field.includes("lateDays") || field.includes("late")) {
                const late = context.lateDays || 0;
                const threshold = parseFloat(value) || 0;
                if (operator === "GREATER_THAN" && late <= threshold) return false;
                if (operator === "LESS_THAN" && late >= threshold) return false;
            }

            // Overtime hours conditions
            if (field.includes("overtimeHours") || field.includes("overtime")) {
                const ot = context.overtimeHours || 0;
                const threshold = parseFloat(value) || 0;
                if (operator === "GREATER_THAN" && ot <= threshold) return false;
                if (operator === "LESS_THAN" && ot >= threshold) return false;
            }

            // Skip date conditions for payroll (handled in triggers)
            if (field === "event.date") continue;
            if (field.includes("dayOfWeek")) continue;
        }

        return true;
    }
}
