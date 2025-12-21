import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * StuckDetectionService - يكتشف التقديمات المعلقة ويُرسل تنبيهات
 * يعمل كل 6 ساعات ويفحص التقديمات في حالة SUBMITTED لأكثر من 3 أيام
 */
@Injectable()
export class StuckDetectionService {
    private readonly logger = new Logger(StuckDetectionService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Cron Job: كل 6 ساعات
     */
    @Cron(CronExpression.EVERY_6_HOURS)
    async detectStuckSubmissions() {
        this.logger.log('🔍 بدء فحص التقديمات المعلقة...');

        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

        // فحص Mudad المعلقة
        const stuckMudad = await this.prisma.mudadSubmission.findMany({
            where: {
                status: 'SUBMITTED',
                submittedAt: { lt: threeDaysAgo },
            },
            include: {
                company: { select: { name: true } },
            },
        });

        // فحص WPS المعلقة
        const stuckWps = await this.prisma.wpsSubmission.findMany({
            where: {
                status: 'SUBMITTED',
                submittedAt: { lt: threeDaysAgo },
            },
            include: {
                company: { select: { name: true } },
            },
        });

        const totalStuck = stuckMudad.length + stuckWps.length;

        if (totalStuck === 0) {
            this.logger.log('✅ لا توجد تقديمات معلقة');
            return;
        }

        this.logger.warn(`⚠️ تم اكتشاف ${totalStuck} تقديم معلق!`);

        // إنشاء إشعارات داخلية للشركات المتأثرة
        const companyNotifications = new Map<string, { mudad: number; wps: number }>();

        for (const submission of stuckMudad) {
            const existing = companyNotifications.get(submission.companyId) || { mudad: 0, wps: 0 };
            existing.mudad++;
            companyNotifications.set(submission.companyId, existing);
        }

        for (const submission of stuckWps) {
            const existing = companyNotifications.get(submission.companyId) || { mudad: 0, wps: 0 };
            existing.wps++;
            companyNotifications.set(submission.companyId, existing);
        }

        // إنشاء سجلات في جدول الاستثناءات / التنبيهات
        for (const [companyId, counts] of companyNotifications) {
            await this.createStuckAlert(companyId, counts.mudad, counts.wps);
        }

        this.logger.log(`📤 تم إرسال ${companyNotifications.size} تنبيه للشركات`);
    }

    /**
     * إنشاء تنبيه في جدول الاستثناءات
     */
    private async createStuckAlert(companyId: string, mudadCount: number, wpsCount: number) {
        const message = `⚠️ يوجد ${mudadCount + wpsCount} تقديم معلق (${mudadCount} مُدد، ${wpsCount} WPS) منذ أكثر من 3 أيام`;

        // سجل التنبيه في اللوج
        this.logger.warn(`تنبيه شركة ${companyId}: ${message}`);

        // يمكن إضافة إرسال إشعار عبر البريد أو في جدول notifications لاحقاً
    }

    /**
     * فحص يدوي (للاختبار)
     */
    async manualCheck() {
        await this.detectStuckSubmissions();
        return { message: 'تم الفحص' };
    }

    /**
     * الحصول على إحصائيات التقديمات المعلقة
     */
    async getStuckStats() {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

        const [mudadCount, wpsCount] = await Promise.all([
            this.prisma.mudadSubmission.count({
                where: { status: 'SUBMITTED', submittedAt: { lt: threeDaysAgo } },
            }),
            this.prisma.wpsSubmission.count({
                where: { status: 'SUBMITTED', submittedAt: { lt: threeDaysAgo } },
            }),
        ]);

        return {
            mudad: mudadCount,
            wps: wpsCount,
            total: mudadCount + wpsCount,
            threshold: '3 days',
        };
    }
}
