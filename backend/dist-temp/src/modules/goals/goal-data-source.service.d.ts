import { PrismaService } from '../../common/prisma/prisma.service';
export type GoalDataSourceType = 'ATTENDANCE' | 'LEAVES' | 'TASKS' | 'OVERTIME' | 'POLICIES' | 'CUSTODY' | 'RECOGNITION';
export interface DataSourceInfo {
    key: string;
    label: string;
    labelAr: string;
    icon: string;
    metrics: DataSourceMetric[];
}
export interface DataSourceMetric {
    key: string;
    label: string;
    labelAr: string;
    unit: string;
    description: string;
}
export declare const AVAILABLE_DATA_SOURCES: DataSourceInfo[];
export declare class GoalDataSourceService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getAvailableDataSources(): DataSourceInfo[];
    calculateGoalValue(goalId: string, ownerId: string, dataSource: GoalDataSourceType, config: {
        metric: string;
        startDate?: Date;
        endDate?: Date;
    }): Promise<{
        currentValue: number;
        targetValue: number;
        progress: number;
    }>;
    private calculateAttendanceMetric;
    private calculateLeavesMetric;
    private calculateTasksMetric;
    private calculateOvertimeMetric;
    private calculateRecognitionMetric;
    syncAllAutoCalculatedGoals(companyId: string): Promise<number>;
}
