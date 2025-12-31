import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { PolicyPayrollLine } from "../payroll-calculation/dto/calculation.types";

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

    constructor(private prisma: PrismaService) {}

    async executeSmartPolicies(
        companyId: string,
        context: SmartPolicyExecutionContext
    ): Promise<SmartPolicyExecutionResult[]> {
        const results: SmartPolicyExecutionResult[] = [];
        const employeeId = context.employee?.id;

        try {
            // Calculate attendance percentage if not provided
            if (!context.attendancePercentage && context.workingDays > 0) {
                const presentDays = context.presentDays || (context.workingDays - context.absentDays);
                context.attendancePercentage = Math.round((presentDays / context.workingDays) * 100);
            }

            // Calculate years of service if not provided
            if (!context.yearsOfService && context.employee?.hireDate) {
                const hireDate = new Date(context.employee.hireDate);
                const now = new Date();
                context.yearsOfService = Math.floor((now.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
            }

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
                if (parsed.scope?.type === "ALL_EMPLOYEES" || policy.triggerEvent === "PAYROLL") {
                    const result = await this.evaluatePolicy(policy, context);
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
            this.logger.error(`Error executing smart policies: ${error.message}`);
        }

        return results;
    }

    private async evaluatePolicy(
        policy: any,
        context: SmartPolicyExecutionContext
    ): Promise<SmartPolicyExecutionResult> {
        const parsed = policy.parsedRule;
        if (!parsed || !parsed.understood) {
            return { success: false, amount: 0, error: "Policy not understood" };
        }

        const actions = parsed.actions || [];
        this.logger.log(`Evaluating policy: ${policy.name || policy.id} with ${actions.length} actions`);

        let totalAmount = 0;
        let componentName = policy.name || "Smart Policy Adjustment";
        let sign: "EARNING" | "DEDUCTION" = "EARNING";

        for (const action of actions) {
            const actionType = (action.type || "").toString().toUpperCase();
            let value = parseFloat(action.value) || 0;
            const valueType = (action.valueType || "FIXED").toString().toUpperCase();
            const base = (action.base || "BASIC").toString().toUpperCase();

            // Check conditions
            const conditions = parsed.conditions || [];
            if (conditions.length > 0) {
                const conditionsMet = this.evaluateConditions(conditions, context);
                if (!conditionsMet) {
                    this.logger.log(`Conditions not met for policy ${policy.name}`);
                    continue;
                }
            }

            // Calculate amount based on valueType
            if (valueType === "PERCENTAGE") {
                const baseAmount = base === "TOTAL" ? context.baseSalary * 1.25 : context.baseSalary;
                value = (baseAmount * value) / 100;
            } else if (valueType === "DAYS") {
                // Days-based: calculate daily rate from base salary
                const dailyRate = context.baseSalary / 30;
                value = dailyRate * value;
            }

            if (actionType === "ADD_TO_PAYROLL" || actionType === "BONUS" || actionType === "ALLOWANCE" || actionType === "ADD") {
                totalAmount += value;
                sign = "EARNING";
            } else if (actionType === "DEDUCT_FROM_PAYROLL" || actionType === "DEDUCTION" || actionType === "DEDUCT") {
                totalAmount += value;
                sign = "DEDUCTION";
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
