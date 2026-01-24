import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export class UpdatePayrollSettingsDto {
    payrollClosingDay?: number;

    // Hire/Termination - طريقة حساب راتب الموظف الجديد/المنتهي خدماته
    hireTerminationCalcBase?: 'CALENDAR_DAYS' | 'ACTUAL_WORKING_DAYS' | 'FIXED_30_DAYS';
    hireTerminationMethod?: 'EXCLUDE_WEEKENDS' | 'INCLUDE_ALL_DAYS' | 'PRORATE_BY_CALENDAR' | 'EXCLUDE_FROM_PERIOD';

    // Unpaid Leave
    unpaidLeaveCalcBase?: 'CALENDAR_DAYS' | 'ACTUAL_WORKING_DAYS' | 'FIXED_30_DAYS';
    unpaidLeaveMethod?: 'BASED_ON_SHIFTS' | 'BASED_ON_CALENDAR' | 'BASED_ON_WORKING_DAYS';
    splitUnpaidByClosingDate?: boolean;

    // Overtime
    overtimeCalcBase?: 'CALENDAR_DAYS' | 'ACTUAL_WORKING_DAYS' | 'FIXED_30_DAYS';
    overtimeMethod?: 'BASED_ON_SHIFTS' | 'BASED_ON_BASIC_ONLY' | 'BASED_ON_TOTAL' | 'BASED_ON_ELIGIBLE_COMPONENTS';

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
    leaveDailyRateDivisor?: number;

    // === Features (1-10) ===
    overtimeMultiplier?: number;
    gracePeriodMinutes?: number;
    weekendOvertimeMultiplier?: number;
    holidayOvertimeMultiplier?: number;
    nightShiftAllowancePercent?: number;
    maxDeductionPercent?: number;
    minNetSalary?: number;
    autoLockDay?: number;
    defaultCurrency?: string;
    enableMultiCurrency?: boolean;

    // === Features (11-20) ===
    enableBonusTracking?: boolean;
    bonusCalculationMethod?: 'FIXED' | 'PERCENTAGE' | 'PERFORMANCE_BASED';
    enableCommission?: boolean;
    commissionCalculationBase?: 'SALES' | 'PROFIT' | 'CUSTOM';
    enableAllowanceCategories?: boolean;
    maxAllowancePercent?: number;
    enableTaxCalculation?: boolean;
    taxCalculationMethod?: 'FLAT_RATE' | 'PROGRESSIVE' | 'EXEMPT';
    enableSalaryAdvance?: boolean;
    maxAdvancePercent?: number;

    // === Features (21-30) ===
    enableLoanDeduction?: boolean;
    maxLoanDeductionPercent?: number;
    enableApprovalWorkflow?: boolean;
    approvalLevels?: number;
    enableBankTransfer?: boolean;
    defaultBankCode?: string;
    enableRetroactivePay?: boolean;
    retroactiveMonthsLimit?: number;
    enableEosCalculation?: boolean;
    eosCalculationMethod?: 'SAUDI_LABOR_LAW' | 'CUSTOM' | 'CONTRACTUAL';

    // === Features (31-40) ===
    enableGosiCalculation?: boolean;
    gosiEmployeePercent?: number;
    gosiEmployerPercent?: number;
    enableVacationEncashment?: boolean;
    vacationEncashmentMethod?: 'ON_TERMINATION' | 'ON_REQUEST' | 'ANNUAL';
    enableAttendancePenalty?: boolean;
    lateDeductionMethod?: 'PER_MINUTE' | 'PER_HOUR' | 'DAILY_RATE';
    lateThresholdMinutes?: number;
    absenceDeductionMethod?: 'DAILY_RATE' | 'HALF_DAY' | 'PROGRESSIVE';
    absenceProgressiveRate?: number;
    enableEarlyDeparturePenalty?: boolean;
    earlyDepartureDeductionMethod?: 'PER_MINUTE' | 'PER_HOUR' | 'DAILY_RATE';
    earlyDepartureThresholdMinutes?: number;
    enableCumulativeLateDeduction?: boolean;
    lateCountForDayDeduction?: number;
    gosiMaxSalary?: number;
    enableSanedCalculation?: boolean;
    sanedEmployeePercent?: number;
    sanedEmployerPercent?: number;
    hazardRatePercent?: number;
    enablePayslipEmail?: boolean;
    payslipLanguage?: 'AR' | 'EN' | 'BOTH';

    // === Features (41-52) ===
    enableOvertimeCap?: boolean;
    maxOvertimeHoursPerMonth?: number;
    enableAutoPayrollGeneration?: boolean;
    autoPayrollGenerationDay?: number;
    enablePayrollAuditTrail?: boolean;
    enableSalaryRounding?: boolean;
    salaryRoundingMethod?: 'UP' | 'DOWN' | 'NEAREST';
    enableDepartmentBudget?: boolean;
    enableCostCenterTracking?: boolean;
    defaultPayrollExportFormat?: 'PDF' | 'EXCEL' | 'CSV' | 'WPS';
    paymentDayType?: 'LAST_WORKING_DAY' | 'FIXED_DAY';
    paymentDay?: number;

    // === NEW: Sick Leave Settings (كانت ناقصة) ===
    enableSickLeaveDeduction?: boolean;
    sickLeavePartialPayPercent?: number;
    sickLeaveFullPayDays?: number;
    sickLeavePartialPayDays?: number;
    sickLeaveUnpaidDays?: number;

    // === NEW: Working Hours Settings (كانت ناقصة) ===
    dailyWorkingHours?: number;
    weeklyWorkingDays?: number;
    workingDaysPerWeek?: number;

    // === NEW: Rate Settings (كانت ناقصة) ===
    overtimeRate?: number;
    weekendOvertimeRate?: number;
    holidayOvertimeRate?: number;
    lateDeductionRate?: number;
    absenceDeductionRate?: number;

    // === NEW: GOSI Configuration (كانت ناقصة) ===
    includeHousingInGosi?: boolean;
    includeTransportInGosi?: boolean;

    // === NEW: Leave Settings (كانت ناقصة) ===
    defaultLeaveDays?: number;
    leaveCarryOverDays?: number;
    probationLeaveEnabled?: boolean;
    autoApproveLeave?: boolean;
    enableOvertimeApproval?: boolean;

    // === NEW: EOS Settings (كانت ناقصة) ===
    autoCalculateEos?: boolean;
    eosFirstYearsRate?: number;
    eosLaterYearsRate?: number;
    eosThresholdYears?: number;
    eosContractualRate?: number;

    // === NEW: Display Settings (كانت ناقصة) ===
    calculationMethod?: string;
    payslipTemplate?: string;
    showSalaryBreakdown?: boolean;
    showYtdTotals?: boolean;
}


