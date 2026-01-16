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
var AdjustmentRunService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdjustmentRunService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const payslip_lines_service_1 = require("../payslips/payslip-lines.service");
const client_1 = require("@prisma/client");
let AdjustmentRunService = AdjustmentRunService_1 = class AdjustmentRunService {
    constructor(prisma, payslipLinesService) {
        this.prisma = prisma;
        this.payslipLinesService = payslipLinesService;
        this.logger = new common_1.Logger(AdjustmentRunService_1.name);
    }
    async createAdjustmentRun(originalRunId, companyId, reason, createdById) {
        const originalRun = await this.prisma.payrollRun.findFirst({
            where: { id: originalRunId, companyId },
            select: { id: true, lockedAt: true, periodId: true, isAdjustment: true }
        });
        if (!originalRun) {
            throw new common_1.NotFoundException('الـ Run الأصلي غير موجود');
        }
        if (!originalRun.lockedAt) {
            throw new common_1.ForbiddenException('لا يمكن إنشاء تعديل على Run غير مقفل. يجب قفل الـ Run الأصلي أولاً.');
        }
        if (!reason || reason.trim().length < 5) {
            throw new common_1.BadRequestException('سبب التعديل مطلوب (5 أحرف على الأقل)');
        }
        if (originalRun.isAdjustment) {
            this.logger.warn(`Creating adjustment on top of adjustment run ${originalRunId}`);
        }
        const adjustmentRun = await this.prisma.payrollRun.create({
            data: {
                companyId,
                periodId: originalRun.periodId,
                isAdjustment: true,
                originalRunId,
                adjustmentReason: reason.trim(),
                status: 'DRAFT',
                processedBy: createdById,
            }
        });
        this.logger.log(`Created adjustment run ${adjustmentRun.id} for original ${originalRunId}`);
        return {
            id: adjustmentRun.id,
            message: `تم إنشاء Run تعديل جديد: ${adjustmentRun.id}`,
        };
    }
    async addAdjustmentLine(adjustmentRunId, employeeId, companyId, adjustmentData) {
        const adjustmentRun = await this.prisma.payrollRun.findFirst({
            where: { id: adjustmentRunId, companyId, isAdjustment: true },
            select: { id: true, lockedAt: true, periodId: true }
        });
        if (!adjustmentRun) {
            throw new common_1.NotFoundException('الـ Adjustment Run غير موجود');
        }
        if (adjustmentRun.lockedAt) {
            throw new common_1.ForbiddenException('الـ Adjustment Run مقفل ولا يمكن التعديل عليه');
        }
        const component = await this.prisma.salaryComponent.findFirst({
            where: { id: adjustmentData.componentId, companyId }
        });
        if (!component) {
            throw new common_1.BadRequestException('مكوّن الراتب غير موجود أو لا ينتمي لهذه الشركة');
        }
        let payslip = await this.prisma.payslip.findFirst({
            where: { runId: adjustmentRunId, employeeId }
        });
        if (!payslip) {
            const originalPayslip = await this.prisma.payslip.findFirst({
                where: {
                    run: { originalRunId: null },
                    employeeId,
                    periodId: adjustmentRun.periodId
                },
                orderBy: { createdAt: 'desc' }
            });
            payslip = await this.prisma.payslip.create({
                data: {
                    companyId,
                    employeeId,
                    periodId: adjustmentRun.periodId,
                    runId: adjustmentRunId,
                    baseSalary: originalPayslip?.baseSalary || 0,
                    grossSalary: 0,
                    totalDeductions: 0,
                    netSalary: 0,
                    status: 'DRAFT',
                }
            });
        }
        const normalizedAmount = this.payslipLinesService.normalizeMoney(adjustmentData.amount);
        const payslipLine = await this.prisma.payslipLine.create({
            data: {
                payslipId: payslip.id,
                componentId: adjustmentData.componentId,
                sign: adjustmentData.sign,
                amount: normalizedAmount,
                sourceType: client_1.PayslipLineSource.ADJUSTMENT,
                sourceRef: `ADJ:${adjustmentRunId}`,
                descriptionAr: adjustmentData.reason || 'تعديل يدوي',
            }
        });
        await this.updateAdjustmentPayslipTotals(payslip.id);
        this.logger.log(`Added adjustment line ${payslipLine.id} to payslip ${payslip.id}`);
        return { payslipLineId: payslipLine.id };
    }
    async updateAdjustmentPayslipTotals(payslipId) {
        const lines = await this.prisma.payslipLine.findMany({
            where: { payslipId },
            select: { sign: true, amount: true }
        });
        let earnings = 0;
        let deductions = 0;
        for (const line of lines) {
            const amount = Number(line.amount);
            if (line.sign === 'EARNING') {
                earnings += amount;
            }
            else {
                deductions += amount;
            }
        }
        await this.prisma.payslip.update({
            where: { id: payslipId },
            data: {
                grossSalary: this.payslipLinesService.normalizeMoney(earnings),
                totalDeductions: this.payslipLinesService.normalizeMoney(deductions),
                netSalary: this.payslipLinesService.normalizeMoney(earnings - deductions),
            }
        });
    }
    async getAdjustmentRuns(originalRunId, companyId) {
        return this.prisma.payrollRun.findMany({
            where: { originalRunId, companyId },
            include: {
                payslips: {
                    include: {
                        lines: {
                            where: { sourceType: client_1.PayslipLineSource.ADJUSTMENT }
                        },
                        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    async lockAdjustmentRun(adjustmentRunId, companyId, lockedById) {
        const run = await this.prisma.payrollRun.findFirst({
            where: { id: adjustmentRunId, companyId, isAdjustment: true }
        });
        if (!run) {
            throw new common_1.NotFoundException('الـ Adjustment Run غير موجود');
        }
        if (run.lockedAt) {
            throw new common_1.BadRequestException('الـ Adjustment Run مقفل بالفعل');
        }
        await this.prisma.payrollRun.update({
            where: { id: adjustmentRunId },
            data: {
                lockedAt: new Date(),
                lockedBy: lockedById,
                status: 'LOCKED',
            }
        });
        this.logger.log(`Locked adjustment run ${adjustmentRunId} by ${lockedById}`);
        return { message: 'تم قفل الـ Adjustment Run بنجاح' };
    }
};
exports.AdjustmentRunService = AdjustmentRunService;
exports.AdjustmentRunService = AdjustmentRunService = AdjustmentRunService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        payslip_lines_service_1.PayslipLinesService])
], AdjustmentRunService);
//# sourceMappingURL=adjustment-run.service.js.map