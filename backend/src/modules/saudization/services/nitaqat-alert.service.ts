import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { NitaqatCalculatorService, NitaqatColor } from './nitaqat-calculator.service';

export interface NitaqatAlert {
    id: string;
    type: 'CRITICAL' | 'WARNING' | 'INFO';
    titleAr: string;
    titleEn: string;
    messageAr: string;
    messageEn: string;
    createdAt: Date;
    actionRequired: boolean;
}

@Injectable()
export class NitaqatAlertService {
    private readonly logger = new Logger(NitaqatAlertService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly nitaqatCalculator: NitaqatCalculatorService,
    ) { }

    /**
     * Get current Nitaqat alerts for a company
     */
    async getAlerts(companyId: string): Promise<NitaqatAlert[]> {
        const alerts: NitaqatAlert[] = [];

        try {
            // Get current statistics
            const employees = await this.prisma.user.findMany({
                where: {
                    companyId,
                    status: 'ACTIVE',
                    role: 'EMPLOYEE',
                },
                select: {
                    id: true,
                    isSaudi: true,
                },
            });

            const totalEmployees = employees.length;
            const saudiEmployees = employees.filter(e => e.isSaudi).length;

            const nitaqatResult = await this.nitaqatCalculator.calculateNitaqatBand(
                companyId,
                totalEmployees,
                saudiEmployees,
            );

            // Generate alerts based on Nitaqat status
            if (nitaqatResult.color === NitaqatColor.RED) {
                alerts.push({
                    id: 'red-band-alert',
                    type: 'CRITICAL',
                    titleAr: 'تحذير: النطاق الأحمر',
                    titleEn: 'Warning: Red Band',
                    messageAr: `الشركة في النطاق الأحمر بنسبة سعودة ${nitaqatResult.currentRate}%. يجب اتخاذ إجراءات فورية لتجنب العقوبات.`,
                    messageEn: `Company is in the red band with ${nitaqatResult.currentRate}% saudization. Immediate action required to avoid penalties.`,
                    createdAt: new Date(),
                    actionRequired: true,
                });

                alerts.push({
                    id: 'visa-restriction-alert',
                    type: 'CRITICAL',
                    titleAr: 'قيود على التأشيرات',
                    titleEn: 'Visa Restrictions',
                    messageAr: 'لا يمكن استقدام عمالة جديدة أو نقل الكفالة حتى تحسين نسبة السعودة',
                    messageEn: 'Cannot sponsor new workers or transfer sponsorship until saudization improves',
                    createdAt: new Date(),
                    actionRequired: true,
                });
            }

            if (nitaqatResult.color === NitaqatColor.YELLOW) {
                alerts.push({
                    id: 'yellow-band-alert',
                    type: 'WARNING',
                    titleAr: 'تنبيه: النطاق الأصفر',
                    titleEn: 'Alert: Yellow Band',
                    messageAr: `الشركة في النطاق الأصفر بنسبة سعودة ${nitaqatResult.currentRate}%. يُنصح بتحسين النسبة للوصول للنطاق الأخضر.`,
                    messageEn: `Company is in the yellow band with ${nitaqatResult.currentRate}% saudization. Recommended to improve to reach green band.`,
                    createdAt: new Date(),
                    actionRequired: false,
                });
            }

            // Check if close to band change
            if (nitaqatResult.gapToTarget <= 2 && nitaqatResult.gapToTarget > 0) {
                alerts.push({
                    id: 'near-target-alert',
                    type: 'INFO',
                    titleAr: 'قريب من الهدف',
                    titleEn: 'Near Target',
                    messageAr: `أنت قريب من الوصول للنطاق الأخضر. تحتاج لزيادة ${nitaqatResult.gapToTarget}% فقط.`,
                    messageEn: `You are close to reaching the green band. Need only ${nitaqatResult.gapToTarget}% more.`,
                    createdAt: new Date(),
                    actionRequired: false,
                });
            }

            // Check for recent Saudi employee status changes (INACTIVE)
            const recentTerminations = await this.prisma.user.count({
                where: {
                    companyId,
                    isSaudi: true,
                    status: 'INACTIVE',
                    updatedAt: {
                        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                    },
                },
            });

            if (recentTerminations > 0) {
                alerts.push({
                    id: 'saudi-termination-alert',
                    type: 'WARNING',
                    titleAr: 'استقالات سعوديين',
                    titleEn: 'Saudi Terminations',
                    messageAr: `تم إنهاء خدمات ${recentTerminations} موظف سعودي خلال آخر 30 يوم. قد يؤثر ذلك على نسبة السعودة.`,
                    messageEn: `${recentTerminations} Saudi employee(s) terminated in the last 30 days. This may affect saudization rate.`,
                    createdAt: new Date(),
                    actionRequired: false,
                });
            }

            // Platinum status info
            if (nitaqatResult.color === NitaqatColor.PLATINUM) {
                alerts.push({
                    id: 'platinum-status',
                    type: 'INFO',
                    titleAr: 'النطاق البلاتيني',
                    titleEn: 'Platinum Band',
                    messageAr: `تهانينا! الشركة في النطاق البلاتيني بنسبة سعودة ${nitaqatResult.currentRate}%. تتمتعون بجميع المزايا.`,
                    messageEn: `Congratulations! Company is in the platinum band with ${nitaqatResult.currentRate}% saudization. You enjoy all benefits.`,
                    createdAt: new Date(),
                    actionRequired: false,
                });
            }

            return alerts;
        } catch (error) {
            this.logger.error(`Error generating alerts: ${error.message}`);
            return [];
        }
    }

    /**
     * Check if company needs urgent attention
     */
    async needsUrgentAttention(companyId: string): Promise<boolean> {
        const alerts = await this.getAlerts(companyId);
        return alerts.some(a => a.type === 'CRITICAL' && a.actionRequired);
    }
}
