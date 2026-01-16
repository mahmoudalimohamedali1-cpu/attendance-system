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
var TieredPenaltyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TieredPenaltyService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let TieredPenaltyService = TieredPenaltyService_1 = class TieredPenaltyService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(TieredPenaltyService_1.name);
    }
    async recordOccurrence(policyId, employeeId, occurrenceType, eventData) {
        let tracker = await this.prisma.smartPolicyOccurrenceTracker.findUnique({
            where: {
                policyId_employeeId_occurrenceType: {
                    policyId,
                    employeeId,
                    occurrenceType,
                },
            },
        });
        if (tracker && this.shouldReset(tracker)) {
            await this.resetTracker(tracker.id);
            tracker = await this.prisma.smartPolicyOccurrenceTracker.findUnique({
                where: { id: tracker.id },
            });
        }
        if (!tracker) {
            tracker = await this.prisma.smartPolicyOccurrenceTracker.create({
                data: {
                    policyId,
                    employeeId,
                    occurrenceType,
                    count: 1,
                    resetPeriod: 'MONTHLY',
                    lastOccurredAt: new Date(),
                    lastEventData: eventData,
                },
            });
            return 1;
        }
        const updated = await this.prisma.smartPolicyOccurrenceTracker.update({
            where: { id: tracker.id },
            data: {
                count: { increment: 1 },
                lastOccurredAt: new Date(),
                lastEventData: eventData,
            },
        });
        this.logger.log(`Occurrence recorded: ${occurrenceType} for employee ${employeeId}, count: ${updated.count}`);
        return updated.count;
    }
    async getOccurrenceCount(policyId, employeeId, occurrenceType) {
        const tracker = await this.prisma.smartPolicyOccurrenceTracker.findUnique({
            where: {
                policyId_employeeId_occurrenceType: {
                    policyId,
                    employeeId,
                    occurrenceType,
                },
            },
        });
        if (!tracker) {
            return 0;
        }
        if (this.shouldReset(tracker)) {
            await this.resetTracker(tracker.id);
            return 0;
        }
        return tracker.count;
    }
    async calculatePenalty(policyId, employeeId, occurrenceType, tiers, baseSalary) {
        const count = await this.getOccurrenceCount(policyId, employeeId, occurrenceType);
        const sortedTiers = [...tiers].sort((a, b) => b.minOccurrences - a.minOccurrences);
        let applicableTier = null;
        for (const tier of sortedTiers) {
            if (count >= tier.minOccurrences) {
                if (!tier.maxOccurrences || count <= tier.maxOccurrences) {
                    applicableTier = tier;
                    break;
                }
            }
        }
        if (!applicableTier) {
            return {
                tier: 0,
                occurrenceCount: count,
                action: { type: 'NONE' },
                calculatedAmount: 0,
                explanation: `عدد المرات (${count}) لا تنطبق عليه أي عقوبة`,
            };
        }
        let calculatedAmount = 0;
        const action = applicableTier.action;
        if (action.type === 'DEDUCT' || action.type === 'ADD') {
            if (action.valueType === 'FIXED') {
                calculatedAmount = action.value || 0;
                if (action.perOccurrence && count > applicableTier.minOccurrences) {
                    const extraOccurrences = count - applicableTier.minOccurrences + 1;
                    calculatedAmount = (action.value || 0) * extraOccurrences;
                }
            }
            else if (action.valueType === 'PERCENTAGE') {
                calculatedAmount = baseSalary * ((action.value || 0) / 100);
            }
            else if (action.valueType === 'FORMULA' && action.formula) {
                calculatedAmount = this.evaluateFormula(action.formula, {
                    count,
                    baseSalary,
                    value: action.value || 0,
                    extra: Math.max(0, count - applicableTier.minOccurrences),
                });
            }
        }
        const explanation = this.generateExplanation(applicableTier, count, calculatedAmount, occurrenceType);
        return {
            tier: applicableTier.tier,
            occurrenceCount: count,
            action: applicableTier.action,
            calculatedAmount: Math.round(calculatedAmount * 100) / 100,
            explanation,
        };
    }
    async resetTracker(trackerId) {
        await this.prisma.smartPolicyOccurrenceTracker.update({
            where: { id: trackerId },
            data: {
                count: 0,
                lastResetAt: new Date(),
            },
        });
        this.logger.log(`Tracker reset: ${trackerId}`);
    }
    async resetAllForPolicy(policyId) {
        const result = await this.prisma.smartPolicyOccurrenceTracker.updateMany({
            where: { policyId },
            data: {
                count: 0,
                lastResetAt: new Date(),
            },
        });
        this.logger.log(`Reset ${result.count} trackers for policy ${policyId}`);
        return result.count;
    }
    async updateResetPeriod(policyId, employeeId, occurrenceType, resetPeriod) {
        await this.prisma.smartPolicyOccurrenceTracker.updateMany({
            where: {
                policyId,
                employeeId,
                occurrenceType,
            },
            data: { resetPeriod },
        });
    }
    async getOccurrenceStats(policyId) {
        const trackers = await this.prisma.smartPolicyOccurrenceTracker.findMany({
            where: { policyId },
        });
        const stats = {
            totalTrackers: trackers.length,
            totalOccurrences: trackers.reduce((sum, t) => sum + t.count, 0),
            byType: {},
            topOffenders: [],
        };
        for (const tracker of trackers) {
            if (!stats.byType[tracker.occurrenceType]) {
                stats.byType[tracker.occurrenceType] = { count: 0, employees: 0 };
            }
            stats.byType[tracker.occurrenceType].count += tracker.count;
            stats.byType[tracker.occurrenceType].employees++;
        }
        stats.topOffenders = trackers
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
            .map(t => ({
            employeeId: t.employeeId,
            count: t.count,
            type: t.occurrenceType,
        }));
        return stats;
    }
    async getEmployeeOccurrenceHistory(employeeId) {
        return this.prisma.smartPolicyOccurrenceTracker.findMany({
            where: { employeeId },
            include: {
                policy: {
                    select: { id: true, name: true, originalText: true },
                },
            },
            orderBy: { lastOccurredAt: 'desc' },
        });
    }
    async processAutoResets() {
        const trackers = await this.prisma.smartPolicyOccurrenceTracker.findMany({
            where: {
                count: { gt: 0 },
            },
        });
        let resetCount = 0;
        for (const tracker of trackers) {
            if (this.shouldReset(tracker)) {
                await this.resetTracker(tracker.id);
                resetCount++;
            }
        }
        if (resetCount > 0) {
            this.logger.log(`Auto-reset completed: ${resetCount} trackers reset`);
        }
        return resetCount;
    }
    shouldReset(tracker) {
        const now = new Date();
        const lastReset = new Date(tracker.lastResetAt);
        switch (tracker.resetPeriod) {
            case 'MONTHLY':
                return (now.getMonth() !== lastReset.getMonth() ||
                    now.getFullYear() !== lastReset.getFullYear());
            case 'QUARTERLY':
                const currentQuarter = Math.floor(now.getMonth() / 3);
                const lastQuarter = Math.floor(lastReset.getMonth() / 3);
                return (currentQuarter !== lastQuarter ||
                    now.getFullYear() !== lastReset.getFullYear());
            case 'YEARLY':
                return now.getFullYear() !== lastReset.getFullYear();
            case 'NEVER':
                return false;
            default:
                return false;
        }
    }
    evaluateFormula(formula, context) {
        try {
            let expression = formula
                .replace(/\bcount\b/g, context.count.toString())
                .replace(/\bbaseSalary\b/g, context.baseSalary.toString())
                .replace(/\bvalue\b/g, context.value.toString())
                .replace(/\bextra\b/g, context.extra.toString());
            const fn = new Function(`return ${expression}`);
            return fn();
        }
        catch (error) {
            this.logger.error(`Formula evaluation error: ${formula}`, error);
            return 0;
        }
    }
    generateExplanation(tier, count, amount, occurrenceType) {
        const typeLabels = {
            LATE: 'تأخير',
            ABSENCE: 'غياب',
            EARLY_DEPARTURE: 'خروج مبكر',
        };
        const typeName = typeLabels[occurrenceType] || occurrenceType;
        if (tier.action.type === 'NONE') {
            return `المرة ${count} من ${typeName}: لا عقوبة`;
        }
        const actionLabel = tier.action.type === 'DEDUCT' ? 'خصم' : 'إضافة';
        if (tier.action.perOccurrence) {
            const extra = count - tier.minOccurrences + 1;
            return `المرة ${count} من ${typeName}: ${actionLabel} ${amount} ريال (${extra} × ${tier.action.value})`;
        }
        return `المرة ${count} من ${typeName}: ${actionLabel} ${amount} ريال`;
    }
};
exports.TieredPenaltyService = TieredPenaltyService;
exports.TieredPenaltyService = TieredPenaltyService = TieredPenaltyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TieredPenaltyService);
//# sourceMappingURL=tiered-penalty.service.js.map