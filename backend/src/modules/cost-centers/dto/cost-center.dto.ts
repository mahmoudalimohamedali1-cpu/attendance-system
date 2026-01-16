import { ApiProperty } from '@nestjs/swagger';
import {
    IsString,
    IsOptional,
    IsBoolean,
    IsNumber,
    IsDateString,
    IsEnum,
    Min,
    Max,
} from 'class-validator';

export enum CostCenterType {
    OPERATING = 'OPERATING',
    PROJECT = 'PROJECT',
    OVERHEAD = 'OVERHEAD',
    REVENUE = 'REVENUE',
}

export enum CostCenterStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    ARCHIVED = 'ARCHIVED',
}

export class CreateCostCenterDto {
    @ApiProperty({ description: 'كود مركز التكلفة', example: 'CC-001' })
    @IsString()
    code: string;

    @ApiProperty({ description: 'اسم مركز التكلفة بالعربية', example: 'تقنية المعلومات' })
    @IsString()
    nameAr: string;

    @ApiProperty({ description: 'اسم مركز التكلفة بالإنجليزية', required: false })
    @IsOptional()
    @IsString()
    nameEn?: string;

    @ApiProperty({ description: 'الوصف', required: false })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ description: 'نوع مركز التكلفة', enum: CostCenterType, default: CostCenterType.OPERATING })
    @IsOptional()
    @IsEnum(CostCenterType)
    type?: CostCenterType;

    @ApiProperty({ description: 'معرف مركز التكلفة الأب (للهيكل الهرمي)', required: false })
    @IsOptional()
    @IsString()
    parentId?: string;

    @ApiProperty({ description: 'معرف المدير المسؤول', required: false })
    @IsOptional()
    @IsString()
    managerId?: string;

    @ApiProperty({ description: 'تاريخ بداية الفعالية', required: false })
    @IsOptional()
    @IsDateString()
    effectiveFrom?: string;

    @ApiProperty({ description: 'تاريخ نهاية الفعالية', required: false })
    @IsOptional()
    @IsDateString()
    effectiveTo?: string;

    @ApiProperty({ description: 'السماح بتجاوز الميزانية', default: false })
    @IsOptional()
    @IsBoolean()
    isAllowOverbudget?: boolean;

    @ApiProperty({ description: 'معرف القسم المرتبط', required: false })
    @IsOptional()
    @IsString()
    departmentId?: string;

    @ApiProperty({ description: 'الحد الأقصى لعدد الموظفين', required: false })
    @IsOptional()
    @IsNumber()
    @Min(0)
    maxHeadcount?: number;

    @ApiProperty({ description: 'نسبة التنبيه للميزانية (0-100)', required: false, default: 80 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    budgetAlertThreshold?: number;
}

export class UpdateCostCenterDto {
    @ApiProperty({ description: 'كود مركز التكلفة', required: false })
    @IsOptional()
    @IsString()
    code?: string;

    @ApiProperty({ description: 'اسم مركز التكلفة بالعربية', required: false })
    @IsOptional()
    @IsString()
    nameAr?: string;

    @ApiProperty({ description: 'اسم مركز التكلفة بالإنجليزية', required: false })
    @IsOptional()
    @IsString()
    nameEn?: string;

    @ApiProperty({ description: 'الوصف', required: false })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ description: 'نوع مركز التكلفة', enum: CostCenterType, required: false })
    @IsOptional()
    @IsEnum(CostCenterType)
    type?: CostCenterType;

    @ApiProperty({ description: 'الحالة', enum: CostCenterStatus, required: false })
    @IsOptional()
    @IsEnum(CostCenterStatus)
    status?: CostCenterStatus;

    @ApiProperty({ description: 'معرف مركز التكلفة الأب', required: false })
    @IsOptional()
    @IsString()
    parentId?: string;

    @ApiProperty({ description: 'معرف المدير المسؤول', required: false })
    @IsOptional()
    @IsString()
    managerId?: string;

    @ApiProperty({ description: 'تاريخ نهاية الفعالية', required: false })
    @IsOptional()
    @IsDateString()
    effectiveTo?: string;

    @ApiProperty({ description: 'السماح بتجاوز الميزانية', required: false })
    @IsOptional()
    @IsBoolean()
    isAllowOverbudget?: boolean;

    @ApiProperty({ description: 'معرف القسم المرتبط', required: false })
    @IsOptional()
    @IsString()
    departmentId?: string;

    @ApiProperty({ description: 'الحد الأقصى لعدد الموظفين', required: false })
    @IsOptional()
    @IsNumber()
    @Min(0)
    maxHeadcount?: number;

    @ApiProperty({ description: 'نسبة التنبيه للميزانية (0-100)', required: false })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    budgetAlertThreshold?: number;
}

export class CreateAllocationDto {
    @ApiProperty({ description: 'معرف الموظف' })
    @IsString()
    userId: string;

    @ApiProperty({ description: 'معرف مركز التكلفة (يأتي من URL)', required: false })
    @IsOptional()
    @IsString()
    costCenterId?: string;

    @ApiProperty({ description: 'نسبة التوزيع (0-100)', minimum: 0, maximum: 100 })
    @IsNumber()
    @Min(0)
    @Max(100)
    percentage: number;

    @ApiProperty({ description: 'نوع التوزيع', default: 'POSITION' })
    @IsOptional()
    @IsString()
    allocationType?: string;

    @ApiProperty({ description: 'تاريخ بداية الفعالية', required: false })
    @IsOptional()
    @IsDateString()
    effectiveFrom?: string;

    @ApiProperty({ description: 'تاريخ نهاية الفعالية', required: false })
    @IsOptional()
    @IsDateString()
    effectiveTo?: string;

    @ApiProperty({ description: 'سبب التوزيع', required: false })
    @IsOptional()
    @IsString()
    reason?: string;
}

export class CreateBudgetDto {
    @ApiProperty({ description: 'معرف مركز التكلفة (يأتي من URL)', required: false })
    @IsOptional()
    @IsString()
    costCenterId?: string;

    @ApiProperty({ description: 'السنة', example: 2026 })
    @IsNumber()
    year: number;

    @ApiProperty({ description: 'الشهر (1-12، اختياري للميزانية السنوية)', required: false })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(12)
    month?: number;

    @ApiProperty({ description: 'الربع السنوي (1-4)', required: false })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(4)
    quarter?: number;

    @ApiProperty({ description: 'مبلغ الميزانية' })
    @IsNumber()
    @Min(0)
    budgetAmount: number;

    @ApiProperty({ description: 'ملاحظات', required: false })
    @IsOptional()
    @IsString()
    notes?: string;
}
