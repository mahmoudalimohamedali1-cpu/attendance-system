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
var PolicyAnalyticsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyAnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let PolicyAnalyticsService = PolicyAnalyticsService_1 = class PolicyAnalyticsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(PolicyAnalyticsService_1.name);
    }
    async getAnalytics(companyId, dateRange) {
        const startDate = dateRange?.startDate || new Date(new Date().setMonth(new Date().getMonth() - 3));
        const endDate = dateRange?.endDate || new Date();
        this.logger.log(`[ANALYTICS] Fetching for company ${companyId} from ${startDate} to ${endDate}`);
        const [policies, executions, executionStats] = await Promise.all([
            this.prisma.smartPolicy.findMany({
                where: { companyId },
                select: {
                    id: true,
                    originalText: true,
                    isActive: true,
                    executionCount: true,
                    totalAmountPaid: true,
                    totalAmountDeduct: true,
                    triggerEvent: true,
                },
            }),
            this.prisma.smartPolicyExecution.findMany({
                where: {
                    policy: { companyId },
                    executedAt: { gte: startDate, lte: endDate },
                },
                orderBy: { executedAt: 'desc' },
                take: 50,
                include: {
                    policy: { select: { originalText: true } },
                },
            }),
            this.prisma.smartPolicyExecution.aggregate({
                where: {
                    policy: { companyId },
                    executedAt: { gte: startDate, lte: endDate },
                },
                _count: { id: true },
            }),
        ]);
        const activePolicies = policies.filter(p => p.isActive);
        const totalDeductions = policies.reduce((sum, p) => sum + Number(p.totalAmountDeduct || 0), 0);
        const totalBonuses = policies.reduce((sum, p) => sum + Number(p.totalAmountPaid || 0), 0);
        const triggerDistribution = {};
        policies.forEach((p) => {
            const trigger = p.triggerEvent || 'UNKNOWN';
            triggerDistribution[trigger] = (triggerDistribution[trigger] || 0) + 1;
        });
        const topPolicies = policies
            .filter((p) => p.executionCount > 0)
            .sort((a, b) => b.executionCount - a.executionCount)
            .slice(0, 10)
            .map((p) => ({
            id: p.id,
            name: (p.originalText || '').substring(0, 50),
            executionCount: p.executionCount,
            totalImpact: Number(p.totalAmountDeduct || 0) + Number(p.totalAmountPaid || 0),
        }));
        const recentExecutions = executions.slice(0, 20).map((e) => ({
            id: e.id,
            policyName: (e.policy?.originalText || '').substring(0, 40),
            employeeName: e.employeeName,
            actionType: e.actionType || 'UNKNOWN',
            amount: Number(e.actionValue || 0),
            executedAt: e.executedAt,
        }));
        const trendMap = new Map();
        executions.forEach((e) => {
            const period = `${e.executedAt.getFullYear()}-${String(e.executedAt.getMonth() + 1).padStart(2, '0')}`;
            const current = trendMap.get(period) || { executions: 0, deductions: 0, bonuses: 0 };
            current.executions++;
            if (e.actionType === 'DEDUCT') {
                current.deductions += Number(e.actionValue || 0);
            }
            else {
                current.bonuses += Number(e.actionValue || 0);
            }
            trendMap.set(period, current);
        });
        const executionTrends = Array.from(trendMap.entries())
            .map(([period, data]) => ({ period, ...data }))
            .sort((a, b) => a.period.localeCompare(b.period));
        return {
            summary: {
                totalPolicies: policies.length,
                activePolicies: activePolicies.length,
                totalExecutions: executionStats._count.id,
                totalDeductions,
                totalBonuses,
                avgExecutionsPerPolicy: policies.length > 0
                    ? Math.round(executionStats._count.id / policies.length)
                    : 0,
            },
            executionTrends,
            topPolicies,
            triggerDistribution,
            recentExecutions,
        };
    }
    async getPolicyHealthScore(policyId) {
        const policy = await this.prisma.smartPolicy.findUnique({
            where: { id: policyId },
            include: {
                executions: {
                    orderBy: { executedAt: 'desc' },
                    take: 100,
                },
            },
        });
        if (!policy) {
            throw new Error('Policy not found');
        }
        const successfulExecutions = policy.executions.filter((e) => e.isSuccess).length;
        const totalExecutions = policy.executions.length;
        const executionSuccessRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;
        const totalImpact = policy.executions.reduce((sum, e) => sum + Number(e.actionValue || 0), 0);
        const averageImpact = totalExecutions > 0 ? totalImpact / totalExecutions : 0;
        const recommendations = [];
        if (executionSuccessRate < 80) {
            recommendations.push('معدل نجاح التنفيذ منخفض - تحقق من شروط السياسة');
        }
        if (totalExecutions === 0) {
            recommendations.push('لم يتم تنفيذ هذه السياسة - تحقق من الشروط والمشغلات');
        }
        if (!policy.isActive) {
            recommendations.push('السياسة غير نشطة حالياً');
        }
        const overallScore = Math.round((executionSuccessRate * 0.4) +
            (Math.min(totalExecutions, 100) * 0.3) +
            (policy.isActive ? 30 : 0));
        return {
            policyId,
            overallScore: Math.min(overallScore, 100),
            metrics: {
                executionSuccessRate,
                averageImpact,
                usageFrequency: totalExecutions,
                employeeCoverage: 0,
            },
            recommendations,
        };
    }
};
exports.PolicyAnalyticsService = PolicyAnalyticsService;
exports.PolicyAnalyticsService = PolicyAnalyticsService = PolicyAnalyticsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PolicyAnalyticsService);
//# sourceMappingURL=policy-analytics.service.js.map