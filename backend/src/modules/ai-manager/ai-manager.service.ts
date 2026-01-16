import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';

export interface TeamHealthScore {
    overallHealth: number;
    attendanceHealth: number;
    productivityHealth: number;
    moraleIndicator: 'excellent' | 'good' | 'fair' | 'poor';
    alerts: string[];
    recommendations: string[];
}

export interface WorkloadDistribution {
    balanced: boolean;
    overloadedEmployees: { name: string; taskCount: number }[];
    underutilizedEmployees: { name: string; taskCount: number }[];
    recommendation: string;
}

export interface BurnoutRisk {
    userId: string;
    userName: string;
    riskLevel: 'low' | 'medium' | 'high';
    indicators: string[];
    suggestedActions: string[];
}

@Injectable()
export class AiManagerService {
    private readonly logger = new Logger(AiManagerService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly aiService: AiService,
    ) { }

    /**
     * 💚 حساب صحة الفريق
     */
    async getTeamHealthScore(companyId: string): Promise<TeamHealthScore> {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // جلب البيانات
        const [employees, attendanceData, tasks] = await Promise.all([
            this.prisma.user.count({
                where: { companyId, status: 'ACTIVE', role: 'EMPLOYEE' },
            }),
            this.prisma.attendance.findMany({
                where: {
                    user: { companyId },
                    date: { gte: thirtyDaysAgo },
                },
            }),
            this.prisma.task.findMany({
                where: {
                    assignee: { companyId },
                    updatedAt: { gte: thirtyDaysAgo },
                },
            }),
        ]);

        // حساب صحة الحضور
        const totalAttendance = attendanceData.length || 1;
        const presentDays = attendanceData.filter((a: any) =>
            a.status === 'PRESENT' || a.status === 'LATE'
        ).length;
        const attendanceHealth = Math.round((presentDays / totalAttendance) * 100);

        // حساب صحة الإنتاجية
        const completedTasks = tasks.filter((t: any) => t.status === 'COMPLETED').length;
        const totalTasks = tasks.length || 1;
        const productivityHealth = Math.round((completedTasks / totalTasks) * 100);

        // حساب الصحة الإجمالية
        const overallHealth = Math.round((attendanceHealth + productivityHealth) / 2);

        // تحديد المؤشر
        let moraleIndicator: 'excellent' | 'good' | 'fair' | 'poor';
        if (overallHealth >= 85) moraleIndicator = 'excellent';
        else if (overallHealth >= 70) moraleIndicator = 'good';
        else if (overallHealth >= 50) moraleIndicator = 'fair';
        else moraleIndicator = 'poor';

        // التنبيهات
        const alerts: string[] = [];
        const lateDays = attendanceData.filter((a: any) => a.status === 'LATE').length;
        const absentDays = attendanceData.filter((a: any) => a.status === 'ABSENT').length;

        if (lateDays > attendanceData.length * 0.2) {
            alerts.push('⏰ نسبة التأخير مرتفعة (أكثر من 20%)');
        }
        if (absentDays > attendanceData.length * 0.1) {
            alerts.push('🚫 نسبة الغياب مرتفعة (أكثر من 10%)');
        }
        if (productivityHealth < 60) {
            alerts.push('📋 إنتاجية المهام منخفضة');
        }

        // التوصيات
        const recommendations: string[] = [];
        if (moraleIndicator === 'poor') {
            recommendations.push('🎯 عقد اجتماع طارئ لمناقشة التحديات');
        }
        if (lateDays > 10) {
            recommendations.push('⏰ مراجعة سياسة الحضور وساعات العمل');
        }
        if (productivityHealth < 70) {
            recommendations.push('📊 تقييم عبء العمل وإعادة توزيع المهام');
        }

        return {
            overallHealth,
            attendanceHealth,
            productivityHealth,
            moraleIndicator,
            alerts: alerts.length > 0 ? alerts : ['✅ لا توجد تنبيهات'],
            recommendations: recommendations.length > 0 ? recommendations : ['✅ الفريق بصحة جيدة'],
        };
    }

    /**
     * ⚖️ توزيع عبء العمل
     */
    async analyzeWorkloadDistribution(companyId: string): Promise<WorkloadDistribution> {
        // جلب الموظفين مع مهامهم
        const employees = await this.prisma.user.findMany({
            where: { companyId, status: 'ACTIVE', role: 'EMPLOYEE' },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                _count: {
                    select: {
                        assignedTasks: {
                            where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
                        },
                    },
                },
            },
            take: 50,
        });

        // تحليل العبء
        const workloads = employees.map(e => ({
            name: `${e.firstName} ${e.lastName}`,
            taskCount: (e._count as any)?.assignedTasks || 0,
        }));

        const avgTaskCount = workloads.reduce((sum, w) => sum + w.taskCount, 0) / (workloads.length || 1);

        // تحديد الموظفين المثقلين
        const overloadedEmployees = workloads
            .filter(w => w.taskCount > avgTaskCount * 1.5)
            .slice(0, 5);

