import { Injectable, NotFoundException } from '@nestjs/common';
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
                // نفترض 5 أيام عمل في الأسبوع
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
            // 0 = الأحد، 5 = الجمعة، 6 = السبت
            // في السعودية: الأحد-الخميس أيام عمل
            if (dayOfWeek >= 0 && dayOfWeek <= 4) {
                workingDays++;
            }
        }

        return workingDays;
    }

    /**
     * جلب إعدادات الحساب من السياسة
     * يستخدم Policy Engine للحصول على السياسة المناسبة للموظف بناءً على التسلسل الهرمي
     */
    private async getCalculationSettings(employeeId: string, companyId: string): Promise<CalculationSettings> {
        try {
            // استخدام Policy Engine للحصول على السياسة المناسبة
            const policy = await this.policiesService.resolvePolicy('ATTENDANCE' as any, employeeId, companyId);

            if (policy?.settings && typeof policy.settings === 'object') {
                return {
                    ...DEFAULT_CALCULATION_SETTINGS,
                    ...(policy.settings as Record<string, any>),
                };
            }
        } catch (e) {
            // لو مفيش سياسة، نستخدم الافتراضي
            console.warn('No attendance policy found for employee:', employeeId);
        }
        return DEFAULT_CALCULATION_SETTINGS;
    }

    /**
     * تجميع بيانات الحضور للموظف للشهر
     */
    private async getMonthlyAttendanceData(employeeId: string, companyId: string, year: number, month: number) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0); // آخر يوم في الشهر

        const attendances = await this.prisma.attendance.findMany({
            where: {
                userId: employeeId,
                companyId,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });

        // تجميع البيانات
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

    /**
     * الحساب الكامل للموظف
     */
    async calculateForEmployee(
        employeeId: string,
        companyId: string,
        year: number,
        month: number,
    ): Promise<EmployeePayrollCalculation> {
        const trace: CalculationTraceItem[] = [];

        // 1. جلب بيانات الموظف والراتب
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
        if (!employee.salaryAssignments[0]) throw new NotFoundException('لا يوجد هيكل راتب للموظف');

        const assignment = employee.salaryAssignments[0];

        // ==========================================
        // 🔥 Total-Based Calculation (الجديد)
        // الإجمالي = المدخل → يتقسم على المكونات
        // ==========================================

        // الإجمالي هو المدخل الأساسي (من baseSalary field - سيتم تغيير اسمه لاحقاً)
        const totalSalary = Number(assignment.baseSalary);

        trace.push({
            step: 'totalSalary',
            description: 'إجمالي الراتب (المدخل)',
            formula: `الراتب الإجمالي = ${totalSalary.toFixed(2)} ريال`,
            result: totalSalary,
        });

        // 2. حساب المكونات من الإجمالي
        // نجمع كل النسب أولاً لمعرفة كيف يتقسم الإجمالي
        const structureLines = assignment.structure.lines.sort((a, b) => a.priority - b.priority);

        // حساب كل مكون
        const componentAmounts: { code: string; name: string; amount: number; type: string }[] = [];
        let totalPercentage = 0;
        let fixedAmount = 0;

        for (const line of structureLines) {
            if (line.component.type === 'EARNING') {
                if (line.percentage && Number(line.percentage) > 0) {
                    totalPercentage += Number(line.percentage);
                }
                if (line.amount && Number(line.amount) > 0) {
                    fixedAmount += Number(line.amount);
                }
            }
        }

        // الباقي بعد المبالغ الثابتة يتوزع على النسب
        const amountForPercentages = totalSalary - fixedAmount;

        // حساب كل مكون
        let calculatedBasic = 0;
        let totalAllowances = 0;

        for (const line of structureLines) {
            const component = line.component;
            let lineAmount = 0;

            if (component.type === 'EARNING') {
                if (line.percentage && Number(line.percentage) > 0) {
                    // النسبة من الإجمالي (بعد طرح المبالغ الثابتة)
                    lineAmount = amountForPercentages * (Number(line.percentage) / 100);
                } else if (line.amount && Number(line.amount) > 0) {
                    lineAmount = Number(line.amount);
                }

                // تحديد إذا كان هذا هو الراتب الأساسي
                const isBasic = component.code === 'BASIC' ||
                    component.code === 'BASE' ||
                    component.nameAr?.includes('أساسي') ||
                    component.nameEn?.toLowerCase().includes('basic');

                if (isBasic) {
                    calculatedBasic = lineAmount;
                } else {
                    totalAllowances += lineAmount;
                }

                componentAmounts.push({
                    code: component.code,
                    name: component.nameAr || component.nameEn || component.code,
                    amount: lineAmount,
                    type: isBasic ? 'BASIC' : 'ALLOWANCE',
                });

                trace.push({
                    step: `component_${component.code}`,
                    description: component.nameAr || component.nameEn || component.code,
                    formula: line.percentage
                        ? `${totalSalary} × ${line.percentage}% = ${lineAmount.toFixed(2)}`
                        : `مبلغ ثابت = ${lineAmount.toFixed(2)}`,
                    result: lineAmount,
                });
            }
        }

        // إذا لم يتم تحديد الأساسي في الهيكل، نحسبه كالباقي
        if (calculatedBasic === 0) {
            calculatedBasic = totalSalary - totalAllowances;
            trace.push({
                step: 'basicSalary',
                description: 'الراتب الأساسي (محسوب)',
                formula: `${totalSalary} - ${totalAllowances.toFixed(2)} = ${calculatedBasic.toFixed(2)}`,
                result: calculatedBasic,
            });
        }

        const baseSalary = calculatedBasic;

        // 3. جلب إعدادات الحساب
        const settings = await this.getCalculationSettings(employeeId, companyId);

        trace.push({
            step: 'settings',
            description: 'إعدادات الحساب',
            formula: `طريقة الحساب: ${settings.calculationMethod}`,
            result: 0,
        });

        // 4. حساب أيام الشهر ومعدل اليوم
        const daysInMonth = this.getDaysInMonth(year, month, settings.calculationMethod);
        const dailyRate = baseSalary / daysInMonth;
        const hourlyRate = dailyRate / 8;

        trace.push({
            step: 'dailyRate',
            description: 'حساب أجر اليوم (من الأساسي)',
            formula: `${baseSalary.toFixed(2)} / ${daysInMonth} = ${dailyRate.toFixed(2)}`,
            result: dailyRate,
        });

        // 5. جلب ملخص الحضور
        const attendanceData = await this.getMonthlyAttendanceData(employeeId, companyId, year, month);

        let presentDays = attendanceData.presentDays || daysInMonth;
        let absentDays = attendanceData.absentDays || 0;
        let lateMinutes = attendanceData.lateMinutes || 0;
        let overtimeHours = attendanceData.overtimeHours || 0;

        // 6. حساب خصم الغياب
        let absenceDeduction = 0;
        if (absentDays > 0 && settings.fullDayAbsenceDeduction) {
            absenceDeduction = absentDays * dailyRate;
            trace.push({
                step: 'absenceDeduction',
                description: 'خصم الغياب',
                formula: `${absentDays} يوم × ${dailyRate.toFixed(2)} = ${absenceDeduction.toFixed(2)}`,
                result: absenceDeduction,
            });
        }

        // 7. حساب خصم التأخير
        let lateDeduction = 0;
        const effectiveLateMinutes = Math.max(0, lateMinutes - settings.gracePeriodMinutes);
        if (effectiveLateMinutes > 0) {
            const lateHours = effectiveLateMinutes / 60;
            lateDeduction = lateHours * hourlyRate;
            trace.push({
                step: 'lateDeduction',
                description: 'خصم التأخير',
                formula: `${effectiveLateMinutes} دقيقة × (${hourlyRate.toFixed(2)}/60) = ${lateDeduction.toFixed(2)}`,
                result: lateDeduction,
            });
        }

        // 8. حساب الوقت الإضافي
        let overtimeAmount = 0;
        if (overtimeHours > 0) {
            // الوقت الإضافي يحسب على أساس الإجمالي أو الأساسي حسب الإعدادات
            const otBase = settings.overtimeSource === OvertimeSource.BASIC_PLUS_ALLOWANCES
                ? totalSalary
                : baseSalary;

            const otHourlyRate = (otBase / daysInMonth / 8);
            overtimeAmount = overtimeHours * otHourlyRate * settings.overtimeMultiplier;

            trace.push({
                step: 'overtime',
                description: 'الوقت الإضافي',
                formula: `${overtimeHours} ساعة × ${otHourlyRate.toFixed(2)} × ${settings.overtimeMultiplier} = ${overtimeAmount.toFixed(2)}`,
                result: overtimeAmount,
            });
        }

        // 9. الإجمالي النهائي (الإجمالي المدخل + الإضافي)
        const grossSalary = totalSalary + overtimeAmount;

        trace.push({
            step: 'grossSalary',
            description: 'إجمالي الراتب',
            formula: `${totalSalary.toFixed(2)} + ${overtimeAmount.toFixed(2)} = ${grossSalary.toFixed(2)}`,
            result: grossSalary,
        });

        // 9. الخصومات
        const totalDeductions = absenceDeduction + lateDeduction;

        trace.push({
            step: 'totalDeductions',
            description: 'إجمالي الخصومات (الحضور فقط)',
            formula: `غياب + تأخير = ${totalDeductions.toFixed(2)}`,
            result: totalDeductions,
        });

        // 10. الصافي
        const netSalary = grossSalary - totalDeductions;

        trace.push({
            step: 'netSalary',
            description: 'صافي الراتب (قبل GOSI والسلف)',
            formula: `${grossSalary.toFixed(2)} - ${totalDeductions.toFixed(2)} = ${netSalary.toFixed(2)}`,
            result: netSalary,
        });

        // 11. تقييم السياسات للحصول على خطوط إضافية
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
                otHoursWeekday: overtimeHours, // All OT treated as weekday by default
                otHoursWeekend: 0,
                otHoursHoliday: 0,
                lateMinutes: lateMinutes,
                lateCount: lateMinutes > 0 ? 1 : 0, // Simple estimate
                absentDays: absentDays,
                earlyDepartureMinutes: 0,
                workingHours: presentDays * 8,
            },

        };

        let policyLines: PolicyPayrollLine[] = [];
        try {
            policyLines = await this.policyEvaluator.evaluate(evaluationContext);
            trace.push({
                step: 'policyLines',
                description: `تقييم السياسات: ${policyLines.length} سطور`,
                formula: policyLines.map(l => `${l.componentCode}: ${l.amount}`).join(', ') || 'لا توجد',
                result: policyLines.reduce((sum, l) => sum + (l.sign === 'EARNING' ? l.amount : -l.amount), 0),
            });
        } catch (err) {
            trace.push({
                step: 'policyLines',
                description: 'خطأ في تقييم السياسات',
                formula: err.message,
                result: 0,
            });
        }

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

    /**
     * حساب للعرض (Preview) بدون حفظ
     */
    async previewCalculation(employeeId: string, companyId: string, year: number, month: number) {
        return this.calculateForEmployee(employeeId, companyId, year, month);
    }
}
