import { api } from './api.service';

export interface PayrollSettingsData {
    id: string;
    companyId: string;

    // تاريخ إغلاق الرواتب
    payrollClosingDay: number;

    // حساب التوظيف وإنهاء الخدمات
    hireTerminationCalcBase: 'CALENDAR_DAYS' | 'ACTUAL_WORKING_DAYS' | 'FIXED_30_DAYS';
    hireTerminationMethod: 'EXCLUDE_WEEKENDS' | 'INCLUDE_ALL_DAYS' | 'PRORATE_BY_CALENDAR';

    // حساب الإجازات غير المدفوعة
    unpaidLeaveCalcBase: 'CALENDAR_DAYS' | 'ACTUAL_WORKING_DAYS' | 'FIXED_30_DAYS';
    unpaidLeaveMethod: 'BASED_ON_SHIFTS' | 'BASED_ON_CALENDAR' | 'BASED_ON_WORKING_DAYS';
    splitUnpaidByClosingDate: boolean;

    // حساب ساعات العمل الإضافي
    overtimeCalcBase: 'CALENDAR_DAYS' | 'ACTUAL_WORKING_DAYS' | 'FIXED_30_DAYS';
    overtimeMethod: 'BASED_ON_SHIFTS' | 'BASED_ON_BASIC_ONLY' | 'BASED_ON_TOTAL' | 'BASED_ON_ELIGIBLE_COMPONENTS';

    // حساب بدل أيام الإجازة
    leaveAllowanceCalcBase: 'CALENDAR_DAYS' | 'ACTUAL_WORKING_DAYS' | 'FIXED_30_DAYS';
    leaveAllowanceMethod: 'BASIC_SALARY' | 'BASIC_PLUS_HOUSING' | 'TOTAL_SALARY';
    leaveDailyRateDivisor: number;

    // إعدادات قسيمة الراتب
    showCompanyContributions: boolean;
    showClosingDateOnPayslip: boolean;
    deductAbsenceFromBasic: boolean;
    showActualAbsenceDays: boolean;

    // أرصدة الرواتب السلبية
    enableNegativeBalanceCarryover: boolean;
    settleNegativeAsTransaction: boolean;

    // إضافية
    roundSalaryToNearest: number;
    defaultWorkingDaysPerMonth: number;

    // === الميزات الجديدة (1-10) ===
    // 1. معامل الوقت الإضافي العادي
    overtimeMultiplier: number;
    // 2. فترة السماح للتأخير (بالدقائق)
    gracePeriodMinutes: number;
    // 3. معدل إضافي لعطلة نهاية الأسبوع
    weekendOvertimeMultiplier: number;
    // 4. معدل إضافي للأعياد والعطل الرسمية
    holidayOvertimeMultiplier: number;
    // 5. بدل المناوبة الليلية (نسبة مئوية)
    nightShiftAllowancePercent: number;
    // 6. الحد الأقصى للخصومات
    maxDeductionPercent: number;
    // 7. الحد الأدنى للراتب الصافي
    minNetSalary: number;
    // 8. يوم القفل التلقائي
    autoLockDay: number;
    // 9. العملة الافتراضية
    defaultCurrency: string;
    // 10. تفعيل العملات المتعددة
    enableMultiCurrency: boolean;

    // === الميزات الجديدة (11-20) ===
    // 11. تفعيل تتبع المكافآت
    enableBonusTracking: boolean;
    // 12. طريقة حساب المكافأة
    bonusCalculationMethod: 'FIXED' | 'PERCENTAGE' | 'PERFORMANCE_BASED';
    // 13. تفعيل العمولات
    enableCommission: boolean;
    // 14. أساس حساب العمولة
    commissionCalculationBase: 'SALES' | 'PROFIT' | 'CUSTOM';
    // 15. تفعيل فئات البدلات المتعددة
    enableAllowanceCategories: boolean;
    // 16. الحد الأقصى للبدلات
    maxAllowancePercent: number;
    // 17. تفعيل حساب الضرائب
    enableTaxCalculation: boolean;
    // 18. طريقة حساب الضرائب
    taxCalculationMethod: 'FLAT_RATE' | 'PROGRESSIVE' | 'EXEMPT';
    // 19. تفعيل السلفة على الراتب
    enableSalaryAdvance: boolean;
    // 20. الحد الأقصى للسلفة
    maxAdvancePercent: number;

