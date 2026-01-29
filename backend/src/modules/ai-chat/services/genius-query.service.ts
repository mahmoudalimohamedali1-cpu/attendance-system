import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * 🔍 GENIUS Query Service
 * 
 * Converts natural language questions into database queries
 * VPS-compatible version
 */

interface QueryResult {
    success: boolean;
    data: any;
    query: string;
    explanation: string;
    visualization?: 'table' | 'chart' | 'number' | 'list';
    chartType?: 'bar' | 'pie' | 'line';
}

@Injectable()
export class GeniusQueryService {
    private readonly logger = new Logger(GeniusQueryService.name);

    constructor(private readonly prisma: PrismaService) { }

    async processQuery(question: string, companyId: string): Promise<QueryResult> {
        this.logger.log(`Processing query: "${question}"`);
        const queryType = this.classifyQuery(question);
        this.logger.log(`Query type: ${queryType}`);

        try {
            switch (queryType) {
                case 'employee_count':
                    return this.handleEmployeeCount(companyId);
                case 'employee_list':
                    return this.handleEmployeeList(companyId);
                case 'attendance_today':
                    return this.handleAttendanceToday(companyId);
                case 'late_employees':
                    return this.handleLateEmployees(companyId);
                case 'absent_employees':
                    return this.handleAbsentEmployees(companyId);
                case 'leave_requests':
                    return this.handleLeaveRequests(companyId);
                case 'salary_info':
                    return this.handleSalaryInfo(companyId);
                case 'department_stats':
                    return this.handleDepartmentStats(companyId);
                // === NEW QUERY TYPES ===
                case 'performance_reviews':
                    return this.handlePerformanceReviews(companyId);
                case 'goals_progress':
                    return this.handleGoalsProgress(companyId);
                case 'policy_violations':
                    return this.handlePolicyViolations(companyId);
                case 'payroll_runs':
                    return this.handlePayrollRuns(companyId);
                case 'custody_status':
                    return this.handleCustodyStatus(companyId);
                case 'pending_approvals':
                    return this.handlePendingApprovals(companyId);
                case 'overtime_report':
                    return this.handleOvertimeReport(companyId);
                case 'top_performers':
                    return this.handleTopPerformers(companyId);
                case 'branch_comparison':
                    return this.handleBranchComparison(companyId);
                case 'expiring_documents':
                    return this.handleExpiringDocuments(companyId);
                case 'birthday_today':
                    return this.handleBirthdayToday(companyId);
                case 'employee_search':
                    return this.handleEmployeeSearch(question, companyId);
                case 'task_status':
                    return this.handleTaskStatus(companyId);
                case 'gosi_summary':
                    return this.handleGosiSummary(companyId);
                case 'employee_salary':
                    return this.handleEmployeeSalary(question, companyId);
                case 'monthly_comparison':
                    return this.handleMonthlyComparison(companyId);
                default:
                    return {
                        success: false,
                        data: null,
                        query: question,
                        explanation: 'NOT_A_STRUCTURED_QUERY'
                    };
            }
        } catch (error: any) {
            this.logger.error(`Query error: ${error.message}`);
            return {
                success: false,
                data: null,
                query: question,
                explanation: `❌ فشل تنفيذ الاستعلام: ${error.message}`
            };
        }
    }

    private classifyQuery(question: string): string {
        const q = question.toLowerCase();

        // Employee queries
        if (/كم.*موظف|عدد.*موظف/.test(q)) return 'employee_count';
        if (/قائمة.*موظف|اعرض.*موظف|كل.*موظف/.test(q)) return 'employee_list';
        if (/ابحث.*عن|بحث.*موظف|معلومات.*عن/.test(q)) return 'employee_search';

        // Attendance queries
        if (/حضور.*اليوم|اليوم.*حضور/.test(q)) return 'attendance_today';
        if (/متأخر|تاخر|التأخير/.test(q)) return 'late_employees';
        if (/غائب|غياب|الغياب/.test(q)) return 'absent_employees';
        if (/اوفر.*تايم|ساعات.*إضافية|عمل.*إضافي/.test(q)) return 'overtime_report';

        // Leave queries
        if (/طلب.*اجاز|إجازات|الإجازات/.test(q)) return 'leave_requests';

        // Employee salary query (راتب + اسم) - MUST be before general salary_info
        if (/راتب\s+[أ-ي\w]+|معاش\s+[أ-ي\w]+/.test(q)) return 'employee_salary';

        // Salary & Payroll queries (general)
        if (/راتب|معاش|رواتب/.test(q)) return 'salary_info';
        if (/مسير.*رواتب|دورة.*رواتب|payroll/.test(q)) return 'payroll_runs';
        if (/تأمين|gosi|التأمينات/.test(q)) return 'gosi_summary';

        // Organization queries
        if (/قسم|إدارة|الأقسام/.test(q)) return 'department_stats';
        if (/فرع|فروع|مقارنة.*فروع/.test(q)) return 'branch_comparison';

        // Performance queries
        if (/تقييم|أداء|performance/.test(q)) return 'performance_reviews';
        if (/هدف|أهداف|goals/.test(q)) return 'goals_progress';
        if (/أفضل.*أداء|top.*performer|متميز/.test(q)) return 'top_performers';

        // Policy queries
        if (/مخالف|سياس|policy/.test(q)) return 'policy_violations';

        // Custody queries
        if (/عهد|custody|أصول/.test(q)) return 'custody_status';

        // Task queries
        if (/مهم|task|مهام/.test(q)) return 'task_status';

        // Approval queries
        if (/موافق.*معلق|انتظار.*موافق|pending/.test(q)) return 'pending_approvals';

        // Document queries
        if (/مستند.*منته|وثيق.*تنته|انتهاء/.test(q)) return 'expiring_documents';

        // Special queries
        if (/عيد.*ميلاد|birthday/.test(q)) return 'birthday_today';

        // Monthly comparison queries
        if (/مقارنه?.*شهري|شهريه?.*مقارن|مقارنة.*الشهر|الشهر.*الماضي/.test(q)) return 'monthly_comparison';

        return 'general';
    }

