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

        if (/كم.*موظف|عدد.*موظف/.test(q)) return 'employee_count';
        if (/قائمة.*موظف|اعرض.*موظف|كل.*موظف/.test(q)) return 'employee_list';
        if (/حضور.*اليوم|اليوم.*حضور/.test(q)) return 'attendance_today';
        if (/متأخر|تاخر/.test(q)) return 'late_employees';
        if (/غائب|غياب/.test(q)) return 'absent_employees';
        if (/طلب.*اجاز|إجازات/.test(q)) return 'leave_requests';
        if (/راتب|معاش/.test(q)) return 'salary_info';
        if (/قسم|إدارة/.test(q)) return 'department_stats';
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
}
