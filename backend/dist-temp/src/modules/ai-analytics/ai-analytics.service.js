"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AiAnalyticsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiAnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const ai_service_1 = require("../ai/ai.service");
let AiAnalyticsService = AiAnalyticsService_1 = class AiAnalyticsService {
    constructor(prisma, aiService) {
        this.prisma = prisma;
        this.aiService = aiService;
        this.logger = new common_1.Logger(AiAnalyticsService_1.name);
    }
    async calculateEmployeeScore(userId) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
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
            this.prisma.task.findMany({
                where: { assigneeId: userId, updatedAt: { gte: thirtyDaysAgo } },
            }),
        ]);
        const totalDays = attendanceData.length || 1;
        const presentDays = attendanceData.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
        const attendanceScore = Math.round((presentDays / totalDays) * 100);
        const lateDays = attendanceData.filter((a) => a.status === 'LATE').length;
        const punctualityScore = Math.round(((totalDays - lateDays) / totalDays) * 100);
        const completedTasks = taskData.filter((t) => t.status === 'COMPLETED').length;
        const totalTasks = taskData.length || 1;
        const taskScore = Math.round((completedTasks / totalTasks) * 100);
        const approvedLeaves = leaveData.filter((l) => l.status === 'APPROVED').length;
        const leaveScore = approvedLeaves <= 2 ? 100 : Math.max(50, 100 - (approvedLeaves - 2) * 10);
        const overallScore = Math.round(attendanceScore * 0.35 +
            punctualityScore * 0.25 +
            taskScore * 0.30 +
            leaveScore * 0.10);
        const trend = overallScore >= 85 ? 'stable' :
            overallScore >= 70 ? 'improving' : 'declining';
        const insights = [];
        if (attendanceScore < 80)
            insights.push('⚠️ نسبة الحضور منخفضة');
        if (punctualityScore < 80)
            insights.push('⏰ يحتاج تحسين الالتزام بالوقت');
        if (taskScore < 70)
            insights.push('📋 معدل إنجاز المهام يحتاج تحسين');
        if (overallScore >= 90)
            insights.push('🌟 أداء متميز!');
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
    async getTeamAnalytics(companyId) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const employees = await this.prisma.user.findMany({
            where: { companyId, status: 'ACTIVE', role: 'EMPLOYEE' },
            select: { id: true, firstName: true, lastName: true },
            take: 50,
        });
        const scores = [];
        for (const emp of employees.slice(0, 10)) {
            try {
                const score = await this.calculateEmployeeScore(emp.id);
                scores.push(score);
            }
            catch (error) {
                this.logger.warn(`Failed to calculate score for ${emp.id}`);
            }
        }
        const sortedByScore = [...scores].sort((a, b) => b.overallScore - a.overallScore);
        const topPerformers = sortedByScore.slice(0, 3).map(s => ({
            name: s.userName,
            score: s.overallScore,
        }));
        const needsAttention = scores
            .filter(s => s.overallScore < 70 || s.insights.length > 1)
            .slice(0, 3)
            .map(s => ({
            name: s.userName,
            issue: s.insights[0] || 'يحتاج المتابعة',
        }));
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
    async getProductivityInsights(userId) {
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
        }
        catch (error) {
            this.logger.error(`Productivity insights error: ${error.message}`);
            return '❌ لم نتمكن من تحليل الإنتاجية حالياً';
        }
    }
    async predictAbsence(userId) {
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
        const absentDays = attendance.filter((a) => a.status === 'ABSENT').length;
        const lateDays = attendance.filter((a) => a.status === 'LATE').length;
        const pendingLeaves = leaves.filter((l) => l.status === 'PENDING').length;
        let probability = 10;
        const factors = [];
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
        let recommendation = 'لا توجد مخاطر واضحة';
        if (probability >= 40) {
            recommendation = '⚠️ يُنصح بالتواصل مع الموظف لفهم أي تحديات';
        }
        else if (probability >= 25) {
            recommendation = '📋 متابعة الحضور والتأكد من انتظامه';
        }
        return {
            probability: Math.min(probability, 100),
            factors: factors.length > 0 ? factors : ['لا توجد عوامل خطر'],
            recommendation,
        };
    }
    async detectLatePatterns(companyId) {
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
        const dayOfWeekCount = {};
        const userLateCounts = {};
        for (const record of lateAttendance) {
            const att = record;
            const dayOfWeek = new Date(att.date).getDay();
            dayOfWeekCount[dayOfWeek] = (dayOfWeekCount[dayOfWeek] || 0) + 1;
            const userKey = `${record.user.firstName} ${record.user.lastName}`;
            userLateCounts[userKey] = (userLateCounts[userKey] || 0) + 1;
        }
        const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const maxDay = Object.entries(dayOfWeekCount).sort((a, b) => b[1] - a[1])[0];
        const pattern = maxDay
            ? `معظم التأخيرات تحدث يوم ${days[parseInt(maxDay[0])]}`
            : 'لا يوجد نمط محدد للتأخير';
        const affectedEmployees = Object.keys(userLateCounts).length;
        const insights = [];
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
};
exports.AiAnalyticsService = AiAnalyticsService;
exports.AiAnalyticsService = AiAnalyticsService = AiAnalyticsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_service_1.AiService])
], AiAnalyticsService);
//# sourceMappingURL=ai-analytics.service.js.map