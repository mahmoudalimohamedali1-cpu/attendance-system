// @ts-nocheck
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * 📊 ملخص لوحة المحاسبين
 */
export interface AccountantDashboardSummary {
    // ملخص الفترة الحالية
    currentPeriod: {
        month: number;
        year: number;
        periodLabel: string;
    };

    // ملخص مالي سريع
    financialSummary: {
        totalDeductions: number;        // إجمالي الخصومات من السياسات
        totalBonuses: number;           // إجمالي المكافآت من السياسات
        netPolicyImpact: number;        // صافي التأثير (مكافآت - خصومات)
        pendingApprovalAmount: number;  // مبالغ بانتظار الموافقة
        affectedEmployeesCount: number; // عدد الموظفين المتأثرين
    };

    // السياسات النشطة
    activePolicies: {
        total: number;
        deductionPolicies: number;
        bonusPolicies: number;
        newThisMonth: number;
    };

    // تنبيهات للمحاسب
    alerts: Array<{
        type: 'WARNING' | 'INFO' | 'CRITICAL';
        title: string;
        message: string;
        actionUrl?: string;
    }>;

    // آخر التنفيذات
    recentExecutions: Array<{
        id: string;
        policyName: string;
        employeeName: string;
        amount: number;
        type: 'DEDUCTION' | 'BONUS';
        date: Date;
        status: 'APPLIED' | 'PENDING' | 'REJECTED';
    }>;

    // مقارنة مع الشهر السابق
    comparison: {
        deductionsChange: number;       // نسبة التغير في الخصومات
        bonusesChange: number;          // نسبة التغير في المكافآت
        employeesAffectedChange: number;// نسبة التغير في الموظفين المتأثرين
    };
}

/**
 * 📋 تفاصيل تأثير السياسات على موظف
 */
export interface EmployeePolicyImpact {
    employeeId: string;
    employeeName: string;
    employeeCode: string;
    department: string;
    basicSalary: number;
    policies: Array<{
        policyId: string;
        policyName: string;
        type: 'DEDUCTION' | 'BONUS';
        amount: number;
        reason: string;
        appliedAt: Date;
    }>;
    totalDeductions: number;
    totalBonuses: number;
    netImpact: number;
}

/**
 * 📅 التقويم المالي للسياسات
 */
export interface PolicyFinancialCalendar {
    month: number;
    year: number;
    days: Array<{
        date: string;
        hasExecutions: boolean;
        executionCount: number;
        totalAmount: number;
    }>;
}

/**
 * 🧾 AccountantDashboardService
 * لوحة تحكم خاصة بالمحاسبين لمتابعة تأثير السياسات على الرواتب
 */