    private async handleEmployeeCount(companyId: string): Promise<QueryResult> {
        const count = await this.prisma.user.count({
            where: { companyId, status: 'ACTIVE' }
        });

        return {
            success: true,
            data: { count },
            query: 'Employee count',
            explanation: `📊 **عدد الموظفين النشطين**: ${count} موظف`,
            visualization: 'number'
        };
    }

    private async handleEmployeeList(companyId: string): Promise<QueryResult> {
        const employees = await this.prisma.user.findMany({
            where: { companyId, status: 'ACTIVE' },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                jobTitle: true,
                department: { select: { name: true } }
            },
            take: 20,
            orderBy: { firstName: 'asc' }
        });

        const data = employees.map((e, i) => ({
            '#': i + 1,
            الاسم: `${e.firstName} ${e.lastName}`,
            المسمى: e.jobTitle || '-',
            القسم: e.department?.name || '-'
        }));

        return {
            success: true,
            data,
            query: 'Employee list',
            explanation: `📋 **قائمة الموظفين** (${employees.length} موظف)`,
            visualization: 'table'
        };
    }

    private async handleAttendanceToday(companyId: string): Promise<QueryResult> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await this.prisma.attendance.findMany({
            where: {
                user: { companyId },
                date: { gte: today }
            }
        });

        const present = attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
        const late = attendance.filter(a => a.status === 'LATE').length;
        const absent = attendance.filter(a => a.status === 'ABSENT').length;
        const onLeave = attendance.filter(a => a.status === 'ON_LEAVE').length;
        const total = attendance.length || 1;

        const chartData = [
            { name: 'حاضر ✅', value: present },
            { name: 'متأخر ⏰', value: late },
            { name: 'غائب 🚫', value: absent },
            { name: 'إجازة 🏖️', value: onLeave }
        ].filter(d => d.value > 0);

        return {
            success: true,
            data: { chartData },
            query: 'Today attendance',
            explanation: `
⏰ **حضور اليوم**

✅ حاضرين: ${present}
⏰ متأخرين: ${late}
🚫 غائبين: ${absent}
🏖️ في إجازة: ${onLeave}

📊 نسبة الحضور: ${Math.round((present / total) * 100)}%
            `.trim(),
            visualization: 'chart',
            chartType: 'pie'
        };
    }

    private async handleLateEmployees(companyId: string): Promise<QueryResult> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const lateAtt = await this.prisma.attendance.findMany({
            where: {
                user: { companyId },
                date: { gte: today },
                status: 'LATE'
            },
            include: {
                user: { select: { firstName: true, lastName: true } }
            },
            orderBy: { lateMinutes: 'desc' }
        });

        const data = lateAtt.map((a, i) => ({
            '#': i + 1,
            الموظف: `${a.user.firstName} ${a.user.lastName}`,
            دقائق_التأخير: a.lateMinutes || 0
        }));

        return {
            success: true,
            data,
            query: 'Late employees',
            explanation: `⏰ **الموظفين المتأخرين اليوم** (${lateAtt.length} موظف)`,
            visualization: 'table'
        };
    }

    private async handleAbsentEmployees(companyId: string): Promise<QueryResult> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const absentAtt = await this.prisma.attendance.findMany({
            where: {
                user: { companyId },
                date: { gte: today },
                status: 'ABSENT'
            },
            include: {
                user: { select: { firstName: true, lastName: true, phone: true } }
            }
        });

        const data = absentAtt.map((a, i) => ({
            '#': i + 1,
            الموظف: `${a.user.firstName} ${a.user.lastName}`,
            الهاتف: a.user.phone || '-'
        }));

        return {
            success: true,
            data,
            query: 'Absent employees',
            explanation: `🚫 **الغائبين اليوم** (${absentAtt.length} موظف)`,
            visualization: 'table'
        };
    }

    private async handleLeaveRequests(companyId: string): Promise<QueryResult> {
        const leaves = await this.prisma.leaveRequest.findMany({
            where: { user: { companyId }, status: 'PENDING' },
            include: {
                user: { select: { firstName: true, lastName: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        const data = leaves.map((l: any, i) => ({
            '#': i + 1,
            الموظف: `${l.user.firstName} ${l.user.lastName}`,
            من: l.startDate.toLocaleDateString('ar-SA'),
            إلى: l.endDate.toLocaleDateString('ar-SA'),
            الحالة: '⏳ معلق'
        }));

        return {
            success: true,
            data,
            query: 'Leave requests',
            explanation: `🏖️ **طلبات الإجازة المعلقة** (${leaves.length} طلب)`,
            visualization: 'table'
        };
    }

    private async handleSalaryInfo(companyId: string): Promise<QueryResult> {
        const employees = await this.prisma.user.findMany({
            where: { companyId, status: 'ACTIVE', salary: { not: null } },
            select: { salary: true }
        });

        const salaries = employees.map(e => Number(e.salary) || 0);
        const total = salaries.reduce((a, b) => a + b, 0);
        const avg = salaries.length > 0 ? total / salaries.length : 0;
        const min = salaries.length > 0 ? Math.min(...salaries) : 0;
        const max = salaries.length > 0 ? Math.max(...salaries) : 0;

        return {
            success: true,
            data: {
                إجمالي_الرواتب: `${total.toLocaleString('ar-SA')} ريال`,
                متوسط_الراتب: `${Math.round(avg).toLocaleString('ar-SA')} ريال`,
                أقل_راتب: `${min.toLocaleString('ar-SA')} ريال`,
                أعلى_راتب: `${max.toLocaleString('ar-SA')} ريال`,
                عدد_الموظفين: employees.length
            },
            query: 'Salary info',
            explanation: `💰 **ملخص الرواتب**`,
            visualization: 'list'
        };
    }

    private async handleDepartmentStats(companyId: string): Promise<QueryResult> {
        const departments = await this.prisma.department.findMany({
            where: { companyId },
            include: { _count: { select: { users: true } } }
        });

        const data = departments.map(d => ({
            القسم: d.name,
            الموظفين: d._count.users
        })).sort((a, b) => b.الموظفين - a.الموظفين);

        const chartData = departments.map(d => ({
            name: d.name,
            value: d._count.users
        }));

        return {
            success: true,
            data: { table: data, chartData },
            query: 'Department stats',
            explanation: `🏢 **إحصائيات الأقسام** (${departments.length} قسم)`,
            visualization: 'chart',
            chartType: 'pie'
        };
    }

    private async handleGeneral(companyId: string): Promise<QueryResult> {
        const [empCount, todayAtt, pendingLeaves] = await Promise.all([
            this.prisma.user.count({ where: { companyId, status: 'ACTIVE' } }),
            this.prisma.attendance.count({
                where: { user: { companyId }, date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } }
            }),
            this.prisma.leaveRequest.count({ where: { user: { companyId }, status: 'PENDING' } })
        ]);

        return {
            success: true,
            data: { empCount, todayAtt, pendingLeaves },
            query: 'General',
            explanation: `
📊 **معلومات عامة**
- الموظفين: ${empCount}
- سجلات حضور اليوم: ${todayAtt}
- طلبات إجازة معلقة: ${pendingLeaves}
            `.trim(),
            visualization: 'list'
        };
    }

    // ============ NEW QUERY HANDLERS ============

    private async handlePerformanceReviews(companyId: string): Promise<QueryResult> {
        try {
            const reviews = await this.prisma.performanceReview.findMany({
                where: { employee: { companyId } },
                include: { employee: { select: { firstName: true, lastName: true } } },
                orderBy: { createdAt: 'desc' },
                take: 20,
            });

            const statusCounts = { DRAFT: 0, PENDING: 0, COMPLETED: 0 };
            reviews.forEach((r: any) => { if (statusCounts[r.status as keyof typeof statusCounts] !== undefined) statusCounts[r.status as keyof typeof statusCounts]++; });

            return {
                success: true,
                data: reviews.map((r: any, i) => ({ '#': i + 1, الموظف: `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`, الدرجة: r.overallRating || r.rating || '-', الحالة: r.status })),
                query: 'Performance reviews',
                explanation: `📊 **تقييمات الأداء**\n\n✏️ مسودة: ${statusCounts.DRAFT}\n⏳ قيد التقييم: ${statusCounts.PENDING}\n✅ مكتمل: ${statusCounts.COMPLETED}`,
                visualization: 'table'
            };
        } catch {
            return { success: false, data: null, query: 'performance_reviews', explanation: '❌ تقييمات الأداء غير متاحة حالياً' };
        }
    }

    private async handleGoalsProgress(companyId: string): Promise<QueryResult> {
        try {
            const goals = await this.prisma.goal.findMany({
                where: { companyId },
                include: { owner: { select: { firstName: true, lastName: true } } },
                orderBy: { progress: 'desc' },
                take: 20,
            });

            const avgProgress = goals.length > 0 ? Math.round(goals.reduce((a, g) => a + g.progress, 0) / goals.length) : 0;

            return {
                success: true,
                data: goals.map((g: any, i) => ({ '#': i + 1, الهدف: g.title?.substring(0, 30), الموظف: `${g.owner?.firstName || ''} ${g.owner?.lastName || ''}`, التقدم: `${g.progress}%`, الحالة: g.status })),
                query: 'Goals progress',
                explanation: `🎯 **تقدم الأهداف**\n\n📈 متوسط التقدم: ${avgProgress}%\n📋 عدد الأهداف: ${goals.length}`,
                visualization: 'table'
            };
        } catch {
            return { success: false, data: null, query: 'goals_progress', explanation: '❌ بيانات الأهداف غير متاحة حالياً' };
        }
    }

    private async handlePolicyViolations(companyId: string): Promise<QueryResult> {
        try {
            // Get late attendance as policy violations indicator
            const today = new Date();
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

            const lateRecords = await this.prisma.attendance.findMany({
                where: { user: { companyId }, date: { gte: monthStart }, status: 'LATE' },
                include: { user: { select: { firstName: true, lastName: true } } },
                orderBy: { lateMinutes: 'desc' },
                take: 20,
            });

            return {
                success: true,
                data: lateRecords.map((r: any, i) => ({ '#': i + 1, الموظف: `${r.user?.firstName || ''} ${r.user?.lastName || ''}`, السبب: `تأخير ${r.lateMinutes || 0} دقيقة`, التاريخ: new Date(r.date).toLocaleDateString('ar-SA') })),
                query: 'Policy violations',
                explanation: `⚠️ **مخالفات التأخير هذا الشهر** (${lateRecords.length} مخالفة)`,
                visualization: 'table'
            };
        } catch {
            return { success: false, data: null, query: 'policy_violations', explanation: '❌ بيانات المخالفات غير متاحة حالياً' };
        }
    }

    private async handlePayrollRuns(companyId: string): Promise<QueryResult> {
        try {
            const runs = await this.prisma.payrollRun.findMany({
                where: { companyId },
                include: {
                    period: { select: { startDate: true, endDate: true, month: true, year: true } },
                    _count: { select: { payslips: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: 10,
            });

            return {
                success: true,
                data: runs.map((r: any, i) => ({
                    '#': i + 1,
                    الفترة: r.period ? `${r.period.month}/${r.period.year}` : '-',
                    الحالة: r.status,
                    الموظفين: r._count?.payslips || 0,
                    التاريخ: new Date(r.runDate).toLocaleDateString('ar-SA')
                })),
                query: 'Payroll runs',
                explanation: `💰 **مسيرات الرواتب** (${runs.length} مسير)`,
                visualization: 'table'
            };
        } catch {
            return { success: false, data: null, query: 'payroll_runs', explanation: '❌ بيانات مسيرات الرواتب غير متاحة' };
        }
    }

    private async handleCustodyStatus(companyId: string): Promise<QueryResult> {
        try {
            const custodies = await this.prisma.custodyItem.findMany({
                where: { companyId },
                take: 20,
            });

            const assigned = custodies.filter((c: any) => c.currentAssigneeId).length;
            const available = custodies.filter((c: any) => !c.currentAssigneeId).length;

            return {
                success: true,
                data: custodies.map((c: any, i) => ({ '#': i + 1, العهدة: c.name, النوع: c.status || '-', الكود: c.code || '-' })),
                query: 'Custody status',
                explanation: `📦 **حالة العهد**\n\n✅ مُسلَّمة: ${assigned}\n📋 متاحة: ${available}\n📊 الإجمالي: ${custodies.length}`,
                visualization: 'table'
            };
        } catch {
            return { success: false, data: null, query: 'custody_status', explanation: '❌ بيانات العهد غير متاحة حالياً' };
        }
    }

    private async handlePendingApprovals(companyId: string): Promise<QueryResult> {
        try {
            const leaves = await this.prisma.leaveRequest.count({
                where: { user: { companyId }, status: 'PENDING' }
            });

            return {
                success: true,
                data: { إجازات_معلقة: leaves },
                query: 'Pending approvals',
                explanation: `⏳ **الموافقات المعلقة**\n\n🏖️ إجازات: ${leaves}`,
                visualization: 'list'
            };
        } catch {
            return { success: false, data: null, query: 'pending_approvals', explanation: '❌ بيانات الموافقات غير متاحة' };
        }
    }

    private async handleOvertimeReport(companyId: string): Promise<QueryResult> {
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);

        const overtimes = await this.prisma.attendance.findMany({
            where: { user: { companyId }, date: { gte: thisMonth }, overtimeMinutes: { gt: 0 } },
            include: { user: { select: { firstName: true, lastName: true } } },
            orderBy: { overtimeMinutes: 'desc' },
            take: 15,
        });

        const totalHours = Math.round(overtimes.reduce((a, o) => a + (o.overtimeMinutes || 0), 0) / 60);

        return {
            success: true,
            data: overtimes.map((o: any, i) => ({ '#': i + 1, الموظف: `${o.user.firstName} ${o.user.lastName}`, الساعات: `${Math.round((o.overtimeMinutes || 0) / 60)} ساعة` })),
            query: 'Overtime report',
            explanation: `⏰ **تقرير العمل الإضافي** (هذا الشهر)\n\n📊 إجمالي الساعات: ${totalHours} ساعة`,
            visualization: 'table'
        };
    }

    private async handleTopPerformers(companyId: string): Promise<QueryResult> {
        try {
            const reviews = await this.prisma.performanceReview.findMany({
                where: { employee: { companyId }, status: 'COMPLETED', finalRating: { not: null } },
                include: { employee: { select: { firstName: true, lastName: true, jobTitle: true } } },
                orderBy: { finalRating: 'desc' },
                take: 10,
            });

            return {
                success: true,
                data: reviews.map((r: any, i) => ({ '#': i + 1, الموظف: `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`, المسمى: r.employee?.jobTitle || '-', الدرجة: `${r.finalRating || r.managerRating || '-'}` })),
                query: 'Top performers',
                explanation: `🏆 **أفضل الموظفين أداءً** (${reviews.length} موظف)`,
                visualization: 'table'
            };
        } catch {
            return { success: false, data: null, query: 'top_performers', explanation: '❌ بيانات الأداء غير متاحة حالياً' };
        }
    }

    private async handleBranchComparison(companyId: string): Promise<QueryResult> {
        try {
            const branches = await this.prisma.branch.findMany({
                where: { companyId },
                include: { _count: { select: { users: true } } },
            });

            const chartData = branches.map(b => ({ name: b.name, value: b._count.users }));

            return {
                success: true,
                data: { chartData, table: branches.map(b => ({ الفرع: b.name, الموظفين: b._count.users })) },
                query: 'Branch comparison',
                explanation: `🏢 **مقارنة الفروع** (${branches.length} فرع)`,
                visualization: 'chart',
                chartType: 'bar'
            };
        } catch {
            return { success: false, data: null, query: 'branch_comparison', explanation: '❌ بيانات الفروع غير متاحة' };
        }
    }

    private async handleExpiringDocuments(companyId: string): Promise<QueryResult> {
        try {
            const thirtyDaysLater = new Date();
            thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
            const today = new Date();

            // Check passport and iqama expiry from User model
            const employees = await this.prisma.user.findMany({
                where: {
                    companyId,
                    status: 'ACTIVE',
                    OR: [
                        { passportExpiryDate: { lte: thirtyDaysLater, gte: today } },
                        { iqamaExpiryDate: { lte: thirtyDaysLater, gte: today } },
                    ]
                },
                select: { firstName: true, lastName: true, passportExpiryDate: true, iqamaExpiryDate: true },
                take: 20,
            });

            const data = employees.map((e: any, i) => {
                const docs: string[] = [];
                if (e.passportExpiryDate && new Date(e.passportExpiryDate) <= thirtyDaysLater) docs.push('جواز السفر');
                if (e.iqamaExpiryDate && new Date(e.iqamaExpiryDate) <= thirtyDaysLater) docs.push('الإقامة');
                return { '#': i + 1, الموظف: `${e.firstName} ${e.lastName}`, المستند: docs.join(', ') || '-' };
            });

            return {
                success: true,
                data,
                query: 'Expiring documents',
                explanation: `📄 **مستندات تنتهي خلال 30 يوم** (${employees.length} موظف)`,
                visualization: 'table'
            };
        } catch {
            return { success: false, data: null, query: 'expiring_documents', explanation: '❌ بيانات المستندات غير متاحة حالياً' };
        }
    }

    private async handleBirthdayToday(companyId: string): Promise<QueryResult> {
        const today = new Date();
        const employees = await this.prisma.user.findMany({
            where: { companyId, status: 'ACTIVE' },
            select: { firstName: true, lastName: true, dateOfBirth: true, department: { select: { name: true } } },
        });

        const birthdayToday = employees.filter(e => {
            if (!e.dateOfBirth) return false;
            const dob = new Date(e.dateOfBirth);
            return dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth();
        });

        return {
            success: true,
            data: birthdayToday.map((e, i) => ({ '#': i + 1, الاسم: `${e.firstName} ${e.lastName}`, القسم: e.department?.name || '-' })),
            query: 'Birthday today',
            explanation: birthdayToday.length > 0 ? `🎂 **أعياد الميلاد اليوم** (${birthdayToday.length} موظف)\n\nلا تنسَ تهنئتهم! 🎉` : `🎂 **لا يوجد أعياد ميلاد اليوم**`,
            visualization: 'table'
        };
    }

    private async handleEmployeeSearch(question: string, companyId: string): Promise<QueryResult> {
        const nameMatch = question.match(/عن\s+([أ-ي\w]+)|بحث\s+([أ-ي\w]+)/);
        const searchTerm = nameMatch?.[1] || nameMatch?.[2] || '';

        if (!searchTerm) {
            return { success: false, data: null, query: question, explanation: '❌ يرجى تحديد اسم الموظف للبحث' };
        }

        const employees = await this.prisma.user.findMany({
            where: { companyId, OR: [{ firstName: { contains: searchTerm } }, { lastName: { contains: searchTerm } }] },
            select: { firstName: true, lastName: true, email: true, phone: true, jobTitle: true, department: { select: { name: true } } },
            take: 10,
        });

        return {
            success: true,
            data: employees.map((e, i) => ({ '#': i + 1, الاسم: `${e.firstName} ${e.lastName}`, المسمى: e.jobTitle || '-', القسم: e.department?.name || '-', الهاتف: e.phone || '-' })),
            query: 'Employee search',
            explanation: `🔍 **نتائج البحث عن "${searchTerm}"** (${employees.length} نتيجة)`,
            visualization: 'table'
        };
    }

    private async handleTaskStatus(companyId: string): Promise<QueryResult> {
        try {
            const tasks = await this.prisma.task.findMany({
                where: { companyId },
                orderBy: { createdAt: 'desc' },
                take: 20,
            });

            const statusCounts = { TODO: 0, IN_PROGRESS: 0, COMPLETED: 0 };
            tasks.forEach(t => { if (statusCounts[t.status as keyof typeof statusCounts] !== undefined) statusCounts[t.status as keyof typeof statusCounts]++; });

            const chartData = [
                { name: 'قيد الانتظار', value: statusCounts.TODO },
                { name: 'جاري التنفيذ', value: statusCounts.IN_PROGRESS },
                { name: 'مكتمل', value: statusCounts.COMPLETED },
            ];

            return {
                success: true,
                data: { chartData, table: tasks.map((t, i) => ({ '#': i + 1, المهمة: t.title.substring(0, 30), الحالة: t.status, الأولوية: t.priority })) },
                query: 'Task status',
                explanation: `📋 **حالة المهام**\n\n⏳ انتظار: ${statusCounts.TODO}\n🔄 جاري: ${statusCounts.IN_PROGRESS}\n✅ مكتمل: ${statusCounts.COMPLETED}`,
                visualization: 'chart',
                chartType: 'pie'
            };
        } catch {
            return { success: false, data: null, query: 'task_status', explanation: '❌ بيانات المهام غير متاحة حالياً' };
        }
    }

    private async handleGosiSummary(companyId: string): Promise<QueryResult> {
        const employees = await this.prisma.user.findMany({
            where: { companyId, status: 'ACTIVE', salary: { not: null } },
            select: { salary: true },
        });

        const totalSalary = employees.reduce((a, e) => a + Number(e.salary || 0), 0);
        const employeeShare = totalSalary * 0.1; // 10% employee
        const companyShare = totalSalary * 0.12; // 12% company
        const totalGosi = employeeShare + companyShare;

        return {
            success: true,
            data: {
                إجمالي_الرواتب: `${totalSalary.toLocaleString('ar-SA')} ر.س`,
                حصة_الموظفين: `${Math.round(employeeShare).toLocaleString('ar-SA')} ر.س (10%)`,
                حصة_الشركة: `${Math.round(companyShare).toLocaleString('ar-SA')} ر.س (12%)`,
                إجمالي_التأمينات: `${Math.round(totalGosi).toLocaleString('ar-SA')} ر.س`,
            },
            query: 'GOSI summary',
            explanation: `🏛️ **ملخص التأمينات الاجتماعية**`,
            visualization: 'list'
        };
    }

    formatResultForDisplay(result: QueryResult): string {
        if (!result.success) return result.explanation;

        let output = result.explanation + '\n\n';

        if (result.visualization === 'table' && Array.isArray(result.data)) {
            if (result.data.length > 0) {
                const headers = Object.keys(result.data[0]);
                output += headers.join(' | ') + '\n';
                output += headers.map(() => '---').join(' | ') + '\n';
                result.data.forEach((row: any) => {
                    output += Object.values(row).join(' | ') + '\n';
                });
            }
        }

        return output.trim();
    }

    /**
     * 💰 Handle employee salary query - REAL DATA FROM DATABASE
     */
    private async handleEmployeeSalary(question: string, companyId: string): Promise<QueryResult> {
        // Extract employee name from question - IMPROVED Arabic character range
        const nameMatch = question.match(/راتب\s+([\u0600-\u06FF\w]+(?:\s+[\u0600-\u06FF\w]+)?)|معاش\s+([\u0600-\u06FF\w]+(?:\s+[\u0600-\u06FF\w]+)?)/);
        const searchTerm = nameMatch?.[1] || nameMatch?.[2] || '';

        if (!searchTerm || searchTerm.length < 2) {
            return {
                success: false,
                data: null,
                query: question,
                explanation: '❌ يرجى تحديد اسم الموظف. مثال: "راتب أحمد" أو "راتب محمد طارق"'
            };
        }

        this.logger.log(`[SALARY QUERY] Searching for employee: "${searchTerm}"`);

        // Search for employee with salary data
        // NOTE: salaryAssignments may not exist if migration not applied
        let employees: any[] = [];

        try {
            employees = await this.prisma.user.findMany({
                where: {
                    companyId,
                    OR: [
                        { firstName: { contains: searchTerm.split(' ')[0] } },
                        { lastName: { contains: searchTerm.split(' ')[1] || searchTerm.split(' ')[0] } },
                        { firstName: { contains: searchTerm } }
                    ]
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    salary: true,
                    jobTitle: true,
                    department: { select: { name: true } },
                    salaryAssignments: {
                        where: { isActive: true },
                        select: {
                            baseSalary: true,
                            effectiveDate: true,
                            structure: { select: { name: true } }
                        },
                        orderBy: { effectiveDate: 'desc' },
                        take: 1
                    }
                },
                take: 5
            });
        } catch (error) {
            // Fallback: salaryAssignments table might not exist
            this.logger.warn(`[SALARY QUERY] salaryAssignments not available, using users.salary only`);
            employees = await this.prisma.user.findMany({
                where: {
                    companyId,
                    OR: [
                        { firstName: { contains: searchTerm.split(' ')[0] } },
                        { lastName: { contains: searchTerm.split(' ')[1] || searchTerm.split(' ')[0] } },
                        { firstName: { contains: searchTerm } }
                    ]
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    salary: true,
                    jobTitle: true,
                    department: { select: { name: true } }
                },
                take: 5
            });
            // Add empty salaryAssignments array for compatibility
            employees = employees.map(e => ({ ...e, salaryAssignments: [] }));
        }

        if (employees.length === 0) {
            return {
                success: false,
                data: null,
                query: question,
                explanation: `❌ لم يتم العثور على موظف باسم "${searchTerm}"`
            };
        }

        // Format salary data - prioritize salaryAssignments if available
        const data = employees.map((e, i) => {
            const assignment = e.salaryAssignments?.[0];
            // Priority: salaryAssignments.baseSalary > user.salary
            const baseSalary = assignment?.baseSalary ? Number(assignment.baseSalary) : 0;
            const totalSalary = e.salary ? Number(e.salary) : baseSalary;
            const allowances = baseSalary > 0 ? totalSalary - baseSalary : 0;

            return {
                '#': i + 1,
                'الاسم': `${e.firstName} ${e.lastName}`,
                'المسمى': e.jobTitle || '-',
                'القسم': e.department?.name || '-',
                'الراتب الأساسي': baseSalary > 0 ? `${baseSalary.toLocaleString('ar-SA')} ريال` : (totalSalary > 0 ? `${totalSalary.toLocaleString('ar-SA')} ريال` : '-'),
                'البدلات': allowances > 0 ? `${allowances.toLocaleString('ar-SA')} ريال` : '-',
                'إجمالي الراتب': totalSalary > 0 ? `${totalSalary.toLocaleString('ar-SA')} ريال` : '-'
            };
        });

        // If single result, show detailed card
        if (employees.length === 1) {
            const e = employees[0];
            const assignment = e.salaryAssignments?.[0];
            const baseSalary = assignment?.baseSalary ? Number(assignment.baseSalary) : 0;
            const totalSalary = e.salary ? Number(e.salary) : baseSalary;
            const allowances = baseSalary > 0 ? totalSalary - baseSalary : 0;

            return {
                success: true,
                data: data[0],
                query: 'Employee salary',
                explanation: `💰 **راتب ${e.firstName} ${e.lastName}**

👤 **المسمى الوظيفي:** ${e.jobTitle || 'غير محدد'}
🏢 **القسم:** ${e.department?.name || 'غير محدد'}

💵 **الراتب الأساسي:** ${baseSalary > 0 ? baseSalary.toLocaleString('ar-SA') + ' ريال' : (totalSalary > 0 ? totalSalary.toLocaleString('ar-SA') + ' ريال' : 'غير محدد')}
🎁 **البدلات:** ${allowances > 0 ? allowances.toLocaleString('ar-SA') + ' ريال' : 'غير محددة'}
💎 **إجمالي الراتب:** ${totalSalary > 0 ? totalSalary.toLocaleString('ar-SA') + ' ريال' : 'غير محدد'}

${assignment?.structure?.name ? `📋 **هيكل الراتب:** ${assignment.structure.name}` : ''}`,
                visualization: 'list'  // Changed from 'number' - data is object, not simple value
            };
        }

        return {
            success: true,
            data,
            query: 'Employee salary search',
            explanation: `💰 **نتائج البحث عن راتب "${searchTerm}"** (${employees.length} نتيجة)`,
            visualization: 'table'
        };
    }

    /**
     * 📊 Handle monthly comparison - Current vs Previous month
     */
    private async handleMonthlyComparison(companyId: string): Promise<QueryResult> {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        // Get current month stats
        const [currentAttendance, previousAttendance, currentLeaves, previousLeaves] = await Promise.all([
            this.prisma.attendance.count({
                where: {
                    user: { companyId },
                    date: { gte: currentMonthStart }
                }
            }),
            this.prisma.attendance.count({
                where: {
                    user: { companyId },
                    date: { gte: previousMonthStart, lte: previousMonthEnd }
                }
            }),
            this.prisma.leaveRequest.count({
                where: {
                    user: { companyId },
                    status: 'APPROVED',
                    startDate: { gte: currentMonthStart }
                }
            }),
            this.prisma.leaveRequest.count({
                where: {
                    user: { companyId },
                    status: 'APPROVED',
                    startDate: { gte: previousMonthStart, lte: previousMonthEnd }
                }
            })
        ]);

        const attendanceChange = previousAttendance > 0
            ? Math.round(((currentAttendance - previousAttendance) / previousAttendance) * 100)
            : 0;
        const leaveChange = previousLeaves > 0
            ? Math.round(((currentLeaves - previousLeaves) / previousLeaves) * 100)
            : 0;

        const currentMonthName = now.toLocaleDateString('ar-SA', { month: 'long' });
        const previousMonthName = new Date(previousMonthStart).toLocaleDateString('ar-SA', { month: 'long' });

        return {
            success: true,
            data: [
                { 'المؤشر': 'سجلات الحضور', [currentMonthName]: currentAttendance, [previousMonthName]: previousAttendance, 'التغيير': `${attendanceChange > 0 ? '+' : ''}${attendanceChange}%` },
                { 'المؤشر': 'الإجازات المعتمدة', [currentMonthName]: currentLeaves, [previousMonthName]: previousLeaves, 'التغيير': `${leaveChange > 0 ? '+' : ''}${leaveChange}%` }
            ],
            query: 'Monthly comparison',
            explanation: `📊 **مقارنة شهرية: ${currentMonthName} vs ${previousMonthName}**

📈 **الحضور:**
  • ${currentMonthName}: ${currentAttendance} سجل
  • ${previousMonthName}: ${previousAttendance} سجل
  • التغيير: ${attendanceChange > 0 ? '📈 +' : attendanceChange < 0 ? '📉 ' : ''}${attendanceChange}%

🏖️ **الإجازات:**
  • ${currentMonthName}: ${currentLeaves} إجازة
  • ${previousMonthName}: ${previousLeaves} إجازة
  • التغيير: ${leaveChange > 0 ? '📈 +' : leaveChange < 0 ? '📉 ' : ''}${leaveChange}%`,
            visualization: 'table',
            chartType: 'bar'
        };
    }
}
