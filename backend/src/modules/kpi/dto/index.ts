/**
 * KPI Module DTOs
 * Data Transfer Objects for KPI Engine
 */

import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsObject, Min, Max, IsArray, IsDateString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

// ==================== Enums ====================

export enum KPISourceType {
    MANUAL = 'MANUAL',
    SYSTEM_SYNC = 'SYSTEM_SYNC',
    API_IMPORT = 'API_IMPORT',
    CSV_IMPORT = 'CSV_IMPORT',
}

export enum KPIFrequency {
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
    QUARTERLY = 'QUARTERLY',
    YEARLY = 'YEARLY',
}

// ==================== KPI Definition DTOs ====================

export class CreateKPIDefinitionDto {
    @IsString()
    companyId: string;

    @IsOptional()
    @IsString()
    jobFamilyId?: string;

    @IsString()
    code: string;

    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    nameAr?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsString()
    unit: string; // %, count, SAR, hours

    @IsOptional()
    @IsObject()
    formula?: Record<string, any>;

    @IsObject()
    thresholds: {
        exceptional: number; // 90+
        exceeds: number; // 80+
        meets: number; // 70+
        partial: number; // 60+
    };

    @IsOptional()
    @IsEnum(KPISourceType)
    sourceType?: KPISourceType;

    @IsOptional()
    @IsEnum(KPIFrequency)
    frequency?: KPIFrequency;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    minValue?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    maxValue?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    targetValue?: number;
}

export class UpdateKPIDefinitionDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    nameAr?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    unit?: string;

    @IsOptional()
    @IsObject()
    formula?: Record<string, any>;

    @IsOptional()
    @IsObject()
    thresholds?: {
        exceptional: number;
        exceeds: number;
        meets: number;
        partial: number;
    };

    @IsOptional()
    @IsEnum(KPISourceType)
    sourceType?: KPISourceType;

    @IsOptional()
    @IsEnum(KPIFrequency)
    frequency?: KPIFrequency;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    minValue?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    maxValue?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    targetValue?: number;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

// ==================== KPI Assignment DTOs ====================

export class CreateKPIAssignmentDto {
    @IsString()
    cycleId: string;

    @IsString()
    employeeId: string;

    @IsString()
    kpiDefinitionId: string;

    @IsNumber()
    @Type(() => Number)
    target: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    @Type(() => Number)
    weight?: number;

    @IsOptional()
    @IsString()
    notes?: string;
}

export class BulkCreateKPIAssignmentDto {
    @IsString()
    cycleId: string;

    @IsArray()
    @IsString({ each: true })
    employeeIds: string[];

    @IsString()
    kpiDefinitionId: string;

    @IsNumber()
    @Type(() => Number)
    target: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    @Type(() => Number)
    weight?: number;
}

export class UpdateKPIAssignmentDto {
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    target?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    @Type(() => Number)
    weight?: number;

    @IsOptional()
    @IsString()
    notes?: string;
}

// ==================== KPI Entry DTOs ====================

export class CreateKPIEntryDto {
    @IsString()
    assignmentId: string;

    @IsDateString()
    periodStart: string;

    @IsDateString()
    periodEnd: string;

    @IsNumber()
    @Type(() => Number)
    value: number;

    @IsOptional()
    @IsString()
    source?: string; // manual, import, api

    @IsOptional()
    @IsString()
    notes?: string;
}

export class BulkCreateKPIEntryDto {
    @IsArray()
    entries: CreateKPIEntryDto[];
}

export class ImportKPIEntriesDto {
    @IsString()
    cycleId: string;

    @IsArray()
    data: {
        employeeCode?: string;
        employeeId?: string;
        kpiCode: string;
        periodStart: string;
        periodEnd: string;
        value: number;
    }[];
}

// ==================== Query DTOs ====================

export class GetKPIDefinitionsQueryDto {
    @IsOptional()
    @IsString()
    jobFamilyId?: string;

    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    isActive?: boolean;

    @IsOptional()
    @IsEnum(KPISourceType)
    sourceType?: KPISourceType;

    @IsOptional()
    @IsEnum(KPIFrequency)
    frequency?: KPIFrequency;
}

export class GetKPIAssignmentsQueryDto {
    @IsOptional()
    @IsString()
    cycleId?: string;

    @IsOptional()
    @IsString()
    employeeId?: string;

    @IsOptional()
    @IsString()
    kpiDefinitionId?: string;
}

// ==================== Score Calculation ====================

export class CalculateKPIScoreDto {
    @IsString()
    assignmentId: string;
}

export class RecalculateAllScoresDto {
    @IsString()
    cycleId: string;

    @IsOptional()
    @IsString()
    employeeId?: string;
}