@Injectable()
export class AccountantDashboardService {
    private readonly logger = new Logger(AccountantDashboardService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * 📊 الحصول على ملخص لوحة المحاسبين
     */
    async getDashboardSummary(
        companyId: string,
        month?: number,
        year?: number
    ): Promise<AccountantDashboardSummary> {
        const now = new Date();
        const targetMonth = month || now.getMonth() + 1;
        const targetYear = year || now.getFullYear();
        const { startDate, endDate } = this.getPeriodDates(targetMonth, targetYear);

        this.logger.log(`[ACCOUNTANT] Fetching dashboard for company ${companyId}, period ${targetYear}-${targetMonth}`);

        // 1. جلب السياسات النشطة
        const policies = await this.prisma.smartPolicy.findMany({
            where: { companyId, isActive: true },
            select: {
                id: true,
                originalText: true,
                status: true,
                triggerEvent: true,
                createdAt: true,
            },
        });

        // 2. جلب التنفيذات للفترة الحالية
        const executions = await this.prisma.smartPolicyExecution.findMany({
            where: {
                policy: { companyId },
                executedAt: { gte: startDate, lte: endDate },
            },
            include: {
                policy: { select: { originalText: true } },
            },
            orderBy: { executedAt: 'desc' },
        });

        // 3. جلب التنفيذات للشهر السابق (للمقارنة)
        const prevMonthStart = new Date(targetYear, targetMonth - 2, 1);
        const prevMonthEnd = new Date(targetYear, targetMonth - 1, 0);
        const prevExecutions = await this.prisma.smartPolicyExecution.findMany({
            where: {
                policy: { companyId },
                executedAt: { gte: prevMonthStart, lte: prevMonthEnd },
            },
        });

        // 4. حساب الملخص المالي
        let totalDeductions = 0;
        let totalBonuses = 0;
        const affectedEmployees = new Set<string>();

        for (const exec of executions) {
            const amount = Number(exec.actionValue || 0);
            if (exec.actionType === 'DEDUCT_FROM_PAYROLL' || exec.actionType === 'DEDUCTION') {
                totalDeductions += amount;
            } else {
                totalBonuses += amount;
            }
            if (exec.employeeId) {
                affectedEmployees.add(exec.employeeId);
            }
        }

        // حساب الشهر السابق
        let prevDeductions = 0;
        let prevBonuses = 0;
        const prevAffectedEmployees = new Set<string>();

        for (const exec of prevExecutions) {
            const amount = Number(exec.actionValue || 0);
            if (exec.actionType === 'DEDUCT_FROM_PAYROLL' || exec.actionType === 'DEDUCTION') {
                prevDeductions += amount;
            } else {
                prevBonuses += amount;
            }
            if (exec.employeeId) {
                prevAffectedEmployees.add(exec.employeeId);
            }
        }

        // 5. السياسات الجديدة هذا الشهر
        const newPoliciesThisMonth = policies.filter(p =>
            p.createdAt >= startDate && p.createdAt <= endDate
        ).length;

        // 5.5 حساب المبالغ بانتظار الموافقة
        const pendingApprovals = await this.prisma.smartPolicyApproval.findMany({
            where: {
                policy: { companyId },
                action: 'SUBMITTED',
            },
            include: {
                policy: {
                    select: {
                        parsedRule: true,
                    },
                },
            },
        });

        let pendingApprovalAmount = 0;
        for (const approval of pendingApprovals) {
            // استخراج القيمة المتوقعة من السياسة المعلقة
            const parsed = approval.policy?.parsedRule as any;
            if (parsed?.actions) {
                for (const action of parsed.actions) {
                    const value = parseFloat(action.value) || 0;
                    pendingApprovalAmount += value;
                }
            }
        }

        // 6. التنبيهات
        const alerts = await this.generateAlerts(companyId, totalDeductions, totalBonuses, executions.length);

        // 7. آخر التنفيذات
        const recentExecutions: AccountantDashboardSummary['recentExecutions'] = executions.slice(0, 10).map((e: any) => ({
            id: e.id as string,
            policyName: ((e.policy?.originalText || '') as string).substring(0, 50),
            employeeName: (e.employeeName || 'غير محدد') as string,
            amount: Number(e.actionValue || 0),
            type: (e.actionType === 'DEDUCT_FROM_PAYROLL' || e.actionType === 'DEDUCTION') ? 'DEDUCTION' as const : 'BONUS' as const,
            date: e.executedAt as Date,
            status: 'APPLIED' as const,
        }));

        // 8. المقارنة
        const calculateChange = (current: number, prev: number) => {
            if (prev === 0) return current > 0 ? 100 : 0;
            return Math.round(((current - prev) / prev) * 100);
        };

        return {
            currentPeriod: {
                month: targetMonth,
                year: targetYear,
                periodLabel: `${this.getMonthName(targetMonth)} ${targetYear}`,
            },
            financialSummary: {
                totalDeductions,
                totalBonuses,
                netPolicyImpact: totalBonuses - totalDeductions,
                pendingApprovalAmount,
                affectedEmployeesCount: affectedEmployees.size,
            },
            activePolicies: {
                total: policies.length,
                deductionPolicies: policies.filter(p =>
                    (p.originalText || '').includes('خصم') || (p.originalText || '').includes('يخصم')
                ).length,
                bonusPolicies: policies.filter(p =>
                    (p.originalText || '').includes('مكافأة') || (p.originalText || '').includes('يضاف')
                ).length,
                newThisMonth: newPoliciesThisMonth,
            },
            alerts,
            recentExecutions,
            comparison: {
                deductionsChange: calculateChange(totalDeductions, prevDeductions),
                bonusesChange: calculateChange(totalBonuses, prevBonuses),
                employeesAffectedChange: calculateChange(affectedEmployees.size, prevAffectedEmployees.size),
            },
        };
    }

    /**
     * 📋 الحصول على تأثير السياسات على كل موظف
     */
    async getEmployeesPolicyImpact(
        companyId: string,
        month: number,
        year: number,
        options?: {
            departmentId?: string;
            branchId?: string;
            page?: number;
            limit?: number;
        }
    ): Promise<{
        data: EmployeePolicyImpact[];
        summary: {
            totalDeductions: number;
            totalBonuses: number;
            totalEmployees: number;
        };
        pagination: {
            page: number;
            limit: number;
            total: number;
        };
    }> {
        const { startDate, endDate } = this.getPeriodDates(month, year);
        const page = options?.page || 1;
        const limit = options?.limit || 50;
        const skip = (page - 1) * limit;

        // جلب التنفيذات مع بيانات الموظفين
        const executions = await this.prisma.smartPolicyExecution.findMany({
            where: {
                policy: { companyId },
                executedAt: { gte: startDate, lte: endDate },
            },
            include: {
                policy: { select: { id: true, originalText: true } },
            },
        });

        // تجميع حسب الموظف
        const employeeMap = new Map<string, EmployeePolicyImpact>();

        for (const exec of executions) {
            const empId = exec.employeeId || 'unknown';

            if (!employeeMap.has(empId)) {
                employeeMap.set(empId, {
                    employeeId: empId,
                    employeeName: exec.employeeName || 'غير محدد',
                    employeeCode: '',
                    department: '',
                    basicSalary: 0,
                    policies: [],
                    totalDeductions: 0,
                    totalBonuses: 0,
                    netImpact: 0,
                });
            }

            const emp = employeeMap.get(empId)!;
            const amount = Number(exec.actionValue || 0);
            const isDeduction = exec.actionType === 'DEDUCT_FROM_PAYROLL' || exec.actionType === 'DEDUCTION';

            emp.policies.push({
                policyId: exec.policyId,
                policyName: ((exec as any).policy?.originalText || '').substring(0, 50),
                type: isDeduction ? 'DEDUCTION' : 'BONUS',
                amount,
                reason: (exec.actionResult as any)?.description || ((exec as any).policy?.originalText || '').substring(0, 100) || '',
                appliedAt: exec.executedAt,
            });

            if (isDeduction) {
                emp.totalDeductions += amount;
            } else {
                emp.totalBonuses += amount;
            }
            emp.netImpact = emp.totalBonuses - emp.totalDeductions;
        }

        // جلب بيانات إضافية للموظفين
        const employeeIds = Array.from(employeeMap.keys()).filter(id => id !== 'unknown');
        if (employeeIds.length > 0) {
            const employees = await this.prisma.user.findMany({
                where: { id: { in: employeeIds } },
                select: {
                    id: true,
                    employeeCode: true,
                    salary: true,
                    department: { select: { name: true, nameEn: true } },
                },
            });

            for (const emp of employees) {
                const impact = employeeMap.get(emp.id);
                if (impact) {
                    impact.employeeCode = emp.employeeCode || '';
                    impact.department = emp.department?.name || emp.department?.nameEn || '';
                    impact.basicSalary = Number(emp.salary || 0);
                }
            }
        }

        const allData = Array.from(employeeMap.values());
        const paginatedData = allData.slice(skip, skip + limit);

        // حساب الملخص
        const summary = {
            totalDeductions: allData.reduce((sum, e) => sum + e.totalDeductions, 0),
            totalBonuses: allData.reduce((sum, e) => sum + e.totalBonuses, 0),
            totalEmployees: allData.length,
        };

        return {
            data: paginatedData,
            summary,
            pagination: {
                page,
                limit,
                total: allData.length,
            },
        };
    }

    /**
     * 📅 الحصول على التقويم المالي للسياسات
     */
    async getFinancialCalendar(
        companyId: string,
        month: number,
        year: number
    ): Promise<PolicyFinancialCalendar> {
        const { startDate, endDate } = this.getPeriodDates(month, year);
        const daysInMonth = new Date(year, month, 0).getDate();

        // جلب التنفيذات
        const executions = await this.prisma.smartPolicyExecution.findMany({
            where: {
                policy: { companyId },
                executedAt: { gte: startDate, lte: endDate },
            },
            select: {
                executedAt: true,
                actionValue: true,
            },
        });

        // تجميع حسب اليوم
        const dayMap = new Map<string, { count: number; amount: number }>();

        for (const exec of executions) {
            const dayStr = exec.executedAt.toISOString().split('T')[0];
            const current = dayMap.get(dayStr) || { count: 0, amount: 0 };
            current.count++;
            current.amount += Number(exec.actionValue || 0);
            dayMap.set(dayStr, current);
        }

        // بناء أيام الشهر
        const days: PolicyFinancialCalendar['days'] = [];
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayData = dayMap.get(dateStr);
            days.push({
                date: dateStr,
                hasExecutions: !!dayData,
                executionCount: dayData?.count || 0,
                totalAmount: dayData?.amount || 0,
            });
        }

        return {
            month,
            year,
            days,
        };
    }

