import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

// تعريف أنواع مصادر البيانات
export type GoalDataSourceType = 'ATTENDANCE' | 'LEAVES' | 'TASKS' | 'OVERTIME' | 'POLICIES' | 'CUSTODY' | 'RECOGNITION';

// تعريف مصادر البيانات المتاحة
export interface DataSourceInfo {
    key: string;
    label: string;
    labelAr: string;
    icon: string;
    metrics: DataSourceMetric[];
}

export interface DataSourceMetric {
    key: string;
    label: string;
    labelAr: string;
    unit: string;
    description: string;
}

// قائمة مصادر البيانات المتاحة
export const AVAILABLE_DATA_SOURCES: DataSourceInfo[] = [
    {
        key: 'ATTENDANCE',
        label: 'Attendance',
        labelAr: 'الحضور والانصراف',
        icon: '📊',
        metrics: [
            { key: 'attendance_rate', label: 'Attendance Rate', labelAr: 'نسبة الحضور', unit: '%', description: 'نسبة أيام الحضور من إجمالي أيام العمل' },
            { key: 'late_count', label: 'Late Count', labelAr: 'عدد مرات التأخير', unit: 'مرة', description: 'عدد مرات التأخير عن موعد الحضور' },
            { key: 'late_minutes', label: 'Late Minutes', labelAr: 'دقائق التأخير', unit: 'دقيقة', description: 'إجمالي دقائق التأخير' },
            { key: 'absent_days', label: 'Absent Days', labelAr: 'أيام الغياب', unit: 'يوم', description: 'عدد أيام الغياب' },
            { key: 'early_leave_count', label: 'Early Leave', labelAr: 'الانصراف المبكر', unit: 'مرة', description: 'عدد مرات الانصراف المبكر' },
        ],
    },
    {
        key: 'LEAVES',
        label: 'Leaves',
        labelAr: 'الإجازات',
        icon: '🏖️',
        metrics: [
            { key: 'used_leave_days', label: 'Used Leave Days', labelAr: 'أيام الإجازة المستخدمة', unit: 'يوم', description: 'عدد أيام الإجازة المستخدمة' },
            { key: 'remaining_leave_days', label: 'Remaining Leave', labelAr: 'أيام الإجازة المتبقية', unit: 'يوم', description: 'عدد أيام الإجازة المتبقية' },
            { key: 'sick_leave_days', label: 'Sick Leave Days', labelAr: 'أيام الإجازة المرضية', unit: 'يوم', description: 'عدد أيام الإجازة المرضية' },
            { key: 'leave_requests', label: 'Leave Requests', labelAr: 'طلبات الإجازة', unit: 'طلب', description: 'عدد طلبات الإجازة المقدمة' },
        ],
    },
    {
        key: 'TASKS',
        label: 'Tasks',
        labelAr: 'المهام',
        icon: '✅',
        metrics: [
            { key: 'completed_tasks', label: 'Completed Tasks', labelAr: 'المهام المنجزة', unit: 'مهمة', description: 'عدد المهام المنجزة' },
            { key: 'total_tasks', label: 'Total Tasks', labelAr: 'إجمالي المهام', unit: 'مهمة', description: 'إجمالي عدد المهام' },
            { key: 'task_completion_rate', label: 'Completion Rate', labelAr: 'نسبة الإنجاز', unit: '%', description: 'نسبة المهام المنجزة' },
            { key: 'on_time_tasks', label: 'On-Time Tasks', labelAr: 'المهام في الوقت', unit: 'مهمة', description: 'عدد المهام المنجزة في الوقت' },
            { key: 'overdue_tasks', label: 'Overdue Tasks', labelAr: 'المهام المتأخرة', unit: 'مهمة', description: 'عدد المهام المتأخرة' },
        ],
    },
    {
        key: 'OVERTIME',
        label: 'Overtime',
        labelAr: 'العمل الإضافي',
        icon: '⏰',
        metrics: [
            { key: 'overtime_hours', label: 'Overtime Hours', labelAr: 'ساعات العمل الإضافي', unit: 'ساعة', description: 'إجمالي ساعات العمل الإضافي' },
            { key: 'overtime_days', label: 'Overtime Days', labelAr: 'أيام العمل الإضافي', unit: 'يوم', description: 'عدد أيام العمل الإضافي' },
        ],
    },
    {
        key: 'POLICIES',
        label: 'Policies',
        labelAr: 'السياسات',
        icon: '📋',
        metrics: [
            { key: 'violations_count', label: 'Violations', labelAr: 'عدد المخالفات', unit: 'مخالفة', description: 'عدد المخالفات المسجلة' },
            { key: 'deductions_total', label: 'Total Deductions', labelAr: 'إجمالي الخصومات', unit: 'ر.س', description: 'إجمالي مبلغ الخصومات' },
        ],
    },
    {
        key: 'CUSTODY',
        label: 'Custody',
        labelAr: 'العهد',
        icon: '📦',
        metrics: [
            { key: 'active_custody', label: 'Active Custody', labelAr: 'العهد النشطة', unit: 'عهدة', description: 'عدد العهد النشطة' },
            { key: 'returned_custody', label: 'Returned Custody', labelAr: 'العهد المرجعة', unit: 'عهدة', description: 'عدد العهد المرجعة' },
        ],
    },
    {
        key: 'RECOGNITION',
        label: 'Recognition',
        labelAr: 'التقدير',
        icon: '🏆',
        metrics: [
            { key: 'recognitions_received', label: 'Recognitions', labelAr: 'التقديرات المستلمة', unit: 'تقدير', description: 'عدد التقديرات المستلمة' },
            { key: 'recognition_points', label: 'Recognition Points', labelAr: 'نقاط التقدير', unit: 'نقطة', description: 'إجمالي نقاط التقدير' },
        ],
    },
];

