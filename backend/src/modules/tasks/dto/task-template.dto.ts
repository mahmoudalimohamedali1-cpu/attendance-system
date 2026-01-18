import { IsString, IsOptional, IsArray, IsInt, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority } from '../../../shared/enums';

export class CreateTaskTemplateDto {
    @ApiProperty({ description: 'اسم القالب بالعربية', example: 'قالب مهام التوظيف' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ description: 'اسم القالب بالإنجليزية' })
    @IsOptional()
    @IsString()
    nameEn?: string;

    @ApiPropertyOptional({ description: 'وصف القالب' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'معرف الفئة' })
    @IsOptional()
    @IsString()
    categoryId?: string;

    @ApiPropertyOptional({ enum: TaskPriority, description: 'الأولوية الافتراضية' })
    @IsOptional()
    @IsEnum(TaskPriority)
    defaultPriority?: TaskPriority;

    @ApiPropertyOptional({ description: 'عدد الأيام الافتراضية للاستحقاق' })
    @IsOptional()
    @IsInt()
    @Min(1)
    defaultDueDays?: number;

    @ApiPropertyOptional({ description: 'نوع سير العمل', example: 'ONBOARDING' })
    @IsOptional()
    @IsString()
    workflowType?: string;

    @ApiPropertyOptional({
        description: 'قائمة المهام الفرعية (Checklist Template)',
        example: [{ title: 'إعداد الحاسب', items: ['تثبيت البرامج', 'إعداد البريد'] }]
    })
    @IsOptional()
    @IsArray()
    checklistTemplate?: any[];
}

export class UpdateTaskTemplateDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    nameEn?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    categoryId?: string;

    @ApiPropertyOptional({ enum: TaskPriority })
    @IsOptional()
    @IsEnum(TaskPriority)
    defaultPriority?: TaskPriority;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @Min(1)
    defaultDueDays?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    workflowType?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    checklistTemplate?: any[];
}
