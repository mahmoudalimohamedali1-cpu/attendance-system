import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PolicyContextService, EnrichedPolicyContext } from './policy-context.service';
import { SmartPolicyExecutorService } from './smart-policy-executor.service';
import { FormulaParserService } from './formula-parser.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * نتيجة محاكاة لموظف واحد
 */
export interface EmployeeSimulationResult {
    employeeId: string;
    employeeName: string;
    amount: number;
    type: 'ADDITION' | 'DEDUCTION' | 'NONE';
    reason: string;
    conditionsMet: boolean;
    details?: any;
}

/**
 * Policy Simulation Service
 * يقوم بمحاكاة تأثير السياسة على الموظفين بدون تطبيقها فعلياً
 * يستخدم للتحقق من السياسة قبل التفعيل
 */
@Injectable()
export class PolicySimulationService {
    private readonly logger = new Logger(PolicySimulationService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly policyContext: PolicyContextService,
        private readonly policyExecutor: SmartPolicyExecutorService,
        private readonly formulaParser: FormulaParserService,
    ) { }

    /**
     * محاكاة السياسة على جميع موظفي الشركة لفترة معينة
     */
    async simulate(
        policyId: string,
        period: string, // YYYY-MM format
        simulatorId: string,
        simulatorName: string,
    ) {
        const startTime = Date.now();

        // 1. جلب السياسة
        const policy = await this.prisma.smartPolicy.findUnique({
            where: { id: policyId },
        });

        if (!policy) {
            throw new NotFoundException(`السياسة غير موجودة: ${policyId}`);
        }

        // 2. استخراج الشهر والسنة من period
        const [yearStr, monthStr] = period.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);

