import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * 📊 Real-time Dashboard Service
 * لوحة التحكم الحية للسياسات الذكية - نسخة مبسطة
 */

// ============== Types ==============

export interface DashboardData {
    overview: DashboardOverview;
    charts: DashboardCharts;
    alerts: DashboardAlert[];
    kpis: DashboardKPI[];
    recentActivity: ActivityItem[];
}

export interface DashboardOverview {
    totalPolicies: number;
    activePolicies: number;
    pendingApproval: number;
    executionsToday: number;
    executionsThisMonth: number;
    totalImpact: {
        additions: number;
        deductions: number;
        net: number;
    };
    affectedEmployees: number;
    successRate: number;
}

export interface DashboardCharts {
    executionsByDay: TimeSeriesData[];
    executionsByType: PieChartData[];
    impactByDepartment: BarChartData[];
}

export interface TimeSeriesData {
    date: string;
    value: number;
    label?: string;
}

export interface PieChartData {
    name: string;
    value: number;
    color?: string;
}

export interface BarChartData {
    category: string;
    value: number;
    color?: string;
}

export interface DashboardAlert {
    id: string;
    type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
    title: string;
    message: string;
    timestamp: Date;
    isRead: boolean;
}

export interface DashboardKPI {
    id: string;
    name: string;
    value: number;
    unit: string;
    target?: number;
    trend: 'UP' | 'DOWN' | 'STABLE';
    change: number;
    status: 'GOOD' | 'WARNING' | 'CRITICAL';
    description?: string;
}

export interface ActivityItem {
    id: string;
    type: string;
    title: string;
    description: string;
    userId?: string;
    userName?: string;
    policyId?: string;
    policyName?: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface DashboardFilters {
    dateRange?: { start: Date; end: Date };
    departments?: string[];
    policyTypes?: string[];
}

// ============== Implementation ==============

@Injectable()
export class RealtimeDashboardService {
    private readonly logger = new Logger(RealtimeDashboardService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * 📊 جلب بيانات لوحة التحكم
     */
    async getDashboardData(companyId: string, filters?: DashboardFilters): Promise<DashboardData> {
        this.logger.log(`Fetching dashboard data for company: ${companyId}`);

        const [overview, charts, alerts, kpis, recentActivity] = await Promise.all([
            this.getOverview(companyId),
            this.getCharts(companyId),
            this.getAlerts(companyId),
            this.getKPIs(companyId),
            this.getRecentActivity(companyId),
        ]);

        return {
            overview,
            charts,
            alerts,
            kpis,
            recentActivity,
        };
    }

    /**
     * 📈 جلب نظرة عامة
     */
    async getOverview(companyId: string): Promise<DashboardOverview> {
        const [totalPolicies, activePolicies, pendingApproval] = await Promise.all([
            this.prisma.smartPolicy.count({ where: { companyId } }),
            this.prisma.smartPolicy.count({ where: { companyId, isActive: true } }),
            this.prisma.smartPolicy.count({ where: { companyId, status: 'PENDING' } }),
        ]);

        // حساب التنفيذات
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

        const [executionsToday, executionsThisMonth] = await Promise.all([
            this.prisma.smartPolicyExecution.count({
                where: {
                    policy: { companyId },
                    executedAt: { gte: today },
                },
            }),
            this.prisma.smartPolicyExecution.count({
                where: {
                    policy: { companyId },
                    executedAt: { gte: monthStart },
                },
            }),
        ]);

        // حساب التأثير المالي
        const impactData = await this.prisma.smartPolicyExecution.aggregate({
            where: {
                policy: { companyId },
                executedAt: { gte: monthStart },
                isSuccess: true,
            },
            _sum: { actionValue: true },
        });

        const totalAmount = impactData._sum?.actionValue?.toNumber() || 0;
        const additions = totalAmount > 0 ? totalAmount : 0;
        const deductions = totalAmount < 0 ? Math.abs(totalAmount) : 0;

        // حساب الموظفين المتأثرين
        const affectedEmployees = await this.prisma.smartPolicyExecution.groupBy({
            by: ['employeeId'],
            where: {
                policy: { companyId },
                executedAt: { gte: monthStart },
            },
        });

        // حساب معدل النجاح
        const [successful, total] = await Promise.all([
            this.prisma.smartPolicyExecution.count({
                where: { policy: { companyId }, executedAt: { gte: monthStart }, isSuccess: true },
            }),
            this.prisma.smartPolicyExecution.count({
                where: { policy: { companyId }, executedAt: { gte: monthStart } },
            }),
        ]);

        return {
            totalPolicies,
            activePolicies,
            pendingApproval,
            executionsToday,
            executionsThisMonth,
            totalImpact: {
                additions,
                deductions,
                net: additions - deductions,
            },
            affectedEmployees: affectedEmployees.length,
            successRate: total > 0 ? Math.round((successful / total) * 100) : 100,
        };
    }

    /**
     * 📊 جلب الرسوم البيانية
     */
    async getCharts(companyId: string): Promise<DashboardCharts> {
        // بيانات التنفيذات اليومية لآخر 7 أيام
        const executionsByDay: TimeSeriesData[] = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const count = await this.prisma.smartPolicyExecution.count({
                where: {
                    policy: { companyId },
                    executedAt: { gte: date, lt: nextDate },
                },
            });

            executionsByDay.push({
                date: date.toISOString().split('T')[0],
                value: count,
                label: date.toLocaleDateString('ar-SA', { weekday: 'short' }),
            });
        }

        // توزيع أنواع السياسات
        const policies = await this.prisma.smartPolicy.groupBy({
            by: ['triggerEvent'],
            where: { companyId, isActive: true },
            _count: { _all: true },
        });

        const executionsByType: PieChartData[] = policies.map((p) => ({
            name: p.triggerEvent || 'أخرى',
            value: p._count._all,
        }));

        return {
            executionsByDay,
            executionsByType,
            impactByDepartment: [], // يمكن إضافتها لاحقاً
        };
    }

