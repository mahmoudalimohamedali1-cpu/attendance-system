import { IsString, IsOptional, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskCategoryDto {
    @ApiProperty({ description: 'اسم الفئة بالعربية', example: 'مهام الموارد البشرية' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ description: 'اسم الفئة بالإنجليزية' })
    @IsOptional()
    @IsString()
    nameEn?: string;

    @ApiPropertyOptional({ description: 'لون الفئة (Hex)', example: '#3B82F6' })
    @IsOptional()
    @IsString()
    color?: string;

    @ApiPropertyOptional({ description: 'أيقونة الفئة', example: 'folder' })
    @IsOptional()
    @IsString()
    icon?: string;
}

export class UpdateTaskCategoryDto {
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
    color?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    icon?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