@Injectable()
export class GoalDataSourceService {
    private readonly logger = new Logger(GoalDataSourceService.name);

    constructor(private prisma: PrismaService) { }

    // الحصول على مصادر البيانات المتاحة
    getAvailableDataSources(): DataSourceInfo[] {
        return AVAILABLE_DATA_SOURCES;
    }

    // حساب قيمة الهدف بناءً على مصدر البيانات
    async calculateGoalValue(
        goalId: string,
        ownerId: string,
        dataSource: GoalDataSourceType,
        config: { metric: string; startDate?: Date; endDate?: Date },
    ): Promise<{ currentValue: number; targetValue: number; progress: number }> {
        const startDate = config.startDate || new Date(new Date().getFullYear(), 0, 1);
        const endDate = config.endDate || new Date();

        switch (dataSource) {
            case 'ATTENDANCE':
                return this.calculateAttendanceMetric(ownerId, config.metric, startDate, endDate);
            case 'LEAVES':
                return this.calculateLeavesMetric(ownerId, config.metric, startDate, endDate);
            case 'TASKS':
                return this.calculateTasksMetric(ownerId, config.metric, startDate, endDate);
            case 'OVERTIME':
                return this.calculateOvertimeMetric(ownerId, config.metric, startDate, endDate);
            case 'RECOGNITION':
                return this.calculateRecognitionMetric(ownerId, config.metric, startDate, endDate);
            default:
                return { currentValue: 0, targetValue: 100, progress: 0 };
        }
    }

    // حساب مقاييس الحضور
    private async calculateAttendanceMetric(
        userId: string,
        metric: string,
        startDate: Date,
        endDate: Date,
    ): Promise<{ currentValue: number; targetValue: number; progress: number }> {
        const attendances = await this.prisma.attendance.findMany({
            where: {
                userId,
                date: { gte: startDate, lte: endDate },
            },
        });

        const totalDays = attendances.length || 1;
        const presentDays = attendances.filter((a: any) => a.status === 'PRESENT' || a.status === 'LATE').length;
        const lateDays = attendances.filter((a: any) => a.status === 'LATE').length;
        const absentDays = attendances.filter((a: any) => a.status === 'ABSENT').length;
        const totalLateMinutes = attendances.reduce((sum: number, a: any) => sum + (a.lateMinutes || 0), 0);
        const earlyLeaveDays = attendances.filter((a: any) => a.earlyLeaveMinutes > 0).length;

        switch (metric) {
            case 'attendance_rate':
                const rate = Math.round((presentDays / totalDays) * 100);
                return { currentValue: rate, targetValue: 100, progress: rate };
            case 'late_count':
                return { currentValue: lateDays, targetValue: 0, progress: lateDays === 0 ? 100 : Math.max(0, 100 - lateDays * 10) };
            case 'late_minutes':
                return { currentValue: totalLateMinutes, targetValue: 0, progress: totalLateMinutes === 0 ? 100 : Math.max(0, 100 - totalLateMinutes) };
            case 'absent_days':
                return { currentValue: absentDays, targetValue: 0, progress: absentDays === 0 ? 100 : Math.max(0, 100 - absentDays * 20) };
            case 'early_leave_count':
                return { currentValue: earlyLeaveDays, targetValue: 0, progress: earlyLeaveDays === 0 ? 100 : Math.max(0, 100 - earlyLeaveDays * 10) };
            default:
                return { currentValue: 0, targetValue: 100, progress: 0 };
        }
    }

