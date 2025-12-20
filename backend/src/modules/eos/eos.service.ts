import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CalculateEosDto, EosBreakdown, EosReason } from './dto/calculate-eos.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class EosService {
    constructor(private prisma: PrismaService) { }

    async calculateEos(userId: string, dto: CalculateEosDto): Promise<EosBreakdown> {
        const employee = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                salaryAssignments: { where: { isActive: true }, take: 1 },
                advanceRequests: { where: { status: 'APPROVED' } },
            }
        });

        if (!employee) throw new NotFoundException('الموظف غير موجود');
        if (!employee.hireDate) throw new NotFoundException('لم يتم تحديد تاريخ التعيين للموظف');

        const hireDate = new Date(employee.hireDate);
        const lastWorkingDay = new Date(dto.lastWorkingDay);

        // حساب مدة الخدمة
        const totalDays = Math.floor((lastWorkingDay.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24));
        const totalMonths = totalDays / 30.44; // متوسط أيام الشهر
        const totalYears = totalMonths / 12;

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
        // تعويض الإجازات المتبقية
        // ========================================
        const remainingLeaveDays = employee.remainingLeaveDays || 0;
        const dailySalary = baseSalary / 30;
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
            yearsOfService: Math.floor(totalYears),
            monthsOfService: Math.floor(totalMonths % 12),
            totalDaysOfService: totalDays,
            baseSalary,
            reason: dto.reason,
            eosForFirst5Years: Math.round(eosForFirst5Years * 100) / 100,
            eosForRemaining: Math.round(eosForRemaining * 100) / 100,
            totalEos: Math.round(totalEos * 100) / 100,
            eosAdjustmentFactor,
            adjustedEos: Math.round(adjustedEos * 100) / 100,
            remainingLeaveDays,
            leavePayout: Math.round(leavePayout * 100) / 100,
            outstandingLoans: Math.round(outstandingLoans * 100) / 100,
            netSettlement: Math.round(netSettlement * 100) / 100,
        };
    }
}
