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
exports.CompaniesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let CompaniesService = class CompaniesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const existing = await this.prisma.company.findFirst({
            where: {
                OR: [
                    { name: dto.name },
                    dto.crNumber ? { crNumber: dto.crNumber } : undefined,
                    dto.taxId ? { taxId: dto.taxId } : undefined,
                ].filter(Boolean),
            },
        });
        if (existing) {
            throw new common_1.ConflictException('شركة بنفس الاسم أو السجل التجاري أو الرقم الضريبي موجودة بالفعل');
        }
        return this.prisma.company.create({
            data: dto,
        });
    }
    async findAll() {
        return this.prisma.company.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id) {
        const company = await this.prisma.company.findUnique({
            where: { id },
        });
        if (!company) {
            throw new common_1.NotFoundException('الشركة غير موجودة');
        }
        return company;
    }
    async update(id, dto) {
        await this.findOne(id);
        return this.prisma.company.update({
            where: { id },
            data: dto,
        });
    }
    async remove(id) {
        await this.findOne(id);
        const userCount = await this.prisma.user.count({ where: { companyId: id } });
        if (userCount > 0) {
            throw new common_1.ConflictException('لا يمكن حذف الشركة لوجود مستخدمين مرتبطين بها');
        }
        return this.prisma.company.delete({
            where: { id },
        });
    }
};
exports.CompaniesService = CompaniesService;
exports.CompaniesService = CompaniesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CompaniesService);
//# sourceMappingURL=companies.service.js.map