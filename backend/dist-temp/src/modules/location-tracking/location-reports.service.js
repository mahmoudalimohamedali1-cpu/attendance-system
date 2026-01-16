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
var LocationReportsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let LocationReportsService = LocationReportsService_1 = class LocationReportsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(LocationReportsService_1.name);
    }
    async getExitSummary(companyId, startDate, endDate) {
        const exits = await this.prisma.geofenceExitEvent.findMany({
            where: {
                companyId,
                exitTime: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        const totalExits = exits.length;
        const totalDuration = exits.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
        const averageDuration = totalExits > 0 ? Math.round(totalDuration / totalExits) : 0;
        const uniqueEmployeeIds = new Set(exits.map(e => e.userId));
        const employeesWithExits = uniqueEmployeeIds.size;
        const employeeStats = {};
        for (const exit of exits) {
            if (!employeeStats[exit.userId]) {
                employeeStats[exit.userId] = {
                    userId: exit.userId,
                    userName: `${exit.user.firstName} ${exit.user.lastName}`,
                    exitCount: 0,
                    totalDuration: 0,
                };
            }
            employeeStats[exit.userId].exitCount++;
            employeeStats[exit.userId].totalDuration += exit.durationMinutes || 0;
        }
        const topExitEmployees = Object.values(employeeStats)
            .sort((a, b) => b.exitCount - a.exitCount)
            .slice(0, 10);
        return {
            totalExits,
            totalDuration,
            averageDuration,
            employeesWithExits,
            topExitEmployees,
        };
    }
    async getDailyExitReport(companyId, startDate, endDate) {
        const exits = await this.prisma.geofenceExitEvent.findMany({
            where: {
                companyId,
                exitTime: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });
        const dailyStats = {};
        for (const exit of exits) {
            const dateKey = exit.exitTime.toISOString().split('T')[0];
            if (!dailyStats[dateKey]) {
                dailyStats[dateKey] = {
                    date: dateKey,
                    exitCount: 0,
                    totalDuration: 0,
                    uniqueEmployees: 0,
                };
            }
            dailyStats[dateKey].exitCount++;
            dailyStats[dateKey].totalDuration += exit.durationMinutes || 0;
        }
        for (const dateKey of Object.keys(dailyStats)) {
            const dayExits = exits.filter(e => e.exitTime.toISOString().split('T')[0] === dateKey);
            dailyStats[dateKey].uniqueEmployees = new Set(dayExits.map(e => e.userId)).size;
        }
        return Object.values(dailyStats).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    async getEmployeeExitDetail(companyId, userId, startDate, endDate) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
                department: { select: { name: true } },
            },
        });
        if (!user)
            return null;
        const exits = await this.prisma.geofenceExitEvent.findMany({
            where: {
                companyId,
                userId,
                exitTime: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: { exitTime: 'desc' },
        });
        const exitCount = exits.length;
        const totalDuration = exits.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
        const averageDuration = exitCount > 0 ? Math.round(totalDuration / exitCount) : 0;
        const longestExit = Math.max(...exits.map(e => e.durationMinutes || 0), 0);
        return {
            userId: user.id,
            employeeName: `${user.firstName} ${user.lastName}`,
            employeeCode: user.employeeCode || '',
            departmentName: user.department?.name,
            exitCount,
            totalDuration,
            averageDuration,
            longestExit,
            exits: exits.map(e => ({
                id: e.id,
                exitTime: e.exitTime,
                returnTime: e.returnTime || undefined,
                duration: e.durationMinutes || undefined,
                distance: e.distanceFromBranch,
            })),
        };
    }
    async getAllEmployeesExitStats(companyId, startDate, endDate) {
        const exits = await this.prisma.geofenceExitEvent.findMany({
            where: {
                companyId,
                exitTime: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        department: { select: { name: true } },
                    },
                },
            },
        });
        const stats = {};
        for (const exit of exits) {
            if (!stats[exit.userId]) {
                stats[exit.userId] = {
                    userId: exit.userId,
                    employeeName: `${exit.user.firstName} ${exit.user.lastName}`,
                    employeeCode: exit.user.employeeCode || '',
                    departmentName: exit.user.department?.name,
                    exitCount: 0,
                    totalDuration: 0,
                };
            }
            stats[exit.userId].exitCount++;
            stats[exit.userId].totalDuration += exit.durationMinutes || 0;
        }
        return Object.values(stats).sort((a, b) => b.exitCount - a.exitCount);
    }
};
exports.LocationReportsService = LocationReportsService;
exports.LocationReportsService = LocationReportsService = LocationReportsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LocationReportsService);
//# sourceMappingURL=location-reports.service.js.map