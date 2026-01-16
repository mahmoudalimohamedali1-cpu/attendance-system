import { PartialType } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
    @ApiPropertyOptional({ description: 'نسبة الإنجاز (0-100)', minimum: 0, maximum: 100 })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    progress?: number;

    @ApiPropertyOptional({ description: 'ترتيب المهمة في الكانبان' })
    @IsOptional()
    @IsInt()
    @Min(0)
    order?: number;
}
