import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WpsStatus, WpsSubmission, SubmissionEntityType } from '@prisma/client';
import { StatusLogService } from '../../common/services/status-log.service';

interface CreateWpsSubmissionDto {
    payrollRunId: string;
    filename: string;
    fileFormat?: string;
    fileUrl?: string;
    fileHashSha256?: string;
}

interface UpdateWpsStatusDto {
    status: WpsStatus;
    bankName?: string;
    bankRef?: string;
    notes?: string;
    reason?: string;
}

@Injectable()
export class WpsTrackingService {
    constructor(
        private prisma: PrismaService,
        private statusLogService: StatusLogService,
    ) { }

    /**
     * إنشاء سجل تتبع WPS
     */
    async createSubmission(dto: CreateWpsSubmissionDto, companyId: string, userId: string) {
        // التحقق من PayrollRun
        const run = await this.prisma.payrollRun.findFirst({
            where: { id: dto.payrollRunId, companyId },
            include: {
                payslips: {
                    where: { status: 'PAID' },
                    select: { netSalary: true },
                },
            },
        });

        if (!run) throw new NotFoundException('مسيرة الرواتب غير موجودة');

        const totalAmount = run.payslips.reduce((sum, p) => sum + Number(p.netSalary), 0);
        const employeeCount = run.payslips.length;

        const submission = await this.prisma.wpsSubmission.create({
            data: {
                companyId,
                payrollRunId: dto.payrollRunId,
                filename: dto.filename,
                fileFormat: dto.fileFormat || 'WPS',
                fileUrl: dto.fileUrl,
                totalAmount,
                employeeCount,
                generatedBy: userId,
                status: 'GENERATED',
                fileHashSha256: dto.fileHashSha256,
                generatorVersion: '1.0.0',
            },
            include: {
                payrollRun: { include: { period: true } },
            },
        });

        // تسجيل في سجل التدقيق
        await this.statusLogService.logStatusChange({
            entityType: SubmissionEntityType.WPS,
            entityId: submission.id,
            fromStatus: null,
            toStatus: 'GENERATED',
            reason: 'إنشاء ملف WPS جديد',
        }, companyId, userId);

        return submission;
    }

    /**
     * تحديث حالة الـ WPS
     */
    async updateStatus(id: string, dto: UpdateWpsStatusDto, companyId: string, userId?: string) {
        const submission = await this.prisma.wpsSubmission.findFirst({
            where: { id, companyId },
        });

        if (!submission) throw new NotFoundException('سجل WPS غير موجود');

        const oldStatus = submission.status;
        const updateData: any = {
            status: dto.status,
            notes: dto.notes,
            bankName: dto.bankName,
            bankRef: dto.bankRef,
        };

        // تحديث التواريخ حسب الحالة
        switch (dto.status) {
            case 'DOWNLOADED':
                updateData.downloadedAt = new Date();
                break;
            case 'SUBMITTED':
                updateData.submittedAt = new Date();
                break;
            case 'PROCESSED':
                updateData.processedAt = new Date();
                break;
        }

        const updated = await this.prisma.wpsSubmission.update({
            where: { id },
            data: updateData,
            include: {
                payrollRun: { include: { period: true } },
            },
        });

        // تسجيل في سجل التدقيق
        if (userId) {
            await this.statusLogService.logStatusChange({
                entityType: SubmissionEntityType.WPS,
                entityId: id,
                fromStatus: oldStatus,
                toStatus: dto.status,
                reason: dto.reason,
                externalRef: dto.bankRef,
            }, companyId, userId);
        }

        return updated;
    }

    /**
     * جلب جميع ملفات WPS
     */
    async findAll(companyId: string, status?: WpsStatus) {
        const where: any = { companyId };
        if (status) where.status = status;

        return this.prisma.wpsSubmission.findMany({
            where,
            include: {
                payrollRun: { include: { period: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * جلب سجل WPS محدد
     */
    async findOne(id: string, companyId: string) {
        const submission = await this.prisma.wpsSubmission.findFirst({
            where: { id, companyId },
            include: {
                payrollRun: { include: { period: true } },
            },
        });

        if (!submission) throw new NotFoundException('سجل WPS غير موجود');
        return submission;
    }

    /**
     * جلب سجلات WPS لـ PayrollRun
     */
    async findByPayrollRun(payrollRunId: string, companyId: string) {
        return this.prisma.wpsSubmission.findMany({
            where: { payrollRunId, companyId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * إحصائيات WPS
     */
    async getStats(companyId: string, year?: number) {
        const where: any = { companyId };
        if (year) {
            where.createdAt = {
                gte: new Date(year, 0, 1),
                lt: new Date(year + 1, 0, 1),
            };
        }

        const submissions: WpsSubmission[] = await this.prisma.wpsSubmission.findMany({ where });

        return {
            total: submissions.length,
            generated: submissions.filter((s: WpsSubmission) => s.status === 'GENERATED').length,
            downloaded: submissions.filter((s: WpsSubmission) => s.status === 'DOWNLOADED').length,
            submitted: submissions.filter((s: WpsSubmission) => s.status === 'SUBMITTED').length,
            processing: submissions.filter((s: WpsSubmission) => s.status === 'PROCESSING').length,
            processed: submissions.filter((s: WpsSubmission) => s.status === 'PROCESSED').length,
            failed: submissions.filter((s: WpsSubmission) => s.status === 'FAILED').length,
            totalAmount: submissions
                .filter((s: WpsSubmission) => s.status === 'PROCESSED')
                .reduce((sum: number, s: WpsSubmission) => sum + Number(s.totalAmount), 0),
        };
    }

    /**
     * تسجيل تحميل الملف
     */
    async markAsDownloaded(id: string, companyId: string) {
        return this.updateStatus(id, { status: 'DOWNLOADED' }, companyId);
    }
}
