import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * أنواع الاستراحات - معرّفة محلياً لتجنب مشاكل Prisma
 */
export enum BreakType {
    PRAYER = 'PRAYER',
    LUNCH = 'LUNCH',
    PERSONAL = 'PERSONAL',
    REST = 'REST',
    OTHER = 'OTHER',
}

/**
 * DTO لبدء استراحة
 */
export class StartBreakDto {
    @IsUUID()
    attendanceId: string;

    @IsEnum(BreakType)
    @IsOptional()
    type?: BreakType = BreakType.PERSONAL;

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
