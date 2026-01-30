import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DeductionType, DeductionApprovalStatus } from '@prisma/client';

@Injectable()
export class DeductionApprovalService {
    private readonly logger = new Logger(DeductionApprovalService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * 📋 جلب الخصومات المعلقة للاعتماد
     */
    async getPendingDeductions(companyId: string, periodId?: string) {
        this.logger.log(`📋 Getting pending deductions for company: ${companyId}`);

        const where: any = {
            companyId,
            status: DeductionApprovalStatus.PENDING,
        };

        if (periodId) {
            where.periodId = periodId;
        }

        const deductions = await this.prisma.deductionApproval.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                    },
                },
                period: {
                    select: {
                        id: true,
                        month: true,
                        year: true,
                    },
                },
            },
            orderBy: [
                { deductionType: 'asc' },
                { createdAt: 'desc' },
            ],
        });

        // تجميع حسب النوع
        const grouped = {
            ATTENDANCE: deductions.filter(d => d.deductionType === DeductionType.ATTENDANCE),
            LEAVE: deductions.filter(d => d.deductionType === DeductionType.LEAVE),
            DISCIPLINARY: deductions.filter(d => d.deductionType === DeductionType.DISCIPLINARY),
            CUSTODY: deductions.filter(d => d.deductionType === DeductionType.CUSTODY),
        };

        return {
            all: deductions,
            grouped,
            totals: {
                total: deductions.length,
                attendance: grouped.ATTENDANCE.length,
                leave: grouped.LEAVE.length,
                disciplinary: grouped.DISCIPLINARY.length,
                custody: grouped.CUSTODY.length,
                totalAmount: deductions.reduce((sum, d) => sum + Number(d.originalAmount), 0),
            },
        };
    }

    /**
     * ✅ اعتماد خصم
     */
    async approveDeduction(
        id: string,
        companyId: string,
        userId: string,
        notes?: string,
    ) {
        this.logger.log(`✅ Approving deduction: ${id}`);

        const deduction = await this.prisma.deductionApproval.findFirst({
            where: { id, companyId },
        });

        if (!deduction) {
            throw new NotFoundException('الخصم غير موجود');
        }

        if (deduction.status !== DeductionApprovalStatus.PENDING) {
            throw new BadRequestException('هذا الخصم تم اتخاذ إجراء عليه مسبقاً');
        }

        const updated = await this.prisma.$transaction(async (tx) => {
            // تحديث الخصم
            const result = await tx.deductionApproval.update({
                where: { id },
                data: {
                    status: DeductionApprovalStatus.APPROVED,
                    approvedAmount: deduction.originalAmount,
                    approvedById: userId,
                    approvedAt: new Date(),
                    notes,
                },
            });

            // إضافة سجل التدقيق
            await tx.deductionAuditLog.create({
                data: {
                    deductionId: id,
                    action: 'APPROVED',
                    previousValue: { status: 'PENDING' },
                    newValue: { status: 'APPROVED', amount: Number(deduction.originalAmount) },
                    performedById: userId,
                    notes,
                },
            });

            return result;
        });

        return {
            success: true,
            message: 'تم اعتماد الخصم بنجاح',
            deduction: updated,
        };
    }

    /**
     * ❌ رفض خصم
     */
    async rejectDeduction(
        id: string,
        companyId: string,
        userId: string,
        reason: string,
    ) {
        this.logger.log(`❌ Rejecting deduction: ${id}`);

        if (!reason || reason.trim() === '') {
            throw new BadRequestException('يجب إدخال سبب الرفض');
        }

        const deduction = await this.prisma.deductionApproval.findFirst({
            where: { id, companyId },
        });

        if (!deduction) {
            throw new NotFoundException('الخصم غير موجود');
        }

        if (deduction.status !== DeductionApprovalStatus.PENDING) {
            throw new BadRequestException('هذا الخصم تم اتخاذ إجراء عليه مسبقاً');
        }

        const updated = await this.prisma.$transaction(async (tx) => {
            const result = await tx.deductionApproval.update({
                where: { id },
                data: {
                    status: DeductionApprovalStatus.REJECTED,
                    approvedById: userId,
                    approvedAt: new Date(),
                    notes: reason,
                },
            });

            await tx.deductionAuditLog.create({
                data: {
                    deductionId: id,
                    action: 'REJECTED',
                    previousValue: { status: 'PENDING' },
                    newValue: { status: 'REJECTED', reason },
                    performedById: userId,
                    notes: reason,
                },
            });

            return result;
        });

        return {
            success: true,
            message: 'تم رفض الخصم',
            deduction: updated,
        };
    }

    /**
     * ✏️ تعديل مبلغ الخصم
     */
    async modifyDeduction(
        id: string,
        companyId: string,
        userId: string,
        newAmount: number,
        notes?: string,
    ) {
        this.logger.log(`✏️ Modifying deduction: ${id} to ${newAmount}`);

        if (newAmount < 0) {
            throw new BadRequestException('المبلغ يجب أن يكون أكبر من أو يساوي صفر');
        }

        const deduction = await this.prisma.deductionApproval.findFirst({
            where: { id, companyId },
        });

        if (!deduction) {
            throw new NotFoundException('الخصم غير موجود');
        }

        if (deduction.status !== DeductionApprovalStatus.PENDING) {
            throw new BadRequestException('هذا الخصم تم اتخاذ إجراء عليه مسبقاً');
        }

        const updated = await this.prisma.$transaction(async (tx) => {
            const result = await tx.deductionApproval.update({
                where: { id },
                data: {
                    status: DeductionApprovalStatus.MODIFIED,
                    approvedAmount: newAmount,
                    action: 'REDUCE',
                    approvedById: userId,
                    approvedAt: new Date(),
                    notes,
                },
            });

            await tx.deductionAuditLog.create({
                data: {
                    deductionId: id,
                    action: 'MODIFIED',
                    previousValue: {
                        status: 'PENDING',
                        amount: Number(deduction.originalAmount)
                    },
                    newValue: {
                        status: 'MODIFIED',
                        amount: newAmount,
                        reduction: Number(deduction.originalAmount) - newAmount,
                    },
                    performedById: userId,
                    notes,
                },
            });

            return result;
        });

        return {
            success: true,
            message: 'تم تعديل مبلغ الخصم بنجاح',
            deduction: updated,
            originalAmount: Number(deduction.originalAmount),
            newAmount,
            reduction: Number(deduction.originalAmount) - newAmount,
        };
    }

    /**
     * 🔄 تحويل الخصم لإجازة
     */
    async convertToLeave(
        id: string,
        companyId: string,
        userId: string,
        leaveType: string,
        days: number,
        notes?: string,
    ) {
        this.logger.log(`🔄 Converting deduction ${id} to leave: ${days} days of ${leaveType}`);

        if (days <= 0) {
            throw new BadRequestException('عدد الأيام يجب أن يكون أكبر من صفر');
        }

        const deduction = await this.prisma.deductionApproval.findFirst({
            where: { id, companyId },
            include: { employee: true },
        });

        if (!deduction) {
            throw new NotFoundException('الخصم غير موجود');
        }

        if (deduction.status !== DeductionApprovalStatus.PENDING) {
            throw new BadRequestException('هذا الخصم تم اتخاذ إجراء عليه مسبقاً');
        }

        // فقط خصومات الحضور يمكن تحويلها لإجازة
        if (deduction.deductionType !== DeductionType.ATTENDANCE) {
            throw new BadRequestException('فقط خصومات الحضور يمكن تحويلها لإجازة');
        }

        const updated = await this.prisma.$transaction(async (tx) => {
            const result = await tx.deductionApproval.update({
                where: { id },
                data: {
                    status: DeductionApprovalStatus.CONVERTED,
                    approvedAmount: 0, // لم يتم خصم أي مبلغ
                    action: 'CONVERT_TO_LEAVE',
                    convertedLeaveType: leaveType,
                    convertedLeaveDays: days,
                    approvedById: userId,
                    approvedAt: new Date(),
                    notes,
                },
            });

            await tx.deductionAuditLog.create({
                data: {
                    deductionId: id,
                    action: 'CONVERTED',
                    previousValue: {
                        status: 'PENDING',
                        amount: Number(deduction.originalAmount)
                    },
                    newValue: {
                        status: 'CONVERTED',
                        leaveType,
                        leaveDays: days,
                    },
                    performedById: userId,
                    notes: `تم تحويل الخصم إلى ${days} يوم إجازة من نوع ${leaveType}`,
                },
            });

            // TODO: إنشاء طلب إجازة تلقائي إذا لزم الأمر
            // يمكن إضافة هذا لاحقاً

            return result;
        });

        return {
            success: true,
            message: `تم تحويل الخصم إلى ${days} يوم إجازة بنجاح`,
            deduction: updated,
        };
    }

    /**
     * 📊 جلب سجل التدقيق للخصم
     */
    async getDeductionAuditLog(id: string, companyId: string) {
        const deduction = await this.prisma.deductionApproval.findFirst({
            where: { id, companyId },
        });

        if (!deduction) {
            throw new NotFoundException('الخصم غير موجود');
        }

        const logs = await this.prisma.deductionAuditLog.findMany({
            where: { deductionId: id },
            include: {
                performedBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: { performedAt: 'desc' },
        });

        return { deduction, logs };
    }

    /**
     * 🔄 إنشاء خصومات للاعتماد من بيانات الحضور
     * يتم استدعاؤها عند إغلاق فترة الرواتب
     */
    async createAttendanceDeductions(companyId: string, periodId: string) {
        this.logger.log(`🔄 Creating attendance deductions for period: ${periodId}`);

        const period = await this.prisma.payrollPeriod.findFirst({
            where: { id: periodId, companyId },
        });

        if (!period) {
            throw new NotFoundException('فترة الرواتب غير موجودة');
        }

        // جلب خصومات الحضور المحسوبة
        const attendanceRecords = await this.prisma.attendance.findMany({
            where: {
                companyId,
                date: {
                    gte: period.startDate,
                    lte: period.endDate,
                },
                OR: [
                    { status: 'ABSENT' },
                    { lateMinutes: { gt: 0 } },
                    { earlyDepartureMinutes: { gt: 0 } },
                ],
            },
            include: {
                employee: true,
            },
        });

        // تجميع الخصومات حسب الموظف
        const employeeDeductions = new Map<string, { amount: number; reasons: string[] }>();

        for (const record of attendanceRecords) {
            const empId = record.employeeId;
            if (!employeeDeductions.has(empId)) {
                employeeDeductions.set(empId, { amount: 0, reasons: [] });
            }

            const data = employeeDeductions.get(empId)!;

            if (record.status === 'ABSENT') {
                // TODO: حساب خصم الغياب حسب إعدادات الشركة
                data.amount += 100; // مثال
                data.reasons.push('غياب');
            }
            if (record.lateMinutes && record.lateMinutes > 0) {
                data.amount += record.lateMinutes * 0.5; // مثال
                data.reasons.push(`تأخير ${record.lateMinutes} دقيقة`);
            }
        }

        // إنشاء سجلات الاعتماد
        const created = [];
        for (const [employeeId, data] of employeeDeductions) {
            if (data.amount > 0) {
                const approval = await this.prisma.deductionApproval.create({
                    data: {
                        deductionType: DeductionType.ATTENDANCE,
                        referenceId: `${periodId}-${employeeId}`,
                        employeeId,
                        periodId,
                        originalAmount: data.amount,
                        reason: data.reasons.join('، '),
                        companyId,
                    },
                });
                created.push(approval);
            }
        }

        return {
            success: true,
            message: `تم إنشاء ${created.length} خصم للاعتماد`,
            count: created.length,
        };
    }
}
