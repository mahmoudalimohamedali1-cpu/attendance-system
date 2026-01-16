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
var AiManagerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiManagerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const ai_service_1 = require("../ai/ai.service");
let AiManagerService = AiManagerService_1 = class AiManagerService {
    constructor(prisma, aiService) {
        this.prisma = prisma;
        this.aiService = aiService;
        this.logger = new common_1.Logger(AiManagerService_1.name);
    }
    async getTeamHealthScore(companyId) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
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
        const totalAttendance = attendanceData.length || 1;
        const presentDays = attendanceData.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
        const attendanceHealth = Math.round((presentDays / totalAttendance) * 100);
        const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
        const totalTasks = tasks.length || 1;
        const productivityHealth = Math.round((completedTasks / totalTasks) * 100);
        const overallHealth = Math.round((attendanceHealth + productivityHealth) / 2);
        let moraleIndicator;
        if (overallHealth >= 85)
            moraleIndicator = 'excellent';
        else if (overallHealth >= 70)
            moraleIndicator = 'good';
        else if (overallHealth >= 50)
            moraleIndicator = 'fair';
        else
            moraleIndicator = 'poor';
        const alerts = [];
        const lateDays = attendanceData.filter((a) => a.status === 'LATE').length;
        const absentDays = attendanceData.filter((a) => a.status === 'ABSENT').length;
        if (lateDays > attendanceData.length * 0.2) {
            alerts.push('⏰ نسبة التأخير مرتفعة (أكثر من 20%)');
        }
        if (absentDays > attendanceData.length * 0.1) {
            alerts.push('🚫 نسبة الغياب مرتفعة (أكثر من 10%)');
        }
        if (productivityHealth < 60) {
            alerts.push('📋 إنتاجية المهام منخفضة');
        }
        const recommendations = [];
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
    async analyzeWorkloadDistribution(companyId) {
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
        const workloads = employees.map(e => ({
            name: `${e.firstName} ${e.lastName}`,
            taskCount: e._count?.assignedTasks || 0,
        }));
        const avgTaskCount = workloads.reduce((sum, w) => sum + w.taskCount, 0) / (workloads.length || 1);
        const overloadedEmployees = workloads
            .filter(w => w.taskCount > avgTaskCount * 1.5)
            .slice(0, 5);
        const underutilizedEmployees = workloads
            .filter(w => w.taskCount < avgTaskCount * 0.5)
            .slice(0, 5);
        const balanced = overloadedEmployees.length === 0 && underutilizedEmployees.length === 0;
        let recommendation;
        if (balanced) {
            recommendation = '✅ توزيع العمل متوازن';
        }
        else if (overloadedEmployees.length > 0) {
            recommendation = `⚠️ إعادة توزيع المهام من ${overloadedEmployees[0].name} إلى موظفين آخرين`;
        }
        else {
            recommendation = '📋 يمكن تعيين مهام إضافية للموظفين غير المشغولين';
        }
        return {
            balanced,
            overloadedEmployees,
            underutilizedEmployees,
            recommendation,
        };
    }
    async detectBurnoutRisks(companyId) {
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
        const burnoutRisks = [];
        for (const emp of employees) {
            const indicators = [];
            let riskScore = 0;
            const attendance = await this.prisma.attendance.findMany({
                where: {
                    userId: emp.id,
                    date: { gte: thirtyDaysAgo },
                },
            });
            const avgOvertimeMinutes = attendance.reduce((sum, a) => {
                const overtime = a.overtimeMinutes || 0;
                return sum + overtime;
            }, 0) / (attendance.length || 1);
            if (avgOvertimeMinutes > 60) {
                riskScore += 30;
                indicators.push('⏱️ ساعات إضافية مفرطة');
            }
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
            const lateCount = attendance.filter((a) => a.status === 'LATE').length;
            if (lateCount >= 5) {
                riskScore += 15;
                indicators.push('⏰ تأخير متكرر');
            }
            if (riskScore >= 40) {
                const riskLevel = riskScore >= 60 ? 'high' : riskScore >= 40 ? 'medium' : 'low';
                const suggestedActions = [];
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
    async getManagerInsights(companyId) {
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
        }
        catch (error) {
            this.logger.error(`Manager insights error: ${error.message}`);
            return '❌ لم نتمكن من تحليل البيانات حالياً';
        }
    }
};
exports.AiManagerService = AiManagerService;
exports.AiManagerService = AiManagerService = AiManagerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_service_1.AiService])
], AiManagerService);
//# sourceMappingURL=ai-manager.service.js.map