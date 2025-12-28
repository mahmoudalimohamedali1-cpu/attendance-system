import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PoliciesService } from '../policies/policies.service';
import { PolicyRuleEvaluatorService } from './services/policy-rule-evaluator.service';
import { FormulaEngineService } from './services/formula-engine.service';
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
    ) { }

    /**
     * حساب عدد أيام الشهر حسب طريقة الحساب
     */
    private getDaysInMonth(year: number, month: number, method: CalculationMethod): number {
        switch (method) {
            case CalculationMethod.FIXED_30:
                return 30;
            case CalculationMethod.CALENDAR_DAYS:
                return new Date(year, month, 0).getDate();
            case CalculationMethod.WORKING_DAYS:
                return this.getWorkingDaysInMonth(year, month);
            default:
                return 30;
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
            if (dayOfWeek >= 0 && dayOfWeek <= 4) {
                workingDays++;
            }
        }

        return workingDays;
    }

    private async getCalculationSettings(employeeId: string, companyId: string): Promise<CalculationSettings> {
        try {
            const policy = await this.policiesService.resolvePolicy('ATTENDANCE' as any, employeeId, companyId);
            if (policy?.settings && typeof policy.settings === 'object') {
                return {
                    ...DEFAULT_CALCULATION_SETTINGS,
                    ...(policy.settings as Record<string, any>),
                };
            }
        } catch (e) {
            this.logger.warn('No attendance policy found for employee:', employeeId);
        }
        return DEFAULT_CALCULATION_SETTINGS;
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

        let calculatedLines: { id: string; code: string; name: string; amount: number; type: string; gosiEligible: boolean }[] = [];

        if (!assignment.structure) {
            calculatedLines.push({
                id: 'BASIC-FALLBACK',
                code: 'BASIC',
                name: 'الراتب الأساسي',
                amount: totalSalary,
                type: 'BASIC',
                gosiEligible: true,
            });
            ctx.BASIC = totalSalary;
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

        const baseSalary = ctx.BASIC || totalSalary;
        const settings = await this.getCalculationSettings(employeeId, companyId);
        const daysInMonth = this.getDaysInMonth(year, month, settings.calculationMethod);
        const dailyRate = baseSalary / daysInMonth;
        const hourlyRate = dailyRate / 8;

        const attendanceData = await this.getMonthlyAttendanceData(employeeId, companyId, year, month);
        let presentDays = attendanceData.presentDays || daysInMonth;
        let absentDays = attendanceData.absentDays || 0;
        let lateMinutes = attendanceData.lateMinutes || 0;
        let overtimeHours = attendanceData.overtimeHours || 0;

        let absenceDeduction = absentDays > 0 ? absentDays * dailyRate : 0;
        let effectiveLateMinutes = Math.max(0, lateMinutes - settings.gracePeriodMinutes);
        let lateDeduction = effectiveLateMinutes > 0 ? (effectiveLateMinutes / 60) * hourlyRate : 0;

        const otBase = settings.overtimeSource === OvertimeSource.BASIC_PLUS_ALLOWANCES ? totalSalary : baseSalary;
        const otHourlyRate = (otBase / daysInMonth / 8);
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
                hourlyRate,
            },
            period: {
                year,
                month,
                startDate: periodStart,
                endDate: periodEnd,
                workingDays: daysInMonth,
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
                    adjAmount = appliedValue * dailyRate;
                } else if (adj.unit === 'HOURS') {
                    adjAmount = Number(adj.value) * hourlyRate;
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

        const grossSalary = Math.round(policyLines.filter(l => l.sign === 'EARNING').reduce((sum, l) => sum + l.amount, 0) * 100) / 100;
        const totalDeductions = Math.round(policyLines.filter(l => l.sign === 'DEDUCTION').reduce((sum, l) => sum + l.amount, 0) * 100) / 100;
        const netSalary = Math.round((grossSalary - totalDeductions) * 100) / 100;

        return {
            employeeId,
            baseSalary,
            dailyRate,
            hourlyRate,
            workingDays: daysInMonth,
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
