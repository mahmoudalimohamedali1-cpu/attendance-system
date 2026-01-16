import { IsString, IsOptional, IsBoolean, IsUUID, IsArray, IsInt, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============ Checklist DTOs ============

export class CreateChecklistDto {
    @ApiProperty({ description: 'عنوان قائمة التحقق', example: 'متطلبات التوظيف' })
    @IsString()
    title: string;
}

export class CreateChecklistItemDto {
    @ApiProperty({ description: 'محتوى العنصر', example: 'توقيع العقد' })
    @IsString()
    content: string;
}

export class ToggleChecklistItemDto {
    @ApiProperty({ description: 'حالة الإكمال' })
    @IsBoolean()
    isCompleted: boolean;
}

// ============ Comment DTOs ============

export class CreateCommentDto {
    @ApiProperty({ description: 'محتوى التعليق' })
    @IsString()
    content: string;

    @ApiPropertyOptional({ description: 'معرفات المستخدمين المذكورين', type: [String] })
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    mentions?: string[];
}

export class UpdateCommentDto {
    @ApiProperty({ description: 'المحتوى الجديد' })
    @IsString()
    content: string;
}

// ============ Assignment DTOs ============

export class AssignTaskDto {
    @ApiProperty({ description: 'معرف المستخدم المكلف' })
    @IsUUID()
    userId: string;
}

export class BulkAssignDto {
    @ApiProperty({ description: 'معرفات المستخدمين', type: [String] })
    @IsArray()
    @IsUUID('4', { each: true })
    userIds: string[];
}

// ============ Time Log DTOs ============

export class CreateTimeLogDto {
    @ApiProperty({ description: 'وقت البداية' })
    @IsDateString()
    startTime: string;

    @ApiPropertyOptional({ description: 'وقت النهاية' })
    @IsOptional()
    @IsDateString()
    endTime?: string;

    @ApiPropertyOptional({ description: 'المدة بالدقائق' })
    @IsOptional()
    @IsInt()
    duration?: number;

    @ApiPropertyOptional({ description: 'الوصف' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'قابل للفوترة' })
    @IsOptional()
    @IsBoolean()
    isBillable?: boolean;
}

// ============ Dependency DTOs ============

export class AddDependencyDto {
    @ApiProperty({ description: 'معرف المهمة المانعة' })
    @IsUUID()
    blockingTaskId: string;
}

// ============ Kanban DTOs ============

export class ReorderTaskDto {
    @ApiProperty({ description: 'الحالة الجديدة' })
    @IsString()
    status: string;

    @ApiProperty({ description: 'الترتيب الجديد' })
    @IsInt()
    order: number;
}
