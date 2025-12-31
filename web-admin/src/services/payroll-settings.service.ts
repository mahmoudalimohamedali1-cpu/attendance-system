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
