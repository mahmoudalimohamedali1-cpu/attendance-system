import { IsString, IsNotEmpty, IsOptional, IsDateString, IsNumber, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SyncAttendanceDto {
    @ApiPropertyOptional({ description: 'Start date for sync range' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ description: 'End date for sync range' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({ description: 'Specific user IDs to sync' })
    @IsOptional()
    @IsArray()
    userIds?: string[];
}

export class OdooAttendanceDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    employeeId: number;

    @ApiProperty()
    checkIn: string;

    @ApiPropertyOptional()
    checkOut?: string;

    @ApiPropertyOptional()
    workedHours?: number;
}

export class PushAttendanceDto {
    @ApiProperty()
    @IsNumber()
    odooEmployeeId: number;

    @ApiProperty()
    @IsDateString()
    checkIn: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    checkOut?: string;
}

export class AttendanceSyncResultDto {
    @ApiProperty()
    total: number;

    @ApiProperty()
    pushed: number;

    @ApiProperty()
    failed: number;

    @ApiProperty()
    errors: { attendanceId: string; error: string }[];
}
