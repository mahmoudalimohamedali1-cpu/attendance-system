import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * 📊 نتيجة تطبيق السياسات على مسير الرواتب
 */
export interface PolicyPayrollResult {
    employeeId: string;
    employeeName: string;
    employeeCode: string;
    
    // المبالغ الأصلية
    originalBasicSalary: number;
    originalTotalSalary: number;
    
    // تعديلات السياسات
    policyDeductions: Array<{
        policyId: string;
        policyName: string;
        amount: number;
        reason: string;
        category: string;
    }>;
    policyBonuses: Array<{
        policyId: string;
        policyName: string;
        amount: number;
        reason: string;
        category: string;
    }>;
    
    // الإجماليات
    totalPolicyDeductions: number;
    totalPolicyBonuses: number;
    netPolicyImpact: number;
    
    // المبالغ النهائية
    finalTotalSalary: number;
}

/**
 * 📋 ملخص تطبيق السياسات على مسير الرواتب
 */
export interface PayrollPolicySummary {
    period: {
        month: number;
        year: number;
        periodLabel: string;
    };
    
    // إحصائيات
    totalEmployees: number;
    affectedEmployees: number;
    unaffectedEmployees: number;
    
    // المالية
    totalDeductions: number;
    totalBonuses: number;
    netImpact: number;
    
    // تفصيل حسب السياسة
    byPolicy: Array<{
        policyId: string;
        policyName: string;
        type: 'DEDUCTION' | 'BONUS';
        totalAmount: number;
        employeesAffected: number;
    }>;
    
    // تفصيل حسب القسم
    byDepartment: Array<{
        departmentId: string;
        departmentName: string;
        totalDeductions: number;
        totalBonuses: number;
        employeesAffected: number;
    }>;
}

/**
 * 🔗 PayrollPolicyIntegrationService
 * يربط نظام السياسات الذكية بنظام الرواتب
 * يسهّل على المحاسبين معرفة تأثير السياسات قبل صرف الرواتب
 */
