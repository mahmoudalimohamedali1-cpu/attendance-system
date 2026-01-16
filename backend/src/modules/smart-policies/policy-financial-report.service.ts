import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * 📊 تقرير مالي شهري للسياسات
 */
export interface MonthlyFinancialReport {
    period: {
        month: number;
        year: number;
        periodLabel: string;
        startDate: Date;
        endDate: Date;
    };

    // ملخص تنفيذي
    executiveSummary: {
        totalPoliciesExecuted: number;
        totalEmployeesAffected: number;
        totalDeductions: number;
        totalBonuses: number;
        netImpact: number;
        avgDeductionPerEmployee: number;
        avgBonusPerEmployee: number;
    };

    // تفاصيل الخصومات
    deductionsBreakdown: {
        byCategory: Array<{
            category: string;
            categoryLabel: string;
            amount: number;
            percentage: number;
            count: number;
        }>;
        byPolicy: Array<{
            policyId: string;
            policyName: string;
            amount: number;
            employeesAffected: number;
        }>;
        byDepartment: Array<{
            departmentId: string;
            departmentName: string;
            amount: number;
            employeesAffected: number;
        }>;
        topEmployees: Array<{
            employeeId: string;
            employeeName: string;
            employeeCode: string;
            totalDeductions: number;
            deductionCount: number;
        }>;
    };

    // تفاصيل المكافآت
    bonusesBreakdown: {
        byCategory: Array<{
            category: string;
            categoryLabel: string;
            amount: number;
            percentage: number;
            count: number;
        }>;
        byPolicy: Array<{
            policyId: string;
            policyName: string;
            amount: number;
            employeesAffected: number;
        }>;
        byDepartment: Array<{
            departmentId: string;
            departmentName: string;
            amount: number;
            employeesAffected: number;
        }>;
        topEmployees: Array<{
            employeeId: string;
            employeeName: string;
            employeeCode: string;
            totalBonuses: number;
            bonusCount: number;
        }>;
    };

    // مقارنة مع الفترات السابقة
    comparison: {
        previousMonth: {
            deductions: number;
            bonuses: number;
            deductionsChange: number;
            bonusesChange: number;
        };
        yearToDate: {
            totalDeductions: number;
            totalBonuses: number;
            avgMonthlyDeductions: number;
            avgMonthlyBonuses: number;
        };
    };

    // التفاصيل للمراجعة
    detailedTransactions: Array<{
        id: string;
        date: Date;
        employeeName: string;
        employeeCode: string;
        department: string;
        policyName: string;
        type: 'DEDUCTION' | 'BONUS';
        amount: number;
        reason: string;
    }>;
}

/**
 * 📈 تقرير تحليلي للسياسات
 */
export interface PolicyAnalyticalReport {
    // فعالية السياسات
    policyEffectiveness: Array<{
        policyId: string;
        policyName: string;
        type: 'DEDUCTION' | 'BONUS';
        executionCount: number;
        totalAmount: number;
        successRate: number;
        trend: 'UP' | 'DOWN' | 'STABLE';
        recommendation: string;
    }>;

    // أنماط السلوك
    behaviorPatterns: {
        latePatterns: {
            totalLateIncidents: number;
            repeatOffenders: number;
            improvementRate: number;
        };
        absencePatterns: {
            totalAbsences: number;
            unexcusedAbsences: number;
            departmentWithHighestAbsence: string;
        };
        performancePatterns: {
            aboveTargetEmployees: number;
            belowTargetEmployees: number;
            avgTargetAchievement: number;
        };
    };

    // توصيات للمحاسب
    recommendations: Array<{
        priority: 'HIGH' | 'MEDIUM' | 'LOW';
        title: string;
        description: string;
        potentialImpact: string;
        actionRequired: string;
    }>;
}

/**
 * 📋 PolicyFinancialReportService
 * خدمة التقارير المالية الذكية للسياسات
 * تُسهّل على المحاسبين إنشاء تقارير شاملة
 */
