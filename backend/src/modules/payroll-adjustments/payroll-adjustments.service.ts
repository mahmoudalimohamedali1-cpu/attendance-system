import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

export enum AdjustmentType {
    WAIVE_DEDUCTION = 'WAIVE_DEDUCTION',           // إلغاء خصم
    CONVERT_TO_LEAVE = 'CONVERT_TO_LEAVE',         // تحويل لإجازة
    MANUAL_ADDITION = 'MANUAL_ADDITION',           // إضافة يدوية
    MANUAL_DEDUCTION = 'MANUAL_DEDUCTION',         // خصم يدوي
}

export enum DeductionType {
    LATE_DEDUCTION = 'LATE_DEDUCTION',
    ABSENCE_DEDUCTION = 'ABSENCE_DEDUCTION',
    EARLY_DEPARTURE = 'EARLY_DEPARTURE',
}

export interface CreateAdjustmentDto {
    payrollRunId: string;
    employeeId: string;
    adjustmentType: AdjustmentType;
    originalDeductionType?: DeductionType;
    originalAmount?: number;
    adjustedAmount: number;
    leaveDaysDeducted?: number;
    reason: string;
    notes?: string;
}

export interface ApproveAdjustmentDto {
    adjustmentId: string;
    approved: boolean;
    rejectionReason?: string;
}

