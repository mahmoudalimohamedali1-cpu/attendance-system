import { ApiProperty } from '@nestjs/swagger';

// Base Summary (shared)
export class DashboardSummaryDto {
    @ApiProperty() period: string;
    @ApiProperty() headcount: number;
    @ApiProperty() grossTotal: number;
    @ApiProperty() deductionsTotal: number;
    @ApiProperty() gosiTotal: number;
    @ApiProperty() netTotal: number;
    @ApiProperty() employerGosiTotal: number; // ✨ حصة صاحب العمل في التأمينات
    @ApiProperty() ledgerDraftAmount: number; // ✨ قيمة القيود المسودة
    @ApiProperty() ledgerPostedAmount: number; // ✨ قيمة القيود المرحلة
    @ApiProperty() eosSettlementTotal: number; // ✨ إجمالي تصفية المستحقات
    @ApiProperty() wpsStatus: 'NOT_STARTED' | 'READY' | 'EXPORTED';
    @ApiProperty() isLocked: boolean;
}

export class DashboardHealthDto {
    @ApiProperty() attendance: 'COMPLETE' | 'PARTIAL' | 'MISSING';
    @ApiProperty() leaves: 'OK' | 'PENDING';
    @ApiProperty() advances: 'OK' | 'PENDING';
    @ApiProperty() policies: 'OK' | 'MISSING';
    @ApiProperty() gosiConfig: 'OK' | 'MISSING';
    @ApiProperty() payrollCalculated: boolean;
    @ApiProperty() payrollLocked: boolean;
    @ApiProperty({ required: false }) mudadStatus?: string;
    @ApiProperty({ required: false }) wpsReady?: boolean;
}

export class DashboardExceptionsDto {
    @ApiProperty() lateEmployees: number;
    @ApiProperty() earlyDepartureCases: number;
    @ApiProperty() absentWithoutLeave: number;
    @ApiProperty() adjustedPayslips: number;
    @ApiProperty() highVarianceEmployees: number;
    @ApiProperty({ required: false }) noBankAccountCount?: number;
    @ApiProperty({ required: false }) gosiSkippedCount?: number;
    @ApiProperty({ required: false }) stuckSubmissionsCount?: number;
}

export class DashboardTrendsDto {
    @ApiProperty() periods: string[];
    @ApiProperty() gross: number[];
    @ApiProperty() net: number[];
    @ApiProperty() gosi: number[];
    @ApiProperty() otHours: number[];
}

export class DashboardMudadMetricsDto {
    @ApiProperty() totalSubmissions: number;
    @ApiProperty() pendingCount: number;
    @ApiProperty() preparedCount: number;
    @ApiProperty() submittedCount: number;
    @ApiProperty() acceptedCount: number;
    @ApiProperty() rejectedCount: number;
    @ApiProperty() resubmitRequiredCount: number;
    @ApiProperty() totalAmount: number;
    @ApiProperty() complianceRate: number; // percentage of accepted/total
    @ApiProperty({ required: false }) lastSubmissionDate?: Date;
    @ApiProperty({ required: false }) nextDueDate?: Date;
}

// Role-based Dashboard Response
export class RoleBasedDashboardDto {
    @ApiProperty() role: string;
    @ApiProperty({ required: false }) summary?: Partial<DashboardSummaryDto>;
    @ApiProperty({ required: false }) health?: Partial<DashboardHealthDto>;
    @ApiProperty({ required: false }) exceptions?: Partial<DashboardExceptionsDto>;
    @ApiProperty({ required: false }) trends?: Partial<DashboardTrendsDto>;
}

// Role visibility configuration
export const ROLE_VISIBILITY = {
    ADMIN: {
        summary: ['period', 'headcount', 'grossTotal', 'deductionsTotal', 'gosiTotal', 'netTotal', 'employerGosiTotal', 'ledgerDraftAmount', 'ledgerPostedAmount', 'eosSettlementTotal', 'wpsStatus', 'isLocked'],
        health: ['attendance', 'leaves', 'advances', 'policies', 'gosiConfig', 'payrollCalculated', 'payrollLocked', 'mudadStatus', 'wpsReady'],
        exceptions: ['lateEmployees', 'earlyDepartureCases', 'absentWithoutLeave', 'adjustedPayslips', 'highVarianceEmployees', 'noBankAccountCount', 'gosiSkippedCount', 'stuckSubmissionsCount'],
        trends: ['periods', 'gross', 'net', 'gosi', 'otHours'],
    },
    HR: {
        summary: ['period', 'headcount', 'isLocked'],
        health: ['attendance', 'leaves', 'advances', 'payrollCalculated', 'payrollLocked', 'mudadStatus', 'wpsReady'],
        exceptions: ['lateEmployees', 'earlyDepartureCases', 'absentWithoutLeave', 'noBankAccountCount'],
        trends: ['periods', 'otHours'],
    },
    FINANCE: {
        summary: ['period', 'headcount', 'grossTotal', 'deductionsTotal', 'gosiTotal', 'netTotal', 'employerGosiTotal', 'ledgerDraftAmount', 'ledgerPostedAmount', 'eosSettlementTotal', 'wpsStatus', 'isLocked'],
        health: ['gosiConfig', 'payrollCalculated', 'payrollLocked', 'wpsReady'],
        exceptions: ['adjustedPayslips', 'highVarianceEmployees', 'noBankAccountCount', 'gosiSkippedCount'],
        trends: ['periods', 'gross', 'net', 'gosi'],
    },
    EMPLOYEE: {
        summary: [],
        health: [],
        exceptions: [],
        trends: [],
    }
};

// Helper to filter object by allowed keys
export function filterByRole<T extends object>(data: T, allowedKeys: string[]): Partial<T> {
    const result: Partial<T> = {};
    for (const key of allowedKeys) {
        if (key in data) {
            (result as any)[key] = (data as any)[key];
        }
    }
    return result;
}
