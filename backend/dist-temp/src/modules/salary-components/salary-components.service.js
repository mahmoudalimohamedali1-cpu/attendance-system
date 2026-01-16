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
exports.SalaryComponentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let SalaryComponentsService = class SalaryComponentsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, companyId) {
        const existing = await this.prisma.salaryComponent.findFirst({
            where: { code: dto.code, companyId },
        });
        if (existing) {
            throw new common_1.ConflictException('كود المكون مسجل مسبقاً في هذه الشركة');
        }
        return this.prisma.salaryComponent.create({
            data: { ...dto, companyId },
        });
    }
    async findAll(companyId) {
        return this.prisma.salaryComponent.findMany({
            where: { companyId },
            orderBy: { code: 'asc' },
        });
    }
    async findOne(id, companyId) {
        const component = await this.prisma.salaryComponent.findFirst({
            where: { id, companyId },
        });
        if (!component) {
            throw new common_1.NotFoundException('المكون غير موجود');
        }
        return component;
    }
    async update(id, companyId, dto) {
        await this.findOne(id, companyId);
        if (dto.code) {
            const existing = await this.prisma.salaryComponent.findFirst({
                where: { code: dto.code, companyId, id: { not: id } },
            });
            if (existing) {
                throw new common_1.ConflictException('كود المكون مستخدم من قبل مكون آخر في هذه الشركة');
            }
        }
        return this.prisma.salaryComponent.update({
            where: { id },
            data: dto,
        });
    }
    async remove(id, companyId) {
        const component = await this.findOne(id, companyId);
        const used = await this.prisma.salaryStructureLine.findFirst({
            where: { componentId: id, structure: { companyId } }
        });
        if (used) {
            throw new common_1.ConflictException('لا يمكن حذف المكون لأنه مستخدم في هياكل رواتب');
        }
        return this.prisma.salaryComponent.delete({
            where: { id },
        });
    }
};
exports.SalaryComponentsService = SalaryComponentsService;
exports.SalaryComponentsService = SalaryComponentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SalaryComponentsService);
//# sourceMappingURL=salary-components.service.js.map