        // تحديد الموظفين غير المشغولين
        const underutilizedEmployees = workloads
            .filter(w => w.taskCount < avgTaskCount * 0.5)
            .slice(0, 5);

        // تحديد التوازن
        const balanced = overloadedEmployees.length === 0 && underutilizedEmployees.length === 0;

        let recommendation: string;
        if (balanced) {
            recommendation = '✅ توزيع العمل متوازن';
        } else if (overloadedEmployees.length > 0) {
            recommendation = `⚠️ إعادة توزيع المهام من ${overloadedEmployees[0].name} إلى موظفين آخرين`;
        } else {
            recommendation = '📋 يمكن تعيين مهام إضافية للموظفين غير المشغولين';
        }

        return {
            balanced,
            overloadedEmployees,
            underutilizedEmployees,
            recommendation,
        };
    }

    /**
     * 🔥 كشف احتمالية الإرهاق
     */
    async detectBurnoutRisks(companyId: string): Promise<BurnoutRisk[]> {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const employees = await this.prisma.user.findMany({
            where: { companyId, status: 'ACTIVE', role: 'EMPLOYEE' },
            select: {
                id: true,
                firstName: true,
                lastName: true,
            },
            take: 20,
        });

        const burnoutRisks: BurnoutRisk[] = [];

        for (const emp of employees) {
            const indicators: string[] = [];
            let riskScore = 0;

            // 1. ساعات العمل الإضافية
            const attendance = await this.prisma.attendance.findMany({
                where: {
                    userId: emp.id,
                    date: { gte: thirtyDaysAgo },
                },
            });

            const avgOvertimeMinutes = attendance.reduce((sum, a) => {
                const overtime = (a as any).overtimeMinutes || 0;
                return sum + overtime;
            }, 0) / (attendance.length || 1);

            if (avgOvertimeMinutes > 60) {
                riskScore += 30;
                indicators.push('⏱️ ساعات إضافية مفرطة');
            }

            // 2. عدد المهام الكبير
            const activeTasks = await this.prisma.task.count({
                where: {
                    assigneeId: emp.id,
                    status: { notIn: ['COMPLETED', 'CANCELLED'] },
                },
            });

            if (activeTasks > 10) {
                riskScore += 25;
                indicators.push('📋 عدد مهام كبير جداً');
            }

            // 3. عدم أخذ إجازات
            const recentLeaves = await this.prisma.leaveRequest.count({
                where: {
                    userId: emp.id,
                    status: 'APPROVED',
                    createdAt: { gte: thirtyDaysAgo },
                },
            });

            if (recentLeaves === 0 && attendance.length >= 25) {
                riskScore += 20;
                indicators.push('🏖️ لم يأخذ إجازة منذ فترة');
            }

            // 4. تأخير متكرر (علامة على الإرهاق)
            const lateCount = attendance.filter((a: any) => a.status === 'LATE').length;
            if (lateCount >= 5) {
                riskScore += 15;
                indicators.push('⏰ تأخير متكرر');
            }

            // تحديد مستوى المخاطر
            if (riskScore >= 40) {
                const riskLevel: 'low' | 'medium' | 'high' =
                    riskScore >= 60 ? 'high' : riskScore >= 40 ? 'medium' : 'low';

                const suggestedActions: string[] = [];
                if (riskLevel === 'high') {
                    suggestedActions.push('🗣️ إجراء محادثة فردية عاجلة');
                    suggestedActions.push('📅 تشجيع على أخذ إجازة');
                }
                if (activeTasks > 10) {
                    suggestedActions.push('📋 إعادة توزيع بعض المهام');
                }

                burnoutRisks.push({
                    userId: emp.id,
                    userName: `${emp.firstName} ${emp.lastName}`,
                    riskLevel,
                    indicators,
                    suggestedActions: suggestedActions.length > 0 ? suggestedActions : ['متابعة دورية'],
                });
            }
        }

        return burnoutRisks;
    }

    /**
     * 🤖 نصائح AI للمدير
     */
    async getManagerInsights(companyId: string): Promise<string> {
        try {
            const health = await this.getTeamHealthScore(companyId);
            const workload = await this.analyzeWorkloadDistribution(companyId);

            const prompt = `أنت مستشار إداري ذكي. بناءً على البيانات التالية، قدم 3 نصائح مختصرة للمدير:

📊 صحة الفريق:
- الصحة الإجمالية: ${health.overallHealth}%
- صحة الحضور: ${health.attendanceHealth}%
- صحة الإنتاجية: ${health.productivityHealth}%
- المؤشر: ${health.moraleIndicator}

⚖️ توزيع العمل:
- متوازن: ${workload.balanced ? 'نعم' : 'لا'}
- موظفين مثقلين: ${workload.overloadedEmployees.length}
- موظفين غير مشغولين: ${workload.underutilizedEmployees.length}

قدم نصائح عملية ومختصرة بالعربية:`;

            return await this.aiService.generateContent(prompt);
        } catch (error) {
            this.logger.error(`Manager insights error: ${error.message}`);
            return '❌ لم نتمكن من تحليل البيانات حالياً';
        }
    }
}
