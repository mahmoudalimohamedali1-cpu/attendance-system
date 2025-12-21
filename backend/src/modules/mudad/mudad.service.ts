import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MudadStatus } from '@prisma/client';

interface CreateMudadSubmissionDto {
    payrollRunId: string;
    submissionType?: string;
    notes?: string;
}

interface UpdateMudadStatusDto {
    status: MudadStatus;
    mudadRef?: string;
    rejectionNote?: string;
    notes?: string;
}

@Injectable()
export class MudadService {
    constructor(private prisma: PrismaService) { }

    /**
     * إنشاء سجل تقديم لمُدد
     */
    async createSubmission(dto: CreateMudadSubmissionDto, companyId: string, userId: string) {
        // التحقق من وجود PayrollRun
        const run = await this.prisma.payrollRun.findFirst({
            where: { id: dto.payrollRunId, companyId },
            include: {
                period: true,
                payslips: {
                    where: { status: 'PAID' },
                    select: { netSalary: true },
                },
            },
        });

        if (!run) throw new NotFoundException('مسيرة الرواتب غير موجودة');
        if (run.status !== 'LOCKED' && run.status !== 'PAID') {
            throw new BadRequestException('يجب إقفال مسيرة الرواتب قبل التقديم لمُدد');
        }

        // حساب المبلغ الإجمالي وعدد الموظفين
        const totalAmount = run.payslips.reduce((sum, p) => sum + Number(p.netSalary), 0);
        const employeeCount = run.payslips.length;

        // التحقق من عدم وجود تقديم سابق
        const existing = await this.prisma.mudadSubmission.findUnique({
            where: {
                payrollRunId_submissionType: {
                    payrollRunId: dto.payrollRunId,
                    submissionType: dto.submissionType || 'SALARY',
                },
            },
        });

        if (existing) {
            throw new BadRequestException('يوجد تقديم سابق لهذه المسيرة');
        }

        return this.prisma.mudadSubmission.create({
            data: {
                companyId,
                payrollRunId: dto.payrollRunId,
                period: `${run.period.year}-${String(run.period.month).padStart(2, '0')}`,
                submissionType: dto.submissionType || 'SALARY',
                status: 'PENDING',
                totalAmount,
                employeeCount,
                notes: dto.notes,
                preparedBy: userId,
                preparedAt: new Date(),
            },
            include: {
                payrollRun: { include: { period: true } },
            },
        });
    }

    /**
     * تحديث حالة التقديم
     */
    async updateStatus(id: string, dto: UpdateMudadStatusDto, companyId: string, userId: string) {
        const submission = await this.prisma.mudadSubmission.findFirst({
            where: { id, companyId },
        });

        if (!submission) throw new NotFoundException('سجل التقديم غير موجود');

        const updateData: any = {
            status: dto.status,
            notes: dto.notes,
        };

        // تحديث التواريخ حسب الحالة
        switch (dto.status) {
            case 'PREPARED':
                updateData.preparedAt = new Date();
                updateData.preparedBy = userId;
                break;
            case 'SUBMITTED':
                updateData.submittedAt = new Date();
                updateData.submittedBy = userId;
                updateData.mudadRef = dto.mudadRef;
                break;
            case 'ACCEPTED':
                updateData.acceptedAt = new Date();
                break;
            case 'REJECTED':
                updateData.rejectedAt = new Date();
                updateData.rejectionNote = dto.rejectionNote;
                break;
            case 'RESUBMITTED':
                updateData.submittedAt = new Date();
                updateData.submittedBy = userId;
                updateData.rejectedAt = null;
                updateData.rejectionNote = null;
                break;
        }

        return this.prisma.mudadSubmission.update({
            where: { id },
            data: updateData,
            include: {
                payrollRun: { include: { period: true } },
            },
        });
    }

    /**
     * جلب جميع التقديمات للشركة
     */
    async findAll(companyId: string, year?: number) {
        const where: any = { companyId };
        if (year) {
            where.period = { startsWith: String(year) };
        }

        return this.prisma.mudadSubmission.findMany({
            where,
            include: {
                payrollRun: { include: { period: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * جلب تقديم محدد
     */
    async findOne(id: string, companyId: string) {
        const submission = await this.prisma.mudadSubmission.findFirst({
            where: { id, companyId },
            include: {
                payrollRun: { include: { period: true } },
            },
        });

        if (!submission) throw new NotFoundException('سجل التقديم غير موجود');
        return submission;
    }

    /**
     * حذف تقديم (فقط إذا كان في حالة PENDING)
     */
    async delete(id: string, companyId: string) {
        const submission = await this.findOne(id, companyId);

        if (submission.status !== 'PENDING') {
            throw new BadRequestException('لا يمكن حذف تقديم تم إرساله');
        }

        return this.prisma.mudadSubmission.delete({ where: { id } });
    }

    /**
     * رفع ملف WPS
     */
    async attachWpsFile(id: string, fileUrl: string, companyId: string) {
        const submission = await this.findOne(id, companyId);

        return this.prisma.mudadSubmission.update({
            where: { id },
            data: {
                wpsFileUrl: fileUrl,
                status: submission.status === 'PENDING' ? 'PREPARED' : submission.status,
                preparedAt: submission.preparedAt || new Date(),
            },
        });
    }

    /**
     * إحصائيات مُدد
     */
    async getStats(companyId: string, year: number) {
        const submissions = await this.prisma.mudadSubmission.findMany({
            where: {
                companyId,
                period: { startsWith: String(year) },
            },
        });

        return {
            total: submissions.length,
            pending: submissions.filter(s => s.status === 'PENDING').length,
            prepared: submissions.filter(s => s.status === 'PREPARED').length,
            submitted: submissions.filter(s => s.status === 'SUBMITTED').length,
            accepted: submissions.filter(s => s.status === 'ACCEPTED').length,
            rejected: submissions.filter(s => s.status === 'REJECTED').length,
            totalAmount: submissions.reduce((sum, s) => sum + Number(s.totalAmount), 0),
        };
    }
}
