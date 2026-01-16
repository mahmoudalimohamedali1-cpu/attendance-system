import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsOptional,
    IsDateString,
    IsNumber,
    IsBoolean,
    IsEnum,
    Min,
} from 'class-validator';

export enum ProgramStatus {
    DEFINING = 'DEFINING',
    PLANNING = 'PLANNING',
    EXECUTING = 'EXECUTING',
    CLOSING = 'CLOSING',
    COMPLETED = 'COMPLETED',
    SUSPENDED = 'SUSPENDED',
}

export class CreateProgramDto {
    @ApiProperty({ description: 'اسم البرنامج' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ description: 'اسم البرنامج بالإنجليزية' })
    @IsString()
    @IsOptional()
    nameEn?: string;

    @ApiPropertyOptional({ description: 'وصف البرنامج' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ description: 'كود البرنامج' })
    @IsString()
    @IsOptional()
    code?: string;

    @ApiPropertyOptional({ description: 'لون البرنامج' })
    @IsString()
    @IsOptional()
    color?: string;

    @ApiPropertyOptional({ description: 'أيقونة البرنامج' })
    @IsString()
    @IsOptional()
    icon?: string;

    @ApiPropertyOptional({ description: 'معرف مدير البرنامج' })
    @IsString()
    @IsOptional()
    managerId?: string;

    @ApiPropertyOptional({ description: 'معرف راعي البرنامج' })
    @IsString()
    @IsOptional()
    sponsorId?: string;

    @ApiPropertyOptional({ description: 'تاريخ البداية' })
    @IsDateString()
    @IsOptional()
    startDate?: string;

    @ApiPropertyOptional({ description: 'تاريخ الانتهاء المخطط' })
    @IsDateString()
    @IsOptional()
    plannedEndDate?: string;

    @ApiPropertyOptional({ description: 'الميزانية الإجمالية' })
    @IsNumber()
    @IsOptional()
    @Min(0)
    totalBudget?: number;

    @ApiPropertyOptional({ description: 'عملة الميزانية' })
    @IsString()
    @IsOptional()
    budgetCurrency?: string;

    @ApiPropertyOptional({ description: 'الأهداف الاستراتيجية' })
    @IsString()
    @IsOptional()
    strategicObjectives?: string;

    @ApiPropertyOptional({ description: 'حالة البرنامج', enum: ProgramStatus })
    @IsEnum(ProgramStatus)
    @IsOptional()
    status?: ProgramStatus;
}

export class UpdateProgramDto {
    @ApiPropertyOptional({ description: 'اسم البرنامج' })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional({ description: 'اسم البرنامج بالإنجليزية' })
    @IsString()
    @IsOptional()
    nameEn?: string;

    @ApiPropertyOptional({ description: 'وصف البرنامج' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ description: 'لون البرنامج' })
    @IsString()
    @IsOptional()
    color?: string;

    @ApiPropertyOptional({ description: 'أيقونة البرنامج' })
    @IsString()
    @IsOptional()
    icon?: string;

    @ApiPropertyOptional({ description: 'معرف مدير البرنامج' })
    @IsString()
    @IsOptional()
    managerId?: string;

    @ApiPropertyOptional({ description: 'معرف راعي البرنامج' })
    @IsString()
    @IsOptional()
    sponsorId?: string;

    @ApiPropertyOptional({ description: 'تاريخ البداية' })
    @IsDateString()
    @IsOptional()
    startDate?: string;

    @ApiPropertyOptional({ description: 'تاريخ الانتهاء المخطط' })
    @IsDateString()
    @IsOptional()
    plannedEndDate?: string;

    @ApiPropertyOptional({ description: 'تاريخ الانتهاء الفعلي' })
    @IsDateString()
    @IsOptional()
    actualEndDate?: string;

    @ApiPropertyOptional({ description: 'الميزانية الإجمالية' })
    @IsNumber()
    @IsOptional()
    @Min(0)
    totalBudget?: number;

    @ApiPropertyOptional({ description: 'الأهداف الاستراتيجية' })
    @IsString()
    @IsOptional()
    strategicObjectives?: string;

    @ApiPropertyOptional({ description: 'حالة البرنامج', enum: ProgramStatus })
    @IsEnum(ProgramStatus)
    @IsOptional()
    status?: ProgramStatus;

    @ApiPropertyOptional({ description: 'الحالة الصحية' })
    @IsString()
    @IsOptional()
    healthStatus?: string;
}
