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
var PolicySimulationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicySimulationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const policy_context_service_1 = require("./policy-context.service");
const smart_policy_executor_service_1 = require("./smart-policy-executor.service");
const formula_parser_service_1 = require("./formula-parser.service");
const library_1 = require("@prisma/client/runtime/library");
let PolicySimulationService = PolicySimulationService_1 = class PolicySimulationService {
    constructor(prisma, policyContext, policyExecutor, formulaParser) {
        this.prisma = prisma;
        this.policyContext = policyContext;
        this.policyExecutor = policyExecutor;
        this.formulaParser = formulaParser;
        this.logger = new common_1.Logger(PolicySimulationService_1.name);
    }
    async simulate(policyId, period, simulatorId, simulatorName) {
        const startTime = Date.now();
        const policy = await this.prisma.smartPolicy.findUnique({
            where: { id: policyId },
        });
        if (!policy) {
            throw new common_1.NotFoundException(`السياسة غير موجودة: ${policyId}`);
        }
        const [yearStr, monthStr] = period.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
            throw new common_1.BadRequestException(`صيغة الفترة غير صحيحة. استخدم YYYY-MM مثل 2025-12`);
        }
        const employees = await this.prisma.user.findMany({
            where: {
                companyId: policy.companyId,
                status: 'ACTIVE',
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
            },
        });
        this.logger.log(`بدء محاكاة السياسة ${policyId} على ${employees.length} موظف`);
        const results = [];
        const warnings = [];
        const BATCH_SIZE = 50;
        for (let i = 0; i < employees.length; i += BATCH_SIZE) {
            const batch = employees.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.allSettled(batch.map(employee => this.simulateForEmployee(policy, employee.id, `${employee.firstName} ${employee.lastName}`, month, year)));
            batchResults.forEach((result, index) => {
                const employee = batch[index];
                const employeeName = `${employee.firstName} ${employee.lastName}`;
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                    if (i === 0 && index === 0) {
                        this.logger.log(`[BATCH ${Math.floor(i / BATCH_SIZE) + 1}] First result: conditionsMet=${result.value.conditionsMet}, amount=${result.value.amount}`);
                    }
                }
                else {
                    const errorMessage = result.reason?.message || 'خطأ غير معروف';
                    if (i === 0 && index < 3) {
                        this.logger.error(`[ERROR] Simulation failed for ${employeeName}: ${errorMessage}`);
                    }
                    warnings.push(`فشلت المحاكاة للموظف ${employeeName}: ${errorMessage}`);
                    results.push({
                        employeeId: employee.id,
                        employeeName,
                        amount: 0,
                        type: 'NONE',
                        reason: `خطأ: ${errorMessage}`,
                        conditionsMet: false,
                    });
                }
            });
            const processed = Math.min(i + BATCH_SIZE, employees.length);
            const progress = Math.floor((processed / employees.length) * 100);
            this.logger.log(`[PROGRESS] معالجة ${processed}/${employees.length} موظف (${progress}%)`);
        }
        const affectedResults = results.filter(r => r.conditionsMet);
        const totalAdditions = affectedResults
            .filter(r => r.type === 'ADDITION')
            .reduce((sum, r) => sum + r.amount, 0);
        const totalDeductions = affectedResults
            .filter(r => r.type === 'DEDUCTION')
            .reduce((sum, r) => sum + Math.abs(r.amount), 0);
        const executionTimeMs = Date.now() - startTime;
        const simulationRun = await this.prisma.policySimulationRun.create({
            data: {
                policyId,
                simulatedBy: simulatorId,
                simulatedByName: simulatorName,
                simulationPeriod: period,
                totalEmployeesAffected: affectedResults.length,
                totalAdditions: new library_1.Decimal(totalAdditions),
                totalDeductions: new library_1.Decimal(totalDeductions),
                results: results,
                executionTimeMs,
                warningsCount: warnings.length,
                warnings: warnings,
            },
        });
        this.logger.log(`اكتملت المحاكاة: ${affectedResults.length} موظف متأثر، ` +
            `إضافات: ${totalAdditions} ريال، خصومات: ${totalDeductions} ريال`);
        return {
            id: simulationRun.id,
            summary: {
                totalEmployees: employees.length,
                affectedEmployees: affectedResults.length,
                totalAdditions,
                totalDeductions,
                netImpact: totalAdditions - totalDeductions,
                executionTimeMs,
                warningsCount: warnings.length,
            },
            results: results.filter(r => r.conditionsMet),
            warnings,
        };
    }
    async simulateForEmployee(policy, employeeId, employeeName, month, year) {
        const context = await this.policyContext.enrichContext(employeeId, month, year);
        const parsedRule = policy.parsedRule;
        const conditions = policy.conditions || parsedRule?.conditions || [];
        const actions = policy.actions || parsedRule?.actions || [];
        const conditionLogic = policy.conditionLogic || 'ALL';
        this.logger.log(`[DEBUG] Policy ${policy.id}: logic=${conditionLogic}, conditions=${JSON.stringify(conditions)?.slice(0, 200)}, actions=${JSON.stringify(actions)?.slice(0, 200)}`);
        const conditionsMet = await this.evaluateConditions(conditions, context, conditionLogic);
        if (!conditionsMet) {
            return {
                employeeId,
                employeeName,
                amount: 0,
                type: 'NONE',
                reason: 'الشروط غير متحققة',
                conditionsMet: false,
            };
        }
        const action = actions[0];
        if (!action) {
            return {
                employeeId,
                employeeName,
                amount: 0,
                type: 'NONE',
                reason: 'لا يوجد إجراء محدد',
                conditionsMet: true,
            };
        }
        let amount = 0;
        let type = 'NONE';
        let reason = '';
        if (action.formula) {
            try {
                amount = await this.formulaParser.evaluateFormula(action.formula, context);
            }
            catch (error) {
                this.logger.warn(`فشل تقييم المعادلة: ${action.formula} - ${error.message}`);
                amount = 0;
            }
        }
        else if (action.value) {
            amount = parseFloat(action.value);
        }
        if (action.type === 'DEDUCT_FROM_PAYROLL' || action.type === 'DEDUCTION') {
            type = 'DEDUCTION';
            reason = `خصم: ${action.description || policy.name || 'سياسة ذكية'}`;
        }
        else if (action.type === 'ADD_TO_PAYROLL' || action.type === 'ADDITION') {
            type = 'ADDITION';
            reason = `إضافة: ${action.description || policy.name || 'سياسة ذكية'}`;
        }
        return {
            employeeId,
            employeeName,
            amount,
            type,
            reason,
            conditionsMet: true,
            details: {
                attendanceData: {
                    lateDays: context.attendance?.currentPeriod?.lateDays || 0,
                    absentDays: context.attendance?.currentPeriod?.absentDays || 0,
                    presentDays: context.attendance?.currentPeriod?.presentDays || 0,
                },
                formula: action.formula,
            },
        };
    }
    async evaluateConditions(conditions, context, conditionLogic = 'ALL') {
        if (!conditions || conditions.length === 0) {
            return true;
        }
        if (conditionLogic === 'ANY') {
            for (const condition of conditions) {
                const fieldValue = this.getNestedValue(context, condition.field);
                const result = this.applyOperator(fieldValue, condition.operator, condition.value);
                this.logger.log(`[CONDITION OR] ${condition.field}: ${result ? '✅ PASS' : '❌ FAIL'}`);
                if (result) {
                    return true;
                }
            }
            return false;
        }
        for (const condition of conditions) {
            const fieldValue = this.getNestedValue(context, condition.field);
            const expectedValue = condition.value;
            const operator = condition.operator;
            this.logger.log(`[CONDITION AND] Field: ${condition.field}, Actual: ${fieldValue}, Expected: ${expectedValue}, Operator: ${operator}`);
            const result = this.applyOperator(fieldValue, operator, expectedValue);
            this.logger.log(`[CONDITION RESULT] ${condition.field}: ${result ? '✅ PASS' : '❌ FAIL'}`);
            if (!result) {
                return false;
            }
        }
        return true;
    }
    mapFieldPath(field) {
        const fieldMap = {
            'lateDays': 'attendance.currentPeriod.lateDays',
            'absentDays': 'attendance.currentPeriod.absentDays',
            'presentDays': 'attendance.currentPeriod.presentDays',
            'lateMinutes': 'attendance.currentPeriod.lateMinutes',
            'overtimeHours': 'attendance.currentPeriod.overtimeHours',
            'attendancePercentage': 'attendance.currentPeriod.attendancePercentage',
            'tenure': 'employee.tenure.totalMonths',
            'serviceYears': 'employee.tenure.years',
            'serviceMonths': 'employee.tenure.totalMonths',
            'basicSalary': 'contract.basicSalary',
            'salary': 'contract.totalSalary',
            'totalSalary': 'contract.totalSalary',
            'department': 'employee.department',
            'branch': 'employee.branch',
            'jobTitle': 'employee.jobTitle',
            'targetAchievement': 'performance.targetAchievement',
            'performanceRating': 'performance.lastRating',
        };
        const mappedPath = fieldMap[field] || field;
        if (mappedPath !== field) {
            this.logger.log(`[FIELD MAP] '${field}' → '${mappedPath}'`);
        }
        return mappedPath;
    }
    getNestedValue(obj, path) {
        if (!path)
            return undefined;
        const mappedPath = this.mapFieldPath(path);
        const parts = mappedPath.split('.');
        let current = obj;
        for (const part of parts) {
            if (current === null || current === undefined) {
                return undefined;
            }
            current = current[part];
        }
        return current;
    }
    applyOperator(actual, operator, expected) {
        if (actual === undefined || actual === null) {
            return false;
        }
        switch (operator) {
            case '>':
            case 'GREATER_THAN':
                return Number(actual) > Number(expected);
            case '>=':
            case 'GREATER_THAN_OR_EQUAL':
                return Number(actual) >= Number(expected);
            case '<':
            case 'LESS_THAN':
                return Number(actual) < Number(expected);
            case '<=':
            case 'LESS_THAN_OR_EQUAL':
                return Number(actual) <= Number(expected);
            case '==':
            case '=':
            case 'EQUALS':
                return actual == expected;
            case '!=':
            case 'NOT_EQUALS':
                return actual != expected;
            case 'CONTAINS':
                return String(actual).includes(String(expected));
            case 'IS_TRUE':
                return actual === true || actual === 'true';
            case 'IS_FALSE':
                return actual === false || actual === 'false';
            case 'BETWEEN':
                if (Array.isArray(expected) && expected.length === 2) {
                    const [min, max] = expected;
                    const numActual = Number(actual);
                    return numActual >= Number(min) && numActual <= Number(max);
                }
                return false;
            case 'IN':
                if (Array.isArray(expected)) {
                    return expected.includes(actual);
                }
                return false;
            default:
                this.logger.warn(`[OPERATOR] Unknown operator: ${operator}`);
                return false;
        }
    }
    evaluateSimpleFormula(formula, context) {
        try {
            let evaluatedFormula = formula;
            const variablePattern = /[a-zA-Z_][a-zA-Z0-9_.]+/g;
            const variables = formula.match(variablePattern) || [];
            for (const variable of variables) {
                const value = this.getNestedValue(context, variable);
                if (value !== undefined && !isNaN(Number(value))) {
                    evaluatedFormula = evaluatedFormula.replace(new RegExp(variable.replace('.', '\\.'), 'g'), String(value));
                }
            }
            const safeEval = new Function('return ' + evaluatedFormula);
            const result = safeEval();
            return isNaN(result) ? 0 : result;
        }
        catch (error) {
            this.logger.warn(`فشل تقييم المعادلة: ${formula} - ${error.message}`);
            return 0;
        }
    }
    async simulateForEmployees(policyId, employeeIds, period, simulatorId, simulatorName) {
        const policy = await this.prisma.smartPolicy.findUnique({
            where: { id: policyId },
        });
        if (!policy) {
            throw new common_1.NotFoundException(`السياسة غير موجودة: ${policyId}`);
        }
        const [yearStr, monthStr] = period.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        const employees = await this.prisma.user.findMany({
            where: {
                id: { in: employeeIds },
                companyId: policy.companyId,
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
            },
        });
        const results = [];
        for (const employee of employees) {
            const result = await this.simulateForEmployee(policy, employee.id, `${employee.firstName} ${employee.lastName}`, month, year);
            results.push(result);
        }
        return {
            results,
            summary: {
                totalEmployees: employees.length,
                affectedEmployees: results.filter(r => r.conditionsMet).length,
                totalAdditions: results
                    .filter(r => r.type === 'ADDITION')
                    .reduce((sum, r) => sum + r.amount, 0),
                totalDeductions: results
                    .filter(r => r.type === 'DEDUCTION')
                    .reduce((sum, r) => sum + Math.abs(r.amount), 0),
            },
        };
    }
    async getSimulationHistory(policyId, options) {
        const page = options?.page || 1;
        const limit = options?.limit || 10;
        const skip = (page - 1) * limit;
        const [simulations, total] = await Promise.all([
            this.prisma.policySimulationRun.findMany({
                where: { policyId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    simulationPeriod: true,
                    simulatedByName: true,
                    totalEmployeesAffected: true,
                    totalAdditions: true,
                    totalDeductions: true,
                    warningsCount: true,
                    executionTimeMs: true,
                    createdAt: true,
                },
            }),
            this.prisma.policySimulationRun.count({ where: { policyId } }),
        ]);
        return {
            data: simulations,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getSimulationDetails(simulationId) {
        const simulation = await this.prisma.policySimulationRun.findUnique({
            where: { id: simulationId },
        });
        if (!simulation) {
            throw new common_1.NotFoundException(`المحاكاة غير موجودة: ${simulationId}`);
        }
        return simulation;
    }
};
exports.PolicySimulationService = PolicySimulationService;
exports.PolicySimulationService = PolicySimulationService = PolicySimulationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        policy_context_service_1.PolicyContextService,
        smart_policy_executor_service_1.SmartPolicyExecutorService,
        formula_parser_service_1.FormulaParserService])
], PolicySimulationService);
//# sourceMappingURL=policy-simulation.service.js.map