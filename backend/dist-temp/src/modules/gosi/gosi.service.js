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
exports.GosiService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let GosiService = class GosiService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, companyId) {
        return this.prisma.$transaction(async (tx) => {
            if (dto.isActive !== false) {
                await tx.gosiConfig.updateMany({
                    where: { isActive: true, companyId },
                    data: { isActive: false }
                });
            }
            return tx.gosiConfig.create({
                data: {
                    ...dto,
                    companyId,
                }
            });
        });
    }
    async getActiveConfig(companyId) {
        const config = await this.prisma.gosiConfig.findFirst({
            where: { isActive: true, companyId },
            orderBy: { createdAt: 'desc' }
        });
        return config;
    }
    async findAll(companyId) {
        return this.prisma.gosiConfig.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' }
        });
    }
    async update(id, dto, companyId, userId) {
        const existing = await this.prisma.gosiConfig.findFirst({
            where: { id, companyId }
        });
        if (!existing)
            throw new common_1.NotFoundException('الإعداد غير موجود');
        if (dto.isActive === true) {
            await this.prisma.gosiConfig.updateMany({
                where: { isActive: true, companyId, id: { not: id } },
                data: { isActive: false }
            });
        }
        const updated = await this.prisma.gosiConfig.update({
            where: { id },
            data: dto
        });
        console.log(`[GOSI AUDIT] Config ${id} updated by ${userId || 'SYSTEM'}:`, {
            previousRates: {
                employeeRate: existing.employeeRate,
                employerRate: existing.employerRate,
                maxCapAmount: existing.maxCapAmount,
            },
            newRates: {
                employeeRate: dto.employeeRate ?? existing.employeeRate,
                employerRate: dto.employerRate ?? existing.employerRate,
                maxCapAmount: dto.maxCapAmount ?? existing.maxCapAmount,
            },
            timestamp: new Date().toISOString(),
        });
        return updated;
    }
};
exports.GosiService = GosiService;
exports.GosiService = GosiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GosiService);
//# sourceMappingURL=gosi.service.js.map