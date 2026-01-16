import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsBoolean, IsNumber, IsArray } from 'class-validator';

// ===== Sync Status =====
export enum QiwaSyncStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    PARTIAL = 'PARTIAL',
}

// ===== Sync Type =====
export enum QiwaSyncType {
    FULL_SYNC = 'FULL_SYNC',
    INCREMENTAL = 'INCREMENTAL',
    CONTRACTS_ONLY = 'CONTRACTS_ONLY',
    EMPLOYEES_ONLY = 'EMPLOYEES_ONLY',
    SAUDIZATION_ONLY = 'SAUDIZATION_ONLY',
}

// ===== DTO for Triggering Sync =====
export class TriggerQiwaSyncDto {
    @ApiProperty({ description: 'نوع المزامنة', enum: QiwaSyncType })
    @IsEnum(QiwaSyncType)
    syncType: QiwaSyncType;

    @ApiPropertyOptional({ description: 'تاريخ البداية للمزامنة التزايدية' })
    @IsDateString()
    @IsOptional()
    fromDate?: string;

    @ApiPropertyOptional({ description: 'تاريخ النهاية للمزامنة التزايدية' })
    @IsDateString()
    @IsOptional()
    toDate?: string;

    @ApiPropertyOptional({ description: 'فرض المزامنة الكاملة', default: false })
    @IsBoolean()
    @IsOptional()
    forceFullSync?: boolean;

    @ApiPropertyOptional({ description: 'معرفات محددة للمزامنة', type: [String] })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    specificIds?: string[];
}

// ===== DTO for Sync Response =====
export class QiwaSyncResponseDto {
    @ApiProperty({ description: 'معرف عملية المزامنة' })
    syncId: string;

    @ApiProperty({ description: 'حالة المزامنة', enum: QiwaSyncStatus })
    status: QiwaSyncStatus;

    @ApiProperty({ description: 'نوع المزامنة', enum: QiwaSyncType })
    syncType: QiwaSyncType;

    @ApiProperty({ description: 'تاريخ البداية' })
    startedAt: Date;

    @ApiPropertyOptional({ description: 'تاريخ الانتهاء' })
    completedAt?: Date;

    @ApiProperty({ description: 'عدد السجلات المعالجة' })
    processedCount: number;

    @ApiProperty({ description: 'عدد السجلات الناجحة' })
    successCount: number;

    @ApiProperty({ description: 'عدد السجلات الفاشلة' })
    failureCount: number;

    @ApiPropertyOptional({ description: 'رسائل الأخطاء', type: [String] })
    errors?: string[];

    @ApiPropertyOptional({ description: 'تحذيرات', type: [String] })
    warnings?: string[];

    @ApiPropertyOptional({ description: 'معلومات إضافية' })
    metadata?: Record<string, any>;
}

// ===== DTO for Synced Contract Data from QIWA =====
export class SyncedQiwaContractDto {
    @ApiProperty({ description: 'رقم العقد في قوى' })
    @IsString()
    @IsNotEmpty()
    qiwaContractId: string;

    @ApiProperty({ description: 'رقم هوية الموظف' })
    @IsString()
    @IsNotEmpty()
    employeeNationalId: string;

    @ApiProperty({ description: 'حالة العقد في قوى' })
    @IsString()
    @IsNotEmpty()
    qiwaStatus: string;

    @ApiProperty({ description: 'تاريخ البداية' })
    @IsDateString()
    startDate: string;

    @ApiPropertyOptional({ description: 'تاريخ النهاية' })
    @IsDateString()
    @IsOptional()
    endDate?: string;

    @ApiProperty({ description: 'الراتب الأساسي' })
    @IsNumber()
    basicSalary: number;

    @ApiPropertyOptional({ description: 'بدل السكن' })
    @IsNumber()
    @IsOptional()
    housingAllowance?: number;

    @ApiPropertyOptional({ description: 'بدل المواصلات' })
    @IsNumber()
    @IsOptional()
    transportAllowance?: number;

    @ApiPropertyOptional({ description: 'المسمى الوظيفي' })
    @IsString()
    @IsOptional()
    jobTitle?: string;

    @ApiPropertyOptional({ description: 'رمز المهنة' })
    @IsString()
    @IsOptional()
    occupationCode?: string;

    @ApiPropertyOptional({ description: 'تاريخ آخر تحديث في قوى' })
    @IsDateString()
    @IsOptional()
    lastUpdatedInQiwa?: string;

    @ApiPropertyOptional({ description: 'بيانات إضافية من قوى' })
    @IsOptional()
    additionalData?: Record<string, any>;
}

// ===== DTO for Saudization Data from QIWA =====
export class SyncedSaudizationDataDto {
    @ApiProperty({ description: 'إجمالي عدد الموظفين' })
    @IsNumber()
    totalEmployees: number;

    @ApiProperty({ description: 'عدد الموظفين السعوديين' })
    @IsNumber()
    saudiEmployees: number;

