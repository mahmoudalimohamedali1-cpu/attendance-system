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
     * التحقق من مكافآت العيد والرمضان - كل يوم للتحقق من التواريخ من الإعدادات
     * يتم جلب تواريخ رمضان والعيد من إعدادات كل شركة
     */
    @Cron('0 6 * * *', { timeZone: 'Asia/Riyadh' })
    async checkIslamicBonuses() {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
        const thisYear = today.getFullYear();

        this.logger.log(`🌙 Checking Islamic bonuses for date: ${todayStr}`);

        // جلب جميع الشركات
        const companies = await this.prisma.company.findMany();

        for (const company of companies) {
            try {
                // جلب عطلات هذه الشركة
                const holidays = await this.prisma.holiday.findMany({
                    where: {
                        companyId: company.id,
                        date: {
                            gte: new Date(thisYear, 0, 1),
                            lte: new Date(thisYear, 11, 31),
                        },
                    },
                });

                // البحث عن عطلات رمضان والعيد
                for (const holiday of holidays) {
                    const holidayName = holiday.name.toLowerCase();
                    const holidayDateStr = holiday.date.toISOString().split('T')[0];

                    // مكافأة رمضان - في بداية رمضان
                    if ((holidayName.includes('رمضان') || holidayName.includes('ramadan'))
                        && todayStr === holidayDateStr) {
                        this.logger.log(`🌙 Ramadan started for company ${company.id} - generating RAMADAN bonuses...`);
                        await this.generateBonusesForCompany('RAMADAN', company.id);
                    }

                    // مكافأة عيد الفطر - قبل العيد بيومين
                    if ((holidayName.includes('عيد الفطر') || holidayName.includes('eid al-fitr') || holidayName.includes('eid fitr'))
                        && this.isDateNDaysBefore(todayStr, holiday.date, 2)) {
                        this.logger.log(`🎉 Eid Al-Fitr approaching for company ${company.id} - generating EID bonuses...`);
                        await this.generateBonusesForCompany('EID', company.id);
                    }

                    // مكافأة عيد الأضحى - قبل العيد بيومين
                    if ((holidayName.includes('عيد الأضحى') || holidayName.includes('eid al-adha') || holidayName.includes('eid adha'))
                        && this.isDateNDaysBefore(todayStr, holiday.date, 2)) {
                        this.logger.log(`🐑 Eid Al-Adha approaching for company ${company.id} - generating EID bonuses...`);
                        await this.generateBonusesForCompany('EID', company.id);
                    }
                }
            } catch (err) {
                this.logger.error(`Error checking Islamic dates for company ${company.id}: ${err.message}`);
            }
        }
    }

    /**
     * التحقق من تطابق التاريخ
     */
    private isMatchingDate(todayStr: string, targetDate: string | Date): boolean {
        if (!targetDate) return false;
        const target = typeof targetDate === 'string' ? targetDate : targetDate.toISOString().split('T')[0];
        return todayStr === target;
    }

    /**
     * التحقق من أن اليوم قبل التاريخ المحدد بعدد معين من الأيام
     */
    private isDateNDaysBefore(todayStr: string, targetDate: string | Date, daysBefore: number): boolean {
        if (!targetDate) return false;
        const target = new Date(targetDate);
        target.setDate(target.getDate() - daysBefore);
        return todayStr === target.toISOString().split('T')[0];
    }

    /**
     * توليد المكافآت لشركة معينة حسب النوع
     */
    private async generateBonusesForCompany(bonusType: string, companyId: string) {
        const bonusPrograms = await this.prisma.salaryComponent.findMany({
            where: {
                companyId,
                code: { startsWith: 'BONUS_' },
                isActive: true,
            },
        });

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        for (const program of bonusPrograms) {
            const metadata = program.description ? JSON.parse(program.description) : {};
            if (metadata.bonusType !== bonusType) continue;

            await this.bonusService.generateBulkBonuses(
                { programId: program.id, periodYear: year, periodMonth: month },
                companyId,
            );
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
