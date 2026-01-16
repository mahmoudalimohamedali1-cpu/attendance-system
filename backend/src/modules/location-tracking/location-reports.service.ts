/**
 * Location Reports Service - تقارير التتبع
 * Feature #2: تقارير الخروج اليومية/الأسبوعية/الشهرية
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface ExitReportSummary {
    totalExits: number;
    totalDuration: number;
    averageDuration: number;
    employeesWithExits: number;
    topExitEmployees: {
        userId: string;
        userName: string;
        exitCount: number;
        totalDuration: number;
    }[];
}

export interface DailyExitReport {
    date: string;
    exitCount: number;
    totalDuration: number;
    uniqueEmployees: number;
}

export interface EmployeeExitDetail {
    userId: string;
    employeeName: string;
    employeeCode: string;
    departmentName?: string;
    exitCount: number;
    totalDuration: number;
    averageDuration: number;
    longestExit: number;
    exits: {
        id: string;
        exitTime: Date;
        returnTime?: Date;
        duration?: number;
        distance: number;
    }[];
}

@Injectable()
export class LocationReportsService {
    private readonly logger = new Logger(LocationReportsService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * تقرير ملخص الخروج (يومي/أسبوعي/شهري)
     */
    async getExitSummary(
        companyId: string,
        startDate: Date,
        endDate: Date,
    ): Promise<ExitReportSummary> {
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

        // حساب عدد الموظفين الفريدين
        const uniqueEmployeeIds = new Set(exits.map(e => e.userId));
        const employeesWithExits = uniqueEmployeeIds.size;

        // أكثر الموظفين خروجاً
        const employeeStats: Record<string, {
            userId: string;
            userName: string;
            exitCount: number;
            totalDuration: number;
        }> = {};

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

    /**
     * تقرير الخروج اليومي
     */
    async getDailyExitReport(
        companyId: string,
        startDate: Date,
        endDate: Date,
    ): Promise<DailyExitReport[]> {
        const exits = await this.prisma.geofenceExitEvent.findMany({
            where: {
                companyId,
                exitTime: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });

        // تجميع حسب اليوم
        const dailyStats: Record<string, DailyExitReport> = {};

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

        // حساب الموظفين الفريدين لكل يوم
        for (const dateKey of Object.keys(dailyStats)) {
            const dayExits = exits.filter(
                e => e.exitTime.toISOString().split('T')[0] === dateKey
            );
            dailyStats[dateKey].uniqueEmployees = new Set(
                dayExits.map(e => e.userId)
            ).size;
        }

        return Object.values(dailyStats).sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    }

    /**
     * تقرير تفصيلي لموظف
     */
    async getEmployeeExitDetail(
        companyId: string,
        userId: string,
        startDate: Date,
        endDate: Date,
    ): Promise<EmployeeExitDetail | null> {
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

        if (!user) return null;

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

    /**
     * إحصائيات جميع الموظفين
     */
    async getAllEmployeesExitStats(
        companyId: string,
        startDate: Date,
        endDate: Date,
    ): Promise<{
        userId: string;
        employeeName: string;
        employeeCode: string;
        departmentName?: string;
        exitCount: number;
        totalDuration: number;
    }[]> {
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

        const stats: Record<string, {
            userId: string;
            employeeName: string;
            employeeCode: string;
            departmentName?: string;
            exitCount: number;
            totalDuration: number;
        }> = {};

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
}
