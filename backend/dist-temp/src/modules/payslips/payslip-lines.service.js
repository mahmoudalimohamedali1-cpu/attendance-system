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
var PayslipLinesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayslipLinesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
let PayslipLinesService = PayslipLinesService_1 = class PayslipLinesService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(PayslipLinesService_1.name);
    }
    normalizeMoney(amount) {
        return Math.round(amount * 100) / 100;
    }
    mergeLinesByComponent(lines) {
        if (!lines || lines.length === 0)
            return [];
        const map = new Map();
        for (const line of lines) {
            const key = `${line.componentId}:${line.sign}`;
            if (map.has(key)) {
                const existing = map.get(key);
                existing.amount = this.normalizeMoney(existing.amount + line.amount);
                if (line.units !== undefined) {
                    existing.units = (existing.units || 0) + line.units;
                }
                if (existing.rate !== line.rate) {
                    existing.rate = undefined;
                }
                existing.source = {
                    policyId: 'MERGED',
                    policyCode: 'MERGED',
                    ruleId: 'MERGED',
                    ruleCode: 'MERGED',
                };
                existing.descriptionAr = `${existing.componentName} - مجمّع`;
            }
            else {
                map.set(key, { ...line, amount: this.normalizeMoney(line.amount) });
            }
        }
        return Array.from(map.values());
    }
    async isRunLocked(runId) {
        const run = await this.prisma.payrollRun.findUnique({
            where: { id: runId },
            select: { lockedAt: true }
        });
        return run?.lockedAt !== null && run?.lockedAt !== undefined;
    }
    async guardNotLocked(runId) {
        if (!runId)
            return;
        if (await this.isRunLocked(runId)) {
            throw new common_1.ForbiddenException('لا يمكن تعديل قسيمة مرتبطة بـ Run مقفل. الـ Run مقفل ولا يسمح بالتعديلات.');
        }
    }
    async deletePolicyLines(payslipId) {
        const result = await this.prisma.payslipLine.deleteMany({
            where: {
                payslipId,
                sourceType: client_1.PayslipLineSource.POLICY
            }
        });
        return result.count;
    }
    async savePolicyLines(payslipId, policyLines, companyId) {
        const payslip = await this.prisma.payslip.findUnique({
            where: { id: payslipId },
            select: { id: true, runId: true, companyId: true }
        });
        if (!payslip) {
            throw new common_1.ForbiddenException('القسيمة غير موجودة');
        }
        if (payslip.companyId && payslip.companyId !== companyId) {
            throw new common_1.ForbiddenException('لا يمكن الوصول لقسيمة شركة أخرى');
        }
        await this.guardNotLocked(payslip.runId);
        const deleted = await this.deletePolicyLines(payslipId);
        if (deleted > 0) {
            this.logger.debug(`Deleted ${deleted} existing policy lines for payslip ${payslipId}`);
        }
        if (!policyLines || policyLines.length === 0) {
            return { inserted: 0, deleted };
        }
        const merged = this.mergeLinesByComponent(policyLines);
        const componentIds = [...new Set(merged.map(l => l.componentId).filter(Boolean))];
        if (componentIds.length > 0) {
            const validComponents = await this.prisma.salaryComponent.findMany({
                where: { id: { in: componentIds }, companyId },
                select: { id: true }
            });
            const validIds = new Set(validComponents.map(c => c.id));
            const invalid = componentIds.filter(id => !validIds.has(id));
            if (invalid.length > 0) {
                this.logger.warn(`Invalid component IDs for company ${companyId}: ${invalid.join(', ')}`);
            }
        }
        const validLines = merged.filter(l => l.componentId);
        if (validLines.length === 0) {
            return { inserted: 0, deleted };
        }
        await this.prisma.payslipLine.createMany({
            data: validLines.map(line => ({
                payslipId,
                componentId: line.componentId,
                sign: line.sign,
                amount: this.normalizeMoney(line.amount),
                sourceType: client_1.PayslipLineSource.POLICY,
                sourceRef: line.source.policyId === 'MERGED'
                    ? 'MERGED'
                    : `${line.source.policyId}:${line.source.ruleId}`,
                descriptionAr: line.descriptionAr || null,
                units: line.units !== undefined ? this.normalizeMoney(line.units) : null,
                rate: line.rate !== undefined ? line.rate : null,
            }))
        });
        this.logger.log(`Saved ${validLines.length} policy lines for payslip ${payslipId}`);
        return { inserted: validLines.length, deleted };
    }
    async ensurePayslip(runId, employeeId, companyId, periodId, calculationResult) {
        await this.guardNotLocked(runId);
        let payslip = await this.prisma.payslip.findFirst({
            where: { runId, employeeId },
            select: { id: true }
        });
        if (payslip) {
            await this.prisma.payslip.update({
                where: { id: payslip.id },
                data: {
                    baseSalary: this.normalizeMoney(calculationResult.baseSalary),
                    grossSalary: this.normalizeMoney(calculationResult.grossSalary),
                    totalDeductions: this.normalizeMoney(calculationResult.totalDeductions),
                    netSalary: this.normalizeMoney(calculationResult.netSalary),
                    calculationTrace: calculationResult.calculationTrace,
                }
            });
            return payslip.id;
        }
        const newPayslip = await this.prisma.payslip.create({
            data: {
                companyId,
                employeeId,
                periodId,
                runId,
                baseSalary: this.normalizeMoney(calculationResult.baseSalary),
                grossSalary: this.normalizeMoney(calculationResult.grossSalary),
                totalDeductions: this.normalizeMoney(calculationResult.totalDeductions),
                netSalary: this.normalizeMoney(calculationResult.netSalary),
                calculationTrace: calculationResult.calculationTrace,
                status: 'DRAFT',
            }
        });
        return newPayslip.id;
    }
};
exports.PayslipLinesService = PayslipLinesService;
exports.PayslipLinesService = PayslipLinesService = PayslipLinesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PayslipLinesService);
//# sourceMappingURL=payslip-lines.service.js.map