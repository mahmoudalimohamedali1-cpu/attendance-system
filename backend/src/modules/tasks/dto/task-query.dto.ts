import { IsOptional, IsEnum, IsString, IsDateString, IsUUID, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

export class TaskQueryDto {
    @ApiPropertyOptional({ description: 'البحث في العنوان والوصف' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ enum: TaskStatus })
    @IsOptional()
    @IsEnum(TaskStatus)
    status?: TaskStatus;

    @ApiPropertyOptional({ enum: TaskPriority })
    @IsOptional()
    @IsEnum(TaskPriority)
    priority?: TaskPriority;

    @ApiPropertyOptional({ description: 'معرف الفئة' })
    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @ApiPropertyOptional({ description: 'معرف السبرنت' })
    @IsOptional()
    @IsUUID()
    sprintId?: string;

    @ApiPropertyOptional({ description: 'المكلف بالمهمة' })
    @IsOptional()
    @IsUUID()
    assigneeId?: string;

    @ApiPropertyOptional({ description: 'منشئ المهمة' })
    @IsOptional()
    @IsUUID()
    createdById?: string;

    @ApiPropertyOptional({ description: 'تاريخ الاستحقاق من' })
    @IsOptional()
    @IsDateString()
    dueDateFrom?: string;

    @ApiPropertyOptional({ description: 'تاريخ الاستحقاق إلى' })
    @IsOptional()
    @IsDateString()
    dueDateTo?: string;

    @ApiPropertyOptional({ description: 'علامات للفلترة (مفصولة بفاصلة)' })
    @IsOptional()
    @IsString()
    tags?: string;

    @ApiPropertyOptional({ description: 'رقم الصفحة', default: 1, minimum: 1 })
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'عدد العناصر في الصفحة', default: 20, minimum: 1 })
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    @Min(1)
    limit?: number = 20;

    @ApiPropertyOptional({ description: 'ترتيب حسب', default: 'createdAt' })
    @IsOptional()
    @IsString()
    sortBy?: string = 'createdAt';

    @ApiPropertyOptional({ description: 'اتجاه الترتيب', enum: ['asc', 'desc'], default: 'desc' })
    @IsOptional()
    @IsString()
    sortOrder?: 'asc' | 'desc' = 'desc';
}
