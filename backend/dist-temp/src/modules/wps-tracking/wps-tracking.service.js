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
exports.WpsTrackingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
const status_log_service_1 = require("../../common/services/status-log.service");
const state_machine_service_1 = require("../../common/services/state-machine.service");
let WpsTrackingService = class WpsTrackingService {
    constructor(prisma, statusLogService, stateMachineService) {
        this.prisma = prisma;
        this.statusLogService = statusLogService;
        this.stateMachineService = stateMachineService;
    }
    async createSubmission(dto, companyId, userId) {
        const run = await this.prisma.payrollRun.findFirst({
            where: { id: dto.payrollRunId, companyId },
            include: {
                payslips: {
                    where: { status: 'PAID' },
                    select: { netSalary: true },
                },
            },
        });
        if (!run)
            throw new common_1.NotFoundException('مسيرة الرواتب غير موجودة');
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
        await this.statusLogService.logStatusChange({
            entityType: client_1.SubmissionEntityType.WPS,
            entityId: submission.id,
            fromStatus: null,
            toStatus: 'GENERATED',
            reason: 'إنشاء ملف WPS جديد',
        }, companyId, userId);
        return submission;
    }
    async updateStatus(id, dto, companyId, userId) {
        const submission = await this.prisma.wpsSubmission.findFirst({
            where: { id, companyId },
        });
        if (!submission)
            throw new common_1.NotFoundException('سجل WPS غير موجود');
        this.stateMachineService.validateWpsTransition(submission.status, dto.status);
        const oldStatus = submission.status;
        const updateData = {
            status: dto.status,
            notes: dto.notes,
            bankName: dto.bankName,
            bankRef: dto.bankRef,
            attachmentUrl: dto.attachmentUrl,
        };
        switch (dto.status) {
            case 'DOWNLOADED':
                updateData.downloadedAt = new Date();
                if (userId)
                    updateData.downloadedBy = userId;
                break;
            case 'SUBMITTED':
                updateData.submittedAt = new Date();
                if (userId)
                    updateData.submittedBy = userId;
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
        if (userId) {
            await this.statusLogService.logStatusChange({
                entityType: client_1.SubmissionEntityType.WPS,
                entityId: id,
                fromStatus: oldStatus,
                toStatus: dto.status,
                reason: dto.reason,
                externalRef: dto.bankRef,
            }, companyId, userId);
        }
        return updated;
    }
    async findAll(companyId, status) {
        const where = { companyId };
        if (status)
            where.status = status;
        return this.prisma.wpsSubmission.findMany({
            where,
            include: {
                payrollRun: { include: { period: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id, companyId) {
        const submission = await this.prisma.wpsSubmission.findFirst({
            where: { id, companyId },
            include: {
                payrollRun: { include: { period: true } },
            },
        });
        if (!submission)
            throw new common_1.NotFoundException('سجل WPS غير موجود');
        return submission;
    }
    async findByPayrollRun(payrollRunId, companyId) {
        return this.prisma.wpsSubmission.findMany({
            where: { payrollRunId, companyId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getStats(companyId, year) {
        const where = { companyId };
        if (year) {
            where.createdAt = {
                gte: new Date(year, 0, 1),
                lt: new Date(year + 1, 0, 1),
            };
        }
        const submissions = await this.prisma.wpsSubmission.findMany({ where });
        return {
            total: submissions.length,
            generated: submissions.filter((s) => s.status === 'GENERATED').length,
            downloaded: submissions.filter((s) => s.status === 'DOWNLOADED').length,
            submitted: submissions.filter((s) => s.status === 'SUBMITTED').length,
            processing: submissions.filter((s) => s.status === 'PROCESSING').length,
            processed: submissions.filter((s) => s.status === 'PROCESSED').length,
            failed: submissions.filter((s) => s.status === 'FAILED').length,
            totalAmount: submissions
                .filter((s) => s.status === 'PROCESSED')
                .reduce((sum, s) => sum + Number(s.totalAmount), 0),
        };
    }
    async markAsDownloaded(id, companyId) {
        return this.updateStatus(id, { status: 'DOWNLOADED' }, companyId);
    }
};
exports.WpsTrackingService = WpsTrackingService;
exports.WpsTrackingService = WpsTrackingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        status_log_service_1.StatusLogService,
        state_machine_service_1.StateMachineService])
], WpsTrackingService);
//# sourceMappingURL=wps-tracking.service.js.map