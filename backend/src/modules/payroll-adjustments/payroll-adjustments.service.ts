import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

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
            return this.prisma.payrollAdjustment.update({
                where: { id: dto.adjustmentId },
                data: {
                    status: 'APPROVED',
                    approvedById,
                    approvedAt: new Date(),
                },
            });
        } else {
            this.logger.log(`❌ Rejecting adjustment ${dto.adjustmentId}`);
            return this.prisma.payrollAdjustment.update({
                where: { id: dto.adjustmentId },
                data: {
                    status: 'REJECTED',
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
    async getApprovedAdjustmentsTotal(employeeId: string, payrollRunId: string): Promise<{
        totalAdditions: number;
        totalDeductions: number;
        netAdjustment: number;
        waivedDeductions: number;
        leaveDaysDeducted: number;
    }> {
        const adjustments = await this.prisma.payrollAdjustment.findMany({
            where: {
                employeeId,
                payrollRunId,
                status: 'APPROVED',
            },
        });

        let totalAdditions = 0;
        let totalDeductions = 0;
        let waivedDeductions = 0;
        let leaveDaysDeducted = 0;

        for (const adj of adjustments) {
            switch (adj.adjustmentType) {
                case 'WAIVE_DEDUCTION':
                    // إلغاء خصم = إضافة للموظف
                    waivedDeductions += adj.originalAmount;
                    totalAdditions += adj.originalAmount;
                    break;
                case 'CONVERT_TO_LEAVE':
                    // تحويل لإجازة = إلغاء الخصم + خصم أيام إجازة
                    waivedDeductions += adj.originalAmount;
                    totalAdditions += adj.originalAmount;
                    leaveDaysDeducted += adj.leaveDaysDeducted;
                    break;
                case 'MANUAL_ADDITION':
                    totalAdditions += adj.adjustedAmount;
                    break;
                case 'MANUAL_DEDUCTION':
                    totalDeductions += adj.adjustedAmount;
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
}
