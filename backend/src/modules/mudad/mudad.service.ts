import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MudadStatus, SubmissionEntityType } from '@prisma/client';
import { StatusLogService } from '../../common/services/status-log.service';
import { StateMachineService } from '../../common/services/state-machine.service';
import { MudadValidatorService } from '../wps-export/validators/mudad-validator.service';
import * as ExcelJS from 'exceljs';

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
    reason?: string; // سبب التغيير للـ audit log
}

@Injectable()
export class MudadService {
    constructor(
        private prisma: PrismaService,
        private statusLogService: StatusLogService,
        private stateMachineService: StateMachineService,
        private mudadValidator: MudadValidatorService,
    ) { }

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

        // التحقق من صحة البيانات قبل التقديم لمُدد
        const validation = await this.mudadValidator.validateForMudad(dto.payrollRunId, companyId);

        if (!validation.readyForSubmission) {
            const errorMessages = validation.issues
                .filter(issue => issue.severity === 'ERROR')
                .map(issue => issue.messageAr || issue.message)
                .join(', ');

            throw new BadRequestException(
                `لا يمكن التقديم لمُدد. يوجد ${validation.summary.errors} أخطاء في البيانات: ${errorMessages}`
            );
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

        const submission = await this.prisma.mudadSubmission.create({
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
                generatorVersion: '1.0.0',
            },
            include: {
                payrollRun: { include: { period: true } },
            },
        });

        // تسجيل في سجل التدقيق
        await this.statusLogService.logStatusChange({
            entityType: SubmissionEntityType.MUDAD,
            entityId: submission.id,
            fromStatus: null,
            toStatus: 'PENDING',
            reason: 'إنشاء سجل جديد',
        }, companyId, userId);

