import { IsString, IsOptional, IsEnum, IsDateString, IsArray, IsUUID, ValidateIf, IsNumber, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreateTaskDto {
    @ApiProperty({ description: 'عنوان المهمة', example: 'مراجعة طلب الإجازة' })
    @IsString()
    title: string;

    @ApiPropertyOptional({ description: 'وصف المهمة' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ enum: TaskPriority, default: 'MEDIUM' })
    @IsOptional()
    @IsEnum(TaskPriority)
    priority?: TaskPriority;

    @ApiPropertyOptional({ enum: TaskStatus, default: 'TODO' })
    @IsOptional()
    @IsEnum(TaskStatus)
    status?: TaskStatus;

    @ApiPropertyOptional({ description: 'معرف الفئة' })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @ValidateIf((obj) => obj.categoryId !== undefined && obj.categoryId !== null && obj.categoryId !== '')
    @IsUUID()
    categoryId?: string;


    @ApiPropertyOptional({ description: 'معرف القالب' })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @ValidateIf((obj) => obj.templateId !== undefined && obj.templateId !== null && obj.templateId !== '')
    @IsUUID()
    templateId?: string;

    @ApiPropertyOptional({ description: 'تاريخ الاستحقاق' })
    @IsOptional()
    @IsDateString()
    dueDate?: string;

    @ApiPropertyOptional({ description: 'تاريخ البداية' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ description: 'المكلف بالمهمة' })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @ValidateIf((obj) => obj.assigneeId !== undefined && obj.assigneeId !== null && obj.assigneeId !== '')
    @IsUUID()
    assigneeId?: string;

    @ApiPropertyOptional({ description: 'العلامات', type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @ApiPropertyOptional({ description: 'معرف السبرنت' })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @ValidateIf((obj) => obj.sprintId !== undefined && obj.sprintId !== null && obj.sprintId !== '')
    @IsUUID()
    sprintId?: string;

    @ApiPropertyOptional({ description: 'نقاط القصة (Story Points)', example: 5 })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    storyPoints?: number;

    @ApiPropertyOptional({ description: 'الساعات المقدرة', example: 8 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1000)
    estimatedHours?: number;

    @ApiPropertyOptional({ description: 'حقول مخصصة (JSON)' })
    @IsOptional()
    customFields?: Record<string, any>;
}