        if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
            throw new BadRequestException(`صيغة الفترة غير صحيحة. استخدم YYYY-MM مثل 2025-12`);
        }

        // 3. جلب موظفي الشركة النشطين
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

        // 4. محاكاة بالمعالجة الموازية (Batch Processing)
        const results: EmployeeSimulationResult[] = [];
        const warnings: string[] = [];
        const BATCH_SIZE = 50; // حجم الدفعة

        // تقسيم الموظفين إلى دفعات
        for (let i = 0; i < employees.length; i += BATCH_SIZE) {
            const batch = employees.slice(i, i + BATCH_SIZE);

            // معالجة الدفعة بشكل موازي
            const batchResults = await Promise.allSettled(
                batch.map(employee =>
                    this.simulateForEmployee(
                        policy,
                        employee.id,
                        `${employee.firstName} ${employee.lastName}`,
                        month,
                        year,
                    )
                )
            );

            // معالجة نتائج الدفعة
            batchResults.forEach((result, index) => {
                const employee = batch[index];
                const employeeName = `${employee.firstName} ${employee.lastName}`;

                if (result.status === 'fulfilled') {
                    results.push(result.value);

                    // Log first employee in batch for debugging
                    if (i === 0 && index === 0) {
                        this.logger.log(`[BATCH ${Math.floor(i / BATCH_SIZE) + 1}] First result: conditionsMet=${result.value.conditionsMet}, amount=${result.value.amount}`);
                    }
                } else {
                    // فشلت المحاكاة
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

            // Log progress after each batch
            const processed = Math.min(i + BATCH_SIZE, employees.length);
            const progress = Math.floor((processed / employees.length) * 100);
            this.logger.log(`[PROGRESS] معالجة ${processed}/${employees.length} موظف (${progress}%)`);
        }

        // 5. حساب الإحصائيات
        const affectedResults = results.filter(r => r.conditionsMet);
        const totalAdditions = affectedResults
            .filter(r => r.type === 'ADDITION')
            .reduce((sum, r) => sum + r.amount, 0);
        const totalDeductions = affectedResults
            .filter(r => r.type === 'DEDUCTION')
            .reduce((sum, r) => sum + Math.abs(r.amount), 0);

        const executionTimeMs = Date.now() - startTime;

        // 6. حفظ نتيجة المحاكاة
        const simulationRun = await this.prisma.policySimulationRun.create({
            data: {
                policyId,
                simulatedBy: simulatorId,
                simulatedByName: simulatorName,
                simulationPeriod: period,
                totalEmployeesAffected: affectedResults.length,
                totalAdditions: new Decimal(totalAdditions),
                totalDeductions: new Decimal(totalDeductions),
                results: results as any,
                executionTimeMs,
                warningsCount: warnings.length,
                warnings: warnings as any,
            },
        });

        this.logger.log(
            `اكتملت المحاكاة: ${affectedResults.length} موظف متأثر، ` +
            `إضافات: ${totalAdditions} ريال، خصومات: ${totalDeductions} ريال`
        );

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
            results: results.filter(r => r.conditionsMet), // فقط المتأثرين
            warnings,
        };
    }

    /**
     * محاكاة السياسة على موظف واحد
     */
    private async simulateForEmployee(
        policy: any,
        employeeId: string,
        employeeName: string,
        month: number,
        year: number,
    ): Promise<EmployeeSimulationResult> {
        // 1. إثراء السياق للموظف
        const context = await this.policyContext.enrichContext(employeeId, month, year);

        // 2. تقييم الشروط
        const parsedRule = policy.parsedRule as any;
        const conditions = (policy.conditions as any[]) || parsedRule?.conditions || [];
        const actions = (policy.actions as any[]) || parsedRule?.actions || [];
        const conditionLogic = policy.conditionLogic || 'ALL'; // الافتراضي: AND

        // Debug: Log what we got
        this.logger.log(`[DEBUG] Policy ${policy.id}: logic=${conditionLogic}, conditions=${JSON.stringify(conditions)?.slice(0, 200)}, actions=${JSON.stringify(actions)?.slice(0, 200)}`);

        // 3. فحص الشروط
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

        // 4. حساب المبلغ المتوقع
        const action = actions[0]; // أول إجراء
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
        let type: 'ADDITION' | 'DEDUCTION' | 'NONE' = 'NONE';
        let reason = '';

        // حساب المبلغ من الـ formula أو الـ value
        if (action.formula) {
            // استخدام FormulaParserService للمعادلات المعقدة
            try {
                amount = await this.formulaParser.evaluateFormula(action.formula, context);
            } catch (error) {
                this.logger.warn(`فشل تقييم المعادلة: ${action.formula} - ${error.message}`);
                amount = 0;
            }
        } else if (action.value) {
            amount = parseFloat(action.value);
        }

        // تحديد نوع الإجراء
        if (action.type === 'DEDUCT_FROM_PAYROLL' || action.type === 'DEDUCTION') {
            type = 'DEDUCTION';
            reason = `خصم: ${action.description || policy.name || 'سياسة ذكية'}`;
        } else if (action.type === 'ADD_TO_PAYROLL' || action.type === 'ADDITION') {
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

    /**
     * تقييم الشروط بناءً على السياق
     * يدعم الآن منطق AND و OR
     */
    private async evaluateConditions(
        conditions: any[],
        context: EnrichedPolicyContext,
        conditionLogic: string = 'ALL' // 'ALL' (AND) or 'ANY' (OR)
    ): Promise<boolean> {
        if (!conditions || conditions.length === 0) {
            return true; // لا شروط = تنطبق على الجميع
        }

        // منطق OR: يكفي تحقق شرط واحد
        if (conditionLogic === 'ANY') {
            for (const condition of conditions) {
                const fieldValue = this.getNestedValue(context, condition.field);
                const result = this.applyOperator(fieldValue, condition.operator, condition.value);

                this.logger.log(`[CONDITION OR] ${condition.field}: ${result ? '✅ PASS' : '❌ FAIL'}`);

                if (result) {
                    return true; // أي شرط يتحقق = نجاح
                }
            }
            return false; // لم يتحقق أي شرط
        }

        // منطق AND: يجب تحقق جميع الشروط (الوضع الافتراضي)
        for (const condition of conditions) {
            const fieldValue = this.getNestedValue(context, condition.field);
            const expectedValue = condition.value;
            const operator = condition.operator;

            // Debug logging
            this.logger.log(`[CONDITION AND] Field: ${condition.field}, Actual: ${fieldValue}, Expected: ${expectedValue}, Operator: ${operator}`);

            const result = this.applyOperator(fieldValue, operator, expectedValue);
            this.logger.log(`[CONDITION RESULT] ${condition.field}: ${result ? '✅ PASS' : '❌ FAIL'}`);

            if (!result) {
                return false; // AND logic: فشل أي شرط = فشل كل الشروط
            }
        }

        return true;
    }

    /**
     * تعيين حقول مختصرة إلى مسارات كاملة
     * Auto-map common shorthand field names to full context paths
     */
    private mapFieldPath(field: string): string {
        const fieldMap: Record<string, string> = {
            // Attendance shortcuts
            'lateDays': 'attendance.currentPeriod.lateDays',
            'absentDays': 'attendance.currentPeriod.absentDays',
            'presentDays': 'attendance.currentPeriod.presentDays',
            'lateMinutes': 'attendance.currentPeriod.lateMinutes',
            'overtimeHours': 'attendance.currentPeriod.overtimeHours',
            'attendancePercentage': 'attendance.currentPeriod.attendancePercentage',

            // Tenure shortcuts
            'tenure': 'employee.tenure.totalMonths',
            'serviceYears': 'employee.tenure.years',
            'serviceMonths': 'employee.tenure.totalMonths',

            // Salary shortcuts
            'basicSalary': 'contract.basicSalary',
            'salary': 'contract.totalSalary',
            'totalSalary': 'contract.totalSalary',

            // Employee shortcuts
            'department': 'employee.department',
            'branch': 'employee.branch',
            'jobTitle': 'employee.jobTitle',

            // Performance shortcuts
            'targetAchievement': 'performance.targetAchievement',
            'performanceRating': 'performance.lastRating',
        };

        const mappedPath = fieldMap[field] || field;

        // Log mapping for debugging
        if (mappedPath !== field) {
            this.logger.log(`[FIELD MAP] '${field}' → '${mappedPath}'`);
        }

        return mappedPath;
    }

    /**
     * جلب قيمة متداخلة من object
     */
    private getNestedValue(obj: any, path: string): any {
        if (!path) return undefined;

        // Auto-map shortcuts to full paths
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

    /**
     * تطبيق معامل المقارنة
     */
    private applyOperator(actual: any, operator: string, expected: any): boolean {
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
                // expected should be array [min, max]
                if (Array.isArray(expected) && expected.length === 2) {
                    const [min, max] = expected;
                    const numActual = Number(actual);
                    return numActual >= Number(min) && numActual <= Number(max);
                }
                return false;
            case 'IN':
                // expected is an array
                if (Array.isArray(expected)) {
                    return expected.includes(actual);
                }
                return false;
            default:
                this.logger.warn(`[OPERATOR] Unknown operator: ${operator}`);
                return false;
        }
    }

    /**
     * تقييم معادلة بسيطة
     * TODO: استبدالها بـ FormulaParserService للمعادلات المعقدة
     */
    private evaluateSimpleFormula(formula: string, context: EnrichedPolicyContext): number {
        try {
            // استبدال المتغيرات بقيمها
            let evaluatedFormula = formula;

            // استخراج المتغيرات مثل attendance.lateDays
            const variablePattern = /[a-zA-Z_][a-zA-Z0-9_.]+/g;
            const variables = formula.match(variablePattern) || [];

            for (const variable of variables) {
                const value = this.getNestedValue(context, variable);
                if (value !== undefined && !isNaN(Number(value))) {
                    evaluatedFormula = evaluatedFormula.replace(
                        new RegExp(variable.replace('.', '\\.'), 'g'),
                        String(value)
                    );
                }
            }

            // تقييم المعادلة (بشكل آمن)
            // استخدام Function بدلاً من eval للأمان
            const safeEval = new Function('return ' + evaluatedFormula);
            const result = safeEval();

            return isNaN(result) ? 0 : result;
        } catch (error) {
            this.logger.warn(`فشل تقييم المعادلة: ${formula} - ${error.message}`);
            return 0;
        }
    }

    /**
     * محاكاة السياسة على مجموعة محددة من الموظفين
     */
    async simulateForEmployees(
        policyId: string,
        employeeIds: string[],
        period: string,
        simulatorId: string,
        simulatorName: string,
    ) {
        // 1. جلب السياسة
        const policy = await this.prisma.smartPolicy.findUnique({
            where: { id: policyId },
        });

        if (!policy) {
            throw new NotFoundException(`السياسة غير موجودة: ${policyId}`);
        }

        const [yearStr, monthStr] = period.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);

        // 2. جلب الموظفين المحددين
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

        // 3. محاكاة لكل موظف
        const results: EmployeeSimulationResult[] = [];

        for (const employee of employees) {
            const result = await this.simulateForEmployee(
                policy,
                employee.id,
                `${employee.firstName} ${employee.lastName}`,
                month,
                year,
            );
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

    /**
     * جلب تاريخ المحاكاة لسياسة معينة
     */
    async getSimulationHistory(policyId: string, options?: { page?: number; limit?: number }) {
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

    /**
     * جلب تفاصيل محاكاة معينة
     */
    async getSimulationDetails(simulationId: string) {
        const simulation = await this.prisma.policySimulationRun.findUnique({
            where: { id: simulationId },
        });

        if (!simulation) {
            throw new NotFoundException(`المحاكاة غير موجودة: ${simulationId}`);
        }

        return simulation;
    }
}