        return submission;
    }

    /**
     * تحديث حالة التقديم
     */
    async updateStatus(id: string, dto: UpdateMudadStatusDto, companyId: string, userId: string) {
        const submission = await this.prisma.mudadSubmission.findFirst({
            where: { id, companyId },
        });

        if (!submission) throw new NotFoundException('سجل التقديم غير موجود');

        // التحقق من صحة التحويل (State Machine)
        this.stateMachineService.validateMudadTransition(submission.status, dto.status);

        const oldStatus = submission.status;
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

        const updated = await this.prisma.mudadSubmission.update({
            where: { id },
            data: updateData,
            include: {
                payrollRun: { include: { period: true } },
            },
        });

        // تسجيل في سجل التدقيق
        await this.statusLogService.logStatusChange({
            entityType: SubmissionEntityType.MUDAD,
            entityId: id,
            fromStatus: oldStatus,
            toStatus: dto.status,
            reason: dto.reason || dto.rejectionNote,
            externalRef: dto.mudadRef,
        }, companyId, userId);

        return updated;
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
     * رفع ملف WPS (مع التحقق من تغيير الهاش)
     * 
     * Edge Cases:
     * Case A: نفس الملف → no-op (no status change)
     * Case B: ملف اتغير قبل submit → RESUBMIT_REQUIRED
     * Case C: ملف اتغير بعد submit → RESUBMIT_REQUIRED  
     * Case D: ملف اتغير بعد accept → 400 ممنوع
     */
    async attachWpsFile(id: string, fileUrl: string, companyId: string, fileHashSha256?: string, userId?: string) {
        const submission = await this.findOne(id, companyId);

        // 🛑 Case D: منع تغيير الملف بعد ACCEPTED (نهائي)
        if (submission.status === 'ACCEPTED') {
            // تسجيل محاولة التلاعب
            if (userId) {
                await this.statusLogService.logStatusChange({
                    entityType: SubmissionEntityType.MUDAD,
                    entityId: id,
                    fromStatus: submission.status,
                    toStatus: submission.status,
                    reason: 'DENIED_AFTER_ACCEPT',
                    meta: JSON.stringify({
                        attemptedBy: userId,
                        attemptedFile: fileUrl,
                        attemptedHash: fileHashSha256,
                    }),
                }, companyId, userId);
            }
            throw new BadRequestException('لا يمكن تعديل ملف تقديم تم قبوله. يرجى إنشاء تقديم جديد.');
        }

        // التحقق من تغيير الملف
        const hasExistingHash = !!submission.fileHashSha256;
        const hashProvided = !!fileHashSha256;
        const hashChanged = hasExistingHash && hashProvided && submission.fileHashSha256 !== fileHashSha256;
        const sameHash = hasExistingHash && hashProvided && submission.fileHashSha256 === fileHashSha256;

        let newStatus = submission.status;
        let reason = '';
        let shouldLog = false;

        // ✅ Case A: نفس الملف → no-op (optional log)
        if (sameHash) {
            // لا تغيير في الحالة، الملف نفسه
            // ممكن نسجل log اختياري
            reason = 'FILE_REATTACHED_SAME_HASH';
            // لا نغير status
        }
        // 🔄 Case B & C: ملف اتغير (قبل أو بعد submit)
        else if (hashChanged) {
            newStatus = 'RESUBMIT_REQUIRED' as any;
            reason = 'FILE_HASH_CHANGED';
            shouldLog = true;

            // تسجيل تغيير الهاش في سجل التدقيق
            if (userId) {
                await this.statusLogService.logStatusChange({
                    entityType: SubmissionEntityType.MUDAD,
                    entityId: id,
                    fromStatus: submission.status,
                    toStatus: newStatus,
                    reason: reason,
                    meta: JSON.stringify({
                        oldHash: submission.fileHashSha256,
                        newHash: fileHashSha256,
                        fileName: fileUrl.split('/').pop(),
                    }),
                }, companyId, userId);
            }
        }
        // 📥 أول مرة يتم إرفاق ملف (من PENDING)
        else if (submission.status === 'PENDING') {
            newStatus = 'PREPARED' as any;
            reason = 'FIRST_FILE_ATTACHED';
            shouldLog = true;

            if (userId) {
                await this.statusLogService.logStatusChange({
                    entityType: SubmissionEntityType.MUDAD,
                    entityId: id,
                    fromStatus: submission.status,
                    toStatus: newStatus,
                    reason: reason,
                    meta: JSON.stringify({
                        fileHash: fileHashSha256,
                        fileName: fileUrl.split('/').pop(),
                    }),
                }, companyId, userId);
            }
        }
        // 🔄 Re-attach على RESUBMIT_REQUIRED → PREPARED
        else if (submission.status === 'RESUBMIT_REQUIRED') {
            newStatus = 'PREPARED' as any;
            reason = 'FILE_REATTACHED_AFTER_RESUBMIT';
            shouldLog = true;

            if (userId) {
                await this.statusLogService.logStatusChange({
                    entityType: SubmissionEntityType.MUDAD,
                    entityId: id,
                    fromStatus: submission.status,
                    toStatus: newStatus,
                    reason: reason,
                    meta: JSON.stringify({
                        newHash: fileHashSha256,
                        fileName: fileUrl.split('/').pop(),
                    }),
                }, companyId, userId);
            }
        }

        return this.prisma.mudadSubmission.update({
            where: { id },
            data: {
                wpsFileUrl: fileUrl,
                fileHashSha256: fileHashSha256,
                status: newStatus,
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

    /**
     * تصدير سجل تقديمات مُدد إلى Excel
     */
    async exportSubmissionHistory(companyId: string, year?: number, format: string = 'excel'): Promise<Buffer> {
        if (format !== 'excel') {
            throw new BadRequestException('فقط تنسيق Excel مدعوم حاليًا');
        }

        // جلب التقديمات مع التفاصيل
        const where: any = { companyId };
        if (year) {
            where.period = { startsWith: String(year) };
        }

        const submissions = await this.prisma.mudadSubmission.findMany({
            where,
            include: {
                payrollRun: {
                    include: {
                        period: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('سجل تقديمات مُدد');

        // Set RTL
        worksheet.views = [{ rightToLeft: true }];

        // Headers
        worksheet.columns = [
            { header: 'الفترة', key: 'period', width: 15 },
            { header: 'نوع التقديم', key: 'submissionType', width: 15 },
            { header: 'الحالة', key: 'status', width: 15 },
            { header: 'عدد الموظفين', key: 'employeeCount', width: 15 },
            { header: 'المبلغ الإجمالي', key: 'totalAmount', width: 18 },
            { header: 'تاريخ التجهيز', key: 'preparedAt', width: 18 },
            { header: 'تاريخ الإرسال', key: 'submittedAt', width: 18 },
            { header: 'تاريخ القبول', key: 'acceptedAt', width: 18 },
            { header: 'رقم مُدد', key: 'mudadRef', width: 20 },
            { header: 'ملاحظات', key: 'notes', width: 30 },
            { header: 'سبب الرفض', key: 'rejectionNote', width: 30 },
        ];

        // Style header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '4472C4' },
        };
        headerRow.font = { color: { argb: 'FFFFFF' }, bold: true };

        // Add data
        for (const submission of submissions) {
            worksheet.addRow({
                period: submission.period,
                submissionType: this.getSubmissionTypeArabic(submission.submissionType),
                status: this.getStatusArabic(submission.status),
                employeeCount: submission.employeeCount,
                totalAmount: Number(submission.totalAmount).toFixed(2),
                preparedAt: submission.preparedAt
                    ? new Date(submission.preparedAt).toLocaleString('ar-SA')
                    : '-',
                submittedAt: submission.submittedAt
                    ? new Date(submission.submittedAt).toLocaleString('ar-SA')
                    : '-',
                acceptedAt: submission.acceptedAt
                    ? new Date(submission.acceptedAt).toLocaleString('ar-SA')
                    : '-',
                mudadRef: submission.mudadRef || '-',
                notes: submission.notes || '-',
                rejectionNote: submission.rejectionNote || '-',
            });
        }

        // Auto-fit columns
        worksheet.columns.forEach((column) => {
            if (column.width) {
                column.width = Math.max(column.width, 12);
            }
        });

        return Buffer.from(await workbook.xlsx.writeBuffer());
    }

    /**
     * ترجمة حالة التقديم إلى العربية
     */
    private getStatusArabic(status: string): string {
        const statuses: Record<string, string> = {
            PENDING: 'قيد الانتظار',
            PREPARED: 'جاهز',
            SUBMITTED: 'مُرسل',
            ACCEPTED: 'مقبول',
            REJECTED: 'مرفوض',
            RESUBMIT_REQUIRED: 'يتطلب إعادة تقديم',
        };
        return statuses[status] || status;
    }

    /**
     * ترجمة نوع التقديم إلى العربية
     */
    private getSubmissionTypeArabic(type: string): string {
        const types: Record<string, string> = {
            SALARY: 'رواتب',
            BONUS: 'مكافآت',
            END_OF_SERVICE: 'نهاية الخدمة',
        };
        return types[type] || type;
    }
}
