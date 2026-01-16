import { PrismaService } from '../../common/prisma/prisma.service';
import { DashboardSummaryDto, DashboardHealthDto, DashboardExceptionsDto, DashboardTrendsDto } from './dto/dashboard.dto';
import Redis from 'ioredis';
export declare class DashboardService {
    private readonly prisma;
    private readonly redis;
    private readonly logger;
    constructor(prisma: PrismaService, redis: Redis);
    private cached;
    getSummary(companyId: string, year: number, month: number): Promise<DashboardSummaryDto>;
    private _getSummaryImpl;
    getHealth(companyId: string, year: number, month: number): Promise<DashboardHealthDto>;
    getExceptions(companyId: string, year: number, month: number): Promise<DashboardExceptionsDto>;
    getTrends(companyId: string, months?: number): Promise<DashboardTrendsDto>;
    getUsersQuickStats(companyId: string): Promise<{
        totalActive: number;
        newThisMonth: number;
        onLeaveToday: number;
        pendingApprovals: number;
    }>;
    private _getUsersQuickStatsImpl;
}
