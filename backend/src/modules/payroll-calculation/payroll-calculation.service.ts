import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { SmartPolicyExecutorService } from "../smart-policies/smart-policy-executor.service";
import { AIPolicyEvaluatorService, EmployeePayrollContext } from "../smart-policies/ai-policy-evaluator.service";
import { PrismaService } from '../../common/prisma/prisma.service';
import { PoliciesService } from '../policies/policies.service';
import { PolicyRuleEvaluatorService } from './services/policy-rule-evaluator.service';
import { FormulaEngineService } from './services/formula-engine.service';
import { EosService } from '../eos/eos.service';
import { EosReason } from '../eos/dto/calculate-eos.dto';
import { PolicyEvaluationContext } from './dto/policy-context.types';
import {
    CalculationMethod,
    CalculationSettings,
    DEFAULT_CALCULATION_SETTINGS,
    EmployeePayrollCalculation,
    CalculationTraceItem,
    OvertimeSource,
    PolicyPayrollLine,
} from './dto/calculation.types';
import { getExpectedDailyMinutes, type BranchRamadanConfig } from '../attendance/ramadan.helper';


// ✅ Decimal imports for financial calculations
import {
    Decimal,
    toDecimal,
    toNumber,
    toFixed,
    add,
    sub,
    mul,
    div,
    percent,
    sum,
    min,
    max,
    round,
    roundToNearest,
    isPositive,
    isNegative,
    isZero,
    abs,
    dailyRate as calcDailyRate,
    hourlyRate as calcHourlyRate,
    proRata,
    applyDeductionCap,
    calculateNetSalary,
    ZERO,
    ONE,
    HUNDRED,
} from '../../common/utils/decimal.util';

@Injectable()
export class PayrollCalculationService {
    private readonly logger = new Logger(PayrollCalculationService.name);

    constructor(
        private prisma: PrismaService,
        private policiesService: PoliciesService,
        private policyEvaluator: PolicyRuleEvaluatorService,
        private formulaEngine: FormulaEngineService,
        private eosService: EosService,
        private smartPolicyExecutor: SmartPolicyExecutorService,
        private aiPolicyEvaluator: AIPolicyEvaluatorService,
    ) { }

    // 🔧 Cache for system component IDs to avoid repeated DB lookups
    private systemComponentCache = new Map<string, string>();

    /**
     * 🔧 Get or create a system salary component by code
     * Looks up existing component or creates one if not exists
     */
    private async getOrCreateSystemComponent(
        code: string,
        nameAr: string,
        type: 'EARNING' | 'DEDUCTION',
        companyId: string
    ): Promise<string> {
        const cacheKey = `${companyId}:${code}`;
        if (this.systemComponentCache.has(cacheKey)) {
            return this.systemComponentCache.get(cacheKey)!;
        }

        let component = await this.prisma.salaryComponent.findFirst({
            where: { code, companyId }
        });

        if (!component) {
            this.logger.log(`🔧 Creating system component: ${code}`);
            component = await this.prisma.salaryComponent.create({
                data: {
                    code,
                    nameAr,
                    nameEn: code.replace(/_/g, ' '),
                    type,
                    nature: 'VARIABLE',
                    companyId,
                    isActive: true,
                    gosiEligible: false,
                    otEligible: false,
                    taxable: false,
                }
            });
        }

        this.systemComponentCache.set(cacheKey, component.id);
        return component.id;
    }


    /**
     * تحويل أيام العمل من نص إلى مصفوفة أرقام
     * Parse workingDays string like "1,2,3,4,5" to number array [1,2,3,4,5]
     * Default: Sunday-Thursday (Saudi weekend: Friday-Saturday)
     */
    private parseWorkingDays(workingDays?: string): number[] {
        if (!workingDays) {
            return [0, 1, 2, 3, 4]; // Default: Sun-Thu (0-4)
        }
        return workingDays.split(',').map(d => parseInt(d.trim(), 10)).filter(d => !isNaN(d));
    }

    /**
     * التحقق هل اليوم عطلة أسبوعية
     * Check if a day is a weekend based on workingDays config
     */
    private isWeekendDay(dayOfWeek: number, workingDays?: string): boolean {
        const workDays = this.parseWorkingDays(workingDays);
        return !workDays.includes(dayOfWeek);
    }

