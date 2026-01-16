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
exports.CostCentersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let CostCentersService = class CostCentersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, companyId) {
        const existing = await this.prisma.costCenter.findFirst({
            where: { companyId, code: dto.code },
        });
        if (existing) {
            throw new common_1.ConflictException(`مركز تكلفة بالكود "${dto.code}" موجود مسبقاً`);
        }
        let level = 1;
        let path = dto.code;
        if (dto.parentId) {
            const parent = await this.prisma.costCenter.findUnique({
                where: { id: dto.parentId },
            });
            if (!parent) {
                throw new common_1.NotFoundException('مركز التكلفة الأب غير موجود');
            }
            level = parent.level + 1;
            path = parent.path ? `${parent.path}/${dto.code}` : dto.code;
        }
        return this.prisma.costCenter.create({
            data: {
                companyId,
                code: dto.code,
                nameAr: dto.nameAr,
                nameEn: dto.nameEn,
                description: dto.description,
                type: dto.type || 'OPERATING',
                status: 'ACTIVE',
                parentId: dto.parentId,
                level,
                path,
                managerId: dto.managerId,
                effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
                effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
                isAllowOverbudget: dto.isAllowOverbudget || false,
            },
            include: {
                parent: { select: { id: true, code: true, nameAr: true } },
                children: { select: { id: true, code: true, nameAr: true } },
            },
        });
    }
    async findAll(companyId, filters) {
        const where = { companyId };
        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.type) {
            where.type = filters.type;
        }
        if (filters?.search) {
            where.OR = [
                { code: { contains: filters.search, mode: 'insensitive' } },
                { nameAr: { contains: filters.search, mode: 'insensitive' } },
                { nameEn: { contains: filters.search, mode: 'insensitive' } },
            ];
        }
        return this.prisma.costCenter.findMany({
            where,
            include: {
                parent: { select: { id: true, code: true, nameAr: true } },
                children: { select: { id: true, code: true, nameAr: true } },
                _count: { select: { users: true, allocations: true, budgets: true } },
            },
            orderBy: [{ level: 'asc' }, { code: 'asc' }],
        });
    }
    async findTree(companyId) {
        const costCenters = await this.prisma.costCenter.findMany({
            where: { companyId, status: 'ACTIVE' },
            include: {
                _count: { select: { users: true, allocations: true } },
            },
            orderBy: [{ level: 'asc' }, { code: 'asc' }],
        });
        const map = new Map();
        const roots = [];
        costCenters.forEach((cc) => {
            map.set(cc.id, { ...cc, children: [] });
        });
        costCenters.forEach((cc) => {
            const node = map.get(cc.id);
            if (cc.parentId && map.has(cc.parentId)) {
                map.get(cc.parentId).children.push(node);
            }
            else {
                roots.push(node);
            }
        });
        return roots;
    }
    async findOne(id, companyId) {
        const costCenter = await this.prisma.costCenter.findFirst({
            where: { id, companyId },
            include: {
                parent: { select: { id: true, code: true, nameAr: true } },
                children: { select: { id: true, code: true, nameAr: true, status: true } },
                users: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
                allocations: {
                    where: { isActive: true },
                    select: {
                        id: true,
                        userId: true,
                        percentage: true,
                        allocationType: true,
                        effectiveFrom: true,
                        effectiveTo: true,
                    },
                },
                budgets: {
                    orderBy: [{ year: 'desc' }, { month: 'desc' }],
                    take: 12,
                },
            },
        });
        if (!costCenter) {
            throw new common_1.NotFoundException('مركز التكلفة غير موجود');
        }
        return costCenter;
    }
    async update(id, dto, companyId) {
        const existing = await this.prisma.costCenter.findFirst({
            where: { id, companyId },
        });
        if (!existing) {
            throw new common_1.NotFoundException('مركز التكلفة غير موجود');
        }
        const updateData = { ...dto };
        if (dto.parentId !== undefined && dto.parentId !== existing.parentId) {
            if (dto.parentId) {
                if (dto.parentId === id) {
                    throw new common_1.BadRequestException('لا يمكن أن يكون مركز التكلفة أباً لنفسه');
                }
                const parent = await this.prisma.costCenter.findUnique({
                    where: { id: dto.parentId },
                });
                if (!parent) {
                    throw new common_1.NotFoundException('مركز التكلفة الأب غير موجود');
                }
                updateData.level = parent.level + 1;
                updateData.path = parent.path
                    ? `${parent.path}/${existing.code}`
                    : existing.code;
            }
            else {
                updateData.level = 1;
                updateData.path = existing.code;
            }
        }
        if (dto.effectiveTo) {
            updateData.effectiveTo = new Date(dto.effectiveTo);
        }
        return this.prisma.costCenter.update({
            where: { id },
            data: updateData,
            include: {
                parent: { select: { id: true, code: true, nameAr: true } },
                children: { select: { id: true, code: true, nameAr: true } },
            },
        });
    }
    async archive(id, companyId) {
        const existing = await this.prisma.costCenter.findFirst({
            where: { id, companyId },
            include: { _count: { select: { children: true } } },
        });
        if (!existing) {
            throw new common_1.NotFoundException('مركز التكلفة غير موجود');
        }
        if (existing._count.children > 0) {
            throw new common_1.BadRequestException('لا يمكن أرشفة مركز تكلفة له أبناء. قم بأرشفة الأبناء أولاً');
        }
        return this.prisma.costCenter.update({
            where: { id },
            data: { status: 'ARCHIVED', effectiveTo: new Date() },
        });
    }
    async createAllocation(dto, companyId) {
        if (!dto.costCenterId) {
            throw new common_1.BadRequestException('معرف مركز التكلفة مطلوب');
        }
        const [user, costCenter] = await Promise.all([
            this.prisma.user.findFirst({ where: { id: dto.userId, companyId } }),
            this.prisma.costCenter.findFirst({ where: { id: dto.costCenterId, companyId } }),
        ]);
        if (!user) {
            throw new common_1.NotFoundException('الموظف غير موجود');
        }
        if (!costCenter) {
            throw new common_1.NotFoundException('مركز التكلفة غير موجود');
        }
        const existingAllocations = await this.prisma.costCenterAllocation.findMany({
            where: { userId: dto.userId, isActive: true },
        });
        const currentTotal = existingAllocations.reduce((sum, a) => sum + Number(a.percentage), 0);
        if (currentTotal + dto.percentage > 100) {
            throw new common_1.BadRequestException(`مجموع النسب سيتجاوز 100%، النسبة المتاحة: ${100 - currentTotal}%`);
        }
        return this.prisma.costCenterAllocation.create({
            data: {
                companyId,
                userId: dto.userId,
                costCenterId: dto.costCenterId,
                percentage: dto.percentage,
                allocationType: dto.allocationType || 'POSITION',
                effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
                effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
                reason: dto.reason,
                isActive: true,
            },
            include: {
                costCenter: { select: { id: true, code: true, nameAr: true } },
            },
        });
    }
    async findAllocations(costCenterId, companyId) {
        return this.prisma.costCenterAllocation.findMany({
            where: { costCenterId, companyId, isActive: true },
            include: {
                costCenter: { select: { id: true, code: true, nameAr: true } },
            },
            orderBy: { percentage: 'desc' },
        });
    }
    async findUserAllocations(userId, companyId) {
        return this.prisma.costCenterAllocation.findMany({
            where: { userId, companyId, isActive: true },
            include: {
                costCenter: { select: { id: true, code: true, nameAr: true } },
            },
            orderBy: { percentage: 'desc' },
        });
    }
    async deactivateAllocation(allocationId, companyId) {
        const allocation = await this.prisma.costCenterAllocation.findFirst({
            where: { id: allocationId, companyId },
        });
        if (!allocation) {
            throw new common_1.NotFoundException('التوزيع غير موجود');
        }
        return this.prisma.costCenterAllocation.update({
            where: { id: allocationId },
            data: { isActive: false, effectiveTo: new Date() },
        });
    }
    async createBudget(dto, companyId) {
        if (!dto.costCenterId) {
            throw new common_1.BadRequestException('معرف مركز التكلفة مطلوب');
        }
        const costCenter = await this.prisma.costCenter.findFirst({
            where: { id: dto.costCenterId, companyId },
        });
        if (!costCenter) {
            throw new common_1.NotFoundException('مركز التكلفة غير موجود');
        }
        const existing = await this.prisma.costCenterBudget.findFirst({
            where: {
                costCenterId: dto.costCenterId,
                year: dto.year,
                month: dto.month || null,
            },
        });
        if (existing) {
            throw new common_1.ConflictException('ميزانية لهذه الفترة موجودة مسبقاً');
        }
        return this.prisma.costCenterBudget.create({
            data: {
                companyId,
                costCenterId: dto.costCenterId,
                year: dto.year,
                month: dto.month,
                quarter: dto.quarter,
                budgetAmount: dto.budgetAmount,
                actualAmount: 0,
                variance: dto.budgetAmount,
                notes: dto.notes,
            },
            include: {
                costCenter: { select: { id: true, code: true, nameAr: true } },
            },
        });
    }
    async findBudgets(costCenterId, year) {
        const where = { costCenterId };
        if (year) {
            where.year = year;
        }
        return this.prisma.costCenterBudget.findMany({
            where,
            orderBy: [{ year: 'desc' }, { month: 'asc' }],
        });
    }
    async updateBudgetActual(budgetId, actualAmount) {
        const budget = await this.prisma.costCenterBudget.findUnique({
            where: { id: budgetId },
        });
        if (!budget) {
            throw new common_1.NotFoundException('الميزانية غير موجودة');
        }
        const variance = Number(budget.budgetAmount) - actualAmount;
        return this.prisma.costCenterBudget.update({
            where: { id: budgetId },
            data: { actualAmount, variance },
        });
    }
    async getAnalytics(costCenterId, companyId) {
        const [costCenter, employees, budgets, allocations] = await Promise.all([
            this.prisma.costCenter.findFirst({
                where: { id: costCenterId, companyId },
                include: {
                    _count: { select: { users: true, children: true } },
                },
            }),
            this.prisma.user.count({ where: { costCenterId, companyId } }),
            this.prisma.costCenterBudget.findMany({
                where: { costCenterId },
                orderBy: [{ year: 'desc' }, { month: 'asc' }],
                take: 12,
            }),
            this.prisma.costCenterAllocation.aggregate({
                where: { costCenterId, isActive: true },
                _sum: { percentage: true },
                _count: true,
            }),
        ]);
        if (!costCenter) {
            throw new common_1.NotFoundException('مركز التكلفة غير موجود');
        }
        const totalBudget = budgets.reduce((sum, b) => sum + Number(b.budgetAmount), 0);
        const totalActual = budgets.reduce((sum, b) => sum + Number(b.actualAmount), 0);
        const totalVariance = totalBudget - totalActual;
        const utilizationRate = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
        return {
            costCenter,
            summary: {
                directEmployees: employees,
                childrenCount: costCenter._count.children,
                allocationsCount: allocations._count,
                totalAllocationPercentage: Number(allocations._sum.percentage) || 0,
            },
            budget: {
                totalBudget,
                totalActual,
                totalVariance,
                utilizationRate: Math.round(utilizationRate * 100) / 100,
                periods: budgets,
            },
        };
    }
    async getEmployeesByCostCenter(costCenterId, companyId) {
        const directEmployees = await this.prisma.user.findMany({
            where: { costCenterId, companyId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
                jobTitle: true,
                salary: true,
            },
        });
        const allocatedEmployees = await this.prisma.costCenterAllocation.findMany({
            where: { costCenterId, companyId, isActive: true },
            select: {
                userId: true,
                percentage: true,
            },
        });
        const allocatedUserIds = allocatedEmployees.map((a) => a.userId);
        const allocatedUsers = await this.prisma.user.findMany({
            where: { id: { in: allocatedUserIds } },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
                jobTitle: true,
                salary: true,
            },
        });
        return {
            direct: directEmployees,
            allocated: allocatedUsers.map((u) => ({
                ...u,
                percentage: allocatedEmployees.find((a) => a.userId === u.id)?.percentage,
            })),
        };
    }
};
exports.CostCentersService = CostCentersService;
exports.CostCentersService = CostCentersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CostCentersService);
//# sourceMappingURL=cost-centers.service.js.map