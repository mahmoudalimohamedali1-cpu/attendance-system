import { Injectable, Logger, Inject, forwardRef } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { PolicyPayrollLine } from "../payroll-calculation/dto/calculation.types";
import { PolicyContextService, EnrichedPolicyContext } from "./policy-context.service";
import { FormulaParserService } from "./formula-parser.service";
import { DynamicQueryService } from "./dynamic-query.service";
import { AiAgentService } from "./ai-agent.service";
import { PolicyExceptionService } from "./policy-exception.service";
import { TieredPenaltyService, TieredPenaltyConfig } from "./tiered-penalty.service";
import { SafeExpressionParserService } from "./safe-expression-parser.service";
import {
    CACHE_CONFIG,
    BATCH_CONFIG,
    VALIDATION_LIMITS,
} from "./constants/smart-policy.constants";
import {
    mapFieldPath,
    getNestedValue,
    applyOperator as applyOperatorHelper,
    roundTo,
    chunk,
} from "./helpers/smart-policy.helpers";

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
        private formulaParser: FormulaParserService,
        private dynamicQuery: DynamicQueryService,
        @Inject(forwardRef(() => AiAgentService)) private aiAgent: AiAgentService,
        private policyException: PolicyExceptionService,
        private tieredPenalty: TieredPenaltyService,
        private safeParser: SafeExpressionParserService,
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
            // Issue #82: Use cached policies for performance
            const allEmployeePolicies = await this.getCachedPolicies(companyId);

            this.logger.log(`Found ${allEmployeePolicies.length} active smart policies for company ${companyId} (from cache)`);


            for (const policy of allEmployeePolicies) {
                const parsed = policy.parsedRule as any;
                if (!parsed?.understood) continue;

                // === Priority 3: Check for exceptions ===
                const exceptionCheck = await this.policyException.isEmployeeExcluded(
                    policy.id,
                    employeeId,
                    {
                        departmentId: context.employee?.departmentId,
                        branchId: context.employee?.branchId,
                        jobTitleId: context.employee?.jobTitleId,
                    }
                );

                if (exceptionCheck.isExcluded) {
                    this.logger.log(`Employee ${employeeId} excluded from policy ${policy.name}: ${exceptionCheck.exclusionReason}`);
                    continue;
                }

                // Handle ALL_EMPLOYEES or PAYROLL triggered policies
                if (parsed.scope?.type === "ALL_EMPLOYEES" || parsed.scope?.type === "DEPARTMENT" || policy.triggerEvent === "PAYROLL") {
                    // === Priority 4: Respect execution order ===
                    // Policies are already sorted by executionOrder in query if needed

                    // === Priority 2: Check for tiered penalties ===
                    let result: SmartPolicyExecutionResult;

                    if (parsed.tieredConfig && parsed.tieredConfig.tiers) {
                        // Use tiered penalty engine
                        const tiers: TieredPenaltyConfig[] = parsed.tieredConfig.tiers;
                        const occurrenceType = parsed.tieredConfig.occurrenceType || 'LATE';

                        const penaltyResult = await this.tieredPenalty.calculatePenalty(
                            policy.id,
                            employeeId,
                            occurrenceType,
                            tiers,
                            context.baseSalary
                        );

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
                    } else {
                        // Standard policy evaluation
                        result = await this.evaluateAdvancedPolicy(policy, enrichedContext);
                    }

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
     * Issue #9: Execute policies with transaction support for rollback
     * Wraps all policy executions in a database transaction
     * If any policy fails critically, all changes are rolled back
     */
    async executeSmartPoliciesWithTransaction(
        companyId: string,
        context: SmartPolicyExecutionContext,
        options: {
            payrollRunId?: string;
            rollbackOnFailure?: boolean;
        } = {}
    ): Promise<{
        results: SmartPolicyExecutionResult[];
        success: boolean;
        error?: string;
        rolledBack: boolean;
    }> {
        const { payrollRunId, rollbackOnFailure = true } = options;

        try {
            // Execute within a transaction
            return await this.prisma.$transaction(async (tx) => {
                const results = await this.executeSmartPolicies(companyId, context);

                // Persist all successful results
                for (const result of results) {
                    if (result.success && result.policyLine?.source?.policyId) {
                        await this.persistExecutionResult(
                            result.policyLine.source.policyId,
                            context.employee?.id,
                            `${context.employee?.firstName || ''} ${context.employee?.lastName || ''}`.trim() || 'Unknown',
                            result,
                            {
                                month: context.month,
                                year: context.year,
                                payrollRunId,
                            }
                        );
                    }
                }

                return {
                    results,
                    success: true,
                    rolledBack: false,
                };
            }, {
                maxWait: 5000, // 5 seconds
                timeout: 30000, // 30 seconds
            });
        } catch (error) {
            this.logger.error(`[TRANSACTION] Policy execution failed: ${error.message}`);

            if (rollbackOnFailure) {
                this.logger.warn(`[TRANSACTION] Changes rolled back due to failure`);
            }

            return {
                results: [],
                success: false,
                error: error.message,
                rolledBack: rollbackOnFailure,
            };
        }
    }

    /**
     * Issue #81: Batch execute policies for multiple employees with N+1 optimization
     * Pre-fetches all policies once and reuses them for all employees
     */
    async executeBatchSmartPolicies(
        companyId: string,
        employees: Array<{
            employee: any;
            baseSalary: number;
            workingDays: number;
            absentDays: number;
            lateDays: number;
            overtimeHours: number;
        }>,
        month: number,
        year: number,
        payrollRunId?: string
    ): Promise<Map<string, SmartPolicyExecutionResult[]>> {
        const resultMap = new Map<string, SmartPolicyExecutionResult[]>();

        this.logger.log(`[BATCH] Starting batch execution for ${employees.length} employees`);
        const startTime = Date.now();

        // === Issue #81: Pre-fetch policies once (N+1 prevention) ===
        const policies = await this.getCachedPolicies(companyId);
        this.logger.log(`[BATCH] Pre-fetched ${policies.length} policies for batch`);

        // === Issue #81: Pre-fetch all employee contexts in parallel ===
        const enrichedContexts = await Promise.all(
            employees.map(async (emp) => {
                try {
                    const context = await this.policyContext.enrichContext(
                        emp.employee.id,
                        month,
                        year
                    );
                    return { employeeId: emp.employee.id, context, employee: emp };
                } catch (error) {
                    this.logger.warn(`[BATCH] Failed to enrich context for ${emp.employee.id}: ${error.message}`);
                    return null;
                }
            })
        );

        const validContexts = enrichedContexts.filter(c => c !== null);
        this.logger.log(`[BATCH] Enriched contexts for ${validContexts.length}/${employees.length} employees`);

        // === Process each employee with pre-fetched data ===
        for (const item of validContexts) {
            if (!item) continue;

            const { employeeId, context: enrichedContext, employee: emp } = item;
            const results: SmartPolicyExecutionResult[] = [];

            for (const policy of policies) {
                const parsed = policy.parsedRule as any;
                if (!parsed?.understood) continue;

                // Check exceptions
                const excluded = await this.policyException.isEmployeeExcluded(
                    policy.id,
                    employeeId,
                    {
                        departmentId: emp.employee?.departmentId,
                        branchId: emp.employee?.branchId,
                        jobTitleId: emp.employee?.jobTitleId,
                    }
                );

                if (excluded.isExcluded) continue;

                // Evaluate policy
                const result = await this.evaluateAdvancedPolicy(policy, enrichedContext);

                if (result.success && result.amount !== 0) {
                    results.push(result);

                    // Persist result
                    await this.persistExecutionResult(
                        policy.id,
                        employeeId,
                        `${emp.employee?.firstName || ''} ${emp.employee?.lastName || ''}`.trim() || 'Unknown',
                        result,
                        { month, year, payrollRunId }
                    );
                }
            }

            resultMap.set(employeeId, results);
        }

        const elapsed = Date.now() - startTime;
        this.logger.log(`[BATCH] Completed batch execution in ${elapsed}ms for ${employees.length} employees`);

        return resultMap;
    }

    /**
     * تقييم سياسة متقدمة باستخدام السياق المُثرى والمعادلات المعقدة
     * Made public for use by RetroactivePolicyService
     */
    async evaluateAdvancedPolicy(
        policy: any,
        context: EnrichedPolicyContext
    ): Promise<SmartPolicyExecutionResult> {
        const parsed = policy.parsedRule;
        if (!parsed || !parsed.understood) {
            return { success: false, amount: 0, error: "Policy not understood" };
        }

        const actions = parsed.actions || [];
        this.logger.log(`Evaluating policy: ${policy.name || policy.id} with ${actions.length} actions`);

        // 🔥 تنفيذ الاستعلام الديناميكي إذا وجد (مولّد من الـ AI)
        if (parsed.dynamicQuery) {
            this.logger.log(`Executing AI-generated dynamic query: ${parsed.dynamicQuery.description}`);
            const queryResult = await this.executeAIDynamicQuery(
                parsed.dynamicQuery,
                context.employee.id,
                context.period.startDate,
                context.period.endDate
            );

            // إذا الاستعلام رجع false أو 0، السياسة لا تُطبق
            if (!queryResult) {
                this.logger.debug(`Dynamic query condition not met for policy ${policy.name}`);
                return { success: false, amount: 0 };
            }
            this.logger.log(`Dynamic query passed: ${queryResult}`);
        }

        // 🔥 AI Agent Fallback: لو مفيش dynamicQuery ولا conditions، استخدم الـ AI Agent
        if (!parsed.dynamicQuery && (!parsed.conditions || parsed.conditions.length === 0)) {
            // استخدام الـ AI Agent للتحقق من السياسة ديناميكياً
            this.logger.log(`Using AI Agent for policy: ${policy.name}`);
            try {
                const agentResult = await this.aiAgent.executeSmartPolicy(
                    policy.originalText || policy.description || parsed.explanation,
                    context.employee.id,
                    context.period.startDate,
                    context.period.endDate
                );

                if (!agentResult.success || !agentResult.result) {
                    this.logger.debug(`AI Agent: condition not met for policy ${policy.name}`);
                    return { success: false, amount: 0 };
                }
                this.logger.log(`AI Agent passed: ${JSON.stringify(agentResult.result)}`);
            } catch (error) {
                this.logger.warn(`AI Agent failed, continuing with default: ${error.message}`);
            }
        }

        // فحص الشروط أولاً
        const conditions = parsed.conditions || [];
        if (conditions.length > 0) {
            // === Issue #21: Get conditionLogic from policy (default to 'ALL' for AND logic) ===
            const conditionLogic = policy.conditionLogic || parsed.conditionLogic || 'ALL';
            const conditionsMet = await this.evaluateAdvancedConditions(conditions, context, conditionLogic);
            if (!conditionsMet) {
                this.logger.debug(`Conditions not met for policy ${policy.name} (logic: ${conditionLogic})`);
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
     * @param conditions - مصفوفة الشروط
     * @param context - السياق المُثرى
     * @param conditionLogic - "ALL" (AND) أو "ANY" (OR) - الافتراضي "ALL"
     */
    private async evaluateAdvancedConditions(
        conditions: any[],
        context: EnrichedPolicyContext,
        conditionLogic: string = 'ALL'
    ): Promise<boolean> {
        if (!conditions || conditions.length === 0) {
            return true;
        }

        // حساب تواريخ الفترة للاستعلامات الديناميكية
        const startDate = new Date(context.period.year, context.period.month - 1, 1);
        const endDate = new Date(context.period.year, context.period.month, 0);

        for (const condition of conditions) {
            const field = condition.field || "";
            const operator = condition.operator || "EQUALS";
            const expectedValue = condition.value;

            try {
                // جلب القيمة الفعلية من السياق المُثرى
                let actualValue = this.getNestedValue(context, field);

                // إذا الحقل مش موجود، جرب الاستعلام الديناميكي
                if (actualValue === undefined || actualValue === null) {
                    this.logger.log(`Field ${field} not in static context, trying dynamic query...`);

                    // استخدام الاستعلام الديناميكي لجلب البيانات
                    actualValue = await this.resolveDynamicField(
                        context.employee.id,
                        field,
                        condition,
                        startDate,
                        endDate
                    );

                    if (actualValue === undefined || actualValue === null) {
                        this.logger.warn(`Field ${field} could not be resolved dynamically`);

                        // 🔧 FIX: تحسين منطق الحقول المفقودة
                        // بدلاً من إفشال السياسة، نفحص إذا كان الشرط اختياري
                        const isOptionalCondition = condition.optional === true || condition.skipIfMissing === true;
                        
                        if (isOptionalCondition) {
                            this.logger.log(`Skipping optional condition for missing field: ${field}`);
                            continue;
                        }

                        // إذا الشرط يتطلب قيمة صفر (مثل lateDays = 0)، نعتبر القيمة 0
                        if (expectedValue === 0 || expectedValue === '0') {
                            actualValue = 0;
                            this.logger.log(`Using default value 0 for missing field: ${field}`);
                        } else {
                            // في حالة ALL: نرجع false مباشرة
                            if (conditionLogic === 'ALL') {
                                return false;
                            }
                            continue; // في حالة ANY: نكمل للشرط التالي
                        }
                    } else {
                        this.logger.log(`Dynamic query result for ${field}: ${actualValue}`);
                    }
                }

                // تطبيق المعامل
                const met = this.applyOperator(actualValue, operator, expectedValue);

                // === Issue #21: AND/OR Logic Support ===
                if (conditionLogic === 'ALL' && !met) {
                    // AND logic: إذا شرط واحد فشل، النتيجة false
                    this.logger.debug(`Condition not met (ALL): ${field} ${operator} ${expectedValue} (actual: ${actualValue})`);
                    return false;
                } else if (conditionLogic === 'ANY' && met) {
                    // OR logic: إذا شرط واحد نجح، النتيجة true
                    this.logger.debug(`Condition met (ANY): ${field} ${operator} ${expectedValue} (actual: ${actualValue})`);
                    return true;
                }
            } catch (error) {
                this.logger.error(`Error evaluating condition for field ${field}: ${error.message}`);
                if (conditionLogic === 'ALL') {
                    return false;
                }
            }
        }

        // النتيجة النهائية بناءً على المنطق
        // ALL: وصلنا هنا = كل الشروط نجحت
        // ANY: وصلنا هنا = لا يوجد شرط نجح
        return conditionLogic === 'ALL';
    }


    /**
     * حل الحقول الديناميكية - يسأل الـ database مباشرة
     */
    private async resolveDynamicField(
        employeeId: string,
        field: string,
        condition: any,
        startDate: Date,
        endDate: Date
    ): Promise<any> {
        // تحليل الحقل واستنتاج نوع الاستعلام
        const parts = field.split('.');

        // أمثلة على الحقول والاستعلامات المقابلة
        if (field.includes('partialWork') || field.includes('shortShift') || field.includes('hoursWorkedBetween')) {
            // مثال: attendance.daysWorkedBetween.3.4 أو attendance.partialWorkDays
            return await this.dynamicQuery.executeQuery(
                employeeId,
                'COUNT_DAYS_WORKED_HOURS_BETWEEN',
                { minHours: 3, maxHours: 4 },
                startDate,
                endDate
            );
        }

        if (field.includes('earlyArrival')) {
            const minutes = parseInt(parts[parts.length - 1]) || 10;
            return await this.dynamicQuery.executeQuery(
                employeeId,
                'COUNT_EARLY_ARRIVALS',
                { minMinutes: minutes },
                startDate,
                endDate
            );
        }

        if (field.includes('lateArrival') && !field.includes('currentPeriod')) {
            const minutes = parseInt(parts[parts.length - 1]) || 0;
            return await this.dynamicQuery.executeQuery(
                employeeId,
                'COUNT_LATE_ARRIVALS',
                { minMinutes: minutes },
                startDate,
                endDate
            );
        }

        // لو مفيش استعلام مناسب، ارجع null
        return null;
    }

    /**
     * جلب قيمة متداخلة من السياق
     * مثال: getNestedValue(context, "employee.tenure.months") -> 4
     * 🔧 FIX: استخدام الـ helper مع دعم field shortcuts
     */
    private getNestedValue(obj: any, path: string): any {
        return getNestedValue(obj, path);
    }

    /**
     * تطبيق معامل المقارنة
     * 🔧 FIX: استخدام الـ helper المُحسّن
     */
    private applyOperator(actual: any, operator: string, expected: any): boolean {
        try {
            return applyOperatorHelper(actual, operator, expected);
        } catch (error) {
            this.logger.warn(`Operator error: ${operator}, ${error.message}`);
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

            // 🔧 FIX: Basic salary conditions (employee.basicSalary, baseSalary)
            if (field.includes("basicSalary") || field.includes("baseSalary") || field.includes("salary")) {
                const salary = context.baseSalary || 0;

                // Handle BETWEEN operator
                if (operator === "BETWEEN" && Array.isArray(value) && value.length === 2) {
                    const [min, max] = value.map(v => parseFloat(v) || 0);
                    if (salary < min || salary > max) return false;
                } else {
                    const threshold = parseFloat(value) || 0;
                    if (operator === "GREATER_THAN" && salary <= threshold) return false;
                    if (operator === "GREATER_THAN_OR_EQUAL" && salary < threshold) return false;
                    if (operator === "LESS_THAN" && salary >= threshold) return false;
                    if (operator === "LESS_THAN_OR_EQUAL" && salary > threshold) return false;
                    if (operator === "EQUALS" && salary !== threshold) return false;
                }
            }

            // 🔧 FIX: Generic BETWEEN operator for any numeric field
            if (operator === "BETWEEN" && Array.isArray(value) && value.length === 2) {
                // Already handled above for salary, skip if already processed
                if (!field.includes("basicSalary") && !field.includes("baseSalary") && !field.includes("salary")) {
                    // For other fields, try to get value from context
                    let fieldValue = 0;
                    if (field.includes("workingDays")) fieldValue = context.workingDays || 0;
                    else if (field.includes("absentDays")) fieldValue = context.absentDays || 0;
                    else if (field.includes("lateDays")) fieldValue = context.lateDays || 0;
                    else if (field.includes("overtimeHours")) fieldValue = context.overtimeHours || 0;

                    const [min, max] = value.map(v => parseFloat(v) || 0);
                    if (fieldValue < min || fieldValue > max) return false;
                }
            }

            // Skip date conditions for payroll (handled in triggers)
            if (field === "event.date") continue;
            if (field.includes("dayOfWeek")) continue;
        }

        return true;
    }

    /**
     * 🔥 تنفيذ استعلام ديناميكي مولّد من الـ AI
     * هذه هي القدرة الجديدة: الـ AI يكتب الـ query والنظام ينفذه
     */
    private async executeAIDynamicQuery(
        query: {
            type: string;
            table: string;
            where: Array<{ field: string; operator: string; value: any }>;
            operation: string;
            targetField?: string;
            description: string;
        },
        employeeId: string,
        startDate: Date,
        endDate: Date
    ): Promise<boolean | number> {
        this.logger.log(`Executing AI dynamic query: ${query.description}`);

        try {
            // بناء شروط الـ WHERE
            const whereClause: any = { userId: employeeId };

            for (const condition of query.where) {
                const { field, operator, value } = condition;

                // معالجة التواريخ
                if (field === 'date') {
                    const dateValue = new Date(value);
                    if (operator === '=') {
                        whereClause.date = dateValue;
                    } else if (operator === '>=' || operator === '>') {
                        whereClause.date = { gte: dateValue };
                    } else if (operator === '<=' || operator === '<') {
                        whereClause.date = { lte: dateValue };
                    }
                    continue;
                }

                // معالجة الوقت
                if (field === 'checkIn' || field === 'checkOut') {
                    // تحويل الوقت لمقارنة
                    if (operator === '<=') {
                        whereClause[field] = { lte: new Date(`1970-01-01T${value}`) };
                    } else if (operator === '>=') {
                        whereClause[field] = { gte: new Date(`1970-01-01T${value}`) };
                    }
                    continue;
                }

                // معالجة الحقول الرقمية
                if (operator === '=' || operator === 'EQUALS') {
                    whereClause[field] = value;
                } else if (operator === '>=' || operator === 'GREATER_THAN_OR_EQUAL') {
                    whereClause[field] = { ...whereClause[field], gte: value };
                } else if (operator === '<=' || operator === 'LESS_THAN_OR_EQUAL') {
                    whereClause[field] = { ...whereClause[field], lte: value };
                } else if (operator === '>' || operator === 'GREATER_THAN') {
                    whereClause[field] = { ...whereClause[field], gt: value };
                } else if (operator === '<' || operator === 'LESS_THAN') {
                    whereClause[field] = { ...whereClause[field], lt: value };
                }
            }

            // إضافة فلتر الفترة
            if (!whereClause.date) {
                whereClause.date = { gte: startDate, lte: endDate };
            }

            // الحصول على الجدول المناسب
            const model = (this.prisma as any)[query.table.toLowerCase()];
            if (!model) {
                this.logger.error(`Table ${query.table} not found`);
                return false;
            }

            // تنفيذ العملية المطلوبة
            switch (query.operation) {
                case 'EXISTS':
                    const exists = await model.findFirst({ where: whereClause });
                    return !!exists;

                case 'COUNT':
                    const count = await model.count({ where: whereClause });
                    return count > 0 ? count : false;

                case 'SUM':
                    const sumResult = await model.aggregate({
                        where: whereClause,
                        _sum: { [query.targetField || 'amount']: true },
                    });
                    return sumResult._sum[query.targetField || 'amount'] || 0;

                case 'AVG':
                    const avgResult = await model.aggregate({
                        where: whereClause,
                        _avg: { [query.targetField || 'amount']: true },
                    });
                    return avgResult._avg[query.targetField || 'amount'] || 0;

                default:
                    this.logger.warn(`Unknown operation: ${query.operation}`);
                    return false;
            }
        } catch (error) {
            this.logger.error(`Error executing dynamic query: ${error.message}`);
            return false;
        }
    }

    /**
     * Issue #8: Persist policy execution result for audit trail
     * Links execution to PayrollRun for complete traceability
     */
    async persistExecutionResult(
        policyId: string,
        employeeId: string,
        employeeName: string,
        result: SmartPolicyExecutionResult,
        context: {
            month: number;
            year: number;
            payrollRunId?: string;
        }
    ): Promise<void> {
        try {
            const payrollPeriod = `${context.year}-${String(context.month).padStart(2, '0')}`;

            await this.prisma.smartPolicyExecution.create({
                data: {
                    policyId,
                    employeeId,
                    employeeName: employeeName || 'Unknown',
                    triggerEvent: 'PAYROLL',
                    conditionsMet: result.success,
                    isSuccess: result.success,
                    actionType: result.policyLine?.sign === 'DEDUCTION' ? 'DEDUCT' : 'ADD',
                    actionValue: result.amount,
                    actionResult: {
                        amount: result.amount,
                        explanation: result.explanation,
                        componentName: result.policyLine?.componentName,
                        persistedAt: new Date().toISOString(),
                        payrollRunId: context.payrollRunId,
                    },
                    payrollPeriod,
                },
            });


            // Update policy statistics
            await this.prisma.smartPolicy.update({
                where: { id: policyId },
                data: {
                    executionCount: { increment: 1 },
                    lastExecutedAt: new Date(),
                    ...(result.policyLine?.sign === 'DEDUCTION'
                        ? { totalAmountDeduct: { increment: Math.abs(result.amount) } }
                        : { totalAmountPaid: { increment: result.amount } }
                    ),
                },
            });

            this.logger.log(`[PERSIST] Execution saved: policy=${policyId}, employee=${employeeId}, amount=${result.amount}`);
        } catch (error) {
            this.logger.error(`[PERSIST] Failed to save execution: ${error.message}`);
            // Don't throw - persistence failure shouldn't break payroll
        }
    }

    /**
     * Issue #82: Policy caching for performance optimization
     * Caches active policies per company to reduce DB queries
     * 🔧 FIX: Using constants for configuration
     */
    private policyCache: Map<string, { policies: any[]; cachedAt: number }> = new Map();
    private readonly CACHE_TTL_MS = CACHE_CONFIG.POLICY_CACHE_TTL_MS;
    private readonly MAX_CACHE_SIZE = CACHE_CONFIG.MAX_CACHE_SIZE;

    async getCachedPolicies(companyId: string): Promise<any[]> {
        const cached = this.policyCache.get(companyId);
        const now = Date.now();

        if (cached && (now - cached.cachedAt) < this.CACHE_TTL_MS) {
            this.logger.debug(`[CACHE HIT] Using cached policies for company ${companyId}`);
            return cached.policies;
        }

        // Fetch and cache
        const policies = await this.prisma.smartPolicy.findMany({
            where: {
                companyId,
                isActive: true,
            },
            orderBy: [
                { executionOrder: 'asc' },
                { priority: 'desc' },
            ],
        });

        this.policyCache.set(companyId, { policies, cachedAt: now });
        this.logger.debug(`[CACHE MISS] Fetched and cached ${policies.length} policies for company ${companyId}`);

        return policies;
    }

    /**
     * Invalidate policy cache for a company (call when policy is updated)
     */
    invalidatePolicyCache(companyId: string): void {
        this.policyCache.delete(companyId);
        this.logger.log(`[CACHE] Invalidated cache for company ${companyId}`);
    }
}

