import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
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

        // ✅ جلب إعدادات الرواتب لتحديد طريقة حساب نهاية الخدمة
        let payrollSettings: any = null;
        try {
            payrollSettings = await (this.prisma as any).payrollSettings?.findUnique?.({
                where: { companyId: employee.companyId },
            });
        } catch {
            // إذا لم يكن الجدول موجوداً، نستخدم الإعدادات الافتراضية
            payrollSettings = null;
        }

        const eosCalculationMethod = payrollSettings?.eosCalculationMethod || 'SAUDI_LABOR_LAW';

        // ========================================
        // حساب مكافأة نهاية الخدمة (بناءً على طريقة الحساب)
        // ========================================
        let eosForFirst5Years = 0;
        let eosForRemaining = 0;

        switch (eosCalculationMethod) {
            case 'SAUDI_LABOR_LAW':
                // نظام العمل السعودي: نصف شهر لأول 5 سنوات، شهر كامل بعدها
                if (totalYears <= 5) {
                    eosForFirst5Years = totalYears * (baseSalary * 0.5);
                } else {
                    eosForFirst5Years = 5 * (baseSalary * 0.5);
                    eosForRemaining = (totalYears - 5) * baseSalary;
                }
                break;

            case 'CUSTOM':
                // طريقة مخصصة: يمكن تحديد نسب مختلفة من الإعدادات
                const customFirstYearsRate = payrollSettings?.eosFirstYearsRate || 0.5; // نصف شهر
                const customLaterYearsRate = payrollSettings?.eosLaterYearsRate || 1.0; // شهر كامل
                const customThresholdYears = payrollSettings?.eosThresholdYears || 5;

                if (totalYears <= customThresholdYears) {
                    eosForFirst5Years = totalYears * (baseSalary * customFirstYearsRate);
                } else {
                    eosForFirst5Years = customThresholdYears * (baseSalary * customFirstYearsRate);
                    eosForRemaining = (totalYears - customThresholdYears) * (baseSalary * customLaterYearsRate);
                }
                break;

            case 'CONTRACTUAL':
                // حسب العقد: مبلغ ثابت أو نسبة من الراتب لكل سنة
                const contractualRate = payrollSettings?.eosContractualRate || 1.0; // شهر كامل لكل سنة
                eosForFirst5Years = totalYears * (baseSalary * contractualRate);
                eosForRemaining = 0; // لا يوجد تفرقة في الطريقة التعاقدية
                break;

            default:
                // الافتراضي: نظام العمل السعودي
                if (totalYears <= 5) {
                    eosForFirst5Years = totalYears * (baseSalary * 0.5);
                } else {
                    eosForFirst5Years = 5 * (baseSalary * 0.5);
                    eosForRemaining = (totalYears - 5) * baseSalary;
                }
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

        // ✅ استخدام payrollSettings المُعلن مسبقاً لتحديد قاعدة حساب بدل الإجازة
        const leaveAllowanceMethod = payrollSettings?.leaveAllowanceMethod || 'BASIC_PLUS_HOUSING';
        const leaveDailyRateDivisor = payrollSettings?.leaveDailyRateDivisor || 30;

        // حساب بدل السكن (إن وجد) من هيكل الراتب
        let housingAllowance = 0;
        let transportationAllowance = 0;
        let phoneAllowance = 0;
        let otherFixedAllowances = 0;
        let totalSalary = baseSalary;

        if (employee.salaryAssignments[0]) {
            try {
                const assignment = await (this.prisma as any).salaryAssignment?.findUnique?.({
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
                        const code = line.component?.code?.toUpperCase() || '';
                        const lineAmount = Number(line.amount) || (Number(line.percentage) / 100 * Number(assignment.baseSalary || 0));

                        // بدل السكن
                        if (code === 'HOUSING' || code === 'HOUSING_ALLOWANCE' || code === 'HRA') {
                            housingAllowance = lineAmount;
                        }
                        // بدل المواصلات
                        else if (code === 'TRANSPORT' || code === 'TRANSPORTATION' || code === 'TRAVEL' || code === 'TRA') {
                            transportationAllowance = lineAmount;
                        }
                        // بدل الهاتف
                        else if (code === 'PHONE' || code === 'MOBILE' || code === 'COMMUNICATION') {
                            phoneAllowance = lineAmount;
                        }
                        // بدلات ثابتة أخرى
                        else if (line.component?.componentType === 'ALLOWANCE' && !line.component?.isVariable) {
                            otherFixedAllowances += lineAmount;
                        }

                        // إجمالي الراتب
                        totalSalary += lineAmount;
                    }
                }
            } catch {
                // إذا فشل الاستعلام، نستخدم الراتب الأساسي فقط
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
        // 🆕 حساب العهد غير المرجعة (Unreturned Custody)
        // ========================================
        let unreturnedCustodyValue = 0;
        let custodyItems: { id: string; name: string; code: string; value: number; returned: boolean }[] = [];
        try {
            const unreturnedCustody = await (this.prisma as any).custodyAssignment?.findMany?.({
                where: {
                    employeeId: userId,
                    status: { in: ['ASSIGNED', 'PENDING', 'APPROVED', 'DELIVERED'] },
                    actualReturn: null,
                },
                include: { custodyItem: true },
            }) || [];
            for (const custody of unreturnedCustody) {
                const itemValue = Number(custody.custodyItem?.purchasePrice) || 0;
                unreturnedCustodyValue += itemValue;
                custodyItems.push({
                    id: custody.id,
                    name: custody.custodyItem?.name || 'عهدة غير معروفة',
                    code: custody.custodyItem?.code || '',
                    value: itemValue,
                    returned: false,
                });
            }
        } catch {
            // جدول العهد غير موجود - تجاهل
        }

        // ========================================
        // 🆕 حساب الديون من EmployeeDebtLedger
        // ========================================
        let outstandingDebts = 0;
        try {
            const activeDebts = await (this.prisma as any).employeeDebtLedger?.findMany?.({
                where: {
                    employeeId: userId,
                    status: 'ACTIVE',
                },
            }) || [];
            for (const debt of activeDebts) {
                outstandingDebts += Number(debt.remainingBalance) || 0;
            }
        } catch {
            // جدول الديون غير موجود - تجاهل
        }

        // ========================================
        // 🆕 حساب الجزاءات غير المسددة (Unpaid Deductions)
        // ========================================
        let unpaidPenalties = 0;
        try {
            const disciplinaryCases = await (this.prisma as any).disciplinaryCase?.findMany?.({
                where: {
                    employeeId: userId,
                    status: 'DECISION_ISSUED',
                    decisionType: { in: ['SALARY_DEDUCTION', 'SALARY_SUSPENSION'] },
                },
            }) || [];
            for (const caseItem of disciplinaryCases) {
                // إذا كان خصم من الراتب
                unpaidPenalties += Number(caseItem.deductionAmount) || 0;
            }
        } catch {
            // جدول الجزاءات غير موجود - تجاهل
        }

        // ========================================
        // إجمالي الخصومات
        // ========================================
        const totalDeductions = outstandingLoans + unreturnedCustodyValue + outstandingDebts + unpaidPenalties;

        // ========================================
        // المبلغ النهائي
        // ========================================
        const netSettlement = adjustedEos + leavePayout - totalDeductions;

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
            // 🆕 البدلات الثابتة
            housingAllowance: Math.round(housingAllowance * 100) / 100,
            transportationAllowance: Math.round(transportationAllowance * 100) / 100,
            phoneAllowance: Math.round(phoneAllowance * 100) / 100,
            otherFixedAllowances: Math.round(otherFixedAllowances * 100) / 100,
            totalSalary: Math.round(totalSalary * 100) / 100,
            reason: dto.reason,
            eosForFirst5Years: Math.round(eosForFirst5Years * 100) / 100,
            eosForRemaining: Math.round(eosForRemaining * 100) / 100,
            totalEos: Math.round(totalEos * 100) / 100,
            eosAdjustmentFactor,
            adjustedEos: Math.round(adjustedEos * 100) / 100,
            remainingLeaveDays,
            remainingLeaveDaysOverridden,
            leavePayout: Math.round(leavePayout * 100) / 100,
            // 🆕 الخصومات التفصيلية
            outstandingLoans: Math.round(outstandingLoans * 100) / 100,
            unreturnedCustodyValue: Math.round(unreturnedCustodyValue * 100) / 100,
            custodyItems, // 🆕 قائمة العهد للتحكم فيها من الواجهة
            outstandingDebts: Math.round(outstandingDebts * 100) / 100,
            unpaidPenalties: Math.round(unpaidPenalties * 100) / 100,
            totalDeductions: Math.round(totalDeductions * 100) / 100,
            netSettlement: Math.round(netSettlement * 100) / 100,
        };
    }

    /**
     * تأكيد إنهاء خدمات موظف وإنشاء سجل التسوية
     */
    async terminateEmployee(userId: string, dto: CalculateEosDto, createdById: string, companyId: string) {
        // 1. حساب التسوية
        const calculation = await this.calculateEos(userId, dto);

        // 2. إنشاء سجل التسوية
        const termination = await this.prisma.employeeTermination.create({
            data: {
                employeeId: userId,
                companyId,
                reason: dto.reason as any,
                lastWorkingDay: new Date(dto.lastWorkingDay),
                baseSalary: calculation.baseSalary,
                yearsOfService: calculation.yearsOfService + (calculation.monthsOfService / 12) + (calculation.daysOfService / 365),
                totalEos: calculation.totalEos,
                adjustedEos: calculation.adjustedEos,
                leavePayout: calculation.leavePayout,
                remainingLeave: calculation.remainingLeaveDays,
                outstandingLoans: calculation.outstandingLoans,
                netSettlement: calculation.netSettlement,
                status: 'PENDING',
                createdById,
                calculationJson: calculation as any,
                notes: dto.notes,
            },
            include: {
                employee: { select: { firstName: true, lastName: true, employeeCode: true } },
            },
        });

        return {
            termination,
            calculation,
            message: 'تم إنشاء طلب إنهاء الخدمات بنجاح',
        };
    }

    /**
     * الموافقة على طلب إنهاء الخدمات
     * المستوى 1: HR يوافق (PENDING → HR_APPROVED)
     * المستوى 2: المدير العام يوافق (HR_APPROVED → APPROVED)
     */
    async approveTermination(terminationId: string, approvedById: string, companyId: string) {
        const termination = await this.prisma.employeeTermination.findFirst({
            where: {
                id: terminationId,
                companyId,
                status: { in: ['PENDING', 'HR_APPROVED'] as any }
            },
            include: { employee: true },
        });

        if (!termination) {
            throw new NotFoundException('طلب التسوية غير موجود أو تمت معالجته مسبقاً');
        }

        // Get approver info
        const approver = await this.prisma.user.findUnique({
            where: { id: approvedById },
            select: { role: true, firstName: true, lastName: true },
        });

        const currentStatus = (termination as any).status;

        // Determine new status based on current status and approver role
        let newStatus: string;
        let updateData: any = {};

        if (currentStatus === 'PENDING') {
            // First approval by HR
            newStatus = 'HR_APPROVED';
            updateData = {
                status: newStatus,
                hrApprovedById: approvedById,
                hrApprovedAt: new Date(),
            };
        } else if (currentStatus === 'HR_APPROVED') {
            // Second approval by GM/Admin
            if (approver?.role !== 'ADMIN') {
                throw new ForbiddenException('يجب أن يوافق المدير العام على هذا الطلب');
            }
            newStatus = 'APPROVED';
            updateData = {
                status: newStatus,
                gmApprovedById: approvedById,
                gmApprovedAt: new Date(),
                approvedById,
                approvedAt: new Date(),
            };
        } else {
            throw new BadRequestException('حالة الطلب غير صالحة للموافقة');
        }

        // If final approval, also update employee status
        if (newStatus === 'APPROVED') {
            const result = await this.prisma.$transaction(async (tx) => {
                const updated = await tx.employeeTermination.update({
                    where: { id: terminationId },
                    data: updateData,
                    include: {
                        employee: { select: { firstName: true, lastName: true, employeeCode: true } },
                    },
                });

                // تغيير حالة الموظف إلى TERMINATED
                await tx.user.update({
                    where: { id: termination.employeeId },
                    data: { status: 'TERMINATED' },
                });

                return updated;
            });

            return {
                termination: result,
                message: '✅ تم اعتماد إنهاء الخدمات نهائياً من المدير العام وتغيير حالة الموظف إلى منتهي الخدمة',
            };
        } else {
            // HR approval only
            const updated = await this.prisma.employeeTermination.update({
                where: { id: terminationId },
                data: updateData,
                include: {
                    employee: { select: { firstName: true, lastName: true, employeeCode: true } },
                },
            });

            return {
                termination: updated,
                message: '✅ تمت موافقة HR بنجاح. الطلب الآن بانتظار موافقة المدير العام.',
            };
        }
    }

    /**
     * تحديث حالة التسوية إلى مدفوع بعد صرفها في مسير الرواتب
     */
    async markAsPaid(terminationId: string, payslipId: string) {
        return this.prisma.employeeTermination.update({
            where: { id: terminationId },
            data: {
                status: 'PAID',
                payslipId,
                paidAt: new Date(),
            },
        });
    }

    /**
     * جلب قائمة طلبات إنهاء الخدمات
     */
    async getTerminations(companyId: string, status?: string) {
        const where: any = { companyId };
        if (status) {
            where.status = status;
        }

        return this.prisma.employeeTermination.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        email: true,
                        hireDate: true,
                    },
                },
                createdBy: { select: { firstName: true, lastName: true } },
                approvedBy: { select: { firstName: true, lastName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * جلب تسوية محددة
     */
    async getTerminationById(id: string, companyId: string) {
        const termination = await this.prisma.employeeTermination.findFirst({
            where: { id, companyId },
            include: {
                employee: true,
                createdBy: { select: { firstName: true, lastName: true } },
                approvedBy: { select: { firstName: true, lastName: true } },
                payslip: true,
            },
        });

        if (!termination) {
            throw new NotFoundException('التسوية غير موجودة');
        }

        return termination;
    }

    /**
     * إلغاء طلب إنهاء الخدمات
     */
    async cancelTermination(terminationId: string, companyId: string) {
        const termination = await this.prisma.employeeTermination.findFirst({
            where: { id: terminationId, companyId, status: 'PENDING' },
        });

        if (!termination) {
            throw new NotFoundException('الطلب غير موجود أو لا يمكن إلغاؤه');
        }

        return this.prisma.employeeTermination.update({
            where: { id: terminationId },
            data: { status: 'CANCELLED' },
        });
    }

    /**
     * جلب التسويات المعتمدة للفترة (لإضافتها للـ payroll)
     */
    async getApprovedTerminationsForPeriod(companyId: string, periodStartDate: Date, periodEndDate: Date) {
        return this.prisma.employeeTermination.findMany({
            where: {
                companyId,
                status: 'APPROVED',
                lastWorkingDay: {
                    gte: periodStartDate,
                    lte: periodEndDate,
                },
            },
            include: {
                employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
            },
        });
    }
}
