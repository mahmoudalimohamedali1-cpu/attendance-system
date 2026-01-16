import { PrismaService } from '../../common/prisma/prisma.service';
export declare class UpdatePayrollSettingsDto {
    payrollClosingDay?: number;
    hireTerminationCalcBase?: 'CALENDAR_DAYS' | 'ACTUAL_WORKING_DAYS' | 'FIXED_30_DAYS';
    hireTerminationMethod?: 'EXCLUDE_WEEKENDS' | 'INCLUDE_ALL_DAYS' | 'PRORATE_BY_CALENDAR';
    unpaidLeaveCalcBase?: 'CALENDAR_DAYS' | 'ACTUAL_WORKING_DAYS' | 'FIXED_30_DAYS';
    unpaidLeaveMethod?: 'BASED_ON_SHIFTS' | 'BASED_ON_CALENDAR' | 'BASED_ON_WORKING_DAYS';
    splitUnpaidByClosingDate?: boolean;
    overtimeCalcBase?: 'CALENDAR_DAYS' | 'ACTUAL_WORKING_DAYS' | 'FIXED_30_DAYS';
    overtimeMethod?: 'BASED_ON_SHIFTS' | 'BASED_ON_BASIC_ONLY' | 'BASED_ON_TOTAL' | 'BASED_ON_ELIGIBLE_COMPONENTS';
    leaveAllowanceCalcBase?: 'CALENDAR_DAYS' | 'ACTUAL_WORKING_DAYS' | 'FIXED_30_DAYS';
    leaveAllowanceMethod?: 'BASIC_SALARY' | 'BASIC_PLUS_HOUSING' | 'TOTAL_SALARY';
    showCompanyContributions?: boolean;
    showClosingDateOnPayslip?: boolean;
    deductAbsenceFromBasic?: boolean;
    showActualAbsenceDays?: boolean;
    enableNegativeBalanceCarryover?: boolean;
    settleNegativeAsTransaction?: boolean;
    roundSalaryToNearest?: number;
    defaultWorkingDaysPerMonth?: number;
    leaveDailyRateDivisor?: number;
}
export declare class PayrollSettingsService {
    private prisma;
    constructor(prisma: PrismaService);
    getSettings(companyId: string): Promise<any>;
    updateSettings(companyId: string, data: UpdatePayrollSettingsDto): Promise<any>;
    resetToDefaults(companyId: string): Promise<any>;
}