    // === الميزات الجديدة (21-30) ===
    // 21. تفعيل خصم القروض
    enableLoanDeduction: boolean;
    // 22. الحد الأقصى لخصم القرض
    maxLoanDeductionPercent: number;
    // 23. تفعيل سير عمل الموافقة
    enableApprovalWorkflow: boolean;
    // 24. عدد مستويات الموافقة
    approvalLevels: number;
    // 25. تفعيل التحويل البنكي
    enableBankTransfer: boolean;
    // 26. رمز البنك الافتراضي
    defaultBankCode: string;
    // 27. تفعيل الدفع بأثر رجعي
    enableRetroactivePay: boolean;
    // 28. حد الأشهر للدفع بأثر رجعي
    retroactiveMonthsLimit: number;
    // 29. تفعيل حساب نهاية الخدمة
    enableEosCalculation: boolean;
    // 30. طريقة حساب نهاية الخدمة
    eosCalculationMethod: 'SAUDI_LABOR_LAW' | 'CUSTOM' | 'CONTRACTUAL';

    // === الميزات الجديدة (31-40) ===
    // 31. تفعيل حساب التأمينات (GOSI)
    enableGosiCalculation: boolean;
    // 32. نسبة التأمينات على الموظف
    gosiEmployeePercent: number;
    // 33. نسبة التأمينات على صاحب العمل
    gosiEmployerPercent: number;
    // 34. تفعيل صرف رصيد الإجازات
    enableVacationEncashment: boolean;
    // 35. طريقة صرف الإجازات
    vacationEncashmentMethod: 'ON_TERMINATION' | 'ON_REQUEST' | 'ANNUAL';
    // 36. تفعيل عقوبات الحضور
    enableAttendancePenalty: boolean;
    // 37. طريقة خصم التأخير
    lateDeductionMethod: 'PER_MINUTE' | 'PER_HOUR' | 'DAILY_RATE';
    // 37.1 حد دقائق التأخير لخصم يوم كامل
    lateThresholdMinutes: number;
    // 38. طريقة خصم الغياب
    absenceDeductionMethod: 'DAILY_RATE' | 'HALF_DAY' | 'PROGRESSIVE';
    // 38.1 معدل الخصم التصاعدي للغياب
    absenceProgressiveRate: number;
    // 38.2 تفعيل خصم الانصراف المبكر
    enableEarlyDeparturePenalty: boolean;
    // 38.3 طريقة خصم الانصراف المبكر
    earlyDepartureDeductionMethod: 'PER_MINUTE' | 'PER_HOUR' | 'DAILY_RATE';
    // 38.4 حد دقائق الانصراف المبكر
    earlyDepartureThresholdMinutes: number;
    // 38.5 تفعيل الخصم التراكمي للتأخير
    enableCumulativeLateDeduction: boolean;
    // 38.6 عدد مرات التأخير لخصم يوم
    lateCountForDayDeduction: number;
    // 38.7 الحد الأقصى للراتب الخاضع للتأمينات
    gosiMaxSalary: number;
    // 38.8 تفعيل حساب ساند
    enableSanedCalculation: boolean;
    // 38.9 نسبة ساند على الموظف
    sanedEmployeePercent: number;
    // 38.10 نسبة ساند على صاحب العمل
    sanedEmployerPercent: number;
    // 38.11 نسبة الأخطار المهنية
    hazardRatePercent: number;
    // 39. تفعيل إرسال قسيمة الراتب بالبريد
    enablePayslipEmail: boolean;
    // 40. لغة قسيمة الراتب
    payslipLanguage: 'AR' | 'EN' | 'BOTH';

