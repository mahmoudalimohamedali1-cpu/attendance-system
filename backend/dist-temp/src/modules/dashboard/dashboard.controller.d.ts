import { DashboardService } from './dashboard.service';
import { DashboardSummaryDto, DashboardHealthDto, DashboardExceptionsDto, DashboardTrendsDto, RoleBasedDashboardDto } from './dto/dashboard.dto';
export declare class DashboardController {
    private readonly service;
    constructor(service: DashboardService);
    getDashboard(companyId: string, role: string, year: string, month: string): Promise<RoleBasedDashboardDto>;
    getSummary(companyId: string, role: string, year: string, month: string): Promise<Partial<DashboardSummaryDto>>;
    getHealth(companyId: string, role: string, year: string, month: string): Promise<Partial<DashboardHealthDto>>;
    getExceptions(companyId: string, role: string, year: string, month: string): Promise<Partial<DashboardExceptionsDto>>;
    getTrends(companyId: string, role: string, months?: string): Promise<Partial<DashboardTrendsDto>>;
    getUsersStats(companyId: string): Promise<{
        totalActive: number;
        newThisMonth: number;
        onLeaveToday: number;
        pendingApprovals: number;
    }>;
}