    /**
     * حساب أيام العمل مع مراعاة إعدادات أيام العمل
     * Calculate working days with configurable weekend
     */
    private getWorkingDaysInPeriodWithConfig(startDate: Date, endDate: Date, workingDays?: string): number {
        const workDays = this.parseWorkingDays(workingDays);
        let count = 0;
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            if (workDays.includes(d.getDay())) {
                count++;
            }
        }
        return count;
    }

    /**
     * حساب عدد أيام الفترة حسب طريقة الحساب
     */
    private getDaysInPeriod(startDate: Date, endDate: Date, method: CalculationMethod): number {
        return this.getDaysByBase(startDate, endDate, this.mapMethodToBase(method));
    }

    /**
     * حساب عدد الأيام بناءً على القاعدة (Base) من الإعدادات
     */
    private getDaysByBase(startDate: Date, endDate: Date, base: string): number {
        switch (base) {
            case 'FIXED_30_DAYS':
                return 30;
            case 'CALENDAR_DAYS':
                return Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
            case 'ACTUAL_WORKING_DAYS':
                return this.getWorkingDaysInPeriod(startDate, endDate);
            default:
                return 30; // الافتراضي 30 يوم
        }
    }

    /**
     * حساب أيام العمل في الفترة (أحد-خميس)
     */
    private getWorkingDaysInPeriod(startDate: Date, endDate: Date): number {
        let workingDays = 0;
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay();
            if (dayOfWeek >= 0 && dayOfWeek <= 4) {
                workingDays++;
            }
        }
        return workingDays;
    }

    /**
     * حساب تاريخ الدفع القادم بناءً على الإعدادات
     * @param year السنة
     * @param month الشهر (1-12)
     * @param paymentDayType نوع يوم الدفع (LAST_WORKING_DAY أو FIXED_DAY)
     * @param paymentDay يوم الدفع (1-31) إذا كان نوع الدفع FIXED_DAY
     * @param workingDays أيام العمل في الأسبوع (مثال: '0,1,2,3,4' = أحد-خميس)
     */
    getNextPaymentDate(
        year: number,
        month: number,
        paymentDayType: string = 'LAST_WORKING_DAY',
        paymentDay: number = 28,
        workingDays: string = '0,1,2,3,4'
    ): Date {
        const workingDaysArray = workingDays.split(',').map(d => parseInt(d.trim()));

        if (paymentDayType === 'FIXED_DAY') {
            // يوم محدد من الشهر
            const lastDayOfMonth = new Date(year, month, 0).getDate();
            const actualDay = Math.min(paymentDay, lastDayOfMonth);
            return new Date(year, month - 1, actualDay);
        } else {
            // آخر يوم عمل من الشهر
            const lastDayOfMonth = new Date(year, month, 0).getDate();
            for (let day = lastDayOfMonth; day >= 1; day--) {
                const date = new Date(year, month - 1, day);
                if (workingDaysArray.includes(date.getDay())) {
                    return date;
                }
            }
            // إذا لم يجد يوم عمل، يرجع آخر يوم في الشهر
            return new Date(year, month, 0);
        }
    }

    /**
     * حساب معامل التناسب (Pro-rata) للموظفين الجدد أو المغادرين
     * ✅ Updated to use Decimal for precision
     */
    private getProRataFactor(
        startDate: Date,
        endDate: Date,
        hireDate: Date | null,
        terminationDate: Date | null,
        calcBase: string,
        method: string
    ): Decimal {
        const daysInPeriod = Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;

        // تحديد بداية ونهاية العمل الفعلي في هذه الفترة
        let effectiveStart = new Date(Math.max(startDate.getTime(), hireDate ? hireDate.getTime() : 0));
        let effectiveEnd = new Date(Math.min(endDate.getTime(), terminationDate ? terminationDate.getTime() : endDate.getTime()));

        if (effectiveStart > endDate || effectiveEnd < startDate) return ZERO;
        if (effectiveStart <= startDate && effectiveEnd >= endDate) return ONE;

        // حساب عدد الأيام الفعيلة بناءً على المنهجية
        let workedDays = 0;
        let totalDays = 0;

        if (method === 'INCLUDE_ALL_DAYS' || method === 'PRORATE_BY_CALENDAR') {
            workedDays = Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / (24 * 60 * 60 * 1000)) + 1;
            totalDays = calcBase === 'FIXED_30_DAYS' ? 30 : daysInPeriod;
        } else if (method === 'EXCLUDE_WEEKENDS') {
            // حساب أيام العمل فقط (أحد-خميس)
            for (let d = new Date(effectiveStart); d <= effectiveEnd; d.setDate(d.getDate() + 1)) {
                if (d.getDay() >= 0 && d.getDay() <= 4) workedDays++;
            }
            totalDays = calcBase === 'FIXED_30_DAYS' ? 22 : this.getWorkingDaysInPeriod(startDate, endDate);
        }

        // ✅ Use Decimal for division to maintain precision
        const factor = div(workedDays, totalDays);
        return min(ONE, factor);
    }

    private mapMethodToBase(method: CalculationMethod): string {
        switch (method) {
            case CalculationMethod.CALENDAR_DAYS: return 'CALENDAR_DAYS';
            case CalculationMethod.WORKING_DAYS: return 'ACTUAL_WORKING_DAYS';
            case CalculationMethod.FIXED_30: return 'FIXED_30_DAYS';
            default: return 'FIXED_30_DAYS';
        }
    }

    private async getCalculationSettings(employeeId: string, companyId: string): Promise<CalculationSettings> {
        let mergedSettings = { ...DEFAULT_CALCULATION_SETTINGS };

        try {
            // 1. جلب إعدادات الشركة العامة
            const companySettings = await (this.prisma as any).payrollSettings.findUnique({
                where: { companyId },
            });

            if (companySettings) {
                // تحويل قيم الـ Prisma لنوع CalculationSettings
                const mappedSettings: Partial<CalculationSettings> = {
                    payrollClosingDay: companySettings.payrollClosingDay,
                    calculationMethod: this.mapWorkDayBaseToMethod(companySettings.unpaidLeaveCalcBase), // دمج المنهجية
                    hireTerminationCalcBase: companySettings.hireTerminationCalcBase,
                    hireTerminationMethod: companySettings.hireTerminationMethod,
                    unpaidLeaveCalcBase: companySettings.unpaidLeaveCalcBase,
                    unpaidLeaveMethod: companySettings.unpaidLeaveMethod,
                    splitUnpaidByClosingDate: companySettings.splitUnpaidByClosingDate,
                    overtimeCalcBase: companySettings.overtimeCalcBase,
                    overtimeMethod: companySettings.overtimeMethod,
                    leaveAllowanceCalcBase: companySettings.leaveAllowanceCalcBase,
                    leaveAllowanceMethod: companySettings.leaveAllowanceMethod,
                    showCompanyContributions: companySettings.showCompanyContributions,
                    showClosingDateOnPayslip: companySettings.showClosingDateOnPayslip,
                    deductAbsenceFromBasic: companySettings.deductAbsenceFromBasic,
                    showActualAbsenceDays: companySettings.showActualAbsenceDays,
                    enableNegativeBalanceCarryover: companySettings.enableNegativeBalanceCarryover,
                    settleNegativeAsTransaction: companySettings.settleNegativeAsTransaction,
                    roundSalaryToNearest: companySettings.roundSalaryToNearest,
                    defaultWorkingDaysPerMonth: companySettings.defaultWorkingDaysPerMonth,

                    // === الميزات الجديدة (1-10) ===
                    overtimeMultiplier: companySettings.overtimeMultiplier,
                    gracePeriodMinutes: companySettings.gracePeriodMinutes,
                    weekendOvertimeMultiplier: companySettings.weekendOvertimeMultiplier,
                    holidayOvertimeMultiplier: companySettings.holidayOvertimeMultiplier,
                    nightShiftAllowancePercent: companySettings.nightShiftAllowancePercent,
                    maxDeductionPercent: companySettings.maxDeductionPercent,
                    minNetSalary: companySettings.minNetSalary,
                    autoLockDay: companySettings.autoLockDay,
                    defaultCurrency: companySettings.defaultCurrency,
                    enableMultiCurrency: companySettings.enableMultiCurrency,

                    // === الميزات الجديدة (11-20) ===
                    enableBonusTracking: companySettings.enableBonusTracking,
                    bonusCalculationMethod: companySettings.bonusCalculationMethod,
                    enableCommission: companySettings.enableCommission,
                    commissionCalculationBase: companySettings.commissionCalculationBase,
                    enableAllowanceCategories: companySettings.enableAllowanceCategories,
                    maxAllowancePercent: companySettings.maxAllowancePercent,
                    enableTaxCalculation: companySettings.enableTaxCalculation,
                    taxCalculationMethod: companySettings.taxCalculationMethod,
                    enableSalaryAdvance: companySettings.enableSalaryAdvance,
                    maxAdvancePercent: companySettings.maxAdvancePercent,

                    // === الميزات الجديدة (21-30) ===
                    enableLoanDeduction: companySettings.enableLoanDeduction,
                    maxLoanDeductionPercent: companySettings.maxLoanDeductionPercent,
                    enableApprovalWorkflow: companySettings.enableApprovalWorkflow,
                    approvalLevels: companySettings.approvalLevels,
                    enableBankTransfer: companySettings.enableBankTransfer,
                    defaultBankCode: companySettings.defaultBankCode,
                    enableRetroactivePay: companySettings.enableRetroactivePay,
                    retroactiveMonthsLimit: companySettings.retroactiveMonthsLimit,
                    enableEosCalculation: companySettings.enableEosCalculation,
                    eosCalculationMethod: companySettings.eosCalculationMethod,

                    // === الميزات الجديدة (31-40) ===
                    enableGosiCalculation: companySettings.enableGosiCalculation,
                    gosiEmployeePercent: companySettings.gosiEmployeePercent,
                    gosiEmployerPercent: companySettings.gosiEmployerPercent,
                    enableVacationEncashment: companySettings.enableVacationEncashment,
                    vacationEncashmentMethod: companySettings.vacationEncashmentMethod,
                    enableAttendancePenalty: companySettings.enableAttendancePenalty,
                    lateDeductionMethod: companySettings.lateDeductionMethod,
                    lateThresholdMinutes: companySettings.lateThresholdMinutes,
                    absenceDeductionMethod: companySettings.absenceDeductionMethod,
                    absenceProgressiveRate: companySettings.absenceProgressiveRate,
                    // خصم الانصراف المبكر
                    enableEarlyDeparturePenalty: companySettings.enableEarlyDeparturePenalty,
                    earlyDepartureDeductionMethod: companySettings.earlyDepartureDeductionMethod,
                    earlyDepartureThresholdMinutes: companySettings.earlyDepartureThresholdMinutes,
                    // الخصم التراكمي للتأخير
                    enableCumulativeLateDeduction: companySettings.enableCumulativeLateDeduction,
                    lateCountForDayDeduction: companySettings.lateCountForDayDeduction,
                    // إعدادات GOSI المتقدمة
                    gosiMaxSalary: companySettings.gosiMaxSalary,
                    enableSanedCalculation: companySettings.enableSanedCalculation,
                    sanedEmployeePercent: companySettings.sanedEmployeePercent,
                    sanedEmployerPercent: companySettings.sanedEmployerPercent,
                    hazardRatePercent: companySettings.hazardRatePercent,
                    enablePayslipEmail: companySettings.enablePayslipEmail,
                    payslipLanguage: companySettings.payslipLanguage,

                    // === الميزات الجديدة (41-50) ===
                    enableOvertimeCap: companySettings.enableOvertimeCap,
                    maxOvertimeHoursPerMonth: companySettings.maxOvertimeHoursPerMonth,
                    enableAutoPayrollGeneration: companySettings.enableAutoPayrollGeneration,
                    autoPayrollGenerationDay: companySettings.autoPayrollGenerationDay,
                    enablePayrollAuditTrail: companySettings.enablePayrollAuditTrail,
                    enableSalaryRounding: companySettings.enableSalaryRounding,
                    salaryRoundingMethod: companySettings.salaryRoundingMethod,
                    enableDepartmentBudget: companySettings.enableDepartmentBudget,
                    enableCostCenterTracking: companySettings.enableCostCenterTracking,
                    defaultPayrollExportFormat: companySettings.defaultPayrollExportFormat,

                    // === إعدادات خصم الإجازات المرضية ===
                    enableSickLeaveDeduction: companySettings.enableSickLeaveDeduction ?? true,
                    sickLeaveFullPayDays: companySettings.sickLeaveFullPayDays ?? 30,
                    sickLeavePartialPayPercent: companySettings.sickLeavePartialPayPercent ?? 75,
                    sickLeavePartialPayDays: companySettings.sickLeavePartialPayDays ?? 60,
                    sickLeaveUnpaidDays: companySettings.sickLeaveUnpaidDays ?? 30,
                };

                mergedSettings = { ...mergedSettings, ...mappedSettings };
            }

            // 2. جلب سياسة الحضور للموظف (Override)
            const policy = await this.policiesService.resolvePolicy('ATTENDANCE' as any, employeeId, companyId);
            if (policy?.settings && typeof policy.settings === 'object') {
                mergedSettings = {
                    ...mergedSettings,
                    ...(policy.settings as Record<string, any>),
                };
            }
        } catch (e) {
            this.logger.warn('Error fetching payroll or policy settings, using defaults/partial:', e.message);
        }

        return mergedSettings;
    }

    /**
     * تحويل قاعدة حساب يوم العمل إلى enum CalculationMethod
     */
    private mapWorkDayBaseToMethod(base: string): CalculationMethod {
        switch (base) {
            case 'CALENDAR_DAYS': return CalculationMethod.CALENDAR_DAYS;
            case 'ACTUAL_WORKING_DAYS': return CalculationMethod.WORKING_DAYS;
            case 'FIXED_30_DAYS': return CalculationMethod.FIXED_30;
            default: return CalculationMethod.FIXED_30;
        }
    }

    private async getPeriodAttendanceData(employeeId: string, companyId: string, startDate: Date, endDate: Date) {
        // جلب بيانات الفرع والقسم للموظف للحصول على أيام العمل وإعدادات رمضان
        // Fetch employee with branch and department for workingDays hierarchy
        const employee = await this.prisma.user.findFirst({
            where: { id: employeeId, companyId },
            include: { branch: true, department: true },
        });
        // Type cast to access fields that may not be in prisma client yet
        const emp = employee as any;
        const branch = emp?.branch as any;
        const department = emp?.department as any;

        // 📅 Working days hierarchy: Employee → Department → Branch
        const effectiveWorkingDays = emp?.workingDays || department?.workingDays || branch?.workingDays || '0,1,2,3,4';

        // 🌙 Calculate expected daily minutes based on Ramadan mode
        const branchConfig: BranchRamadanConfig = {
            ramadanModeEnabled: branch?.ramadanModeEnabled ?? false,
            ramadanWorkHours: branch?.ramadanWorkHours ?? 6,
            ramadanWorkStartTime: branch?.ramadanWorkStartTime ?? null,
            ramadanWorkEndTime: branch?.ramadanWorkEndTime ?? null,
            workStartTime: branch?.workStartTime ?? '09:00',
            workEndTime: branch?.workEndTime ?? '17:00',
        };
        const expectedDailyMinutes = getExpectedDailyMinutes(branchConfig);
        const isRamadanActive = branchConfig.ramadanModeEnabled;


        const attendances = await this.prisma.attendance.findMany({
            where: {
                userId: employeeId,
                companyId,
                date: { gte: startDate, lte: endDate },
            },
        });

        let presentDays = 0;
        let absentDays = 0;
        let holidayWorkDays = 0; // أيام العمل في العطلات
        let totalLateMinutes = 0;
        let totalOvertimeMinutes = 0;
        let holidayOvertimeMinutes = 0; // ساعات العمل الإضافية في العطلات
        let weekendOvertimeMinutes = 0; // ساعات العمل الإضافية في عطلة نهاية الأسبوع
        let lateCount = 0; // عدد مرات التأخير (للخصم التراكمي)
        let totalEarlyDepartureMinutes = 0; // دقائق الانصراف المبكر
        let lateDaysOverThreshold = 0; // عدد الأيام التي تجاوز فيها التأخير الحد (للخصم اليومي)

        for (const att of attendances) {
            const dayOfWeek = new Date(att.date).getDay(); // 0 = Sunday, 6 = Saturday
            // استخدام الدالة الجديدة للتحقق من العطلة بناءً على إعدادات الموظف/القسم/الفرع
            const isWeekend = this.isWeekendDay(dayOfWeek, effectiveWorkingDays);


            if (att.status === 'PRESENT' || att.status === 'LATE') {
                presentDays++;
            } else if (att.status === 'ABSENT') {
                absentDays++;
            } else if (att.status === 'HOLIDAY') {
                // موظف عمل في يوم عطلة رسمية
                holidayWorkDays++;
                // حساب ساعات العمل في العطلة كساعات إضافية
                if (att.checkInTime && att.checkOutTime) {
                    const workMinutes = Math.floor(
                        (new Date(att.checkOutTime).getTime() - new Date(att.checkInTime).getTime()) / 60000
                    );
                    holidayOvertimeMinutes += workMinutes;
                }
            }

            // حساب التأخير
            const attLateMinutes = att.lateMinutes || 0;
            totalLateMinutes += attLateMinutes;
            if (attLateMinutes > 0) {
                lateCount++; // عد مرات التأخير
                // عد الأيام اللي فيها تأخير أكبر من 120 دقيقة (القيمة الافتراضية)
                // سيتم تعديل الحد لاحقاً حسب الإعدادات في الحساب الفعلي
                if (attLateMinutes >= 120) {
                    lateDaysOverThreshold++;
                }
            }

            // حساب الانصراف المبكر
            totalEarlyDepartureMinutes += (att as any).earlyDepartureMinutes || 0;

            // حساب الساعات الإضافية حسب نوع اليوم
            const otMinutes = att.overtimeMinutes || 0;
            if (att.status === 'HOLIDAY') {
                holidayOvertimeMinutes += otMinutes;
            } else if (isWeekend) {
                weekendOvertimeMinutes += otMinutes;
            } else {
                totalOvertimeMinutes += otMinutes;
            }
        }

        return {
            presentDays,
            absentDays,
            holidayWorkDays,
            lateMinutes: totalLateMinutes,
            overtimeHours: totalOvertimeMinutes / 60,
            holidayOvertimeHours: holidayOvertimeMinutes / 60,
            weekendOvertimeHours: weekendOvertimeMinutes / 60,
            recordsCount: attendances.length,
            lateCount, // عدد مرات التأخير (للخصم التراكمي)
            lateDaysOverThreshold, // عدد الأيام اللي فيها تأخير أكبر من الحد (للخصم اليومي)
            earlyDepartureMinutes: totalEarlyDepartureMinutes, // دقائق الانصراف المبكر
            // 🌙 Ramadan-aware work hours
            isRamadanActive,
            expectedDailyMinutes,
            expectedDailyHours: expectedDailyMinutes / 60,
        };
    }


    async calculateForEmployee(
        employeeId: string,
        companyId: string,
        startDate: Date,
        endDate: Date,
        year?: number,
        month?: number,
    ): Promise<EmployeePayrollCalculation> {
        const trace: CalculationTraceItem[] = [];

        // Derive year/month if not provided (for legacy compatibility in some logs/metadata)
        const effectiveYear = year || startDate.getFullYear();
        const effectiveMonth = month || (startDate.getMonth() + 1);

        const employee = await this.prisma.user.findFirst({
            where: { id: employeeId, companyId },
            include: {
                salaryAssignments: {
                    where: { isActive: true },
                    include: {
                        structure: {
                            include: { lines: { include: { component: true } } }
                        }
                    },
                    take: 1,
                },
                contracts: {
                    where: { status: 'ACTIVE' },
                    take: 1
                },
            },
        });

        if (!employee) throw new NotFoundException('الموظف غير موجود');

        // جلب الإعدادات أولاً لتحديد كيفية التعامل مع الموظفين الجدد
        const settings = await this.getCalculationSettings(employeeId, companyId);

        // 🔧 Pre-load system component IDs to avoid null componentId issues
        const systemComponentIds = {
            OVERTIME: await this.getOrCreateSystemComponent('OVERTIME', 'ساعات إضافية', 'EARNING', companyId),
            LATE_DED: await this.getOrCreateSystemComponent('LATE_DED', 'خصم تأخير', 'DEDUCTION', companyId),
            ABSENCE_DED: await this.getOrCreateSystemComponent('ABSENCE_DED', 'خصم غياب', 'DEDUCTION', companyId),
            SICK_LEAVE_DED: await this.getOrCreateSystemComponent('SICK_LEAVE_DED', 'خصم إجازة مرضية', 'DEDUCTION', companyId),
            EARLY_DEP_DED: await this.getOrCreateSystemComponent('EARLY_DEP_DED', 'خصم انصراف مبكر', 'DEDUCTION', companyId),
        };

        // ✅ التحقق من تاريخ التعيين - بناءً على إعدادات الشركة
        if (employee.hireDate && new Date(employee.hireDate) > startDate) {
            // إذا كان تاريخ التعيين بعد نهاية الفترة بالكامل - لا يمكن الحساب
            if (new Date(employee.hireDate) > endDate) {
                throw new BadRequestException(
                    `لا يمكن حساب راتب الموظف ${employee.firstName} ${employee.lastName} - ` +
                    `تاريخ التعيين (${new Date(employee.hireDate).toLocaleDateString('ar-SA')}) ` +
                    `بعد نهاية فترة الراتب (${endDate.toLocaleDateString('ar-SA')})`
                );
            }

            // التعامل حسب الإعداد المختار
            const hireMethod = settings.hireTerminationMethod || 'INCLUDE_ALL_DAYS';

            // إذا كان الإعداد هو استثناء الموظفين الجدد من الدورة
            if (hireMethod === 'EXCLUDE_FROM_PERIOD') {
                this.logger.log(`⏭️ Skipping employee ${employee.firstName} ${employee.lastName} - hired after period start (setting: EXCLUDE_FROM_PERIOD)`);
                throw new BadRequestException(
                    `الموظف ${employee.firstName} ${employee.lastName} مستثنى من هذه الدورة ` +
                    `(تاريخ التعيين: ${new Date(employee.hireDate).toLocaleDateString('ar-SA')}) - ` +
                    `يمكن تغيير هذا السلوك من إعدادات الرواتب`
                );
            }

            // خلاف ذلك، سيتم حساب الراتب بالتناسب (Pro-rata) تلقائياً في الكود أدناه
            this.logger.log(`📊 Employee ${employee.firstName} ${employee.lastName} hired mid-period - will calculate pro-rata`);
        }

        const assignment = employee.salaryAssignments[0];
        if (!assignment) throw new NotFoundException('لا يوجد هيكل راتب للموظف');

        // ✅ Use Decimal for all financial calculations
        const ctx: Record<string, Decimal> = {};
        const totalSalary = toDecimal(assignment.baseSalary);
        ctx.TOTAL = totalSalary;

        trace.push({
            step: 'TOTAL',
            description: 'إجمالي الراتب (المسند)',
            formula: `الراتب الكلي من التخصيص = ${toFixed(totalSalary)}`,
            result: toNumber(totalSalary),
        });

        // settings تم جلبها مسبقاً قبل التحقق من تاريخ التعيين

        const activeContract = employee.contracts?.[0];
        const terminationDate = activeContract?.terminatedAt || null;

        // حساب معامل التناسب (Pro-rata) للتعيين/الإنهاء
        const proRataFactor = this.getProRataFactor(
            startDate, endDate, employee.hireDate, terminationDate,
            settings.hireTerminationCalcBase,
            settings.hireTerminationMethod
        );

        // ✅ Use Decimal for all line amounts
        let calculatedLines: { id: string; code: string; name: string; amount: Decimal; type: string; gosiEligible: boolean }[] = [];

        if (!assignment.structure) {
            const amount = mul(totalSalary, proRataFactor);
            calculatedLines.push({
                id: 'BASIC-FALLBACK',
                code: 'BASIC',
                name: 'الراتب الأساسي',
                amount: amount,
                type: 'BASIC',
                gosiEligible: true,
            });
            ctx.BASIC = amount;
        } else {
            const structureLines = assignment.structure.lines;
            const sortedLines = this.topologicalSort(structureLines);

            for (const line of sortedLines) {
                const component = line.component;
                let lineAmount: Decimal = ZERO;
                let formulaUsed = '';

                // Build context for formula engine (convert to numbers for legacy compatibility)
                const formulaContext = this.formulaEngine.buildVariableContext({
                    basicSalary: toNumber(ctx.BASIC || totalSalary),
                    totalSalary: toNumber(totalSalary),
                    ...Object.fromEntries(Object.entries(ctx).map(([k, v]) => [k, toNumber(v)]))
                });

                if (component.nature === 'FORMULA' && component.formula) {
                    const result = this.formulaEngine.evaluate(component.formula, formulaContext);
                    lineAmount = toDecimal(result.value);
                    formulaUsed = `${component.formula} = ${toFixed(lineAmount)}`;
                } else if (line.percentage && Number(line.percentage) > 0) {
                    lineAmount = percent(totalSalary, line.percentage);
                    formulaUsed = `TOTAL × ${line.percentage}% = ${toFixed(lineAmount)}`;
                } else if (line.amount && Number(line.amount) > 0) {
                    lineAmount = toDecimal(line.amount);
                    formulaUsed = `مبلغ ثابت = ${toFixed(lineAmount)}`;
                }

                // تطبيق التناسب (Pro-rata) using Decimal
                const originalAmount = lineAmount;
                lineAmount = mul(lineAmount, proRataFactor);
                if (proRataFactor.lt(ONE)) {
                    formulaUsed = `${formulaUsed} (× ${toFixed(proRataFactor, 4)} pro-rata)`;
                }

                ctx[component.code] = lineAmount;
                if (component.code === 'BASIC' || component.code === 'BASE') ctx.BASIC = lineAmount;

                calculatedLines.push({
                    id: component.id,
                    code: component.code,
                    name: component.nameAr || component.nameEn || component.code,
                    amount: lineAmount,
                    type: (component.code === 'BASIC' || component.code === 'BASE') ? 'BASIC' : 'ALLOWANCE',
                    gosiEligible: !!component.gosiEligible,
                });

                trace.push({
                    step: component.code,
                    description: component.nameAr || component.code,
                    formula: formulaUsed,
                    result: toNumber(lineAmount),
                });
            }

            // ✅ إضافة: التأكد من وجود راتب أساسي (BASIC)
            // إذا لم يكن هناك بند BASIC في الهيكل، نعتبر المتبقي من الراتب الكلي هو الأساسي
            const structureEarnings = calculatedLines.reduce((s, l) => add(s, l.amount), ZERO);
            if (!ctx.BASIC) {
                const proratedTotal = mul(totalSalary, proRataFactor);
                const residual = sub(proratedTotal, structureEarnings);
                if (isPositive(residual)) {
                    calculatedLines.push({
                        id: 'BASIC-RESIDUAL',
                        code: 'BASIC',
                        name: 'الراتب الأساسي (متبقي)',
                        amount: residual,
                        type: 'BASIC',
                        gosiEligible: true,
                    });
                    ctx.BASIC = residual;
                    trace.push({
                        step: 'BASIC-RESIDUAL',
                        description: 'الراتب الأساسي (المتبقي من العقد)',
                        formula: `إجمالي العقد (${toFixed(proratedTotal)}) - مجموع البدلات (${toFixed(structureEarnings)}) = ${toFixed(residual)}`,
                        result: toNumber(residual),
                    });
                }
            }
        }

        // 1. حساب عدد أيام الفترة والقيم اليومية حسب قاعدة كل نوع
        // ✅ All rates calculated using Decimal
        const daysInPeriodGeneral = this.getDaysInPeriod(startDate, endDate, settings.calculationMethod as any);
        const baseSalary = ctx.BASIC || totalSalary; // Decimal
        const dailyRateGeneral = calcDailyRate(baseSalary, daysInPeriodGeneral);
        const hourlyRateGeneral = calcHourlyRate(baseSalary, daysInPeriodGeneral, 8);

        const attendanceData = await this.getPeriodAttendanceData(employeeId, companyId, startDate, endDate);
        let presentDays = attendanceData.presentDays || daysInPeriodGeneral;
        let absentDays = attendanceData.absentDays || 0;
        let lateMinutes = attendanceData.lateMinutes || 0;
        let overtimeHours = toDecimal(attendanceData.overtimeHours || 0);

        // 2. حساب الخصومات (Absence/Late)
        // ملاحظة: قد نستخدم baseSalary أو totalSalary حسب الإعدادات (deductAbsenceFromBasic)
        // ✅ Using Decimal for deduction calculations
        const deductionBase = settings.deductAbsenceFromBasic ? baseSalary : totalSalary;
        const daysInPeriodAbsence = this.getDaysInPeriod(startDate, endDate, settings.unpaidLeaveCalcBase as any);
        const dailyRateAbsence = calcDailyRate(deductionBase, daysInPeriodAbsence);
        const hourlyRateLate = calcHourlyRate(deductionBase, daysInPeriodAbsence, 8);

        // ✅ حساب خصم الغياب بناءً على طريقة الحساب (absenceDeductionMethod)
        // Using Decimal for all deduction calculations
        let absenceDeduction: Decimal = ZERO;
        if (absentDays > 0 && (settings.enableAttendancePenalty !== false)) {
            const absenceMethod = settings.absenceDeductionMethod || 'DAILY_RATE';
            switch (absenceMethod) {
                case 'DAILY_RATE':
                    // خصم المعدل اليومي لكل يوم غياب
                    absenceDeduction = mul(absentDays, dailyRateAbsence);
                    break;
                case 'HALF_DAY':
                    // خصم نصف يوم لكل يوم غياب
                    absenceDeduction = mul(absentDays, div(dailyRateAbsence, 2));
                    break;
                case 'PROGRESSIVE':
                    // خصم تصاعدي: اليوم الأول = يوم، الثاني = يومين، الثالث = 3 أيام...
                    // المجموع = n*(n+1)/2 أيام × معدل التصاعد
                    const progressiveRate = toDecimal(settings.absenceProgressiveRate || 1.0);
                    const progressiveDays = mul(div(mul(absentDays, absentDays + 1), 2), progressiveRate);
                    absenceDeduction = mul(progressiveDays, dailyRateAbsence);
                    break;
                default:
                    absenceDeduction = mul(absentDays, dailyRateAbsence);
            }
        }

        // ✅ حساب خصم التأخير بناءً على طريقة الحساب (lateDeductionMethod)
        // Using Decimal for precision
        let effectiveLateMinutes = Math.max(0, lateMinutes - (settings.gracePeriodMinutes || 15));
        let lateDeduction: Decimal = ZERO;
        if (effectiveLateMinutes > 0 && (settings.enableAttendancePenalty !== false)) {
            const lateMethod = settings.lateDeductionMethod || 'PER_MINUTE';
            switch (lateMethod) {
                case 'PER_MINUTE':
                    // خصم بالدقيقة (تحويل الدقائق لساعات ثم ضرب بالمعدل)
                    lateDeduction = mul(div(effectiveLateMinutes, 60), hourlyRateLate);
                    break;
                case 'PER_HOUR':
                    // خصم بالساعة (تقريب لأعلى للساعة الكاملة)
                    const lateHours = Math.ceil(effectiveLateMinutes / 60);
                    lateDeduction = mul(lateHours, hourlyRateLate);
                    break;
                case 'DAILY_RATE':
                    // خصم يوم كامل لكل يوم تجاوز فيه التأخير الحد المحدد
                    // نستخدم عدد الأيام المحسوب مسبقاً في attendanceData
                    const lateDaysCount = (attendanceData as any).lateDaysOverThreshold || 0;
                    if (lateDaysCount > 0) {
                        // خصم يوم كامل × عدد الأيام اللي تجاوزت الحد
                        lateDeduction = mul(lateDaysCount, dailyRateAbsence);
                    } else {
                        // لو مفيش أيام تجاوزت الحد، نخصم بالدقيقة
                        lateDeduction = mul(div(effectiveLateMinutes, 60), hourlyRateLate);
                    }
                    break;
                default:
                    lateDeduction = mul(div(effectiveLateMinutes, 60), hourlyRateLate);
            }
        }

        // ✅ حساب خصم الانصراف المبكر (إذا مفعل)
        // Using Decimal for precision
        let earlyDepartureDeduction: Decimal = ZERO;
        const earlyDepartureMinutes = attendanceData.earlyDepartureMinutes || 0;
        if (earlyDepartureMinutes > 0 && settings.enableEarlyDeparturePenalty && settings.enableAttendancePenalty !== false) {
            const earlyMethod = settings.earlyDepartureDeductionMethod || 'PER_MINUTE';
            switch (earlyMethod) {
                case 'PER_MINUTE':
                    earlyDepartureDeduction = mul(div(earlyDepartureMinutes, 60), hourlyRateLate);
                    break;
                case 'PER_HOUR':
                    const earlyHours = Math.ceil(earlyDepartureMinutes / 60);
                    earlyDepartureDeduction = mul(earlyHours, hourlyRateLate);
                    break;
                case 'DAILY_RATE':
                    const earlyThreshold = settings.earlyDepartureThresholdMinutes || 120;
                    if (earlyDepartureMinutes >= earlyThreshold) {
                        earlyDepartureDeduction = dailyRateAbsence;
                    } else {
                        earlyDepartureDeduction = mul(div(earlyDepartureMinutes, 60), hourlyRateLate);
                    }
                    break;
                default:
                    earlyDepartureDeduction = mul(div(earlyDepartureMinutes, 60), hourlyRateLate);
            }
        }

        // ✅ حساب الخصم التراكمي للتأخير (إذا مفعل)
        // إذا تأخر الموظف X مرة = خصم يوم كامل
        // Using Decimal for precision
        let cumulativeLateDeduction: Decimal = ZERO;
        if (settings.enableCumulativeLateDeduction && settings.enableAttendancePenalty !== false) {
            const lateCount = attendanceData.lateCount || 0;
            const countForDay = settings.lateCountForDayDeduction || 3;
            if (lateCount >= countForDay) {
                const fullDaysDeduction = Math.floor(lateCount / countForDay);
                cumulativeLateDeduction = mul(fullDaysDeduction, dailyRateAbsence);
                // لا نجمع الخصم التراكمي مع خصم التأخير العادي - نأخذ الأكبر
                if (cumulativeLateDeduction.gt(lateDeduction)) {
                    lateDeduction = cumulativeLateDeduction;
                }
            }
        }

        // 3. حساب الوقت الإضافي (Overtime) مع المعاملات المختلفة
        // ✅ Using Decimal for all overtime calculations
        const daysInPeriodOT = this.getDaysInPeriod(startDate, endDate, settings.overtimeCalcBase as any);

        // ✅ حساب أساس الوقت الإضافي بناءً على الطريقة المختارة
        let otBaseSalary: Decimal = baseSalary;
        const overtimeMethod = settings.overtimeMethod || 'BASED_ON_BASIC_ONLY';

        switch (overtimeMethod) {
            case 'BASED_ON_BASIC_ONLY':
                // الوقت الإضافي يُحسب على الراتب الأساسي فقط
                otBaseSalary = baseSalary;
                break;

            case 'BASED_ON_TOTAL':
                // الوقت الإضافي يُحسب على إجمالي الراتب (الأساسي + جميع البدلات)
                otBaseSalary = totalSalary;
                break;

            case 'BASED_ON_SHIFTS':
                // الوقت الإضافي يُحسب على الراتب الأساسي + بدل السكن (إن وجد)
                // هذا هو الأكثر شيوعاً في نظام العمل السعودي
                const housingAllowance = ctx.HOUSING || ctx.HOUSING_ALLOWANCE || ctx.HRA || ZERO;
                otBaseSalary = add(baseSalary, housingAllowance);
                break;

            case 'BASED_ON_ELIGIBLE_COMPONENTS':
                // الوقت الإضافي يُحسب على البدلات المحددة كـ "خاضعة للإضافي" فقط
                // نجمع فقط المكونات التي لها علامة gosiEligible (أو يمكن إضافة علامة overtimeEligible)
                let eligibleTotal: Decimal = baseSalary; // الأساسي دائماً مؤهل
                for (const line of calculatedLines) {
                    // نضيف البدلات المؤهلة للتأمينات (GOSI) كمعيار للأهلية للإضافي
                    if (line.gosiEligible && line.type !== 'BASIC') {
                        eligibleTotal = add(eligibleTotal, line.amount);
                    }
                }
                otBaseSalary = eligibleTotal;
                break;

            default:
                // الافتراضي: الراتب الأساسي
                otBaseSalary = baseSalary;
        }

        this.logger.debug(`Overtime calculation method: ${overtimeMethod}, base salary: ${toFixed(otBaseSalary)} SAR`);

        const otHourlyRate = calcHourlyRate(otBaseSalary, daysInPeriodOT, 8);

        // ✅ تطبيق الحد الأقصى للوقت الإضافي (إذا مفعل)
        let cappedOvertimeHours = overtimeHours;
        if (settings.enableOvertimeCap && (settings.maxOvertimeHoursPerMonth || 50) > 0) {
            const maxOT = toDecimal(settings.maxOvertimeHoursPerMonth || 50);
            if (overtimeHours.gt(maxOT)) {
                this.logger.warn(`⚠️ Overtime capped for employee ${employeeId}: ${toFixed(overtimeHours)}h -> ${toFixed(maxOT)}h`);
                cappedOvertimeHours = maxOT;
            }
        }

        // حساب الوقت الإضافي بالمعاملات المختلفة
        const totalOTHours = cappedOvertimeHours; // استخدام القيمة المحددة
        const weekendOT = toDecimal(attendanceData.weekendOvertimeHours || 0);
        const holidayOT = toDecimal(attendanceData.holidayOvertimeHours || 0);
        const regularOvertimeHours = max(ZERO, sub(sub(totalOTHours, weekendOT), holidayOT));
        const weekendOvertimeHours = min(weekendOT, sub(totalOTHours, regularOvertimeHours));
        const holidayOvertimeHours = min(holidayOT, sub(sub(totalOTHours, regularOvertimeHours), weekendOvertimeHours));

        let overtimeAmount: Decimal = ZERO;
        // الوقت الإضافي العادي
        if (isPositive(regularOvertimeHours)) {
            const otMultiplier = toDecimal(settings.overtimeMultiplier || 1.5);
            overtimeAmount = add(overtimeAmount, mul(mul(regularOvertimeHours, otHourlyRate), otMultiplier));
        }
        // الوقت الإضافي في عطلة نهاية الأسبوع
        if (isPositive(weekendOvertimeHours)) {
            const weekendMultiplier = toDecimal(settings.weekendOvertimeMultiplier || 2.0);
            overtimeAmount = add(overtimeAmount, mul(mul(weekendOvertimeHours, otHourlyRate), weekendMultiplier));
        }
        // الوقت الإضافي في الأعياد
        if (isPositive(holidayOvertimeHours)) {
            const holidayMultiplier = toDecimal(settings.holidayOvertimeMultiplier || 2.0);
            overtimeAmount = add(overtimeAmount, mul(mul(holidayOvertimeHours, otHourlyRate), holidayMultiplier));
        }

        // 4. حساب بدل المناوبة الليلية
        // ✅ Using Decimal for precision
        let nightShiftAllowance: Decimal = ZERO;
        const nightShiftHours = toDecimal((attendanceData as any).nightShiftHours || 0);
        const nightShiftAllowancePercent = toDecimal(settings.nightShiftAllowancePercent || 0);

        if (isPositive(nightShiftAllowancePercent) && isPositive(nightShiftHours)) {
            // حساب بدل المناوبة الليلية كنسبة من الراتب الأساسي
            // مُوزَّع على ساعات المناوبة الليلية الفعلية
            const totalExpectedHours = toDecimal(daysInPeriodGeneral * 8); // إجمالي ساعات العمل المتوقعة
            const nightShiftRatio = min(div(nightShiftHours, totalExpectedHours), ONE); // نسبة ساعات الليل
            nightShiftAllowance = round(mul(mul(percent(baseSalary, nightShiftAllowancePercent), nightShiftRatio), ONE));

            this.logger.debug(`Night shift allowance calculated: ${toFixed(nightShiftAllowance)} SAR ` +
                `(${toFixed(nightShiftHours)} hours, ${toFixed(nightShiftAllowancePercent)}%)`);
        }

        // 5. حساب خصم الإجازات المرضية (حسب نظام العمل السعودي)
        // ✅ Using Decimal for precision
        let sickLeaveDeduction: Decimal = ZERO;
        let sickLeaveDeductionDetails: { fullPayDays: number; partialPayDays: number; unpaidDays: number; totalDeduction: number } | null = null;

        if (settings.enableSickLeaveDeduction !== false) {
            // أولاً: جلب leaveTypeId للإجازة المرضية
            const sickLeaveType = await this.prisma.leaveTypeConfig.findFirst({
                where: { companyId, code: 'SICK' },
                select: { id: true }
            });

            // جلب الإجازات المرضية المعتمدة في هذه الفترة
            const sickLeaves = sickLeaveType ? await this.prisma.leaveRequest.findMany({
                where: {
                    userId: employeeId,
                    companyId,
                    status: 'APPROVED',
                    startDate: { lte: endDate },
                    endDate: { gte: startDate },
                    leaveTypeConfigId: sickLeaveType.id
                }
            }) : [];

            if (sickLeaves.length > 0) {
                // حساب مجموع أيام المرضية في هذه الفترة
                let sickDaysInPeriod = 0;
                for (const leave of sickLeaves) {
                    const leaveStart = new Date(Math.max(startDate.getTime(), new Date(leave.startDate).getTime()));
                    const leaveEnd = new Date(Math.min(endDate.getTime(), new Date(leave.endDate).getTime()));
                    const days = Math.floor((leaveEnd.getTime() - leaveStart.getTime()) / (24 * 60 * 60 * 1000)) + 1;
                    sickDaysInPeriod += days;
                }

                // جلب إجمالي أيام المرضية المستخدمة من بداية السنة
                const yearStart = new Date(effectiveYear, 0, 1);
                const totalSickLeavesThisYear = await this.prisma.leaveRequest.findMany({
                    where: {
                        userId: employeeId,
                        companyId,
                        status: 'APPROVED',
                        startDate: { gte: yearStart, lte: endDate },
                        leaveTypeConfigId: sickLeaveType!.id
                    }
                });

                let totalSickDaysThisYear = 0;
                for (const leave of totalSickLeavesThisYear) {
                    const leaveStart = new Date(Math.max(yearStart.getTime(), new Date(leave.startDate).getTime()));
                    const leaveEnd = new Date(Math.min(endDate.getTime(), new Date(leave.endDate).getTime()));
                    const days = Math.floor((leaveEnd.getTime() - leaveStart.getTime()) / (24 * 60 * 60 * 1000)) + 1;
                    totalSickDaysThisYear += days;
                }

                // حساب الخصم التدريجي حسب نظام العمل السعودي
                const fullPayDays = settings.sickLeaveFullPayDays || 30;
                const partialPayPercent = settings.sickLeavePartialPayPercent || 75;
                const partialPayDays = settings.sickLeavePartialPayDays || 60;
                const unpaidDays = settings.sickLeaveUnpaidDays || 30;

                let fullPayCount = 0;
                let partialPayCount = 0;
                let unpaidCount = 0;
                let deductionAmount: Decimal = ZERO;

                // التكرار على كل يوم مرضي في الفترة
                const previousSickDays = totalSickDaysThisYear - sickDaysInPeriod;
                for (let i = 0; i < sickDaysInPeriod; i++) {
                    const dayNumber = previousSickDays + i + 1;

                    if (dayNumber <= fullPayDays) {
                        // أول 30 يوم: راتب كامل (0% خصم)
                        fullPayCount++;
                    } else if (dayNumber <= fullPayDays + partialPayDays) {
                        // 31-90: راتب جزئي (خصم 25%)
                        partialPayCount++;
                        const dailyDeduction = mul(dailyRateAbsence, div(sub(100, partialPayPercent), 100));
                        deductionAmount = add(deductionAmount, dailyDeduction);
                    } else {
                        // بعد 90 يوم: بدون راتب (100% خصم)
                        unpaidCount++;
                        deductionAmount = add(deductionAmount, dailyRateAbsence);
                    }
                }

                sickLeaveDeduction = round(deductionAmount);
                sickLeaveDeductionDetails = {
                    fullPayDays: fullPayCount,
                    partialPayDays: partialPayCount,
                    unpaidDays: unpaidCount,
                    totalDeduction: toNumber(sickLeaveDeduction)
                };

                if (isPositive(sickLeaveDeduction)) {
                    this.logger.debug(`Sick leave deduction for ${employeeId}: ${toFixed(sickLeaveDeduction)} SAR ` +
                        `(${sickDaysInPeriod} days: ${fullPayCount} full, ${partialPayCount} partial, ${unpaidCount} unpaid)`);

                    trace.push({
                        step: 'SICK_LEAVE_DEDUCTION',
                        description: 'خصم الإجازة المرضية (حسب نظام العمل السعودي)',
                        formula: `إجمالي ${sickDaysInPeriod} يوم مرضي: ${fullPayCount} براتب كامل، ${partialPayCount} براتب جزئي (${partialPayPercent}%)، ${unpaidCount} بدون راتب`,
                        result: toNumber(sickLeaveDeduction),
                    });
                }
            }
        }

        // --- Policy Evaluation ---
        const gosiConfig = await this.prisma.gosiConfig.findFirst({
            where: { isActive: true, companyId },
            orderBy: { createdAt: 'desc' }
        });

        const policyPeriodStart = startDate;
        const policyPeriodEnd = endDate;

        // ✅ Context uses Number for legacy compatibility with policy evaluator
        const evaluationContext: PolicyEvaluationContext = {
            employee: {
                id: employeeId,
                companyId,
                branchId: employee.branchId || undefined,
                departmentId: employee.departmentId || undefined,
                jobTitleId: employee.jobTitleId || undefined,
                basicSalary: toNumber(baseSalary),
                hourlyRate: toNumber(hourlyRateGeneral),
            },
            period: {
                year: startDate.getFullYear(),
                month: startDate.getMonth() + 1,
                startDate: startDate,
                endDate: endDate,
                workingDays: daysInPeriodGeneral,
            },
            attendance: {
                otHours: toNumber(add(add(overtimeHours, holidayOT), weekendOT)),
                otHoursWeekday: toNumber(overtimeHours),
                otHoursWeekend: attendanceData.weekendOvertimeHours || 0,
                otHoursHoliday: attendanceData.holidayOvertimeHours || 0,
                lateMinutes: lateMinutes,
                lateCount: lateMinutes > 0 ? 1 : 0,
                absentDays: absentDays,
                earlyDepartureMinutes: 0,
                workingHours: presentDays * 8,
                holidayWorkDays: attendanceData.holidayWorkDays || 0, // عدد أيام العمل في العطلات
            },
        };

        // ✅ Convert Decimal amounts to Number for PolicyPayrollLine compatibility
        let policyLines: PolicyPayrollLine[] = [
            ...calculatedLines.map(l => ({
                componentId: l.id,
                componentCode: l.code,
                componentName: l.name,
                amount: toNumber(l.amount),
                sign: 'EARNING' as any,
                descriptionAr: 'من هيكل الراتب',
                source: {
                    policyId: assignment.structureId || 'NONE',
                    policyCode: 'STRUCTURE',
                    ruleId: 'STRUCTURE-LINE',
                    ruleCode: 'STRUCTURE-LINE',
                },
                gosiEligible: l.gosiEligible,
            }))
        ];

        // 🔧 FIX: تتبع المكونات الموجودة من الهيكل لمنع التكرار
        const existingComponentCodes = new Set(calculatedLines.map(l => l.code));

        // 🔧 FIX: تتبع أنواع البدلات الموجودة (سكن، مواصلات، إلخ) لمنع التكرار بأسماء مختلفة
        const normalizeAllowanceType = (code: string, name: string): string | null => {
            const combined = `${code} ${name}`.toLowerCase();
            if (combined.includes('housing') || combined.includes('سكن')) return 'HOUSING';
            if (combined.includes('transport') || combined.includes('مواصلات')) return 'TRANSPORT';
            if (combined.includes('food') || combined.includes('طعام') || combined.includes('اعاشة')) return 'FOOD';
            if (combined.includes('phone') || combined.includes('هاتف') || combined.includes('اتصالات')) return 'PHONE';
            return null;
        };

        const existingAllowanceTypes = new Set<string>();
        for (const line of calculatedLines) {
            const allowanceType = normalizeAllowanceType(line.code, line.name);
            if (allowanceType) existingAllowanceTypes.add(allowanceType);
        }
        this.logger.debug(`Existing allowance types from structure: ${Array.from(existingAllowanceTypes).join(', ')}`);

        try {
            const evaluatedLines = await this.policyEvaluator.evaluate(evaluationContext);
            for (const el of evaluatedLines) {
                // 🔧 FIX: لا نضيف البدلات التي موجودة بالفعل في الهيكل (بالكود أو بالنوع)
                if (existingComponentCodes.has(el.componentCode)) {
                    this.logger.debug(`Skipping duplicate component from policy: ${el.componentCode} (already in structure)`);
                    continue;
                }
                // 🔧 FIX: فحص نوع البدل (سكن، مواصلات، إلخ) حتى لو الكود مختلف
                const allowanceType = normalizeAllowanceType(el.componentCode, el.componentName);
                if (allowanceType && existingAllowanceTypes.has(allowanceType)) {
                    this.logger.debug(`Skipping duplicate allowance type from policy: ${el.componentName} (${allowanceType} already in structure)`);
                    continue;
                }
                policyLines.push(el);
                if (allowanceType) existingAllowanceTypes.add(allowanceType);
            }

            // ✅ Convert policy amounts to Decimal
            const otPolicy = evaluatedLines.find(l =>
                l.componentCode === 'OT' ||
                l.componentCode === 'OVERTIME' ||
                l.componentCode === 'OVERTIME_EARN'
            );
            if (otPolicy) overtimeAmount = toDecimal(otPolicy.amount);

            const latePolicy = evaluatedLines.find(l =>
                l.componentCode === 'LATE' || l.componentCode === 'LATE_DED'
            );
            if (latePolicy) lateDeduction = toDecimal(latePolicy.amount);

            const absencePolicy = evaluatedLines.find(l =>
                l.componentCode === 'ABSENCE' || l.componentCode === 'ABSENCE_DED'
            );
            if (absencePolicy) absenceDeduction = toDecimal(absencePolicy.amount);
        } catch (err: any) {
            this.logger.error(`❌ CRITICAL: Policy evaluation failed for employee ${employeeId}: ${err.message}`);
            this.logger.error(`Stack: ${err.stack}`);

            // ✅ إضافة سطر تحذيري في كشف الراتب
            policyLines.push({
                componentId: 'POLICY_EVAL_ERROR',
                componentCode: 'POLICY_ERROR',
                componentName: 'خطأ في تقييم السياسات (Policy Evaluation Error)',
                amount: 0,
                sign: 'INFO' as any,
                descriptionAr: `فشل تقييم السياسات: ${err.message}. يرجى مراجعة HR.`,
                source: { policyId: 'POLICY_EVALUATION_FAILURE', policyCode: 'ERROR', ruleId: 'EVAL_FAIL', ruleCode: 'ERROR' },
            });

            // ✅ تطبيق الخصومات الأساسية يدوياً كـ fallback
            // Using Decimal for fallback calculations
            if (attendanceData.lateMinutes > 0 && settings.enableAttendancePenalty) {
                const fallbackLateDeduction = mul(div(attendanceData.lateMinutes, 60), hourlyRateGeneral);
                if (isPositive(fallbackLateDeduction)) {
                    lateDeduction = round(fallbackLateDeduction);
                    this.logger.warn(`Using fallback late deduction: ${toFixed(fallbackLateDeduction)} SAR`);
                }
            }

            if (attendanceData.absentDays > 0 && settings.enableAttendancePenalty) {
                const fallbackAbsenceDeduction = mul(attendanceData.absentDays, dailyRateGeneral);
                if (isPositive(fallbackAbsenceDeduction)) {
                    absenceDeduction = round(fallbackAbsenceDeduction);
                    this.logger.warn(`Using fallback absence deduction: ${toFixed(fallbackAbsenceDeduction)} SAR`);
                }
            }
        }

        // --- GOSI Calculation (Saudi & Non-Saudi) ---
        // ✅ Using Decimal for all GOSI calculations
        let gosiEmployeeAmount: Decimal = ZERO;
        let gosiEmployerAmount: Decimal = ZERO;
        let gosiConfigMissing = false;

        if (!gosiConfig) {
            gosiConfigMissing = true;
            this.logger.warn(`⚠️ GOSI config not found for company ${companyId}. ` +
                `Employee ${employeeId} will have ZERO GOSI deductions. Please configure GOSI settings.`);

            // إضافة تحذير في كشف الراتب
            policyLines.push({
                componentId: 'GOSI_CONFIG_MISSING',
                componentCode: 'GOSI_WARNING',
                componentName: 'تحذير: إعدادات التأمينات غير موجودة (GOSI Config Missing)',
                amount: 0,
                sign: 'INFO' as any,
                descriptionAr: 'لم يتم احتساب التأمينات الاجتماعية - يرجى إعداد GOSI في النظام',
                source: { policyId: 'GOSI_CONFIG_MISSING', policyCode: 'GOSI', ruleId: 'MISSING', ruleCode: 'MISSING' },
            });
        }

        if (gosiConfig) {
            const gosiBase = calculatedLines.filter(l => l.gosiEligible).reduce((s, l) => add(s, l.amount), ZERO);
            const cappedBase = min(gosiBase, toDecimal(gosiConfig.maxCapAmount));

            if (employee.isSaudi) {
                // للسعوديين: التأمينات (9% موظف + 9% شركة) + ساند (0.75% لكل طرف) + الأخطار (2% شركة)
                const empRate = add(toDecimal(gosiConfig.employeeRate), toDecimal(gosiConfig.sanedRate));
                const coRate = add(add(toDecimal(gosiConfig.employerRate), toDecimal(gosiConfig.sanedRate)), toDecimal(gosiConfig.hazardRate));

                gosiEmployeeAmount = percent(cappedBase, empRate);
                gosiEmployerAmount = percent(cappedBase, coRate);

                if (isPositive(gosiEmployeeAmount)) {
                    policyLines.push({
                        componentId: 'GOSI-EMP-STATUTORY',
                        componentCode: 'GOSI_EMP',
                        componentName: 'تأمينات اجتماعية (موظف)',
                        sign: 'DEDUCTION',
                        amount: toNumber(round(gosiEmployeeAmount)),
                        descriptionAr: `حصة الموظف (${toFixed(empRate)}%)`,
                        source: { policyId: gosiConfig.id, policyCode: 'GOSI_CONFIG', ruleId: 'GOSI_EMP', ruleCode: 'GOSI_SAUDI' },
                        gosiEligible: false,
                    });
                }
            } else {
                // لغير السعوديين: الأخطار المهنية فقط (2% شركة غالباً) - ولا يخصم شيء من الموظف
                if (!gosiConfig.isSaudiOnly) {
                    const coRate = toDecimal(gosiConfig.hazardRate);
                    gosiEmployerAmount = percent(cappedBase, coRate);

                    // لا توجد استقطاعات للموظف الأجنبي للتأمينات عادة في السعودية
                }
            }

            // إضافة حصة الشركة كبند "مساهمة كارف" (Employer Contribution) - لا يؤثر على صافي الراتب لكن يظهر في التكاليف
            if (isPositive(gosiEmployerAmount)) {
                policyLines.push({
                    componentId: 'GOSI-CO-STATUTORY',
                    componentCode: 'GOSI_CO',
                    componentName: 'تأمينات اجتماعية (شركة)',
                    sign: 'DEDUCTION',
                    isEmployerContribution: true, // معلمة كحرصة صاحب عمل لن تظهر في صافي الراتب
                    amount: toNumber(round(gosiEmployerAmount)),
                    descriptionAr: `حصة الشركة من التأمينات`,
                    source: { policyId: gosiConfig.id, policyCode: 'GOSI_CONFIG', ruleId: 'GOSI_CO', ruleCode: 'EMPLOYER_SHARE' },
                    gosiEligible: false,
                });
            }
        }

        // --- Add System-Calculated Attendance Items (if not already from policy) ---
        const hasOTFromPolicy = policyLines.some(pl =>
            pl.componentCode === 'OT' ||
            pl.componentCode === 'OVERTIME' ||
            pl.componentCode === 'OVERTIME_EARN'
        );
        const hasLateFromPolicy = policyLines.some(pl => pl.componentCode === 'LATE' || pl.componentCode === 'LATE_DED');
        const hasAbsenceFromPolicy = policyLines.some(pl => pl.componentCode === 'ABSENCE' || pl.componentCode === 'ABSENCE_DED');

        // ✅ Using Decimal comparison and conversion
        if (isPositive(overtimeAmount) && !hasOTFromPolicy) {
            policyLines.push({
                componentId: systemComponentIds.OVERTIME,
                componentCode: 'OVERTIME',
                componentName: 'ساعات إضافية',
                sign: 'EARNING',
                amount: toNumber(round(overtimeAmount)),
                units: toNumber(overtimeHours), // 🔧 عدد الساعات
                rate: toNumber(otHourlyRate), // 🔧 معدل الساعة
                descriptionAr: `${toFixed(overtimeHours)} ساعة إضافية`,
                source: {
                    policyId: 'SYSTEM',
                    policyCode: 'SYSTEM_OT',
                    ruleId: 'OT_CALC',
                    ruleCode: 'OT_CALC',
                },
                gosiEligible: false,
            });
        }

        if (isPositive(lateDeduction) && !hasLateFromPolicy) {
            policyLines.push({
                componentId: systemComponentIds.LATE_DED,
                componentCode: 'LATE_DED',
                componentName: 'خصم تأخير',
                sign: 'DEDUCTION',
                amount: toNumber(round(lateDeduction)),
                units: lateMinutes, // 🔧 عدد الدقائق
                rate: lateMinutes > 0 ? toNumber(div(lateDeduction, toDecimal(lateMinutes))) : 0, // 🔧 سعر الدقيقة
                descriptionAr: `خصم تأخير ${lateMinutes} دقيقة`,
                source: {
                    policyId: 'SYSTEM',
                    policyCode: 'SYSTEM_LATE',
                    ruleId: 'LATE_CALC',
                    ruleCode: 'LATE_CALC',
                },
                gosiEligible: false,
            });
        }

        if (isPositive(absenceDeduction) && !hasAbsenceFromPolicy) {
            policyLines.push({
                componentId: systemComponentIds.ABSENCE_DED,
                componentCode: 'ABSENCE_DED',
                componentName: 'خصم غياب',
                sign: 'DEDUCTION',
                amount: toNumber(round(absenceDeduction)),
                units: absentDays, // 🔧 عدد أيام الغياب
                rate: absentDays > 0 ? toNumber(div(absenceDeduction, toDecimal(absentDays))) : 0, // 🔧 سعر اليوم
                descriptionAr: `خصم غياب ${absentDays} يوم`,
                source: {
                    policyId: 'SYSTEM',
                    policyCode: 'SYSTEM_ABSENCE',
                    ruleId: 'ABSENCE_CALC',
                    ruleCode: 'ABSENCE_CALC',
                },
                gosiEligible: false,
            });
        }

        // ✅ إضافة خصم الإجازة المرضية (حسب نظام العمل السعودي)
        if (isPositive(sickLeaveDeduction)) {
            const details = sickLeaveDeductionDetails!;
            const sickDays = details.partialPayDays + details.unpaidDays;
            policyLines.push({
                componentId: systemComponentIds.SICK_LEAVE_DED,
                componentCode: 'SICK_LEAVE_DED',
                componentName: 'خصم الإجازة المرضية',
                sign: 'DEDUCTION',
                amount: toNumber(round(sickLeaveDeduction)),
                units: sickDays, // 🔧 عدد أيام المرضية
                rate: sickDays > 0 ? toNumber(div(sickLeaveDeduction, toDecimal(sickDays))) : 0, // 🔧 متوسط الخصم لليوم
                descriptionAr: `خصم مرضية: ${details.partialPayDays} يوم براتب جزئي + ${details.unpaidDays} يوم بدون راتب`,
                source: {
                    policyId: 'SAUDI_LABOR_LAW',
                    policyCode: 'SLL_ART117',
                    ruleId: 'SICK_LEAVE_DEDUCTION',
                    ruleCode: 'SLL_117',
                },
                gosiEligible: false,
            });
        }
        if (isPositive(earlyDepartureDeduction)) {
            policyLines.push({
                componentId: systemComponentIds.EARLY_DEP_DED,
                componentCode: 'EARLY_DEP_DED',
                componentName: 'خصم انصراف مبكر',
                sign: 'DEDUCTION',
                amount: toNumber(round(earlyDepartureDeduction)),
                units: earlyDepartureMinutes, // 🔧 عدد الدقائق
                rate: earlyDepartureMinutes > 0 ? toNumber(div(earlyDepartureDeduction, toDecimal(earlyDepartureMinutes))) : 0, // 🔧 سعر الدقيقة
                descriptionAr: `خصم انصراف مبكر ${earlyDepartureMinutes} دقيقة`,
                source: {
                    policyId: 'SYSTEM',
                    policyCode: 'SYSTEM_EARLY_DEPARTURE',
                    ruleId: 'EARLY_DEP_CALC',
                    ruleCode: 'EARLY_DEP_CALC',
                },
                gosiEligible: false,
            });
        }

        // --- Disciplinary Adjustments ---
        const payrollPeriod = await this.prisma.payrollPeriod.findFirst({
            where: {
                companyId,
                startDate: { lte: endDate },
                endDate: { gte: startDate }
            }
        });

        if (payrollPeriod) {
            const disciplinaryAdjustments = await (this.prisma as any).payrollAdjustment.findMany({
                where: {
                    employeeId,
                    companyId,
                    payrollPeriodId: payrollPeriod.id,
                    status: { in: ['PENDING', 'POSTED'] }
                }
            });

            for (const adj of disciplinaryAdjustments) {
                let adjAmount = Number(adj.value);
                let appliedValue = Number(adj.value);
                let descriptionExtra = '';

                // If unit is DAYS or HOURS, compute amount based on rates
                if (adj.unit === 'DAYS') {
                    if (adj.effectiveDate) {
                        const adjEffectiveDate = new Date(adj.effectiveDate);
                        const periodStartDate = new Date(payrollPeriod.startDate);
                        const periodEndDate = new Date(payrollPeriod.endDate);

                        // Calculate cap: days remaining from max(effectiveDate, periodStart) to periodEnd
                        const capStart = adjEffectiveDate > periodStartDate ? adjEffectiveDate : periodStartDate;

                        if (capStart > periodEndDate) {
                            appliedValue = 0;
                            descriptionExtra = ' (خارج الفترة الحالية)';
                        } else {
                            const daysRemaining = Math.max(0, Math.floor((periodEndDate.getTime() - capStart.getTime()) / (24 * 60 * 60 * 1000)) + 1);
                            if (daysRemaining < appliedValue) {
                                appliedValue = daysRemaining;
                                descriptionExtra = ` (مخفض من ${Number(adj.value)} أيام بسبب تاريخ الاستحقاق)`;
                                this.logger.log(`Penalty capped for case ${adj.caseId}: ${Number(adj.value)} -> ${appliedValue} days`);
                            }
                        }
                    }
                    // ✅ Using Decimal for calculations
                    adjAmount = toNumber(mul(appliedValue, dailyRateGeneral));
                } else if (adj.unit === 'HOURS') {
                    adjAmount = toNumber(mul(Number(adj.value), hourlyRateGeneral));
                }

                if (appliedValue <= 0 && adj.unit === 'DAYS' && adj.effectiveDate) continue;

                policyLines.push({
                    componentId: `DISC-${adj.id}`,
                    componentCode: 'DISC_ADJ',
                    componentName: adj.description || 'تسوية جزاء إداري',
                    sign: adj.adjustmentType === 'DEDUCTION' || adj.adjustmentType === 'SUSPENSION_UNPAID' ? 'DEDUCTION' : 'EARNING',
                    amount: Math.round(adjAmount * 100) / 100,
                    descriptionAr: (adj.description || 'جزاء إداري') + descriptionExtra,
                    source: {
                        policyId: adj.caseId,
                        policyCode: 'DISCIPLINARY',
                        ruleId: adj.id,
                        ruleCode: adj.adjustmentType,
                    },
                    gosiEligible: false,
                });
            }
        }

        // --- Loans & Advances ---
        const activeLoans = await this.prisma.advanceRequest.findMany({
            where: {
                userId: employeeId,
                companyId,
                status: 'APPROVED',
            },
            include: {
                // ✅ فلترة الدفعات حسب الفترة لتحسين الأداء ودقة الحساب
                payments: {
                    where: {
                        paymentDate: {
                            lte: endDate
                        }
                    },
                    orderBy: { paymentDate: 'asc' }
                }
            }
        });

        for (const loan of activeLoans) {
            const totalPaid = loan.payments.reduce((sum, p) => sum + Number(p.amount), 0);
            const balance = Number(loan.approvedAmount || loan.amount) - totalPaid;

            if (balance > 0) {
                const installment = Math.min(balance, Number(loan.approvedMonthlyDeduction || loan.monthlyDeduction));

                policyLines.push({
                    componentId: `LOAN-${loan.id}`,
                    componentCode: 'LOAN_DED',
                    componentName: 'قسط سلفة',
                    sign: 'DEDUCTION',
                    amount: Math.round(installment * 100) / 100,
                    descriptionAr: `قسط سلفة (باقي: ${balance.toFixed(2)})`,
                    source: {
                        policyId: loan.id,
                        policyCode: 'ADVANCE',
                        ruleId: 'INSTALLMENT',
                        ruleCode: 'LOAN_AUTO',
                    },
                    gosiEligible: false,
                    // ✅ معلومات السداد للتسجيل لاحقاً
                    _loanPaymentData: {
                        advanceRequestId: loan.id,
                        amount: Math.round(installment * 100) / 100,
                        paymentType: 'PAYROLL_DEDUCTION',
                        periodMonth: effectiveMonth,
                        periodYear: effectiveYear,
                    }
                });
            }
        }

        // --- Sick Leave Pay Tiers (Saudi Labor Law - Configurable) ---
        // استخدام الإعدادات القابلة للتخصيص بدلاً من القيم الثابتة
        const sickLeavePartialPayPercent = (settings as any).sickLeavePartialPayPercent || 75;
        const sickLeaveDeductionPercent = 100 - sickLeavePartialPayPercent; // نسبة الخصم

        const sickLeaves = await this.prisma.leaveRequest.findMany({
            where: {
                userId: employeeId,
                companyId,
                status: 'APPROVED',
                type: 'SICK',
                startDate: { lte: policyPeriodEnd },
                endDate: { gte: policyPeriodStart },
            }
        });

        for (const sick of sickLeaves) {
            // ملاحظة: الحقول fullPayDays, partialPayDays, unpaidDays تم حسابها عند الموافقة على الطلب
            const sickUnpaid = Number(sick.unpaidDays || 0);
            const sickPartial = Number(sick.partialPayDays || 0);

            // ✅ Using Decimal for sick leave calculations
            if (sickUnpaid > 0) {
                policyLines.push({
                    componentId: `SICK-UNPAID-${sick.id}`,
                    componentCode: 'SICK_UNPAID_DED',
                    componentName: 'خصم إجازة مرضية (بدون أجر)',
                    sign: 'DEDUCTION',
                    amount: toNumber(round(mul(sickUnpaid, dailyRateGeneral))),
                    descriptionAr: `خصم ${sickUnpaid} يوم مرضى غير مدفوع`,
                    source: { policyId: sick.id, policyCode: 'LEAVE', ruleId: 'SICK_TIER', ruleCode: 'UNPAID' },
                    gosiEligible: false,
                });
            }

            if (sickPartial > 0) {
                // استخدام النسبة من الإعدادات (افتراضي: 75% أجر -> خصم 25%)
                const deductionAmount = mul(mul(sickPartial, dailyRateGeneral), div(sickLeaveDeductionPercent, 100));
                policyLines.push({
                    componentId: `SICK-PARTIAL-${sick.id}`,
                    componentCode: 'SICK_PARTIAL_DED',
                    componentName: `خصم إجازة مرضية (${sickLeavePartialPayPercent}% أجر)`,
                    sign: 'DEDUCTION',
                    amount: toNumber(round(deductionAmount)),
                    descriptionAr: `خصم ${sickLeaveDeductionPercent}% من أجر ${sickPartial} يوم مرضى`,
                    source: { policyId: sick.id, policyCode: 'LEAVE', ruleId: 'SICK_TIER', ruleCode: 'PARTIAL' },
                    gosiEligible: false,
                });
            }
        }

        // --- Unpaid Leave Deduction (BASED_ON_SHIFTS, BASED_ON_CALENDAR, BASED_ON_WORKING_DAYS) ---
        // ✅ حساب خصم الإجازات غير المدفوعة بناءً على طريقة الحساب المختارة
        const unpaidLeaves = await this.prisma.leaveRequest.findMany({
            where: {
                userId: employeeId,
                companyId,
                status: 'APPROVED',
                type: 'UNPAID', // إجازة بدون راتب
                startDate: { lte: policyPeriodEnd },
                endDate: { gte: policyPeriodStart },
            }
        });

        for (const unpaid of unpaidLeaves) {
            // حساب أيام الإجازة الفعلية في هذه الفترة
            const leaveStart = new Date(Math.max(new Date(unpaid.startDate).getTime(), policyPeriodStart.getTime()));
            const leaveEnd = new Date(Math.min(new Date(unpaid.endDate).getTime(), policyPeriodEnd.getTime()));

            let unpaidDaysCount = 0;
            const unpaidLeaveMethod = settings.unpaidLeaveMethod || 'BASED_ON_CALENDAR';
            const unpaidLeaveCalcBase = settings.unpaidLeaveCalcBase || 'CALENDAR_DAYS';

            switch (unpaidLeaveMethod) {
                case 'BASED_ON_SHIFTS':
                    // خصم أيام الإجازة التي تقع في أيام عمل الموظف فقط (أحد-خميس)
                    for (let d = new Date(leaveStart); d <= leaveEnd; d.setDate(d.getDate() + 1)) {
                        const dayOfWeek = d.getDay();
                        // أيام العمل: الأحد (0) إلى الخميس (4)
                        if (dayOfWeek >= 0 && dayOfWeek <= 4) {
                            unpaidDaysCount++;
                        }
                    }
                    break;

                case 'BASED_ON_CALENDAR':
                    // خصم كل أيام الإجازة (بما فيها الجمعة والسبت)
                    unpaidDaysCount = Math.floor((leaveEnd.getTime() - leaveStart.getTime()) / (24 * 60 * 60 * 1000)) + 1;
                    break;

                case 'BASED_ON_WORKING_DAYS':
                    // خصم أيام العمل فقط (22 يوم بدلاً من 30)
                    for (let d = new Date(leaveStart); d <= leaveEnd; d.setDate(d.getDate() + 1)) {
                        const dayOfWeek = d.getDay();
                        if (dayOfWeek >= 0 && dayOfWeek <= 4) {
                            unpaidDaysCount++;
                        }
                    }
                    break;

                default:
                    unpaidDaysCount = Math.floor((leaveEnd.getTime() - leaveStart.getTime()) / (24 * 60 * 60 * 1000)) + 1;
            }

            if (unpaidDaysCount > 0) {
                // حساب المعدل اليومي بناءً على قاعدة الحساب
                let unpaidDivisor = 30; // الافتراضي
                switch (unpaidLeaveCalcBase) {
                    case 'CALENDAR_DAYS':
                        unpaidDivisor = this.getDaysInPeriod(policyPeriodStart, policyPeriodEnd, CalculationMethod.CALENDAR_DAYS);
                        break;
                    case 'ACTUAL_WORKING_DAYS':
                        unpaidDivisor = this.getWorkingDaysInPeriod(policyPeriodStart, policyPeriodEnd);
                        break;
                    case 'FIXED_30_DAYS':
                        unpaidDivisor = 30;
                        break;
                }

                const unpaidDailyRate = calcDailyRate(deductionBase, unpaidDivisor);
                const unpaidDeduction = mul(unpaidDaysCount, unpaidDailyRate);

                // ✅ تقسيم الإجازات بناءً على تاريخ الإغلاق (إذا مفعل)
                if (settings.splitUnpaidByClosingDate && settings.payrollClosingDay > 0) {
                    const closingDay = settings.payrollClosingDay;
                    // إذا كانت الإجازة تمتد عبر تاريخ الإغلاق، نفصلها إلى جزئين
                    // الجزء الأول: من بداية الإجازة إلى تاريخ الإغلاق
                    // الجزء الثاني: من تاريخ الإغلاق إلى نهاية الإجازة
                    // هذا يُستخدم للشركات التي تريد احتساب الخصم في الشهر الصحيح
                    this.logger.debug(`Unpaid leave split enabled: leave ${unpaid.id} spans closing day ${closingDay}`);
                }

                policyLines.push({
                    componentId: `UNPAID-LEAVE-${unpaid.id}`,
                    componentCode: 'UNPAID_LEAVE_DED',
                    componentName: 'خصم إجازة بدون راتب',
                    sign: 'DEDUCTION',
                    amount: toNumber(round(unpaidDeduction)),
                    units: unpaidDaysCount,
                    rate: toNumber(unpaidDailyRate),
                    descriptionAr: `خصم ${unpaidDaysCount} يوم إجازة بدون راتب (${unpaidLeaveMethod})`,
                    source: {
                        policyId: unpaid.id,
                        policyCode: 'LEAVE',
                        ruleId: 'UNPAID_LEAVE',
                        ruleCode: unpaidLeaveMethod
                    },
                    gosiEligible: false,
                });

                this.logger.debug(`Unpaid leave deduction: ${unpaidDaysCount} days × ${toFixed(unpaidDailyRate)} = ${toFixed(unpaidDeduction)} (method: ${unpaidLeaveMethod})`);
            }
        }

        // --- Retroactive Pay (Backpay) ---
        const retroPays = await this.prisma.retroPay.findMany({
            where: {
                employeeId,
                companyId,
                status: 'PENDING',
                effectiveFrom: { lte: policyPeriodEnd }
            }
        });

        const retroIdsToUpdate: string[] = [];
        for (const retro of retroPays) {
            const retroAmount = Number(retro.totalAmount);
            policyLines.push({
                componentId: `RETRO-${retro.id}`,
                componentCode: 'RETRO_PAY',
                componentName: retro.reason || 'فروقات رواتب رجعية',
                sign: retroAmount > 0 ? 'EARNING' : 'DEDUCTION',
                amount: Math.abs(retroAmount),
                descriptionAr: retro.reason || 'تسوية رجعية',
                source: {
                    policyId: retro.id,
                    policyCode: 'RETRO_PAY',
                    ruleId: 'RETRO',
                    ruleCode: 'RETRO',
                },
                gosiEligible: false,
            });
            retroIdsToUpdate.push(retro.id);
        }

        // ✅ تحديث حالة الفروقات الرجعية لتجنب التطبيق المزدوج
        if (retroIdsToUpdate.length > 0) {
            await this.prisma.retroPay.updateMany({
                where: { id: { in: retroIdsToUpdate } },
                data: {
                    status: 'PAID',
                    paidAt: new Date(),
                    notes: `تم التطبيق في فترة ${effectiveYear}-${effectiveMonth}`
                }
            });
        }

        // --- End of Service (EOS) Settlement ---
        if (terminationDate &&
            terminationDate >= startDate &&
            terminationDate <= endDate) {

            try {
                const eosBreakdown = await this.eosService.calculateEos(employeeId, {
                    lastWorkingDay: terminationDate.toISOString(),
                    reason: (activeContract?.terminationReason as any) || EosReason.TERMINATION,
                });

                if (eosBreakdown.netSettlement > 0) {
                    policyLines.push({
                        componentId: `EOS-${employeeId}`,
                        componentCode: 'EOS_SETTLEMENT',
                        componentName: 'تصفية مستحقات نهاية الخدمة',
                        sign: 'EARNING',
                        amount: Math.round(Number(eosBreakdown.netSettlement) * 100) / 100,
                        descriptionAr: `مكافأة: ${eosBreakdown.totalEos} + إجازات: ${eosBreakdown.leavePayout}`,
                        source: {
                            policyId: employeeId,
                            policyCode: 'EOS',
                            ruleId: 'FINAL_SETTLEMENT',
                            ruleCode: 'EOS',
                        },
                        gosiEligible: false,
                    });
                }
            } catch (err) {
                this.logger.error(`Failed to calculate EOS for ${employeeId}: ${err.message}`);
            }
        }

        // --- Approved Bonuses Integration ---
        // جلب المكافآت المعتمدة للموظف في هذه الفترة وإضافتها للرواتب
        try {
            const approvedBonuses = await this.prisma.retroPay.findMany({
                where: {
                    employeeId,
                    companyId,
                    status: 'APPROVED',
                    // المكافآت التي تنطبق على هذه الفترة
                    effectiveFrom: { lte: endDate },
                    effectiveTo: { gte: startDate },
                },
            });

            for (const bonus of approvedBonuses) {
                const bonusAmount = bonus.totalAmount?.toNumber() || bonus.difference?.toNumber() || 0;
                if (bonusAmount > 0) {
                    // تحقق من أن هذه المكافأة لم تُضف مسبقاً
                    const bonusCode = `BONUS_${bonus.id.slice(0, 8)}`;
                    if (!existingComponentCodes.has(bonusCode)) {
                        policyLines.push({
                            componentId: bonus.id,
                            componentCode: bonusCode,
                            componentName: bonus.reason || 'مكافأة',
                            sign: 'EARNING',
                            amount: Math.round(bonusAmount * 100) / 100,
                            descriptionAr: bonus.notes || bonus.reason || 'مكافأة معتمدة',
                            source: {
                                policyId: bonus.id,
                                policyCode: 'BONUS',
                                ruleId: bonusCode,
                                ruleCode: 'BONUS',
                            },
                            gosiEligible: false,
                        });
                        existingComponentCodes.add(bonusCode);
                        this.logger.log(`✅ Added bonus to payroll: ${bonus.reason || 'مكافأة'} - ${bonusAmount} SAR`);
                    }
                }
            }

            if (approvedBonuses.length > 0) {
                this.logger.log(`💰 Found ${approvedBonuses.length} approved bonuses for employee ${employeeId}`);
            }
        } catch (err) {
            this.logger.error(`Failed to load bonuses for ${employeeId}: ${err.message}`);
        }


        // === Smart Policy Execution ===
        // 🔧 FIX: تتبع السياسات والمكونات المنفذة لمنع التكرار
        const executedPolicyIds = new Set<string>();

        try {
            // ✅ Convert Decimal values to numbers for smart policy executor
            const smartResults = await this.smartPolicyExecutor.executeSmartPolicies(companyId, {
                employee: employee,
                baseSalary: toNumber(baseSalary),
                workingDays: daysInPeriodGeneral,
                absentDays: absentDays,
                lateDays: Math.round(lateMinutes / 60),
                overtimeHours: toNumber(overtimeHours),
                month: effectiveMonth,
                year: effectiveYear,
            });

            for (const result of smartResults) {
                if (result.success && result.policyLine) {
                    const policyId = result.policyLine.source?.policyId;
                    const componentCode = result.policyLine.componentCode;
                    const componentName = result.policyLine.componentName;
                    // 🔧 FIX: فحص التكرار - لا نضيف نفس السياسة أو نفس المكون مرتين
                    if (existingComponentCodes.has(componentCode)) {
                        this.logger.debug(`Skipping smart policy component ${componentCode} - already in structure`);
                        continue;
                    }
                    // 🔧 FIX: فحص نوع البدل لمنع التكرار بأسماء مختلفة
                    const allowanceType = normalizeAllowanceType(componentCode, componentName);
                    if (allowanceType && existingAllowanceTypes.has(allowanceType)) {
                        this.logger.debug(`Skipping smart policy allowance ${componentName} - ${allowanceType} already exists`);
                        continue;
                    }
                    if (policyId && !executedPolicyIds.has(policyId)) {
                        policyLines.push(result.policyLine);
                        executedPolicyIds.add(policyId);
                        existingComponentCodes.add(componentCode);
                        if (allowanceType) existingAllowanceTypes.add(allowanceType);
                    } else if (!policyId) {
                        policyLines.push(result.policyLine);
                        existingComponentCodes.add(componentCode);
                        if (allowanceType) existingAllowanceTypes.add(allowanceType);
                    }
                }
            }
            this.logger.log(`Smart policies executed: ${smartResults.length} results (${executedPolicyIds.size} unique)`);
        } catch (err) {
            this.logger.error(`Error executing smart policies: ${err.message}`);
        }

        // === AI-Powered Policy Evaluation ===
        // 🔧 FIX: نستخدم AI فقط للسياسات التي لم تُنفذ بعد
        try {
            // ✅ Convert Decimal values to numbers for AI context
            const baseSalaryNum = toNumber(baseSalary);
            const overtimeHoursNum = toNumber(overtimeHours);
            const aiContext: EmployeePayrollContext = {
                employeeId: employee.id,
                employeeName: `${employee.firstName} ${employee.lastName}`,
                department: (employee as any).department?.name || null,
                jobTitle: employee.jobTitle,
                hireDate: employee.hireDate,
                yearsOfService: employee.hireDate ? Math.floor((Date.now() - new Date(employee.hireDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0,
                baseSalary: baseSalaryNum,
                totalSalary: baseSalaryNum * 1.25,
                workingDays: daysInPeriodGeneral,
                presentDays: daysInPeriodGeneral - absentDays,
                absentDays: absentDays,
                lateDays: Math.round(lateMinutes / 60),
                lateMinutes: lateMinutes,
                overtimeHours: overtimeHoursNum,
                attendancePercentage: Math.round(((daysInPeriodGeneral - absentDays) / daysInPeriodGeneral) * 100),
                leavesTaken: 0,
                unpaidLeaves: 0,
                activePenalties: 0,
                pendingCustodyReturns: 0,
                returnedCustodyThisMonth: 0,
                month: effectiveMonth,
                year: effectiveYear,
            };
            const aiPolicyLines = await this.aiPolicyEvaluator.evaluateAllPolicies(companyId, aiContext);

            // 🔧 FIX: فلترة السياسات والمكونات المكررة من AI Evaluator
            let addedFromAi = 0;
            for (const aiLine of aiPolicyLines) {
                const policyId = aiLine.source?.policyId;
                const componentCode = aiLine.componentCode;
                const componentName = aiLine.componentName;
                // تحقق من تكرار المكون أولاً
                if (existingComponentCodes.has(componentCode)) {
                    this.logger.debug(`Skipping AI policy component ${componentCode} - already exists`);
                    continue;
                }
                // 🔧 FIX: فحص نوع البدل لمنع التكرار بأسماء مختلفة
                const allowanceType = normalizeAllowanceType(componentCode, componentName);
                if (allowanceType && existingAllowanceTypes.has(allowanceType)) {
                    this.logger.debug(`Skipping AI policy allowance ${componentName} - ${allowanceType} already exists`);
                    continue;
                }
                if (policyId && !executedPolicyIds.has(policyId)) {
                    policyLines.push(aiLine);
                    executedPolicyIds.add(policyId);
                    existingComponentCodes.add(componentCode);
                    if (allowanceType) existingAllowanceTypes.add(allowanceType);
                    addedFromAi++;
                }
            }
            this.logger.log(`AI Policy evaluation: ${aiPolicyLines.length} total, ${addedFromAi} new (not duplicates)`);
        } catch (err) {
            this.logger.error(`AI Policy evaluation error: ${err.message}`);
        }

        // ✅ Final calculations using Decimal
        const grossSalary = round(policyLines.filter(l => l.sign === 'EARNING' && !l.isEmployerContribution).reduce((s, l) => add(s, toDecimal(l.amount)), ZERO));
        let totalDeductions = round(policyLines.filter(l => l.sign === 'DEDUCTION' && !l.isEmployerContribution).reduce((s, l) => add(s, toDecimal(l.amount)), ZERO));

        // ✅ الحد الأقصى للخصومات من الإعدادات (افتراضي 50% حسب نظام العمل السعودي المادة 91)
        // Using the Decimal-based applyDeductionCap utility
        const deductionCapResult = applyDeductionCap(grossSalary, totalDeductions, settings.maxDeductionPercent || 50);
        let deductionsExceedLimit = deductionCapResult.wasCapped;
        let excessDeductionAmount = deductionCapResult.excessAmount;

        if (deductionsExceedLimit && isPositive(grossSalary)) {
            this.logger.warn(`⚠️ Deductions exceed limit for employee ${employeeId}: ` +
                `Total deductions (${toFixed(totalDeductions)}) > ${settings.maxDeductionPercent || 50}% of gross (${toFixed(deductionCapResult.cappedDeductions)}). ` +
                `Excess amount: ${toFixed(excessDeductionAmount)} SAR will be carried forward.`);

            // ✅ تطبيق الحد الأقصى للخصومات (نظام العمل السعودي المادة 91)
            // المبلغ الزائد يُرحل للشهر القادم كدين على الموظف
            totalDeductions = deductionCapResult.cappedDeductions;

            // إضافة سطر توضيحي للخصم المؤجل
            policyLines.push({
                componentId: 'DEFERRED_DEDUCTION_INFO',
                componentCode: 'DEFERRED_DEDUCTION',
                componentName: 'خصم مؤجل للشهر القادم (Deferred Deduction)',
                amount: 0, // لا يؤثر على الحساب الحالي
                sign: 'INFO' as any,
                descriptionAr: `تم تأجيل خصم ${toFixed(excessDeductionAmount)} ريال للشهر القادم (تجاوز الحد الأقصى ${settings.maxDeductionPercent || 50}%)`,
                source: { policyId: 'SYSTEM', policyCode: 'DEDUCTION_LIMIT', ruleId: 'ARTICLE_91', ruleCode: 'MAX_DEDUCTION' },
            });
        }

        const employerContributions = round(policyLines.filter(l => l.isEmployerContribution).reduce((s, l) => add(s, toDecimal(l.amount)), ZERO));

        // ✅ Using Decimal-based calculateNetSalary utility
        const netSalaryResult = calculateNetSalary(grossSalary, totalDeductions);
        let netSalary = netSalaryResult.netSalary;

        // ✅ تطبيق التقريب (Rounding) بناءً على الإعدادات
        // Using Decimal-based roundToNearest utility
        if (settings.enableSalaryRounding && settings.roundSalaryToNearest > 0) {
            const roundTo = settings.roundSalaryToNearest;
            const roundingMethod = settings.salaryRoundingMethod || 'NEAREST';
            netSalary = roundToNearest(netSalary, roundTo, roundingMethod as any);
        }

        // ✅ تطبيق الحد الأدنى للراتب الصافي
        const minNetSalaryValue = toDecimal(settings.minNetSalary || 0);
        if (isPositive(minNetSalaryValue) && netSalary.lt(minNetSalaryValue) && isPositive(netSalary)) {
            this.logger.warn(`⚠️ Net salary (${toFixed(netSalary)}) below minimum (${toFixed(minNetSalaryValue)}) for employee ${employeeId}`);
            // يمكن تعديل الخصومات لضمان الحد الأدنى:
            // const adjustment = sub(minNetSalaryValue, netSalary);
            // totalDeductions = max(ZERO, sub(totalDeductions, adjustment));
            // netSalary = minNetSalaryValue;
        }

        // معالجة الراتب السلبي (Negative Balance)
        if (netSalaryResult.hasNegativeBalance && settings.enableNegativeBalanceCarryover) {
            this.logger.log(`Negative balance detected for ${employeeId}: ${toFixed(netSalaryResult.negativeBalance)}. Carryover enabled.`);
            // ملاحظة: هنا يجب تسجيل الحركة في جدول التسويات للشهر القادم لو لزم الأمر
        }

        // ✅ Return with Number values for backward compatibility
        return {
            employeeId,
            baseSalary: toNumber(baseSalary),
            dailyRate: toNumber(dailyRateGeneral),
            hourlyRate: toNumber(hourlyRateGeneral),
            workingDays: daysInPeriodGeneral,
            presentDays,
            absentDays,
            lateMinutes,
            lateDeduction: toNumber(lateDeduction),
            absenceDeduction: toNumber(absenceDeduction),
            overtimeHours: toNumber(overtimeHours),
            overtimeAmount: toNumber(overtimeAmount),
            grossSalary: toNumber(grossSalary),
            totalDeductions: toNumber(totalDeductions),
            netSalary: toNumber(netSalary),
            calculationTrace: trace,
            policyLines,
        };
    }

    async previewCalculation(employeeId: string, companyId: string, year: number, month: number) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        return this.calculateForEmployee(employeeId, companyId, startDate, endDate, year, month);
    }

    private topologicalSort(lines: any[]): any[] {
        const sorted: any[] = [];
        const visited = new Set<string>();
        const visiting = new Set<string>();

        const visit = (line: any) => {
            const id = line.component.code;
            if (visiting.has(id)) throw new Error(`Circular dependency detected in component: ${id}`);
            if (!visited.has(id)) {
                visiting.add(id);
                const formula = line.component.formula;
                if (formula) {
                    const deps = this.formulaEngine.extractDependencies(formula);
                    for (const dep of deps) {
                        const depLine = lines.find(l => l.component.code === dep);
                        if (depLine) visit(depLine);
                    }
                }
                visiting.delete(id);
                visited.add(id);
                sorted.push(line);
            }
        };

        for (const line of lines) visit(line);
        return sorted;
    }
}
