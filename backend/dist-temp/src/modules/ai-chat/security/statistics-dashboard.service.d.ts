export interface DashboardStats {
    attendance: {
        present: number;
        absent: number;
        late: number;
        onLeave: number;
        total: number;
        rate: number;
    };
    leaves: {
        pending: number;
        approved: number;
        rejected: number;
    };
    payroll: {
        totalSalaries: number;
        processed: number;
        pending: number;
    };
    tasks: {
        completed: number;
        inProgress: number;
        overdue: number;
    };
}
export interface KPI {
    id: string;
    name: string;
    nameAr: string;
    value: number;
    target: number;
    unit: string;
    trend: 'up' | 'down' | 'stable';
    change: number;
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
}
export interface Comparison {
    metric: string;
    metricAr: string;
    current: number;
    previous: number;
    change: number;
    changePercent: number;
    better: boolean;
}
export interface TrendPoint {
    date: Date;
    value: number;
}
export interface TrendData {
    metric: string;
    metricAr: string;
    points: TrendPoint[];
    average: number;
    min: number;
    max: number;
}
export declare class StatisticsDashboardService {
    private readonly logger;
    getDashboardStats(): DashboardStats;
    getKPIs(): KPI[];
    getComparisons(period?: 'week' | 'month' | 'quarter'): Comparison[];
    getTrendData(metric: string, days?: number): TrendData;
    formatDashboardStats(): string;
    formatKPIs(): string;
    formatComparisons(): string;
    formatSparkline(data: TrendData): string;
}
