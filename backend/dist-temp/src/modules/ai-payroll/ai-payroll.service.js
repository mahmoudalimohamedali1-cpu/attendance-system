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
var AiPayrollService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiPayrollService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const ai_service_1 = require("../ai/ai.service");
let AiPayrollService = AiPayrollService_1 = class AiPayrollService {
    constructor(prisma, aiService) {
        this.prisma = prisma;
        this.aiService = aiService;
        this.logger = new common_1.Logger(AiPayrollService_1.name);
    }
    async detectSalaryAnomalies(companyId) {
        const anomalies = [];
        const employees = await this.prisma.user.findMany({
            where: { companyId, status: 'ACTIVE' },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                salary: true,
            },
            take: 50,
        });
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        for (const emp of employees) {
            const baseSalary = Number(emp.salary) || 0;
            if (baseSalary === 0)
                continue;
            const advances = await this.prisma.advanceRequest.findMany({
                where: {
                    userId: emp.id,
                    status: 'APPROVED',
                    createdAt: { gte: thirtyDaysAgo },
                },
            });
            const totalAdvances = advances.reduce((sum, a) => sum + Number(a.amount || 0), 0);
            if (totalAdvances > baseSalary * 0.5) {
                anomalies.push({
                    employeeId: emp.id,
                    employeeName: `${emp.firstName} ${emp.lastName}`,
                    anomalyType: 'high_advances',
                    description: `سلف تتجاوز 50% من الراتب (${totalAdvances} ريال)`,
                    severity: 'high',
                    suggestedAction: 'مراجعة سياسة السلف ومتابعة السداد',
                });
            }
            const absences = await this.prisma.attendance.count({
                where: {
                    userId: emp.id,
                    date: { gte: thirtyDaysAgo },
                    status: 'ABSENT',
                },
            });
            if (absences >= 5) {
                anomalies.push({
                    employeeId: emp.id,
                    employeeName: `${emp.firstName} ${emp.lastName}`,
                    anomalyType: 'high_absence',
                    description: `غياب ${absences} أيام (قد يؤثر على الراتب)`,
                    severity: absences >= 10 ? 'high' : 'medium',
                    suggestedAction: 'مراجعة سبب الغياب وتطبيق الخصومات',
                });
            }
        }
        return anomalies;
    }
    async assessAdvanceRisk(userId, requestedAmount) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                salary: true,
                hireDate: true,
            },
        });
        if (!user) {
            return {
                userId,
                userName: 'غير موجود',
                riskLevel: 'high',
                riskScore: 100,
                factors: ['لم يتم العثور على الموظف'],
                recommendation: 'رفض الطلب',
                maxRecommendedAmount: 0,
            };
        }
        const baseSalary = Number(user.salary) || 0;
        const factors = [];
        let riskScore = 0;
        const salaryRatio = requestedAmount / (baseSalary || 1);
        if (salaryRatio > 0.5) {
            riskScore += 30;
            factors.push('السلفة تتجاوز 50% من الراتب');
        }
        else if (salaryRatio > 0.3) {
            riskScore += 15;
            factors.push('السلفة تتجاوز 30% من الراتب');
        }
        const previousAdvances = await this.prisma.advanceRequest.count({
            where: {
                userId,
                status: 'APPROVED',
            },
        });
        if (previousAdvances >= 3) {
            riskScore += 25;
            factors.push(`${previousAdvances} سلفة سابقة معتمدة`);
        }
        if (user.hireDate) {
            const monthsOfService = Math.floor((Date.now() - new Date(user.hireDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
            if (monthsOfService < 3) {
                riskScore += 20;
                factors.push('مدة الخدمة أقل من 3 أشهر');
            }
        }
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const badAttendance = await this.prisma.attendance.count({
            where: {
                userId,
                date: { gte: thirtyDaysAgo },
                status: { in: ['LATE', 'ABSENT'] },
            },
        });
        if (badAttendance >= 5) {
            riskScore += 15;
            factors.push('حضور غير منتظم');
        }
        const riskLevel = riskScore >= 50 ? 'high' : riskScore >= 25 ? 'medium' : 'low';
        let recommendation;
        let maxRecommendedAmount;
        if (riskLevel === 'high') {
            recommendation = '⛔ يُنصح برفض الطلب أو طلب ضمانات إضافية';
            maxRecommendedAmount = baseSalary * 0.1;
        }
        else if (riskLevel === 'medium') {
            recommendation = '⚠️ يُنصح بموافقة جزئية مع متابعة السداد';
            maxRecommendedAmount = baseSalary * 0.3;
        }
        else {
            recommendation = '✅ الموافقة آمنة';
            maxRecommendedAmount = baseSalary * 0.5;
        }
        return {
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            riskLevel,
            riskScore: Math.min(riskScore, 100),
            factors: factors.length > 0 ? factors : ['لا توجد عوامل خطر'],
            recommendation,
            maxRecommendedAmount,
        };
    }
    async getDeductionOptimizations(userId) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { salary: true },
            });
            const baseSalary = Number(user?.salary) || 0;
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const [advances, lateCount, absentCount] = await Promise.all([
                this.prisma.advanceRequest.findMany({
                    where: { userId, status: 'APPROVED', createdAt: { gte: thirtyDaysAgo } },
                }),
                this.prisma.attendance.count({
                    where: { userId, date: { gte: thirtyDaysAgo }, status: 'LATE' },
                }),
                this.prisma.attendance.count({
                    where: { userId, date: { gte: thirtyDaysAgo }, status: 'ABSENT' },
                }),
            ]);
            const totalAdvances = advances.reduce((sum, a) => sum + Number(a.amount || 0), 0);
            const prompt = `أنت خبير موارد بشرية. قدم 2-3 نصائح مختصرة لتحسين وضع الموظف:

📊 البيانات:
- الراتب الأساسي: ${baseSalary} ريال
- إجمالي السلف: ${totalAdvances} ريال
- أيام التأخير: ${lateCount}
- أيام الغياب: ${absentCount}

قدم نصائح عملية بالعربية:`;
            return await this.aiService.generateContent(prompt);
        }
        catch (error) {
            this.logger.error(`Deduction optimization error: ${error.message}`);
            return '❌ لم نتمكن من التحليل حالياً';
        }
    }
    async getSalaryTrends(companyId) {
        const employees = await this.prisma.user.findMany({
            where: { companyId, status: 'ACTIVE' },
            select: { salary: true },
        });
        const salaries = employees.map(e => Number(e.salary) || 0).filter(s => s > 0);
        const totalPayroll = salaries.reduce((sum, s) => sum + s, 0);
        const averageSalary = salaries.length > 0 ? Math.round(totalPayroll / salaries.length) : 0;
        const insights = [];
        if (averageSalary < 5000) {
            insights.push('💰 متوسط الرواتب منخفض');
        }
        else if (averageSalary > 15000) {
            insights.push('✅ متوسط الرواتب جيد');
        }
        if (employees.length > 50) {
            insights.push('📊 فريق كبير - يُنصح بمراجعة هيكل الرواتب سنوياً');
        }
        return {
            averageSalary,
            totalPayroll,
            employeeCount: employees.length,
            insights: insights.length > 0 ? insights : ['✅ لا توجد ملاحظات'],
        };
    }
};
exports.AiPayrollService = AiPayrollService;
exports.AiPayrollService = AiPayrollService = AiPayrollService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_service_1.AiService])
], AiPayrollService);
//# sourceMappingURL=ai-payroll.service.js.map