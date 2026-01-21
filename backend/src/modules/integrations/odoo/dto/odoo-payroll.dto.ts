import { IsString, IsOptional, IsDateString, IsNumber, IsDecimal } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Payroll Export Request
export class ExportPayrollDto {
    @ApiProperty({ description: 'Payroll period start' })
    @IsDateString()
    periodStart: string;

    @ApiProperty({ description: 'Payroll period end' })
    @IsDateString()
    periodEnd: string;

    @ApiPropertyOptional({ description: 'Specific employee IDs to export' })
    @IsOptional()
    userIds?: string[];
}

// Employee Payroll Data
export class OdooPayrollDataDto {
    @ApiProperty()
    odooEmployeeId: number;

    @ApiProperty()
    userId: string;

    @ApiProperty()
    employeeName: string;

    @ApiProperty()
    workedDays: number;

    @ApiProperty()
    workedHours: number;

    @ApiProperty()
    overtimeHours: number;

    @ApiProperty()
    lateMinutes: number;

    @ApiProperty()
    earlyLeaveMinutes: number;

    @ApiProperty()
    absentDays: number;

    @ApiPropertyOptional()
    deductions?: {
        lateDeduction: number;
        earlyLeaveDeduction: number;
        absentDeduction: number;
        totalDeduction: number;
    };
}

// Payroll Export Result
export class PayrollExportResultDto {
    @ApiProperty()
    periodStart: string;

    @ApiProperty()
    periodEnd: string;

    @ApiProperty()
    totalEmployees: number;

    @ApiProperty()
    exported: number;

    @ApiProperty()
    failed: number;

    @ApiProperty()
    data: OdooPayrollDataDto[];

    @ApiProperty()
    errors: { userId: string; error: string }[];
}
