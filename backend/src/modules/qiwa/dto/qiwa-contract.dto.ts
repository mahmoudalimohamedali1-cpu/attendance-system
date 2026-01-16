import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsNumber, IsBoolean, Min, IsObject } from 'class-validator';

// ===== QIWA Registration Status =====
export enum QiwaRegistrationStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    REJECTED = 'REJECTED',
}

// ===== QIWA Occupation Codes (Sample - would be extended based on QIWA API) =====
export enum QiwaOccupationCode {
    MANAGER = '1',
    ENGINEER = '2',
    ACCOUNTANT = '3',
    TECHNICIAN = '4',
    SALES = '5',
    ADMINISTRATIVE = '6',
    SECURITY = '7',
    DRIVER = '8',
    LABORER = '9',
    OTHER = '99',
}

// ===== DTO for Registering Contract to QIWA =====
export class RegisterContractToQiwaDto {
    @ApiProperty({ description: 'معرف العقد المحلي' })
    @IsString()
    @IsNotEmpty()
    contractId: string;

    @ApiProperty({ description: 'رقم هوية الموظف (إقامة/هوية وطنية)' })
    @IsString()
    @IsNotEmpty()
    employeeNationalId: string;

    @ApiProperty({ description: 'رمز المهنة في قوى', enum: QiwaOccupationCode })
    @IsEnum(QiwaOccupationCode)
    occupationCode: QiwaOccupationCode;

    @ApiProperty({ description: 'تاريخ بداية العقد' })
    @IsDateString()
    startDate: string;

    @ApiPropertyOptional({ description: 'تاريخ نهاية العقد' })
    @IsDateString()
    @IsOptional()
    endDate?: string;

    @ApiProperty({ description: 'الراتب الأساسي' })
    @IsNumber()
    @Min(0)
    basicSalary: number;

    @ApiPropertyOptional({ description: 'بدل السكن' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    housingAllowance?: number;

    @ApiPropertyOptional({ description: 'بدل المواصلات' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    transportAllowance?: number;

    @ApiPropertyOptional({ description: 'بدلات أخرى' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    otherAllowances?: number;

    @ApiProperty({ description: 'ساعات العمل الأسبوعية' })
    @IsNumber()
    @Min(1)
    workingHoursPerWeek: number;

    @ApiPropertyOptional({ description: 'المسمى الوظيفي' })
    @IsString()
    @IsOptional()
    jobTitle?: string;

    @ApiPropertyOptional({ description: 'موقع العمل' })
    @IsString()
    @IsOptional()
    workLocation?: string;

    @ApiPropertyOptional({ description: 'تاريخ نهاية فترة التجربة' })
    @IsDateString()
    @IsOptional()
    probationEndDate?: string;

    @ApiPropertyOptional({ description: 'بيانات إضافية خاصة بقوى' })
    @IsObject()
    @IsOptional()
    additionalQiwaData?: Record<string, any>;
}

// ===== DTO for Updating QIWA Contract =====
export class UpdateQiwaContractDto {
    @ApiProperty({ description: 'معرف العقد المحلي' })
    @IsString()
    @IsNotEmpty()
    contractId: string;

    @ApiProperty({ description: 'رقم العقد في قوى' })
    @IsString()
    @IsNotEmpty()
    qiwaContractId: string;

    @ApiPropertyOptional({ description: 'تاريخ النهاية الجديد' })
    @IsDateString()
    @IsOptional()
    newEndDate?: string;

    @ApiPropertyOptional({ description: 'الراتب الأساسي الجديد' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    newBasicSalary?: number;

    @ApiPropertyOptional({ description: 'بدل السكن الجديد' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    newHousingAllowance?: number;

    @ApiPropertyOptional({ description: 'بدل المواصلات الجديد' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    newTransportAllowance?: number;

    @ApiPropertyOptional({ description: 'بدلات أخرى جديدة' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    newOtherAllowances?: number;

    @ApiPropertyOptional({ description: 'سبب التحديث' })
    @IsString()
    @IsOptional()
    updateReason?: string;
}

// ===== DTO for Terminating Contract in QIWA =====
export class TerminateQiwaContractDto {
    @ApiProperty({ description: 'معرف العقد المحلي' })
    @IsString()
    @IsNotEmpty()
    contractId: string;

    @ApiProperty({ description: 'رقم العقد في قوى' })
    @IsString()
    @IsNotEmpty()
    qiwaContractId: string;

    @ApiProperty({ description: 'تاريخ الإنهاء' })
    @IsDateString()
    terminationDate: string;

    @ApiProperty({ description: 'سبب الإنهاء' })
    @IsString()
    @IsNotEmpty()
    terminationReason: string;

    @ApiPropertyOptional({ description: 'رمز سبب الإنهاء في قوى' })
    @IsString()
    @IsOptional()
    qiwaTerminationCode?: string;

    @ApiPropertyOptional({ description: 'ملاحظات إضافية' })
    @IsString()
    @IsOptional()
    notes?: string;
}

// ===== DTO for QIWA Registration Response =====
export class QiwaRegistrationResponseDto {
    @ApiProperty({ description: 'حالة التسجيل', enum: QiwaRegistrationStatus })
    status: QiwaRegistrationStatus;

    @ApiPropertyOptional({ description: 'رقم العقد في قوى' })
    qiwaContractId?: string;

    @ApiPropertyOptional({ description: 'رقم المرجع في قوى' })
    qiwaReferenceNumber?: string;

    @ApiPropertyOptional({ description: 'رسالة الاستجابة' })
    message?: string;

    @ApiPropertyOptional({ description: 'تاريخ التسجيل' })
    registrationDate?: Date;

    @ApiPropertyOptional({ description: 'أخطاء في حال الفشل' })
    errors?: string[];

    @ApiPropertyOptional({ description: 'بيانات إضافية من قوى' })
    additionalData?: Record<string, any>;
}

// ===== DTO for Checking QIWA Contract Status =====
export class CheckQiwaContractStatusDto {
    @ApiProperty({ description: 'رقم العقد في قوى' })
    @IsString()
    @IsNotEmpty()
    qiwaContractId: string;

    @ApiPropertyOptional({ description: 'رقم هوية الموظف' })
    @IsString()
    @IsOptional()
    employeeNationalId?: string;
}

// ===== DTO for Bulk Registration =====
export class BulkRegisterContractsDto {
    @ApiProperty({ description: 'قائمة معرفات العقود للتسجيل', type: [String] })
    @IsString({ each: true })
    @IsNotEmpty()
    contractIds: string[];

    @ApiPropertyOptional({ description: 'تسجيل تدريجي (إيقاف عند الخطأ)', default: false })
    @IsBoolean()
    @IsOptional()
    stopOnError?: boolean;
}

// ===== DTO for Bulk Registration Response =====
export class BulkRegistrationResponseDto {
    @ApiProperty({ description: 'عدد العقود الناجحة' })
    successCount: number;

    @ApiProperty({ description: 'عدد العقود الفاشلة' })
    failureCount: number;

    @ApiProperty({ description: 'نتائج التسجيل التفصيلية' })
    results: Array<{
        contractId: string;
        status: QiwaRegistrationStatus;
        qiwaContractId?: string;
        error?: string;
    }>;
}
