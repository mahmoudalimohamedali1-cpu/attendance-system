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
var AiPredictiveService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiPredictiveService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const ai_service_1 = require("../ai/ai.service");
let AiPredictiveService = AiPredictiveService_1 = class AiPredictiveService {
    constructor(prisma, aiService) {
        this.prisma = prisma;
        this.aiService = aiService;
        this.logger = new common_1.Logger(AiPredictiveService_1.name);
    }
    async forecastAttendance(companyId, days = 7) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const [employees, historicalAttendance] = await Promise.all([
            this.prisma.user.count({
                where: { companyId, status: 'ACTIVE', role: 'EMPLOYEE' },
            }),
            this.prisma.attendance.findMany({
                where: {
                    user: { companyId },
                    date: { gte: thirtyDaysAgo },
                },
            }),
        ]);
        const totalRecords = historicalAttendance.length || 1;
        const presentRecords = historicalAttendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
        const historicalRate = (presentRecords / totalRecords) * 100;
        const dayAbsenceRate = {};
        for (const record of historicalAttendance) {
            const att = record;
            const dayOfWeek = new Date(att.date).getDay();
            if (att.status === 'ABSENT') {
                dayAbsenceRate[dayOfWeek] = (dayAbsenceRate[dayOfWeek] || 0) + 1;
            }
        }
        const days_ar = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const riskDays = Object.entries(dayAbsenceRate)
            .filter(([_, count]) => count > 2)
            .map(([day]) => days_ar[parseInt(day)]);
        const expectedAttendanceRate = Math.round(historicalRate * 0.95);
        const expectedAbsences = Math.round(employees * (1 - expectedAttendanceRate / 100) * days);
        const insights = [];
        if (expectedAttendanceRate < 85) {
            insights.push('⚠️ توقع انخفاض في الحضور');
        }
        if (riskDays.length > 0) {
            insights.push(`📅 أيام ذات غياب مرتفع: ${riskDays.join(', ')}`);
        }
        return {
            period: `${days} أيام القادمة`,
            expectedAttendanceRate,
            expectedAbsences,
            riskDays,
            insights: insights.length > 0 ? insights : ['✅ توقعات حضور مستقرة'],
        };
    }
    async predictTurnover(companyId) {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const employees = await this.prisma.user.findMany({
            where: { companyId, status: 'ACTIVE', role: 'EMPLOYEE' },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                hireDate: true,
                salary: true,
            },
            take: 30,
        });
        const atRiskEmployees = [];
        for (const emp of employees) {
            const riskFactors = [];
            if (emp.hireDate) {
                const monthsOfService = Math.floor((Date.now() - new Date(emp.hireDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
                if (monthsOfService < 6) {
                    riskFactors.push('موظف جديد');
                }
            }
            const absentCount = await this.prisma.attendance.count({
                where: {
                    userId: emp.id,
                    date: { gte: sixMonthsAgo },
                    status: 'ABSENT',
                },
            });
            if (absentCount >= 10) {
                riskFactors.push('غياب متكرر');
            }
            const leaveCount = await this.prisma.leaveRequest.count({
                where: {
                    userId: emp.id,
                    status: 'APPROVED',
                    createdAt: { gte: sixMonthsAgo },
                },
            });
            if (leaveCount === 0) {
                riskFactors.push('لم يأخذ إجازة');
            }
            if (riskFactors.length >= 2) {
                atRiskEmployees.push({
                    name: `${emp.firstName} ${emp.lastName}`,
                    riskFactors,
                });
            }
        }
        const riskPercentage = (atRiskEmployees.length / employees.length) * 100;
        const riskLevel = riskPercentage >= 30 ? 'high' : riskPercentage >= 15 ? 'medium' : 'low';
        const recommendations = [];
        if (riskLevel !== 'low') {
            recommendations.push('🗣️ إجراء استطلاع رضا الموظفين');
            recommendations.push('💰 مراجعة سياسات التعويضات');
        }
        if (atRiskEmployees.length > 0) {
            recommendations.push('👥 اجتماعات فردية مع الموظفين المعرضين للخطر');
        }
        return {
            riskLevel,
            atRiskEmployees: atRiskEmployees.slice(0, 5),
            recommendations: recommendations.length > 0 ? recommendations : ['✅ معدل دوران منخفض'],
        };
    }
    async forecastCosts(companyId) {
        const employees = await this.prisma.user.findMany({
            where: { companyId, status: 'ACTIVE' },
            select: { salary: true },
        });
        const currentMonthlyPayroll = employees.reduce((sum, e) => sum + Number(e.salary || 0), 0);
        const projectedNextMonth = Math.round(currentMonthlyPayroll * 1.02);
        const potentialSavings = [];
        if (employees.length > 20) {
            potentialSavings.push('📊 مراجعة هيكل الرواتب للكفاءة');
        }
        const budgetAlerts = [];
        if (currentMonthlyPayroll > 500000) {
            budgetAlerts.push('💰 إجمالي الرواتب مرتفع');
        }
        return {
            currentMonthlyPayroll,
            projectedNextMonth,
            potentialSavings: potentialSavings.length > 0 ? potentialSavings : ['✅ لا توجد فرص توفير واضحة'],
            budgetAlerts: budgetAlerts.length > 0 ? budgetAlerts : ['✅ الميزانية ضمن الحدود'],
        };
    }
    async getAiPredictions(companyId) {
        try {
            const [attendance, turnover, costs] = await Promise.all([
                this.forecastAttendance(companyId),
                this.predictTurnover(companyId),
                this.forecastCosts(companyId),
            ]);
            const prompt = `أنت محلل بيانات ذكي. بناءً على البيانات التالية، قدم 3 توقعات مختصرة للأسبوع القادم:

📊 توقعات الحضور:
- نسبة الحضور المتوقعة: ${attendance.expectedAttendanceRate}%
- الغياب المتوقع: ${attendance.expectedAbsences} يوم

🚪 معدل الدوران:
- مستوى المخاطر: ${turnover.riskLevel}
- موظفين معرضين للخطر: ${turnover.atRiskEmployees.length}

💰 التكاليف:
- راتب الشهر الحالي: ${costs.currentMonthlyPayroll.toLocaleString('ar-SA')} ريال
- المتوقع الشهر القادم: ${costs.projectedNextMonth.toLocaleString('ar-SA')} ريال

قدم توقعات عملية ومختصرة بالعربية:`;
            return await this.aiService.generateContent(prompt);
        }
        catch (error) {
            this.logger.error(`AI predictions error: ${error.message}`);
            return '❌ لم نتمكن من تحليل التوقعات حالياً';
        }
    }
};
exports.AiPredictiveService = AiPredictiveService;
exports.AiPredictiveService = AiPredictiveService = AiPredictiveService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_service_1.AiService])
], AiPredictiveService);
//# sourceMappingURL=ai-predictive.service.js.map