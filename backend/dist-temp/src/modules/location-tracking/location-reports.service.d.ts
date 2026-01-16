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
export declare class LocationReportsService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getExitSummary(companyId: string, startDate: Date, endDate: Date): Promise<ExitReportSummary>;
    getDailyExitReport(companyId: string, startDate: Date, endDate: Date): Promise<DailyExitReport[]>;
    getEmployeeExitDetail(companyId: string, userId: string, startDate: Date, endDate: Date): Promise<EmployeeExitDetail | null>;
    getAllEmployeesExitStats(companyId: string, startDate: Date, endDate: Date): Promise<{
        userId: string;
        employeeName: string;
        employeeCode: string;
        departmentName?: string;
        exitCount: number;
        totalDuration: number;
    }[]>;
}
