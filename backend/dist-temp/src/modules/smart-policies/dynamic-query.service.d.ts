import { PrismaService } from '../../common/prisma/prisma.service';
export declare class DynamicQueryService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    executeQuery(employeeId: string, queryType: string, params: Record<string, any>, startDate: Date, endDate: Date): Promise<any>;
    private countDaysWorkedHoursBetween;
    private countLateArrivals;
    private countEarlyArrivals;
    private sumOvertimeHours;
    private countAbsentDays;
    private getAttendancePattern;
    private executeCustomAggregate;
    resolveDataRequirements(employeeId: string, policyConditions: any[], startDate: Date, endDate: Date): Promise<Record<string, any>>;
    private parseFieldToQuery;
}
