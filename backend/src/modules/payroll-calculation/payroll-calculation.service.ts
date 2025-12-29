import { Injectable, NotFoundException, Logger } from '@nestjs/common';
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

@Injectable()
export class PayrollCalculationService {
    private readonly logger = new Logger(PayrollCalculationService.name);

    constructor(
        private prisma: PrismaService,
        private policiesService: PoliciesService,
        private policyEvaluator: PolicyRuleEvaluatorService,
        private formulaEngine: FormulaEngineService,
        private eosService: EosService,
    ) { }

    /**
     * حساب عدد أيام الشهر حسب طريقة الحساب (عن طريق الـ enum القديم)
     */
    private getDaysInMonth(year: number, month: number, method: CalculationMethod): number {
        return this.getDaysByBase(year, month, this.mapMethodToBase(method));
    }

    /**
     * حساب عدد الأيام بناءً على القاعدة (Base) من الإعدادات
     */
    private getDaysByBase(year: number, month: number, base: string): number {
        switch (base) {
            case 'FIXED_30_DAYS':
                return 30;
            case 'CALENDAR_DAYS':
                return new Date(year, month, 0).getDate();
            case 'ACTUAL_WORKING_DAYS':
                return this.getWorkingDaysInMonth(year, month);
            default:
                return 30; // الافتراضي 30 يوم
        }
    }

    /**
     * حساب أيام العمل في الشهر (أحد-خميس)
     */
    private getWorkingDaysInMonth(year: number, month: number): number {
        const daysInMonth = new Date(year, month, 0).getDate();
        let workingDays = 0;

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const dayOfWeek = date.getDay();
            // نظام العمل السعودي: الأحد (0) إلى الخميس (4)
            // ملاحظة: السبت هو 6، الجمعة هي 5
            if (dayOfWeek >= 0 && dayOfWeek <= 4) {
                workingDays++;
            }
        }

