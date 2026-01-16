export declare class DashboardSummaryDto {
    period: string;
    headcount: number;
    grossTotal: number;
    deductionsTotal: number;
    gosiTotal: number;
    netTotal: number;
    employerGosiTotal: number;
    ledgerDraftAmount: number;
    ledgerPostedAmount: number;
    eosSettlementTotal: number;
    wpsStatus: 'NOT_STARTED' | 'READY' | 'EXPORTED';
    isLocked: boolean;
}
export declare class DashboardHealthDto {
    attendance: 'COMPLETE' | 'PARTIAL' | 'MISSING';
    leaves: 'OK' | 'PENDING';
    advances: 'OK' | 'PENDING';
    policies: 'OK' | 'MISSING';
    gosiConfig: 'OK' | 'MISSING';
    payrollCalculated: boolean;
    payrollLocked: boolean;
    mudadStatus?: string;
    wpsReady?: boolean;
}
export declare class DashboardExceptionsDto {
    lateEmployees: number;
    earlyDepartureCases: number;
    absentWithoutLeave: number;
    adjustedPayslips: number;
    highVarianceEmployees: number;
    noBankAccountCount?: number;
    gosiSkippedCount?: number;
    stuckSubmissionsCount?: number;
}
export declare class DashboardTrendsDto {
    periods: string[];
    gross: number[];
    net: number[];
    gosi: number[];
    otHours: number[];
}
export declare class RoleBasedDashboardDto {
    role: string;
    summary?: Partial<DashboardSummaryDto>;
    health?: Partial<DashboardHealthDto>;
    exceptions?: Partial<DashboardExceptionsDto>;
    trends?: Partial<DashboardTrendsDto>;
}
export declare const ROLE_VISIBILITY: {
    ADMIN: {
        summary: string[];
        health: string[];
        exceptions: string[];
        trends: string[];
    };
    HR: {
        summary: string[];
        health: string[];
        exceptions: string[];
        trends: string[];
    };
    FINANCE: {
        summary: string[];
        health: string[];
        exceptions: string[];
        trends: string[];
    };
    EMPLOYEE: {
        summary: never[];
        health: never[];
        exceptions: never[];
        trends: never[];
    };
};
export declare function filterByRole<T extends object>(data: T, allowedKeys: string[]): Partial<T>;
