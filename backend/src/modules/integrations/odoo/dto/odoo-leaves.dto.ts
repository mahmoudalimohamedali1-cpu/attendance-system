import { IsString, IsOptional, IsDateString, IsNumber, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Odoo Leave Types
export class OdooLeaveTypeDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    name: string;

    @ApiPropertyOptional()
    code?: string;

    @ApiPropertyOptional()
    requestUnit?: string; // 'day', 'half_day', 'hour'

    @ApiPropertyOptional()
    validityStart?: string;

    @ApiPropertyOptional()
    validityStop?: string;
}

// Odoo Leave Request
export class OdooLeaveDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    employeeId: number;

    @ApiProperty()
    holidayStatusId: number; // Leave type ID

    @ApiProperty()
    dateFrom: string;

    @ApiProperty()
    dateTo: string;

    @ApiPropertyOptional()
    numberOfDays?: number;

    @ApiPropertyOptional()
    state?: 'draft' | 'confirm' | 'validate1' | 'validate' | 'refuse';

    @ApiPropertyOptional()
    notes?: string;
}

// Sync Leaves Request
export class SyncLeavesDto {
    @ApiPropertyOptional({ description: 'Direction of sync' })
    @IsOptional()
    @IsEnum(['push', 'pull', 'both'])
    direction?: 'push' | 'pull' | 'both' = 'both';

    @ApiPropertyOptional({ description: 'Start date for sync range' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ description: 'End date for sync range' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({ description: 'Only sync approved leaves' })
    @IsOptional()
    @IsBoolean()
    approvedOnly?: boolean = true;
}

// Push Leave to Odoo
export class PushLeaveDto {
    @ApiProperty()
    @IsNumber()
    odooEmployeeId: number;

    @ApiProperty()
    @IsNumber()
    leaveTypeId: number;

    @ApiProperty()
    @IsDateString()
    dateFrom: string;

    @ApiProperty()
    @IsDateString()
    dateTo: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;
}

// Leave Sync Result
export class LeaveSyncResultDto {
    @ApiProperty()
    total: number;

    @ApiProperty()
    pushed: number;

    @ApiProperty()
    pulled: number;

    @ApiProperty()
    failed: number;

    @ApiProperty()
    errors: { id: string; error: string }[];
}
