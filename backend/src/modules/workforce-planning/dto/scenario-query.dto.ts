import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ScenarioType, ScenarioStatus } from './scenario.dto';

export class ScenarioQueryDto {
    @ApiProperty({ description: 'Filter by scenario type', enum: ScenarioType, required: false })
    @IsOptional()
    @IsEnum(ScenarioType)
    type?: ScenarioType;

    @ApiProperty({ description: 'Filter by scenario status', enum: ScenarioStatus, required: false })
    @IsOptional()
    @IsEnum(ScenarioStatus)
    status?: ScenarioStatus;

    @ApiProperty({ description: 'Filter by department ID', required: false })
    @IsOptional()
    @IsString()
    departmentId?: string;

    @ApiProperty({ description: 'Filter by branch ID', required: false })
    @IsOptional()
    @IsString()
    branchId?: string;
}