    /**
     * 🔔 جلب التنبيهات
     */
    async getAlerts(companyId: string): Promise<DashboardAlert[]> {
        const alerts: DashboardAlert[] = [];

        // تنبيه السياسات المعلقة
        const pendingCount = await this.prisma.smartPolicy.count({
            where: { companyId, status: 'PENDING' },
        });

        if (pendingCount > 0) {
            alerts.push({
                id: 'pending-policies',
                type: 'WARNING',
                title: 'سياسات معلقة',
                message: `يوجد ${pendingCount} سياسة تنتظر الموافقة`,
                timestamp: new Date(),
                isRead: false,
            });
        }

        return alerts;
    }

    /**
     * 📈 جلب مؤشرات الأداء
     */
    async getKPIs(companyId: string): Promise<DashboardKPI[]> {
        const kpis: DashboardKPI[] = [];
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        // عدد السياسات النشطة
        const activePolicies = await this.prisma.smartPolicy.count({
            where: { companyId, isActive: true },
        });

        kpis.push({
            id: 'active_policies',
            name: 'السياسات النشطة',
            value: activePolicies,
            unit: 'سياسة',
            trend: 'UP',
            change: 5,
            status: 'GOOD',
            description: 'عدد السياسات المفعلة حالياً',
        });

        // معدل النجاح
        const [successful, total] = await Promise.all([
            this.prisma.smartPolicyExecution.count({
                where: { policy: { companyId }, executedAt: { gte: monthStart }, isSuccess: true },
            }),
            this.prisma.smartPolicyExecution.count({
                where: { policy: { companyId }, executedAt: { gte: monthStart } },
            }),
        ]);

        const successRate = total > 0 ? Math.round((successful / total) * 100) : 100;
        kpis.push({
            id: 'success_rate',
            name: 'معدل النجاح',
            value: successRate,
            unit: '%',
            target: 95,
            trend: 'UP',
            change: 2,
            status: successRate >= 95 ? 'GOOD' : successRate >= 80 ? 'WARNING' : 'CRITICAL',
            description: 'نسبة التنفيذات الناجحة هذا الشهر',
        });

        return kpis;
    }

    /**
     * 📋 جلب النشاط الأخير
     */
    async getRecentActivity(companyId: string, limit: number = 20): Promise<ActivityItem[]> {
        const executions = await this.prisma.smartPolicyExecution.findMany({
            where: { policy: { companyId } },
            orderBy: { executedAt: 'desc' },
            take: limit,
            include: {
                policy: { select: { id: true, name: true } },
            },
        });

        return executions.map((exec) => ({
            id: exec.id,
            type: exec.isSuccess ? 'POLICY_EXECUTED' : 'POLICY_FAILED',
            title: exec.isSuccess ? 'تنفيذ سياسة' : 'فشل تنفيذ سياسة',
            description: `تم ${exec.isSuccess ? 'تنفيذ' : 'فشل'} السياسة على الموظف ${exec.employeeName}`,
            userId: exec.employeeId,
            userName: exec.employeeName,
            policyId: exec.policy?.id,
            policyName: exec.policy?.name || 'سياسة',
            timestamp: exec.executedAt,
            metadata: {},
        }));
    }

    /**
     * 🔄 تحديث لحظي
     */
    async refreshDashboard(companyId: string): Promise<DashboardData> {
        return this.getDashboardData(companyId);
    }
}
