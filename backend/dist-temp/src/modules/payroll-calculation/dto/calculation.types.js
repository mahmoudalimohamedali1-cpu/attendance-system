"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CALCULATION_SETTINGS = exports.OvertimeSource = exports.CalculationMethod = void 0;
var CalculationMethod;
(function (CalculationMethod) {
    CalculationMethod["CALENDAR_DAYS"] = "CALENDAR_DAYS";
    CalculationMethod["WORKING_DAYS"] = "WORKING_DAYS";
    CalculationMethod["FIXED_30"] = "FIXED_30";
})(CalculationMethod || (exports.CalculationMethod = CalculationMethod = {}));
var OvertimeSource;
(function (OvertimeSource) {
    OvertimeSource["BASIC_ONLY"] = "BASIC_ONLY";
    OvertimeSource["BASIC_PLUS_ALLOWANCES"] = "BASIC_PLUS_ALLOWANCES";
})(OvertimeSource || (exports.OvertimeSource = OvertimeSource = {}));
exports.DEFAULT_CALCULATION_SETTINGS = {
    calculationMethod: CalculationMethod.FIXED_30,
    overtimeSource: OvertimeSource.BASIC_ONLY,
    overtimeMultiplier: 1.5,
    fullDayAbsenceDeduction: true,
    gracePeriodMinutes: 15,
    deductionPriority: ['GOSI', 'LOAN', 'ABSENCE', 'LATE', 'PENALTY'],
    carryOverDeductions: false,
    payrollClosingDay: 25,
    hireTerminationCalcBase: 'CALENDAR_DAYS',
    hireTerminationMethod: 'EXCLUDE_WEEKENDS',
    unpaidLeaveCalcBase: 'ACTUAL_WORKING_DAYS',
    unpaidLeaveMethod: 'BASED_ON_SHIFTS',
    splitUnpaidByClosingDate: false,
    overtimeCalcBase: 'ACTUAL_WORKING_DAYS',
    overtimeMethod: 'BASED_ON_SHIFTS',
    leaveAllowanceCalcBase: 'CALENDAR_DAYS',
    leaveAllowanceMethod: 'BASIC_PLUS_HOUSING',
    showCompanyContributions: true,
    showClosingDateOnPayslip: true,
    deductAbsenceFromBasic: true,
    showActualAbsenceDays: false,
    enableNegativeBalanceCarryover: false,
    settleNegativeAsTransaction: false,
    roundSalaryToNearest: 0,
    defaultWorkingDaysPerMonth: 30,
    leaveDailyRateDivisor: 30,
};
//# sourceMappingURL=calculation.types.js.map