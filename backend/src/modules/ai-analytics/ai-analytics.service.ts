import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';

export interface EmployeeScore {
    userId: string;
    userName: string;
    overallScore: number;
    attendanceScore: number;
    punctualityScore: number;
    taskScore: number;
    leaveScore: number;
    trend: 'improving' | 'stable' | 'declining';
    insights: string[];
}

export interface TeamAnalytics {
    totalEmployees: number;
    averageScore: number;
    topPerformers: { name: string; score: number }[];
    needsAttention: { name: string; issue: string }[];
    attendanceRate: number;
    punctualityRate: number;
}

@Injectable()
export class AiAnalyticsService {
    private readonly logger = new Logger(AiAnalyticsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly aiService: AiService,
    ) { }

    /**
     * 📊 حساب نقاط الأداء للموظف
     */
    async calculateEmployeeScore(userId: string): Promise<EmployeeScore> {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // جلب بيانات الموظف
        const [user, attendanceData, leaveData, taskData] = await Promise.all([
            this.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, firstName: true, lastName: true },
            }),
            this.prisma.attendance.findMany({
                where: { userId, date: { gte: thirtyDaysAgo } },
            }),
            this.prisma.leaveRequest.findMany({
                where: { userId, createdAt: { gte: thirtyDaysAgo } },
            }),
            this.prisma.tasks.findMany({
                where: { assigneeId: userId, updatedAt: { gte: thirtyDaysAgo } },
            }),
        ]);

        // حساب نقاط الحضور
        const totalDays = attendanceData.length || 1;
        const presentDays = attendanceData.filter((a: any) =>
            a.status === 'PRESENT' || a.status === 'LATE'
        ).length;
        const attendanceScore = Math.round((presentDays / totalDays) * 100);

        // حساب نقاط الالتزام بالوقت
        const lateDays = attendanceData.filter((a: any) => a.status === 'LATE').length;
        const punctualityScore = Math.round(((totalDays - lateDays) / totalDays) * 100);

        // حساب نقاط المهام
        const completedTasks = taskData.filter((t: any) => t.status === 'COMPLETED').length;
        const totalTasks = taskData.length || 1;
        const taskScore = Math.round((completedTasks / totalTasks) * 100);

        // حساب نقاط الإجازات (استخدام معقول = أفضل)
        const approvedLeaves = leaveData.filter((l: any) => l.status === 'APPROVED').length;
        const leaveScore = approvedLeaves <= 2 ? 100 : Math.max(50, 100 - (approvedLeaves - 2) * 10);

        // حساب الدرجة الإجمالية (متوسط مرجح)
        const overallScore = Math.round(
            attendanceScore * 0.35 +
            punctualityScore * 0.25 +
            taskScore * 0.30 +
            leaveScore * 0.10
        );

        // تحديد الاتجاه (مبسط)
        const trend: 'improving' | 'stable' | 'declining' =
            overallScore >= 85 ? 'stable' :
                overallScore >= 70 ? 'improving' : 'declining';

        // استخراج الرؤى
        const insights: string[] = [];
        if (attendanceScore < 80) insights.push('⚠️ نسبة الحضور منخفضة');
        if (punctualityScore < 80) insights.push('⏰ يحتاج تحسين الالتزام بالوقت');
        if (taskScore < 70) insights.push('📋 معدل إنجاز المهام يحتاج تحسين');
        if (overallScore >= 90) insights.push('🌟 أداء متميز!');

        return {
            userId: user?.id || userId,
            userName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'موظف',
            overallScore,
            attendanceScore,
            punctualityScore,
            taskScore,
            leaveScore,
            trend,
            insights,
        };
    }

    /**
     * 👥 تحليلات الفريق
     */
    async getTeamAnalytics(companyId: string): Promise<TeamAnalytics> {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // جلب الموظفين
        const employees = await this.prisma.user.findMany({
            where: { companyId, status: 'ACTIVE', role: 'EMPLOYEE' },
            select: { id: true, firstName: true, lastName: true },
            take: 50,
        });

        // حساب نقاط الجميع
        const scores: EmployeeScore[] = [];
        for (const emp of employees.slice(0, 10)) { // Limit for performance
            try {
                const score = await this.calculateEmployeeScore(emp.id);
                scores.push(score);
            } catch (error) {
                this.logger.warn(`Failed to calculate score for ${emp.id}`);
            }
        }

        // أفضل 3 موظفين
        const sortedByScore = [...scores].sort((a, b) => b.overallScore - a.overallScore);
        const topPerformers = sortedByScore.slice(0, 3).map(s => ({
            name: s.userName,
            score: s.overallScore,
        }));

        // موظفين يحتاجون اهتمام
        const needsAttention = scores
            .filter(s => s.overallScore < 70 || s.insights.length > 1)
            .slice(0, 3)
            .map(s => ({
                name: s.userName,
                issue: s.insights[0] || 'يحتاج المتابعة',
            }));

        // حساب المتوسطات
        const avgScore = scores.length > 0
            ? Math.round(scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length)
            : 0;

        const avgAttendance = scores.length > 0
            ? Math.round(scores.reduce((sum, s) => sum + s.attendanceScore, 0) / scores.length)
            : 0;

        const avgPunctuality = scores.length > 0
            ? Math.round(scores.reduce((sum, s) => sum + s.punctualityScore, 0) / scores.length)
            : 0;

        return {
            totalEmployees: employees.length,
            averageScore: avgScore,
            topPerformers,
            needsAttention,
            attendanceRate: avgAttendance,
            punctualityRate: avgPunctuality,
        };
    }

    /**
     * 📈 رؤى الإنتاجية للموظف
     */
    async getProductivityInsights(userId: string): Promise<string> {
        try {
            const score = await this.calculateEmployeeScore(userId);

            const prompt = `أنت محلل أداء ذكي. بناءً على البيانات التالية لموظف، قدم 3-4 نصائح مختصرة لتحسين أدائه:

📊 بيانات الموظف:
- نقاط الأداء الإجمالية: ${score.overallScore}/100
- نقاط الحضور: ${score.attendanceScore}/100
- نقاط الالتزام بالوقت: ${score.punctualityScore}/100
- نقاط إنجاز المهام: ${score.taskScore}/100
- الاتجاه: ${score.trend === 'improving' ? 'تحسن' : score.trend === 'stable' ? 'مستقر' : 'تراجع'}

قدم نصائح عملية ومختصرة بالعربية واستخدم الإيموجي:`;

            return await this.aiService.generateContent(prompt);
        } catch (error) {
            this.logger.error(`Productivity insights error: ${error.message}`);
            return '❌ لم نتمكن من تحليل الإنتاجية حالياً';
        }
    }

    /**
     * 🔮 توقع احتمالية الغياب
     */
    async predictAbsence(userId: string): Promise<{
        probability: number;
        factors: string[];
        recommendation: string;
    }> {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [attendance, leaves] = await Promise.all([
            this.prisma.attendance.findMany({
                where: { userId, date: { gte: thirtyDaysAgo } },
            }),
            this.prisma.leaveRequest.findMany({
                where: { userId, createdAt: { gte: thirtyDaysAgo } },
            }),
        ]);

        // حساب عوامل الغياب
        const absentDays = attendance.filter((a: any) => a.status === 'ABSENT').length;
        const lateDays = attendance.filter((a: any) => a.status === 'LATE').length;
        const pendingLeaves = leaves.filter((l: any) => l.status === 'PENDING').length;

        // حساب الاحتمالية
        let probability = 10; // Base probability
        const factors: string[] = [];

        if (absentDays >= 3) {
            probability += 20;
            factors.push('سجل غياب متكرر');
        }
        if (lateDays >= 5) {
            probability += 15;
            factors.push('تأخير متكرر');
        }
        if (pendingLeaves > 0) {
            probability += 10;
            factors.push('طلبات إجازة معلقة');
        }

        // تحديد التوصية
        let recommendation = 'لا توجد مخاطر واضحة';
        if (probability >= 40) {
            recommendation = '⚠️ يُنصح بالتواصل مع الموظف لفهم أي تحديات';
        } else if (probability >= 25) {
            recommendation = '📋 متابعة الحضور والتأكد من انتظامه';
        }

        return {
            probability: Math.min(probability, 100),
            factors: factors.length > 0 ? factors : ['لا توجد عوامل خطر'],
            recommendation,
        };
    }

    /**
     * ⏰ كشف أنماط التأخير
     */
    async detectLatePatterns(companyId: string): Promise<{
        pattern: string;
        affectedEmployees: number;
        insights: string[];
    }> {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        const lateAttendance = await this.prisma.attendance.findMany({
            where: {
                user: { companyId },
                date: { gte: thirtyDaysAgo },
                status: 'LATE',
            },
            include: {
                user: { select: { firstName: true, lastName: true } },
            },
        });

        // تحليل الأنماط
        const dayOfWeekCount: Record<number, number> = {};
        const userLateCounts: Record<string, number> = {};

        for (const record of lateAttendance) {
            const att = record as any;
            const dayOfWeek = new Date(att.date).getDay();
            dayOfWeekCount[dayOfWeek] = (dayOfWeekCount[dayOfWeek] || 0) + 1;

            const userKey = `${record.user.firstName} ${record.user.lastName}`;
            userLateCounts[userKey] = (userLateCounts[userKey] || 0) + 1;
        }

        // تحديد النمط
        const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const maxDay = Object.entries(dayOfWeekCount).sort((a, b) => b[1] - a[1])[0];
        const pattern = maxDay
            ? `معظم التأخيرات تحدث يوم ${days[parseInt(maxDay[0])]}`
            : 'لا يوجد نمط محدد للتأخير';

        // عدد الموظفين المتأثرين
        const affectedEmployees = Object.keys(userLateCounts).length;

        // استخراج رؤى
        const insights: string[] = [];
        if (affectedEmployees > 5) {
            insights.push('📊 عدد كبير من الموظفين متأثرين بالتأخير');
        }
        const chronicLate = Object.entries(userLateCounts).filter(([_, count]) => count >= 5);
        if (chronicLate.length > 0) {
            insights.push(`⚠️ ${chronicLate.length} موظف(ين) لديهم تأخير متكرر`);
        }

        return {
            pattern,
            affectedEmployees,
            insights: insights.length > 0 ? insights : ['✅ لا توجد مشاكل كبيرة في التأخير'],
        };
    }
}