@Injectable()
export class PolicyFinancialReportService {
    private readonly logger = new Logger(PolicyFinancialReportService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * 📊 إنشاء تقرير مالي شهري
     */
    async generateMonthlyReport(
        companyId: string,
        month: number,
        year: number
    ): Promise<MonthlyFinancialReport> {
        this.logger.log(`[REPORT] Generating monthly financial report for ${year}-${month}`);

        const { startDate, endDate } = this.getPeriodDates(month, year);

        // جلب جميع التنفيذات للفترة
        const executions = await this.prisma.smartPolicyExecution.findMany({
            where: {
                policy: { companyId },
                executedAt: { gte: startDate, lte: endDate },
            },
            include: {
                policy: { select: { id: true, originalText: true, triggerEvent: true } },
            },
        });

        // جلب بيانات الموظفين
        const employeeIds = [...new Set(executions.map(e => e.employeeId).filter(Boolean))] as string[];
        const employees = await this.prisma.user.findMany({
            where: { id: { in: employeeIds } },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
                departmentId: true,
                department: { select: { id: true, name: true, nameEn: true } },
            },
        });
        const employeeMap = new Map(employees.map(e => [e.id, e]));

        // تصنيف التنفيذات
        const deductions: typeof executions = [];
        const bonuses: typeof executions = [];

        for (const exec of executions) {
            if (exec.actionType === 'DEDUCT_FROM_PAYROLL' || exec.actionType === 'DEDUCTION') {
                deductions.push(exec);
            } else {
                bonuses.push(exec);
            }
        }

        const totalDeductions = deductions.reduce((sum, e) => sum + Number(e.actionValue || 0), 0);
        const totalBonuses = bonuses.reduce((sum, e) => sum + Number(e.actionValue || 0), 0);
        const affectedEmployees = new Set(executions.map(e => e.employeeId).filter(Boolean));

        // === بناء تفاصيل الخصومات ===
        const deductionsBreakdown = this.buildBreakdown(deductions, employeeMap, 'DEDUCTION');

        // === بناء تفاصيل المكافآت ===
        const bonusesBreakdown = this.buildBreakdown(bonuses, employeeMap, 'BONUS');

        // === المقارنة مع الشهر السابق ===
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;
        const { startDate: prevStart, endDate: prevEnd } = this.getPeriodDates(prevMonth, prevYear);

        const prevExecutions = await this.prisma.smartPolicyExecution.findMany({
            where: {
                policy: { companyId },
                executedAt: { gte: prevStart, lte: prevEnd },
            },
        });

        const prevDeductions = prevExecutions
            .filter(e => e.actionType === 'DEDUCT_FROM_PAYROLL' || e.actionType === 'DEDUCTION')
            .reduce((sum, e) => sum + Number(e.actionValue || 0), 0);
        const prevBonuses = prevExecutions
            .filter(e => e.actionType !== 'DEDUCT_FROM_PAYROLL' && e.actionType !== 'DEDUCTION')
            .reduce((sum, e) => sum + Number(e.actionValue || 0), 0);

        // === Year to Date ===
        const ytdStart = new Date(year, 0, 1);
        const ytdExecutions = await this.prisma.smartPolicyExecution.findMany({
            where: {
                policy: { companyId },
                executedAt: { gte: ytdStart, lte: endDate },
            },
        });

        const ytdDeductions = ytdExecutions
            .filter(e => e.actionType === 'DEDUCT_FROM_PAYROLL' || e.actionType === 'DEDUCTION')
            .reduce((sum, e) => sum + Number(e.actionValue || 0), 0);
        const ytdBonuses = ytdExecutions
            .filter(e => e.actionType !== 'DEDUCT_FROM_PAYROLL' && e.actionType !== 'DEDUCTION')
            .reduce((sum, e) => sum + Number(e.actionValue || 0), 0);

        // === التفاصيل للمراجعة ===
        const detailedTransactions: {
            id: string;
            date: Date;
            employeeName: string;
            employeeCode: string;
            department: string;
            policyName: string;
            type: 'DEDUCTION' | 'BONUS';
            amount: number;
            reason: string;
        }[] = executions.map(exec => {
            const emp = employeeMap.get(exec.employeeId || '');
            const isDeduction = exec.actionType === 'DEDUCT_FROM_PAYROLL' || exec.actionType === 'DEDUCTION';
            return {
                id: exec.id,
                date: exec.executedAt,
                employeeName: exec.employeeName || `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim(),
                employeeCode: emp?.employeeCode || '',
                department: emp?.department?.name || emp?.department?.nameEn || '',
                policyName: ((exec as any).policy?.originalText || '').substring(0, 50) as string,
                type: isDeduction ? 'DEDUCTION' as const : 'BONUS' as const,
                amount: Number(exec.actionValue || 0),
                reason: (exec.actionResult as any)?.description || ((exec as any).policy?.originalText || '').substring(0, 100) || '',
            };
        }).sort((a, b) => b.date.getTime() - a.date.getTime());

        return {
            period: {
                month,
                year,
                periodLabel: `${this.getMonthName(month)} ${year}`,
                startDate,
                endDate,
            },
            executiveSummary: {
                totalPoliciesExecuted: executions.length,
                totalEmployeesAffected: affectedEmployees.size,
                totalDeductions,
                totalBonuses,
                netImpact: totalBonuses - totalDeductions,
                avgDeductionPerEmployee: affectedEmployees.size > 0 ? Math.round(totalDeductions / affectedEmployees.size) : 0,
                avgBonusPerEmployee: affectedEmployees.size > 0 ? Math.round(totalBonuses / affectedEmployees.size) : 0,
            },
            deductionsBreakdown,
            bonusesBreakdown,
            comparison: {
                previousMonth: {
                    deductions: prevDeductions,
                    bonuses: prevBonuses,
                    deductionsChange: this.calculatePercentChange(totalDeductions, prevDeductions),
                    bonusesChange: this.calculatePercentChange(totalBonuses, prevBonuses),
                },
                yearToDate: {
                    totalDeductions: ytdDeductions,
                    totalBonuses: ytdBonuses,
                    avgMonthlyDeductions: Math.round(ytdDeductions / month),
                    avgMonthlyBonuses: Math.round(ytdBonuses / month),
                },
            },
            detailedTransactions,
        };
    }

    /**
     * 📈 إنشاء تقرير تحليلي
     */
    async generateAnalyticalReport(
        companyId: string,
        month: number,
        year: number
    ): Promise<PolicyAnalyticalReport> {
        this.logger.log(`[REPORT] Generating analytical report for ${year}-${month}`);

        const { startDate, endDate } = this.getPeriodDates(month, year);

        // جلب السياسات مع التنفيذات
        const policies = await this.prisma.smartPolicy.findMany({
            where: { companyId, isActive: true },
            include: {
                executions: {
                    where: { executedAt: { gte: startDate, lte: endDate } },
                },
            },
        });

        // تحليل فعالية السياسات
        const policyEffectiveness: Array<{
            policyId: string;
            policyName: string;
            type: 'DEDUCTION' | 'BONUS';
            executionCount: number;
            totalAmount: number;
            successRate: number;
            trend: 'UP' | 'DOWN' | 'STABLE';
            recommendation: string;
        }> = policies.map(policy => {
            const execs = policy.executions;
            const successfulExecs = execs.filter((e: any) => e.isSuccess);
            const totalAmount = execs.reduce((sum: number, e: any) => sum + Number(e.actionValue || 0), 0);
            const isDeduction = (policy.originalText || '').includes('خصم');

            return {
                policyId: policy.id,
                policyName: (policy.originalText || '').substring(0, 50),
                type: (isDeduction ? 'DEDUCTION' : 'BONUS') as 'DEDUCTION' | 'BONUS',
                executionCount: execs.length,
                totalAmount,
                successRate: execs.length > 0 ? Math.round((successfulExecs.length / execs.length) * 100) : 0,
                trend: this.calculateTrend(policy.id, startDate),
                recommendation: this.generatePolicyRecommendation(execs.length, successfulExecs.length, totalAmount),
            };
        }).filter(p => p.executionCount > 0);

        // تحليل أنماط السلوك (من الحضور)
        const attendanceStats = await this.getAttendancePatterns(companyId, month, year);

        // توصيات للمحاسب
        const recommendations = this.generateRecommendations(policyEffectiveness as any[], attendanceStats);

        return {
            policyEffectiveness,
            behaviorPatterns: attendanceStats,
            recommendations,
        };
    }

    /**
     * 📋 إنشاء تقرير مقارنة فترات
     */
    async generateComparisonReport(
        companyId: string,
        period1: { month: number; year: number },
        period2: { month: number; year: number }
    ): Promise<{
        period1Summary: { deductions: number; bonuses: number; employees: number };
        period2Summary: { deductions: number; bonuses: number; employees: number };
        changes: {
            deductionsChange: number;
            bonusesChange: number;
            employeesChange: number;
        };
        insights: string[];
    }> {
        const [data1, data2] = await Promise.all([
            this.getPeriodSummary(companyId, period1.month, period1.year),
            this.getPeriodSummary(companyId, period2.month, period2.year),
        ]);

        const insights: string[] = [];

        // تحليل التغييرات
        if (data1.deductions > data2.deductions * 1.2) {
            insights.push(`📈 زيادة الخصومات بنسبة ${this.calculatePercentChange(data1.deductions, data2.deductions)}%`);
        }
        if (data1.bonuses > data2.bonuses * 1.2) {
            insights.push(`📈 زيادة المكافآت بنسبة ${this.calculatePercentChange(data1.bonuses, data2.bonuses)}%`);
        }
        if (data1.employees > data2.employees * 1.1) {
            insights.push(`👥 زيادة الموظفين المتأثرين بنسبة ${this.calculatePercentChange(data1.employees, data2.employees)}%`);
        }

        return {
            period1Summary: data1,
            period2Summary: data2,
            changes: {
                deductionsChange: this.calculatePercentChange(data1.deductions, data2.deductions),
                bonusesChange: this.calculatePercentChange(data1.bonuses, data2.bonuses),
                employeesChange: this.calculatePercentChange(data1.employees, data2.employees),
            },
            insights,
        };
    }

    /**
     * 🛠️ Helper: بناء تفاصيل الخصومات/المكافآت
     */
    private buildBreakdown(
        executions: any[],
        employeeMap: Map<string, any>,
        type: 'DEDUCTION' | 'BONUS'
    ) {
        const total = executions.reduce((sum, e) => sum + Number(e.actionValue || 0), 0);

        // حسب الفئة
        const categoryMap = new Map<string, { amount: number; count: number }>();
        // حسب السياسة
        const policyMap = new Map<string, { name: string; amount: number; employees: Set<string> }>();
        // حسب القسم
        const deptMap = new Map<string, { name: string; amount: number; employees: Set<string> }>();
        // حسب الموظف
        const empMap = new Map<string, { name: string; code: string; amount: number; count: number }>();

        for (const exec of executions) {
            const amount = Number(exec.actionValue || 0);
            const category = this.getCategoryLabel(exec.policy?.triggerEvent || '');
            const policyId = exec.policyId;
            const policyName = (exec.policy?.originalText || '').substring(0, 50);
            const emp = employeeMap.get(exec.employeeId || '');
            const empId = exec.employeeId || '';
            const empName = exec.employeeName || `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim();
            const deptId = emp?.departmentId || 'NO_DEPT';
            const deptName = emp?.department?.name || emp?.department?.nameEn || 'بدون قسم';

            // الفئة
            if (!categoryMap.has(category)) {
                categoryMap.set(category, { amount: 0, count: 0 });
            }
            const cat = categoryMap.get(category)!;
            cat.amount += amount;
            cat.count++;

            // السياسة
            if (!policyMap.has(policyId)) {
                policyMap.set(policyId, { name: policyName, amount: 0, employees: new Set() });
            }
            const pol = policyMap.get(policyId)!;
            pol.amount += amount;
            if (empId) pol.employees.add(empId);

            // القسم
            if (!deptMap.has(deptId)) {
                deptMap.set(deptId, { name: deptName, amount: 0, employees: new Set() });
            }
            const dept = deptMap.get(deptId)!;
            dept.amount += amount;
            if (empId) dept.employees.add(empId);

            // الموظف
            if (empId) {
                if (!empMap.has(empId)) {
                    empMap.set(empId, { name: empName, code: emp?.employeeCode || '', amount: 0, count: 0 });
                }
                const employee = empMap.get(empId)!;
                employee.amount += amount;
                employee.count++;
            }
        }

        return {
            byCategory: Array.from(categoryMap.entries()).map(([category, data]) => ({
                category,
                categoryLabel: category,
                amount: data.amount,
                percentage: total > 0 ? Math.round((data.amount / total) * 100) : 0,
                count: data.count,
            })).sort((a, b) => b.amount - a.amount),

            byPolicy: Array.from(policyMap.entries()).map(([id, data]) => ({
                policyId: id,
                policyName: data.name,
                amount: data.amount,
                employeesAffected: data.employees.size,
            })).sort((a, b) => b.amount - a.amount),

            byDepartment: Array.from(deptMap.entries()).map(([id, data]) => ({
                departmentId: id,
                departmentName: data.name,
                amount: data.amount,
                employeesAffected: data.employees.size,
            })).sort((a, b) => b.amount - a.amount),

            topEmployees: Array.from(empMap.entries())
                .map(([id, data]) => ({
                    employeeId: id,
                    employeeName: data.name,
                    employeeCode: data.code,
                    [type === 'DEDUCTION' ? 'totalDeductions' : 'totalBonuses']: data.amount,
                    [type === 'DEDUCTION' ? 'deductionCount' : 'bonusCount']: data.count,
                }))
                .sort((a: any, b: any) => (b.totalDeductions || b.totalBonuses) - (a.totalDeductions || a.totalBonuses))
                .slice(0, 10) as any,
        };
    }

    /**
     * 🛠️ Helper: الحصول على ملخص فترة
     */
    private async getPeriodSummary(companyId: string, month: number, year: number) {
        const { startDate, endDate } = this.getPeriodDates(month, year);

        const executions = await this.prisma.smartPolicyExecution.findMany({
            where: {
                policy: { companyId },
                executedAt: { gte: startDate, lte: endDate },
            },
        });

        let deductions = 0;
        let bonuses = 0;
        const employees = new Set<string>();

        for (const exec of executions) {
            const amount = Number(exec.actionValue || 0);
            if (exec.actionType === 'DEDUCT_FROM_PAYROLL' || exec.actionType === 'DEDUCTION') {
                deductions += amount;
            } else {
                bonuses += amount;
            }
            if (exec.employeeId) employees.add(exec.employeeId);
        }

        return { deductions, bonuses, employees: employees.size };
    }

    /**
     * 🛠️ Helper: أنماط الحضور
     */
    private async getAttendancePatterns(companyId: string, month: number, year: number) {
        const { startDate, endDate } = this.getPeriodDates(month, year);

        const attendance = await this.prisma.attendance.findMany({
            where: {
                user: { companyId },
                date: { gte: startDate, lte: endDate },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        departmentId: true,
                        department: { select: { name: true } },
                    },
                },
            },
        });

        const lateCount = attendance.filter((a: any) => a.status === 'LATE').length;
        const absentCount = attendance.filter((a: any) => a.status === 'ABSENT').length;

        // حساب المتكررين في التأخير (الموظفين الذين تأخروا أكثر من 3 مرات)
        const lateByEmployee = new Map<string, number>();
        for (const record of attendance) {
            if ((record as any).status === 'LATE') {
                const empId = record.userId;
                lateByEmployee.set(empId, (lateByEmployee.get(empId) || 0) + 1);
            }
        }
        const repeatOffenders = Array.from(lateByEmployee.values()).filter(count => count >= 3).length;

        // حساب معدل التحسن (مقارنة بالشهر السابق)
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;
        const { startDate: prevStart, endDate: prevEnd } = this.getPeriodDates(prevMonth, prevYear);
        const prevAttendance = await this.prisma.attendance.findMany({
            where: {
                user: { companyId },
                date: { gte: prevStart, lte: prevEnd },
            },
        });
        const prevLateCount = prevAttendance.filter((a: any) => a.status === 'LATE').length;
        const improvementRate = prevLateCount > 0
            ? Math.round(((prevLateCount - lateCount) / prevLateCount) * 100)
            : 0;

        // حساب الغياب غير المبرر (غياب بدون إجازة معتمدة)
        const absentUserIds = attendance
            .filter((a: any) => a.status === 'ABSENT')
            .map(a => a.userId);

        let unexcusedAbsences = 0;
        if (absentUserIds.length > 0) {
            const approvedLeaves = await this.prisma.leaveRequest.findMany({
                where: {
                    userId: { in: absentUserIds },
                    status: { in: ['APPROVED', 'MGR_APPROVED'] },
                    startDate: { lte: endDate },
                    endDate: { gte: startDate },
                },
                select: { userId: true },
            });
            const usersWithApprovedLeave = new Set(approvedLeaves.map(l => l.userId));
            unexcusedAbsences = absentUserIds.filter(id => !usersWithApprovedLeave.has(id)).length;
        }

        // حساب القسم الأعلى غياباً
        const absenceByDept = new Map<string, { count: number; name: string }>();
        for (const record of attendance) {
            if ((record as any).status === 'ABSENT') {
                const deptId = (record as any).user?.departmentId || 'NO_DEPT';
                const deptName = (record as any).user?.department?.name || 'بدون قسم';
                const existing = absenceByDept.get(deptId) || { count: 0, name: deptName };
                existing.count++;
                absenceByDept.set(deptId, existing);
            }
        }
        let departmentWithHighestAbsence = '';
        let maxAbsence = 0;
        for (const [_, data] of absenceByDept) {
            if (data.count > maxAbsence) {
                maxAbsence = data.count;
                departmentWithHighestAbsence = data.name;
            }
        }

        return {
            latePatterns: {
                totalLateIncidents: lateCount,
                repeatOffenders,
                improvementRate,
            },
            absencePatterns: {
                totalAbsences: absentCount,
                unexcusedAbsences,
                departmentWithHighestAbsence,
            },
            performancePatterns: {
                aboveTargetEmployees: 0,
                belowTargetEmployees: 0,
                avgTargetAchievement: 0,
            },
        };
    }

