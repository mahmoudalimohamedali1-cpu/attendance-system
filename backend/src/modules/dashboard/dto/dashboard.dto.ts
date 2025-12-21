import { ApiProperty } from '@nestjs/swagger';

// Base Summary (shared)
export class DashboardSummaryDto {
    @ApiProperty() period: string;
    @ApiProperty() headcount: number;
    @ApiProperty() grossTotal: number;
    @ApiProperty() deductionsTotal: number;
    @ApiProperty() gosiTotal: number;
    @ApiProperty() netTotal: number;
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
}

export class DashboardExceptionsDto {
    @ApiProperty() lateEmployees: number;
    @ApiProperty() earlyDepartureCases: number;
    @ApiProperty() absentWithoutLeave: number;
    @ApiProperty() adjustedPayslips: number;
    @ApiProperty() highVarianceEmployees: number;
}

export class DashboardTrendsDto {
    @ApiProperty() periods: string[];
    @ApiProperty() gross: number[];
    @ApiProperty() net: number[];
    @ApiProperty() gosi: number[];
    @ApiProperty() otHours: number[];
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
        summary: ['period', 'headcount', 'grossTotal', 'deductionsTotal', 'gosiTotal', 'netTotal', 'wpsStatus', 'isLocked'],
        health: ['attendance', 'leaves', 'advances', 'policies', 'gosiConfig', 'payrollCalculated', 'payrollLocked'],
        exceptions: ['lateEmployees', 'earlyDepartureCases', 'absentWithoutLeave', 'adjustedPayslips', 'highVarianceEmployees'],
        trends: ['periods', 'gross', 'net', 'gosi', 'otHours'],
    },
    HR: {
        summary: ['period', 'headcount', 'isLocked'],
        health: ['attendance', 'leaves', 'advances', 'payrollCalculated', 'payrollLocked'],
        exceptions: ['lateEmployees', 'earlyDepartureCases', 'absentWithoutLeave'],
        trends: ['periods', 'otHours'],
    },
    FINANCE: {
        summary: ['period', 'headcount', 'grossTotal', 'deductionsTotal', 'gosiTotal', 'netTotal', 'wpsStatus', 'isLocked'],
        health: ['gosiConfig', 'payrollCalculated', 'payrollLocked'],
        exceptions: ['adjustedPayslips', 'highVarianceEmployees'],
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
