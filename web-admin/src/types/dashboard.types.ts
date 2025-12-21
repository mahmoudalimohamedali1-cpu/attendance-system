/**
 * Dashboard Types - Frontend
 * Matches backend DTOs
 */

export interface DashboardSummary {
    period: string;
    headcount: number;
    grossTotal: number;
    deductionsTotal: number;
    gosiTotal: number;
    netTotal: number;
    wpsStatus: 'NOT_STARTED' | 'READY' | 'EXPORTED';
    isLocked: boolean;
}

export interface DashboardHealth {
    attendance: 'COMPLETE' | 'PARTIAL' | 'MISSING';
    leaves: 'OK' | 'PENDING';
    advances: 'OK' | 'PENDING';
    policies: 'OK' | 'MISSING';
    gosiConfig: 'OK' | 'MISSING';
    payrollCalculated: boolean;
    payrollLocked: boolean;
}

export interface DashboardExceptions {
    lateEmployees: number;
    earlyDepartureCases: number;
    absentWithoutLeave: number;
    adjustedPayslips: number;
    highVarianceEmployees: number;
}

export interface DashboardTrends {
    periods: string[];
    gross: number[];
    net: number[];
    gosi: number[];
    otHours: number[];
}

export interface RoleBasedDashboard {
    role: string;
    summary?: Partial<DashboardSummary>;
    health?: Partial<DashboardHealth>;
    exceptions?: Partial<DashboardExceptions>;
    trends?: Partial<DashboardTrends>;
}

export interface DashboardParams {
    year?: number;
    month?: number;
}
