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
exports.LeaveBalanceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const leave_type_config_service_1 = require("./leave-type-config.service");
const library_1 = require("@prisma/client/runtime/library");
let LeaveBalanceService = class LeaveBalanceService {
    constructor(prisma, leaveTypeConfigService) {
        this.prisma = prisma;
        this.leaveTypeConfigService = leaveTypeConfigService;
    }
    async getEmployeeBalances(userId, year) {
        const targetYear = year || new Date().getFullYear();
        const balances = await this.prisma.leaveBalance.findMany({
            where: { userId, year: targetYear },
            include: {
                leaveType: {
                    select: {
                        id: true,
                        code: true,
                        nameAr: true,
                        nameEn: true,
                        category: true,
                        isPaid: true,
                        allowCarryForward: true,
                        maxBalanceCap: true,
                    },
                },
            },
            orderBy: { leaveType: { sortOrder: 'asc' } },
        });
        return balances.map((balance) => ({
            ...balance,
            available: this.calculateAvailable(balance),
        }));
    }
    async getBalance(userId, leaveTypeId, year) {
        const targetYear = year || new Date().getFullYear();
        const balance = await this.prisma.leaveBalance.findUnique({
            where: {
                userId_leaveTypeId_year: { userId, leaveTypeId, year: targetYear },
            },
            include: { leaveType: true },
        });
        if (!balance) {
            return this.initializeBalance(userId, leaveTypeId, targetYear);
        }
        return {
            ...balance,
            available: this.calculateAvailable(balance),
        };
    }
    async initializeBalance(userId, leaveTypeId, year) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { hireDate: true, companyId: true },
        });
        if (!user) {
            throw new common_1.NotFoundException('الموظف غير موجود');
        }
        const leaveType = await this.prisma.leaveTypeConfig.findUnique({
            where: { id: leaveTypeId },
        });
        if (!leaveType) {
            throw new common_1.NotFoundException('نوع الإجازة غير موجود');
        }
        let entitled = leaveType.defaultEntitlement;
        if (leaveType.isEntitlementBased && user.hireDate) {
            entitled = await this.leaveTypeConfigService.calculateEntitlement(leaveTypeId, user.hireDate);
        }
        const balance = await this.prisma.leaveBalance.create({
            data: {
                userId,
                leaveTypeId,
                companyId: user.companyId,
                year,
                entitled: new library_1.Decimal(entitled),
                carriedForward: new library_1.Decimal(0),
                used: new library_1.Decimal(0),
                pending: new library_1.Decimal(0),
            },
            include: { leaveType: true },
        });
        return {
            ...balance,
            available: entitled,
        };
    }
    async deductBalance(userId, leaveTypeId, days, year) {
        const targetYear = year || new Date().getFullYear();
        const balance = await this.prisma.leaveBalance.findUnique({
            where: {
                userId_leaveTypeId_year: { userId, leaveTypeId, year: targetYear },
            },
        });
        if (!balance) {
            throw new common_1.NotFoundException('رصيد الإجازة غير موجود');
        }
        const available = this.calculateAvailable(balance);
        const leaveType = await this.prisma.leaveTypeConfig.findUnique({
            where: { id: leaveTypeId },
        });
        if (available < days && !leaveType?.allowNegativeBalance) {
            throw new common_1.BadRequestException(`رصيد الإجازة غير كافي. المتاح: ${available.toFixed(2)} يوم`);
        }
        const currentPending = Number(balance.pending);
        const newPending = Math.max(0, currentPending - days);
        return this.prisma.leaveBalance.update({
            where: { id: balance.id },
            data: {
                used: { increment: days },
                pending: newPending,
            },
        });
    }
    async restoreBalance(userId, leaveTypeId, days, year) {
        const targetYear = year || new Date().getFullYear();
        const balance = await this.prisma.leaveBalance.findUnique({
            where: {
                userId_leaveTypeId_year: { userId, leaveTypeId, year: targetYear },
            },
        });
        if (!balance) {
            return;
        }
        return this.prisma.leaveBalance.update({
            where: { id: balance.id },
            data: {
                used: { decrement: days },
            },
        });
    }
    async addPendingDays(userId, leaveTypeId, days, year) {
        const targetYear = year || new Date().getFullYear();
        let balance = await this.prisma.leaveBalance.findUnique({
            where: {
                userId_leaveTypeId_year: { userId, leaveTypeId, year: targetYear },
            },
        });
        if (!balance) {
            await this.initializeBalance(userId, leaveTypeId, targetYear);
            balance = await this.prisma.leaveBalance.findUnique({
                where: {
                    userId_leaveTypeId_year: { userId, leaveTypeId, year: targetYear },
                },
            });
        }
        if (!balance) {
            throw new common_1.BadRequestException('فشل في إنشاء رصيد الإجازة');
        }
        const available = this.calculateAvailable(balance);
        const leaveType = await this.prisma.leaveTypeConfig.findUnique({
            where: { id: leaveTypeId },
        });
        if (available < days && !leaveType?.allowNegativeBalance) {
            throw new common_1.BadRequestException(`رصيد الإجازة غير كافي. المتاح: ${available.toFixed(2)} يوم، المطلوب: ${days} يوم`);
        }
        return this.prisma.leaveBalance.update({
            where: { id: balance.id },
            data: {
                pending: { increment: days },
            },
        });
    }
    async removePendingDays(userId, leaveTypeId, days, year) {
        const targetYear = year || new Date().getFullYear();
        const balance = await this.prisma.leaveBalance.findUnique({
            where: {
                userId_leaveTypeId_year: { userId, leaveTypeId, year: targetYear },
            },
        });
        if (!balance) {
            return;
        }
        const newPending = Math.max(0, Number(balance.pending) - days);
        return this.prisma.leaveBalance.update({
            where: { id: balance.id },
            data: {
                pending: new library_1.Decimal(newPending),
            },
        });
    }
    async carryForwardBalances(companyId, fromYear) {
        const toYear = fromYear + 1;
        const previousBalances = await this.prisma.leaveBalance.findMany({
            where: { companyId, year: fromYear },
            include: { leaveType: true, user: true },
        });
        const results = {
            processed: 0,
            carriedForward: 0,
            expired: 0,
        };
        for (const balance of previousBalances) {
            const available = this.calculateAvailable(balance);
            if (available < 0 || !balance.leaveType.allowCarryForward) {
                results.expired++;
                continue;
            }
            let carryForwardDays = available;
            if (balance.leaveType.maxCarryForwardDays) {
                carryForwardDays = Math.min(available, balance.leaveType.maxCarryForwardDays);
            }
            let expiresAt = null;
            if (balance.leaveType.carryForwardExpiryMonths) {
                expiresAt = new Date(toYear, balance.leaveType.carryForwardExpiryMonths - 1, 1);
            }
            let newEntitled = balance.leaveType.defaultEntitlement;
            if (balance.leaveType.isEntitlementBased && balance.user.hireDate) {
                newEntitled = await this.leaveTypeConfigService.calculateEntitlement(balance.leaveTypeId, balance.user.hireDate);
            }
            await this.prisma.leaveBalance.upsert({
                where: {
                    userId_leaveTypeId_year: {
                        userId: balance.userId,
                        leaveTypeId: balance.leaveTypeId,
                        year: toYear,
                    },
                },
                create: {
                    userId: balance.userId,
                    leaveTypeId: balance.leaveTypeId,
                    companyId,
                    year: toYear,
                    entitled: new library_1.Decimal(newEntitled),
                    carriedForward: new library_1.Decimal(carryForwardDays),
                    used: new library_1.Decimal(0),
                    pending: new library_1.Decimal(0),
                    carryForwardExpiresAt: expiresAt,
                },
                update: {
                    carriedForward: new library_1.Decimal(carryForwardDays),
                    carryForwardExpiresAt: expiresAt,
                },
            });
            results.processed++;
            results.carriedForward += carryForwardDays;
        }
        return results;
    }
    async recalculateEmployeeBalances(userId, year) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { companyId: true, hireDate: true },
        });
        if (!user?.companyId) {
            throw new common_1.NotFoundException('الموظف غير موجود أو ليس له شركة');
        }
        const leaveTypes = await this.leaveTypeConfigService.getActiveLeaveTypes(user.companyId);
        for (const leaveType of leaveTypes) {
            let entitled = leaveType.defaultEntitlement;
            if (leaveType.isEntitlementBased && user.hireDate) {
                entitled = await this.leaveTypeConfigService.calculateEntitlement(leaveType.id, user.hireDate);
            }
            const approvedRequests = await this.prisma.leaveRequest.aggregate({
                where: {
                    userId,
                    leaveTypeConfigId: leaveType.id,
                    status: 'APPROVED',
                    startDate: {
                        gte: new Date(year, 0, 1),
                        lte: new Date(year, 11, 31),
                    },
                },
                _sum: { approvedDays: true },
            });
            const used = approvedRequests._sum.approvedDays || 0;
            const pendingRequests = await this.prisma.leaveRequest.aggregate({
                where: {
                    userId,
                    leaveTypeConfigId: leaveType.id,
                    status: { in: ['PENDING', 'MGR_APPROVED'] },
                    startDate: {
                        gte: new Date(year, 0, 1),
                        lte: new Date(year, 11, 31),
                    },
                },
                _sum: { requestedDays: true },
            });
            const pending = pendingRequests._sum.requestedDays || 0;
            const previousYearBalance = await this.prisma.leaveBalance.findUnique({
                where: {
                    userId_leaveTypeId_year: {
                        userId,
                        leaveTypeId: leaveType.id,
                        year: year - 1,
                    },
                },
            });
            let carriedForward = 0;
            if (previousYearBalance && leaveType.allowCarryForward) {
                const prevAvailable = this.calculateAvailable(previousYearBalance);
                carriedForward = leaveType.maxCarryForwardDays
                    ? Math.min(prevAvailable, leaveType.maxCarryForwardDays)
                    : prevAvailable;
            }
            await this.prisma.leaveBalance.upsert({
                where: {
                    userId_leaveTypeId_year: { userId, leaveTypeId: leaveType.id, year },
                },
                create: {
                    userId,
                    leaveTypeId: leaveType.id,
                    companyId: user.companyId,
                    year,
                    entitled: new library_1.Decimal(entitled),
                    carriedForward: new library_1.Decimal(carriedForward),
                    used: new library_1.Decimal(used),
                    pending: new library_1.Decimal(pending),
                },
                update: {
                    entitled: new library_1.Decimal(entitled),
                    used: new library_1.Decimal(used),
                    pending: new library_1.Decimal(pending),
                },
            });
        }
        return this.getEmployeeBalances(userId, year);
    }
    calculateAvailable(balance) {
        const entitled = Number(balance.entitled);
        const carried = Number(balance.carriedForward);
        const used = Number(balance.used);
        const pending = Number(balance.pending);
        return entitled + carried - used - pending;
    }
};
exports.LeaveBalanceService = LeaveBalanceService;
exports.LeaveBalanceService = LeaveBalanceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        leave_type_config_service_1.LeaveTypeConfigService])
], LeaveBalanceService);
//# sourceMappingURL=leave-balance.service.js.map