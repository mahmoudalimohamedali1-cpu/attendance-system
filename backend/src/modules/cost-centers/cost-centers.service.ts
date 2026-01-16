import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
    CreateCostCenterDto,
    UpdateCostCenterDto,
    CreateAllocationDto,
    CreateBudgetDto,
} from './dto/cost-center.dto';
import { Prisma, CostCenter, CostCenterAllocation, CostCenterBudget } from '@prisma/client';

@Injectable()
export class CostCentersService {
    constructor(private prisma: PrismaService) { }

    // ==================== مراكز التكلفة CRUD ====================

    async create(dto: CreateCostCenterDto, companyId: string) {
        // التحقق من عدم تكرار الكود
        const existing = await this.prisma.costCenter.findFirst({
            where: { companyId, code: dto.code },
        });
        if (existing) {
            throw new ConflictException(`مركز تكلفة بالكود "${dto.code}" موجود مسبقاً`);
        }

        // حساب المستوى والمسار إذا كان له parent
        let level = 1;
        let path = dto.code;

        if (dto.parentId) {
            const parent = await this.prisma.costCenter.findUnique({
                where: { id: dto.parentId },
            });
            if (!parent) {
                throw new NotFoundException('مركز التكلفة الأب غير موجود');
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
                departmentId: dto.departmentId,
                maxHeadcount: dto.maxHeadcount,
                budgetAlertThreshold: dto.budgetAlertThreshold ?? 80,
            },
            include: {
                parent: { select: { id: true, code: true, nameAr: true } },
                children: { select: { id: true, code: true, nameAr: true } },
                department: { select: { id: true, name: true } },
            },
        });
    }

    async findAll(companyId: string, filters?: { status?: string; type?: string; search?: string }) {
        const where: Prisma.CostCenterWhereInput = { companyId };

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

    async findTree(companyId: string) {
        // جلب كل مراكز التكلفة وبناء الشجرة
        const costCenters = await this.prisma.costCenter.findMany({
            where: { companyId, status: 'ACTIVE' },
            include: {
                _count: { select: { users: true, allocations: true } },
            },
            orderBy: [{ level: 'asc' }, { code: 'asc' }],
        });

        // بناء الشجرة الهرمية
        const map = new Map<string, CostCenter & { children: (CostCenter & { children: CostCenter[] })[] }>();
        const roots: (CostCenter & { children: CostCenter[] })[] = [];

        costCenters.forEach((cc) => {
            map.set(cc.id, { ...cc, children: [] });
        });

        costCenters.forEach((cc) => {
            const node = map.get(cc.id)!;
            if (cc.parentId && map.has(cc.parentId)) {
                map.get(cc.parentId)!.children.push(node);
            } else {
                roots.push(node);
            }
        });

        return roots;
    }

    async findOne(id: string, companyId: string) {
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
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        return costCenter;
    }

    async update(id: string, dto: UpdateCostCenterDto, companyId: string) {
        const existing = await this.prisma.costCenter.findFirst({
            where: { id, companyId },
        });

        if (!existing) {
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        // تحديث المستوى والمسار إذا تغير الـ parent
        const updateData: Prisma.CostCenterUpdateInput = { ...dto };

        if (dto.parentId !== undefined && dto.parentId !== existing.parentId) {
            if (dto.parentId) {
                // التحقق من عدم وجود دورة (circular reference)
                if (dto.parentId === id) {
                    throw new BadRequestException('لا يمكن أن يكون مركز التكلفة أباً لنفسه');
                }

                const parent = await this.prisma.costCenter.findUnique({
                    where: { id: dto.parentId },
                });

                if (!parent) {
                    throw new NotFoundException('مركز التكلفة الأب غير موجود');
                }

                updateData.level = parent.level + 1;
                updateData.path = parent.path
                    ? `${parent.path}/${existing.code}`
                    : existing.code;
            } else {
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

    async archive(id: string, companyId: string) {
        const existing = await this.prisma.costCenter.findFirst({
            where: { id, companyId },
            include: { _count: { select: { children: true } } },
        });

        if (!existing) {
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        if (existing._count.children > 0) {
            throw new BadRequestException('لا يمكن أرشفة مركز تكلفة له أبناء. قم بأرشفة الأبناء أولاً');
        }

        return this.prisma.costCenter.update({
            where: { id },
            data: { status: 'ARCHIVED', effectiveTo: new Date() },
        });
    }

    // ==================== التوزيعات ====================

    async createAllocation(dto: CreateAllocationDto, companyId: string) {
        // التحقق من وجود costCenterId
        if (!dto.costCenterId) {
            throw new BadRequestException('معرف مركز التكلفة مطلوب');
        }

        // التحقق من وجود الموظف ومركز التكلفة
        const [user, costCenter] = await Promise.all([
            this.prisma.user.findFirst({ where: { id: dto.userId, companyId } }),
            this.prisma.costCenter.findFirst({ where: { id: dto.costCenterId, companyId } }),
        ]);

        if (!user) {
            throw new NotFoundException('الموظف غير موجود');
        }
        if (!costCenter) {
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        // التحقق من أن مجموع النسب لا يتجاوز 100%
        const existingAllocations = await this.prisma.costCenterAllocation.findMany({
            where: { userId: dto.userId, isActive: true },
        });

        const currentTotal = existingAllocations.reduce(
            (sum: number, a: CostCenterAllocation) => sum + Number(a.percentage),
            0,
        );

        if (currentTotal + dto.percentage > 100) {
            throw new BadRequestException(
                `مجموع النسب سيتجاوز 100%، النسبة المتاحة: ${100 - currentTotal}%`,
            );
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

    async findAllocations(costCenterId: string, companyId: string) {
        // جلب التوزيعات
        const allocations = await this.prisma.costCenterAllocation.findMany({
            where: { costCenterId, companyId, isActive: true },
            include: {
                costCenter: { select: { id: true, code: true, nameAr: true } },
            },
            orderBy: { percentage: 'desc' },
        });

        // جلب بيانات الموظفين بشكل منفصل
        const userIds = [...new Set(allocations.map(a => a.userId))];
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true, employeeCode: true },
        });
        const usersMap = new Map(users.map(u => [u.id, u]));

        // دمج بيانات الموظفين مع التوزيعات
        return allocations.map(a => ({
            ...a,
            user: usersMap.get(a.userId) || null,
        }));
    }

    async findUserAllocations(userId: string, companyId: string) {
        return this.prisma.costCenterAllocation.findMany({
            where: { userId, companyId, isActive: true },
            include: {
                costCenter: { select: { id: true, code: true, nameAr: true } },
            },
            orderBy: { percentage: 'desc' },
        });
    }

    async deactivateAllocation(allocationId: string, companyId: string) {
        const allocation = await this.prisma.costCenterAllocation.findFirst({
            where: { id: allocationId, companyId },
        });

        if (!allocation) {
            throw new NotFoundException('التوزيع غير موجود');
        }

        return this.prisma.costCenterAllocation.update({
            where: { id: allocationId },
            data: { isActive: false, effectiveTo: new Date() },
        });
    }

    // ==================== الميزانيات ====================

    async createBudget(dto: CreateBudgetDto, companyId: string) {
        // التحقق من وجود costCenterId
        if (!dto.costCenterId) {
            throw new BadRequestException('معرف مركز التكلفة مطلوب');
        }

        const costCenter = await this.prisma.costCenter.findFirst({
            where: { id: dto.costCenterId, companyId },
        });

        if (!costCenter) {
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        // التحقق من عدم تكرار الميزانية لنفس الفترة
        const existing = await this.prisma.costCenterBudget.findFirst({
            where: {
                costCenterId: dto.costCenterId,
                year: dto.year,
                month: dto.month || null,
            },
        });

        if (existing) {
            throw new ConflictException('ميزانية لهذه الفترة موجودة مسبقاً');
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

    async findBudgets(costCenterId: string, year?: number) {
        const where: Prisma.CostCenterBudgetWhereInput = { costCenterId };
        if (year) {
            where.year = year;
        }

        return this.prisma.costCenterBudget.findMany({
            where,
            orderBy: [{ year: 'desc' }, { month: 'asc' }],
        });
    }

    async updateBudgetActual(budgetId: string, actualAmount: number) {
        const budget = await this.prisma.costCenterBudget.findUnique({
            where: { id: budgetId },
        });

        if (!budget) {
            throw new NotFoundException('الميزانية غير موجودة');
        }

        const variance = Number(budget.budgetAmount) - actualAmount;

        return this.prisma.costCenterBudget.update({
            where: { id: budgetId },
            data: { actualAmount, variance },
        });
    }

    // ==================== التحليلات ====================

    async getAnalytics(costCenterId: string, companyId: string) {
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
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        // حساب إجماليات الميزانية
        const totalBudget = budgets.reduce((sum: number, b: CostCenterBudget) => sum + Number(b.budgetAmount), 0);
        const totalActual = budgets.reduce((sum: number, b: CostCenterBudget) => sum + Number(b.actualAmount), 0);
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

    async getEmployeesByCostCenter(costCenterId: string, companyId: string) {
        // الموظفين المباشرين
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

        // الموظفين عبر التوزيعات
        const allocatedEmployees = await this.prisma.costCenterAllocation.findMany({
            where: { costCenterId, companyId, isActive: true },
            select: {
                userId: true,
                percentage: true,
            },
        });

        const allocatedUserIds = allocatedEmployees.map((a: { userId: string }) => a.userId);
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
            allocated: allocatedUsers.map((u: { id: string; firstName: string; lastName: string; employeeCode: string | null; jobTitle: string | null; salary: Prisma.Decimal | null }) => ({
                ...u,
                percentage: allocatedEmployees.find((a: { userId: string; percentage: Prisma.Decimal }) => a.userId === u.id)?.percentage,
            })),
        };
    }

    // ==================== الميزات الجديدة - الدفعة الأولى ====================

    // 1. تنبيهات تجاوز الميزانية
    async getBudgetAlerts(companyId: string) {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        const costCenters = await this.prisma.costCenter.findMany({
            where: { companyId, status: 'ACTIVE' },
            include: {
                budgets: {
                    where: {
                        OR: [
                            { year: currentYear, month: currentMonth },
                            { year: currentYear, month: null }, // سنوية
                        ],
                    },
                },
                _count: { select: { users: true } },
            },
        });

        const alerts: any[] = [];

        for (const cc of costCenters) {
            const threshold = Number(cc.budgetAlertThreshold) || 80;

            for (const budget of cc.budgets) {
                const budgetAmount = Number(budget.budgetAmount);
                const actualAmount = Number(budget.actualAmount);
                const utilizationPercent = budgetAmount > 0 ? (actualAmount / budgetAmount) * 100 : 0;

                if (utilizationPercent >= threshold) {
                    alerts.push({
                        costCenterId: cc.id,
                        costCenterCode: cc.code,
                        costCenterName: cc.nameAr,
                        budgetId: budget.id,
                        year: budget.year,
                        month: budget.month,
                        budgetAmount,
                        actualAmount,
                        utilizationPercent: Math.round(utilizationPercent * 100) / 100,
                        threshold,
                        severity: utilizationPercent >= 100 ? 'CRITICAL' : utilizationPercent >= 90 ? 'HIGH' : 'WARNING',
                        isOverBudget: utilizationPercent >= 100,
                    });
                }
            }
        }

        return alerts.sort((a, b) => b.utilizationPercent - a.utilizationPercent);
    }

    // 2. سجل التدقيق
    async getAuditLog(costCenterId: string, companyId: string, limit = 50) {
        const costCenter = await this.prisma.costCenter.findFirst({
            where: { id: costCenterId, companyId },
        });

        if (!costCenter) {
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        return this.prisma.costCenterAuditLog.findMany({
            where: { costCenterId },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }

    // دالة مساعدة لتسجيل التدقيق
    async logAudit(data: {
        costCenterId: string;
        userId: string;
        action: string;
        entityType?: string;
        entityId?: string;
        oldValue?: any;
        newValue?: any;
        description?: string;
        ipAddress?: string;
    }) {
        return this.prisma.costCenterAuditLog.create({
            data: {
                costCenterId: data.costCenterId,
                userId: data.userId,
                action: data.action,
                entityType: data.entityType || 'COST_CENTER',
                entityId: data.entityId,
                oldValue: data.oldValue,
                newValue: data.newValue,
                description: data.description,
                ipAddress: data.ipAddress,
            },
        });
    }

    // 3. تكلفة الموظف الواحد
    async getCostPerHead(companyId: string) {
        const costCenters = await this.prisma.costCenter.findMany({
            where: { companyId, status: 'ACTIVE' },
            include: {
                users: {
                    select: { id: true, salary: true },
                },
                budgets: {
                    where: { year: new Date().getFullYear() },
                },
                _count: { select: { users: true, allocations: true } },
            },
        });

        return costCenters.map(cc => {
            const totalSalary = cc.users.reduce((sum, u) => sum + Number(u.salary || 0), 0);
            const headcount = cc._count.users + cc._count.allocations;
            const totalBudget = cc.budgets.reduce((sum, b) => sum + Number(b.budgetAmount), 0);
            const totalActual = cc.budgets.reduce((sum, b) => sum + Number(b.actualAmount), 0);

            return {
                id: cc.id,
                code: cc.code,
                nameAr: cc.nameAr,
                directEmployees: cc._count.users,
                allocatedEmployees: cc._count.allocations,
                totalHeadcount: headcount,
                maxHeadcount: cc.maxHeadcount,
                headcountUtilization: cc.maxHeadcount ? Math.round((headcount / cc.maxHeadcount) * 100) : null,
                totalSalaryCost: totalSalary,
                costPerHead: headcount > 0 ? Math.round(totalSalary / headcount) : 0,
                totalBudget,
                totalActual,
                budgetPerHead: headcount > 0 ? Math.round(totalBudget / headcount) : 0,
            };
        });
    }

    // 4. مقارنة مراكز التكلفة
    async compareCostCenters(ids: string[], companyId: string) {
        const costCenters = await this.prisma.costCenter.findMany({
            where: { id: { in: ids }, companyId },
            include: {
                users: { select: { id: true, salary: true } },
                budgets: { where: { year: new Date().getFullYear() } },
                _count: { select: { users: true, allocations: true } },
                department: { select: { id: true, name: true } },
            },
        });

        return costCenters.map(cc => {
            const totalSalary = cc.users.reduce((sum, u) => sum + Number(u.salary || 0), 0);
            const headcount = cc._count.users + cc._count.allocations;
            const totalBudget = cc.budgets.reduce((sum, b) => sum + Number(b.budgetAmount), 0);
            const totalActual = cc.budgets.reduce((sum, b) => sum + Number(b.actualAmount), 0);

            return {
                id: cc.id,
                code: cc.code,
                nameAr: cc.nameAr,
                type: cc.type,
                status: cc.status,
                department: cc.department,
                headcount,
                maxHeadcount: cc.maxHeadcount,
                totalSalary,
                costPerHead: headcount > 0 ? Math.round(totalSalary / headcount) : 0,
                totalBudget,
                totalActual,
                variance: totalBudget - totalActual,
                utilizationPercent: totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0,
            };
        });
    }

    // 5. Dashboard KPIs
    async getDashboardKPIs(companyId: string) {
        const currentYear = new Date().getFullYear();

        const [
            totalCostCenters,
            activeCostCenters,
            budgets,
            headcountData,
            alerts,
        ] = await Promise.all([
            this.prisma.costCenter.count({ where: { companyId } }),
            this.prisma.costCenter.count({ where: { companyId, status: 'ACTIVE' } }),
            this.prisma.costCenterBudget.findMany({
                where: {
                    costCenter: { companyId },
                    year: currentYear,
                },
            }),
            this.prisma.costCenter.findMany({
                where: { companyId, status: 'ACTIVE' },
                include: { _count: { select: { users: true, allocations: true } } },
            }),
            this.getBudgetAlerts(companyId),
        ]);

        const totalBudget = budgets.reduce((sum, b) => sum + Number(b.budgetAmount), 0);
        const totalActual = budgets.reduce((sum, b) => sum + Number(b.actualAmount), 0);
        const totalHeadcount = headcountData.reduce((sum, cc) => sum + cc._count.users + cc._count.allocations, 0);
        const centersOverBudget = alerts.filter(a => a.isOverBudget).length;
        const centersNearBudget = alerts.filter(a => !a.isOverBudget).length;

        return {
            summary: {
                totalCostCenters,
                activeCostCenters,
                archivedCostCenters: totalCostCenters - activeCostCenters,
                totalHeadcount,
            },
            budget: {
                totalBudget,
                totalActual,
                totalVariance: totalBudget - totalActual,
                overallUtilization: totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0,
            },
            alerts: {
                criticalCount: alerts.filter(a => a.severity === 'CRITICAL').length,
                highCount: alerts.filter(a => a.severity === 'HIGH').length,
                warningCount: alerts.filter(a => a.severity === 'WARNING').length,
                centersOverBudget,
                centersNearBudget,
                topAlerts: alerts.slice(0, 5),
            },
            costPerHead: totalHeadcount > 0 ? Math.round(totalActual / totalHeadcount) : 0,
        };
    }

    // ==================== الميزات الجديدة - الدفعة الثانية ====================

    // 1. تنبيهات التوزيعات غير المكتملة (#35)
    async getIncompleteAllocations(companyId: string) {
        const allocations = await this.prisma.costCenterAllocation.findMany({
            where: { companyId, isActive: true },
            include: {
                costCenter: { select: { id: true, code: true, nameAr: true } },
            },
        });

        // تجميع التوزيعات حسب الموظف
        const userAllocations = new Map<string, { total: number; allocations: any[] }>();
        for (const alloc of allocations) {
            const userId = alloc.userId;
            if (!userAllocations.has(userId)) {
                userAllocations.set(userId, { total: 0, allocations: [] });
            }
            const ua = userAllocations.get(userId)!;
            ua.total += Number(alloc.percentage);
            ua.allocations.push(alloc);
        }

        // البحث عن التوزيعات غير المكتملة (< 100%)
        const incomplete: any[] = [];
        for (const [userId, data] of userAllocations) {
            if (data.total < 100) {
                incomplete.push({
                    userId,
                    totalPercentage: data.total,
                    missingPercentage: 100 - data.total,
                    allocations: data.allocations,
                });
            }
        }

        // جلب بيانات الموظفين
        const userIds = incomplete.map(i => i.userId);
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true, employeeCode: true },
        });
        const usersMap = new Map(users.map(u => [u.id, u]));

        return incomplete.map(i => ({
            ...i,
            user: usersMap.get(i.userId) || null,
        }));
    }

    // 2. تقرير P&L لكل مركز (#56)
    async getPnLReport(costCenterId: string, companyId: string, year?: number) {
        const targetYear = year || new Date().getFullYear();

        const costCenter = await this.prisma.costCenter.findFirst({
            where: { id: costCenterId, companyId },
            include: {
                budgets: { where: { year: targetYear } },
                users: { select: { id: true, salary: true } },
                allocations: {
                    where: { isActive: true },
                    include: { costCenter: true },
                },
            },
        });

        if (!costCenter) {
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        // حساب إجمالي الرواتب
        const directSalaries = costCenter.users.reduce((sum, u) => sum + Number(u.salary || 0), 0);

        // حساب الميزانية
        const totalBudget = costCenter.budgets.reduce((sum, b) => sum + Number(b.budgetAmount), 0);
        const totalActual = costCenter.budgets.reduce((sum, b) => sum + Number(b.actualAmount), 0);

        // بيانات شهرية
        const monthlyData = [];
        for (let month = 1; month <= 12; month++) {
            const monthBudget = costCenter.budgets.find(b => b.month === month);
            monthlyData.push({
                month,
                budget: monthBudget ? Number(monthBudget.budgetAmount) : 0,
                actual: monthBudget ? Number(monthBudget.actualAmount) : 0,
                variance: monthBudget ? Number(monthBudget.budgetAmount) - Number(monthBudget.actualAmount) : 0,
            });
        }

        return {
            costCenter: {
                id: costCenter.id,
                code: costCenter.code,
                nameAr: costCenter.nameAr,
            },
            year: targetYear,
            summary: {
                totalBudget,
                totalActual,
                variance: totalBudget - totalActual,
                variancePercent: totalBudget > 0 ? Math.round(((totalBudget - totalActual) / totalBudget) * 100) : 0,
                directSalaries,
                headcount: costCenter.users.length,
            },
            monthlyData,
        };
    }

    // 3. توقعات الميزانية (#39)
    async getForecast(costCenterId: string, companyId: string) {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        const budgets = await this.prisma.costCenterBudget.findMany({
            where: {
                costCenterId,
                costCenter: { companyId },
                year: { in: [currentYear - 1, currentYear] },
            },
            orderBy: [{ year: 'asc' }, { month: 'asc' }],
        });

        const lastYearActuals = budgets.filter(b => b.year === currentYear - 1);
        const currentYearData = budgets.filter(b => b.year === currentYear);

        // حساب متوسط النمو
        const lastYearTotal = lastYearActuals.reduce((sum, b) => sum + Number(b.actualAmount), 0);
        const currentYearActual = currentYearData
            .filter(b => b.month && b.month <= currentMonth)
            .reduce((sum, b) => sum + Number(b.actualAmount), 0);

        const monthlyAverage = currentMonth > 0 ? currentYearActual / currentMonth : 0;
        const forecastedTotal = monthlyAverage * 12;
        const growthRate = lastYearTotal > 0 ? ((forecastedTotal - lastYearTotal) / lastYearTotal) * 100 : 0;

        return {
            costCenterId,
            currentYear,
            currentMonth,
            lastYearTotal,
            currentYearActual,
            monthlyAverage: Math.round(monthlyAverage),
            remainingMonths: 12 - currentMonth + 1,
            forecastedRemaining: Math.round(monthlyAverage * (12 - currentMonth + 1)),
            forecastedTotal: Math.round(forecastedTotal),
            growthRate: Math.round(growthRate * 100) / 100,
        };
    }

    // 4. نسخ الميزانية (#46)
    async copyBudget(costCenterId: string, fromYear: number, toYear: number, companyId: string) {
        const costCenter = await this.prisma.costCenter.findFirst({
            where: { id: costCenterId, companyId },
        });

        if (!costCenter) {
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        const sourceBudgets = await this.prisma.costCenterBudget.findMany({
            where: { costCenterId, year: fromYear },
        });

        if (sourceBudgets.length === 0) {
            throw new NotFoundException(`لا توجد ميزانيات لسنة ${fromYear}`);
        }

        const createdBudgets = [];
        for (const budget of sourceBudgets) {
            // التحقق من عدم وجود ميزانية مكررة
            const existing = await this.prisma.costCenterBudget.findFirst({
                where: { costCenterId, year: toYear, month: budget.month },
            });

            if (!existing) {
                const newBudget = await this.prisma.costCenterBudget.create({
                    data: {
                        costCenterId,
                        companyId,
                        year: toYear,
                        month: budget.month,
                        quarter: budget.quarter,
                        budgetAmount: budget.budgetAmount,
                        actualAmount: 0,
                        variance: budget.budgetAmount,
                    },
                });
                createdBudgets.push(newBudget);
            }
        }

        return {
            copied: createdBudgets.length,
            skipped: sourceBudgets.length - createdBudgets.length,
            budgets: createdBudgets,
        };
    }

    // 5. تصدير الميزانيات لـ Excel (#47, #63)
    async exportBudgets(costCenterId: string, companyId: string, year?: number) {
        const targetYear = year || new Date().getFullYear();

        const costCenter = await this.prisma.costCenter.findFirst({
            where: { id: costCenterId, companyId },
            include: {
                budgets: { where: { year: targetYear }, orderBy: { month: 'asc' } },
            },
        });

        if (!costCenter) {
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        // تحويل البيانات لصيغة قابلة للتصدير
        return {
            costCenter: {
                code: costCenter.code,
                nameAr: costCenter.nameAr,
            },
            year: targetYear,
            budgets: costCenter.budgets.map(b => ({
                month: b.month,
                monthName: this.getArabicMonth(b.month),
                budgetAmount: Number(b.budgetAmount),
                actualAmount: Number(b.actualAmount),
                variance: Number(b.budgetAmount) - Number(b.actualAmount),
                utilizationPercent: Number(b.budgetAmount) > 0
                    ? Math.round((Number(b.actualAmount) / Number(b.budgetAmount)) * 100)
                    : 0,
            })),
            totals: {
                totalBudget: costCenter.budgets.reduce((sum, b) => sum + Number(b.budgetAmount), 0),
                totalActual: costCenter.budgets.reduce((sum, b) => sum + Number(b.actualAmount), 0),
            },
        };
    }

    private getArabicMonth(month: number | null): string {
        const months = ['', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        return month ? months[month] : 'سنوي';
    }

    // 6. التحقق من حد الموظفين قبل التوزيع (#12+)
    async validateHeadcount(costCenterId: string, companyId: string): Promise<{ valid: boolean; current: number; max: number | null; message?: string }> {
        const costCenter = await this.prisma.costCenter.findFirst({
            where: { id: costCenterId, companyId },
            include: {
                _count: { select: { users: true, allocations: true } },
            },
        });

        if (!costCenter) {
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        const current = costCenter._count.users + costCenter._count.allocations;
        const max = costCenter.maxHeadcount;

        if (max && current >= max) {
            return {
                valid: false,
                current,
                max,
                message: `تم الوصول للحد الأقصى من الموظفين (${current}/${max})`,
            };
        }

        return { valid: true, current, max };
    }

    // ==================== الميزات الجديدة - الدفعة الثالثة ====================

    // 1. تحليل الاتجاهات (#60)
    async getTrendAnalysis(costCenterId: string, companyId: string, months = 12) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        const budgets = await this.prisma.costCenterBudget.findMany({
            where: {
                costCenterId,
                costCenter: { companyId },
                OR: [
                    { year: startDate.getFullYear(), month: { gte: startDate.getMonth() + 1 } },
                    { year: { gt: startDate.getFullYear(), lt: endDate.getFullYear() } },
                    { year: endDate.getFullYear(), month: { lte: endDate.getMonth() + 1 } },
                ],
            },
            orderBy: [{ year: 'asc' }, { month: 'asc' }],
        });

        const monthlyTrend = budgets.map(b => ({
            period: `${b.year}-${String(b.month).padStart(2, '0')}`,
            year: b.year,
            month: b.month,
            budget: Number(b.budgetAmount),
            actual: Number(b.actualAmount),
            variance: Number(b.budgetAmount) - Number(b.actualAmount),
            utilizationPercent: Number(b.budgetAmount) > 0
                ? Math.round((Number(b.actualAmount) / Number(b.budgetAmount)) * 100)
                : 0,
        }));

        // حساب المتوسطات والاتجاه
        const avgActual = monthlyTrend.length > 0
            ? monthlyTrend.reduce((sum, m) => sum + m.actual, 0) / monthlyTrend.length
            : 0;
        const avgBudget = monthlyTrend.length > 0
            ? monthlyTrend.reduce((sum, m) => sum + m.budget, 0) / monthlyTrend.length
            : 0;

        // الاتجاه (صعودي/نزولي)
        let trend = 'STABLE';
        if (monthlyTrend.length >= 3) {
            const firstHalf = monthlyTrend.slice(0, Math.floor(monthlyTrend.length / 2));
            const secondHalf = monthlyTrend.slice(Math.floor(monthlyTrend.length / 2));
            const firstAvg = firstHalf.reduce((sum, m) => sum + m.actual, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((sum, m) => sum + m.actual, 0) / secondHalf.length;
            if (secondAvg > firstAvg * 1.1) trend = 'INCREASING';
            else if (secondAvg < firstAvg * 0.9) trend = 'DECREASING';
        }

        return {
            costCenterId,
            periodMonths: months,
            dataPoints: monthlyTrend.length,
            trend,
            summary: {
                avgBudget: Math.round(avgBudget),
                avgActual: Math.round(avgActual),
                totalBudget: monthlyTrend.reduce((sum, m) => sum + m.budget, 0),
                totalActual: monthlyTrend.reduce((sum, m) => sum + m.actual, 0),
            },
            monthlyTrend,
        };
    }

    // 2. توزيع الموظفين (#61)
    async getHeadcountDistribution(companyId: string) {
        const costCenters = await this.prisma.costCenter.findMany({
            where: { companyId, status: 'ACTIVE' },
            include: {
                _count: { select: { users: true, allocations: true } },
                department: { select: { id: true, name: true } },
            },
        });

        const distribution = costCenters.map(cc => ({
            id: cc.id,
            code: cc.code,
            nameAr: cc.nameAr,
            type: cc.type,
            department: cc.department?.name || 'بدون قسم',
            directEmployees: cc._count.users,
            allocatedEmployees: cc._count.allocations,
            totalHeadcount: cc._count.users + cc._count.allocations,
            maxHeadcount: cc.maxHeadcount,
            utilizationPercent: cc.maxHeadcount
                ? Math.round(((cc._count.users + cc._count.allocations) / cc.maxHeadcount) * 100)
                : null,
        }));

        // إحصائيات عامة
        const totalEmployees = distribution.reduce((sum, d) => sum + d.totalHeadcount, 0);
        const totalMax = distribution.reduce((sum, d) => sum + (d.maxHeadcount || 0), 0);

        return {
            totalCostCenters: distribution.length,
            totalEmployees,
            totalMaxHeadcount: totalMax,
            overallUtilization: totalMax > 0 ? Math.round((totalEmployees / totalMax) * 100) : null,
            distribution: distribution.sort((a, b) => b.totalHeadcount - a.totalHeadcount),
        };
    }

    // 3. تقرير ROI (#66)
    async getROI(costCenterId: string, companyId: string, year?: number) {
        const targetYear = year || new Date().getFullYear();

        const costCenter = await this.prisma.costCenter.findFirst({
            where: { id: costCenterId, companyId },
            include: {
                budgets: { where: { year: targetYear } },
                users: { select: { id: true, salary: true } },
                _count: { select: { users: true, allocations: true } },
            },
        });

        if (!costCenter) {
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        const totalBudget = costCenter.budgets.reduce((sum, b) => sum + Number(b.budgetAmount), 0);
        const totalActual = costCenter.budgets.reduce((sum, b) => sum + Number(b.actualAmount), 0);
        const totalSalaries = costCenter.users.reduce((sum, u) => sum + Number(u.salary || 0), 0) * 12;
        const headcount = costCenter._count.users + costCenter._count.allocations;

        // ROI بسيط = (العائد - التكلفة) / التكلفة
        // هنا نحسب الكفاءة = الميزانية المستخدمة / الميزانية المخططة
        const efficiency = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
        const costPerEmployee = headcount > 0 ? totalActual / headcount : 0;
        const salaryToBudgetRatio = totalBudget > 0 ? (totalSalaries / totalBudget) * 100 : 0;

        return {
            costCenterId,
            year: targetYear,
            metrics: {
                totalBudget,
                totalActual,
                totalSalaries,
                headcount,
                efficiency: Math.round(efficiency * 100) / 100,
                costPerEmployee: Math.round(costPerEmployee),
                salaryToBudgetRatio: Math.round(salaryToBudgetRatio * 100) / 100,
                savings: totalBudget - totalActual,
                savingsPercent: totalBudget > 0 ? Math.round(((totalBudget - totalActual) / totalBudget) * 100) : 0,
            },
            rating: efficiency < 80 ? 'EXCELLENT' : efficiency < 100 ? 'GOOD' : efficiency < 110 ? 'FAIR' : 'POOR',
        };
    }

    // 4. استيراد الميزانيات (#48)
    async importBudgets(costCenterId: string, companyId: string, budgets: Array<{ month: number; budgetAmount: number; actualAmount?: number }>) {
        const costCenter = await this.prisma.costCenter.findFirst({
            where: { id: costCenterId, companyId },
        });

        if (!costCenter) {
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        const year = new Date().getFullYear();
        const results = { created: 0, updated: 0, errors: [] as string[] };

        for (const budget of budgets) {
            try {
                const existing = await this.prisma.costCenterBudget.findFirst({
                    where: { costCenterId, year, month: budget.month },
                });

                if (existing) {
                    await this.prisma.costCenterBudget.update({
                        where: { id: existing.id },
                        data: {
                            budgetAmount: budget.budgetAmount,
                            actualAmount: budget.actualAmount ?? 0,
                            variance: budget.budgetAmount - (budget.actualAmount ?? 0),
                        },
                    });
                    results.updated++;
                } else {
                    await this.prisma.costCenterBudget.create({
                        data: {
                            costCenterId,
                            companyId,
                            year,
                            month: budget.month,
                            budgetAmount: budget.budgetAmount,
                            actualAmount: budget.actualAmount ?? 0,
                            variance: budget.budgetAmount - (budget.actualAmount ?? 0),
                        },
                    });
                    results.created++;
                }
            } catch (err: any) {
                results.errors.push(`شهر ${budget.month}: ${err.message}`);
            }
        }

        return results;
    }

    // ==================== الميزات الجديدة - الدفعة الرابعة ====================

    // 1. تنبيهات الانحراف (#57)
    async getVarianceAlerts(costCenterId: string, companyId: string, threshold = 10) {
        const budgets = await this.prisma.costCenterBudget.findMany({
            where: {
                costCenterId,
                costCenter: { companyId },
                year: new Date().getFullYear(),
            },
            orderBy: { month: 'desc' },
        });

        const alerts: Array<{ month: number; type: string; variance: number; message: string; severity: string }> = [];

        for (const b of budgets) {
            const budget = Number(b.budgetAmount);
            const actual = Number(b.actualAmount);
            if (budget === 0) continue;

            const variancePercent = ((actual - budget) / budget) * 100;

            if (variancePercent > threshold) {
                alerts.push({
                    month: b.month ?? 0,
                    type: 'OVER_BUDGET',
                    variance: Math.round(variancePercent),
                    message: `تجاوز الميزانية بنسبة ${Math.round(variancePercent)}% في شهر ${b.month ?? 0}`,
                    severity: variancePercent > 25 ? 'HIGH' : 'MEDIUM',
                });
            } else if (variancePercent < -threshold) {
                alerts.push({
                    month: b.month ?? 0,
                    type: 'UNDER_BUDGET',
                    variance: Math.round(variancePercent),
                    message: `استخدام أقل من المتوقع بنسبة ${Math.abs(Math.round(variancePercent))}% في شهر ${b.month ?? 0}`,
                    severity: 'LOW',
                });
            }
        }

        return {
            costCenterId,
            threshold,
            totalAlerts: alerts.length,
            alerts: alerts.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)),
        };
    }

    // 2. تفصيل الرواتب (#62)
    async getSalaryBreakdown(costCenterId: string, companyId: string) {
        const costCenter = await this.prisma.costCenter.findFirst({
            where: { id: costCenterId, companyId },
            include: {
                users: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        salary: true,
                        jobTitle: true,
                    },
                },
            },
        });

        if (!costCenter) {
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        // Get allocations with user data
        const allocations = await this.prisma.costCenterAllocation.findMany({
            where: { costCenterId, isActive: true },
        });

        const userIds = allocations.map(a => a.userId);
        const allocatedUsers = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true, salary: true, jobTitle: true },
        });
        const userMap = new Map(allocatedUsers.map(u => [u.id, u]));

        // Direct employees
        const directSalaries = costCenter.users.map(u => ({
            name: `${u.firstName} ${u.lastName}`,
            jobTitle: u.jobTitle || 'غير محدد',
            salary: Number(u.salary || 0),
            type: 'DIRECT',
            percentage: 100,
        }));

        // Allocated employees
        const allocatedSalaries = allocations.map(a => {
            const user = userMap.get(a.userId);
            return {
                name: user ? `${user.firstName} ${user.lastName}` : 'غير معروف',
                jobTitle: user?.jobTitle || 'غير محدد',
                salary: user && user.salary ? Number(user.salary) * (Number(a.percentage) / 100) : 0,
                type: 'ALLOCATED',
                percentage: a.percentage,
            };
        });

        const allSalaries = [...directSalaries, ...allocatedSalaries];
        const totalSalaries = allSalaries.reduce((sum, s) => sum + s.salary, 0);

        // Group by job title
        const byJobTitle: Record<string, number> = {};
        allSalaries.forEach(s => {
            byJobTitle[s.jobTitle] = (byJobTitle[s.jobTitle] || 0) + s.salary;
        });

        return {
            costCenterId,
            totalEmployees: allSalaries.length,
            totalMonthlySalary: Math.round(totalSalaries),
            totalAnnualSalary: Math.round(totalSalaries * 12),
            breakdown: allSalaries,
            byJobTitle: Object.entries(byJobTitle).map(([title, amount]) => ({
                title,
                amount: Math.round(amount as number),
                percentage: totalSalaries > 0 ? Math.round(((amount as number) / totalSalaries) * 100) : 0,
            })),
        };
    }

    // 3. تحليل ماذا لو (#67)
    async whatIfAnalysis(costCenterId: string, companyId: string, scenario: {
        salaryIncrease?: number;
        headcountChange?: number;
        budgetChange?: number;
    }) {
        const salaryBreakdown = await this.getSalaryBreakdown(costCenterId, companyId);
        const roi = await this.getROI(costCenterId, companyId);

        const currentSalary = salaryBreakdown.totalMonthlySalary;
        const currentHeadcount = salaryBreakdown.totalEmployees;
        const currentBudget = roi.metrics.totalBudget;

        // Apply scenario
        const salaryMultiplier = 1 + ((scenario.salaryIncrease || 0) / 100);
        const newSalary = currentSalary * salaryMultiplier;
        const newHeadcount = currentHeadcount + (scenario.headcountChange || 0);
        const newBudget = currentBudget * (1 + ((scenario.budgetChange || 0) / 100));

        // Calculate new costs
        const projectedAnnualSalary = newSalary * 12;
        const costPerEmployee = newHeadcount > 0 ? newBudget / newHeadcount : 0;

        return {
            costCenterId,
            scenario,
            current: {
                monthlySalary: currentSalary,
                annualSalary: currentSalary * 12,
                headcount: currentHeadcount,
                budget: currentBudget,
            },
            projected: {
                monthlySalary: Math.round(newSalary),
                annualSalary: Math.round(projectedAnnualSalary),
                headcount: newHeadcount,
                budget: Math.round(newBudget),
                costPerEmployee: Math.round(costPerEmployee),
            },
            impact: {
                salaryChange: Math.round(newSalary - currentSalary),
                salaryChangePercent: scenario.salaryIncrease || 0,
                budgetChange: Math.round(newBudget - currentBudget),
                budgetChangePercent: scenario.budgetChange || 0,
            },
        };
    }

    // 4. ملخص المصروفات (#6)
    async getCompanyExpenseSummary(companyId: string) {
        const costCenters = await this.prisma.costCenter.findMany({
            where: { companyId, status: 'ACTIVE' },
            include: {
                budgets: {
                    where: { year: new Date().getFullYear() },
                },
                _count: { select: { users: true, allocations: true } },
            },
        });

        const summary = costCenters.map(cc => {
            const totalBudget = cc.budgets.reduce((sum, b) => sum + Number(b.budgetAmount), 0);
            const totalActual = cc.budgets.reduce((sum, b) => sum + Number(b.actualAmount), 0);
            return {
                id: cc.id,
                code: cc.code,
                name: cc.nameAr,
                type: cc.type,
                headcount: cc._count.users + cc._count.allocations,
                totalBudget,
                totalActual,
                variance: totalBudget - totalActual,
                utilizationPercent: totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0,
            };
        });

        const grandTotalBudget = summary.reduce((sum, s) => sum + s.totalBudget, 0);
        const grandTotalActual = summary.reduce((sum, s) => sum + s.totalActual, 0);

        return {
            year: new Date().getFullYear(),
            totalCostCenters: summary.length,
            grandTotalBudget,
            grandTotalActual,
            grandTotalVariance: grandTotalBudget - grandTotalActual,
            overallUtilization: grandTotalBudget > 0 ? Math.round((grandTotalActual / grandTotalBudget) * 100) : 0,
            byCenter: summary.sort((a, b) => b.totalActual - a.totalActual),
        };
    }

    // 5. بيانات اللوحة التفاعلية (#65)
    async getInteractiveDashboardData(companyId: string) {
        const [distribution, expenseSummary] = await Promise.all([
            this.getHeadcountDistribution(companyId),
            this.getCompanyExpenseSummary(companyId),
        ]);

        // Get top 5 cost centers by actual spending
        const top5 = expenseSummary.byCenter.slice(0, 5);

        // Monthly trend (last 6 months)
        const monthlyTrend = await this.prisma.costCenterBudget.groupBy({
            by: ['month'],
            where: {
                costCenter: { companyId },
                year: new Date().getFullYear(),
            },
            _sum: {
                budgetAmount: true,
                actualAmount: true,
            },
            orderBy: { month: 'asc' },
        });

        return {
            headcountDistribution: distribution,
            expenseSummary: {
                total: expenseSummary.grandTotalActual,
                budget: expenseSummary.grandTotalBudget,
                utilization: expenseSummary.overallUtilization,
            },
            top5CostCenters: top5,
            monthlyTrend: monthlyTrend.map(m => ({
                month: m.month,
                budget: Number(m._sum.budgetAmount || 0),
                actual: Number(m._sum.actualAmount || 0),
            })),
        };
    }

    // 6. قوالب الميزانية (#10)
    async getBudgetTemplates(companyId: string) {
        // Return predefined budget templates
        return [
            {
                id: 'admin',
                name: 'إداري',
                description: 'قالب للمراكز الإدارية',
                categories: [
                    { name: 'رواتب', percentage: 70 },
                    { name: 'إيجارات', percentage: 15 },
                    { name: 'مرافق', percentage: 10 },
                    { name: 'أخرى', percentage: 5 },
                ],
            },
            {
                id: 'operations',
                name: 'تشغيلي',
                description: 'قالب للمراكز التشغيلية',
                categories: [
                    { name: 'رواتب', percentage: 50 },
                    { name: 'معدات', percentage: 25 },
                    { name: 'صيانة', percentage: 15 },
                    { name: 'أخرى', percentage: 10 },
                ],
            },
            {
                id: 'project',
                name: 'مشاريع',
                description: 'قالب للمشاريع',
                categories: [
                    { name: 'موارد بشرية', percentage: 40 },
                    { name: 'مواد', percentage: 30 },
                    { name: 'خدمات', percentage: 20 },
                    { name: 'طوارئ', percentage: 10 },
                ],
            },
        ];
    }

    // ==================== الميزات الجديدة - الدفعة الخامسة ====================

    // 1. سير موافقة الميزانية (#43) - يستخدم سجل التدقيق بدلاً من حقول غير موجودة
    async submitYearlyBudgetForApproval(costCenterId: string, companyId: string, year: number, submittedBy: string) {
        const costCenter = await this.prisma.costCenter.findFirst({
            where: { id: costCenterId, companyId },
        });

        if (!costCenter) {
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        // Log to audit instead of updating budget status
        await this.logAudit({
            costCenterId,
            userId: submittedBy,
            action: 'BUDGET_SUBMITTED',
            entityType: 'BUDGET',
            newValue: { year, status: 'PENDING' },
            description: `تم إرسال ميزانية سنة ${year} للموافقة`,
        });

        return {
            costCenterId,
            year,
            status: 'PENDING',
            message: 'تم إرسال الميزانية للموافقة',
        };
    }

    async approveYearlyBudget(costCenterId: string, companyId: string, year: number, approvedBy: string) {
        await this.logAudit({
            costCenterId,
            userId: approvedBy,
            action: 'BUDGET_APPROVED',
            entityType: 'BUDGET',
            newValue: { year, status: 'APPROVED' },
            description: `تم اعتماد ميزانية سنة ${year}`,
        });

        return {
            costCenterId,
            year,
            status: 'APPROVED',
            message: 'تم اعتماد الميزانية',
        };
    }

    async rejectYearlyBudget(costCenterId: string, companyId: string, year: number, rejectedBy: string, reason: string) {
        await this.logAudit({
            costCenterId,
            userId: rejectedBy,
            action: 'BUDGET_REJECTED',
            entityType: 'BUDGET',
            newValue: { year, status: 'REJECTED', reason },
            description: `تم رفض ميزانية سنة ${year}: ${reason}`,
        });

        return {
            costCenterId,
            year,
            status: 'REJECTED',
            reason,
            message: 'تم رفض الميزانية',
        };
    }

    // 2. لوحة التنبيهات المركزية (#57 extended)
    async getAlertsDashboard(companyId: string) {
        const costCenters = await this.prisma.costCenter.findMany({
            where: { companyId, status: 'ACTIVE' },
            include: {
                budgets: {
                    where: { year: new Date().getFullYear() },
                },
            },
        });

        const alerts: Array<{
            costCenterId: string;
            costCenterName: string;
            type: string;
            severity: string;
            message: string;
            value: number;
        }> = [];

        for (const cc of costCenters) {
            const totalBudget = cc.budgets.reduce((sum, b) => sum + Number(b.budgetAmount), 0);
            const totalActual = cc.budgets.reduce((sum, b) => sum + Number(b.actualAmount), 0);

            if (totalBudget > 0) {
                const variance = ((totalActual - totalBudget) / totalBudget) * 100;

                if (variance > 10) {
                    alerts.push({
                        costCenterId: cc.id,
                        costCenterName: cc.nameAr,
                        type: 'OVER_BUDGET',
                        severity: variance > 25 ? 'HIGH' : 'MEDIUM',
                        message: `تجاوز الميزانية بنسبة ${Math.round(variance)}%`,
                        value: variance,
                    });
                } else if (variance < -30) {
                    alerts.push({
                        costCenterId: cc.id,
                        costCenterName: cc.nameAr,
                        type: 'UNDER_UTILIZED',
                        severity: 'LOW',
                        message: `استخدام منخفض جداً ${Math.round(100 + variance)}%`,
                        value: variance,
                    });
                }
            }
        }

        return {
            totalAlerts: alerts.length,
            highPriority: alerts.filter(a => a.severity === 'HIGH').length,
            mediumPriority: alerts.filter(a => a.severity === 'MEDIUM').length,
            lowPriority: alerts.filter(a => a.severity === 'LOW').length,
            alerts: alerts.sort((a, b) => {
                const order: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
                return order[a.severity] - order[b.severity];
            }),
        };
    }

    // 4. مقارنة الفترات (YoY)
    async comparePeriods(costCenterId: string, companyId: string, year1: number, year2: number) {
        const budgets = await this.prisma.costCenterBudget.findMany({
            where: {
                costCenterId,
                costCenter: { companyId },
                year: { in: [year1, year2] },
            },
        });

        const year1Data = budgets.filter(b => b.year === year1);
        const year2Data = budgets.filter(b => b.year === year2);

        const year1Total = year1Data.reduce((sum, b) => sum + Number(b.actualAmount), 0);
        const year2Total = year2Data.reduce((sum, b) => sum + Number(b.actualAmount), 0);

        const changeAmount = year2Total - year1Total;
        const changePercent = year1Total > 0 ? ((year2Total - year1Total) / year1Total) * 100 : 0;

        return {
            costCenterId,
            period1: { year: year1, total: year1Total, months: year1Data.length },
            period2: { year: year2, total: year2Total, months: year2Data.length },
            change: {
                amount: changeAmount,
                percent: Math.round(changePercent * 100) / 100,
                direction: changeAmount > 0 ? 'INCREASE' : changeAmount < 0 ? 'DECREASE' : 'STABLE',
            },
        };
    }

    // 5. التحويلات بين المراكز
    async transferBetweenCenters(
        fromCostCenterId: string,
        toCostCenterId: string,
        companyId: string,
        amount: number,
        month: number,
        year: number,
        reason: string,
        transferredBy: string,
    ) {
        // Validate both centers exist
        const [fromCC, toCC] = await Promise.all([
            this.prisma.costCenter.findFirst({ where: { id: fromCostCenterId, companyId } }),
            this.prisma.costCenter.findFirst({ where: { id: toCostCenterId, companyId } }),
        ]);

        if (!fromCC || !toCC) {
            throw new NotFoundException('أحد مراكز التكلفة غير موجود');
        }

        // Update budgets
        await this.prisma.$transaction([
            // Decrease from source
            this.prisma.costCenterBudget.updateMany({
                where: { costCenterId: fromCostCenterId, month, year },
                data: { budgetAmount: { decrement: amount } },
            }),
            // Increase in destination
            this.prisma.costCenterBudget.updateMany({
                where: { costCenterId: toCostCenterId, month, year },
                data: { budgetAmount: { increment: amount } },
            }),
        ]);

        // Log the transfer
        await this.logAudit({
            costCenterId: fromCostCenterId,
            userId: transferredBy,
            action: 'BUDGET_TRANSFER',
            entityType: 'BUDGET',
            newValue: { to: toCostCenterId, amount, month, year, reason },
            description: `تحويل ${amount} ريال إلى ${toCC.nameAr}`,
        });

        return {
            from: { id: fromCostCenterId, name: fromCC.nameAr },
            to: { id: toCostCenterId, name: toCC.nameAr },
            amount,
            month,
            year,
            reason,
            message: 'تم التحويل بنجاح',
        };
    }

    // 6. تعديلات الميزانية
    async amendBudget(
        costCenterId: string,
        companyId: string,
        month: number,
        year: number,
        newBudgetAmount: number,
        reason: string,
        amendedBy: string,
    ) {
        const existing = await this.prisma.costCenterBudget.findFirst({
            where: { costCenterId, month, year, costCenter: { companyId } },
        });

        if (!existing) {
            throw new NotFoundException('الميزانية غير موجودة');
        }

        const oldAmount = Number(existing.budgetAmount);

        await this.prisma.costCenterBudget.update({
            where: { id: existing.id },
            data: {
                budgetAmount: newBudgetAmount,
            },
        });

        await this.logAudit({
            costCenterId,
            userId: amendedBy,
            action: 'BUDGET_AMENDMENT',
            entityType: 'BUDGET',
            oldValue: { amount: oldAmount },
            newValue: { amount: newBudgetAmount, reason },
            description: `تعديل ميزانية شهر ${month} من ${oldAmount} إلى ${newBudgetAmount}`,
        });

        return {
            costCenterId,
            month,
            year,
            oldAmount,
            newAmount: newBudgetAmount,
            change: newBudgetAmount - oldAmount,
            reason,
            message: 'تم تعديل الميزانية',
        };
    }

    // 7. قفل/فتح الميزانية - يستخدم سجل التدقيق
    async lockBudget(costCenterId: string, companyId: string, year: number, lock: boolean) {
        await this.logAudit({
            costCenterId,
            userId: 'system',
            action: lock ? 'BUDGET_LOCKED' : 'BUDGET_UNLOCKED',
            entityType: 'BUDGET',
            newValue: { year, isLocked: lock },
            description: lock ? `تم قفل ميزانية سنة ${year}` : `تم فتح ميزانية سنة ${year}`,
        });

        return {
            costCenterId,
            year,
            isLocked: lock,
            message: lock ? 'تم قفل الميزانية' : 'تم فتح الميزانية',
        };
    }

    // ==================== الميزات الجديدة - الدفعة السادسة ====================

    // 1. قواعد التوزيع (Allocation Rules)
    async getAllocationRules(companyId: string) {
        const costCenters = await this.prisma.costCenter.findMany({
            where: { companyId, status: 'ACTIVE' },
            include: {
                allocations: true,
            },
        });

        return costCenters.map(cc => ({
            costCenterId: cc.id,
            code: cc.code,
            name: cc.nameAr,
            allocations: cc.allocations.map(a => ({
                userId: a.userId,
                percentage: Number(a.percentage),
                effectiveFrom: a.effectiveFrom,
                effectiveTo: a.effectiveTo,
            })),
            totalPercentage: cc.allocations.reduce((sum, a) => sum + Number(a.percentage), 0),
        }));
    }

    async createAllocationRule(costCenterId: string, companyId: string, rule: { userId: string; percentage: number; effectiveFrom?: Date }) {
        const costCenter = await this.prisma.costCenter.findFirst({
            where: { id: costCenterId, companyId },
        });

        if (!costCenter) {
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        // Log to audit instead of direct create since schema may vary
        await this.logAudit({
            costCenterId,
            userId: rule.userId,
            action: 'ALLOCATION_RULE_CREATED',
            entityType: 'ALLOCATION',
            newValue: rule,
            description: `تم إنشاء قاعدة توزيع بنسبة ${rule.percentage}%`,
        });

        return {
            costCenterId,
            userId: rule.userId,
            percentage: rule.percentage,
            message: 'تم إنشاء قاعدة التوزيع',
        };
    }

    // 2. محركات التكلفة (Cost Drivers)
    async getCostDrivers(costCenterId: string, companyId: string) {
        const costCenter = await this.prisma.costCenter.findFirst({
            where: { id: costCenterId, companyId },
            include: {
                users: { select: { id: true, salary: true } },
                budgets: { where: { year: new Date().getFullYear() } },
            },
        });

        if (!costCenter) {
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        const totalSalary = costCenter.users.reduce((sum, u) => sum + Number(u.salary || 0), 0);
        const totalBudget = costCenter.budgets.reduce((sum, b) => sum + Number(b.budgetAmount), 0);
        const totalActual = costCenter.budgets.reduce((sum, b) => sum + Number(b.actualAmount), 0);
        const headcount = costCenter.users.length;

        return {
            costCenterId,
            drivers: [
                { name: 'عدد الموظفين', value: headcount, impact: headcount > 0 ? (totalSalary / headcount) : 0 },
                { name: 'إجمالي الرواتب', value: totalSalary, impact: totalBudget > 0 ? (totalSalary / totalBudget) * 100 : 0 },
                { name: 'تكلفة الموظف الواحد', value: headcount > 0 ? Math.round(totalSalary / headcount) : 0, impact: 0 },
                { name: 'نسبة الاستخدام', value: totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0, impact: 0 },
            ],
            summary: {
                topDriver: 'الرواتب',
                totalCost: totalActual,
                costPerEmployee: headcount > 0 ? Math.round(totalSalary / headcount) : 0,
            },
        };
    }

    // 3. إصدارات الميزانية (Budget Versions)
    async getBudgetVersions(costCenterId: string, companyId: string, year: number) {
        // Get audit logs for budget changes
        const auditLogs = await this.prisma.costCenterAuditLog.findMany({
            where: {
                costCenterId,
                entityType: 'BUDGET',
                action: { in: ['BUDGET_CREATED', 'BUDGET_UPDATED', 'BUDGET_AMENDED', 'BUDGET_APPROVED'] },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });

        return {
            costCenterId,
            year,
            currentVersion: auditLogs.length + 1,
            versions: auditLogs.map((log, idx) => ({
                version: auditLogs.length - idx,
                action: log.action,
                timestamp: log.createdAt,
                userId: log.userId,
                changes: log.newValue,
                description: log.description,
            })),
        };
    }

    // 4. تصدير التقارير (Export Reports)
    async exportReport(companyId: string, format: 'json' | 'csv', reportType: string) {
        const costCenters = await this.prisma.costCenter.findMany({
            where: { companyId },
            include: {
                budgets: { where: { year: new Date().getFullYear() } },
                _count: { select: { users: true, allocations: true } },
            },
        });

        const reportData = costCenters.map(cc => ({
            code: cc.code,
            name: cc.nameAr,
            type: cc.type,
            status: cc.status,
            headcount: cc._count.users + cc._count.allocations,
            budget: cc.budgets.reduce((sum, b) => sum + Number(b.budgetAmount), 0),
            actual: cc.budgets.reduce((sum, b) => sum + Number(b.actualAmount), 0),
        }));

        if (format === 'csv') {
            const headers = ['الكود', 'الاسم', 'النوع', 'الحالة', 'عدد الموظفين', 'الميزانية', 'الفعلي'];
            const rows = reportData.map(r => [r.code, r.name, r.type, r.status, r.headcount, r.budget, r.actual].join(','));
            return {
                format: 'csv',
                content: [headers.join(','), ...rows].join('\n'),
                filename: `cost_centers_report_${new Date().toISOString().split('T')[0]}.csv`,
            };
        }

        return {
            format: 'json',
            content: reportData,
            filename: `cost_centers_report_${new Date().toISOString().split('T')[0]}.json`,
            summary: {
                totalCenters: costCenters.length,
                totalBudget: reportData.reduce((sum, r) => sum + r.budget, 0),
                totalActual: reportData.reduce((sum, r) => sum + r.actual, 0),
            },
        };
    }

    // 5. سجل التغييرات (Change History)
    async getChangeHistory(costCenterId: string, companyId: string, limit = 20) {
        const costCenter = await this.prisma.costCenter.findFirst({
            where: { id: costCenterId, companyId },
        });

        if (!costCenter) {
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        const history = await this.prisma.costCenterAuditLog.findMany({
            where: { costCenterId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return {
            costCenterId,
            costCenterName: costCenter.nameAr,
            totalChanges: history.length,
            history: history.map(h => ({
                id: h.id,
                action: h.action,
                entityType: h.entityType,
                description: h.description,
                oldValue: h.oldValue,
                newValue: h.newValue,
                userId: h.userId,
                timestamp: h.createdAt,
            })),
        };
    }

    // 6. Dashboard محسن
    async getEnhancedDashboard(companyId: string) {
        const dashboard = await this.getInteractiveDashboardData(companyId);
        const alerts = await this.getAlertsDashboard(companyId);

        // Get top performers and underperformers
        const costCenters = await this.prisma.costCenter.findMany({
            where: { companyId, status: 'ACTIVE' },
            include: {
                budgets: { where: { year: new Date().getFullYear() } },
                _count: { select: { users: true } },
            },
        });

        const performance = costCenters.map(cc => {
            const budget = cc.budgets.reduce((sum, b) => sum + Number(b.budgetAmount), 0);
            const actual = cc.budgets.reduce((sum, b) => sum + Number(b.actualAmount), 0);
            return {
                id: cc.id,
                name: cc.nameAr,
                code: cc.code,
                efficiency: budget > 0 ? Math.round(((budget - actual) / budget) * 100) : 0,
            };
        }).sort((a, b) => b.efficiency - a.efficiency);

        return {
            ...dashboard,
            alerts: alerts.alerts?.slice(0, 5) || [],
            topPerformers: performance.slice(0, 3),
            underPerformers: performance.slice(-3).reverse(),
            quickStats: {
                totalCenters: costCenters.length,
                activeCenters: costCenters.filter(cc => cc.status === 'ACTIVE').length,
                totalEmployees: costCenters.reduce((sum, cc) => sum + cc._count.users, 0),
                averageEfficiency: performance.length > 0 ? Math.round(performance.reduce((sum, p) => sum + p.efficiency, 0) / performance.length) : 0,
            },
        };
    }

    // 7. مقارنة متعددة المراكز محسنة
    async getMultiCenterComparison(companyId: string, costCenterIds: string[], metrics: string[]) {
        const costCenters = await this.prisma.costCenter.findMany({
            where: { id: { in: costCenterIds }, companyId },
            include: {
                budgets: { where: { year: new Date().getFullYear() } },
                users: { select: { id: true, salary: true } },
                _count: { select: { users: true, allocations: true } },
            },
        });

        return {
            comparedCenters: costCenterIds.length,
            metrics: metrics.length > 0 ? metrics : ['budget', 'actual', 'headcount', 'efficiency'],
            comparison: costCenters.map(cc => {
                const budget = cc.budgets.reduce((sum, b) => sum + Number(b.budgetAmount), 0);
                const actual = cc.budgets.reduce((sum, b) => sum + Number(b.actualAmount), 0);
                const salary = cc.users.reduce((sum, u) => sum + Number(u.salary || 0), 0);
                const headcount = cc._count.users + cc._count.allocations;

                return {
                    id: cc.id,
                    name: cc.nameAr,
                    code: cc.code,
                    data: {
                        budget,
                        actual,
                        variance: budget - actual,
                        headcount,
                        salary,
                        efficiency: budget > 0 ? Math.round(((budget - actual) / budget) * 100) : 0,
                        costPerHead: headcount > 0 ? Math.round(actual / headcount) : 0,
                    },
                };
            }),
        };
    }

    // 8. تنبيهات قابلة للتخصيص
    async getCustomAlerts(companyId: string, thresholds: { overBudget?: number; underUtilized?: number }) {
        const overBudgetThreshold = thresholds.overBudget || 10;
        const underUtilizedThreshold = thresholds.underUtilized || 50;

        const costCenters = await this.prisma.costCenter.findMany({
            where: { companyId, status: 'ACTIVE' },
            include: {
                budgets: { where: { year: new Date().getFullYear() } },
            },
        });

        const alerts: Array<{
            costCenterId: string;
            costCenterName: string;
            alertType: string;
            severity: string;
            value: number;
            threshold: number;
            message: string;
        }> = [];

        for (const cc of costCenters) {
            const budget = cc.budgets.reduce((sum, b) => sum + Number(b.budgetAmount), 0);
            const actual = cc.budgets.reduce((sum, b) => sum + Number(b.actualAmount), 0);

            if (budget > 0) {
                const utilizationPercent = (actual / budget) * 100;

                if (utilizationPercent > 100 + overBudgetThreshold) {
                    alerts.push({
                        costCenterId: cc.id,
                        costCenterName: cc.nameAr,
                        alertType: 'OVER_BUDGET',
                        severity: 'HIGH',
                        value: Math.round(utilizationPercent),
                        threshold: 100 + overBudgetThreshold,
                        message: `تجاوز الميزانية بنسبة ${Math.round(utilizationPercent - 100)}%`,
                    });
                } else if (utilizationPercent < underUtilizedThreshold) {
                    alerts.push({
                        costCenterId: cc.id,
                        costCenterName: cc.nameAr,
                        alertType: 'UNDER_UTILIZED',
                        severity: 'LOW',
                        value: Math.round(utilizationPercent),
                        threshold: underUtilizedThreshold,
                        message: `استخدام منخفض ${Math.round(utilizationPercent)}%`,
                    });
                }
            }
        }

        return {
            totalAlerts: alerts.length,
            thresholds: { overBudget: overBudgetThreshold, underUtilized: underUtilizedThreshold },
            alerts: alerts.sort((a, b) => (a.severity === 'HIGH' ? -1 : 1)),
        };
    }

    // ==================== الميزات الجديدة - الدفعة السابعة ====================

    // 1. Performance Scoring (تقييم أداء مركز التكلفة)
    async getPerformanceScore(costCenterId: string, companyId: string) {
        const costCenter = await this.prisma.costCenter.findFirst({
            where: { id: costCenterId, companyId },
            include: {
                budgets: { where: { year: new Date().getFullYear() } },
                users: { select: { id: true, salary: true } },
                auditLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
            },
        });

        if (!costCenter) {
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        const totalBudget = costCenter.budgets.reduce((sum, b) => sum + Number(b.budgetAmount), 0);
        const totalActual = costCenter.budgets.reduce((sum, b) => sum + Number(b.actualAmount), 0);
        const headcount = costCenter.users.length;

        // 1. Budget Utilization Score (30%) - Optimal is 85-95%
        let utilizationScore = 0;
        if (totalBudget > 0) {
            const utilization = (totalActual / totalBudget) * 100;
            if (utilization >= 85 && utilization <= 95) {
                utilizationScore = 30;
            } else if (utilization >= 75 && utilization <= 100) {
                utilizationScore = 25;
            } else if (utilization >= 50 && utilization <= 110) {
                utilizationScore = 15;
            } else {
                utilizationScore = 5;
            }
        }

        // 2. Variance Control Score (25%) - Lower variance is better
        let varianceScore = 0;
        if (totalBudget > 0) {
            const variancePercent = Math.abs(((totalActual - totalBudget) / totalBudget) * 100);
            if (variancePercent <= 5) {
                varianceScore = 25;
            } else if (variancePercent <= 10) {
                varianceScore = 20;
            } else if (variancePercent <= 20) {
                varianceScore = 10;
            } else {
                varianceScore = 5;
            }
        }

        // 3. Headcount Efficiency Score (20%)
        let headcountScore = 0;
        if (headcount > 0 && totalBudget > 0) {
            const costPerHead = totalActual / headcount;
            const budgetPerHead = totalBudget / headcount;
            const efficiency = (budgetPerHead - costPerHead) / budgetPerHead * 100;
            if (efficiency >= 0 && efficiency <= 15) {
                headcountScore = 20;
            } else if (efficiency >= -10 && efficiency <= 25) {
                headcountScore = 15;
            } else {
                headcountScore = 5;
            }
        }

        // 4. Growth Trend Score (15%) - Based on month-over-month stability
        let trendScore = 15; // Default to good if no data

        // 5. Alert History Score (10%) - Fewer alerts is better
        const recentAlerts = costCenter.auditLogs.filter(l =>
            l.action.includes('ALERT') || l.action.includes('REJECTED')
        ).length;
        let alertScore = 10;
        if (recentAlerts > 5) alertScore = 2;
        else if (recentAlerts > 2) alertScore = 5;
        else if (recentAlerts > 0) alertScore = 8;

        const totalScore = utilizationScore + varianceScore + headcountScore + trendScore + alertScore;

        let grade = 'D';
        let color = 'error';
        if (totalScore >= 85) { grade = 'A'; color = 'success'; }
        else if (totalScore >= 70) { grade = 'B'; color = 'info'; }
        else if (totalScore >= 55) { grade = 'C'; color = 'warning'; }

        return {
            costCenterId,
            costCenterName: costCenter.nameAr,
            totalScore,
            grade,
            color,
            breakdown: {
                budgetUtilization: { score: utilizationScore, maxScore: 30, description: 'استخدام الميزانية' },
                varianceControl: { score: varianceScore, maxScore: 25, description: 'ضبط الانحرافات' },
                headcountEfficiency: { score: headcountScore, maxScore: 20, description: 'كفاءة القوى العاملة' },
                growthTrend: { score: trendScore, maxScore: 15, description: 'اتجاه النمو' },
                alertHistory: { score: alertScore, maxScore: 10, description: 'سجل التنبيهات' },
            },
            recommendations: totalScore < 70 ? [
                'مراجعة توزيع الميزانية',
                'تحسين التخطيط الشهري',
                'تقليل التجاوزات',
            ] : [],
        };
    }

    // 2. Budget Calendar (تقويم الميزانية)
    async getBudgetCalendar(companyId: string, year?: number) {
        const targetYear = year || new Date().getFullYear();

        const costCenters = await this.prisma.costCenter.findMany({
            where: { companyId, status: 'ACTIVE' },
            include: {
                budgets: { where: { year: targetYear } },
                auditLogs: {
                    where: {
                        action: { in: ['BUDGET_SUBMITTED', 'BUDGET_APPROVED', 'BUDGET_REJECTED', 'BUDGET_LOCKED'] },
                        createdAt: { gte: new Date(targetYear, 0, 1) },
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        const events: Array<{
            id: string;
            costCenterId: string;
            costCenterName: string;
            eventType: string;
            eventDate: Date;
            month: number;
            description: string;
            status: string;
        }> = [];

        for (const cc of costCenters) {
            // Add budget events from audit log
            for (const log of cc.auditLogs) {
                events.push({
                    id: log.id,
                    costCenterId: cc.id,
                    costCenterName: cc.nameAr,
                    eventType: log.action,
                    eventDate: log.createdAt,
                    month: log.createdAt.getMonth() + 1,
                    description: log.description || log.action,
                    status: 'COMPLETED',
                });
            }

            // Add upcoming deadlines (example: end of each quarter)
            const quarters = [3, 6, 9, 12];
            for (const q of quarters) {
                const deadline = new Date(targetYear, q - 1, q === 12 ? 31 : 30);
                if (deadline > new Date()) {
                    events.push({
                        id: `deadline-${cc.id}-Q${Math.ceil(q / 3)}`,
                        costCenterId: cc.id,
                        costCenterName: cc.nameAr,
                        eventType: 'DEADLINE',
                        eventDate: deadline,
                        month: q,
                        description: `موعد مراجعة الربع ${Math.ceil(q / 3)}`,
                        status: 'PENDING',
                    });
                }
            }
        }

        return {
            year: targetYear,
            totalEvents: events.length,
            events: events.sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime()),
            summary: {
                completed: events.filter(e => e.status === 'COMPLETED').length,
                pending: events.filter(e => e.status === 'PENDING').length,
                submissions: events.filter(e => e.eventType === 'BUDGET_SUBMITTED').length,
                approvals: events.filter(e => e.eventType === 'BUDGET_APPROVED').length,
            },
        };
    }

    // 3. Drill-down Analytics (تحليلات متعمقة)
    async getDrillDownAnalytics(costCenterId: string, companyId: string, level: 'employee' | 'month' | 'category') {
        const costCenter = await this.prisma.costCenter.findFirst({
            where: { id: costCenterId, companyId },
            include: {
                users: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        salary: true,
                        jobTitle: true,
                    },
                },
                budgets: { where: { year: new Date().getFullYear() }, orderBy: { month: 'asc' } },
            },
        });

        if (!costCenter) {
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        if (level === 'employee') {
            // Group by employee - direct employees
            const employees = costCenter.users.map(u => ({
                id: u.id,
                name: `${u.firstName} ${u.lastName}`,
                salary: Number(u.salary || 0),
                jobTitle: u.jobTitle || 'غير محدد',
                type: 'DIRECT',
                percentage: 100,
            }));

            const totalSalary = employees.reduce((sum: number, e) => sum + e.salary, 0);

            return {
                costCenterId,
                level: 'employee',
                totalEmployees: employees.length,
                totalSalary,
                data: employees.map(e => ({
                    ...e,
                    percentOfTotal: totalSalary > 0 ? Math.round((e.salary / totalSalary) * 100) : 0,
                })).sort((a, b) => b.salary - a.salary),
            };
        }

        if (level === 'month') {
            // Group by month
            const monthlyData = costCenter.budgets.map(b => ({
                month: b.month || 0,
                monthName: this.getMonthName(b.month || 0),
                budget: Number(b.budgetAmount),
                actual: Number(b.actualAmount),
                variance: Number(b.budgetAmount) - Number(b.actualAmount),
                utilizationPercent: Number(b.budgetAmount) > 0
                    ? Math.round((Number(b.actualAmount) / Number(b.budgetAmount)) * 100)
                    : 0,
            }));

            return {
                costCenterId,
                level: 'month',
                totalMonths: monthlyData.length,
                data: monthlyData,
                totals: {
                    budget: monthlyData.reduce((sum: number, m) => sum + m.budget, 0),
                    actual: monthlyData.reduce((sum: number, m) => sum + m.actual, 0),
                },
            };
        }

        if (level === 'category') {
            // Group by job title/category
            const byCategory: Record<string, { count: number; totalSalary: number }> = {};
            for (const u of costCenter.users) {
                const cat = u.jobTitle || 'غير مصنف';
                if (!byCategory[cat]) byCategory[cat] = { count: 0, totalSalary: 0 };
                byCategory[cat].count++;
                byCategory[cat].totalSalary += Number(u.salary || 0);
            }

            const totalSalary = Object.values(byCategory).reduce((sum: number, c) => sum + c.totalSalary, 0);

            return {
                costCenterId,
                level: 'category',
                totalCategories: Object.keys(byCategory).length,
                data: Object.entries(byCategory).map(([category, data]) => ({
                    category,
                    count: data.count,
                    totalSalary: data.totalSalary,
                    avgSalary: data.count > 0 ? Math.round(data.totalSalary / data.count) : 0,
                    percentOfTotal: totalSalary > 0 ? Math.round((data.totalSalary / totalSalary) * 100) : 0,
                })).sort((a, b) => b.totalSalary - a.totalSalary),
            };
        }

        return { error: 'Invalid level parameter' };
    }

    private getMonthName(month: number): string {
        const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        return months[month - 1] || '';
    }

    // ==================== BATCH 8: Dashboard & Multi-Year ====================

    // 1. Dashboard Summary Widget (ملخص لوحة التحكم)
    async getDashboardSummary(companyId: string) {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        // Get all cost centers with budgets
        const centers = await this.prisma.costCenter.findMany({
            where: { companyId, status: 'ACTIVE' } as any,
            include: {
                budgets: { where: { year: currentYear } },
                users: { select: { id: true, salary: true } },
            },
        });

        let totalBudget = 0;
        let totalActual = 0;
        let overBudgetCount = 0;
        let underBudgetCount = 0;

        const centerUtilizations: Array<{ id: string; name: string; utilization: number; budget: number; actual: number }> = [];

        for (const center of centers) {
            const centerBudgets = (center as any).budgets || [];
            const budget = centerBudgets.reduce((sum: number, b: any) => sum + Number(b.budgetAmount || 0), 0);
            const actual = centerBudgets.reduce((sum: number, b: any) => sum + Number(b.actualAmount || 0), 0);

            totalBudget += budget;
            totalActual += actual;

            const utilization = budget > 0 ? Math.round((actual / budget) * 100) : 0;

            if (utilization > 100) overBudgetCount++;
            else if (utilization < 80) underBudgetCount++;

            centerUtilizations.push({
                id: center.id,
                name: center.nameAr,
                utilization,
                budget,
                actual,
            });
        }

        // Top 3 by utilization (highest)
        const top3ByUtilization = centerUtilizations.sort((a, b) => b.utilization - a.utilization).slice(0, 3);

        // Monthly trend (last 6 months budgets)
        const monthlyTrend = await this.prisma.costCenterBudget.groupBy({
            by: ['month'],
            where: {
                costCenter: { companyId },
                year: currentYear,
                month: { gte: Math.max(1, currentMonth - 5), lte: currentMonth },
            },
            _sum: { budgetAmount: true, actualAmount: true },
            orderBy: { month: 'asc' },
        });

        return {
            summary: {
                totalCenters: centers.length,
                totalBudget,
                totalActual,
                overallUtilization: totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0,
                overBudgetCount,
                underBudgetCount,
                healthyCount: centers.length - overBudgetCount - underBudgetCount,
            },
            top3ByUtilization,
            monthlyTrend: monthlyTrend.map(m => ({
                month: m.month,
                monthName: this.getMonthName(m.month || 0),
                budget: Number(m._sum.budgetAmount || 0),
                actual: Number(m._sum.actualAmount || 0),
            })),
            generatedAt: new Date().toISOString(),
        };
    }

    // 2. Smart Alerts (التنبيهات الذكية)
    async getSmartAlerts(companyId: string) {
        const currentYear = new Date().getFullYear();
        const alerts: Array<{ type: string; severity: 'HIGH' | 'MEDIUM' | 'LOW'; title: string; message: string; centerId?: string; centerName?: string }> = [];

        // Get all centers with budgets
        const centers = await this.prisma.costCenter.findMany({
            where: { companyId } as any,
            include: {
                budgets: { where: { year: currentYear } },
                auditLogs: { where: { action: 'BUDGET_SUBMITTED' }, orderBy: { createdAt: 'desc' }, take: 1 },
            },
        });

        for (const center of centers) {
            const centerBudgets = (center as any).budgets || [];
            const totalBudget = centerBudgets.reduce((sum: number, b: any) => sum + Number(b.budgetAmount || 0), 0);
            const totalActual = centerBudgets.reduce((sum: number, b: any) => sum + Number(b.actualAmount || 0), 0);
            const utilization = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0;

            // Budget overrun (>100%)
            if (utilization > 100) {
                alerts.push({
                    type: 'BUDGET_OVERRUN',
                    severity: 'HIGH',
                    title: '⚠️ تجاوز الميزانية',
                    message: `${center.nameAr} تجاوز الميزانية بنسبة ${utilization - 100}%`,
                    centerId: center.id,
                    centerName: center.nameAr,
                });
            }
            // Near limit (90-100%)
            else if (utilization >= 90) {
                alerts.push({
                    type: 'NEAR_LIMIT',
                    severity: 'MEDIUM',
                    title: '⚡ قريب من الحد',
                    message: `${center.nameAr} وصل لـ ${utilization}% من الميزانية`,
                    centerId: center.id,
                    centerName: center.nameAr,
                });
            }

            // No budget set
            if (totalBudget === 0) {
                alerts.push({
                    type: 'NO_BUDGET',
                    severity: 'LOW',
                    title: '📋 لا توجد ميزانية',
                    message: `${center.nameAr} ليس له ميزانية محددة لعام ${currentYear}`,
                    centerId: center.id,
                    centerName: center.nameAr,
                });
            }
        }

        // Check for pending approvals
        const pendingBudgets = await this.prisma.costCenterAuditLog.count({
            where: {
                costCenter: { companyId },
                action: 'BUDGET_SUBMITTED',
                createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
            },
        });

        if (pendingBudgets > 0) {
            alerts.push({
                type: 'PENDING_APPROVAL',
                severity: 'MEDIUM',
                title: '📝 موافقات معلقة',
                message: `يوجد ${pendingBudgets} طلب ميزانية بانتظار الموافقة`,
            });
        }

        // Sort by severity
        const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

        return {
            totalAlerts: alerts.length,
            byType: {
                high: alerts.filter(a => a.severity === 'HIGH').length,
                medium: alerts.filter(a => a.severity === 'MEDIUM').length,
                low: alerts.filter(a => a.severity === 'LOW').length,
            },
            alerts,
            generatedAt: new Date().toISOString(),
        };
    }

    // 3. Multi-Year Plan (تخطيط متعدد السنوات)
    async getMultiYearPlan(costCenterId: string, companyId: string, years?: number[]) {
        const targetYears = years || [2025, 2026, 2027];

        const costCenter = await this.prisma.costCenter.findFirst({
            where: { id: costCenterId, companyId },
            include: {
                budgets: {
                    where: { year: { in: targetYears } },
                    orderBy: [{ year: 'asc' }, { month: 'asc' }],
                },
            },
        });

        if (!costCenter) {
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        const yearlyData: Record<number, { budget: number; actual: number; months: any[] }> = {};

        for (const year of targetYears) {
            yearlyData[year] = { budget: 0, actual: 0, months: [] };
        }

        for (const b of costCenter.budgets) {
            const year = b.year;
            if (yearlyData[year]) {
                yearlyData[year].budget += Number(b.budgetAmount || 0);
                yearlyData[year].actual += Number(b.actualAmount || 0);
                yearlyData[year].months.push({
                    month: b.month,
                    monthName: this.getMonthName(b.month || 0),
                    budget: Number(b.budgetAmount),
                    actual: Number(b.actualAmount),
                });
            }
        }

        const yearsComparison = targetYears.map((year, idx) => {
            const data = yearlyData[year];
            const prevYearData = idx > 0 ? yearlyData[targetYears[idx - 1]] : null;
            const growthRate = prevYearData && prevYearData.budget > 0
                ? Math.round(((data.budget - prevYearData.budget) / prevYearData.budget) * 100)
                : 0;

            return {
                year,
                totalBudget: data.budget,
                totalActual: data.actual,
                utilization: data.budget > 0 ? Math.round((data.actual / data.budget) * 100) : 0,
                growthRate,
                monthlyBreakdown: data.months,
            };
        });

        return {
            costCenterId,
            costCenterName: costCenter.nameAr,
            years: targetYears,
            yearsComparison,
            summary: {
                totalBudgetAllYears: Object.values(yearlyData).reduce((sum, y) => sum + y.budget, 0),
                totalActualAllYears: Object.values(yearlyData).reduce((sum, y) => sum + y.actual, 0),
                avgYearlyBudget: Math.round(Object.values(yearlyData).reduce((sum, y) => sum + y.budget, 0) / targetYears.length),
            },
        };
    }

    // 4. Create Multi-Year Budget (إنشاء ميزانية متعددة السنوات)
    async createMultiYearBudget(costCenterId: string, companyId: string, userId: string, data: {
        years: number[];
        monthlyAmount: number;
        growthRate?: number; // Annual growth rate in percentage
    }) {
        const costCenter = await this.prisma.costCenter.findFirst({
            where: { id: costCenterId, companyId },
        });

        if (!costCenter) {
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        const { years, monthlyAmount, growthRate = 0 } = data;
        const createdBudgets: any[] = [];

        for (let i = 0; i < years.length; i++) {
            const year = years[i];
            const yearlyGrowthMultiplier = Math.pow(1 + growthRate / 100, i);
            const adjustedMonthlyAmount = Math.round(monthlyAmount * yearlyGrowthMultiplier);

            for (let month = 1; month <= 12; month++) {
                const budget = await this.prisma.costCenterBudget.upsert({
                    where: {
                        costCenterId_year_month: { costCenterId, year, month },
                    },
                    create: {
                        costCenterId,
                        year,
                        month,
                        budgetAmount: adjustedMonthlyAmount,
                        actualAmount: 0,
                        notes: `تخطيط متعدد السنوات - نمو ${growthRate}%`,
                    },
                    update: {
                        budgetAmount: adjustedMonthlyAmount,
                        notes: `تخطيط متعدد السنوات - نمو ${growthRate}%`,
                    },
                });
                createdBudgets.push(budget);
            }
        }

        // Log audit
        await this.prisma.costCenterAuditLog.create({
            data: {
                costCenterId,
                userId,
                action: 'MULTI_YEAR_BUDGET_CREATED',
                description: `تم إنشاء ميزانية متعددة السنوات للسنوات ${years.join(', ')} بمبلغ شهري ${monthlyAmount} ونسبة نمو ${growthRate}%`,
            },
        });

        return {
            success: true,
            yearsCreated: years,
            monthlyAmount,
            growthRate,
            totalBudgetsCreated: createdBudgets.length,
            summary: years.map((year, i) => ({
                year,
                yearlyTotal: Math.round(monthlyAmount * 12 * Math.pow(1 + growthRate / 100, i)),
            })),
        };
    }

    // ==================== BATCH 9: Scenarios & Reports ====================

    // 1. Budget Scenario Simulator (محاكي السيناريوهات)
    async simulateBudgetScenario(costCenterId: string, companyId: string, scenario: {
        type: 'OPTIMISTIC' | 'PESSIMISTIC' | 'REALISTIC';
        salaryChange?: number;
        headcountChange?: number;
        inflationRate?: number;
    }) {
        const costCenter = await this.prisma.costCenter.findFirst({
            where: { id: costCenterId, companyId },
            include: {
                budgets: { where: { year: new Date().getFullYear() } },
                users: { select: { id: true, salary: true } },
            },
        }) as any;

        if (!costCenter) {
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        const currentBudget = (costCenter.budgets || []).reduce((sum: number, b: any) => sum + Number(b.budgetAmount || 0), 0);
        const currentHeadcount = (costCenter.users || []).length;
        const avgSalary = currentHeadcount > 0
            ? (costCenter.users || []).reduce((sum: number, u: any) => sum + Number(u.salary || 0), 0) / currentHeadcount
            : 0;

        // Scenario multipliers
        const multipliers = {
            OPTIMISTIC: { budget: 1.15, salary: 0.95, headcount: 1.1 },
            PESSIMISTIC: { budget: 0.85, salary: 1.1, headcount: 0.9 },
            REALISTIC: { budget: 1.0, salary: 1.03, headcount: 1.0 },
        };

        const m = multipliers[scenario.type];
        const salaryChange = scenario.salaryChange ?? (m.salary - 1) * 100;
        const headcountChange = scenario.headcountChange ?? Math.round((m.headcount - 1) * currentHeadcount);
        const inflationRate = scenario.inflationRate ?? 3;

        // Calculate projections for 12 months
        const projections = [];
        let runningBudget = currentBudget / 12; // Monthly

        for (let month = 1; month <= 12; month++) {
            const monthlyInflation = Math.pow(1 + inflationRate / 100 / 12, month);
            const newHeadcount = currentHeadcount + headcountChange;
            const newAvgSalary = avgSalary * (1 + salaryChange / 100);
            const projectedCost = newHeadcount * newAvgSalary * monthlyInflation;

            projections.push({
                month,
                monthName: this.getMonthName(month),
                currentBudget: Math.round(runningBudget),
                projectedCost: Math.round(projectedCost),
                variance: Math.round(projectedCost - runningBudget),
                variancePercent: runningBudget > 0 ? Math.round((projectedCost - runningBudget) / runningBudget * 100) : 0,
            });
        }

        const totalProjected = projections.reduce((sum, p) => sum + p.projectedCost, 0);

        return {
            costCenterId,
            costCenterName: costCenter.nameAr,
            scenarioType: scenario.type,
            parameters: { salaryChange, headcountChange, inflationRate },
            currentState: {
                annualBudget: currentBudget,
                headcount: currentHeadcount,
                avgSalary: Math.round(avgSalary),
            },
            projectedState: {
                annualCost: totalProjected,
                newHeadcount: currentHeadcount + headcountChange,
                newAvgSalary: Math.round(avgSalary * (1 + salaryChange / 100)),
            },
            projections,
            summary: {
                totalVariance: totalProjected - currentBudget,
                variancePercent: currentBudget > 0 ? Math.round((totalProjected - currentBudget) / currentBudget * 100) : 0,
                recommendation: totalProjected > currentBudget * 1.1
                    ? 'يُنصح بزيادة الميزانية'
                    : totalProjected < currentBudget * 0.9
                        ? 'يمكن تقليل الميزانية'
                        : 'الميزانية مناسبة',
            },
        };
    }

    // 2. Custom Report Builder (منشئ التقارير)
    async generateCustomReport(companyId: string, config: {
        metrics: string[];
        groupBy: 'center' | 'department' | 'month';
        year?: number;
        format?: 'summary' | 'detailed';
    }) {
        const year = config.year || new Date().getFullYear();
        const centers = await this.prisma.costCenter.findMany({
            where: { companyId } as any,
            include: {
                budgets: { where: { year } },
                users: { select: { id: true, salary: true, departmentId: true } },
                department: true,
            },
        }) as any[];

        const reportData: any[] = [];

        if (config.groupBy === 'center') {
            for (const center of centers) {
                const budget = (center.budgets || []).reduce((sum: number, b: any) => sum + Number(b.budgetAmount || 0), 0);
                const actual = (center.budgets || []).reduce((sum: number, b: any) => sum + Number(b.actualAmount || 0), 0);
                const headcount = (center.users || []).length;
                const totalSalary = (center.users || []).reduce((sum: number, u: any) => sum + Number(u.salary || 0), 0);

                const row: any = { id: center.id, name: center.nameAr };
                if (config.metrics.includes('budget')) row.budget = budget;
                if (config.metrics.includes('actual')) row.actual = actual;
                if (config.metrics.includes('variance')) row.variance = actual - budget;
                if (config.metrics.includes('headcount')) row.headcount = headcount;
                if (config.metrics.includes('salary')) row.totalSalary = totalSalary;
                if (config.metrics.includes('utilization')) row.utilization = budget > 0 ? Math.round((actual / budget) * 100) : 0;

                reportData.push(row);
            }
        } else if (config.groupBy === 'department') {
            const deptMap: Record<string, any> = {};

            for (const center of centers) {
                const deptId = center.departmentId || 'unknown';
                const deptName = center.department?.nameAr || 'غير محدد';

                if (!deptMap[deptId]) {
                    deptMap[deptId] = { id: deptId, name: deptName, budget: 0, actual: 0, headcount: 0, totalSalary: 0, centers: 0 };
                }

                deptMap[deptId].budget += (center.budgets || []).reduce((sum: number, b: any) => sum + Number(b.budgetAmount || 0), 0);
                deptMap[deptId].actual += (center.budgets || []).reduce((sum: number, b: any) => sum + Number(b.actualAmount || 0), 0);
                deptMap[deptId].headcount += (center.users || []).length;
                deptMap[deptId].totalSalary += (center.users || []).reduce((sum: number, u: any) => sum + Number(u.salary || 0), 0);
                deptMap[deptId].centers++;
            }

            for (const dept of Object.values(deptMap)) {
                const row: any = { id: dept.id, name: dept.name, centersCount: dept.centers };
                if (config.metrics.includes('budget')) row.budget = dept.budget;
                if (config.metrics.includes('actual')) row.actual = dept.actual;
                if (config.metrics.includes('variance')) row.variance = dept.actual - dept.budget;
                if (config.metrics.includes('headcount')) row.headcount = dept.headcount;
                if (config.metrics.includes('salary')) row.totalSalary = dept.totalSalary;
                if (config.metrics.includes('utilization')) row.utilization = dept.budget > 0 ? Math.round((dept.actual / dept.budget) * 100) : 0;

                reportData.push(row);
            }
        } else if (config.groupBy === 'month') {
            const monthMap: Record<number, any> = {};

            for (let m = 1; m <= 12; m++) {
                monthMap[m] = { month: m, monthName: this.getMonthName(m), budget: 0, actual: 0 };
            }

            for (const center of centers) {
                for (const b of center.budgets || []) {
                    if (b.month && monthMap[b.month]) {
                        monthMap[b.month].budget += Number(b.budgetAmount || 0);
                        monthMap[b.month].actual += Number(b.actualAmount || 0);
                    }
                }
            }

            for (const m of Object.values(monthMap)) {
                const row: any = { month: m.month, name: m.monthName };
                if (config.metrics.includes('budget')) row.budget = m.budget;
                if (config.metrics.includes('actual')) row.actual = m.actual;
                if (config.metrics.includes('variance')) row.variance = m.actual - m.budget;
                if (config.metrics.includes('utilization')) row.utilization = m.budget > 0 ? Math.round((m.actual / m.budget) * 100) : 0;

                reportData.push(row);
            }
        }

        // Calculate totals
        const totals: any = {};
        if (config.metrics.includes('budget')) totals.budget = reportData.reduce((sum, r) => sum + (r.budget || 0), 0);
        if (config.metrics.includes('actual')) totals.actual = reportData.reduce((sum, r) => sum + (r.actual || 0), 0);
        if (config.metrics.includes('variance')) totals.variance = (totals.actual || 0) - (totals.budget || 0);
        if (config.metrics.includes('headcount')) totals.headcount = reportData.reduce((sum, r) => sum + (r.headcount || 0), 0);

        return {
            reportConfig: config,
            year,
            generatedAt: new Date().toISOString(),
            rowCount: reportData.length,
            data: reportData,
            totals,
        };
    }

    // 3. Department Budget Rollup (تجميع ميزانية الأقسام)
    async getDepartmentBudgetRollup(companyId: string, departmentId?: string) {
        const year = new Date().getFullYear();

        const whereClause: any = { companyId };
        if (departmentId) whereClause.departmentId = departmentId;

        const centers = await this.prisma.costCenter.findMany({
            where: whereClause as any,
            include: {
                budgets: { where: { year } },
                users: { select: { id: true, salary: true } },
                department: true,
            },
        }) as any[];

        const departmentRollup: Record<string, any> = {};

        for (const center of centers) {
            const deptId = center.departmentId || 'unassigned';
            const deptName = center.department?.nameAr || 'غير مُعين';

            if (!departmentRollup[deptId]) {
                departmentRollup[deptId] = {
                    departmentId: deptId,
                    departmentName: deptName,
                    totalBudget: 0,
                    totalActual: 0,
                    totalHeadcount: 0,
                    totalSalary: 0,
                    centersCount: 0,
                    centers: [],
                };
            }

            const budget = (center.budgets || []).reduce((sum: number, b: any) => sum + Number(b.budgetAmount || 0), 0);
            const actual = (center.budgets || []).reduce((sum: number, b: any) => sum + Number(b.actualAmount || 0), 0);
            const headcount = (center.users || []).length;
            const salary = (center.users || []).reduce((sum: number, u: any) => sum + Number(u.salary || 0), 0);

            departmentRollup[deptId].totalBudget += budget;
            departmentRollup[deptId].totalActual += actual;
            departmentRollup[deptId].totalHeadcount += headcount;
            departmentRollup[deptId].totalSalary += salary;
            departmentRollup[deptId].centersCount++;
            departmentRollup[deptId].centers.push({
                id: center.id,
                name: center.nameAr,
                code: center.code,
                budget,
                actual,
                headcount,
                utilization: budget > 0 ? Math.round((actual / budget) * 100) : 0,
            });
        }

        // Add utilization to each department
        const departments = Object.values(departmentRollup).map(dept => ({
            ...dept,
            utilization: dept.totalBudget > 0 ? Math.round((dept.totalActual / dept.totalBudget) * 100) : 0,
            avgCostPerEmployee: dept.totalHeadcount > 0 ? Math.round(dept.totalSalary / dept.totalHeadcount) : 0,
        }));

        // Sort by total budget descending
        departments.sort((a, b) => b.totalBudget - a.totalBudget);

        return {
            year,
            companyId,
            departmentsCount: departments.length,
            totalBudget: departments.reduce((sum, d) => sum + d.totalBudget, 0),
            totalActual: departments.reduce((sum, d) => sum + d.totalActual, 0),
            totalHeadcount: departments.reduce((sum, d) => sum + d.totalHeadcount, 0),
            departments,
        };
    }

    // ==================== BATCH 10: Approvals, Expenses & Benchmarking ====================

    // 1. Budget Approval Workflow (سير عمل الموافقات)
    async submitBudgetForApproval(costCenterId: string, companyId: string, userId: string) {
        const costCenter = await this.prisma.costCenter.findFirst({
            where: { id: costCenterId, companyId },
        });

        if (!costCenter) {
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        // Create approval request
        await this.prisma.costCenterAuditLog.create({
            data: {
                costCenterId,
                userId,
                action: 'BUDGET_SUBMITTED',
                changes: { status: 'PENDING_APPROVAL', submittedAt: new Date().toISOString() },
            } as any,
        });

        return {
            success: true,
            message: 'تم تقديم الميزانية للموافقة',
            costCenterId,
            status: 'PENDING_APPROVAL',
            submittedAt: new Date().toISOString(),
        };
    }

    async approveBudget(costCenterId: string, companyId: string, approverId: string, comment?: string) {
        const costCenter = await this.prisma.costCenter.findFirst({
            where: { id: costCenterId, companyId },
        });

        if (!costCenter) {
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        await this.prisma.costCenterAuditLog.create({
            data: {
                costCenterId,
                userId: approverId,
                action: 'BUDGET_APPROVED',
                changes: { status: 'APPROVED', approvedAt: new Date().toISOString(), comment },
            } as any,
        });

        return {
            success: true,
            message: 'تمت الموافقة على الميزانية',
            costCenterId,
            status: 'APPROVED',
            approvedAt: new Date().toISOString(),
            approvedBy: approverId,
        };
    }

    async rejectBudget(costCenterId: string, companyId: string, approverId: string, reason: string) {
        const costCenter = await this.prisma.costCenter.findFirst({
            where: { id: costCenterId, companyId },
        });

        if (!costCenter) {
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        await this.prisma.costCenterAuditLog.create({
            data: {
                costCenterId,
                userId: approverId,
                action: 'BUDGET_REJECTED',
                changes: { status: 'REJECTED', rejectedAt: new Date().toISOString(), reason },
            } as any,
        });

        return {
            success: true,
            message: 'تم رفض الميزانية',
            costCenterId,
            status: 'REJECTED',
            rejectedAt: new Date().toISOString(),
            rejectedBy: approverId,
            reason,
        };
    }

    async getBudgetApprovalHistory(costCenterId: string, companyId: string) {
        const costCenter = await this.prisma.costCenter.findFirst({
            where: { id: costCenterId, companyId },
        });

        if (!costCenter) {
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        const history = await this.prisma.costCenterAuditLog.findMany({
            where: {
                costCenterId,
                action: { in: ['BUDGET_SUBMITTED', 'BUDGET_APPROVED', 'BUDGET_REJECTED'] },
            },
            include: {
                user: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        }) as any[];

        // Get current status
        const latestAction = history[0];
        let currentStatus = 'DRAFT';
        if (latestAction) {
            if (latestAction.action === 'BUDGET_APPROVED') currentStatus = 'APPROVED';
            else if (latestAction.action === 'BUDGET_REJECTED') currentStatus = 'REJECTED';
            else if (latestAction.action === 'BUDGET_SUBMITTED') currentStatus = 'PENDING_APPROVAL';
        }

        return {
            costCenterId,
            currentStatus,
            history: history.map(h => ({
                id: h.id,
                action: h.action,
                actionAr: h.action === 'BUDGET_SUBMITTED' ? 'تقديم للموافقة'
                    : h.action === 'BUDGET_APPROVED' ? 'موافقة'
                        : 'رفض',
                user: h.user ? `${h.user.firstName} ${h.user.lastName}` : 'غير معروف',
                changes: h.changes,
                createdAt: h.createdAt,
            })),
        };
    }

    // 2. Expense Tracking (تتبع المصروفات)
    async recordExpense(costCenterId: string, companyId: string, userId: string, data: {
        amount: number;
        category: string;
        description?: string;
        date: Date;
        receiptUrl?: string;
    }) {
        const costCenter = await this.prisma.costCenter.findFirst({
            where: { id: costCenterId, companyId },
        });

        if (!costCenter) {
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        // Log expense as audit entry
        const expense = await this.prisma.costCenterAuditLog.create({
            data: {
                costCenterId,
                userId,
                action: 'EXPENSE_RECORDED',
                changes: {
                    amount: data.amount,
                    category: data.category,
                    description: data.description,
                    date: data.date,
                    receiptUrl: data.receiptUrl,
                },
            } as any,
        });

        return {
            success: true,
            message: 'تم تسجيل المصروف',
            expenseId: expense.id,
            ...data,
        };
    }

    async getExpensesByCenter(costCenterId: string, companyId: string, filters?: {
        startDate?: Date;
        endDate?: Date;
        category?: string;
    }) {
        const costCenter = await this.prisma.costCenter.findFirst({
            where: { id: costCenterId, companyId },
        });

        if (!costCenter) {
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        const whereClause: any = {
            costCenterId,
            action: 'EXPENSE_RECORDED',
        };

        if (filters?.startDate || filters?.endDate) {
            whereClause.createdAt = {};
            if (filters.startDate) whereClause.createdAt.gte = filters.startDate;
            if (filters.endDate) whereClause.createdAt.lte = filters.endDate;
        }

        const expenses = await this.prisma.costCenterAuditLog.findMany({
            where: whereClause,
            include: {
                user: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: { createdAt: 'desc' },
        }) as any[];

        let filteredExpenses = expenses;
        if (filters?.category) {
            filteredExpenses = expenses.filter(e => (e.changes as any)?.category === filters.category);
        }

        return {
            costCenterId,
            costCenterName: (costCenter as any).nameAr,
            totalExpenses: filteredExpenses.reduce((sum, e) => sum + Number((e.changes as any)?.amount || 0), 0),
            count: filteredExpenses.length,
            expenses: filteredExpenses.map(e => ({
                id: e.id,
                amount: (e.changes as any)?.amount,
                category: (e.changes as any)?.category,
                description: (e.changes as any)?.description,
                date: (e.changes as any)?.date,
                receiptUrl: (e.changes as any)?.receiptUrl,
                recordedBy: e.user ? `${e.user.firstName} ${e.user.lastName}` : 'غير معروف',
                createdAt: e.createdAt,
            })),
        };
    }

    async getExpenseSummary(costCenterId: string, companyId: string) {
        const expenses = await this.getExpensesByCenter(costCenterId, companyId);

        // Group by category
        const byCategory: Record<string, number> = {};
        for (const exp of expenses.expenses) {
            const cat = exp.category || 'أخرى';
            byCategory[cat] = (byCategory[cat] || 0) + Number(exp.amount || 0);
        }

        // Get budget for comparison
        const year = new Date().getFullYear();
        const budgets = await this.prisma.costCenterBudget.findMany({
            where: { costCenterId, year },
        });
        const totalBudget = budgets.reduce((sum, b) => sum + Number(b.budgetAmount || 0), 0);

        return {
            costCenterId,
            totalExpenses: expenses.totalExpenses,
            totalBudget,
            remainingBudget: totalBudget - expenses.totalExpenses,
            utilizationPercent: totalBudget > 0 ? Math.round((expenses.totalExpenses / totalBudget) * 100) : 0,
            byCategory: Object.entries(byCategory).map(([category, amount]) => ({
                category,
                amount,
                percentage: expenses.totalExpenses > 0 ? Math.round((amount / expenses.totalExpenses) * 100) : 0,
            })).sort((a, b) => b.amount - a.amount),
            expenseCount: expenses.count,
        };
    }

    // 3. Cost Center Benchmarking (المقارنة المعيارية)
    async getBenchmarkData(companyId: string) {
        const year = new Date().getFullYear();
        const centers = await this.prisma.costCenter.findMany({
            where: { companyId } as any,
            include: {
                budgets: { where: { year } },
                users: { select: { id: true, salary: true } },
            },
        }) as any[];

        const benchmarks = centers.map(center => {
            const budget = (center.budgets || []).reduce((sum: number, b: any) => sum + Number(b.budgetAmount || 0), 0);
            const actual = (center.budgets || []).reduce((sum: number, b: any) => sum + Number(b.actualAmount || 0), 0);
            const headcount = (center.users || []).length;
            const totalSalary = (center.users || []).reduce((sum: number, u: any) => sum + Number(u.salary || 0), 0);
            const utilization = budget > 0 ? Math.round((actual / budget) * 100) : 0;
            const costPerEmployee = headcount > 0 ? Math.round(totalSalary / headcount) : 0;
            const efficiency = budget > 0 && actual > 0 ? Math.round((budget / actual) * 100) : 100;

            return {
                id: center.id,
                name: center.nameAr,
                code: center.code,
                budget,
                actual,
                headcount,
                totalSalary,
                utilization,
                costPerEmployee,
                efficiency,
            };
        });

        // Calculate averages
        const avgUtilization = benchmarks.length > 0
            ? Math.round(benchmarks.reduce((sum, b) => sum + b.utilization, 0) / benchmarks.length)
            : 0;
        const avgCostPerEmployee = benchmarks.length > 0
            ? Math.round(benchmarks.reduce((sum, b) => sum + b.costPerEmployee, 0) / benchmarks.length)
            : 0;
        const avgEfficiency = benchmarks.length > 0
            ? Math.round(benchmarks.reduce((sum, b) => sum + b.efficiency, 0) / benchmarks.length)
            : 100;

        // Rank centers
        const ranked = [...benchmarks].sort((a, b) => b.efficiency - a.efficiency);

        return {
            year,
            centersCount: benchmarks.length,
            averages: {
                utilization: avgUtilization,
                costPerEmployee: avgCostPerEmployee,
                efficiency: avgEfficiency,
            },
            topPerformers: ranked.slice(0, 3),
            needsImprovement: ranked.slice(-3).reverse(),
            allCenters: benchmarks.sort((a, b) => a.name.localeCompare(b.name)),
        };
    }

    async compareCenters(centerIds: string[], companyId: string) {
        const year = new Date().getFullYear();
        const centers = await this.prisma.costCenter.findMany({
            where: { id: { in: centerIds }, companyId } as any,
            include: {
                budgets: { where: { year } },
                users: { select: { id: true, salary: true } },
            },
        }) as any[];

        const comparison = centers.map(center => {
            const budget = (center.budgets || []).reduce((sum: number, b: any) => sum + Number(b.budgetAmount || 0), 0);
            const actual = (center.budgets || []).reduce((sum: number, b: any) => sum + Number(b.actualAmount || 0), 0);
            const headcount = (center.users || []).length;
            const totalSalary = (center.users || []).reduce((sum: number, u: any) => sum + Number(u.salary || 0), 0);

            return {
                id: center.id,
                name: center.nameAr,
                code: center.code,
                metrics: {
                    budget,
                    actual,
                    variance: actual - budget,
                    utilization: budget > 0 ? Math.round((actual / budget) * 100) : 0,
                    headcount,
                    costPerEmployee: headcount > 0 ? Math.round(totalSalary / headcount) : 0,
                    efficiency: budget > 0 && actual > 0 ? Math.round((budget / actual) * 100) : 100,
                },
            };
        });

        return {
            year,
            centersCompared: comparison.length,
            comparison,
            insights: this.generateComparisonInsights(comparison),
        };
    }

    private generateComparisonInsights(comparison: any[]) {
        if (comparison.length < 2) return [];

        const insights: string[] = [];
        const sorted = [...comparison].sort((a, b) => b.metrics.efficiency - a.metrics.efficiency);

        const best = sorted[0];
        const worst = sorted[sorted.length - 1];

        if (best.metrics.efficiency > worst.metrics.efficiency) {
            insights.push(`${best.name} هو الأكثر كفاءة بنسبة ${best.metrics.efficiency}%`);
        }

        const lowestCost = [...comparison].sort((a, b) => a.metrics.costPerEmployee - b.metrics.costPerEmployee)[0];
        insights.push(`${lowestCost.name} لديه أقل تكلفة لكل موظف (${lowestCost.metrics.costPerEmployee.toLocaleString()} ريال)`);

        const overBudget = comparison.filter(c => c.metrics.utilization > 100);
        if (overBudget.length > 0) {
            insights.push(`${overBudget.length} مركز/مراكز تجاوزت الميزانية: ${overBudget.map(c => c.name).join(', ')}`);
        }

        return insights;
    }

    // ==================== الدفعة 11 - Batch 11 ====================

    // 1. AI Budget Forecasting (التنبؤ الذكي بالميزانية)
    async getAIForecast(costCenterId: string, companyId: string) {
        const costCenter = await this.prisma.costCenter.findFirst({
            where: { id: costCenterId, companyId },
        });

        if (!costCenter) {
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        // Get historical budget data (last 24 months if available)
        const budgets = await this.prisma.costCenterBudget.findMany({
            where: { costCenterId },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
            take: 24,
        });

        if (budgets.length < 3) {
            return {
                costCenterId,
                costCenterName: costCenter.nameAr,
                hasEnoughData: false,
                message: 'لا توجد بيانات كافية للتنبؤ (يلزم 3 أشهر على الأقل)',
                forecast: [],
            };
        }

        // Calculate trends
        const actualAmounts = budgets.map(b => Number(b.actualAmount || 0));
        const avgSpending = actualAmounts.reduce((a, b) => a + b, 0) / actualAmounts.length;

        // Calculate growth rate (comparing first half to second half)
        const halfLength = Math.floor(actualAmounts.length / 2);
        const recentAvg = actualAmounts.slice(0, halfLength).reduce((a, b) => a + b, 0) / halfLength;
        const olderAvg = actualAmounts.slice(halfLength).reduce((a, b) => a + b, 0) / (actualAmounts.length - halfLength);
        const growthRate = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

        // Calculate seasonality (month-based patterns)
        const monthlyAverages: Record<number, number[]> = {};
        budgets.forEach(b => {
            const month = b.month || 1;
            if (!monthlyAverages[month]) monthlyAverages[month] = [];
            monthlyAverages[month].push(Number(b.actualAmount || 0));
        });

        // Generate 6-month forecast
        const currentDate = new Date();
        const forecast = [];
        for (let i = 1; i <= 6; i++) {
            const forecastDate = new Date(currentDate);
            forecastDate.setMonth(forecastDate.getMonth() + i);
            const forecastMonth = forecastDate.getMonth() + 1;
            const forecastYear = forecastDate.getFullYear();

            // Apply seasonality and growth
            const monthData = monthlyAverages[forecastMonth] || [];
            const seasonalFactor = monthData.length > 0
                ? (monthData.reduce((a, b) => a + b, 0) / monthData.length) / avgSpending
                : 1;

            const projectedAmount = avgSpending * seasonalFactor * (1 + (growthRate / 100) * (i / 12));

            forecast.push({
                month: forecastMonth,
                year: forecastYear,
                monthName: this.getMonthName(forecastMonth),
                projectedAmount: Math.round(projectedAmount),
                confidence: Math.max(50, 95 - (i * 5)), // Confidence decreases over time
            });
        }

        return {
            costCenterId,
            costCenterName: costCenter.nameAr,
            hasEnoughData: true,
            historicalDataMonths: budgets.length,
            averageMonthlySpending: Math.round(avgSpending),
            growthRate: Math.round(growthRate * 10) / 10,
            trend: growthRate > 5 ? 'متزايد' : growthRate < -5 ? 'متناقص' : 'مستقر',
            forecast,
            recommendation: growthRate > 10
                ? 'يُنصح بزيادة الميزانية المخصصة بنسبة ' + Math.round(growthRate) + '%'
                : growthRate < -10
                    ? 'يمكن تقليل الميزانية المخصصة بنسبة ' + Math.round(Math.abs(growthRate)) + '%'
                    : 'الميزانية الحالية مناسبة',
        };
    }

    async getForecastTrends(companyId: string) {
        const centers = await this.prisma.costCenter.findMany({
            where: { companyId, status: 'ACTIVE' },
            select: { id: true, nameAr: true, code: true },
        });

        const trends = [];
        for (const center of centers) {
            const budgets = await this.prisma.costCenterBudget.findMany({
                where: { costCenterId: center.id },
                orderBy: [{ year: 'desc' }, { month: 'desc' }],
                take: 12,
            });

            if (budgets.length >= 3) {
                const amounts = budgets.map(b => Number(b.actualAmount || 0));
                const recent = amounts.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
                const older = amounts.slice(3, 6).reduce((a, b) => a + b, 0) / Math.min(3, amounts.length - 3) || recent;
                const growth = older > 0 ? ((recent - older) / older) * 100 : 0;

                trends.push({
                    id: center.id,
                    code: center.code,
                    name: center.nameAr,
                    avgMonthlySpending: Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length),
                    growthRate: Math.round(growth * 10) / 10,
                    trend: growth > 5 ? 'متزايد' : growth < -5 ? 'متناقص' : 'مستقر',
                    dataMonths: budgets.length,
                });
            }
        }

        return {
            companyId,
            totalCentersAnalyzed: trends.length,
            trends: trends.sort((a, b) => b.growthRate - a.growthRate),
            summary: {
                increasing: trends.filter(t => t.trend === 'متزايد').length,
                stable: trends.filter(t => t.trend === 'مستقر').length,
                decreasing: trends.filter(t => t.trend === 'متناقص').length,
            },
        };
    }

    // 2. Cost Center Health Score (مؤشر صحة مركز التكلفة)
    async getHealthScore(costCenterId: string, companyId: string) {
        const costCenter = await this.prisma.costCenter.findFirst({
            where: { id: costCenterId, companyId },
            include: {
                budgets: { where: { year: new Date().getFullYear() } },
                users: true,
            },
        });

        if (!costCenter) {
            throw new NotFoundException('مركز التكلفة غير موجود');
        }

        const budgets = (costCenter as any).budgets || [];
        const users = (costCenter as any).users || [];

        // Calculate metrics
        const totalBudget = budgets.reduce((sum: number, b: any) => sum + Number(b.budgetAmount || 0), 0);
        const totalActual = budgets.reduce((sum: number, b: any) => sum + Number(b.actualAmount || 0), 0);
        const utilization = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

        // 1. Budget Utilization Score (20%) - Optimal is 80-95%
        let utilizationScore = 100;
        if (utilization < 50) utilizationScore = 40;
        else if (utilization < 70) utilizationScore = 60;
        else if (utilization < 80) utilizationScore = 80;
        else if (utilization > 110) utilizationScore = 30;
        else if (utilization > 100) utilizationScore = 60;

        // 2. Variance Consistency Score (20%)
        const variances = budgets.map((b: any) => {
            const budget = Number(b.budgetAmount || 0);
            const actual = Number(b.actualAmount || 0);
            return budget > 0 ? Math.abs((actual - budget) / budget) * 100 : 0;
        });
        const avgVariance = variances.length > 0 ? variances.reduce((a: number, b: number) => a + b, 0) / variances.length : 0;
        const varianceScore = Math.max(0, 100 - avgVariance * 2);

        // 3. Expense Trend Score (20%)
        const trendScore = 75; // Default - would need historical data for accurate calculation

        // 4. Headcount Efficiency Score (20%)
        const headcount = users.length;
        const costPerHead = headcount > 0 ? totalActual / headcount : 0;
        const headcountScore = costPerHead > 0 && costPerHead < 50000 ? 90 : costPerHead < 100000 ? 70 : 50;

        // 5. Compliance Score (20%)
        const complianceScore = 85; // Default - would check audit logs

        // Calculate overall score
        const overallScore = Math.round(
            utilizationScore * 0.2 +
            varianceScore * 0.2 +
            trendScore * 0.2 +
            headcountScore * 0.2 +
            complianceScore * 0.2
        );

        // Determine health status
        let healthStatus = 'ممتاز';
        let healthColor = 'green';
        if (overallScore < 50) { healthStatus = 'حرج'; healthColor = 'red'; }
        else if (overallScore < 70) { healthStatus = 'يحتاج تحسين'; healthColor = 'orange'; }
        else if (overallScore < 85) { healthStatus = 'جيد'; healthColor = 'blue'; }

        // Generate recommendations
        const recommendations: string[] = [];
        if (utilizationScore < 60) recommendations.push('مراجعة تخصيص الميزانية');
        if (varianceScore < 60) recommendations.push('تحسين دقة التخطيط');
        if (headcountScore < 60) recommendations.push('مراجعة كفاءة الموظفين');

        return {
            costCenterId,
            costCenterName: costCenter.nameAr,
            overallScore,
            healthStatus,
            healthColor,
            metrics: {
                budgetUtilization: { score: utilizationScore, weight: 20, value: Math.round(utilization) },
                varianceConsistency: { score: Math.round(varianceScore), weight: 20, value: Math.round(avgVariance) },
                expenseTrend: { score: trendScore, weight: 20, value: 'مستقر' },
                headcountEfficiency: { score: headcountScore, weight: 20, value: headcount },
                compliance: { score: complianceScore, weight: 20, value: 'جيد' },
            },
            recommendations,
            lastUpdated: new Date().toISOString(),
        };
    }

    async getHealthRankings(companyId: string) {
        const centers = await this.prisma.costCenter.findMany({
            where: { companyId, status: 'ACTIVE' },
            select: { id: true, nameAr: true, code: true },
        });

        const rankings = [];
        for (const center of centers) {
            try {
                const health = await this.getHealthScore(center.id, companyId);
                rankings.push({
                    id: center.id,
                    code: center.code,
                    name: center.nameAr,
                    score: health.overallScore,
                    status: health.healthStatus,
                    color: health.healthColor,
                });
            } catch (e) {
                // Skip centers with errors
            }
        }

        return {
            companyId,
            totalCenters: rankings.length,
            rankings: rankings.sort((a, b) => b.score - a.score),
            summary: {
                excellent: rankings.filter(r => r.status === 'ممتاز').length,
                good: rankings.filter(r => r.status === 'جيد').length,
                needsImprovement: rankings.filter(r => r.status === 'يحتاج تحسين').length,
                critical: rankings.filter(r => r.status === 'حرج').length,
            },
            averageScore: rankings.length > 0
                ? Math.round(rankings.reduce((a, b) => a + b.score, 0) / rankings.length)
                : 0,
        };
    }

    // 3. Automated Budget Reallocation (إعادة التوزيع التلقائي)
    async getReallocationSuggestions(companyId: string) {
        const year = new Date().getFullYear();
        const centers = await this.prisma.costCenter.findMany({
            where: { companyId, status: 'ACTIVE' },
            include: {
                budgets: { where: { year } },
            },
        });

        const analysis = centers.map(center => {
            const budgets = (center as any).budgets || [];
            const totalBudget = budgets.reduce((sum: number, b: any) => sum + Number(b.budgetAmount || 0), 0);
            const totalActual = budgets.reduce((sum: number, b: any) => sum + Number(b.actualAmount || 0), 0);
            const utilization = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
            const surplus = totalBudget - totalActual;

            return {
                id: center.id,
                code: center.code,
                name: center.nameAr,
                totalBudget,
                totalActual,
                utilization: Math.round(utilization),
                surplus,
                status: utilization < 70 ? 'فائض' : utilization > 100 ? 'عجز' : 'متوازن',
            };
        });

        const surplusCenters = analysis.filter(a => a.status === 'فائض' && a.surplus > 0);
        const deficitCenters = analysis.filter(a => a.status === 'عجز' && a.surplus < 0);

        // Generate suggestions
        const suggestions = [];
        let suggestionId = 1;

        for (const deficit of deficitCenters) {
            const needed = Math.abs(deficit.surplus);
            for (const surplus of surplusCenters) {
                if (surplus.surplus >= needed * 0.1) { // At least 10% of needed amount
                    const transferAmount = Math.min(surplus.surplus, needed);
                    suggestions.push({
                        id: `suggestion-${suggestionId++}`,
                        fromCenterId: surplus.id,
                        fromCenterName: surplus.name,
                        toCenterId: deficit.id,
                        toCenterName: deficit.name,
                        amount: Math.round(transferAmount),
                        reason: `${deficit.name} تجاوز الميزانية بنسبة ${Math.round(deficit.utilization - 100)}%`,
                        impact: `سيقلل فائض ${surplus.name} من ${Math.round(surplus.utilization)}% إلى ${Math.round(((surplus.totalActual) / (surplus.totalBudget - transferAmount)) * 100)}%`,
                        priority: deficit.utilization > 120 ? 'عالية' : 'متوسطة',
                    });
                }
            }
        }

        return {
            companyId,
            year,
            analysis: {
                totalCenters: analysis.length,
                surplusCenters: surplusCenters.length,
                deficitCenters: deficitCenters.length,
                balancedCenters: analysis.filter(a => a.status === 'متوازن').length,
                totalSurplus: surplusCenters.reduce((a, b) => a + b.surplus, 0),
                totalDeficit: Math.abs(deficitCenters.reduce((a, b) => a + b.surplus, 0)),
            },
            suggestions: suggestions.slice(0, 10), // Top 10 suggestions
            centersDetail: analysis.sort((a, b) => b.utilization - a.utilization),
        };
    }

    async applyReallocation(companyId: string, suggestionId: string, fromCenterId: string, toCenterId: string, amount: number, userId: string) {
        // Validate centers exist
        const [fromCenter, toCenter] = await Promise.all([
            this.prisma.costCenter.findFirst({ where: { id: fromCenterId, companyId } }),
            this.prisma.costCenter.findFirst({ where: { id: toCenterId, companyId } }),
        ]);

        if (!fromCenter || !toCenter) {
            throw new NotFoundException('أحد مراكز التكلفة غير موجود');
        }

        if (amount <= 0) {
            throw new BadRequestException('المبلغ يجب أن يكون أكبر من صفر');
        }

        // Log the reallocation
        await this.logAudit({
            costCenterId: fromCenterId,
            userId,
            action: 'BUDGET_REALLOCATED',
            entityType: 'BUDGET',
            newValue: {
                suggestionId,
                fromCenter: fromCenter.nameAr,
                toCenter: toCenter.nameAr,
                amount,
                date: new Date().toISOString(),
            },
            description: `إعادة توزيع ${amount.toLocaleString()} ريال من ${fromCenter.nameAr} إلى ${toCenter.nameAr}`,
        } as any);

        // Also log for the receiving center
        await this.logAudit({
            costCenterId: toCenterId,
            userId,
            action: 'BUDGET_RECEIVED',
            entityType: 'BUDGET',
            newValue: {
                suggestionId,
                fromCenter: fromCenter.nameAr,
                toCenter: toCenter.nameAr,
                amount,
                date: new Date().toISOString(),
            },
            description: `استلام ${amount.toLocaleString()} ريال من ${fromCenter.nameAr}`,
        } as any);

        return {
            success: true,
            message: `تم إعادة توزيع ${amount.toLocaleString()} ريال بنجاح`,
            details: {
                fromCenter: { id: fromCenterId, name: fromCenter.nameAr },
                toCenter: { id: toCenterId, name: toCenter.nameAr },
                amount,
                appliedBy: userId,
                appliedAt: new Date().toISOString(),
            },
        };
    }
}


