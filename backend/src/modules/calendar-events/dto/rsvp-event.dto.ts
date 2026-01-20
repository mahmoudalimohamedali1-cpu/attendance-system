import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { RSVPStatus } from '@prisma/client';

export class RSVPEventDto {
  @ApiProperty({
    description: 'حالة الرد على الدعوة',
    enum: RSVPStatus,
    example: 'GOING',
  })
  @IsEnum(RSVPStatus)
  status: RSVPStatus;

  @ApiPropertyOptional({
    description: 'ملاحظات أو تعليق على الحضور',
    example: 'سأحضر في الوقت المحدد',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