    // حساب مقاييس الإجازات
    private async calculateLeavesMetric(
        userId: string,
        metric: string,
        startDate: Date,
        endDate: Date,
    ): Promise<{ currentValue: number; targetValue: number; progress: number }> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { usedLeaveDays: true, remainingLeaveDays: true, annualLeaveDays: true },
        });

        const leaveRequests = await this.prisma.leaveRequest.findMany({
            where: {
                userId,
                startDate: { gte: startDate },
                endDate: { lte: endDate },
                status: 'APPROVED',
            },
        });

        const usedDays = user?.usedLeaveDays || 0;
        const remainingDays = user?.remainingLeaveDays || 0;
        const sickDays = leaveRequests.filter((l: any) => l.type === 'SICK').reduce((sum: number, l: any) => sum + (l.requestedDays || 1), 0);

        switch (metric) {
            case 'used_leave_days':
                return { currentValue: usedDays, targetValue: user?.annualLeaveDays || 21, progress: Math.round((usedDays / (user?.annualLeaveDays || 21)) * 100) };
            case 'remaining_leave_days':
                return { currentValue: remainingDays, targetValue: user?.annualLeaveDays || 21, progress: Math.round((remainingDays / (user?.annualLeaveDays || 21)) * 100) };
            case 'sick_leave_days':
                return { currentValue: sickDays, targetValue: 10, progress: sickDays === 0 ? 100 : Math.max(0, 100 - sickDays * 10) };
            case 'leave_requests':
                return { currentValue: leaveRequests.length, targetValue: 10, progress: Math.min(100, leaveRequests.length * 10) };
            default:
                return { currentValue: 0, targetValue: 100, progress: 0 };
        }
    }

    // حساب مقاييس المهام
    private async calculateTasksMetric(
        userId: string,
        metric: string,
        startDate: Date,
        endDate: Date,
    ): Promise<{ currentValue: number; targetValue: number; progress: number }> {
        const tasks = await this.prisma.task.findMany({
            where: {
                assigneeId: userId,
                createdAt: { gte: startDate, lte: endDate },
            },
        });

        const totalTasks = tasks.length || 1;
        const completedTasks = tasks.filter((t: any) => t.status === 'COMPLETED').length;
        const overdueTasks = tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED').length;
        const onTimeTasks = tasks.filter((t: any) => t.completedAt && t.dueDate && new Date(t.completedAt) <= new Date(t.dueDate)).length;

        switch (metric) {
            case 'completed_tasks':
                return { currentValue: completedTasks, targetValue: totalTasks, progress: Math.round((completedTasks / totalTasks) * 100) };
            case 'total_tasks':
                return { currentValue: totalTasks, targetValue: 100, progress: Math.min(100, totalTasks) };
            case 'task_completion_rate':
                const rate = Math.round((completedTasks / totalTasks) * 100);
                return { currentValue: rate, targetValue: 100, progress: rate };
            case 'on_time_tasks':
                return { currentValue: onTimeTasks, targetValue: totalTasks, progress: Math.round((onTimeTasks / totalTasks) * 100) };
            case 'overdue_tasks':
                return { currentValue: overdueTasks, targetValue: 0, progress: overdueTasks === 0 ? 100 : Math.max(0, 100 - overdueTasks * 20) };
            default:
                return { currentValue: 0, targetValue: 100, progress: 0 };
        }
    }

    // حساب مقاييس العمل الإضافي
    private async calculateOvertimeMetric(
        userId: string,
        metric: string,
        startDate: Date,
        endDate: Date,
    ): Promise<{ currentValue: number; targetValue: number; progress: number }> {
        const attendances = await this.prisma.attendance.findMany({
            where: {
                userId,
                date: { gte: startDate, lte: endDate },
                overtimeMinutes: { gt: 0 },
            },
        });

        const totalOvertimeMinutes = attendances.reduce((sum: number, a: any) => sum + (a.overtimeMinutes || 0), 0);
        const overtimeHours = Math.round(totalOvertimeMinutes / 60);
        const overtimeDays = attendances.length;

        switch (metric) {
            case 'overtime_hours':
                return { currentValue: overtimeHours, targetValue: 50, progress: Math.min(100, (overtimeHours / 50) * 100) };
            case 'overtime_days':
                return { currentValue: overtimeDays, targetValue: 20, progress: Math.min(100, (overtimeDays / 20) * 100) };
            default:
                return { currentValue: 0, targetValue: 100, progress: 0 };
        }
    }

    // حساب مقاييس التقدير
    private async calculateRecognitionMetric(
        userId: string,
        metric: string,
        startDate: Date,
        endDate: Date,
    ): Promise<{ currentValue: number; targetValue: number; progress: number }> {
        const recognitions = await this.prisma.recognition.findMany({
            where: {
                receiverId: userId,
                createdAt: { gte: startDate, lte: endDate },
            },
        });

        const totalRecognitions = recognitions.length;
        const totalPoints = recognitions.reduce((sum: number, r: any) => sum + (r.points || 0), 0);

        switch (metric) {
            case 'recognitions_received':
                return { currentValue: totalRecognitions, targetValue: 10, progress: Math.min(100, (totalRecognitions / 10) * 100) };
            case 'recognition_points':
                return { currentValue: totalPoints, targetValue: 100, progress: Math.min(100, totalPoints) };
            default:
                return { currentValue: 0, targetValue: 100, progress: 0 };
        }
    }

    // مزامنة جميع الأهداف التلقائية - Simplified version
    async syncAllAutoCalculatedGoals(companyId: string): Promise<number> {
        // Simplified - just return 0 for now since Goal schema doesn't have autoCalculated field
        this.logger.log(`Sync auto-calculated goals called for company: ${companyId}`);
        return 0;
    }
}