    /**
     * 📊 ملخص سريع للمحاسب (Widget)
     */
    async getQuickSummary(companyId: string): Promise<{
        pendingApprovals: number;
        todayExecutions: number;
        monthlyDeductions: number;
        monthlyBonuses: number;
        alertsCount: number;
    }> {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        const { startDate, endDate } = this.getPeriodDates(now.getMonth() + 1, now.getFullYear());

        const [pendingPolicies, todayExecs, monthExecs, failedExecs, highDeductions] = await Promise.all([
            this.prisma.smartPolicy.count({
                where: { companyId, status: 'PENDING' },
            }),
            this.prisma.smartPolicyExecution.count({
                where: {
                    policy: { companyId },
                    executedAt: { gte: today, lt: tomorrow },
                },
            }),
            this.prisma.smartPolicyExecution.findMany({
                where: {
                    policy: { companyId },
                    executedAt: { gte: startDate, lte: endDate },
                },
                select: { actionType: true, actionValue: true },
            }),
            // عدد التنفيذات الفاشلة هذا الشهر
            this.prisma.smartPolicyExecution.count({
                where: {
                    policy: { companyId },
                    executedAt: { gte: startDate, lte: endDate },
                    isSuccess: false,
                },
            }),
            // عدد الخصومات الكبيرة (أكثر من 1000 ريال)
            this.prisma.smartPolicyExecution.count({
                where: {
                    policy: { companyId },
                    executedAt: { gte: startDate, lte: endDate },
                    actionType: { in: ['DEDUCT_FROM_PAYROLL', 'DEDUCTION'] },
                    actionValue: { gte: 1000 },
                },
            }),
        ]);

        let monthlyDeductions = 0;
        let monthlyBonuses = 0;

        for (const exec of monthExecs) {
            const amount = Number(exec.actionValue || 0);
            if (exec.actionType === 'DEDUCT_FROM_PAYROLL' || exec.actionType === 'DEDUCTION') {
                monthlyDeductions += amount;
            } else {
                monthlyBonuses += amount;
            }
        }

        // حساب عدد التنبيهات: سياسات معلقة + تنفيذات فاشلة + خصومات كبيرة
        const alertsCount = pendingPolicies + failedExecs + highDeductions;

        return {
            pendingApprovals: pendingPolicies,
            todayExecutions: todayExecs,
            monthlyDeductions,
            monthlyBonuses,
            alertsCount,
        };
    }

