import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString } from 'class-validator';

export enum ContractType {
    PERMANENT = 'PERMANENT',
    FIXED_TERM = 'FIXED_TERM',
    PART_TIME = 'PART_TIME',
    SEASONAL = 'SEASONAL',
    PROBATION = 'PROBATION',
}

export enum ContractStatus {
    ACTIVE = 'ACTIVE',
    EXPIRED = 'EXPIRED',
    TERMINATED = 'TERMINATED',
    RENEWED = 'RENEWED',
    SUSPENDED = 'SUSPENDED',
}

export class CreateContractDto {
    @ApiProperty({ description: 'معرف الموظف' })
    @IsString()
    @IsNotEmpty()
    userId: string;

    @ApiPropertyOptional({ description: 'رقم العقد' })
    @IsString()
    @IsOptional()
    contractNumber?: string;

    @ApiProperty({ description: 'نوع العقد', enum: ContractType })
    @IsEnum(ContractType)
    type: ContractType;

    @ApiProperty({ description: 'تاريخ البداية' })
    @IsDateString()
    startDate: string;

    @ApiPropertyOptional({ description: 'تاريخ النهاية' })
    @IsDateString()
    @IsOptional()
    endDate?: string;

    @ApiPropertyOptional({ description: 'تاريخ انتهاء فترة التجربة' })
    @IsDateString()
    @IsOptional()
    probationEndDate?: string;

    @ApiPropertyOptional({ description: 'دورة صرف الراتب', default: 'MONTHLY' })
    @IsString()
    @IsOptional()
    salaryCycle?: string;

    @ApiPropertyOptional({ description: 'رابط ملف العقد' })
    @IsString()
    @IsOptional()
    documentUrl?: string;
}

export class UpdateContractDto {
    @ApiPropertyOptional({ description: 'نوع العقد', enum: ContractType })
    @IsEnum(ContractType)
    @IsOptional()
    type?: ContractType;

    @ApiPropertyOptional({ description: 'حالة العقد', enum: ContractStatus })
    @IsEnum(ContractStatus)
    @IsOptional()
    status?: ContractStatus;

    @ApiPropertyOptional({ description: 'تاريخ البداية' })
    @IsDateString()
    @IsOptional()
    startDate?: string;

    @ApiPropertyOptional({ description: 'تاريخ النهاية' })
    @IsDateString()
    @IsOptional()
    endDate?: string;

    @ApiPropertyOptional({ description: 'تاريخ انتهاء فترة التجربة' })
    @IsDateString()
    @IsOptional()
    probationEndDate?: string;

    @ApiPropertyOptional({ description: 'دورة صرف الراتب' })
    @IsString()
    @IsOptional()
    salaryCycle?: string;

    @ApiPropertyOptional({ description: 'رابط ملف العقد' })
    @IsString()
    @IsOptional()
    documentUrl?: string;
}

export class TerminateContractDto {
    @ApiProperty({ description: 'سبب الإنهاء' })
    @IsString()
    @IsNotEmpty()
    terminationReason: string;
}

export class RenewContractDto {
    @ApiProperty({ description: 'تاريخ انتهاء العقد الجديد' })
    @IsDateString()
    newEndDate: string;

    @ApiPropertyOptional({ description: 'نوع العقد الجديد', enum: ContractType })
    @IsEnum(ContractType)
    @IsOptional()
    newType?: ContractType;
}
