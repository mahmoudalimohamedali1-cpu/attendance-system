import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * 🧠 GENIUS Context Service
 * 
 * Feeds the AI with comprehensive, real-time system data
 * Compatible version for VPS deployment
 */

export interface SystemContext {
    company: CompanyContext;
    employees: EmployeesSummary;
    attendance: AttendanceSummary;
    leaves: LeavesSummary;
    payroll: PayrollSummary;
    goals: GoalsSummary;
    tasks: TasksSummary;
    recognition: RecognitionSummary;
    alerts: AlertsContext;
    recentActivity: RecentActivity[];
}

export interface CompanyContext {
    id: string;
    name: string;
    totalEmployees: number;
    totalBranches: number;
    totalDepartments: number;
}

interface EmployeesSummary {
    total: number;
    active: number;
    onLeave: number;
    newThisMonth: number;
    departmentBreakdown: { name: string; count: number }[];
    atRisk: { id: string; name: string; riskScore: number; reasons: string[] }[];
}

interface AttendanceSummary {
    today: {
        present: number;
        late: number;
        absent: number;
        onLeave: number;
        rate: number;
    };
    thisWeek: {
        avgAttendanceRate: number;
        totalLateMinutes: number;
    };
    thisMonth: {
        avgAttendanceRate: number;
        chronicAbsentees: { name: string; days: number }[];
    };
}

interface LeavesSummary {
    pending: number;
    approvedThisMonth: number;
    upcomingLeaves: { name: string; type: string; startDate: Date; days: number }[];
}

interface PayrollSummary {
    totalPayroll: number;
    avgSalary: number;
    salaryRanges: { range: string; count: number }[];
}

interface AlertsContext {
    critical: Alert[];
    warnings: Alert[];
    info: Alert[];
}

interface Alert {
    type: string;
    message: string;
    count?: number;
    action?: string;
}

interface RecentActivity {
    type: string;
    description: string;
    timestamp: Date;
}

interface GoalsSummary {
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
}

interface TasksSummary {
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
}

interface RecognitionSummary {
    totalThisMonth: number;
    topReceivers: { name: string; count: number }[];
}

@Injectable()
export class GeniusContextService {
    private readonly logger = new Logger(GeniusContextService.name);
    private contextCache: Map<string, { data: SystemContext; timestamp: number }> = new Map();
    private readonly CACHE_TTL = 60000;

    constructor(private readonly prisma: PrismaService) { }

    async getFullContext(companyId: string, forceRefresh = false): Promise<SystemContext> {
        const cacheKey = companyId;
        const cached = this.contextCache.get(cacheKey);

        if (!forceRefresh && cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.data;
        }

        this.logger.log(`Building context for company: ${companyId}`);

        const context: SystemContext = {
            company: await this.getCompanyContext(companyId),
            employees: await this.getEmployeesSummary(companyId),
            attendance: await this.getAttendanceSummary(companyId),
            leaves: await this.getLeavesSummary(companyId),
            payroll: await this.getPayrollSummary(companyId),
            goals: await this.getGoalsSummary(companyId),
            tasks: await this.getTasksSummary(companyId),
            recognition: await this.getRecognitionSummary(companyId),
            alerts: await this.getAlerts(companyId),
            recentActivity: await this.getRecentActivity(companyId)
        };

        this.contextCache.set(cacheKey, { data: context, timestamp: Date.now() });
        return context;
    }

    private async getCompanyContext(companyId: string): Promise<CompanyContext> {
        try {
            const [company, employeeCount, branchCount, deptCount] = await Promise.all([
                this.prisma.company.findUnique({ where: { id: companyId } }),
                this.prisma.user.count({ where: { companyId, status: 'ACTIVE' } }),
                this.prisma.branch.count({ where: { companyId } }),
                this.prisma.department.count({ where: { companyId } })
            ]);

            return {
                id: companyId,
                name: company?.name || 'شركة',
                totalEmployees: employeeCount,
                totalBranches: branchCount,
                totalDepartments: deptCount
            };
        } catch (e) {
            this.logger.error(`getCompanyContext error: ${e.message}`);
            return { id: companyId, name: 'شركة', totalEmployees: 0, totalBranches: 0, totalDepartments: 0 };
        }
    }