    /**
     * 🛠️ Helper: توليد التوصيات
     */
    private generateRecommendations(effectiveness: any[], _patterns?: any): PolicyAnalyticalReport['recommendations'] {
        const recommendations: PolicyAnalyticalReport['recommendations'] = [];

        // سياسات بنسبة نجاح منخفضة
        const lowSuccessPolicies = effectiveness.filter(p => p.successRate < 70);
        if (lowSuccessPolicies.length > 0) {
            recommendations.push({
                priority: 'HIGH',
                title: 'مراجعة السياسات ذات النجاح المنخفض',
                description: `${lowSuccessPolicies.length} سياسة بنسبة نجاح أقل من 70%`,
                potentialImpact: 'تحسين دقة تطبيق السياسات',
                actionRequired: 'راجع شروط هذه السياسات وتأكد من صحتها',
            });
        }

        // سياسات بدون تنفيذات
        const unusedPolicies = effectiveness.filter(p => p.executionCount === 0);
        if (unusedPolicies.length > 0) {
            recommendations.push({
                priority: 'MEDIUM',
                title: 'سياسات غير مستخدمة',
                description: `${unusedPolicies.length} سياسة لم تُنفذ هذا الشهر`,
                potentialImpact: 'تبسيط إدارة السياسات',
                actionRequired: 'راجع هذه السياسات وقرر إبقاءها أو إلغاءها',
            });
        }

        return recommendations;
    }

