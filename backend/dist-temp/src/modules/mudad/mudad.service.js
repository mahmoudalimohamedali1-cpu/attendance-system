"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MudadService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
const status_log_service_1 = require("../../common/services/status-log.service");
const state_machine_service_1 = require("../../common/services/state-machine.service");
let MudadService = class MudadService {
    constructor(prisma, statusLogService, stateMachineService) {
        this.prisma = prisma;
        this.statusLogService = statusLogService;
        this.stateMachineService = stateMachineService;
    }
    async createSubmission(dto, companyId, userId) {
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
        if (!run)
            throw new common_1.NotFoundException('مسيرة الرواتب غير موجودة');
        if (run.status !== 'LOCKED' && run.status !== 'PAID') {
            throw new common_1.BadRequestException('يجب إقفال مسيرة الرواتب قبل التقديم لمُدد');
        }
        const totalAmount = run.payslips.reduce((sum, p) => sum + Number(p.netSalary), 0);
        const employeeCount = run.payslips.length;
        const existing = await this.prisma.mudadSubmission.findUnique({
            where: {
                payrollRunId_submissionType: {
                    payrollRunId: dto.payrollRunId,
                    submissionType: dto.submissionType || 'SALARY',
                },
            },
        });
        if (existing) {
            throw new common_1.BadRequestException('يوجد تقديم سابق لهذه المسيرة');
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
        await this.statusLogService.logStatusChange({
            entityType: client_1.SubmissionEntityType.MUDAD,
            entityId: submission.id,
            fromStatus: null,
            toStatus: 'PENDING',
            reason: 'إنشاء سجل جديد',
        }, companyId, userId);
        return submission;
    }
    async updateStatus(id, dto, companyId, userId) {
        const submission = await this.prisma.mudadSubmission.findFirst({
            where: { id, companyId },
        });
        if (!submission)
            throw new common_1.NotFoundException('سجل التقديم غير موجود');
        this.stateMachineService.validateMudadTransition(submission.status, dto.status);
        const oldStatus = submission.status;
        const updateData = {
            status: dto.status,
            notes: dto.notes,
        };
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
        await this.statusLogService.logStatusChange({
            entityType: client_1.SubmissionEntityType.MUDAD,
            entityId: id,
            fromStatus: oldStatus,
            toStatus: dto.status,
            reason: dto.reason || dto.rejectionNote,
            externalRef: dto.mudadRef,
        }, companyId, userId);
        return updated;
    }
    async findAll(companyId, year) {
        const where = { companyId };
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
    async findOne(id, companyId) {
        const submission = await this.prisma.mudadSubmission.findFirst({
            where: { id, companyId },
            include: {
                payrollRun: { include: { period: true } },
            },
        });
        if (!submission)
            throw new common_1.NotFoundException('سجل التقديم غير موجود');
        return submission;
    }
    async delete(id, companyId) {
        const submission = await this.findOne(id, companyId);
        if (submission.status !== 'PENDING') {
            throw new common_1.BadRequestException('لا يمكن حذف تقديم تم إرساله');
        }
        return this.prisma.mudadSubmission.delete({ where: { id } });
    }
    async attachWpsFile(id, fileUrl, companyId, fileHashSha256, userId) {
        const submission = await this.findOne(id, companyId);
        if (submission.status === 'ACCEPTED') {
            if (userId) {
                await this.statusLogService.logStatusChange({
                    entityType: client_1.SubmissionEntityType.MUDAD,
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
            throw new common_1.BadRequestException('لا يمكن تعديل ملف تقديم تم قبوله. يرجى إنشاء تقديم جديد.');
        }
        const hasExistingHash = !!submission.fileHashSha256;
        const hashProvided = !!fileHashSha256;
        const hashChanged = hasExistingHash && hashProvided && submission.fileHashSha256 !== fileHashSha256;
        const sameHash = hasExistingHash && hashProvided && submission.fileHashSha256 === fileHashSha256;
        let newStatus = submission.status;
        let reason = '';
        let shouldLog = false;
        if (sameHash) {
            reason = 'FILE_REATTACHED_SAME_HASH';
        }
        else if (hashChanged) {
            newStatus = 'RESUBMIT_REQUIRED';
            reason = 'FILE_HASH_CHANGED';
            shouldLog = true;
            if (userId) {
                await this.statusLogService.logStatusChange({
                    entityType: client_1.SubmissionEntityType.MUDAD,
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
        else if (submission.status === 'PENDING') {
            newStatus = 'PREPARED';
            reason = 'FIRST_FILE_ATTACHED';
            shouldLog = true;
            if (userId) {
                await this.statusLogService.logStatusChange({
                    entityType: client_1.SubmissionEntityType.MUDAD,
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
        else if (submission.status === 'RESUBMIT_REQUIRED') {
            newStatus = 'PREPARED';
            reason = 'FILE_REATTACHED_AFTER_RESUBMIT';
            shouldLog = true;
            if (userId) {
                await this.statusLogService.logStatusChange({
                    entityType: client_1.SubmissionEntityType.MUDAD,
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
    async getStats(companyId, year) {
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
};
exports.MudadService = MudadService;
exports.MudadService = MudadService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        status_log_service_1.StatusLogService,
        state_machine_service_1.StateMachineService])
], MudadService);
//# sourceMappingURL=mudad.service.js.map