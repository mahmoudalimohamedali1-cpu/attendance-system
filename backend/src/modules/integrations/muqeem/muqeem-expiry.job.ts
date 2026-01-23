import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '@prisma/client';
import { addDays, startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class MuqeemExpiryJob {
    private readonly logger = new Logger(MuqeemExpiryJob.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationsService: NotificationsService,
    ) { }

    /**
     * Check for Iqama and Passport expiries every day at 1:00 AM
     */
    @Cron(CronExpression.EVERY_DAY_AT_1AM)
    async checkExpiries() {
        this.logger.log('🕵️ Starting Muqeem expiry check job...');

        try {
            const activeConfigs = await (this.prisma as any).muqeemConfig.findMany({
                where: { isActive: true, enableNotifications: true },
            });

            for (const config of activeConfigs) {
                await this.checkCompanyExpiries(config);
            }

            this.logger.log('🕵️ Muqeem expiry check completed');
        } catch (error) {
            this.logger.error('❌ Muqeem expiry job failed:', error);
        }
    }

    private async checkCompanyExpiries(config: any) {
        const { companyId, iqamaExpiryDays, passportExpiryDays } = config;

        // 1. Check Iqama Expiries
        const iqamaTargetDate = addDays(new Date(), iqamaExpiryDays);
        const expiringIqamas = await this.prisma.user.findMany({
            where: {
                companyId,
                status: 'ACTIVE',
                iqamaExpiryDate: {
                    gte: startOfDay(iqamaTargetDate),
                    lte: endOfDay(iqamaTargetDate),
                },
            },
            select: { id: true, firstName: true, lastName: true, iqamaNumber: true, iqamaExpiryDate: true },
        });

        for (const user of expiringIqamas) {
            await this.sendExpiryNotification(
                companyId,
                user.id,
                'IQAMA_EXPIRY',
                `تنبيه: إقامتك رقم (${user.iqamaNumber}) ستنتهي بتاريخ ${user.iqamaExpiryDate?.toLocaleDateString('ar-SA')}. يرجى اتخاذ الإجراء اللازم.`,
            );
        }

        // 2. Check Passport Expiries
        const passportTargetDate = addDays(new Date(), passportExpiryDays);
        const expiringPassports = await this.prisma.user.findMany({
            where: {
                companyId,
                status: 'ACTIVE',
                passportExpiryDate: {
                    gte: startOfDay(passportTargetDate),
                    lte: endOfDay(passportTargetDate),
                },
            },
            select: { id: true, firstName: true, lastName: true, passportNumber: true, passportExpiryDate: true },
        });

        for (const user of expiringPassports) {
            await this.sendExpiryNotification(
                companyId,
                user.id,
                'PASSPORT_EXPIRY',
                `تنبيه: جواز سفرك رقم (${user.passportNumber}) سينتهي خلال ${passportExpiryDays} يوماً.`,
            );
        }
    }

    private async sendExpiryNotification(companyId: string, userId: string, type: string, body: string) {
        try {
            await this.notificationsService.create({
                companyId,
                userId,
                title: 'تنبيه انتهاء وثيقة (مقيم)',
                body,
                type: 'GENERAL' as NotificationType,
            });
            this.logger.log(`Notification sent to user ${userId} for ${type}`);
        } catch (error) {
            this.logger.error(`Failed to send notification to ${userId}: ${error.message}`);
        }
    }
}