    /**
     * 🛠️ Helper: حساب الاتجاه
     * يقارن تنفيذات السياسة في الفترة الحالية مع الفترة السابقة
     */
    private async calculateTrendAsync(policyId: string, currentPeriodStart: Date): Promise<'UP' | 'DOWN' | 'STABLE'> {
        try {
            // حساب الفترة السابقة (الشهر السابق)
            const prevMonth = currentPeriodStart.getMonth() === 0 ? 11 : currentPeriodStart.getMonth() - 1;
            const prevYear = currentPeriodStart.getMonth() === 0
                ? currentPeriodStart.getFullYear() - 1
                : currentPeriodStart.getFullYear();
            const prevPeriodStart = new Date(prevYear, prevMonth, 1);
            const prevPeriodEnd = new Date(prevYear, prevMonth + 1, 0, 23, 59, 59);

            // حساب نهاية الفترة الحالية
            const currentPeriodEnd = new Date(
                currentPeriodStart.getFullYear(),
                currentPeriodStart.getMonth() + 1,
                0,
                23,
                59,
                59
            );

            // جلب عدد التنفيذات للفترتين
            const [currentCount, prevCount] = await Promise.all([
                this.prisma.smartPolicyExecution.count({
                    where: {
                        policyId,
                        executedAt: { gte: currentPeriodStart, lte: currentPeriodEnd },
                    },
                }),
                this.prisma.smartPolicyExecution.count({
                    where: {
                        policyId,
                        executedAt: { gte: prevPeriodStart, lte: prevPeriodEnd },
                    },
                }),
            ]);

            // تحديد الاتجاه
            if (prevCount === 0) {
                return currentCount > 0 ? 'UP' : 'STABLE';
            }

            const changeRate = ((currentCount - prevCount) / prevCount) * 100;

            if (changeRate > 10) return 'UP';
            if (changeRate < -10) return 'DOWN';
            return 'STABLE';
        } catch (error) {
            this.logger.warn(`Error calculating trend for policy ${policyId}: ${error.message}`);
            return 'STABLE';
        }
    }

