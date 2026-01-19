import { Injectable } from '@nestjs/common';
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

    // === New Features (1-10) ===
    // 1. معامل الوقت الإضافي العادي
    overtimeMultiplier?: number;
    // 2. فترة السماح للتأخير (بالدقائق)
    gracePeriodMinutes?: number;
    // 3. معدل إضافي لعطلة نهاية الأسبوع
    weekendOvertimeMultiplier?: number;
    // 4. معدل إضافي للأعياد والعطل الرسمية
    holidayOvertimeMultiplier?: number;
    // 5. بدل المناوبة الليلية (نسبة مئوية)
    nightShiftAllowancePercent?: number;
    // 6. الحد الأقصى للخصومات
    maxDeductionPercent?: number;
    // 7. الحد الأدنى للراتب الصافي
    minNetSalary?: number;
    // 8. يوم القفل التلقائي
    autoLockDay?: number;
    // 9. العملة الافتراضية
    defaultCurrency?: string;
    // 10. تفعيل العملات المتعددة
    enableMultiCurrency?: boolean;

    // === New Features (11-20) ===
    // 11. تفعيل تتبع المكافآت
    enableBonusTracking?: boolean;
    // 12. طريقة حساب المكافأة
    bonusCalculationMethod?: 'FIXED' | 'PERCENTAGE' | 'PERFORMANCE_BASED';
    // 13. تفعيل العمولات
    enableCommission?: boolean;
    // 14. أساس حساب العمولة
    commissionCalculationBase?: 'SALES' | 'PROFIT' | 'CUSTOM';
    // 15. تفعيل فئات البدلات المتعددة
    enableAllowanceCategories?: boolean;
    // 16. الحد الأقصى للبدلات
    maxAllowancePercent?: number;
    // 17. تفعيل حساب الضرائب
    enableTaxCalculation?: boolean;
    // 18. طريقة حساب الضرائب
    taxCalculationMethod?: 'FLAT_RATE' | 'PROGRESSIVE' | 'EXEMPT';
    // 19. تفعيل السلفة على الراتب
    enableSalaryAdvance?: boolean;
    // 20. الحد الأقصى للسلفة
    maxAdvancePercent?: number;

    // === New Features (21-30) ===
    // 21. تفعيل خصم القروض
    enableLoanDeduction?: boolean;
    // 22. الحد الأقصى لخصم القرض
    maxLoanDeductionPercent?: number;
    // 23. تفعيل سير عمل الموافقة
    enableApprovalWorkflow?: boolean;
    // 24. عدد مستويات الموافقة
    approvalLevels?: number;
    // 25. تفعيل التحويل البنكي
    enableBankTransfer?: boolean;
    // 26. رمز البنك الافتراضي
    defaultBankCode?: string;
    // 27. تفعيل الدفع بأثر رجعي
    enableRetroactivePay?: boolean;
    // 28. حد الأشهر للدفع بأثر رجعي
    retroactiveMonthsLimit?: number;
    // 29. تفعيل حساب نهاية الخدمة
    enableEosCalculation?: boolean;
    // 30. طريقة حساب نهاية الخدمة
    eosCalculationMethod?: 'SAUDI_LABOR_LAW' | 'CUSTOM' | 'CONTRACTUAL';

    // === New Features (31-40) ===
    // 31. تفعيل حساب التأمينات (GOSI)
    enableGosiCalculation?: boolean;
    // 32. نسبة التأمينات على الموظف
    gosiEmployeePercent?: number;
    // 33. نسبة التأمينات على صاحب العمل
    gosiEmployerPercent?: number;
    // 34. تفعيل صرف رصيد الإجازات
    enableVacationEncashment?: boolean;
    // 35. طريقة صرف الإجازات
    vacationEncashmentMethod?: 'ON_TERMINATION' | 'ON_REQUEST' | 'ANNUAL';
    // 36. تفعيل عقوبات الحضور
    enableAttendancePenalty?: boolean;
    // 37. طريقة خصم التأخير
    lateDeductionMethod?: 'PER_MINUTE' | 'PER_HOUR' | 'DAILY_RATE';
    // 37.1 حد دقائق التأخير لخصم يوم كامل
    lateThresholdMinutes?: number;
    // 38. طريقة خصم الغياب
    absenceDeductionMethod?: 'DAILY_RATE' | 'HALF_DAY' | 'PROGRESSIVE';
    // 38.1 معدل الخصم التصاعدي للغياب
    absenceProgressiveRate?: number;
    // 38.2 تفعيل خصم الانصراف المبكر
    enableEarlyDeparturePenalty?: boolean;
    // 38.3 طريقة خصم الانصراف المبكر
    earlyDepartureDeductionMethod?: 'PER_MINUTE' | 'PER_HOUR' | 'DAILY_RATE';
    // 38.4 حد دقائق الانصراف المبكر
    earlyDepartureThresholdMinutes?: number;
    // 38.5 تفعيل الخصم التراكمي للتأخير
    enableCumulativeLateDeduction?: boolean;
    // 38.6 عدد مرات التأخير لخصم يوم
    lateCountForDayDeduction?: number;
    // 38.7 الحد الأقصى للراتب الخاضع للتأمينات
    gosiMaxSalary?: number;
    // 38.8 تفعيل حساب ساند
    enableSanedCalculation?: boolean;
    // 38.9 نسبة ساند على الموظف
    sanedEmployeePercent?: number;
    // 38.10 نسبة ساند على صاحب العمل
    sanedEmployerPercent?: number;
    // 38.11 نسبة الأخطار المهنية
    hazardRatePercent?: number;
    // 39. تفعيل إرسال قسيمة الراتب بالبريد
    enablePayslipEmail?: boolean;
    // 40. لغة قسيمة الراتب
    payslipLanguage?: 'AR' | 'EN' | 'BOTH';

    // === New Features (41-50) ===
    // 41. تفعيل الحد الأقصى للوقت الإضافي
    enableOvertimeCap?: boolean;
    // 42. الحد الأقصى لساعات الوقت الإضافي شهرياً
    maxOvertimeHoursPerMonth?: number;
    // 43. تفعيل توليد الرواتب التلقائي
    enableAutoPayrollGeneration?: boolean;
    // 44. يوم توليد الرواتب التلقائي
    autoPayrollGenerationDay?: number;
    // 45. تفعيل سجل تدقيق الرواتب
    enablePayrollAuditTrail?: boolean;
    // 46. تفعيل تقريب الراتب
    enableSalaryRounding?: boolean;
    // 47. طريقة تقريب الراتب
    salaryRoundingMethod?: 'UP' | 'DOWN' | 'NEAREST';
    // 48. تفعيل ميزانية القسم
    enableDepartmentBudget?: boolean;
    // 49. تفعيل تتبع مركز التكلفة
    enableCostCenterTracking?: boolean;
    // 50. صيغة تصدير الرواتب الافتراضية
    defaultPayrollExportFormat?: 'PDF' | 'EXCEL' | 'CSV' | 'WPS';
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