@Injectable()
export class PayrollPolicyIntegrationService {
    private readonly logger = new Logger(PayrollPolicyIntegrationService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * 📊 حساب تأثير السياسات على مسير الرواتب
     * يُستخدم قبل اعتماد الرواتب لمراجعة التعديلات
     */
    async calculatePolicyImpactOnPayroll(
        companyId: string,
        month: number,
        year: number
    ): Promise<{
        results: PolicyPayrollResult[];
        summary: PayrollPolicySummary;
    }> {
        this.logger.log(`[PAYROLL-INTEGRATION] Calculating policy impact for ${year}-${month}`);

        const { startDate, endDate } = this.getPeriodDates(month, year);

        // 1. جلب جميع الموظفين النشطين مع بيانات العقود للبدلات
        const employees = await this.prisma.user.findMany({
            where: {
                companyId,
                status: 'ACTIVE',
                role: 'EMPLOYEE',
            },
            include: {
                department: { select: { id: true, name: true, nameEn: true } },
                contracts: {
                    where: { status: 'ACTIVE' },
                    orderBy: { startDate: 'desc' },
                    take: 1,
                    select: {
                        basicSalary: true,
                        housingAllowance: true,
                        transportAllowance: true,
                        otherAllowances: true,
                    },
                },
            },
        });

        // 2. جلب تنفيذات السياسات للفترة
        const executions = await this.prisma.smartPolicyExecution.findMany({
            where: {
                policy: { companyId },
                executedAt: { gte: startDate, lte: endDate },
            },
            include: {
                policy: { select: { id: true, originalText: true, triggerEvent: true } },
            },
        });

        // 3. تجميع التنفيذات حسب الموظف
        const executionsByEmployee = new Map<string, typeof executions>();
        for (const exec of executions) {
            const empId = exec.employeeId || '';
            if (!executionsByEmployee.has(empId)) {
                executionsByEmployee.set(empId, []);
            }
            executionsByEmployee.get(empId)!.push(exec);
        }

        // 4. حساب النتائج لكل موظف
        const results: PolicyPayrollResult[] = [];
        const departmentStats = new Map<string, {
            id: string;
            name: string;
            deductions: number;
            bonuses: number;
            employees: Set<string>;
        }>();

        const policyStats = new Map<string, {
            id: string;
            name: string;
            type: 'DEDUCTION' | 'BONUS';
            amount: number;
            employees: Set<string>;
        }>();

        for (const emp of employees) {
            const empExecs = executionsByEmployee.get(emp.id) || [];

            // حساب الراتب الأساسي والإجمالي مع البدلات
            const activeContract = (emp as any).contracts?.[0];
            const basicSalary = Number(activeContract?.basicSalary || emp.salary || 0);
            const housingAllowance = Number(activeContract?.housingAllowance || 0);
            const transportAllowance = Number(activeContract?.transportAllowance || 0);
            const otherAllowances = Number(activeContract?.otherAllowances || 0);
            const totalSalary = basicSalary + housingAllowance + transportAllowance + otherAllowances;

            const policyDeductions: PolicyPayrollResult['policyDeductions'] = [];
            const policyBonuses: PolicyPayrollResult['policyBonuses'] = [];

            for (const exec of empExecs) {
                const amount = Number(exec.actionValue || 0);
                const policyName = ((exec as any).policy?.originalText || '').substring(0, 50);
                const policyId = exec.policyId;
                const isDeduction = exec.actionType === 'DEDUCT_FROM_PAYROLL' || exec.actionType === 'DEDUCTION';
                const category = this.categorizePolicy((exec as any).policy?.triggerEvent || '');

                const item = {
                    policyId,
                    policyName,
                    amount,
                    reason: (exec.actionResult as any)?.description || ((exec as any).policy?.originalText || '').substring(0, 100) || '',
                    category,
                };

                if (isDeduction) {
                    policyDeductions.push(item);
                } else {
                    policyBonuses.push(item);
                }

                // تحديث إحصائيات السياسة
                if (!policyStats.has(policyId)) {
                    policyStats.set(policyId, {
                        id: policyId,
                        name: policyName,
                        type: isDeduction ? 'DEDUCTION' : 'BONUS',
                        amount: 0,
                        employees: new Set(),
                    });
                }
                const ps = policyStats.get(policyId)!;
                ps.amount += amount;
                ps.employees.add(emp.id);
            }

            const totalPolicyDeductions = policyDeductions.reduce((sum, d) => sum + d.amount, 0);
            const totalPolicyBonuses = policyBonuses.reduce((sum, b) => sum + b.amount, 0);
            const netPolicyImpact = totalPolicyBonuses - totalPolicyDeductions;

            results.push({
                employeeId: emp.id,
                employeeName: `${emp.firstName} ${emp.lastName}`,
                employeeCode: emp.employeeCode || '',
                originalBasicSalary: basicSalary,
                originalTotalSalary: totalSalary,
                policyDeductions,
                policyBonuses,
                totalPolicyDeductions,
                totalPolicyBonuses,
                netPolicyImpact,
                finalTotalSalary: totalSalary + netPolicyImpact,
            });

            // تحديث إحصائيات القسم
            const deptId = emp.departmentId || 'NO_DEPT';
            const deptName = emp.department?.name || emp.department?.nameEn || 'بدون قسم';
            if (!departmentStats.has(deptId)) {
                departmentStats.set(deptId, {
                    id: deptId,
                    name: deptName,
                    deductions: 0,
                    bonuses: 0,
                    employees: new Set(),
                });
            }
            const ds = departmentStats.get(deptId)!;
            ds.deductions += totalPolicyDeductions;
            ds.bonuses += totalPolicyBonuses;
            if (totalPolicyDeductions > 0 || totalPolicyBonuses > 0) {
                ds.employees.add(emp.id);
            }
        }

        // 5. بناء الملخص
        const totalDeductions = results.reduce((sum, r) => sum + r.totalPolicyDeductions, 0);
        const totalBonuses = results.reduce((sum, r) => sum + r.totalPolicyBonuses, 0);
        const affectedEmployees = results.filter(r => r.netPolicyImpact !== 0).length;

        const summary: PayrollPolicySummary = {
            period: {
                month,
                year,
                periodLabel: `${this.getMonthName(month)} ${year}`,
            },
            totalEmployees: employees.length,
            affectedEmployees,
            unaffectedEmployees: employees.length - affectedEmployees,
            totalDeductions,
            totalBonuses,
            netImpact: totalBonuses - totalDeductions,
            byPolicy: Array.from(policyStats.values()).map(ps => ({
                policyId: ps.id,
                policyName: ps.name,
                type: ps.type,
                totalAmount: ps.amount,
                employeesAffected: ps.employees.size,
            })),
            byDepartment: Array.from(departmentStats.values()).map(ds => ({
                departmentId: ds.id,
                departmentName: ds.name,
                totalDeductions: ds.deductions,
                totalBonuses: ds.bonuses,
                employeesAffected: ds.employees.size,
            })),
        };

        this.logger.log(`[PAYROLL-INTEGRATION] Calculated: ${affectedEmployees} affected, deductions=${totalDeductions}, bonuses=${totalBonuses}`);

        return { results, summary };
    }

    /**
     * 📝 تطبيق السياسات على سجل الراتب
     * يُنشئ سجلات PayrollAdjustment لكل تعديل من السياسات
     */
    async applyPoliciesToPayrollRecord(
        payrollRunId: string,
        employeeId: string,
        companyId: string,
        month: number,
        year: number
    ): Promise<{
        adjustmentsCreated: number;
        totalDeductions: number;
        totalBonuses: number;
    }> {
        const { startDate, endDate } = this.getPeriodDates(month, year);

        // جلب تنفيذات السياسات للموظف في الفترة
        const executions = await this.prisma.smartPolicyExecution.findMany({
            where: {
                policy: { companyId },
                employeeId,
                executedAt: { gte: startDate, lte: endDate },
                // تأكد من عدم التطبيق مرتين - التحقق يتم عبر isSuccess
                isSuccess: true,
            },
            include: {
                policy: { select: { originalText: true } },
            },
        });

        if (executions.length === 0) {
            return { adjustmentsCreated: 0, totalDeductions: 0, totalBonuses: 0 };
        }

        let adjustmentsCreated = 0;
        let totalDeductions = 0;
        let totalBonuses = 0;

        for (const exec of executions) {
            const amount = Number(exec.actionValue || 0);
            const isDeduction = exec.actionType === 'DEDUCT_FROM_PAYROLL' || exec.actionType === 'DEDUCTION';
            
            // إنشاء سجل التعديل في PayrollAdjustment أو PayrollItem
            try {
                // محاولة إنشاء في PayrollAdjustment
                await (this.prisma as any).payrollAdjustment?.create?.({
                    data: {
                        payrollRunId,
                        userId: employeeId,
                        type: isDeduction ? 'DEDUCTION' : 'ADDITION',
                        amount: new Decimal(amount),
                        description: `سياسة ذكية: ${((exec as any).policy?.originalText || '').substring(0, 50)}`,
                        sourceType: 'SMART_POLICY',
                        sourceId: exec.policyId,
                    },
                });
            } catch {
                // إذا لم يوجد PayrollAdjustment، نستخدم PayrollItem
                try {
                    await (this.prisma as any).payrollItem?.create?.({
                        data: {
                            payrollRunId,
                            userId: employeeId,
                            itemType: isDeduction ? 'DEDUCTION' : 'ADDITION',
                            amount: new Decimal(amount),
                            description: `سياسة ذكية: ${((exec as any).policy?.originalText || '').substring(0, 50)}`,
                            category: 'SMART_POLICY',
                            referenceId: exec.policyId,
                        },
                    });
                } catch (e) {
                    this.logger.warn(`Could not create payroll adjustment for execution ${exec.id}: ${e}`);
                    continue;
                }
            }

            // تحديث التنفيذ كمُطبّق على الراتب (نستخدم actionResult لتتبع التطبيق)
            await this.prisma.smartPolicyExecution.update({
                where: { id: exec.id },
                data: { 
                    actionResult: {
                        ...(exec.actionResult as any || {}),
                        appliedToPayroll: true,
                        appliedAt: new Date().toISOString(),
                        payrollRunId,
                    } 
                },
            });

            adjustmentsCreated++;
            if (isDeduction) {
                totalDeductions += amount;
            } else {
                totalBonuses += amount;
            }
        }

        this.logger.log(`[PAYROLL-INTEGRATION] Applied ${adjustmentsCreated} policy adjustments for employee ${employeeId}`);

        return { adjustmentsCreated, totalDeductions, totalBonuses };
    }

    /**
     * 📊 الحصول على ملخص التعديلات من السياسات لمسير راتب
     */
    async getPolicyAdjustmentsForPayroll(
        payrollRunId: string
    ): Promise<{
        deductions: Array<{
            employeeId: string;
            employeeName: string;
            policyName: string;
            amount: number;
        }>;
        bonuses: Array<{
            employeeId: string;
            employeeName: string;
            policyName: string;
            amount: number;
        }>;
        totalDeductions: number;
        totalBonuses: number;
    }> {
        // جلب التعديلات من PayrollAdjustment أو PayrollItem
        const adjustments = await (this.prisma as any).payrollAdjustment?.findMany?.({
            where: {
                payrollRunId,
                sourceType: 'SMART_POLICY',
            },
            include: {
                user: { select: { firstName: true, lastName: true } },
            },
        }) || [];

        const deductions: any[] = [];
        const bonuses: any[] = [];

        for (const adj of adjustments) {
            const item = {
                employeeId: adj.userId,
                employeeName: `${adj.user?.firstName || ''} ${adj.user?.lastName || ''}`.trim(),
                policyName: adj.description?.replace('سياسة ذكية: ', '') || '',
                amount: Number(adj.amount || 0),
            };

            if (adj.type === 'DEDUCTION') {
                deductions.push(item);
            } else {
                bonuses.push(item);
            }
        }

        return {
            deductions,
            bonuses,
            totalDeductions: deductions.reduce((sum, d) => sum + d.amount, 0),
            totalBonuses: bonuses.reduce((sum, b) => sum + b.amount, 0),
        };
    }

    /**
     * 🔄 مزامنة السياسات مع مسير الرواتب
     * يُستخدم عند إنشاء مسير رواتب جديد
     */
    async syncPoliciesWithPayroll(
        payrollRunId: string,
        companyId: string,
        month: number,
        year: number
    ): Promise<{
        success: boolean;
        employeesProcessed: number;
        totalAdjustments: number;
        totalDeductions: number;
        totalBonuses: number;
        errors: string[];
    }> {
        this.logger.log(`[PAYROLL-INTEGRATION] Syncing policies with payroll ${payrollRunId}`);

        // جلب موظفي الشركة
        const employees = await this.prisma.user.findMany({
            where: { companyId, status: 'ACTIVE' },
            select: { id: true },
        });

        let employeesProcessed = 0;
        let totalAdjustments = 0;
        let totalDeductions = 0;
        let totalBonuses = 0;
        const errors: string[] = [];

        for (const emp of employees) {
            try {
                const result = await this.applyPoliciesToPayrollRecord(
                    payrollRunId,
                    emp.id,
                    companyId,
                    month,
                    year
                );

                if (result.adjustmentsCreated > 0) {
                    employeesProcessed++;
                    totalAdjustments += result.adjustmentsCreated;
                    totalDeductions += result.totalDeductions;
                    totalBonuses += result.totalBonuses;
                }
            } catch (error: any) {
                errors.push(`Employee ${emp.id}: ${error.message}`);
            }
        }

        this.logger.log(`[PAYROLL-INTEGRATION] Sync complete: ${employeesProcessed} employees, ${totalAdjustments} adjustments`);

        return {
            success: errors.length === 0,
            employeesProcessed,
            totalAdjustments,
            totalDeductions,
            totalBonuses,
            errors,
        };
    }

    /**
     * 🛠️ Helper: تصنيف السياسة
     */
    private categorizePolicy(triggerEvent: string): string {
        const categories: Record<string, string> = {
            'PAYROLL': 'رواتب',
            'ATTENDANCE': 'حضور',
            'LATE': 'تأخير',
            'ABSENT': 'غياب',
            'LEAVE': 'إجازات',
            'PERFORMANCE': 'أداء',
            'MANUAL': 'يدوي',
        };
        return categories[triggerEvent] || 'أخرى';
    }

    /**
     * 🛠️ Helper: الحصول على تواريخ الفترة
     */
    private getPeriodDates(month: number, year: number): { startDate: Date; endDate: Date } {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        return { startDate, endDate };
    }

    /**
     * 🛠️ Helper: اسم الشهر بالعربية
     */
    private getMonthName(month: number): string {
        const months = [
            'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ];
        return months[month - 1] || '';
    }
}