    @ApiProperty({ description: 'عدد الموظفين غير السعوديين' })
    @IsNumber()
    nonSaudiEmployees: number;

    @ApiProperty({ description: 'نسبة السعودة' })
    @IsNumber()
    saudizationPercentage: number;

    @ApiProperty({ description: 'الحد الأدنى المطلوب' })
    @IsNumber()
    requiredPercentage: number;

    @ApiProperty({ description: 'حالة الامتثال' })
    @IsBoolean()
    isCompliant: boolean;

    @ApiPropertyOptional({ description: 'العجز في عدد السعوديين' })
    @IsNumber()
    @IsOptional()
    saudiDeficit?: number;

    @ApiPropertyOptional({ description: 'تصنيف المنشأة في نطاقات' })
    @IsString()
    @IsOptional()
    nitaqatCategory?: string;

    @ApiPropertyOptional({ description: 'تاريخ آخر تحديث' })
    @IsDateString()
    @IsOptional()
    lastUpdated?: string;
}

// ===== DTO for Sync History =====
export class QiwaSyncHistoryDto {
    @ApiProperty({ description: 'معرف عملية المزامنة' })
    id: string;

    @ApiProperty({ description: 'نوع المزامنة', enum: QiwaSyncType })
    syncType: QiwaSyncType;

    @ApiProperty({ description: 'حالة المزامنة', enum: QiwaSyncStatus })
    status: QiwaSyncStatus;

    @ApiProperty({ description: 'تاريخ البداية' })
    startedAt: Date;

    @ApiPropertyOptional({ description: 'تاريخ الانتهاء' })
    completedAt?: Date;

    @ApiProperty({ description: 'عدد السجلات المعالجة' })
    processedCount: number;

    @ApiProperty({ description: 'عدد السجلات الناجحة' })
    successCount: number;

    @ApiProperty({ description: 'عدد السجلات الفاشلة' })
    failureCount: number;

    @ApiProperty({ description: 'المستخدم الذي بدأ المزامنة' })
    triggeredBy: string;

    @ApiPropertyOptional({ description: 'رسالة الخطأ' })
    errorMessage?: string;
}

// ===== DTO for Getting Sync Status =====
export class GetSyncStatusDto {
    @ApiProperty({ description: 'معرف عملية المزامنة' })
    @IsString()
    @IsNotEmpty()
    syncId: string;
}

// ===== DTO for Contract Discrepancy =====
export class ContractDiscrepancyDto {
    @ApiProperty({ description: 'معرف العقد المحلي' })
    localContractId: string;

    @ApiPropertyOptional({ description: 'رقم العقد في قوى' })
    qiwaContractId?: string;

    @ApiProperty({ description: 'نوع التباين' })
    discrepancyType: string;

    @ApiProperty({ description: 'الحقل المتباين' })
    field: string;

    @ApiProperty({ description: 'القيمة المحلية' })
    localValue: any;

    @ApiPropertyOptional({ description: 'القيمة في قوى' })
    qiwaValue?: any;

    @ApiProperty({ description: 'مستوى الخطورة (low, medium, high)' })
    severity: string;

    @ApiPropertyOptional({ description: 'الإجراء الموصى به' })
    recommendedAction?: string;
}

// ===== DTO for Sync Report =====
export class QiwaSyncReportDto {
    @ApiProperty({ description: 'معلومات عملية المزامنة' })
    syncInfo: QiwaSyncResponseDto;

    @ApiProperty({ description: 'قائمة العقود المزامنة', type: [SyncedQiwaContractDto] })
    syncedContracts: SyncedQiwaContractDto[];

    @ApiPropertyOptional({ description: 'بيانات السعودة' })
    saudizationData?: SyncedSaudizationDataDto;

    @ApiPropertyOptional({ description: 'قائمة التباينات', type: [ContractDiscrepancyDto] })
    discrepancies?: ContractDiscrepancyDto[];

    @ApiProperty({ description: 'ملخص النتائج' })
    summary: {
        totalContracts: number;
        syncedContracts: number;
        failedContracts: number;
        discrepanciesFound: number;
        saudizationCompliant: boolean;
    };
}

// ===== DTO for Auto-Sync Configuration =====
export class ConfigureAutoSyncDto {
    @ApiProperty({ description: 'تفعيل المزامنة التلقائية' })
    @IsBoolean()
    enabled: boolean;

    @ApiPropertyOptional({ description: 'نوع المزامنة التلقائية', enum: QiwaSyncType })
    @IsEnum(QiwaSyncType)
    @IsOptional()
    syncType?: QiwaSyncType;

    @ApiPropertyOptional({ description: 'التكرار (بالدقائق)', default: 60 })
    @IsNumber()
    @IsOptional()
    intervalMinutes?: number;

    @ApiPropertyOptional({ description: 'المزامنة في وقت محدد (HH:MM)' })
    @IsString()
    @IsOptional()
    scheduledTime?: string;
}
