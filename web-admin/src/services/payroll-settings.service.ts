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
    overtimeMethod: 'BASED_ON_SHIFTS' | 'BASED_ON_BASIC_ONLY' | 'BASED_ON_TOTAL';

    // حساب بدل أيام الإجازة
    leaveAllowanceCalcBase: 'CALENDAR_DAYS' | 'ACTUAL_WORKING_DAYS' | 'FIXED_30_DAYS';
    leaveAllowanceMethod: 'BASIC_SALARY' | 'BASIC_PLUS_HOUSING' | 'TOTAL_SALARY';

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
        return api.get('/payroll-settings');
    },

    async updateSettings(data: Partial<PayrollSettingsData>): Promise<PayrollSettingsData> {
        return api.patch('/payroll-settings', data);
    },

    async resetToDefaults(): Promise<PayrollSettingsData> {
        return api.post('/payroll-settings/reset', {});
    },
};
