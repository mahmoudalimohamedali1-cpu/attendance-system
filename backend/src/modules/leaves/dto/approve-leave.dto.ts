import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class ApproveLeaveDto {
  @ApiProperty({ description: 'ملاحظات الموافق/الرافض', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

