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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SmartPolicyExecutorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartPolicyExecutorService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const policy_context_service_1 = require("./policy-context.service");
const formula_parser_service_1 = require("./formula-parser.service");
const dynamic_query_service_1 = require("./dynamic-query.service");
const ai_agent_service_1 = require("./ai-agent.service");
const policy_exception_service_1 = require("./policy-exception.service");
const tiered_penalty_service_1 = require("./tiered-penalty.service");
let SmartPolicyExecutorService = SmartPolicyExecutorService_1 = class SmartPolicyExecutorService {
    constructor(prisma, policyContext, formulaParser, dynamicQuery, aiAgent, policyException, tieredPenalty) {
        this.prisma = prisma;
        this.policyContext = policyContext;
        this.formulaParser = formulaParser;
        this.dynamicQuery = dynamicQuery;
        this.aiAgent = aiAgent;
        this.policyException = policyException;
        this.tieredPenalty = tieredPenalty;
        this.logger = new common_1.Logger(SmartPolicyExecutorService_1.name);
        this.policyCache = new Map();
        this.CACHE_TTL_MS = 5 * 60 * 1000;
    }
    async executeSmartPolicies(companyId, context) {
        const results = [];
        const employeeId = context.employee?.id;
        try {
            const enrichedContext = await this.policyContext.enrichContext(employeeId, context.month, context.year);
            this.logger.log(`Enriched context for employee ${employeeId}: tenure=${enrichedContext.employee.tenure.months}mo, attendance=${enrichedContext.attendance.currentPeriod.attendancePercentage}%`);
            const allEmployeePolicies = await this.getCachedPolicies(companyId);
            this.logger.log(`Found ${allEmployeePolicies.length} active smart policies for company ${companyId} (from cache)`);
            for (const policy of allEmployeePolicies) {
                const parsed = policy.parsedRule;
                if (!parsed?.understood)
                    continue;
                const exceptionCheck = await this.policyException.isEmployeeExcluded(policy.id, employeeId, {
                    departmentId: context.employee?.departmentId,
                    branchId: context.employee?.branchId,
                    jobTitleId: context.employee?.jobTitleId,
                });
                if (exceptionCheck.isExcluded) {
                    this.logger.log(`Employee ${employeeId} excluded from policy ${policy.name}: ${exceptionCheck.exclusionReason}`);
                    continue;
                }
                if (parsed.scope?.type === "ALL_EMPLOYEES" || parsed.scope?.type === "DEPARTMENT" || policy.triggerEvent === "PAYROLL") {
                    let result;
                    if (parsed.tieredConfig && parsed.tieredConfig.tiers) {
                        const tiers = parsed.tieredConfig.tiers;
                        const occurrenceType = parsed.tieredConfig.occurrenceType || 'LATE';
                        const penaltyResult = await this.tieredPenalty.calculatePenalty(policy.id, employeeId, occurrenceType, tiers, context.baseSalary);
                        if (penaltyResult.calculatedAmount > 0) {
                            const sign = penaltyResult.action.type === 'DEDUCT' ? 'DEDUCTION' : 'EARNING';
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
                        }
                        else {
                            result = { success: false, amount: 0 };
                        }
                    }
                    else {
                        result = await this.evaluateAdvancedPolicy(policy, enrichedContext);
                    }
                    if (result.success && result.amount !== 0) {
                        results.push(result);
                        this.logger.log(`Policy ${policy.name} applied: ${result.amount} SAR`);
                    }
                }
            }
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
                    if (amount === 0)
                        continue;
                    const isDeduction = adj.actionType?.includes("DEDUCT");
                    const sign = isDeduction ? "DEDUCTION" : "EARNING";
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
                    await this.prisma.smartPolicyExecution.update({
                        where: { id: adj.id },
                        data: {
                            payrollPeriod,
                            actionResult: { applied: true, appliedAt: new Date().toISOString() },
                        },
                    });
                }
            }
        }
        catch (error) {
            this.logger.error(`Error executing smart policies: ${error.message}`, error.stack);
        }
        return results;
    }
    async executeSmartPoliciesWithTransaction(companyId, context, options = {}) {
        const { payrollRunId, rollbackOnFailure = true } = options;
        try {
            return await this.prisma.$transaction(async (tx) => {
                const results = await this.executeSmartPolicies(companyId, context);
                for (const result of results) {
                    if (result.success && result.policyLine?.source?.policyId) {
                        await this.persistExecutionResult(result.policyLine.source.policyId, context.employee?.id, `${context.employee?.firstName || ''} ${context.employee?.lastName || ''}`.trim() || 'Unknown', result, {
                            month: context.month,
                            year: context.year,
                            payrollRunId,
                        });
                    }
                }
                return {
                    results,
                    success: true,
                    rolledBack: false,
                };
            }, {
                maxWait: 5000,
                timeout: 30000,
            });
        }
        catch (error) {
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
    async executeBatchSmartPolicies(companyId, employees, month, year, payrollRunId) {
        const resultMap = new Map();
        this.logger.log(`[BATCH] Starting batch execution for ${employees.length} employees`);
        const startTime = Date.now();
        const policies = await this.getCachedPolicies(companyId);
        this.logger.log(`[BATCH] Pre-fetched ${policies.length} policies for batch`);
        const enrichedContexts = await Promise.all(employees.map(async (emp) => {
            try {
                const context = await this.policyContext.enrichContext(emp.employee.id, month, year);
                return { employeeId: emp.employee.id, context, employee: emp };
            }
            catch (error) {
                this.logger.warn(`[BATCH] Failed to enrich context for ${emp.employee.id}: ${error.message}`);
                return null;
            }
        }));
        const validContexts = enrichedContexts.filter(c => c !== null);
        this.logger.log(`[BATCH] Enriched contexts for ${validContexts.length}/${employees.length} employees`);
        for (const item of validContexts) {
            if (!item)
                continue;
            const { employeeId, context: enrichedContext, employee: emp } = item;
            const results = [];
            for (const policy of policies) {
                const parsed = policy.parsedRule;
                if (!parsed?.understood)
                    continue;
                const excluded = await this.policyException.isEmployeeExcluded(policy.id, employeeId, {
                    departmentId: emp.employee?.departmentId,
                    branchId: emp.employee?.branchId,
                    jobTitleId: emp.employee?.jobTitleId,
                });
                if (excluded.isExcluded)
                    continue;
                const result = await this.evaluateAdvancedPolicy(policy, enrichedContext);
                if (result.success && result.amount !== 0) {
                    results.push(result);
                    await this.persistExecutionResult(policy.id, employeeId, `${emp.employee?.firstName || ''} ${emp.employee?.lastName || ''}`.trim() || 'Unknown', result, { month, year, payrollRunId });
                }
            }
            resultMap.set(employeeId, results);
        }
        const elapsed = Date.now() - startTime;
        this.logger.log(`[BATCH] Completed batch execution in ${elapsed}ms for ${employees.length} employees`);
        return resultMap;
    }
    async evaluateAdvancedPolicy(policy, context) {
        const parsed = policy.parsedRule;
        if (!parsed || !parsed.understood) {
            return { success: false, amount: 0, error: "Policy not understood" };
        }
        const actions = parsed.actions || [];
        this.logger.log(`Evaluating policy: ${policy.name || policy.id} with ${actions.length} actions`);
        if (parsed.dynamicQuery) {
            this.logger.log(`Executing AI-generated dynamic query: ${parsed.dynamicQuery.description}`);
            const queryResult = await this.executeAIDynamicQuery(parsed.dynamicQuery, context.employee.id, context.period.startDate, context.period.endDate);
            if (!queryResult) {
                this.logger.debug(`Dynamic query condition not met for policy ${policy.name}`);
                return { success: false, amount: 0 };
            }
            this.logger.log(`Dynamic query passed: ${queryResult}`);
        }
        if (!parsed.dynamicQuery && (!parsed.conditions || parsed.conditions.length === 0)) {
            this.logger.log(`Using AI Agent for policy: ${policy.name}`);
            try {
                const agentResult = await this.aiAgent.executeSmartPolicy(policy.originalText || policy.description || parsed.explanation, context.employee.id, context.period.startDate, context.period.endDate);
                if (!agentResult.success || !agentResult.result) {
                    this.logger.debug(`AI Agent: condition not met for policy ${policy.name}`);
                    return { success: false, amount: 0 };
                }
                this.logger.log(`AI Agent passed: ${JSON.stringify(agentResult.result)}`);
            }
            catch (error) {
                this.logger.warn(`AI Agent failed, continuing with default: ${error.message}`);
            }
        }
        const conditions = parsed.conditions || [];
        if (conditions.length > 0) {
            const conditionLogic = policy.conditionLogic || parsed.conditionLogic || 'ALL';
            const conditionsMet = await this.evaluateAdvancedConditions(conditions, context, conditionLogic);
            if (!conditionsMet) {
                this.logger.debug(`Conditions not met for policy ${policy.name} (logic: ${conditionLogic})`);
                return { success: false, amount: 0 };
            }
        }
        if (parsed.scope?.type === "DEPARTMENT") {
            this.logger.log(`Department-level policy applied for ${context.department.name}`);
        }
        let totalAmount = 0;
        let componentName = policy.name || "Smart Policy Adjustment";
        let sign = "EARNING";
        for (const action of actions) {
            const actionType = (action.type || "").toString().toUpperCase();
            const valueType = (action.valueType || "FIXED").toString().toUpperCase();
            const base = (action.base || "BASIC").toString().toUpperCase();
            let amount = 0;
            try {
                if (valueType === "FORMULA") {
                    const formula = action.value || "";
                    this.logger.log(`Evaluating formula: ${formula}`);
                    amount = await this.formulaParser.evaluateFormula(formula, context);
                    this.logger.log(`Formula result: ${amount}`);
                }
                else if (valueType === "PERCENTAGE") {
                    const percentage = parseFloat(action.value) || 0;
                    const baseAmount = base === "TOTAL"
                        ? context.contract.totalSalary
                        : context.contract.basicSalary;
                    amount = (baseAmount * percentage) / 100;
                }
                else {
                    amount = parseFloat(action.value) || 0;
                }
                if (actionType === "ADD_TO_PAYROLL" || actionType === "BONUS" || actionType === "ALLOWANCE" || actionType === "ADD") {
                    totalAmount += amount;
                    sign = "EARNING";
                }
                else if (actionType === "DEDUCT_FROM_PAYROLL" || actionType === "DEDUCTION" || actionType === "DEDUCT") {
                    totalAmount += amount;
                    sign = "DEDUCTION";
                }
                else if (actionType === "ALERT_HR" || actionType === "SEND_NOTIFICATION") {
                    this.logger.log(`Non-payroll action: ${actionType} - ${action.message || ""}`);
                    continue;
                }
            }
            catch (error) {
                this.logger.error(`Error evaluating action: ${error.message}`);
                return { success: false, amount: 0, error: error.message };
            }
        }
        if (totalAmount === 0) {
            return { success: false, amount: 0 };
        }
        const policyLine = {
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
    async evaluateAdvancedConditions(conditions, context, conditionLogic = 'ALL') {
        if (!conditions || conditions.length === 0) {
            return true;
        }
        const startDate = new Date(context.period.year, context.period.month - 1, 1);
        const endDate = new Date(context.period.year, context.period.month, 0);
        for (const condition of conditions) {
            const field = condition.field || "";
            const operator = condition.operator || "EQUALS";
            const expectedValue = condition.value;
            try {
                let actualValue = this.getNestedValue(context, field);
                if (actualValue === undefined || actualValue === null) {
                    this.logger.log(`Field ${field} not in static context, trying dynamic query...`);
                    actualValue = await this.resolveDynamicField(context.employee.id, field, condition, startDate, endDate);
                    if (actualValue === undefined || actualValue === null) {
                        this.logger.warn(`Field ${field} could not be resolved dynamically`);
                        if (conditionLogic === 'ALL') {
                            return false;
                        }
                        continue;
                    }
                    this.logger.log(`Dynamic query result for ${field}: ${actualValue}`);
                }
                const met = this.applyOperator(actualValue, operator, expectedValue);
                if (conditionLogic === 'ALL' && !met) {
                    this.logger.debug(`Condition not met (ALL): ${field} ${operator} ${expectedValue} (actual: ${actualValue})`);
                    return false;
                }
                else if (conditionLogic === 'ANY' && met) {
                    this.logger.debug(`Condition met (ANY): ${field} ${operator} ${expectedValue} (actual: ${actualValue})`);
                    return true;
                }
            }
            catch (error) {
                this.logger.error(`Error evaluating condition for field ${field}: ${error.message}`);
                if (conditionLogic === 'ALL') {
                    return false;
                }
            }
        }
        return conditionLogic === 'ALL';
    }
    async resolveDynamicField(employeeId, field, condition, startDate, endDate) {
        const parts = field.split('.');
        if (field.includes('partialWork') || field.includes('shortShift') || field.includes('hoursWorkedBetween')) {
            return await this.dynamicQuery.executeQuery(employeeId, 'COUNT_DAYS_WORKED_HOURS_BETWEEN', { minHours: 3, maxHours: 4 }, startDate, endDate);
        }
        if (field.includes('earlyArrival')) {
            const minutes = parseInt(parts[parts.length - 1]) || 10;
            return await this.dynamicQuery.executeQuery(employeeId, 'COUNT_EARLY_ARRIVALS', { minMinutes: minutes }, startDate, endDate);
        }
        if (field.includes('lateArrival') && !field.includes('currentPeriod')) {
            const minutes = parseInt(parts[parts.length - 1]) || 0;
            return await this.dynamicQuery.executeQuery(employeeId, 'COUNT_LATE_ARRIVALS', { minMinutes: minutes }, startDate, endDate);
        }
        return null;
    }
    getNestedValue(obj, path) {
        try {
            return path.split('.').reduce((current, key) => {
                if (current === null || current === undefined) {
                    return undefined;
                }
                return current[key];
            }, obj);
        }
        catch {
            return undefined;
        }
    }
    applyOperator(actual, operator, expected) {
        const op = operator.toUpperCase();
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
                if (typeof actual === 'number' && typeof expected === 'number') {
                    return actual === expected;
                }
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
    evaluateConditions(conditions, context) {
        if (!conditions || conditions.length === 0) {
            return true;
        }
        for (const condition of conditions) {
            const field = condition.field || "";
            const operator = condition.operator || "EQUALS";
            const value = condition.value;
            if (field.includes("attendancePercentage") || field.includes("attendance.percentage")) {
                const percentage = context.attendancePercentage || 0;
                const threshold = parseFloat(value) || 0;
                if (operator === "GREATER_THAN" && percentage <= threshold)
                    return false;
                if (operator === "GREATER_THAN_OR_EQUAL" && percentage < threshold)
                    return false;
                if (operator === "LESS_THAN" && percentage >= threshold)
                    return false;
                if (operator === "EQUALS" && percentage !== threshold)
                    return false;
            }
            if (field.includes("absentDays") || field.includes("absence")) {
                const absent = context.absentDays || 0;
                const threshold = parseFloat(value) || 0;
                if (operator === "GREATER_THAN" && absent <= threshold)
                    return false;
                if (operator === "GREATER_THAN_OR_EQUAL" && absent < threshold)
                    return false;
                if (operator === "LESS_THAN" && absent >= threshold)
                    return false;
                if (operator === "EQUALS" && absent !== threshold)
                    return false;
            }
            if (field.includes("yearsOfService") || field.includes("service.years")) {
                const years = context.yearsOfService || 0;
                const threshold = parseFloat(value) || 0;
                if (operator === "GREATER_THAN" && years <= threshold)
                    return false;
                if (operator === "GREATER_THAN_OR_EQUAL" && years < threshold)
                    return false;
                if (operator === "LESS_THAN" && years >= threshold)
                    return false;
                if (operator === "EQUALS" && years !== threshold)
                    return false;
            }
            if (field.includes("lateDays") || field.includes("late")) {
                const late = context.lateDays || 0;
                const threshold = parseFloat(value) || 0;
                if (operator === "GREATER_THAN" && late <= threshold)
                    return false;
                if (operator === "LESS_THAN" && late >= threshold)
                    return false;
            }
            if (field.includes("overtimeHours") || field.includes("overtime")) {
                const ot = context.overtimeHours || 0;
                const threshold = parseFloat(value) || 0;
                if (operator === "GREATER_THAN" && ot <= threshold)
                    return false;
                if (operator === "LESS_THAN" && ot >= threshold)
                    return false;
            }
            if (field === "event.date")
                continue;
            if (field.includes("dayOfWeek"))
                continue;
        }
        return true;
    }
    async executeAIDynamicQuery(query, employeeId, startDate, endDate) {
        this.logger.log(`Executing AI dynamic query: ${query.description}`);
        try {
            const whereClause = { userId: employeeId };
            for (const condition of query.where) {
                const { field, operator, value } = condition;
                if (field === 'date') {
                    const dateValue = new Date(value);
                    if (operator === '=') {
                        whereClause.date = dateValue;
                    }
                    else if (operator === '>=' || operator === '>') {
                        whereClause.date = { gte: dateValue };
                    }
                    else if (operator === '<=' || operator === '<') {
                        whereClause.date = { lte: dateValue };
                    }
                    continue;
                }
                if (field === 'checkIn' || field === 'checkOut') {
                    if (operator === '<=') {
                        whereClause[field] = { lte: new Date(`1970-01-01T${value}`) };
                    }
                    else if (operator === '>=') {
                        whereClause[field] = { gte: new Date(`1970-01-01T${value}`) };
                    }
                    continue;
                }
                if (operator === '=' || operator === 'EQUALS') {
                    whereClause[field] = value;
                }
                else if (operator === '>=' || operator === 'GREATER_THAN_OR_EQUAL') {
                    whereClause[field] = { ...whereClause[field], gte: value };
                }
                else if (operator === '<=' || operator === 'LESS_THAN_OR_EQUAL') {
                    whereClause[field] = { ...whereClause[field], lte: value };
                }
                else if (operator === '>' || operator === 'GREATER_THAN') {
                    whereClause[field] = { ...whereClause[field], gt: value };
                }
                else if (operator === '<' || operator === 'LESS_THAN') {
                    whereClause[field] = { ...whereClause[field], lt: value };
                }
            }
            if (!whereClause.date) {
                whereClause.date = { gte: startDate, lte: endDate };
            }
            const model = this.prisma[query.table.toLowerCase()];
            if (!model) {
                this.logger.error(`Table ${query.table} not found`);
                return false;
            }
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
        }
        catch (error) {
            this.logger.error(`Error executing dynamic query: ${error.message}`);
            return false;
        }
    }
    async persistExecutionResult(policyId, employeeId, employeeName, result, context) {
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
            await this.prisma.smartPolicy.update({
                where: { id: policyId },
                data: {
                    executionCount: { increment: 1 },
                    lastExecutedAt: new Date(),
                    ...(result.policyLine?.sign === 'DEDUCTION'
                        ? { totalAmountDeduct: { increment: Math.abs(result.amount) } }
                        : { totalAmountPaid: { increment: result.amount } }),
                },
            });
            this.logger.log(`[PERSIST] Execution saved: policy=${policyId}, employee=${employeeId}, amount=${result.amount}`);
        }
        catch (error) {
            this.logger.error(`[PERSIST] Failed to save execution: ${error.message}`);
        }
    }
    async getCachedPolicies(companyId) {
        const cached = this.policyCache.get(companyId);
        const now = Date.now();
        if (cached && (now - cached.cachedAt) < this.CACHE_TTL_MS) {
            this.logger.debug(`[CACHE HIT] Using cached policies for company ${companyId}`);
            return cached.policies;
        }
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
    invalidatePolicyCache(companyId) {
        this.policyCache.delete(companyId);
        this.logger.log(`[CACHE] Invalidated cache for company ${companyId}`);
    }
};
exports.SmartPolicyExecutorService = SmartPolicyExecutorService;
exports.SmartPolicyExecutorService = SmartPolicyExecutorService = SmartPolicyExecutorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(4, (0, common_1.Inject)((0, common_1.forwardRef)(() => ai_agent_service_1.AiAgentService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        policy_context_service_1.PolicyContextService,
        formula_parser_service_1.FormulaParserService,
        dynamic_query_service_1.DynamicQueryService,
        ai_agent_service_1.AiAgentService,
        policy_exception_service_1.PolicyExceptionService,
        tiered_penalty_service_1.TieredPenaltyService])
], SmartPolicyExecutorService);
//# sourceMappingURL=smart-policy-executor.service.js.map