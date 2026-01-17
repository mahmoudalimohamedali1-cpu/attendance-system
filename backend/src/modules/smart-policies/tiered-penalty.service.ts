import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OccurrenceResetPeriod } from '@prisma/client';

/**
 * تكوين العقوبة المتدرجة
 */
export interface TieredPenaltyConfig {
    tier: number;
    minOccurrences: number;
    maxOccurrences?: number;
    action: {
        type: 'NONE' | 'DEDUCT' | 'ADD' | 'NOTIFY';
        value?: number;
        valueType?: 'FIXED' | 'PERCENTAGE' | 'FORMULA';
        perOccurrence?: boolean; // Apply for each occurrence above min
        formula?: string;
    };
}

/**
 * نتيجة حساب العقوبة
 */
export interface TieredPenaltyResult {
    tier: number;
    occurrenceCount: number;
    action: TieredPenaltyConfig['action'];
    calculatedAmount: number;
    explanation: string;
}

/**
 * خدمة محرك العقوبات المتدرجة
 * Priority 2: Tiered Penalty Engine
 * 
 * تتيح هذه الخدمة:
 * - تتبع عدد مرات التأخير/الغياب/إلخ لكل موظف
 * - تطبيق عقوبات متدرجة (الأولى = 0، الثانية = 50، الثالثة فما فوق = 100)
 * - إعادة تعيين العداد شهرياً/ربع سنوياً/سنوياً
 */
