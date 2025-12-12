import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDateString, IsUUID, IsOptional } from 'class-validator';

export class WorkFromHomeDto {
  @ApiProperty({ description: 'معرف الموظف' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'التاريخ', example: '2024-01-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'السبب', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