    /**
     * 🛠️ Helper: حساب الاتجاه (sync version للتوافق مع الكود الحالي)
     * ملاحظة: هذه النسخة تعتمد على cache مؤقت للأداء
     */
    private trendCache = new Map<string, { trend: 'UP' | 'DOWN' | 'STABLE'; cachedAt: number }>();
    private readonly TREND_CACHE_TTL = 60000; // 1 دقيقة

    private calculateTrend(policyId: string, _startDate: Date): 'UP' | 'DOWN' | 'STABLE' {
        // التحقق من الـ cache
        const cached = this.trendCache.get(policyId);
        if (cached && (Date.now() - cached.cachedAt) < this.TREND_CACHE_TTL) {
            return cached.trend;
        }

        // إرجاع STABLE كافتراضي - سيتم تحديثه async
        this.calculateTrendAsync(policyId, _startDate).then(trend => {
            this.trendCache.set(policyId, { trend, cachedAt: Date.now() });
        }).catch(() => {
            // تجاهل الأخطاء - نستخدم STABLE كافتراضي
        });

        return cached?.trend || 'STABLE';
    }

    /**
     * 🛠️ Helper: توليد توصية للسياسة
     */
    private generatePolicyRecommendation(total: number, success: number, amount: number): string {
        const rate = total > 0 ? (success / total) * 100 : 0;
        if (rate < 50) return 'يُنصح بمراجعة شروط السياسة';
        if (rate < 80) return 'يُنصح بتحسين دقة الشروط';
        if (amount > 10000) return 'سياسة ذات تأثير مالي كبير';
        return 'السياسة تعمل بشكل جيد';
    }

    /**
     * 🛠️ Helper: تسمية الفئة
     */
    private getCategoryLabel(triggerEvent: string): string {
        const labels: Record<string, string> = {
            'PAYROLL': 'رواتب',
            'ATTENDANCE': 'حضور',
            'LATE': 'تأخير',
            'ABSENT': 'غياب',
            'LEAVE': 'إجازات',
            'PERFORMANCE': 'أداء',
        };
        return labels[triggerEvent] || 'أخرى';
    }

    /**
     * 🛠️ Helper: حساب نسبة التغير
     */
    private calculatePercentChange(current: number, previous: number): number {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
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
