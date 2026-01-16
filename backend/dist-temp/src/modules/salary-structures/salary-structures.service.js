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
exports.SalaryStructuresService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let SalaryStructuresService = class SalaryStructuresService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, companyId) {
        const { lines, ...rest } = dto;
        this.validateUniqueComponents(lines);
        return this.prisma.salaryStructure.create({
            data: {
                ...rest,
                companyId,
                lines: {
                    create: lines.map(line => ({
                        componentId: line.componentId,
                        amount: line.amount,
                        percentage: line.percentage,
                        priority: line.priority,
                    })),
                },
            },
            include: {
                lines: {
                    include: { component: true },
                },
            },
        });
    }
    async findAll(companyId) {
        return this.prisma.salaryStructure.findMany({
            where: { companyId, isActive: true },
            include: {
                lines: {
                    include: { component: true },
                    orderBy: { priority: 'asc' },
                },
                _count: { select: { assignments: true, lines: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id, companyId) {
        const structure = await this.prisma.salaryStructure.findFirst({
            where: { id, companyId },
            include: {
                lines: {
                    include: { component: true },
                    orderBy: { priority: 'asc' },
                },
            },
        });
        if (!structure) {
            throw new common_1.NotFoundException('هيكل الراتب غير موجود');
        }
        return structure;
    }
    async update(id, companyId, dto) {
        const { lines, ...rest } = dto;
        if (lines)
            this.validateUniqueComponents(lines);
        await this.findOne(id, companyId);
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.salaryStructure.update({
                where: { id },
                data: rest,
            });
            if (lines) {
                await tx.salaryStructureLine.deleteMany({
                    where: { structureId: id },
                });
                await tx.salaryStructureLine.createMany({
                    data: lines.map(line => ({
                        structureId: id,
                        componentId: line.componentId,
                        amount: line.amount,
                        percentage: line.percentage,
                        priority: line.priority || 0,
                    })),
                });
            }
            return tx.salaryStructure.findFirst({
                where: { id, companyId },
                include: {
                    lines: {
                        include: { component: true },
                        orderBy: { priority: 'asc' },
                    },
                },
            });
        });
    }
    async remove(id, companyId) {
        const structure = await this.findOne(id, companyId);
        const assigned = await this.prisma.employeeSalaryAssignment.findFirst({
            where: { structureId: id }
        });
        if (assigned) {
            return this.prisma.salaryStructure.update({
                where: { id },
                data: { isActive: false }
            });
        }
        return this.prisma.salaryStructure.delete({
            where: { id },
        });
    }
    validateUniqueComponents(lines) {
        const ids = lines.map(l => l.componentId);
        const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
        if (duplicate) {
            throw new common_1.BadRequestException('لا يمكن تكرار المكون في الهيكل الواحد');
        }
    }
};
exports.SalaryStructuresService = SalaryStructuresService;
exports.SalaryStructuresService = SalaryStructuresService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SalaryStructuresService);
//# sourceMappingURL=salary-structures.service.js.map