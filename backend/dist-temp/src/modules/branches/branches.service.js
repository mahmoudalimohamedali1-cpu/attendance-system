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
exports.BranchesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let BranchesService = class BranchesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createBranch(createBranchDto, companyId) {
        const branch = await this.prisma.branch.create({
            data: { ...createBranchDto, companyId },
        });
        await this.createDefaultSchedules(branch.id, companyId, createBranchDto.workingDays);
        return branch;
    }
    async findAllBranches(companyId) {
        return this.prisma.branch.findMany({
            where: { companyId },
            include: {
                departments: true,
                _count: {
                    select: { users: true, departments: true },
                },
            },
            orderBy: { name: 'asc' },
        });
    }
    async findBranchById(id) {
        const branch = await this.prisma.branch.findUnique({
            where: { id },
            include: {
                departments: true,
                schedules: true,
                _count: {
                    select: { users: true, departments: true },
                },
            },
        });
        if (!branch) {
            throw new common_1.NotFoundException('الفرع غير موجود');
        }
        return branch;
    }
    async updateBranch(id, updateBranchDto, companyId) {
        const branch = await this.prisma.branch.findFirst({
            where: { id, companyId }
        });
        if (!branch) {
            throw new common_1.NotFoundException('الفرع غير موجود');
        }
        return this.prisma.branch.update({
            where: { id },
            data: updateBranchDto,
        });
    }
    async deleteBranch(id) {
        const branch = await this.prisma.branch.findUnique({
            where: { id },
            include: { _count: { select: { users: true } } },
        });
        if (!branch) {
            throw new common_1.NotFoundException('الفرع غير موجود');
        }
        if (branch._count.users > 0) {
            throw new common_1.ConflictException('لا يمكن حذف فرع يحتوي على موظفين');
        }
        await this.prisma.workSchedule.deleteMany({ where: { branchId: id } });
        await this.prisma.department.deleteMany({ where: { branchId: id } });
        await this.prisma.branch.delete({ where: { id } });
        return { message: 'تم حذف الفرع بنجاح' };
    }
    async toggleBranchStatus(id, companyId) {
        const branch = await this.prisma.branch.findFirst({
            where: { id, companyId }
        });
        if (!branch) {
            throw new common_1.NotFoundException('الفرع غير موجود');
        }
        return this.prisma.branch.update({
            where: { id },
            data: { isActive: !branch.isActive },
        });
    }
    async createDepartment(createDepartmentDto, companyId) {
        const branch = await this.prisma.branch.findFirst({
            where: { id: createDepartmentDto.branchId, companyId },
        });
        if (!branch) {
            throw new common_1.NotFoundException('الفرع غير موجود');
        }
        return this.prisma.department.create({
            data: { ...createDepartmentDto, companyId },
        });
    }
    async findAllDepartments(companyId, branchId) {
        const where = { companyId };
        if (branchId)
            where.branchId = branchId;
        return this.prisma.department.findMany({
            where,
            include: {
                branch: { select: { id: true, name: true } },
                _count: {
                    select: { users: true },
                },
            },
            orderBy: { name: 'asc' },
        });
    }
    async updateDepartment(id, updateData) {
        const department = await this.prisma.department.findUnique({ where: { id } });
        if (!department) {
            throw new common_1.NotFoundException('القسم غير موجود');
        }
        return this.prisma.department.update({
            where: { id },
            data: updateData,
        });
    }
    async deleteDepartment(id) {
        const department = await this.prisma.department.findUnique({
            where: { id },
            include: { _count: { select: { users: true } } },
        });
        if (!department) {
            throw new common_1.NotFoundException('القسم غير موجود');
        }
        if (department._count.users > 0) {
            throw new common_1.ConflictException('لا يمكن حذف قسم يحتوي على موظفين');
        }
        await this.prisma.department.delete({ where: { id } });
        return { message: 'تم حذف القسم بنجاح' };
    }
    async updateBranchSchedule(branchId, schedules) {
        await this.prisma.workSchedule.deleteMany({ where: { branchId } });
        await this.prisma.workSchedule.createMany({
            data: schedules.map((s) => ({
                branchId,
                dayOfWeek: s.dayOfWeek,
                workStartTime: s.workStartTime,
                workEndTime: s.workEndTime,
                isWorkingDay: s.isWorkingDay ?? true,
            })),
        });
        return this.prisma.workSchedule.findMany({ where: { branchId } });
    }
    async getBranchSchedule(branchId, companyId) {
        const branch = await this.prisma.branch.findFirst({ where: { id: branchId, companyId } });
        if (!branch)
            throw new common_1.NotFoundException('الفرع غير موجود');
        return this.prisma.workSchedule.findMany({
            where: { branchId },
            orderBy: { dayOfWeek: 'asc' },
        });
    }
    async createDefaultSchedules(branchId, companyId, workingDaysStr) {
        const workingDays = workingDaysStr
            ? workingDaysStr.split(',').map(Number)
            : [0, 1, 2, 3, 4];
        const schedules = [];
        for (let day = 0; day <= 6; day++) {
            schedules.push({
                branchId,
                companyId,
                dayOfWeek: day,
                workStartTime: '09:00',
                workEndTime: '17:00',
                isWorkingDay: workingDays.includes(day),
            });
        }
        await this.prisma.workSchedule.createMany({ data: schedules });
    }
};
exports.BranchesService = BranchesService;
exports.BranchesService = BranchesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BranchesService);
//# sourceMappingURL=branches.service.js.map