    // === الميزات الجديدة (41-50) ===
    // 41. تفعيل الحد الأقصى للوقت الإضافي
    enableOvertimeCap: boolean;
    // 42. الحد الأقصى لساعات الوقت الإضافي شهرياً
    maxOvertimeHoursPerMonth: number;
    // 43. تفعيل توليد الرواتب التلقائي
    enableAutoPayrollGeneration: boolean;
    // 44. يوم توليد الرواتب التلقائي
    autoPayrollGenerationDay: number;
    // 45. تفعيل سجل تدقيق الرواتب
    enablePayrollAuditTrail: boolean;
    // 46. تفعيل تقريب الراتب
    enableSalaryRounding: boolean;
    // 47. طريقة تقريب الراتب
    salaryRoundingMethod: 'UP' | 'DOWN' | 'NEAREST';
    // 48. تفعيل ميزانية القسم
    enableDepartmentBudget: boolean;
    // 49. تفعيل تتبع مركز التكلفة
    enableCostCenterTracking: boolean;
    // 50. صيغة تصدير الرواتب الافتراضية
    defaultPayrollExportFormat: 'PDF' | 'EXCEL' | 'CSV' | 'WPS';

    // === جدول دفع الرواتب (51-52) ===
    // 51. نوع يوم الدفع (آخر يوم عمل أو يوم محدد)
    paymentDayType?: 'LAST_WORKING_DAY' | 'FIXED_DAY';
    // 52. يوم الدفع (إذا كان نوع الدفع يوم محدد)
    paymentDay?: number;

    // === NEW: Sick Leave Settings (إعدادات الإجازة المرضية) ===
    enableSickLeaveDeduction?: boolean;
    sickLeavePartialPayPercent?: number;
    sickLeaveFullPayDays?: number;
    sickLeavePartialPayDays?: number;
    sickLeaveUnpaidDays?: number;

    // === NEW: Working Hours Settings (إعدادات ساعات العمل) ===
    dailyWorkingHours?: number;
    weeklyWorkingDays?: number;
    workingDaysPerWeek?: number;

    // === NEW: Rate Settings (إعدادات المعدلات) ===
    overtimeRate?: number;
    weekendOvertimeRate?: number;
    holidayOvertimeRate?: number;
    lateDeductionRate?: number;
    absenceDeductionRate?: number;

    // === NEW: GOSI Configuration (إعدادات التأمينات) ===
    includeHousingInGosi?: boolean;
    includeTransportInGosi?: boolean;

    // === NEW: Leave Settings (إعدادات الإجازات) ===
    defaultLeaveDays?: number;
    leaveCarryOverDays?: number;
    probationLeaveEnabled?: boolean;
    autoApproveLeave?: boolean;
    enableOvertimeApproval?: boolean;

    // === NEW: EOS Settings (إعدادات نهاية الخدمة) ===
    autoCalculateEos?: boolean;
    eosFirstYearsRate?: number;
    eosLaterYearsRate?: number;
    eosThresholdYears?: number;
    eosContractualRate?: number;

    // === NEW: Display Settings (إعدادات العرض) ===
    calculationMethod?: string;
    payslipTemplate?: string;
    showSalaryBreakdown?: boolean;
    showYtdTotals?: boolean;
}


export const payrollSettingsService = {
    async getSettings(): Promise<PayrollSettingsData> {
        const response = await api.get('/payroll-settings') as PayrollSettingsData | { data: PayrollSettingsData };
        return (response as any).data || response as PayrollSettingsData;
    },

    async updateSettings(data: Partial<PayrollSettingsData>): Promise<PayrollSettingsData> {
        const response = await api.patch('/payroll-settings', data) as PayrollSettingsData | { data: PayrollSettingsData };
        return (response as any).data || response as PayrollSettingsData;
    },

    async resetToDefaults(): Promise<PayrollSettingsData> {
        const response = await api.post('/payroll-settings/reset', {}) as PayrollSettingsData | { data: PayrollSettingsData };
        return (response as any).data || response as PayrollSettingsData;
    },
};
