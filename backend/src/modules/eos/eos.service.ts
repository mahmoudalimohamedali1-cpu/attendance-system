import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CalculateEosDto, EosBreakdown, EosReason } from './dto/calculate-eos.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { LeaveCalculationService } from '../leaves/leave-calculation.service';

@Injectable()
export class EosService {
    constructor(
        private prisma: PrismaService,
        private leaveCalculationService: LeaveCalculationService,
    ) { }

    /**
     * Calculate years, months, and days between two dates accurately
     */
    private calculateServiceDuration(startDate: Date, endDate: Date): { years: number; months: number; days: number; totalDays: number } {
        const start = new Date(startDate);
        const end = new Date(endDate);

        let years = end.getFullYear() - start.getFullYear();
        let months = end.getMonth() - start.getMonth();
        let days = end.getDate() - start.getDate();

        // Adjust for negative days
        if (days < 0) {
            months--;
            // Get days in previous month
            const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
            days += prevMonth.getDate();
        }

        // Adjust for negative months
        if (months < 0) {
            years--;
            months += 12;
        }

        const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        return { years, months, days, totalDays };
    }

    async calculateEos(userId: string, dto: CalculateEosDto): Promise<EosBreakdown> {
        const employee = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                salaryAssignments: { where: { isActive: true }, take: 1 },
                advanceRequests: { where: { status: 'APPROVED' } },
                leaveRequests: { where: { status: 'APPROVED' } },
            }
        });

        if (!employee) throw new NotFoundException('الموظف غير موجود');
        if (!employee.hireDate) throw new NotFoundException('لم يتم تحديد تاريخ التعيين للموظف');

        const hireDate = new Date(employee.hireDate);
        const lastWorkingDay = new Date(dto.lastWorkingDay);

        // حساب مدة الخدمة بدقة
        const serviceDuration = this.calculateServiceDuration(hireDate, lastWorkingDay);
        const { years, months, days, totalDays } = serviceDuration;

        // حساب السنوات الكاملة مع الكسور للمكافأة
        const totalYears = totalDays / 365.25;

        // الراتب الأساسي (من التعيين أو تجاوز)
        const baseSalary = dto.overrideBaseSalary
            || (employee.salaryAssignments[0]?.baseSalary
                ? Number(employee.salaryAssignments[0].baseSalary)
                : (employee.salary ? Number(employee.salary) : 0));

        // ========================================
        // حساب مكافأة نهاية الخدمة (طريقة نظام العمل السعودي)
        // ========================================
        let eosForFirst5Years = 0;
        let eosForRemaining = 0;

        if (totalYears <= 5) {
            // أول 5 سنوات: نصف شهر عن كل سنة
            eosForFirst5Years = totalYears * (baseSalary * 0.5);
        } else {
            // أول 5 سنوات كاملة
            eosForFirst5Years = 5 * (baseSalary * 0.5);
            // ما بعد 5 سنوات: شهر كامل عن كل سنة
            eosForRemaining = (totalYears - 5) * baseSalary;
        }

        const totalEos = eosForFirst5Years + eosForRemaining;

        // ========================================
        // تعديل حسب سبب الإنهاء (للاستقالة فقط)
        // ========================================
        let eosAdjustmentFactor = 1.0;

        if (dto.reason === EosReason.RESIGNATION) {
            if (totalYears < 2) {
                // أقل من سنتين: لا يستحق شيء
                eosAdjustmentFactor = 0;
            } else if (totalYears < 5) {
                // 2-5 سنوات: ثلث المكافأة
                eosAdjustmentFactor = 1 / 3;
            } else if (totalYears < 10) {
                // 5-10 سنوات: ثلثي المكافأة
                eosAdjustmentFactor = 2 / 3;
            } else {
                // أكثر من 10 سنوات: كامل المكافأة
                eosAdjustmentFactor = 1.0;
            }
        }
        // إنهاء من الشركة أو انتهاء عقد = كامل المكافأة

        const adjustedEos = totalEos * eosAdjustmentFactor;

        // ========================================
        // تعويض الإجازات المتبقية (باستخدام leaveAllowanceMethod)
        // ========================================
        let remainingLeaveDays: number;
        let remainingLeaveDaysOverridden = false;

        if (dto.overrideRemainingLeaveDays !== undefined && dto.overrideRemainingLeaveDays !== null) {
            // استخدام القيمة المدخلة يدوياً
            remainingLeaveDays = dto.overrideRemainingLeaveDays;
            remainingLeaveDaysOverridden = true;
        } else {
            // حساب الإجازات المستحقة من تاريخ التعيين حتى آخر يوم عمل
            const earnedLeaveDays = this.leaveCalculationService.calculateEarnedLeaveDays(hireDate, lastWorkingDay);

            // حساب الإجازات المستخدمة من الطلبات المعتمدة
            let usedLeaveDays = 0;
            for (const leave of employee.leaveRequests) {
                usedLeaveDays += Number(leave.requestedDays) || 0;
            }

            // الرصيد المتبقي = المستحق - المستخدم
            remainingLeaveDays = Math.max(0, Math.floor(earnedLeaveDays - usedLeaveDays));
        }

        // ✅ جلب إعدادات الرواتب للشركة
        const payrollSettings = await (this.prisma as any).payrollSettings.findUnique({
            where: { companyId: employee.companyId },
        });

        // ✅ تحديد قاعدة حساب بدل الإجازة (leaveAllowanceMethod)
        const leaveAllowanceMethod = payrollSettings?.leaveAllowanceMethod || 'BASIC_PLUS_HOUSING';
        const leaveDailyRateDivisor = payrollSettings?.leaveDailyRateDivisor || 30;

        // حساب بدل السكن (إن وجد) من هيكل الراتب
        let housingAllowance = 0;
        let totalSalary = baseSalary;

        if (employee.salaryAssignments[0]) {
            const assignment = await (this.prisma as any).salaryAssignment.findUnique({
                where: { id: employee.salaryAssignments[0].id },
                include: {
                    structure: {
                        include: {
                            lines: {
                                include: { component: true }
                            }
                        }
                    }
                }
            });

            if (assignment?.structure?.lines) {
                for (const line of assignment.structure.lines) {
                    const code = line.component?.code?.toUpperCase();
                    const lineAmount = Number(line.amount) || (Number(line.percentage) / 100 * Number(assignment.baseSalary || 0));

                    // بدل السكن
                    if (code === 'HOUSING' || code === 'HOUSING_ALLOWANCE' || code === 'HRA') {
                        housingAllowance = lineAmount;
                    }
                    // إجمالي الراتب
                    totalSalary += lineAmount;
                }
            }
        }

        // ✅ حساب أساس بدل الإجازة بناءً على الطريقة المختارة
        let leaveAllowanceBase = baseSalary;
        switch (leaveAllowanceMethod) {
            case 'BASIC_SALARY':
                // بدل الإجازة على الراتب الأساسي فقط
                leaveAllowanceBase = baseSalary;
                break;
            case 'BASIC_PLUS_HOUSING':
                // بدل الإجازة على الراتب الأساسي + بدل السكن (نظام العمل السعودي)
                leaveAllowanceBase = baseSalary + housingAllowance;
                break;
            case 'TOTAL_SALARY':
                // بدل الإجازة على إجمالي الراتب
                leaveAllowanceBase = totalSalary;
                break;
            default:
                leaveAllowanceBase = baseSalary + housingAllowance;
        }

        const dailySalary = leaveAllowanceBase / leaveDailyRateDivisor;
        const leavePayout = remainingLeaveDays * dailySalary;

        // ========================================
        // حساب السلف المستحقة
        // ========================================
        let outstandingLoans = 0;
        for (const advance of employee.advanceRequests) {
            const approved = advance.approvedAmount || advance.amount;
            // نفترض أن كل السلف المعتمدة مستحقة (يمكن تحسين هذا لاحقاً بنظام تتبع السداد)
            outstandingLoans += Number(approved);
        }

        // ========================================
        // المبلغ النهائي
        // ========================================
        const netSettlement = adjustedEos + leavePayout - outstandingLoans;

        return {
            employeeId: employee.id,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            hireDate,
            lastWorkingDay,
            yearsOfService: years,
            monthsOfService: months,
            daysOfService: days,
            totalDaysOfService: totalDays,
            baseSalary,
            reason: dto.reason,
            eosForFirst5Years: Math.round(eosForFirst5Years * 100) / 100,
            eosForRemaining: Math.round(eosForRemaining * 100) / 100,
            totalEos: Math.round(totalEos * 100) / 100,
            eosAdjustmentFactor,
            adjustedEos: Math.round(adjustedEos * 100) / 100,
            remainingLeaveDays,
            remainingLeaveDaysOverridden,
            leavePayout: Math.round(leavePayout * 100) / 100,
            outstandingLoans: Math.round(outstandingLoans * 100) / 100,
            netSettlement: Math.round(netSettlement * 100) / 100,
        };
    }
}

