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

                        // تحديث ملخص الـ Payslip
                        await this.prisma.payslip.update({
                            where: { id: payslip.id },
                            data: {
                                netSalary: newNetSalary,
                                totalDeductions: Math.max(0, newTotalDeductions),
                            },
                        });

                        // 🔧 إضافة PayslipLine جديد لعرض التسوية في التفاصيل
                        const sign = adjustmentAmount > 0 ? 'EARNING' : 'DEDUCTION';
                        const descriptionAr = adjustment.adjustmentType === 'WAIVE_DEDUCTION'
                            ? `تسوية: إلغاء خصم (${adjustment.reason || ''})`
                            : adjustment.adjustmentType === 'CONVERT_TO_LEAVE'
                                ? `تسوية: تحويل لإجازة (${adjustment.leaveDaysDeducted} يوم)`
                                : adjustment.adjustmentType === 'MANUAL_ADDITION'
                                    ? `تسوية: إضافة يدوية (${adjustment.reason || ''})`
                                    : `تسوية: خصم يدوي (${adjustment.reason || ''})`;

                        // 🔧 الحصول على أو إنشاء مكوّن التسوية
                        const componentCode = sign === 'EARNING' ? 'ADJ_ADD' : 'ADJ_DED';
                        const componentName = sign === 'EARNING' ? 'تسوية إضافة' : 'تسوية خصم';
                        let adjustmentComponent = await this.prisma.salaryComponent.findFirst({
                            where: { code: componentCode, companyId },
                        });
                        if (!adjustmentComponent) {
                            adjustmentComponent = await this.prisma.salaryComponent.create({
                                data: {
                                    code: componentCode,
                                    nameAr: componentName,
                                    type: sign === 'EARNING' ? 'EARNING' : 'DEDUCTION',
                                    nature: 'VARIABLE',
                                    companyId,
                                } as any,
                            });
                        }

                        await this.prisma.payslipLine.create({
                            data: {
                                payslipId: payslip.id,
                                componentId: adjustmentComponent.id,
                                amount: Math.abs(adjustmentAmount),
                                sign,
                                sourceType: 'ADJUSTMENT' as any,
                                descriptionAr,
                                sourceRef: `ADJ-${dto.adjustmentId}`,
                            },
                        });

                        this.logger.log(`💰 Updated payslip ${payslip.id}: netSalary adjusted by ${adjustmentAmount}, added PayslipLine`);
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
                    status: 'REJECTED', // REJECTED = مرفوض في الـ enum
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

    /**
     * 📊 جلب معاينة خصومات الحضور للفترة الحالية
     * يعرض خصومات التأخير والغياب والخروج المبكر لكل موظف
     */
    async getAttendanceDeductionsPreview(companyId: string, periodId?: string) {
        this.logger.log(`📊 Getting attendance deductions preview for company: ${companyId}`);

        // جلب الفترة الحالية أو المحددة
        let period: any;
        if (periodId) {
            period = await this.prisma.payrollPeriod.findFirst({
                where: { id: periodId, companyId },
            });
        } else {
            // جلب آخر فترة نشطة (غير مغلقة أو ملغية أو مؤرشفة)
            period = await this.prisma.payrollPeriod.findFirst({
                where: {
                    companyId,
                    status: {
                        in: ['DRAFT', 'INPUTS_COLLECTED', 'CALCULATED', 'HR_REVIEWED', 'FINANCE_APPROVED']
                    }
                },
                orderBy: { startDate: 'desc' },
            });
        }

        if (!period) {
            return {
                period: null,
                employees: [],
                totals: { lateDeduction: 0, absenceDeduction: 0, earlyDeduction: 0, total: 0 },
            };
        }

        // جلب بيانات الحضور للفترة
        const employees = await this.prisma.user.findMany({
            where: {
                companyId,
                status: 'ACTIVE',
                role: { in: ['EMPLOYEE', 'MANAGER', 'SUPERVISOR'] },
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
                salary: true,
            },
        });

        const attendanceDeductions: any[] = [];
        let totalLate = 0, totalAbsence = 0, totalEarly = 0;

        // حساب أيام العمل في الفترة (استبعاد الجمعة افتراضياً)
        const getWorkingDays = (startDate: Date, endDate: Date): Date[] => {
            const days: Date[] = [];
            const current = new Date(startDate);
            const end = new Date(endDate);
            // التأكد من عدم تجاوز اليوم الحالي
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            const effectiveEnd = end > today ? today : end;

            while (current <= effectiveEnd) {
                const dayOfWeek = current.getDay();
                // استبعاد الجمعة (5) - يمكن تعديلها حسب إعدادات الشركة
                if (dayOfWeek !== 5) {
                    days.push(new Date(current));
                }
                current.setDate(current.getDate() + 1);
            }
            return days;
        };

        const workingDays = getWorkingDays(period.startDate, period.endDate);
        this.logger.log(`📅 Working days in period: ${workingDays.length}`);

        for (const emp of employees) {
            // جلب سجلات الحضور للفترة
            const attendances = await this.prisma.attendance.findMany({
                where: {
                    userId: emp.id,
                    companyId,
                    date: {
                        gte: period.startDate,
                        lte: period.endDate,
                    },
                },
            });

            // جلب طلبات الإجازة المعتمدة للفترة
            const approvedLeaves = await this.prisma.leaveRequest.findMany({
                where: {
                    userId: emp.id,
                    status: 'APPROVED',
                    OR: [
                        {
                            startDate: { lte: period.endDate },
                            endDate: { gte: period.startDate },
                        },
                    ],
                },
            });

            // تحويل سجلات الحضور لـ Set من التواريخ
            const attendanceDates = new Set(
                attendances.map(a => new Date(a.date).toDateString())
            );

            // تحويل أيام الإجازة لـ Set من التواريخ
            const leaveDates = new Set<string>();
            for (const leave of approvedLeaves) {
                const leaveStart = new Date(leave.startDate);
                const leaveEnd = new Date(leave.endDate);
                const current = new Date(leaveStart);
                while (current <= leaveEnd) {
                    leaveDates.add(current.toDateString());
                    current.setDate(current.getDate() + 1);
                }
            }

            // حساب الغياب الحقيقي = أيام عمل بدون حضور وبدون إجازة
            let realAbsentDays = 0;
            const absentDates: string[] = [];
            for (const workDay of workingDays) {
                const dateStr = workDay.toDateString();
                if (!attendanceDates.has(dateStr) && !leaveDates.has(dateStr)) {
                    realAbsentDays++;
                    absentDates.push(dateStr);
                }
            }

            // حساب التأخير والخروج المبكر من السجلات الموجودة
            let lateMinutes = 0, earlyMinutes = 0;
            for (const att of attendances) {
                if (att.lateMinutes) lateMinutes += att.lateMinutes;
                if ((att as any).earlyDepartureMinutes) earlyMinutes += (att as any).earlyDepartureMinutes;
            }

            // حساب الخصومات (تقريبي - يعتمد على إعدادات الشركة)
            const dailyRate = Number(emp.salary || 0) / 30;
            const hourlyRate = dailyRate / 8;

            const lateDeduction = Math.round((lateMinutes / 60) * hourlyRate * 100) / 100;
            const absenceDeduction = Math.round(realAbsentDays * dailyRate * 100) / 100;
            const earlyDeduction = Math.round((earlyMinutes / 60) * hourlyRate * 100) / 100;
            const totalDeduction = lateDeduction + absenceDeduction + earlyDeduction;

            if (totalDeduction > 0) {
                attendanceDeductions.push({
                    employeeId: emp.id,
                    employeeName: `${emp.firstName} ${emp.lastName}`,
                    employeeCode: emp.employeeCode,
                    lateMinutes,
                    lateDeduction,
                    absentDays: realAbsentDays,
                    absentDates, // قائمة تواريخ الغياب للتوضيح
                    absenceDeduction,
                    earlyMinutes,
                    earlyDeduction,
                    totalDeduction,
                    status: 'PENDING_APPROVAL',
                });

                totalLate += lateDeduction;
                totalAbsence += absenceDeduction;
                totalEarly += earlyDeduction;
            }
        }

        return {
            period: {
                id: period.id,
                month: period.month,
                year: period.year,
                startDate: period.startDate,
                endDate: period.endDate,
            },
            employees: attendanceDeductions,
            totals: {
                lateDeduction: totalLate,
                absenceDeduction: totalAbsence,
                earlyDeduction: totalEarly,
                total: totalLate + totalAbsence + totalEarly,
            },
        };
    }

    /**
     * 💰 جلب معاينة أقساط السلف المستحقة للفترة الحالية
     */
    async getAdvanceDeductionsPreview(companyId: string, periodId?: string) {
        this.logger.log(`💰 Getting advance deductions preview for company: ${companyId}`);

        // جلب الفترة الحالية
        let period: any;
        if (periodId) {
            period = await this.prisma.payrollPeriod.findFirst({
                where: { id: periodId, companyId },
            });
        } else {
            period = await this.prisma.payrollPeriod.findFirst({
                where: { companyId, status: { in: ['DRAFT', 'INPUTS_COLLECTED', 'CALCULATED', 'HR_REVIEWED', 'FINANCE_APPROVED'] } },
                orderBy: { startDate: 'desc' },
            });
        }

        if (!period) {
            return {
                period: null,
                advances: [],
                totals: { totalInstallments: 0, count: 0 },
            };
        }

        // جلب السلف النشطة التي عليها أقساط مستحقة
        const advances = await this.prisma.advance.findMany({
            where: {
                companyId,
                status: 'APPROVED',
                remainingAmount: { gt: 0 },
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                    },
                },
            },
        });

        const advanceDeductions = advances.map((adv: any) => ({
            employeeId: adv.employee?.id,
            employeeName: `${adv.employee?.firstName} ${adv.employee?.lastName}`,
            employeeCode: adv.employee?.employeeCode,
            advanceId: adv.id,
            advanceCode: adv.code || `ADV-${adv.id.slice(0, 8)}`,
            originalAmount: Number(adv.amount),
            remainingAmount: Number(adv.remainingAmount),
            monthlyInstallment: Number(adv.monthlyInstallment || adv.installmentAmount || 0),
            status: 'PENDING_APPROVAL',
        }));

        const totalInstallments = advanceDeductions.reduce(
            (sum: number, a: any) => sum + a.monthlyInstallment,
            0
        );

        return {
            period: period ? {
                id: period.id,
                month: period.month,
                year: period.year,
            } : null,
            advances: advanceDeductions,
            totals: {
                totalInstallments,
                count: advanceDeductions.length,
            },
        };
    }

    /**
     * 🏥 جلب معاينة خصومات الإجازات للفترة الحالية
     * يشمل: إجازة مرضية (بدون أجر / جزئي) + إجازة بدون راتب
     */
    async getLeaveDeductionsPreview(companyId: string, periodId?: string) {
        this.logger.log(`🏥 Getting leave deductions preview for company: ${companyId}`);

        // جلب الفترة الحالية
        let period: any;
        if (periodId) {
            period = await this.prisma.payrollPeriod.findFirst({
                where: { id: periodId, companyId },
            });
        } else {
            period = await this.prisma.payrollPeriod.findFirst({
                where: { companyId, status: { in: ['DRAFT', 'INPUTS_COLLECTED', 'CALCULATED', 'HR_REVIEWED', 'FINANCE_APPROVED'] } },
                orderBy: { startDate: 'desc' },
            });
        }

        if (!period) {
            return {
                period: null,
                leaveDeductions: [],
                totals: { totalSickDeduction: 0, totalUnpaidDeduction: 0, totalAmount: 0, count: 0 },
            };
        }

        const startDate = new Date(period.startDate);
        const endDate = new Date(period.endDate);

        // جلب الإجازات المعتمدة في هذه الفترة
        const leaves = await this.prisma.leaveRequest.findMany({
            where: {
                companyId,
                status: 'APPROVED',
                type: { in: ['SICK', 'UNPAID'] },
                startDate: { lte: endDate },
                endDate: { gte: startDate },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        baseSalary: true,
                    },
                },
            },
        });

        const leaveDeductions = [];
        let totalSickDeduction = 0;
        let totalUnpaidDeduction = 0;

        for (const leave of leaves) {
            const user = leave.user;
            if (!user) continue;

            const baseSalary = Number(user.baseSalary || 0);
            const dailyRate = baseSalary / 30;

            const sickUnpaid = Number((leave as any).unpaidDays || 0);
            const sickPartial = Number((leave as any).partialPayDays || 0);
            const totalDays = Number((leave as any).totalDays || leave.days || 0);

            let deductionAmount = 0;
            let deductionType = '';
            let deductionDetails = '';

            if (leave.type === 'SICK') {
                // خصم الإجازة المرضية
                if (sickUnpaid > 0) {
                    deductionAmount += sickUnpaid * dailyRate;
                    deductionDetails += `${sickUnpaid} يوم بدون أجر`;
                }
                if (sickPartial > 0) {
                    deductionAmount += (sickPartial * dailyRate * 0.25); // خصم 25% (أجر 75%)
                    deductionDetails += deductionDetails ? ` + ${sickPartial} يوم (75% أجر)` : `${sickPartial} يوم (75% أجر)`;
                }
                deductionType = 'SICK_LEAVE';
                totalSickDeduction += deductionAmount;
            } else if (leave.type === 'UNPAID') {
                // خصم الإجازة بدون راتب
                deductionAmount = totalDays * dailyRate;
                deductionType = 'UNPAID_LEAVE';
                deductionDetails = `${totalDays} يوم بدون راتب`;
                totalUnpaidDeduction += deductionAmount;
            }

            if (deductionAmount > 0) {
                leaveDeductions.push({
                    employeeId: user.id,
                    employeeName: `${user.firstName} ${user.lastName}`,
                    employeeCode: user.employeeCode,
                    leaveId: leave.id,
                    leaveType: leave.type,
                    deductionType,
                    startDate: leave.startDate,
                    endDate: leave.endDate,
                    totalDays,
                    deductionAmount: Math.round(deductionAmount * 100) / 100,
                    deductionDetails,
                    status: 'CALCULATED',
                });
            }
        }

        return {
            period: period ? {
                id: period.id,
                month: period.month,
                year: period.year,
            } : null,
            leaveDeductions,
            totals: {
                totalSickDeduction: Math.round(totalSickDeduction * 100) / 100,
                totalUnpaidDeduction: Math.round(totalUnpaidDeduction * 100) / 100,
                totalAmount: Math.round((totalSickDeduction + totalUnpaidDeduction) * 100) / 100,
                count: leaveDeductions.length,
            },
        };
    }

    /**
     * 🏛️ جلب معاينة التأمينات الاجتماعية (GOSI) للفترة الحالية
     * للمعلومات فقط - غير قابل للتعديل
     */
    async getGosiPreview(companyId: string, periodId?: string) {
        this.logger.log(`🏛️ Getting GOSI preview for company: ${companyId}`);

        // جلب الفترة الحالية
        let period: any;
        if (periodId) {
            period = await this.prisma.payrollPeriod.findFirst({
                where: { id: periodId, companyId },
            });
        } else {
            period = await this.prisma.payrollPeriod.findFirst({
                where: { companyId, status: { in: ['DRAFT', 'INPUTS_COLLECTED', 'CALCULATED', 'HR_REVIEWED', 'FINANCE_APPROVED'] } },
                orderBy: { startDate: 'desc' },
            });
        }

        if (!period) {
            return {
                period: null,
                gosiDeductions: [],
                totals: { totalEmployeeShare: 0, totalEmployerShare: 0, totalGosi: 0, count: 0 },
            };
        }

        // جلب إعدادات GOSI للشركة
        const gosiConfig = await (this.prisma as any).gosiConfig?.findFirst?.({
            where: { companyId, isActive: true },
        });

        const employeeRate = Number(gosiConfig?.employeeRate || 9.75) / 100;
        const employerRate = Number(gosiConfig?.employerRate || 11.75) / 100;

        // جلب الموظفين النشطين
        const employees = await this.prisma.user.findMany({
            where: {
                companyId,
                status: 'ACTIVE',
                role: { not: 'ADMIN' },
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
                baseSalary: true,
                housingAllowance: true,
            },
        });

        const gosiDeductions = [];
        let totalEmployeeShare = 0;
        let totalEmployerShare = 0;

        for (const emp of employees) {
            const baseSalary = Number(emp.baseSalary || 0);
            const housingAllowance = Number(emp.housingAllowance || 0);
            const gosiBase = Math.min(baseSalary + housingAllowance, 45000); // الحد الأقصى 45,000

            const employeeShare = gosiBase * employeeRate;
            const employerShare = gosiBase * employerRate;

            if (employeeShare > 0) {
                gosiDeductions.push({
                    employeeId: emp.id,
                    employeeName: `${emp.firstName} ${emp.lastName}`,
                    employeeCode: emp.employeeCode,
                    gosiBase: Math.round(gosiBase * 100) / 100,
                    employeeShare: Math.round(employeeShare * 100) / 100,
                    employerShare: Math.round(employerShare * 100) / 100,
                    employeeRate: employeeRate * 100,
                    employerRate: employerRate * 100,
                    status: 'CALCULATED',
                });

                totalEmployeeShare += employeeShare;
                totalEmployerShare += employerShare;
            }
        }

        return {
            period: period ? {
                id: period.id,
                month: period.month,
                year: period.year,
            } : null,
            gosiDeductions,
            gosiConfig: gosiConfig ? {
                employeeRate: employeeRate * 100,
                employerRate: employerRate * 100,
            } : null,
            totals: {
                totalEmployeeShare: Math.round(totalEmployeeShare * 100) / 100,
                totalEmployerShare: Math.round(totalEmployerShare * 100) / 100,
                totalGosi: Math.round((totalEmployeeShare + totalEmployerShare) * 100) / 100,
                count: gosiDeductions.length,
            },
        };
    }

    // ==================== إجراءات اعتماد الخصومات ====================

    /**
     * ❌ إلغاء خصم حضور (رفض الخصم كلياً)
     * ينشئ PayrollAdjustment من نوع WAIVE_DEDUCTION
     */
    async waiveDeduction(dto: WaiveDeductionDto, userId: string, companyId: string) {
        this.logger.log(`❌ Waiving ${dto.deductionType} deduction for employee: ${dto.employeeId}`);

        // التحقق من الموظف
        const employee = await this.prisma.user.findFirst({
            where: { id: dto.employeeId, companyId },
            select: { id: true, firstName: true, lastName: true, employeeCode: true },
        });

        if (!employee) {
            throw new NotFoundException('الموظف غير موجود');
        }

        // جلب أو إنشاء الفترة الحالية
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        let period = dto.periodId
            ? await this.prisma.payrollPeriod.findFirst({ where: { id: dto.periodId, companyId } })
            : await this.prisma.payrollPeriod.findFirst({
                where: { companyId, month: currentMonth, year: currentYear },
            });

        if (!period) {
            period = await this.prisma.payrollPeriod.create({
                data: {
                    companyId,
                    month: currentMonth,
                    year: currentYear,
                    startDate: new Date(currentYear, currentMonth - 1, 1),
                    endDate: new Date(currentYear, currentMonth, 0),
                    status: 'DRAFT',
                },
            });
        }

        // إنشاء التسوية (إلغاء كامل للخصم)
        const adjustment = await this.prisma.payrollAdjustment.create({
            data: {
                adjustmentType: 'WAIVE_DEDUCTION',
                originalDeductionType: dto.deductionType === 'LATE' ? 'LATE_DEDUCTION' :
                    dto.deductionType === 'ABSENCE' ? 'ABSENCE_DEDUCTION' : 'EARLY_DEPARTURE',
                originalAmount: dto.originalAmount,
                adjustedAmount: 0, // تم إلغاء الخصم بالكامل
                leaveDaysDeducted: 0,
                value: dto.originalAmount, // مبلغ الإلغاء
                reason: dto.reason,
                notes: `إلغاء خصم ${dto.deductionType} بمبلغ ${dto.originalAmount} ر.س`,
                status: 'POSTED', // معتمد تلقائياً
                approvedAt: now,
                payrollPeriod: { connect: { id: period.id } },
                employee: { connect: { id: dto.employeeId } },
                company: { connect: { id: companyId } },
                createdBy: { connect: { id: userId } },
                approvedBy: { connect: { id: userId } },
            },
        });

        this.logger.log(`✅ Created waive adjustment: ${adjustment.id}`);

        return {
            success: true,
            message: `تم إلغاء خصم ${dto.deductionType} بنجاح`,
            adjustment,
            employee: `${employee.firstName} ${employee.lastName}`,
            waivedAmount: dto.originalAmount,
        };
    }

    /**
     * ✏️ تعديل مبلغ الخصم (تخفيض جزئي)
     * ينشئ PayrollAdjustment من نوع WAIVE_DEDUCTION بالفرق
     */
    async modifyDeduction(dto: ModifyDeductionDto, userId: string, companyId: string) {
        this.logger.log(`✏️ Modifying ${dto.deductionType} deduction for employee: ${dto.employeeId}`);

        if (dto.newAmount >= dto.originalAmount) {
            throw new BadRequestException('المبلغ الجديد يجب أن يكون أقل من المبلغ الأصلي');
        }

        if (dto.newAmount < 0) {
            throw new BadRequestException('المبلغ يجب أن يكون أكبر من أو يساوي صفر');
        }

        const employee = await this.prisma.user.findFirst({
            where: { id: dto.employeeId, companyId },
            select: { id: true, firstName: true, lastName: true },
        });

        if (!employee) {
            throw new NotFoundException('الموظف غير موجود');
        }

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        let period = dto.periodId
            ? await this.prisma.payrollPeriod.findFirst({ where: { id: dto.periodId, companyId } })
            : await this.prisma.payrollPeriod.findFirst({
                where: { companyId, month: currentMonth, year: currentYear },
            });

        if (!period) {
            period = await this.prisma.payrollPeriod.create({
                data: {
                    companyId,
                    month: currentMonth,
                    year: currentYear,
                    startDate: new Date(currentYear, currentMonth - 1, 1),
                    endDate: new Date(currentYear, currentMonth, 0),
                    status: 'DRAFT',
                },
            });
        }

        const reduction = dto.originalAmount - dto.newAmount;

        const adjustment = await this.prisma.payrollAdjustment.create({
            data: {
                adjustmentType: 'WAIVE_DEDUCTION',
                originalDeductionType: dto.deductionType === 'LATE' ? 'LATE_DEDUCTION' :
                    dto.deductionType === 'ABSENCE' ? 'ABSENCE_DEDUCTION' : 'EARLY_DEPARTURE',
                originalAmount: dto.originalAmount,
                adjustedAmount: dto.newAmount, // المبلغ بعد التخفيض
                leaveDaysDeducted: 0,
                value: reduction, // مبلغ التخفيض
                reason: dto.reason,
                notes: `تخفيض خصم ${dto.deductionType} من ${dto.originalAmount} إلى ${dto.newAmount} ر.س`,
                status: 'POSTED',
                approvedAt: now,
                payrollPeriod: { connect: { id: period.id } },
                employee: { connect: { id: dto.employeeId } },
                company: { connect: { id: companyId } },
                createdBy: { connect: { id: userId } },
                approvedBy: { connect: { id: userId } },
            },
        });

        this.logger.log(`✅ Created modify adjustment: ${adjustment.id}`);

        return {
            success: true,
            message: `تم تعديل مبلغ الخصم من ${dto.originalAmount} إلى ${dto.newAmount} ر.س`,
            adjustment,
            employee: `${employee.firstName} ${employee.lastName}`,
            originalAmount: dto.originalAmount,
            newAmount: dto.newAmount,
            reduction,
        };
    }

    /**
     * 🔄 تحويل الخصم لإجازة
     * ينشئ PayrollAdjustment من نوع CONVERT_TO_LEAVE + يخصم من رصيد الإجازات
     */
    async convertDeductionToLeave(dto: ConvertToLeaveDto, userId: string, companyId: string) {
        this.logger.log(`🔄 Converting ${dto.deductionType} deduction to leave for employee: ${dto.employeeId}`);

        if (dto.leaveDays <= 0) {
            throw new BadRequestException('عدد أيام الإجازة يجب أن يكون أكبر من صفر');
        }

        const employee = await this.prisma.user.findFirst({
            where: { id: dto.employeeId, companyId },
            select: { id: true, firstName: true, lastName: true, remainingLeaveDays: true },
        });

        if (!employee) {
            throw new NotFoundException('الموظف غير موجود');
        }

        // التحقق من رصيد الإجازات
        if (employee.remainingLeaveDays < dto.leaveDays) {
            throw new BadRequestException(
                `رصيد الإجازات غير كافي. الرصيد: ${employee.remainingLeaveDays} يوم، المطلوب: ${dto.leaveDays} يوم`
            );
        }

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        let period = dto.periodId
            ? await this.prisma.payrollPeriod.findFirst({ where: { id: dto.periodId, companyId } })
            : await this.prisma.payrollPeriod.findFirst({
                where: { companyId, month: currentMonth, year: currentYear },
            });

        if (!period) {
            period = await this.prisma.payrollPeriod.create({
                data: {
                    companyId,
                    month: currentMonth,
                    year: currentYear,
                    startDate: new Date(currentYear, currentMonth - 1, 1),
                    endDate: new Date(currentYear, currentMonth, 0),
                    status: 'DRAFT',
                },
            });
        }

        // Transaction: إنشاء التسوية + خصم الإجازات
        const result = await this.prisma.$transaction(async (tx) => {
            // إنشاء التسوية
            const adjustment = await tx.payrollAdjustment.create({
                data: {
                    adjustmentType: 'CONVERT_TO_LEAVE',
                    originalDeductionType: dto.deductionType === 'LATE' ? 'LATE_DEDUCTION' :
                        dto.deductionType === 'ABSENCE' ? 'ABSENCE_DEDUCTION' : 'EARLY_DEPARTURE',
                    originalAmount: dto.originalAmount,
                    adjustedAmount: 0, // لا يوجد خصم نقدي
                    leaveDaysDeducted: dto.leaveDays,
                    value: dto.originalAmount,
                    reason: dto.reason,
                    notes: `تحويل خصم ${dto.deductionType} بمبلغ ${dto.originalAmount} ر.س إلى ${dto.leaveDays} يوم إجازة ${dto.leaveType}`,
                    status: 'POSTED',
                    approvedAt: now,
                    payrollPeriod: { connect: { id: period!.id } },
                    employee: { connect: { id: dto.employeeId } },
                    company: { connect: { id: companyId } },
                    createdBy: { connect: { id: userId } },
                    approvedBy: { connect: { id: userId } },
                },
            });

            // خصم أيام الإجازة من رصيد الموظف
            await tx.user.update({
                where: { id: dto.employeeId },
                data: {
                    usedLeaveDays: { increment: dto.leaveDays },
                    remainingLeaveDays: { decrement: dto.leaveDays },
                },
            });

            return adjustment;
        });

        this.logger.log(`✅ Created convert-to-leave adjustment: ${result.id}`);

        return {
            success: true,
            message: `تم تحويل الخصم إلى ${dto.leaveDays} يوم إجازة بنجاح`,
            adjustment: result,
            employee: `${employee.firstName} ${employee.lastName}`,
            leaveDaysDeducted: dto.leaveDays,
            leaveType: dto.leaveType,
            remainingLeaveBalance: employee.remainingLeaveDays - dto.leaveDays,
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

/**
 * DTO لإلغاء خصم الحضور
 */
export interface WaiveDeductionDto {
    employeeId: string;
    deductionType: 'LATE' | 'ABSENCE' | 'EARLY_DEPARTURE';
    originalAmount: number;
    reason: string;
    periodId?: string;
}

/**
 * DTO لتعديل مبلغ الخصم
 */
export interface ModifyDeductionDto {
    employeeId: string;
    deductionType: 'LATE' | 'ABSENCE' | 'EARLY_DEPARTURE';
    originalAmount: number;
    newAmount: number;
    reason: string;
    periodId?: string;
}

/**
 * DTO لتحويل الخصم لإجازة
 */
export interface ConvertToLeaveDto {
    employeeId: string;
    deductionType: 'LATE' | 'ABSENCE' | 'EARLY_DEPARTURE';
    originalAmount: number;
    leaveDays: number;
    leaveType: string;
    reason: string;
    periodId?: string;
}