@Injectable()
export class PayrollSettingsService {
    private readonly logger = new Logger(PayrollSettingsService.name);

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
        // ✅ تنظيف البيانات - إزالة الحقول غير المسموح بها
        const { id, companyId: _, createdAt, updatedAt, ...cleanData } = data as any;

        this.logger.log(`📝 Updating payroll settings for company ${companyId}`);
        this.logger.debug(`Received fields: ${Object.keys(data).join(', ')}`);
        this.logger.debug(`Clean fields for update: ${Object.keys(cleanData).join(', ')}`);

        // Log specific deduction-related fields for debugging
        if ('lateDeductionMethod' in cleanData) {
            this.logger.log(`🔧 lateDeductionMethod: ${cleanData.lateDeductionMethod}`);
        }
        if ('absenceDeductionMethod' in cleanData) {
            this.logger.log(`🔧 absenceDeductionMethod: ${cleanData.absenceDeductionMethod}`);
        }

        // التحقق من صحة payrollClosingDay
        if (cleanData.payrollClosingDay !== undefined) {
            if (cleanData.payrollClosingDay < 0 || cleanData.payrollClosingDay > 28) {
                throw new Error('يجب أن يكون تاريخ إغلاق الرواتب بين 0 و 28');
            }
        }

        const payrollSettings = (this.prisma as any).payrollSettings;

        // التأكد من وجود الإعدادات أولاً
        const existing = await payrollSettings.findUnique({
            where: { companyId },
        });

        if (!existing) {
            this.logger.log('⚠️ No existing settings found, creating new record');
            // إنشاء مع البيانات المحدثة
            return payrollSettings.create({
                data: {
                    companyId,
                    ...cleanData,
                },
            });
        }

        this.logger.log(`✅ Updating existing settings (ID: ${existing.id})`);

        // تحديث الإعدادات الموجودة
        const result = await payrollSettings.update({
            where: { companyId },
            data: cleanData,
        });

        this.logger.log(`✅ Settings updated successfully. lateDeductionMethod: ${result.lateDeductionMethod}`);

        return result;
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

