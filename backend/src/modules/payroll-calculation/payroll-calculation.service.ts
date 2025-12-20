import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PoliciesService } from '../policies/policies.service';
import {
    CalculationMethod,
    CalculationSettings,
    DEFAULT_CALCULATION_SETTINGS,
    EmployeePayrollCalculation,
    CalculationTraceItem,
    OvertimeSource,
} from './dto/calculation.types';

@Injectable()
export class PayrollCalculationService {
    constructor(
        private prisma: PrismaService,
        private policiesService: PoliciesService,
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
     */
    private async getCalculationSettings(employeeId: string, companyId: string): Promise<CalculationSettings> {
        try {
            const policy = await this.prisma.policy.findFirst({
                where: {
                    companyId,
                    type: 'ATTENDANCE',
                    isActive: true,
                    // TODO: add support for employee specific policies if needed
                }
            });
            if (policy?.settings && typeof policy.settings === 'object') {
                return {
                    ...DEFAULT_CALCULATION_SETTINGS,
                    ...(policy.settings as Record<string, any>),
                };
            }
        } catch (e) {
            // لو مفيش سياسة، نستخدم الافتراضي
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
        const baseSalary = Number(assignment.baseSalary);

        // 2. جلب إعدادات الحساب
        const settings = await this.getCalculationSettings(employeeId, companyId);

        trace.push({
            step: 'settings',
            description: 'إعدادات الحساب',
            formula: `طريقة الحساب: ${settings.calculationMethod}`,
            result: 0,
        });

        // 3. حساب أيام الشهر ومعدل اليوم
        const daysInMonth = this.getDaysInMonth(year, month, settings.calculationMethod);
        const dailyRate = baseSalary / daysInMonth;
        const hourlyRate = dailyRate / 8;

        trace.push({
            step: 'dailyRate',
            description: 'حساب أجر اليوم',
            formula: `${baseSalary} / ${daysInMonth} = ${dailyRate.toFixed(2)}`,
            result: dailyRate,
        });

        // 4. جلب ملخص الحضور
        const attendanceData = await this.getMonthlyAttendanceData(employeeId, companyId, year, month);

        let presentDays = attendanceData.presentDays || daysInMonth;
        let absentDays = attendanceData.absentDays || 0;
        let lateMinutes = attendanceData.lateMinutes || 0;
        let overtimeHours = attendanceData.overtimeHours || 0;

        // 5. حساب خصم الغياب
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

        // 6. حساب خصم التأخير
        let lateDeduction = 0;
        const effectiveLateMinutes = Math.max(0, lateMinutes - settings.gracePeriodMinutes);
        if (effectiveLateMinutes > 0) {
            // نخصم بالدقيقة (دقيقة = ساعة/60)
            const lateHours = effectiveLateMinutes / 60;
            lateDeduction = lateHours * hourlyRate;
            trace.push({
                step: 'lateDeduction',
                description: 'خصم التأخير',
                formula: `${effectiveLateMinutes} دقيقة × (${hourlyRate.toFixed(2)}/60) = ${lateDeduction.toFixed(2)}`,
                result: lateDeduction,
            });
        }

        // 7. حساب الوقت الإضافي
        let overtimeAmount = 0;
        if (overtimeHours > 0) {
            let otBase = baseSalary;
            if (settings.overtimeSource === OvertimeSource.BASIC_PLUS_ALLOWANCES) {
                // نضيف البدلات من الهيكل
                for (const line of assignment.structure.lines) {
                    if (line.component.type === 'EARNING') {
                        if (line.amount) {
                            otBase += Number(line.amount);
                        } else if (line.percentage) {
                            otBase += baseSalary * Number(line.percentage) / 100;
                        }
                    }
                }
            }

            const otHourlyRate = (otBase / daysInMonth / 8);
            overtimeAmount = overtimeHours * otHourlyRate * settings.overtimeMultiplier;

            trace.push({
                step: 'overtime',
                description: 'الوقت الإضافي',
                formula: `${overtimeHours} ساعة × ${otHourlyRate.toFixed(2)} × ${settings.overtimeMultiplier} = ${overtimeAmount.toFixed(2)}`,
                result: overtimeAmount,
            });
        }

        // 8. حساب الإجمالي
        let grossSalary = baseSalary + overtimeAmount;

        // إضافة البدلات من الهيكل
        for (const line of assignment.structure.lines) {
            if (line.component.type === 'EARNING') {
                let lineAmount = 0;
                if (line.amount) {
                    lineAmount = Number(line.amount);
                } else if (line.percentage) {
                    lineAmount = baseSalary * Number(line.percentage) / 100;
                }
                grossSalary += lineAmount;
            }
        }

        trace.push({
            step: 'grossSalary',
            description: 'إجمالي الراتب',
            formula: `الأساسي + البدلات + الوقت الإضافي = ${grossSalary.toFixed(2)}`,
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
        };
    }

    /**
     * حساب للعرض (Preview) بدون حفظ
     */
    async previewCalculation(employeeId: string, companyId: string, year: number, month: number) {
        return this.calculateForEmployee(employeeId, companyId, year, month);
    }
}
