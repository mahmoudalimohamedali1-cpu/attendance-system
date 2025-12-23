import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsNumber, IsBoolean, Min } from 'class-validator';

export enum ContractType {
    PERMANENT = 'PERMANENT',
    FIXED_TERM = 'FIXED_TERM',
    PART_TIME = 'PART_TIME',
    SEASONAL = 'SEASONAL',
    PROBATION = 'PROBATION',
}

export enum ContractStatus {
    DRAFT = 'DRAFT',
    PENDING_EMPLOYEE = 'PENDING_EMPLOYEE',
    PENDING_EMPLOYER = 'PENDING_EMPLOYER',
    PENDING_QIWA = 'PENDING_QIWA',
    ACTIVE = 'ACTIVE',
    EXPIRED = 'EXPIRED',
    TERMINATED = 'TERMINATED',
    RENEWED = 'RENEWED',
    SUSPENDED = 'SUSPENDED',
    REJECTED = 'REJECTED',
}

export enum QiwaAuthStatus {
    NOT_SUBMITTED = 'NOT_SUBMITTED',
    PENDING = 'PENDING',
    AUTHENTICATED = 'AUTHENTICATED',
    REJECTED = 'REJECTED',
    EXPIRED = 'EXPIRED',
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

    // ===== حقول الراتب - متطلبات قوى =====
    @ApiPropertyOptional({ description: 'الراتب الأساسي' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    basicSalary?: number;

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

    // ===== بيانات العمل =====
    @ApiPropertyOptional({ description: 'المسمى الوظيفي في العقد' })
    @IsString()
    @IsOptional()
    contractJobTitle?: string;

    @ApiPropertyOptional({ description: 'مقر العمل' })
    @IsString()
    @IsOptional()
    workLocation?: string;

    @ApiPropertyOptional({ description: 'ساعات العمل الأسبوعية', default: 48 })
    @IsNumber()
    @Min(1)
    @IsOptional()
    workingHoursPerWeek?: number;

    @ApiPropertyOptional({ description: 'أيام الإجازة السنوية', default: 21 })
    @IsNumber()
    @Min(0)
    @IsOptional()
    annualLeaveDays?: number;

    @ApiPropertyOptional({ description: 'فترة الإشعار (بالأيام)', default: 30 })
    @IsNumber()
    @Min(0)
    @IsOptional()
    noticePeriodDays?: number;

    // ===== مستندات وملاحظات =====
    @ApiPropertyOptional({ description: 'رابط ملف العقد' })
    @IsString()
    @IsOptional()
    documentUrl?: string;

    @ApiPropertyOptional({ description: 'بنود إضافية' })
    @IsString()
    @IsOptional()
    additionalTerms?: string;

    @ApiPropertyOptional({ description: 'ملاحظات داخلية' })
    @IsString()
    @IsOptional()
    notes?: string;
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

    // ===== حقول الراتب =====
    @ApiPropertyOptional({ description: 'الراتب الأساسي' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    basicSalary?: number;

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

    // ===== بيانات العمل =====
    @ApiPropertyOptional({ description: 'المسمى الوظيفي في العقد' })
    @IsString()
    @IsOptional()
    contractJobTitle?: string;

    @ApiPropertyOptional({ description: 'مقر العمل' })
    @IsString()
    @IsOptional()
    workLocation?: string;

    @ApiPropertyOptional({ description: 'ساعات العمل الأسبوعية' })
    @IsNumber()
    @Min(1)
    @IsOptional()
    workingHoursPerWeek?: number;

    @ApiPropertyOptional({ description: 'أيام الإجازة السنوية' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    annualLeaveDays?: number;

    @ApiPropertyOptional({ description: 'فترة الإشعار (بالأيام)' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    noticePeriodDays?: number;

    // ===== مستندات وملاحظات =====
    @ApiPropertyOptional({ description: 'رابط ملف العقد' })
    @IsString()
    @IsOptional()
    documentUrl?: string;

    @ApiPropertyOptional({ description: 'بنود إضافية' })
    @IsString()
    @IsOptional()
    additionalTerms?: string;

    @ApiPropertyOptional({ description: 'ملاحظات داخلية' })
    @IsString()
    @IsOptional()
    notes?: string;

    // ===== حالة قوى =====
    @ApiPropertyOptional({ description: 'رقم العقد في قوى' })
    @IsString()
    @IsOptional()
    qiwaContractId?: string;

    @ApiPropertyOptional({ description: 'حالة التوثيق في قوى', enum: QiwaAuthStatus })
    @IsEnum(QiwaAuthStatus)
    @IsOptional()
    qiwaStatus?: QiwaAuthStatus;
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

    @ApiPropertyOptional({ description: 'الراتب الأساسي الجديد' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    newBasicSalary?: number;
}

// ===== DTOs للتوقيع =====
export class SignContractDto {
    @ApiPropertyOptional({ description: 'ملاحظات التوقيع' })
    @IsString()
    @IsOptional()
    signatureNotes?: string;
}

export class RejectContractDto {
    @ApiProperty({ description: 'سبب الرفض' })
    @IsString()
    @IsNotEmpty()
    rejectionReason: string;
}

// ===== DTOs لقوى =====
export class UpdateQiwaStatusDto {
    @ApiProperty({ description: 'رقم العقد في قوى' })
    @IsString()
    @IsOptional()
    qiwaContractId?: string;

    @ApiProperty({ description: 'حالة التوثيق', enum: QiwaAuthStatus })
    @IsEnum(QiwaAuthStatus)
    qiwaStatus: QiwaAuthStatus;

    @ApiPropertyOptional({ description: 'سبب الرفض' })
    @IsString()
    @IsOptional()
    rejectReason?: string;

    @ApiPropertyOptional({ description: 'تاريخ التوثيق' })
    @IsDateString()
    @IsOptional()
    authDate?: string;
}