        return workingDays;
    }

    /**
     * حساب معامل التناسب (Pro-rata) للموظفين الجدد أو المغادرين
     */
    private getProRataFactor(
        year: number,
        month: number,
        hireDate: Date | null,
        terminationDate: Date | null,
        calcBase: string,
        method: string
    ): number {
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0);
        const daysInMonth = monthEnd.getDate();

        // تحديد بداية ونهاية العمل الفعلي في هذا الشهر
        let effectiveStart = new Date(Math.max(monthStart.getTime(), hireDate ? hireDate.getTime() : 0));
        let effectiveEnd = new Date(Math.min(monthEnd.getTime(), terminationDate ? terminationDate.getTime() : monthEnd.getTime()));

        if (effectiveStart > monthEnd || effectiveEnd < monthStart) return 0;
        if (effectiveStart <= monthStart && effectiveEnd >= monthEnd) return 1;

        // حساب عدد الأيام الفعيلة بناءً على المنهجية
        let workedDays = 0;
        let totalDays = 0;

        if (method === 'INCLUDE_ALL_DAYS' || method === 'PRORATE_BY_CALENDAR') {
            workedDays = Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / (24 * 60 * 60 * 1000)) + 1;
            totalDays = calcBase === 'FIXED_30_DAYS' ? 30 : daysInMonth;
        } else if (method === 'EXCLUDE_WEEKENDS') {
            // حساب أيام العمل فقط (أحد-خميس)
            for (let d = new Date(effectiveStart); d <= effectiveEnd; d.setDate(d.getDate() + 1)) {
                if (d.getDay() >= 0 && d.getDay() <= 4) workedDays++;
            }
            totalDays = calcBase === 'FIXED_30_DAYS' ? 22 : this.getWorkingDaysInMonth(year, month);
        }

        return Math.min(1, workedDays / totalDays);
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

    private async getMonthlyAttendanceData(employeeId: string, companyId: string, year: number, month: number) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const attendances = await this.prisma.attendance.findMany({
            where: {
                userId: employeeId,
                companyId,
                date: { gte: startDate, lte: endDate },
            },
        });

        let presentDays = 0;
        let absentDays = 0;
        let totalLateMinutes = 0;
        let totalOvertimeMinutes = 0;

        for (const att of attendances) {
            if (att.status === 'PRESENT' || att.status === 'LATE') {
                presentDays++;
            } else if (att.status === 'ABSENT') {
                absentDays++;
            }
            totalLateMinutes += att.lateMinutes || 0;
            totalOvertimeMinutes += att.overtimeMinutes || 0;
        }

        return {
            presentDays,
            absentDays,
            lateMinutes: totalLateMinutes,
            overtimeHours: totalOvertimeMinutes / 60,
            recordsCount: attendances.length,
        };
    }

    async calculateForEmployee(
        employeeId: string,
        companyId: string,
        year: number,
        month: number,
    ): Promise<EmployeePayrollCalculation> {
        const trace: CalculationTraceItem[] = [];

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
        const assignment = employee.salaryAssignments[0];
        if (!assignment) throw new NotFoundException('لا يوجد هيكل راتب للموظف');

        const ctx: Record<string, number> = {};
        const totalSalary = Number(assignment.baseSalary);
        ctx.TOTAL = totalSalary;

        trace.push({
            step: 'TOTAL',
            description: 'إجمالي الراتب (المسند)',
            formula: `الراتب الكلي من التخصيص = ${totalSalary.toFixed(2)}`,
            result: totalSalary,
        });

        const settings = await this.getCalculationSettings(employeeId, companyId);

        const activeContract = employee.contracts?.[0];
        const terminationDate = activeContract?.terminatedAt || null;

        // حساب معامل التناسب (Pro-rata) للتعيين/الإنهاء
        const proRataFactor = this.getProRataFactor(
            year, month, employee.hireDate, terminationDate,
            settings.hireTerminationCalcBase,
            settings.hireTerminationMethod
        );

        let calculatedLines: { id: string; code: string; name: string; amount: number; type: string; gosiEligible: boolean }[] = [];

        if (!assignment.structure) {
            const amount = totalSalary * proRataFactor;
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
                let lineAmount = 0;
                let formulaUsed = '';

                const formulaContext = this.formulaEngine.buildVariableContext({
                    basicSalary: ctx.BASIC || totalSalary,
                    totalSalary: totalSalary,
                    ...ctx
                });

                if (component.nature === 'FORMULA' && component.formula) {
                    const result = this.formulaEngine.evaluate(component.formula, formulaContext);
                    lineAmount = result.value;
                    formulaUsed = `${component.formula} = ${lineAmount.toFixed(2)}`;
                } else if (line.percentage && Number(line.percentage) > 0) {
                    lineAmount = totalSalary * Number(line.percentage) / 100;
                    formulaUsed = `TOTAL × ${line.percentage}% = ${lineAmount.toFixed(2)}`;
                } else if (line.amount && Number(line.amount) > 0) {
                    lineAmount = Number(line.amount);
                    formulaUsed = `مبلغ ثابت = ${lineAmount.toFixed(2)}`;
                }

                // تطبيق التناسب (Pro-rata)
                const originalAmount = lineAmount;
                lineAmount = lineAmount * proRataFactor;
                if (proRataFactor < 1) {
                    formulaUsed = `${formulaUsed} (× ${proRataFactor.toFixed(4)} pro-rata)`;
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
                    result: lineAmount,
                });
            }
        }

        const baseSalary = ctx.BASIC || (totalSalary * proRataFactor);

        // 1. حساب عدد أيام الشهر والقيم اليومية حسب قاعدة كل نوع
        const daysInMonthGeneral = this.getDaysByBase(year, month, settings.calculationMethod as any);
        const daysInMonthOT = this.getDaysByBase(year, month, settings.overtimeCalcBase);
        const daysInMonthAbsence = this.getDaysByBase(year, month, settings.unpaidLeaveCalcBase);

        const dailyRateGeneral = baseSalary / daysInMonthGeneral;
        const hourlyRateGeneral = dailyRateGeneral / 8;

        const attendanceData = await this.getMonthlyAttendanceData(employeeId, companyId, year, month);
        let presentDays = attendanceData.presentDays || daysInMonthGeneral;
        let absentDays = attendanceData.absentDays || 0;
        let lateMinutes = attendanceData.lateMinutes || 0;
        let overtimeHours = attendanceData.overtimeHours || 0;

        // 2. حساب الخصومات (Absence/Late)
        // ملاحظة: قد نستخدم baseSalary أو totalSalary حسب الإعدادات (deductAbsenceFromBasic)
        const deductionBase = settings.deductAbsenceFromBasic ? baseSalary : totalSalary;
        const dailyRateAbsence = deductionBase / daysInMonthAbsence;
        const hourlyRateLate = dailyRateAbsence / 8;

        let absenceDeduction = absentDays > 0 ? absentDays * dailyRateAbsence : 0;
        let effectiveLateMinutes = Math.max(0, lateMinutes - (settings.gracePeriodMinutes || 15));
        let lateDeduction = effectiveLateMinutes > 0 ? (effectiveLateMinutes / 60) * hourlyRateLate : 0;

        // 3. حساب الوقت الإضافي (Overtime)
        const otBaseSalary = settings.overtimeMethod === 'BASED_ON_TOTAL' ? totalSalary :
            (settings.overtimeMethod === 'BASED_ON_BASIC_ONLY' ? baseSalary : baseSalary);

        const otHourlyRate = (otBaseSalary / daysInMonthOT / 8);
        let overtimeAmount = overtimeHours > 0 ? overtimeHours * otHourlyRate * settings.overtimeMultiplier : 0;

        // --- Policy Evaluation ---
        const gosiConfig = await this.prisma.gosiConfig.findFirst({
            where: { isActive: true, companyId },
            orderBy: { createdAt: 'desc' }
        });

        const periodStart = new Date(year, month - 1, 1);
        const periodEnd = new Date(year, month, 0);

        const evaluationContext: PolicyEvaluationContext = {
            employee: {
                id: employeeId,
                companyId,
                branchId: employee.branchId || undefined,
                departmentId: employee.departmentId || undefined,
                jobTitleId: employee.jobTitleId || undefined,
                basicSalary: baseSalary,
                hourlyRate: hourlyRateGeneral,
            },
            period: {
                year,
                month,
                startDate: periodStart,
                endDate: periodEnd,
                workingDays: daysInMonthGeneral,
            },
            attendance: {
                otHours: overtimeHours,
                otHoursWeekday: overtimeHours,
                otHoursWeekend: 0,
                otHoursHoliday: 0,
                lateMinutes: lateMinutes,
                lateCount: lateMinutes > 0 ? 1 : 0,
                absentDays: absentDays,
                earlyDepartureMinutes: 0,
                workingHours: presentDays * 8,
            },
        };

        let policyLines: PolicyPayrollLine[] = [
            ...calculatedLines.map(l => ({
                componentId: l.id,
                componentCode: l.code,
                componentName: l.name,
                amount: l.amount,
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

        try {
            const evaluatedLines = await this.policyEvaluator.evaluate(evaluationContext);
            for (const el of evaluatedLines) {
                policyLines.push(el);
            }

            const otPolicy = evaluatedLines.find(l => l.componentCode === 'OT' || l.componentCode === 'OVERTIME');
            if (otPolicy) overtimeAmount = otPolicy.amount;

            const latePolicy = evaluatedLines.find(l => l.componentCode === 'LATE');
            if (latePolicy) lateDeduction = latePolicy.amount;

            const absencePolicy = evaluatedLines.find(l => l.componentCode === 'ABSENCE');
            if (absencePolicy) absenceDeduction = absencePolicy.amount;
        } catch (err: any) {
            this.logger.error(`Error in policy evaluation: ${err.message}`);
        }

        // --- GOSI Calculation ---
        // Check eligibility: if isSaudiOnly is true, only Saudi employees get GOSI
        const isEligibleForGosi = gosiConfig && (
            !gosiConfig.isSaudiOnly || employee.isSaudi === true
        );

        if (isEligibleForGosi) {
            const gosiBase = calculatedLines.filter(l => l.gosiEligible).reduce((sum, l) => sum + l.amount, 0);
            const cappedBase = Math.min(gosiBase, Number(gosiConfig.maxCapAmount));
            const empRate = Number(gosiConfig.employeeRate) + Number(gosiConfig.sanedRate);
            const gosiDeduction = (cappedBase * empRate) / 100;

            if (gosiDeduction > 0) {
                policyLines.push({
                    componentId: 'GOSI-STATUTORY',
                    componentCode: 'GOSI',
                    componentName: 'التأمينات الاجتماعية',
                    sign: 'DEDUCTION',
                    amount: Math.round(gosiDeduction * 100) / 100,
                    descriptionAr: `حساب وطني (${empRate}%)`,
                    source: {
                        policyId: gosiConfig.id,
                        policyCode: 'GOSI_CONFIG',
                        ruleId: 'GOSI_EMP',
                        ruleCode: 'GOSI_EMP',
                    },
                    gosiEligible: false,
                });
            }
        }

        // --- Add System-Calculated Attendance Items (if not already from policy) ---
        const hasOTFromPolicy = policyLines.some(pl => pl.componentCode === 'OT' || pl.componentCode === 'OVERTIME');
        const hasLateFromPolicy = policyLines.some(pl => pl.componentCode === 'LATE' || pl.componentCode === 'LATE_DED');
        const hasAbsenceFromPolicy = policyLines.some(pl => pl.componentCode === 'ABSENCE' || pl.componentCode === 'ABSENCE_DED');

        if (overtimeAmount > 0 && !hasOTFromPolicy) {
            policyLines.push({
                componentId: 'SYS-OT',
                componentCode: 'OVERTIME',
                componentName: 'ساعات إضافية',
                sign: 'EARNING',
                amount: Math.round(overtimeAmount * 100) / 100,
                descriptionAr: `${overtimeHours} ساعة إضافية`,
                source: {
                    policyId: 'SYSTEM',
                    policyCode: 'SYSTEM_OT',
                    ruleId: 'OT_CALC',
                    ruleCode: 'OT_CALC',
                },
                gosiEligible: false,
            });
        }

        if (lateDeduction > 0 && !hasLateFromPolicy) {
            policyLines.push({
                componentId: 'SYS-LATE',
                componentCode: 'LATE_DED',
                componentName: 'خصم تأخير',
                sign: 'DEDUCTION',
                amount: Math.round(lateDeduction * 100) / 100,
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

        if (absenceDeduction > 0 && !hasAbsenceFromPolicy) {
            policyLines.push({
                componentId: 'SYS-ABSENCE',
                componentCode: 'ABSENCE_DED',
                componentName: 'خصم غياب',
                sign: 'DEDUCTION',
                amount: Math.round(absenceDeduction * 100) / 100,
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

        // --- Disciplinary Adjustments ---
        const payrollPeriod = await this.prisma.payrollPeriod.findFirst({
            where: { companyId, year, month }
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
                    adjAmount = appliedValue * dailyRateGeneral;
                } else if (adj.unit === 'HOURS') {
                    adjAmount = Number(adj.value) * hourlyRateGeneral;
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
                payments: true
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
                });
            }
        }

        // --- Sick Leave Pay Tiers (Saudi Labor Law) ---
        const sickLeaves = await this.prisma.leaveRequest.findMany({
            where: {
                userId: employeeId,
                companyId,
                status: 'APPROVED',
                type: 'SICK',
                startDate: { lte: periodEnd },
                endDate: { gte: periodStart },
            }
        });

        for (const sick of sickLeaves) {
            // ملاحظة: الحقول fullPayDays, partialPayDays, unpaidDays تم حسابها عند الموافقة على الطلب
            const sickUnpaid = Number(sick.unpaidDays || 0);
            const sickPartial = Number(sick.partialPayDays || 0);

            if (sickUnpaid > 0) {
                policyLines.push({
                    componentId: `SICK-UNPAID-${sick.id}`,
                    componentCode: 'SICK_UNPAID_DED',
                    componentName: 'خصم إجازة مرضية (بدون أجر)',
                    sign: 'DEDUCTION',
                    amount: Math.round(sickUnpaid * dailyRateGeneral * 100) / 100,
                    descriptionAr: `خصم ${sickUnpaid} يوم مرضى غير مدفوع`,
                    source: { policyId: sick.id, policyCode: 'LEAVE', ruleId: 'SICK_TIER', ruleCode: 'UNPAID' },
                    gosiEligible: false,
                });
            }

            if (sickPartial > 0) {
                // القانون السعودي: 75% من الأجر -> خصم 25%
                const deductionAmount = sickPartial * dailyRateGeneral * 0.25;
                policyLines.push({
                    componentId: `SICK-PARTIAL-${sick.id}`,
                    componentCode: 'SICK_PARTIAL_DED',
                    componentName: 'خصم إجازة مرضية (75% أجر)',
                    sign: 'DEDUCTION',
                    amount: Math.round(deductionAmount * 100) / 100,
                    descriptionAr: `خصم 25% من أجر ${sickPartial} يوم مرضى`,
                    source: { policyId: sick.id, policyCode: 'LEAVE', ruleId: 'SICK_TIER', ruleCode: 'PARTIAL' },
                    gosiEligible: false,
                });
            }
        }

        // --- Retroactive Pay (Backpay) ---
        const retroPays = await this.prisma.retroPay.findMany({
            where: {
                userId: employeeId,
                companyId,
                status: 'PENDING',
                effectiveDate: { lte: periodEnd }
            }
        });

        for (const retro of retroPays) {
            const retroAmount = Number(retro.amount);
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
                gosiEligible: retro.isGosiEligible,
            });
        }

        // --- End of Service (EOS) Settlement ---
        if (terminationDate &&
            terminationDate.getFullYear() === year &&
            (terminationDate.getMonth() + 1) === month) {

            try {
                const eosBreakdown = await this.eosService.calculateEos(employeeId, {
                    lastWorkingDay: terminationDate,
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

        const grossSalary = Math.round(policyLines.filter(l => l.sign === 'EARNING').reduce((sum, l) => sum + l.amount, 0) * 100) / 100;
        const totalDeductions = Math.round(policyLines.filter(l => l.sign === 'DEDUCTION').reduce((sum, l) => sum + l.amount, 0) * 100) / 100;

        const netSalaryRaw = grossSalary - totalDeductions;
        let netSalary = Math.round(netSalaryRaw * 100) / 100;

        // تطبيق التقريب (Rounding)
        if (settings.roundSalaryToNearest > 0) {
            netSalary = Math.round(netSalary / settings.roundSalaryToNearest) * settings.roundSalaryToNearest;
        }

        // معالجة الراتب السلبي (Negative Balance)
        if (netSalary < 0 && settings.enableNegativeBalanceCarryover) {
            this.logger.log(`Negative balance detected for ${employeeId}: ${netSalary}. Carryover enabled.`);
            // ملاحظة: هنا يجب تسجيل الحركة في جدول التسويات للشهر القادم لو لزم الأمر
        }

        return {
            employeeId,
            baseSalary,
            dailyRate: dailyRateGeneral,
            hourlyRate: hourlyRateGeneral,
            workingDays: daysInMonthGeneral,
            presentDays,
            absentDays,
            lateMinutes,
            lateDeduction,
            absenceDeduction,
            overtimeHours,
            overtimeAmount,
            grossSalary,
            totalDeductions,
            netSalary,
            calculationTrace: trace,
            policyLines,
        };
    }

    async previewCalculation(employeeId: string, companyId: string, year: number, month: number) {
        return this.calculateForEmployee(employeeId, companyId, year, month);
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
