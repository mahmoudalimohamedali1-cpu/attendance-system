"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PayrollCalculationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollCalculationService = void 0;
const common_1 = require("@nestjs/common");
const smart_policy_executor_service_1 = require("../smart-policies/smart-policy-executor.service");
const ai_policy_evaluator_service_1 = require("../smart-policies/ai-policy-evaluator.service");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const policies_service_1 = require("../policies/policies.service");
const policy_rule_evaluator_service_1 = require("./services/policy-rule-evaluator.service");
const formula_engine_service_1 = require("./services/formula-engine.service");
const eos_service_1 = require("../eos/eos.service");
const calculate_eos_dto_1 = require("../eos/dto/calculate-eos.dto");
const calculation_types_1 = require("./dto/calculation.types");
let PayrollCalculationService = PayrollCalculationService_1 = class PayrollCalculationService {
    constructor(prisma, policiesService, policyEvaluator, formulaEngine, eosService, smartPolicyExecutor, aiPolicyEvaluator) {
        this.prisma = prisma;
        this.policiesService = policiesService;
        this.policyEvaluator = policyEvaluator;
        this.formulaEngine = formulaEngine;
        this.eosService = eosService;
        this.smartPolicyExecutor = smartPolicyExecutor;
        this.aiPolicyEvaluator = aiPolicyEvaluator;
        this.logger = new common_1.Logger(PayrollCalculationService_1.name);
    }
    getDaysInMonth(year, month, method) {
        return this.getDaysByBase(year, month, this.mapMethodToBase(method));
    }
    getDaysByBase(year, month, base) {
        switch (base) {
            case 'FIXED_30_DAYS':
                return 30;
            case 'CALENDAR_DAYS':
                return new Date(year, month, 0).getDate();
            case 'ACTUAL_WORKING_DAYS':
                return this.getWorkingDaysInMonth(year, month);
            default:
                return 30;
        }
    }
    getWorkingDaysInMonth(year, month) {
        const daysInMonth = new Date(year, month, 0).getDate();
        let workingDays = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const dayOfWeek = date.getDay();
            if (dayOfWeek >= 0 && dayOfWeek <= 4) {
                workingDays++;
            }
        }
        return workingDays;
    }
    getProRataFactor(year, month, hireDate, terminationDate, calcBase, method) {
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0);
        const daysInMonth = monthEnd.getDate();
        let effectiveStart = new Date(Math.max(monthStart.getTime(), hireDate ? hireDate.getTime() : 0));
        let effectiveEnd = new Date(Math.min(monthEnd.getTime(), terminationDate ? terminationDate.getTime() : monthEnd.getTime()));
        if (effectiveStart > monthEnd || effectiveEnd < monthStart)
            return 0;
        if (effectiveStart <= monthStart && effectiveEnd >= monthEnd)
            return 1;
        let workedDays = 0;
        let totalDays = 0;
        if (method === 'INCLUDE_ALL_DAYS' || method === 'PRORATE_BY_CALENDAR') {
            workedDays = Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / (24 * 60 * 60 * 1000)) + 1;
            totalDays = calcBase === 'FIXED_30_DAYS' ? 30 : daysInMonth;
        }
        else if (method === 'EXCLUDE_WEEKENDS') {
            for (let d = new Date(effectiveStart); d <= effectiveEnd; d.setDate(d.getDate() + 1)) {
                if (d.getDay() >= 0 && d.getDay() <= 4)
                    workedDays++;
            }
            totalDays = calcBase === 'FIXED_30_DAYS' ? 22 : this.getWorkingDaysInMonth(year, month);
        }
        return Math.min(1, workedDays / totalDays);
    }
    mapMethodToBase(method) {
        switch (method) {
            case calculation_types_1.CalculationMethod.CALENDAR_DAYS: return 'CALENDAR_DAYS';
            case calculation_types_1.CalculationMethod.WORKING_DAYS: return 'ACTUAL_WORKING_DAYS';
            case calculation_types_1.CalculationMethod.FIXED_30: return 'FIXED_30_DAYS';
            default: return 'FIXED_30_DAYS';
        }
    }
    async getCalculationSettings(employeeId, companyId) {
        let mergedSettings = { ...calculation_types_1.DEFAULT_CALCULATION_SETTINGS };
        try {
            const companySettings = await this.prisma.payrollSettings.findUnique({
                where: { companyId },
            });
            if (companySettings) {
                const mappedSettings = {
                    payrollClosingDay: companySettings.payrollClosingDay,
                    calculationMethod: this.mapWorkDayBaseToMethod(companySettings.unpaidLeaveCalcBase),
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
            const policy = await this.policiesService.resolvePolicy('ATTENDANCE', employeeId, companyId);
            if (policy?.settings && typeof policy.settings === 'object') {
                mergedSettings = {
                    ...mergedSettings,
                    ...policy.settings,
                };
            }
        }
        catch (e) {
            this.logger.warn('Error fetching payroll or policy settings, using defaults/partial:', e.message);
        }
        return mergedSettings;
    }
    mapWorkDayBaseToMethod(base) {
        switch (base) {
            case 'CALENDAR_DAYS': return calculation_types_1.CalculationMethod.CALENDAR_DAYS;
            case 'ACTUAL_WORKING_DAYS': return calculation_types_1.CalculationMethod.WORKING_DAYS;
            case 'FIXED_30_DAYS': return calculation_types_1.CalculationMethod.FIXED_30;
            default: return calculation_types_1.CalculationMethod.FIXED_30;
        }
    }
    async getMonthlyAttendanceData(employeeId, companyId, year, month) {
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
            }
            else if (att.status === 'ABSENT') {
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
    async calculateForEmployee(employeeId, companyId, year, month) {
        const trace = [];
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
        if (!employee)
            throw new common_1.NotFoundException('الموظف غير موجود');
        const periodStart = new Date(year, month - 1, 1);
        if (employee.hireDate && new Date(employee.hireDate) > periodStart) {
            throw new common_1.BadRequestException(`لا يمكن حساب راتب الموظف ${employee.firstName} ${employee.lastName} - ` +
                `تاريخ التعيين (${new Date(employee.hireDate).toLocaleDateString('ar-SA')}) ` +
                `بعد بداية فترة الراتب (${periodStart.toLocaleDateString('ar-SA')})`);
        }
        const assignment = employee.salaryAssignments[0];
        if (!assignment)
            throw new common_1.NotFoundException('لا يوجد هيكل راتب للموظف');
        const ctx = {};
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
        const proRataFactor = this.getProRataFactor(year, month, employee.hireDate, terminationDate, settings.hireTerminationCalcBase, settings.hireTerminationMethod);
        let calculatedLines = [];
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
        }
        else {
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
                }
                else if (line.percentage && Number(line.percentage) > 0) {
                    lineAmount = totalSalary * Number(line.percentage) / 100;
                    formulaUsed = `TOTAL × ${line.percentage}% = ${lineAmount.toFixed(2)}`;
                }
                else if (line.amount && Number(line.amount) > 0) {
                    lineAmount = Number(line.amount);
                    formulaUsed = `مبلغ ثابت = ${lineAmount.toFixed(2)}`;
                }
                const originalAmount = lineAmount;
                lineAmount = lineAmount * proRataFactor;
                if (proRataFactor < 1) {
                    formulaUsed = `${formulaUsed} (× ${proRataFactor.toFixed(4)} pro-rata)`;
                }
                ctx[component.code] = lineAmount;
                if (component.code === 'BASIC' || component.code === 'BASE')
                    ctx.BASIC = lineAmount;
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
        const daysInMonthGeneral = this.getDaysByBase(year, month, settings.calculationMethod);
        const daysInMonthOT = this.getDaysByBase(year, month, settings.overtimeCalcBase);
        const daysInMonthAbsence = this.getDaysByBase(year, month, settings.unpaidLeaveCalcBase);
        const dailyRateGeneral = baseSalary / daysInMonthGeneral;
        const hourlyRateGeneral = dailyRateGeneral / 8;
        const attendanceData = await this.getMonthlyAttendanceData(employeeId, companyId, year, month);
        let presentDays = attendanceData.presentDays || daysInMonthGeneral;
        let absentDays = attendanceData.absentDays || 0;
        let lateMinutes = attendanceData.lateMinutes || 0;
        let overtimeHours = attendanceData.overtimeHours || 0;
        const deductionBase = settings.deductAbsenceFromBasic ? baseSalary : totalSalary;
        const dailyRateAbsence = deductionBase / daysInMonthAbsence;
        const hourlyRateLate = dailyRateAbsence / 8;
        let absenceDeduction = absentDays > 0 ? absentDays * dailyRateAbsence : 0;
        let effectiveLateMinutes = Math.max(0, lateMinutes - (settings.gracePeriodMinutes || 15));
        let lateDeduction = effectiveLateMinutes > 0 ? (effectiveLateMinutes / 60) * hourlyRateLate : 0;
        const otBaseSalary = settings.overtimeMethod === 'BASED_ON_TOTAL' ? totalSalary :
            (settings.overtimeMethod === 'BASED_ON_BASIC_ONLY' ? baseSalary : baseSalary);
        const otHourlyRate = (otBaseSalary / daysInMonthOT / 8);
        let overtimeAmount = overtimeHours > 0 ? overtimeHours * otHourlyRate * settings.overtimeMultiplier : 0;
        const gosiConfig = await this.prisma.gosiConfig.findFirst({
            where: { isActive: true, companyId },
            orderBy: { createdAt: 'desc' }
        });
        const policyPeriodStart = new Date(year, month - 1, 1);
        const policyPeriodEnd = new Date(year, month, 0);
        const evaluationContext = {
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
                startDate: policyPeriodStart,
                endDate: policyPeriodEnd,
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
        let policyLines = [
            ...calculatedLines.map(l => ({
                componentId: l.id,
                componentCode: l.code,
                componentName: l.name,
                amount: l.amount,
                sign: 'EARNING',
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
            if (otPolicy)
                overtimeAmount = otPolicy.amount;
            const latePolicy = evaluatedLines.find(l => l.componentCode === 'LATE');
            if (latePolicy)
                lateDeduction = latePolicy.amount;
            const absencePolicy = evaluatedLines.find(l => l.componentCode === 'ABSENCE');
            if (absencePolicy)
                absenceDeduction = absencePolicy.amount;
        }
        catch (err) {
            this.logger.error(`Error in policy evaluation: ${err.message}`);
        }
        let gosiEmployeeAmount = 0;
        let gosiEmployerAmount = 0;
        if (gosiConfig) {
            const gosiBase = calculatedLines.filter(l => l.gosiEligible).reduce((sum, l) => sum + l.amount, 0);
            const cappedBase = Math.min(gosiBase, Number(gosiConfig.maxCapAmount));
            if (employee.isSaudi) {
                const empRate = Number(gosiConfig.employeeRate) + Number(gosiConfig.sanedRate);
                const coRate = Number(gosiConfig.employerRate) + Number(gosiConfig.sanedRate) + Number(gosiConfig.hazardRate);
                gosiEmployeeAmount = (cappedBase * empRate) / 100;
                gosiEmployerAmount = (cappedBase * coRate) / 100;
                if (gosiEmployeeAmount > 0) {
                    policyLines.push({
                        componentId: 'GOSI-EMP-STATUTORY',
                        componentCode: 'GOSI_EMP',
                        componentName: 'تأمينات اجتماعية (موظف)',
                        sign: 'DEDUCTION',
                        amount: Math.round(gosiEmployeeAmount * 100) / 100,
                        descriptionAr: `حصة الموظف (${empRate}%)`,
                        source: { policyId: gosiConfig.id, policyCode: 'GOSI_CONFIG', ruleId: 'GOSI_EMP', ruleCode: 'GOSI_SAUDI' },
                        gosiEligible: false,
                    });
                }
            }
            else {
                if (!gosiConfig.isSaudiOnly) {
                    const coRate = Number(gosiConfig.hazardRate);
                    gosiEmployerAmount = (cappedBase * coRate) / 100;
                }
            }
            if (gosiEmployerAmount > 0) {
                policyLines.push({
                    componentId: 'GOSI-CO-STATUTORY',
                    componentCode: 'GOSI_CO',
                    componentName: 'تأمينات اجتماعية (شركة)',
                    sign: 'DEDUCTION',
                    isEmployerContribution: true,
                    amount: Math.round(gosiEmployerAmount * 100) / 100,
                    descriptionAr: `حصة الشركة من التأمينات`,
                    source: { policyId: gosiConfig.id, policyCode: 'GOSI_CONFIG', ruleId: 'GOSI_CO', ruleCode: 'EMPLOYER_SHARE' },
                    gosiEligible: false,
                });
            }
        }
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
        const payrollPeriod = await this.prisma.payrollPeriod.findFirst({
            where: { companyId, year, month }
        });
        if (payrollPeriod) {
            const disciplinaryAdjustments = await this.prisma.payrollAdjustment.findMany({
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
                if (adj.unit === 'DAYS') {
                    if (adj.effectiveDate) {
                        const adjEffectiveDate = new Date(adj.effectiveDate);
                        const periodStartDate = new Date(payrollPeriod.startDate);
                        const periodEndDate = new Date(payrollPeriod.endDate);
                        const capStart = adjEffectiveDate > periodStartDate ? adjEffectiveDate : periodStartDate;
                        if (capStart > periodEndDate) {
                            appliedValue = 0;
                            descriptionExtra = ' (خارج الفترة الحالية)';
                        }
                        else {
                            const daysRemaining = Math.max(0, Math.floor((periodEndDate.getTime() - capStart.getTime()) / (24 * 60 * 60 * 1000)) + 1);
                            if (daysRemaining < appliedValue) {
                                appliedValue = daysRemaining;
                                descriptionExtra = ` (مخفض من ${Number(adj.value)} أيام بسبب تاريخ الاستحقاق)`;
                                this.logger.log(`Penalty capped for case ${adj.caseId}: ${Number(adj.value)} -> ${appliedValue} days`);
                            }
                        }
                    }
                    adjAmount = appliedValue * dailyRateGeneral;
                }
                else if (adj.unit === 'HOURS') {
                    adjAmount = Number(adj.value) * hourlyRateGeneral;
                }
                if (appliedValue <= 0 && adj.unit === 'DAYS' && adj.effectiveDate)
                    continue;
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
                    _loanPaymentData: {
                        advanceRequestId: loan.id,
                        amount: Math.round(installment * 100) / 100,
                        paymentType: 'PAYROLL_DEDUCTION',
                        periodMonth: month,
                        periodYear: year,
                    }
                });
            }
        }
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
        const retroPays = await this.prisma.retroPay.findMany({
            where: {
                employeeId,
                companyId,
                status: 'PENDING',
                effectiveFrom: { lte: policyPeriodEnd }
            }
        });
        const retroIdsToUpdate = [];
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
        if (retroIdsToUpdate.length > 0) {
            await this.prisma.retroPay.updateMany({
                where: { id: { in: retroIdsToUpdate } },
                data: {
                    status: 'PAID',
                    paidAt: new Date(),
                    notes: `تم التطبيق في فترة ${year}-${month}`
                }
            });
        }
        if (terminationDate &&
            terminationDate.getFullYear() === year &&
            (terminationDate.getMonth() + 1) === month) {
            try {
                const eosBreakdown = await this.eosService.calculateEos(employeeId, {
                    lastWorkingDay: terminationDate.toISOString(),
                    reason: activeContract?.terminationReason || calculate_eos_dto_1.EosReason.TERMINATION,
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
            }
            catch (err) {
                this.logger.error(`Failed to calculate EOS for ${employeeId}: ${err.message}`);
            }
        }
        try {
            const smartResults = await this.smartPolicyExecutor.executeSmartPolicies(companyId, {
                employee: employee,
                baseSalary: baseSalary,
                workingDays: daysInMonthGeneral,
                absentDays: absentDays,
                lateDays: Math.round(lateMinutes / 60),
                overtimeHours: overtimeHours,
                month: month,
                year: year,
            });
            for (const result of smartResults) {
                if (result.success && result.policyLine) {
                    policyLines.push(result.policyLine);
                }
            }
            this.logger.log(`Smart policies executed: ${smartResults.length} results`);
        }
        catch (err) {
            this.logger.error(`Error executing smart policies: ${err.message}`);
        }
        try {
            const aiContext = {
                employeeId: employee.id,
                employeeName: `${employee.firstName} ${employee.lastName}`,
                department: employee.department?.name || null,
                jobTitle: employee.jobTitle,
                hireDate: employee.hireDate,
                yearsOfService: employee.hireDate ? Math.floor((Date.now() - new Date(employee.hireDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0,
                baseSalary: baseSalary,
                totalSalary: baseSalary * 1.25,
                workingDays: daysInMonthGeneral,
                presentDays: daysInMonthGeneral - absentDays,
                absentDays: absentDays,
                lateDays: Math.round(lateMinutes / 60),
                lateMinutes: lateMinutes,
                overtimeHours: overtimeHours,
                attendancePercentage: Math.round(((daysInMonthGeneral - absentDays) / daysInMonthGeneral) * 100),
                leavesTaken: 0,
                unpaidLeaves: 0,
                activePenalties: 0,
                pendingCustodyReturns: 0,
                returnedCustodyThisMonth: 0,
                month: month,
                year: year,
            };
            const aiPolicyLines = await this.aiPolicyEvaluator.evaluateAllPolicies(companyId, aiContext);
            policyLines.push(...aiPolicyLines);
            this.logger.log(`AI Policy evaluation: ${aiPolicyLines.length} adjustments`);
        }
        catch (err) {
            this.logger.error(`AI Policy evaluation error: ${err.message}`);
        }
        const grossSalary = Math.round(policyLines.filter(l => l.sign === 'EARNING' && !l.isEmployerContribution).reduce((sum, l) => sum + l.amount, 0) * 100) / 100;
        let totalDeductions = Math.round(policyLines.filter(l => l.sign === 'DEDUCTION' && !l.isEmployerContribution).reduce((sum, l) => sum + l.amount, 0) * 100) / 100;
        const MAX_DEDUCTION_PERCENT = 0.5;
        const maxAllowedDeduction = grossSalary * MAX_DEDUCTION_PERCENT;
        let deductionsExceedLimit = false;
        if (totalDeductions > maxAllowedDeduction && grossSalary > 0) {
            deductionsExceedLimit = true;
            this.logger.warn(`⚠️ Deductions exceed Saudi Labor Law Article 91 limit for employee ${employeeId}: ` +
                `Total deductions (${totalDeductions}) > 50% of gross (${maxAllowedDeduction})`);
        }
        const employerContributions = Math.round(policyLines.filter(l => l.isEmployerContribution).reduce((sum, l) => sum + l.amount, 0) * 100) / 100;
        const netSalaryRaw = grossSalary - totalDeductions;
        let netSalary = Math.round(netSalaryRaw * 100) / 100;
        if (settings.roundSalaryToNearest > 0) {
            netSalary = Math.round(netSalary / settings.roundSalaryToNearest) * settings.roundSalaryToNearest;
        }
        if (netSalary < 0 && settings.enableNegativeBalanceCarryover) {
            this.logger.log(`Negative balance detected for ${employeeId}: ${netSalary}. Carryover enabled.`);
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
    async previewCalculation(employeeId, companyId, year, month) {
        return this.calculateForEmployee(employeeId, companyId, year, month);
    }
    topologicalSort(lines) {
        const sorted = [];
        const visited = new Set();
        const visiting = new Set();
        const visit = (line) => {
            const id = line.component.code;
            if (visiting.has(id))
                throw new Error(`Circular dependency detected in component: ${id}`);
            if (!visited.has(id)) {
                visiting.add(id);
                const formula = line.component.formula;
                if (formula) {
                    const deps = this.formulaEngine.extractDependencies(formula);
                    for (const dep of deps) {
                        const depLine = lines.find(l => l.component.code === dep);
                        if (depLine)
                            visit(depLine);
                    }
                }
                visiting.delete(id);
                visited.add(id);
                sorted.push(line);
            }
        };
        for (const line of lines)
            visit(line);
        return sorted;
    }
};
exports.PayrollCalculationService = PayrollCalculationService;
exports.PayrollCalculationService = PayrollCalculationService = PayrollCalculationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        policies_service_1.PoliciesService,
        policy_rule_evaluator_service_1.PolicyRuleEvaluatorService,
        formula_engine_service_1.FormulaEngineService,
        eos_service_1.EosService,
        smart_policy_executor_service_1.SmartPolicyExecutorService,
        ai_policy_evaluator_service_1.AIPolicyEvaluatorService])
], PayrollCalculationService);
//# sourceMappingURL=payroll-calculation.service.js.map