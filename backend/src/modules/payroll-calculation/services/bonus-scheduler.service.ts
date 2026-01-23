import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { BonusService } from './bonus.service';

/**
 * خدمة جدولة المكافآت التلقائية
 * تقوم بتوليد المكافآت تلقائياً حسب نوعها في الوقت المناسب
 */
@Injectable()
export class BonusSchedulerService {
    private readonly logger = new Logger(BonusSchedulerService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly bonusService: BonusService,
    ) { }

    /**
     * توليد المكافآت الشهرية - أول يوم من كل شهر
     */
    @Cron('0 6 1 * *', { timeZone: 'Asia/Riyadh' })
    async generateMonthlyBonuses() {
        this.logger.log('🎁 Starting MONTHLY bonus generation...');
        await this.generateBonusesByType('MONTHLY');
    }

    /**
     * توليد المكافآت الربع سنوية - أول يوم من يناير، أبريل، يوليو، أكتوبر
     */
    @Cron('0 6 1 1,4,7,10 *', { timeZone: 'Asia/Riyadh' })
    async generateQuarterlyBonuses() {
        this.logger.log('🎁 Starting QUARTERLY bonus generation...');
        await this.generateBonusesByType('QUARTERLY');
    }

    /**
     * توليد المكافآت السنوية - أول ديسمبر من كل سنة
     */
    @Cron('0 6 1 12 *', { timeZone: 'Asia/Riyadh' })
    async generateAnnualBonuses() {
        this.logger.log('🎁 Starting ANNUAL bonus generation...');
        await this.generateBonusesByType('ANNUAL');
    }

    /**
     * التحقق من مكافآت العيد والرمضان - كل يوم للتحقق من التواريخ الهجرية
     * سيتم التحقق من التواريخ الهجرية لتحديد موعد العيد ورمضان
     */
    @Cron('0 6 * * *', { timeZone: 'Asia/Riyadh' })
    async checkIslamicBonuses() {
        const today = new Date();
        const month = today.getMonth() + 1;
        const day = today.getDate();

        // تقريب لمواعيد العيد (يتم تحديثها سنوياً حسب التقويم الهجري)
        // عيد الفطر - تقريباً في شهر 4 أو 5
        // عيد الأضحى - تقريباً في شهر 6 أو 7
        // يمكن تحسين هذا باستخدام مكتبة للتقويم الهجري

        // مكافأة رمضان - أول رمضان (تقريباً مارس-أبريل)
        if (month === 3 && day === 10) {
            this.logger.log('🌙 Ramadan detected - generating RAMADAN bonuses...');
            await this.generateBonusesByType('RAMADAN');
        }

        // مكافأة عيد الفطر - قبل العيد بيومين
        if (month === 4 && day === 8) {
            this.logger.log('🎉 Eid Al-Fitr approaching - generating EID bonuses...');
            await this.generateBonusesByType('EID');
        }
    }

    /**
     * توليد المكافآت حسب النوع لجميع الشركات
     */
    private async generateBonusesByType(bonusType: string) {
        try {
            // جلب جميع برامج المكافآت النشطة من هذا النوع
            const bonusPrograms = await this.prisma.salaryComponent.findMany({
                where: {
                    code: { startsWith: 'BONUS_' },
                    isActive: true,
                },
            });

            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;

            let totalGenerated = 0;

            for (const program of bonusPrograms) {
                try {
                    // فك تشفير الـ metadata
                    const metadata = program.description ? JSON.parse(program.description) : {};

                    // تحقق أن نوع المكافأة يطابق
                    if (metadata.bonusType !== bonusType) {
                        continue;
                    }

                    // تحقق من التكرار (frequency)
                    if (!this.shouldGenerateNow(metadata, month)) {
                        continue;
                    }

                    this.logger.log(`📋 Processing bonus program: ${program.code} for company ${program.companyId}`);

                    // توليد المكافآت لجميع الموظفين في هذه الشركة
                    const result = await this.bonusService.generateBulkBonuses(
                        {
                            programId: program.id,
                            periodYear: year,
                            periodMonth: month,
                        },
                        program.companyId!,
                    );

                    totalGenerated += result.generated || 0;
                    this.logger.log(`✅ Generated ${result.generated || 0} bonuses for program ${program.code}`);
                } catch (err) {
                    this.logger.error(`❌ Error processing program ${program.code}: ${err.message}`);
                }
            }

            this.logger.log(`🎁 Total ${bonusType} bonuses generated: ${totalGenerated}`);
        } catch (err) {
            this.logger.error(`❌ Error in generateBonusesByType: ${err.message}`);
        }
    }

    /**
     * التحقق من أن الوقت مناسب لتوليد المكافأة حسب التكرار
     */
    private shouldGenerateNow(metadata: any, currentMonth: number): boolean {
        const frequency = metadata.frequency;

        switch (frequency) {
            case 'MONTHLY':
                return true; // كل شهر
            case 'QUARTERLY':
                return [1, 4, 7, 10].includes(currentMonth); // كل 3 شهور
            case 'SEMI_ANNUAL':
                return [1, 7].includes(currentMonth); // كل 6 شهور
            case 'ANNUAL':
                return currentMonth === 12; // مرة في السنة (ديسمبر)
            case 'EID':
            case 'RAMADAN':
                return true; // يتم التحقق بشكل منفصل
            default:
                return true;
        }
    }

    /**
     * تشغيل يدوي لتوليد مكافآت نوع معين (للاختبار أو التشغيل من الـ API)
     */
    async manualTrigger(bonusType: string) {
        this.logger.log(`🔧 Manual trigger for ${bonusType} bonuses...`);
        await this.generateBonusesByType(bonusType);
        return { success: true, message: `${bonusType} bonuses generation triggered` };
    }
}
