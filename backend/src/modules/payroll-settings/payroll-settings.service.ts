import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export class UpdatePayrollSettingsDto {
    payrollClosingDay?: number;

    // Hire/Termination
    hireTerminationCalcBase?: 'CALENDAR_DAYS' | 'ACTUAL_WORKING_DAYS' | 'FIXED_30_DAYS';
    hireTerminationMethod?: 'EXCLUDE_WEEKENDS' | 'INCLUDE_ALL_DAYS' | 'PRORATE_BY_CALENDAR';

    // Unpaid Leave
    unpaidLeaveCalcBase?: 'CALENDAR_DAYS' | 'ACTUAL_WORKING_DAYS' | 'FIXED_30_DAYS';
    unpaidLeaveMethod?: 'BASED_ON_SHIFTS' | 'BASED_ON_CALENDAR' | 'BASED_ON_WORKING_DAYS';
    splitUnpaidByClosingDate?: boolean;

    // Overtime
    overtimeCalcBase?: 'CALENDAR_DAYS' | 'ACTUAL_WORKING_DAYS' | 'FIXED_30_DAYS';
    overtimeMethod?: 'BASED_ON_SHIFTS' | 'BASED_ON_BASIC_ONLY' | 'BASED_ON_TOTAL';

    // Leave Allowance
    leaveAllowanceCalcBase?: 'CALENDAR_DAYS' | 'ACTUAL_WORKING_DAYS' | 'FIXED_30_DAYS';
    leaveAllowanceMethod?: 'BASIC_SALARY' | 'BASIC_PLUS_HOUSING' | 'TOTAL_SALARY';

    // Payslip Display
    showCompanyContributions?: boolean;
    showClosingDateOnPayslip?: boolean;
    deductAbsenceFromBasic?: boolean;
    showActualAbsenceDays?: boolean;

    // Negative Balance
    enableNegativeBalanceCarryover?: boolean;
    settleNegativeAsTransaction?: boolean;

    // Additional
    roundSalaryToNearest?: number;
    defaultWorkingDaysPerMonth?: number;
}

@Injectable()
export class PayrollSettingsService {
    constructor(private prisma: PrismaService) { }

    /**
     * جلب إعدادات الرواتب للشركة
     */
    async getSettings(companyId: string) {
        // استخدام any cast لأن Prisma Client قد لا يكون محدثاً
        const payrollSettings = (this.prisma as any).payrollSettings;
        
        let settings = await payrollSettings.findUnique({
            where: { companyId },
        });

        // إنشاء إعدادات افتراضية إذا لم تكن موجودة
        if (!settings) {
            settings = await payrollSettings.create({
                data: { companyId },
            });
        }

        return settings;
    }

    /**
     * تحديث إعدادات الرواتب
     */
    async updateSettings(companyId: string, data: UpdatePayrollSettingsDto) {
        // التحقق من صحة payrollClosingDay
        if (data.payrollClosingDay !== undefined) {
            if (data.payrollClosingDay < 0 || data.payrollClosingDay > 28) {
                throw new Error('يجب أن يكون تاريخ إغلاق الرواتب بين 0 و 28');
            }
        }

        const payrollSettings = (this.prisma as any).payrollSettings;
        
        // التأكد من وجود الإعدادات أولاً
        const existing = await payrollSettings.findUnique({
            where: { companyId },
        });

        if (!existing) {
            // إنشاء مع البيانات المحدثة
            return payrollSettings.create({
                data: {
                    companyId,
                    ...data,
                },
            });
        }

        // تحديث الإعدادات الموجودة
        return payrollSettings.update({
            where: { companyId },
            data,
        });
    }

    /**
     * إعادة تعيين الإعدادات للافتراضي
     */
    async resetToDefaults(companyId: string) {
        const payrollSettings = (this.prisma as any).payrollSettings;
        
        const existing = await payrollSettings.findUnique({
            where: { companyId },
        });

        if (existing) {
            await payrollSettings.delete({
                where: { companyId },
            });
        }

        return payrollSettings.create({
            data: { companyId },
        });
    }
}

