import { PrismaService } from '../../../common/prisma/prisma.service';
export declare class SystemContextBuilderService {
    private readonly prisma;
    private readonly logger;
    private readonly cache;
    private readonly CACHE_TTL;
    constructor(prisma: PrismaService);
    buildFullContext(companyId: string): Promise<string>;
    private getCompanyContext;
    private getEmployeesContext;
    private getAttendanceContext;
    private getLeavesContext;
    private getDepartmentsContext;
    private getShiftsContext;
    private getTodayEvents;
    private translateRole;
    searchEmployee(companyId: string, query: string): Promise<string>;
    getQuickStats(companyId: string): Promise<string>;
    private getPayrollContext;
    private getTasksContext;
    private getAdvancesContext;
    private getCustodyContext;
    private getDisciplinaryContext;
    private getSalariesContext;
    private getExpiringDocuments;
    private getPendingRequests;
}
