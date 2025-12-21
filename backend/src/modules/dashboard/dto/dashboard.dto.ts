import { ApiProperty } from '@nestjs/swagger';

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
