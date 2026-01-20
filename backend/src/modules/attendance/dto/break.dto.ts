import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { BreakType } from '@prisma/client';

/**
 * DTO لبدء استراحة
 */
export class StartBreakDto {
    @IsUUID()
    attendanceId: string;

    @IsEnum(BreakType)
    @IsOptional()
    type?: BreakType = 'PERSONAL' as BreakType;

    @IsString()
    @IsOptional()
    notes?: string;
}

/**
 * DTO لإنهاء استراحة
 */
export class EndBreakDto {
    @IsString()
    @IsOptional()
    notes?: string;
}