    private async getEmployeesSummary(companyId: string): Promise<EmployeesSummary> {
        try {
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

            const [total, active, newThisMonth, departments] = await Promise.all([
                this.prisma.user.count({ where: { companyId } }),
                this.prisma.user.count({ where: { companyId, status: 'ACTIVE' } }),
                this.prisma.user.count({ where: { companyId, hireDate: { gte: startOfMonth } } }),
                this.prisma.department.findMany({
                    where: { companyId },
                    include: { _count: { select: { users: true } } }
                })
            ]);

            // Simple at-risk calculation
            const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
            const attendanceData = await this.prisma.attendance.groupBy({
                by: ['userId'],
                where: {
                    user: { companyId },
                    date: { gte: sixMonthsAgo },
                    status: 'ABSENT'
                },
                _count: true
            });

            const highAbsentUsers = attendanceData
                .filter(a => a._count >= 5)
                .slice(0, 5);

            const atRisk = await Promise.all(
                highAbsentUsers.map(async (a) => {
                    const user = await this.prisma.user.findUnique({
                        where: { id: a.userId },
                        select: { id: true, firstName: true, lastName: true }
                    });
                    return {
                        id: a.userId,
                        name: user ? `${user.firstName} ${user.lastName}` : 'غير معروف',
                        riskScore: Math.min(a._count * 10, 100),
                        reasons: [`${a._count} يوم غياب`]
                    };
                })
            );

            return {
                total,
                active,
                onLeave: 0,
                newThisMonth,
                departmentBreakdown: departments.map(d => ({ name: d.name, count: d._count.users })),
                atRisk
            };
        } catch (e) {
            this.logger.error(`getEmployeesSummary error: ${e.message}`);
            return { total: 0, active: 0, onLeave: 0, newThisMonth: 0, departmentBreakdown: [], atRisk: [] };
        }
    }

