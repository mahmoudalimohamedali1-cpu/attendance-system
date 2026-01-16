export declare enum ReportCategory {
    ATTENDANCE = "ATTENDANCE",
    PAYROLL = "PAYROLL",
    LEAVES = "LEAVES",
    HR = "HR",
    DISCIPLINARY = "DISCIPLINARY",
    CUSTODY = "CUSTODY",
    EXECUTIVE = "EXECUTIVE"
}
export declare enum ReportPeriod {
    DAILY = "DAILY",
    WEEKLY = "WEEKLY",
    MONTHLY = "MONTHLY",
    QUARTERLY = "QUARTERLY",
    YEARLY = "YEARLY",
    CUSTOM = "CUSTOM"
}
export declare enum ExportFormat {
    JSON = "JSON",
    EXCEL = "EXCEL",
    PDF = "PDF",
    CSV = "CSV"
}
export declare class ExtendedReportQueryDto {
    startDate?: string;
    endDate?: string;
    branchId?: string;
    departmentId?: string;
    userId?: string;
    period?: ReportPeriod;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export declare class AttendanceDetailedQueryDto extends ExtendedReportQueryDto {
    status?: string;
    isWorkFromHome?: boolean;
}
export declare class LateReportQueryDto extends ExtendedReportQueryDto {
    minLateMinutes?: number;
    maxLateMinutes?: number;
}
export declare class OvertimeReportQueryDto extends ExtendedReportQueryDto {
    minOvertimeHours?: number;
}
export declare class PayrollReportQueryDto extends ExtendedReportQueryDto {
    year?: number;
    month?: number;
    payrollRunId?: string;
}
export declare class AdvanceReportQueryDto extends ExtendedReportQueryDto {
    status?: string;
}
export declare class LeaveReportQueryDto extends ExtendedReportQueryDto {
    leaveType?: string;
    status?: string;
}
export declare class EmployeeReportQueryDto extends ExtendedReportQueryDto {
    status?: string;
    nationality?: string;
    isSaudi?: boolean;
    contractType?: string;
}
export declare class ContractExpiryQueryDto extends ExtendedReportQueryDto {
    daysBeforeExpiry?: number;
}
export declare class DocumentExpiryQueryDto extends ExtendedReportQueryDto {
    documentType?: string;
    daysBeforeExpiry?: number;
}
export declare class DisciplinaryReportQueryDto extends ExtendedReportQueryDto {
    caseStatus?: string;
    violationType?: string;
}
export declare class CustodyReportQueryDto extends ExtendedReportQueryDto {
    status?: string;
    categoryId?: string;
}
export interface ReportMetadata {
    reportName: string;
    reportNameEn: string;
    generatedAt: Date;
    filters: Record<string, any>;
    totalCount: number;
    page?: number;
    limit?: number;
    totalPages?: number;
}
export interface PaginatedReportResponse<T> {
    metadata: ReportMetadata;
    data: T[];
    summary?: Record<string, any>;
}
export interface ChartDataPoint {
    label: string;
    value: number;
    color?: string;
}
export interface KPIData {
    name: string;
    nameEn: string;
    value: number;
    target?: number;
    unit: string;
    trend?: 'up' | 'down' | 'stable';
    changePercent?: number;
}
export interface ExecutiveDashboardData {
    kpis: KPIData[];
    alerts: AlertItem[];
    charts: {
        attendanceTrend: ChartDataPoint[];
        payrollDistribution: ChartDataPoint[];
        leaveDistribution: ChartDataPoint[];
        employeesByDepartment: ChartDataPoint[];
    };
    quickStats: {
        totalEmployees: number;
        activeEmployees: number;
        presentToday: number;
        onLeaveToday: number;
        pendingRequests: number;
        upcomingExpiries: number;
    };
}
export interface AlertItem {
    id: string;
    type: 'WARNING' | 'DANGER' | 'INFO';
    title: string;
    titleEn: string;
    message: string;
    messageEn: string;
    entityType?: string;
    entityId?: string;
    createdAt: Date;
}
export interface ReportDefinition {
    id: string;
    name: string;
    nameEn: string;
    description: string;
    descriptionEn: string;
    category: ReportCategory;
    endpoint: string;
    icon: string;
    supportsExport: ExportFormat[];
    requiredPermission: string;
}
export declare const REPORTS_CATALOG: ReportDefinition[];