@Injectable()
export class TieredPenaltyService {
    private readonly logger = new Logger(TieredPenaltyService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * تسجيل حدث جديد (تأخير/غياب/إلخ)
     */
    async recordOccurrence(
        policyId: string,
        employeeId: string,
        occurrenceType: string,
        eventData?: any,
    ): Promise<number> {
        // جلب أو إنشاء سجل التتبع
        let tracker = await this.prisma.smartPolicyOccurrenceTracker.findUnique({
            where: {
                policyId_employeeId_occurrenceType: {
                    policyId,
                    employeeId,
                    occurrenceType,
                },
            },
        });

        // التحقق من إعادة التعيين إذا لزم الأمر
        if (tracker && this.shouldReset(tracker)) {
            await this.resetTracker(tracker.id);
            tracker = await this.prisma.smartPolicyOccurrenceTracker.findUnique({
                where: { id: tracker.id },
            });
        }

        if (!tracker) {
            // إنشاء سجل جديد
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

        // زيادة العداد
        const updated = await this.prisma.smartPolicyOccurrenceTracker.update({
            where: { id: tracker.id },
            data: {
                count: { increment: 1 },
                lastOccurredAt: new Date(),
                lastEventData: eventData,
            },
        });

        this.logger.log(
            `Occurrence recorded: ${occurrenceType} for employee ${employeeId}, count: ${updated.count}`,
        );

        return updated.count;
    }

    /**
     * جلب عدد مرات الحدث للموظف
     */
    async getOccurrenceCount(
        policyId: string,
        employeeId: string,
        occurrenceType: string,
    ): Promise<number> {
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

        // التحقق من إعادة التعيين
        if (this.shouldReset(tracker)) {
            await this.resetTracker(tracker.id);
            return 0;
        }

        return tracker.count;
    }

    /**
     * 🔥 حساب العقوبة بناءً على التدرج
     */
    async calculatePenalty(
        policyId: string,
        employeeId: string,
        occurrenceType: string,
        tiers: TieredPenaltyConfig[],
        baseSalary: number,
    ): Promise<TieredPenaltyResult> {
        const count = await this.getOccurrenceCount(policyId, employeeId, occurrenceType);

        // البحث عن المستوى المناسب
        const sortedTiers = [...tiers].sort((a, b) => b.minOccurrences - a.minOccurrences);

        let applicableTier: TieredPenaltyConfig | null = null;

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

        // حساب المبلغ
        let calculatedAmount = 0;
        const action = applicableTier.action;

        if (action.type === 'DEDUCT' || action.type === 'ADD') {
            if (action.valueType === 'FIXED') {
                calculatedAmount = action.value || 0;

                // إذا كانت العقوبة لكل مرة زائدة
                if (action.perOccurrence && count > applicableTier.minOccurrences) {
                    const extraOccurrences = count - applicableTier.minOccurrences + 1;
                    calculatedAmount = (action.value || 0) * extraOccurrences;
                }
            } else if (action.valueType === 'PERCENTAGE') {
                calculatedAmount = baseSalary * ((action.value || 0) / 100);
            } else if (action.valueType === 'FORMULA' && action.formula) {
                // تنفيذ المعادلة
                calculatedAmount = this.evaluateFormula(action.formula, {
                    count,
                    baseSalary,
                    value: action.value || 0,
                    extra: Math.max(0, count - applicableTier.minOccurrences),
                });
            }
        }

        const explanation = this.generateExplanation(
            applicableTier,
            count,
            calculatedAmount,
            occurrenceType,
        );

        return {
            tier: applicableTier.tier,
            occurrenceCount: count,
            action: applicableTier.action,
            calculatedAmount: Math.round(calculatedAmount * 100) / 100,
            explanation,
        };
    }

    /**
     * إعادة تعيين العداد يدوياً
     */
    async resetTracker(trackerId: string): Promise<void> {
        await this.prisma.smartPolicyOccurrenceTracker.update({
            where: { id: trackerId },
            data: {
                count: 0,
                lastResetAt: new Date(),
            },
        });

        this.logger.log(`Tracker reset: ${trackerId}`);
    }

    /**
     * إعادة تعيين جميع العدادات لسياسة معينة
     */
    async resetAllForPolicy(policyId: string): Promise<number> {
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

    /**
     * تحديث فترة إعادة التعيين لسجل تتبع
     */
    async updateResetPeriod(
        policyId: string,
        employeeId: string,
        occurrenceType: string,
        resetPeriod: OccurrenceResetPeriod,
    ): Promise<void> {
        await this.prisma.smartPolicyOccurrenceTracker.updateMany({
            where: {
                policyId,
                employeeId,
                occurrenceType,
            },
            data: { resetPeriod },
        });
    }

    /**
     * جلب إحصائيات التكرار لسياسة
     */
    async getOccurrenceStats(policyId: string) {
        const trackers = await this.prisma.smartPolicyOccurrenceTracker.findMany({
            where: { policyId },
        });

        const stats = {
            totalTrackers: trackers.length,
            totalOccurrences: trackers.reduce((sum, t) => sum + t.count, 0),
            byType: {} as Record<string, { count: number; employees: number }>,
            topOffenders: [] as { employeeId: string; count: number; type: string }[],
        };

        // تجميع حسب النوع
        for (const tracker of trackers) {
            if (!stats.byType[tracker.occurrenceType]) {
                stats.byType[tracker.occurrenceType] = { count: 0, employees: 0 };
            }
            stats.byType[tracker.occurrenceType].count += tracker.count;
            stats.byType[tracker.occurrenceType].employees++;
        }

        // أكثر المخالفين
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

    /**
     * جلب تاريخ التكرار لموظف
     */
    async getEmployeeOccurrenceHistory(employeeId: string) {
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

    /**
     * Cron Job: إعادة تعيين العدادات تلقائياً
     * يجب استدعاء هذه الدالة من Cron Service
     */
    async processAutoResets(): Promise<number> {
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

    /**
     * التحقق مما إذا كان يجب إعادة تعيين العداد
     */
    private shouldReset(tracker: {
        resetPeriod: OccurrenceResetPeriod | null;
        lastResetAt: Date | null;
    }): boolean {
        // If no reset period or no last reset date, don't reset
        if (!tracker.resetPeriod || !tracker.lastResetAt) {
            return false;
        }

        const now = new Date();
        const lastReset = new Date(tracker.lastResetAt);

        switch (tracker.resetPeriod) {
            case 'MONTHLY':
                // إعادة التعيين في بداية كل شهر
                return (
                    now.getMonth() !== lastReset.getMonth() ||
                    now.getFullYear() !== lastReset.getFullYear()
                );

            case 'QUARTERLY':
                // إعادة التعيين في بداية كل ربع سنة
                const currentQuarter = Math.floor(now.getMonth() / 3);
                const lastQuarter = Math.floor(lastReset.getMonth() / 3);
                return (
                    currentQuarter !== lastQuarter ||
                    now.getFullYear() !== lastReset.getFullYear()
                );

            case 'YEARLY':
                // إعادة التعيين في بداية كل سنة
                return now.getFullYear() !== lastReset.getFullYear();

            case 'NEVER':
                // لا إعادة تعيين أبداً
                return false;

            default:
                return false;
        }
    }

    /**
     * تنفيذ معادلة بسيطة
     */
    private evaluateFormula(
        formula: string,
        context: { count: number; baseSalary: number; value: number; extra: number },
    ): number {
        try {
            // استبدال المتغيرات
            let expression = formula
                .replace(/\bcount\b/g, context.count.toString())
                .replace(/\bbaseSalary\b/g, context.baseSalary.toString())
                .replace(/\bvalue\b/g, context.value.toString())
                .replace(/\bextra\b/g, context.extra.toString());

            // استخدام Function بدلاً من eval للأمان
            const fn = new Function(`return ${expression}`);
            return fn();
        } catch (error) {
            this.logger.error(`Formula evaluation error: ${formula}`, error);
            return 0;
        }
    }

    /**
     * توليد شرح العقوبة
     */
    private generateExplanation(
        tier: TieredPenaltyConfig,
        count: number,
        amount: number,
        occurrenceType: string,
    ): string {
        const typeLabels: Record<string, string> = {
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
}