@Injectable()
export class PayrollAdjustmentsService {
    private readonly logger = new Logger(PayrollAdjustmentsService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * إنشاء تسوية جديدة
     */
    async create(dto: CreateAdjustmentDto, createdById: string, companyId: string) {
        this.logger.log(`📝 Creating adjustment for employee ${dto.employeeId} in run ${dto.payrollRunId}`);

        // التحقق من أن المسيّر غير مقفل
        const payrollRun = await this.prisma.payrollRun.findUnique({
            where: { id: dto.payrollRunId },
        });

        if (!payrollRun) {
            throw new NotFoundException('مسيّر الرواتب غير موجود');
        }

        if (payrollRun.status === 'LOCKED' || payrollRun.status === 'PAID') {
            throw new BadRequestException('لا يمكن إضافة تسويات على مسيّر مقفل أو مدفوع');
        }

        // التحقق من وجود الموظف
        const employee = await this.prisma.user.findFirst({
            where: { id: dto.employeeId, companyId },
        });

        if (!employee) {
            throw new NotFoundException('الموظف غير موجود');
        }

        // إنشاء التسوية
        const adjustment = await this.prisma.payrollAdjustment.create({
            data: {
                payrollRunId: dto.payrollRunId,
                employeeId: dto.employeeId,
                companyId,
                adjustmentType: dto.adjustmentType,
                originalDeductionType: dto.originalDeductionType,
                originalAmount: dto.originalAmount || 0,
                adjustedAmount: dto.adjustedAmount,
                leaveDaysDeducted: dto.leaveDaysDeducted || 0,
                reason: dto.reason,
                notes: dto.notes,
                createdById,
                status: 'PENDING',
            },
            include: {
                employee: { select: { firstName: true, lastName: true, employeeCode: true } },
                createdBy: { select: { firstName: true, lastName: true } },
            },
        });

        this.logger.log(`✅ Adjustment created: ${adjustment.id}`);
        return adjustment;
    }

    /**
     * جلب تسويات مسيّر معين
     */
    async findByPayrollRun(payrollRunId: string, companyId: string) {
        return this.prisma.payrollAdjustment.findMany({
            where: { payrollRunId, companyId },
            include: {
                employee: { select: { firstName: true, lastName: true, employeeCode: true } },
                createdBy: { select: { firstName: true, lastName: true } },
                approvedBy: { select: { firstName: true, lastName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * جلب تسويات موظف معين
     */
    async findByEmployee(employeeId: string, companyId: string, payrollRunId?: string) {
        const where: any = { employeeId, companyId };
        if (payrollRunId) where.payrollRunId = payrollRunId;

        return this.prisma.payrollAdjustment.findMany({
            where,
            include: {
                payrollRun: { select: { id: true, runDate: true, status: true } },
                createdBy: { select: { firstName: true, lastName: true } },
                approvedBy: { select: { firstName: true, lastName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * اعتماد أو رفض تسوية
     */
    async approve(dto: ApproveAdjustmentDto, approvedById: string, companyId: string) {
        const adjustment = await this.prisma.payrollAdjustment.findFirst({
            where: { id: dto.adjustmentId, companyId },
        });

        if (!adjustment) {
            throw new NotFoundException('التسوية غير موجودة');
        }

        if (adjustment.status !== 'PENDING') {
            throw new BadRequestException('التسوية تم البت فيها مسبقاً');
        }

        if (dto.approved) {
            this.logger.log(`✅ Approving adjustment ${dto.adjustmentId}`);

            // 🔧 FIX: إذا كانت التسوية "تحويل لإجازة"، نخصم أيام الإجازة من رصيد الموظف
            if (adjustment.adjustmentType === 'CONVERT_TO_LEAVE' && adjustment.leaveDaysDeducted > 0) {
                const leaveDays = adjustment.leaveDaysDeducted;

                // التحقق من رصيد الإجازات
                const employee = await this.prisma.user.findUnique({
                    where: { id: adjustment.employeeId },
                    select: { remainingLeaveDays: true, firstName: true, lastName: true },
                });

                if (employee && employee.remainingLeaveDays < leaveDays) {
                    throw new BadRequestException(
                        `رصيد الإجازات غير كافي. الرصيد المتبقي: ${employee.remainingLeaveDays} يوم، المطلوب: ${leaveDays} يوم`
                    );
                }

                // خصم أيام الإجازة من رصيد الموظف
                await this.prisma.user.update({
                    where: { id: adjustment.employeeId },
                    data: {
                        usedLeaveDays: { increment: leaveDays },
                        remainingLeaveDays: { decrement: leaveDays },
                    },
                });

                this.logger.log(`📅 Deducted ${leaveDays} leave days from employee ${adjustment.employeeId}`);
            }

            // 🔧 تحديث الـ Payslip تلقائياً بعد اعتماد التسوية
            if (adjustment.payrollRunId) {
                const payslip = await this.prisma.payslip.findFirst({
                    where: {
                        runId: adjustment.payrollRunId,
                        employeeId: adjustment.employeeId,
                    },
                });

                if (payslip) {
                    let adjustmentAmount = 0;

                    switch (adjustment.adjustmentType) {
                        case 'WAIVE_DEDUCTION':
                        case 'CONVERT_TO_LEAVE':
                            // إلغاء خصم أو تحويل لإجازة: نضيف الفرق (المبلغ الأصلي - المعدل) للصافي
                            adjustmentAmount = Number(adjustment.originalAmount || 0) - Number(adjustment.adjustedAmount || 0);
                            break;
                        case 'MANUAL_ADDITION':
                            // إضافة يدوية: نضيف المبلغ للصافي
                            adjustmentAmount = Number(adjustment.adjustedAmount || 0);
                            break;
                        case 'MANUAL_DEDUCTION':
                            // خصم يدوي: نخصم المبلغ من الصافي
                            adjustmentAmount = -Number(adjustment.adjustedAmount || 0);
                            break;
                    }

                    if (adjustmentAmount !== 0) {
                        const newNetSalary = Number(payslip.netSalary) + adjustmentAmount;
                        const newTotalDeductions = adjustment.adjustmentType === 'MANUAL_DEDUCTION'
                            ? Number(payslip.totalDeductions) + Math.abs(adjustmentAmount)
                            : (adjustment.adjustmentType === 'WAIVE_DEDUCTION' || adjustment.adjustmentType === 'CONVERT_TO_LEAVE')
                                ? Number(payslip.totalDeductions) - adjustmentAmount
                                : Number(payslip.totalDeductions);

                        await this.prisma.payslip.update({
                            where: { id: payslip.id },
                            data: {
                                netSalary: newNetSalary,
                                totalDeductions: Math.max(0, newTotalDeductions),
                            },
                        });

                        this.logger.log(`💰 Updated payslip ${payslip.id}: netSalary adjusted by ${adjustmentAmount}`);
                    }
                }
            }

            return this.prisma.payrollAdjustment.update({
                where: { id: dto.adjustmentId },
                data: {
                    status: 'POSTED', // POSTED = معتمد في الـ enum
                    approvedById,
                    approvedAt: new Date(),
                },
            });
        } else {
            this.logger.log(`❌ Rejecting adjustment ${dto.adjustmentId}`);
            return this.prisma.payrollAdjustment.update({
                where: { id: dto.adjustmentId },
                data: {
                    status: 'CANCELLED', // CANCELLED = مرفوض في الـ enum
                    approvedById,
                    rejectedAt: new Date(),
                    rejectionReason: dto.rejectionReason,
                },
            });
        }
    }

    /**
     * حساب إجمالي التسويات المعتمدة لموظف في مسيّر
     */
    async getApprovedAdjustmentsTotal(employeeId: string, runOrPeriodId: string): Promise<{
        totalAdditions: number;
        totalDeductions: number;
        netAdjustment: number;
        waivedDeductions: number;
        leaveDaysDeducted: number;
    }> {
        const adjustments = await this.prisma.payrollAdjustment.findMany({
            where: {
                employeeId,
                OR: [
                    { payrollRunId: runOrPeriodId },
                    { payrollPeriodId: runOrPeriodId }
                ],
                status: { in: ['POSTED'] }, // POSTED = معتمد
            },
        });

        let totalAdditions = 0;
        let totalDeductions = 0;
        let waivedDeductions = 0;
        let leaveDaysDeducted = 0;

        for (const adj of adjustments) {
            // 🔧 FIX: تحويل Decimal إلى Number لضمان الحساب الصحيح
            const originalAmt = Number(adj.originalAmount) || 0;
            const adjustedAmt = Number(adj.adjustedAmount) || 0;
            const leaveDays = Number(adj.leaveDaysDeducted) || 0;

            switch (adj.adjustmentType) {
                case 'WAIVE_DEDUCTION':
                    // إلغاء خصم = إضافة للموظف
                    waivedDeductions += originalAmt;
                    totalAdditions += originalAmt;
                    break;
                case 'CONVERT_TO_LEAVE':
                    // تحويل لإجازة = إلغاء الخصم + خصم أيام إجازة
                    waivedDeductions += originalAmt;
                    totalAdditions += originalAmt;
                    leaveDaysDeducted += leaveDays;
                    break;
                case 'MANUAL_ADDITION':
                    totalAdditions += adjustedAmt;
                    break;
                case 'MANUAL_DEDUCTION':
                    totalDeductions += adjustedAmt;
                    break;
            }
        }

        return {
            totalAdditions,
            totalDeductions,
            netAdjustment: totalAdditions - totalDeductions,
            waivedDeductions,
            leaveDaysDeducted,
        };
    }

    /**
     * حذف تسوية (فقط لو PENDING)
     */
    async delete(adjustmentId: string, companyId: string) {
        const adjustment = await this.prisma.payrollAdjustment.findFirst({
            where: { id: adjustmentId, companyId },
        });

        if (!adjustment) {
            throw new NotFoundException('التسوية غير موجودة');
        }

        if (adjustment.status !== 'PENDING') {
            throw new BadRequestException('لا يمكن حذف تسوية تم البت فيها');
        }

        await this.prisma.payrollAdjustment.delete({
            where: { id: adjustmentId },
        });

        this.logger.log(`🗑️ Deleted adjustment ${adjustmentId}`);
        return { success: true };
    }

    /**
     * 🚀 إنشاء خصم/مكافأة فورية
     * لا يحتاج payrollRunId - يجد أو ينشئ المسيّر تلقائياً
     */
    async createInstant(
        dto: InstantAdjustmentDto,
        createdById: string,
        companyId: string,
    ) {
        this.logger.log(`⚡ Creating instant ${dto.type} for employee ${dto.employeeId}`);

        // التحقق من وجود الموظف
        const employee = await this.prisma.user.findFirst({
            where: { id: dto.employeeId, companyId },
            select: { id: true, firstName: true, lastName: true, employeeCode: true },
        });

        if (!employee) {
            throw new NotFoundException('الموظف غير موجود');
        }

        // تحديد الفترة الحالية
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        // 1. البحث عن أو إنشاء PayrollPeriod
        let period = await this.prisma.payrollPeriod.findFirst({
            where: {
                companyId,
                month: currentMonth,
                year: currentYear,
            },
        });

        if (!period) {
            this.logger.log(`📅 Creating new PayrollPeriod for ${currentYear}-${currentMonth}`);
            const startDate = new Date(currentYear, currentMonth - 1, 1);
            const endDate = new Date(currentYear, currentMonth, 0);
            period = await this.prisma.payrollPeriod.create({
                data: {
                    companyId,
                    month: currentMonth,
                    year: currentYear,
                    startDate,
                    endDate,
                    status: 'DRAFT',
                },
            });
        }

        this.logger.log(`🔗 Linking adjustment for period ${period.id}`);
        // 3. إنشاء التسوية
        const adjustmentType = dto.type === 'DEDUCTION' ? 'MANUAL_DEDUCTION' : 'MANUAL_ADDITION';

        try {
            const adjustment = await this.prisma.payrollAdjustment.create({
                data: {
                    adjustmentType,
                    originalAmount: 0,
                    adjustedAmount: dto.amount,
                    leaveDaysDeducted: 0,
                    value: dto.amount,
                    reason: dto.reason,
                    notes: dto.notes || `خصم/مكافأة فورية بتاريخ ${now.toLocaleDateString('ar-SA')}`,
                    status: dto.autoApprove ? 'POSTED' : 'PENDING',
                    approvedAt: dto.autoApprove ? now : null,
                    // Relations
                    payrollPeriod: { connect: { id: period.id } }, // decoupled from run
                    employee: { connect: { id: dto.employeeId } },
                    company: { connect: { id: companyId } },
                    createdBy: { connect: { id: createdById } },
                    ...(dto.autoApprove && { approvedBy: { connect: { id: createdById } } }),
                },
            });

            this.logger.log(`✅ Instant adjustment created: ${adjustment.id} (${adjustmentType}: ${dto.amount} SAR)`);

            // Fetch with relations
            const fullAdjustment = await this.prisma.payrollAdjustment.findUnique({
                where: { id: adjustment.id },
                include: {
                    employee: { select: { firstName: true, lastName: true, employeeCode: true } },
                },
            });

            return {
                success: true,
                adjustment: fullAdjustment,
                message: `تم إنشاء ${dto.type === 'DEDUCTION' ? 'الخصم' : 'المكافأة'} بنجاح وسيظهر في مسيّر ${currentMonth}/${currentYear}`,
                payrollPeriod: `${currentMonth}/${currentYear}`,
            };
        } catch (error: any) {
            this.logger.error(`❌ Failed to create adjustment: ${error.message}`);
            throw new BadRequestException(`فشل إنشاء التسوية: ${error.message}`);
        }
    }

    /**
     * 📋 جلب جميع التسويات المعلقة للشركة
     */
    async findPendingByCompany(companyId: string) {
        // جلب كل التسويات الحديثة (آخر 30 يوم) - مش بس الـ PENDING
        // عشان نعرض الـ auto-approved كمان
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        return this.prisma.payrollAdjustment.findMany({
            where: {
                companyId,
                createdAt: { gte: thirtyDaysAgo },
            },
            include: {
                employee: { select: { firstName: true, lastName: true, employeeCode: true } },
                payrollRun: {
                    include: {
                        period: { select: { month: true, year: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 50, // آخر 50 تسوية
        });
    }

    /**
     * 📊 إحصائيات التسويات للفترة الحالية
     */
    async getCurrentPeriodStats(companyId: string) {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        // البحث عن الفترة
        const period = await this.prisma.payrollPeriod.findFirst({
            where: {
                companyId,
                month: currentMonth,
                year: currentYear,
            },
        });

        if (!period) {
            return {
                period: `${currentMonth}/${currentYear}`,
                pendingCount: 0,
                approvedCount: 0,
                totalAdditions: 0,
                totalDeductions: 0,
            };
        }

        // البحث عن الـ Run
        const payrollRun = await this.prisma.payrollRun.findFirst({
            where: {
                companyId,
                periodId: period.id,
            },
        });

        if (!payrollRun) {
            return {
                period: `${currentMonth}/${currentYear}`,
                pendingCount: 0,
                approvedCount: 0,
                totalAdditions: 0,
                totalDeductions: 0,
            };
        }

        const adjustments = await this.prisma.payrollAdjustment.findMany({
            where: { payrollRunId: payrollRun.id },
        });

        let pendingCount = 0;
        let approvedCount = 0;
        let totalAdditions = 0;
        let totalDeductions = 0;

        for (const adj of adjustments) {
            if (adj.status === 'PENDING') pendingCount++;
            // 🔧 FIX: تغيير APPROVED إلى POSTED للتوافق مع دالة approve()
            if (adj.status === 'POSTED') {
                approvedCount++;
                if (adj.adjustmentType === 'MANUAL_ADDITION' || adj.adjustmentType === 'WAIVE_DEDUCTION') {
                    totalAdditions += Number(adj.adjustedAmount);
                } else if (adj.adjustmentType === 'MANUAL_DEDUCTION') {
                    totalDeductions += Number(adj.adjustedAmount);
                }
            }
        }

        return {
            period: `${currentMonth}/${currentYear}`,
            pendingCount,
            approvedCount,
            totalAdditions,
            totalDeductions,
        };
    }
}

/**
 * DTO للخصم/المكافأة الفورية
 */
export interface InstantAdjustmentDto {
    employeeId: string;
    type: 'DEDUCTION' | 'ADDITION';
    amount: number;
    reason: string;
    notes?: string;
    autoApprove?: boolean; // إذا كان المدير نفسه يعتمد تلقائياً
}

