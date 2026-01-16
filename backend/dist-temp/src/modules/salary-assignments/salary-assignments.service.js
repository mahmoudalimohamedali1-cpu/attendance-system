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
exports.SalaryAssignmentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let SalaryAssignmentsService = class SalaryAssignmentsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, companyId) {
        const employee = await this.prisma.user.findFirst({ where: { id: dto.employeeId, companyId } });
        if (!employee)
            throw new common_1.NotFoundException('الموظف غير موجود');
        const structure = await this.prisma.salaryStructure.findFirst({ where: { id: dto.structureId, companyId } });
        if (!structure)
            throw new common_1.NotFoundException('هيكل الراتب غير موجود');
        return this.prisma.$transaction(async (tx) => {
            if (dto.isActive !== false) {
                await tx.employeeSalaryAssignment.updateMany({
                    where: { employeeId: dto.employeeId, isActive: true },
                    data: { isActive: false, endDate: new Date() },
                });
            }
            return tx.employeeSalaryAssignment.create({
                data: {
                    employeeId: dto.employeeId,
                    structureId: dto.structureId,
                    baseSalary: dto.baseSalary,
                    effectiveDate: new Date(dto.effectiveDate),
                    endDate: dto.endDate ? new Date(dto.endDate) : null,
                    isActive: dto.isActive ?? true,
                },
                include: {
                    structure: {
                        include: { lines: { include: { component: true } } }
                    }
                }
            });
        });
    }
    async findAll(companyId) {
        return this.prisma.employeeSalaryAssignment.findMany({
            where: { employee: { companyId } },
            include: {
                employee: {
                    select: { id: true, firstName: true, lastName: true, email: true, employeeCode: true }
                },
                structure: true,
            },
            orderBy: { effectiveDate: 'desc' },
        });
    }
    async findByEmployee(employeeId, companyId) {
        return this.prisma.employeeSalaryAssignment.findMany({
            where: { employeeId, employee: { companyId } },
            include: {
                structure: true,
            },
            orderBy: { effectiveDate: 'desc' },
        });
    }
    async findActive(employeeId, companyId) {
        return this.prisma.employeeSalaryAssignment.findFirst({
            where: { employeeId, isActive: true, employee: { companyId } },
            include: {
                structure: {
                    include: {
                        lines: {
                            include: { component: true },
                            orderBy: { priority: 'asc' },
                        },
                    },
                },
            },
        });
    }
    async remove(id, companyId) {
        const assignment = await this.prisma.employeeSalaryAssignment.findFirst({
            where: { id, employee: { companyId } }
        });
        if (!assignment)
            throw new common_1.NotFoundException('التخصيص غير موجود');
        return this.prisma.employeeSalaryAssignment.delete({
            where: { id },
        });
    }
};
exports.SalaryAssignmentsService = SalaryAssignmentsService;
exports.SalaryAssignmentsService = SalaryAssignmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SalaryAssignmentsService);
//# sourceMappingURL=salary-assignments.service.js.map