    private async getAttendanceSummary(companyId: string): Promise<AttendanceSummary> {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const weekStart = new Date(today);
            weekStart.setDate(weekStart.getDate() - 7);
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

            const todayAtt = await this.prisma.attendance.findMany({
                where: {
                    user: { companyId },
                    date: { gte: today }
                }
            });

            const present = todayAtt.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
            const late = todayAtt.filter(a => a.status === 'LATE').length;
            const absent = todayAtt.filter(a => a.status === 'ABSENT').length;
            const onLeave = todayAtt.filter(a => a.status === 'ON_LEAVE').length;
            const total = todayAtt.length || 1;

            const weekAtt = await this.prisma.attendance.findMany({
                where: { user: { companyId }, date: { gte: weekStart } }
            });
            const weekPresent = weekAtt.filter(a => ['PRESENT', 'LATE'].includes(a.status)).length;
            const weekLateMinutes = weekAtt.reduce((sum, a) => sum + (a.lateMinutes || 0), 0);

            const monthAtt = await this.prisma.attendance.findMany({
                where: { user: { companyId }, date: { gte: monthStart } },
                include: { user: { select: { firstName: true, lastName: true } } }
            });
            const monthPresent = monthAtt.filter(a => ['PRESENT', 'LATE'].includes(a.status)).length;

            // Chronic absentees
            const absentByUser = monthAtt
                .filter(a => a.status === 'ABSENT')
                .reduce((acc, a) => {
                    const name = `${a.user.firstName} ${a.user.lastName}`;
                    acc[name] = (acc[name] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);

            const chronicAbsentees = Object.entries(absentByUser)
                .filter(([_, days]) => days >= 3)
                .map(([name, days]) => ({ name, days }))
                .sort((a, b) => b.days - a.days)
                .slice(0, 5);

            return {
                today: {
                    present,
                    late,
                    absent,
                    onLeave,
                    rate: Math.round((present / total) * 100)
                },
                thisWeek: {
                    avgAttendanceRate: Math.round((weekPresent / (weekAtt.length || 1)) * 100),
                    totalLateMinutes: weekLateMinutes
                },
                thisMonth: {
                    avgAttendanceRate: Math.round((monthPresent / (monthAtt.length || 1)) * 100),
                    chronicAbsentees
                }
            };
        } catch (e) {
            this.logger.error(`getAttendanceSummary error: ${e.message}`);
            return {
                today: { present: 0, late: 0, absent: 0, onLeave: 0, rate: 0 },
                thisWeek: { avgAttendanceRate: 0, totalLateMinutes: 0 },
                thisMonth: { avgAttendanceRate: 0, chronicAbsentees: [] }
            };
        }
    }

    private async getLeavesSummary(companyId: string): Promise<LeavesSummary> {
        try {
            const today = new Date();
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            const [pending, approved, upcoming] = await Promise.all([
                this.prisma.leaveRequest.count({
                    where: { user: { companyId }, status: 'PENDING' }
                }),
                this.prisma.leaveRequest.count({
                    where: { user: { companyId }, status: 'APPROVED', createdAt: { gte: monthStart } }
                }),
                this.prisma.leaveRequest.findMany({
                    where: {
                        user: { companyId },
                        status: 'APPROVED',
                        startDate: { gte: today, lte: nextWeek }
                    },
                    include: { user: { select: { firstName: true, lastName: true } } },
                    take: 10
                })
            ]);

            return {
                pending,
                approvedThisMonth: approved,
                upcomingLeaves: upcoming.map(u => ({
                    name: `${u.user.firstName} ${u.user.lastName}`,
                    type: (u as any).leaveType || (u as any).type || 'إجازة',
                    startDate: u.startDate,
                    days: Math.ceil((u.endDate.getTime() - u.startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1
                }))
            };
        } catch (e) {
            this.logger.error(`getLeavesSummary error: ${e.message}`);
            return { pending: 0, approvedThisMonth: 0, upcomingLeaves: [] };
        }
    }

    private async getPayrollSummary(companyId: string): Promise<PayrollSummary> {
        try {
            const salaries = await this.prisma.user.findMany({
                where: { companyId, status: 'ACTIVE', salary: { not: null } },
                select: { salary: true }
            });

            const salaryValues: number[] = salaries.map(s => Number(s.salary) || 0);
            const total = salaryValues.reduce((a: number, b: number) => a + b, 0);
            const avg = salaryValues.length > 0 ? total / salaryValues.length : 0;

            const ranges = [
                { min: 0, max: 5000, label: 'أقل من 5000' },
                { min: 5000, max: 10000, label: '5000 - 10000' },
                { min: 10000, max: 15000, label: '10000 - 15000' },
                { min: 15000, max: 25000, label: '15000 - 25000' },
                { min: 25000, max: Infinity, label: 'أكثر من 25000' }
            ];

            return {
                totalPayroll: Math.round(total),
                avgSalary: Math.round(avg),
                salaryRanges: ranges.map(r => ({
                    range: r.label,
                    count: salaryValues.filter((s: number) => s >= r.min && s < r.max).length
                }))
            };
        } catch (e) {
            this.logger.error(`getPayrollSummary error: ${e.message}`);
            return { totalPayroll: 0, avgSalary: 0, salaryRanges: [] };
        }
    }

    private async getAlerts(companyId: string): Promise<AlertsContext> {
        const critical: Alert[] = [];
        const warnings: Alert[] = [];
        const info: Alert[] = [];

        try {
            const pendingLeaves = await this.prisma.leaveRequest.count({
                where: { user: { companyId }, status: 'PENDING' }
            });

            if (pendingLeaves > 10) {
                critical.push({ type: 'leaves', message: `${pendingLeaves} طلب إجازة معلق`, action: 'راجع الطلبات' });
            } else if (pendingLeaves > 0) {
                warnings.push({ type: 'leaves', message: `${pendingLeaves} طلب إجازة معلق`, action: 'راجع الطلبات' });
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayAbsent = await this.prisma.attendance.count({
                where: { user: { companyId }, date: { gte: today }, status: 'ABSENT' }
            });

            if (todayAbsent > 5) {
                critical.push({ type: 'attendance', message: `${todayAbsent} موظف غائب اليوم`, action: 'تحقق من الغياب' });
            } else if (todayAbsent > 0) {
                info.push({ type: 'attendance', message: `${todayAbsent} موظف غائب اليوم` });
            }
        } catch (e) {
            this.logger.error(`getAlerts error: ${e.message}`);
        }

        return { critical, warnings, info };
    }

    private async getRecentActivity(companyId: string): Promise<RecentActivity[]> {
        const activities: RecentActivity[] = [];
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

        try {
            const recentLeaves = await this.prisma.leaveRequest.findMany({
                where: { user: { companyId }, createdAt: { gte: yesterday } },
                include: { user: { select: { firstName: true, lastName: true } } },
                take: 5,
                orderBy: { createdAt: 'desc' }
            });

            recentLeaves.forEach((l: any) => {
                activities.push({
                    type: 'leave',
                    description: `طلب إجازة من ${l.user.firstName} ${l.user.lastName}`,
                    timestamp: l.createdAt
                });
            });
        } catch (e) {
            this.logger.error(`getRecentActivity error: ${e.message}`);
        }

        return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    formatContextForAI(context: SystemContext): string {
        return `
📊 **ملخص النظام**

🏢 **الشركة**: ${context.company.name}
- الموظفين: ${context.company.totalEmployees}
- الفروع: ${context.company.totalBranches} | الأقسام: ${context.company.totalDepartments}

👥 **الموظفين**: نشط ${context.employees.active} | جدد ${context.employees.newThisMonth}

⏰ **حضور اليوم**: ${context.attendance.today.present} حاضر | ${context.attendance.today.late} متأخر | ${context.attendance.today.absent} غائب (${context.attendance.today.rate}%)

🏖️ **الإجازات**: ${context.leaves.pending} معلقة | ${context.leaves.approvedThisMonth} معتمدة هذا الشهر

💰 **الرواتب**: متوسط ${context.payroll.avgSalary.toLocaleString('ar-SA')} ريال

🎯 **الأهداف**: ${context.goals.completed}/${context.goals.total} مكتمل | ${context.goals.inProgress} جاري | ${context.goals.overdue} متأخر

📋 **المهام**: ${context.tasks.completed}/${context.tasks.total} مكتمل | ${context.tasks.inProgress} جاري | ${context.tasks.overdue} متأخر

🌟 **التقدير**: ${context.recognition.totalThisMonth} تقدير هذا الشهر

🚨 **تنبيهات**: ${context.alerts.critical.length} حرجة | ${context.alerts.warnings.length} تحذيرات
        `.trim();
    }

    // ============ NEW CONTEXT METHODS ============

    private async getGoalsSummary(companyId: string): Promise<GoalsSummary> {
        try {
            const today = new Date();

            const [total, completed, inProgress, overdue] = await Promise.all([
                (this.prisma.goal as any).count({ where: { companyId } }),
                (this.prisma.goal as any).count({ where: { companyId, status: 'COMPLETED' } }),
                (this.prisma.goal as any).count({ where: { companyId, status: 'IN_PROGRESS' } }),
                (this.prisma.goal as any).count({
                    where: {
                        companyId,
                        status: { not: 'COMPLETED' },
                        dueDate: { lt: today }
                    }
                })
            ]);

            return { total, completed, inProgress, overdue };
        } catch (e) {
            this.logger.error(`getGoalsSummary error: ${e.message}`);
            return { total: 0, completed: 0, inProgress: 0, overdue: 0 };
        }
    }

    private async getTasksSummary(companyId: string): Promise<TasksSummary> {
        try {
            const today = new Date();

            const [total, completed, inProgress, overdue] = await Promise.all([
                (this.prisma.task as any).count({ where: { companyId } }),
                (this.prisma.task as any).count({ where: { companyId, status: 'COMPLETED' } }),
                (this.prisma.task as any).count({ where: { companyId, status: 'IN_PROGRESS' } }),
                (this.prisma.task as any).count({
                    where: {
                        companyId,
                        status: { notIn: ['COMPLETED', 'CANCELLED'] },
                        dueDate: { lt: today }
                    }
                })
            ]);

            return { total, completed, inProgress, overdue };
        } catch (e) {
            this.logger.error(`getTasksSummary error: ${e.message}`);
            return { total: 0, completed: 0, inProgress: 0, overdue: 0 };
        }
    }

    private async getRecognitionSummary(companyId: string): Promise<RecognitionSummary> {
        try {
            const monthStart = new Date();
            monthStart.setDate(1);
            monthStart.setHours(0, 0, 0, 0);

            const totalThisMonth = await (this.prisma.recognition as any).count({
                where: { companyId, createdAt: { gte: monthStart } }
            });

            const topReceiversData = await (this.prisma.recognition as any).groupBy({
                by: ['receiverId'],
                where: { companyId, createdAt: { gte: monthStart } },
                _count: true,
                orderBy: { _count: { receiverId: 'desc' } },
                take: 5
            });

            const topReceivers = await Promise.all(
                topReceiversData.map(async (r: any) => {
                    const user = await this.prisma.user.findUnique({
                        where: { id: r.receiverId },
                        select: { firstName: true, lastName: true }
                    });
                    return {
                        name: user ? `${user.firstName} ${user.lastName}` : 'غير معروف',
                        count: r._count
                    };
                })
            );

            return { totalThisMonth, topReceivers };
        } catch (e) {
            this.logger.error(`getRecognitionSummary error: ${e.message}`);
            return { totalThisMonth: 0, topReceivers: [] };
        }
    }
}