    /**
     * 🔔 توليد التنبيهات للمحاسب
     */
    private async generateAlerts(
        companyId: string,
        totalDeductions: number,
        totalBonuses: number,
        executionsCount: number
    ): Promise<AccountantDashboardSummary['alerts']> {
        const alerts: AccountantDashboardSummary['alerts'] = [];

        // تنبيه: خصومات كبيرة
        if (totalDeductions > 50000) {
            alerts.push({
                type: 'WARNING',
                title: 'خصومات كبيرة',
                message: `إجمالي الخصومات هذا الشهر ${totalDeductions.toLocaleString()} ريال - يُنصح بمراجعتها`,
                actionUrl: '/smart-policies/analytics',
            });
        }

        // تنبيه: سياسات بانتظار الموافقة
        const pendingCount = await this.prisma.smartPolicy.count({
            where: { companyId, status: 'PENDING' },
        });

        if (pendingCount > 0) {
            alerts.push({
                type: 'INFO',
                title: 'سياسات بانتظار الموافقة',
                message: `يوجد ${pendingCount} سياسة بانتظار موافقتك`,
                actionUrl: '/smart-policies/approval-queue',
            });
        }

        // تنبيه: لا توجد سياسات نشطة
        const activePolicies = await this.prisma.smartPolicy.count({
            where: { companyId, isActive: true },
        });

        if (activePolicies === 0) {
            alerts.push({
                type: 'INFO',
                title: 'لا توجد سياسات نشطة',
                message: 'لم يتم تفعيل أي سياسات ذكية - يمكنك البدء بإضافة سياسات من القوالب',
                actionUrl: '/smart-policies/templates/library',
            });
        }

        return alerts;
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
