import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsOptional,
    IsBoolean,
    IsInt,
    IsEnum,
    Min,
    Max,
    IsArray,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

enum LeaveCategory {
    BALANCED = 'BALANCED',
    CASUAL = 'CASUAL',
    SICK = 'SICK',
    UNPAID = 'UNPAID',
}

export class EntitlementTierDto {
    @ApiProperty({ description: 'من سنة خدمة' })
    @IsInt()
    @Min(0)
    minServiceYears: number;

    @ApiProperty({ description: 'إلى سنة خدمة (999 = غير محدود)' })
    @IsInt()
    @Min(0)
    maxServiceYears: number;

    @ApiProperty({ description: 'عدد أيام الاستحقاق' })
    @IsInt()
    @Min(0)
    entitlementDays: number;
}

export class SickPayTierDto {
    @ApiProperty({ description: 'من يوم' })
    @IsInt()
    @Min(1)
    fromDay: number;

    @ApiProperty({ description: 'إلى يوم' })
    @IsInt()
    @Min(1)
    toDay: number;

    @ApiProperty({ description: 'نسبة الراتب (0-100)' })
    @IsInt()
    @Min(0)
    @Max(100)
    paymentPercent: number;
}

export class CreateLeaveTypeConfigDto {
    @ApiProperty({ description: 'كود الإجازة (ANNUAL, SICK, etc.)' })
    @IsString()
    code: string;

    @ApiProperty({ description: 'الاسم بالعربي' })
    @IsString()
    nameAr: string;

    @ApiPropertyOptional({ description: 'الاسم بالإنجليزي' })
    @IsOptional()
    @IsString()
    nameEn?: string;

    @ApiPropertyOptional({ description: 'الوصف' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ description: 'تصنيف الإجازة', enum: LeaveCategory })
    @IsEnum(LeaveCategory)
    category: LeaveCategory;

    @ApiPropertyOptional({ description: 'هل تعتمد على استحقاق؟', default: true })
    @IsOptional()
    @IsBoolean()
    isEntitlementBased?: boolean;

    @ApiPropertyOptional({ description: 'الاستحقاق الافتراضي', default: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    defaultEntitlement?: number;

    @ApiPropertyOptional({ description: 'الحد الأقصى للتراكم' })
    @IsOptional()
    @IsInt()
    @Min(0)
    maxBalanceCap?: number;

    @ApiPropertyOptional({ description: 'السماح بالترحيل', default: true })
    @IsOptional()
    @IsBoolean()
    allowCarryForward?: boolean;

    @ApiPropertyOptional({ description: 'الحد الأقصى للأيام المرحلة' })
    @IsOptional()
    @IsInt()
    @Min(0)
    maxCarryForwardDays?: number;

    @ApiPropertyOptional({ description: 'مدة صلاحية الأيام المرحلة (بالشهور)' })
    @IsOptional()
    @IsInt()
    @Min(1)
    carryForwardExpiryMonths?: number;

    @ApiPropertyOptional({ description: 'هل مدفوعة الأجر؟', default: true })
    @IsOptional()
    @IsBoolean()
    isPaid?: boolean;

    @ApiPropertyOptional({ description: 'نسبة الأجر (0-100)', default: 100 })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    paymentPercentage?: number;

    @ApiPropertyOptional({ description: 'هل تتطلب مرفقات؟', default: false })
    @IsOptional()
    @IsBoolean()
    requiresAttachment?: boolean;

    @ApiPropertyOptional({ description: 'المرفقات مطلوبة بعد عدد أيام' })
    @IsOptional()
    @IsInt()
    @Min(1)
    attachmentRequiredAfterDays?: number;

    @ApiPropertyOptional({ description: 'الحد الأدنى لفترة الإشعار (بالأيام)', default: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    minNoticeDays?: number;

    @ApiPropertyOptional({ description: 'الحد الأدنى لأيام الطلب', default: 1 })
    @IsOptional()
    @IsInt()
    @Min(1)
    minRequestDays?: number;

    @ApiPropertyOptional({ description: 'الحد الأقصى لأيام الطلب' })
    @IsOptional()
    @IsInt()
    @Min(1)
    maxRequestDays?: number;

    @ApiPropertyOptional({ description: 'السماح بالرصيد السالب', default: false })
    @IsOptional()
    @IsBoolean()
    allowNegativeBalance?: boolean;

    @ApiPropertyOptional({ description: 'خصم من السنوية إذا نفد الرصيد', default: false })
    @IsOptional()
    @IsBoolean()
    deductFromAnnual?: boolean;

    @ApiPropertyOptional({ description: 'مرة واحدة فقط (مثل الحج)', default: false })
    @IsOptional()
    @IsBoolean()
    isOneTimeOnly?: boolean;

    @ApiPropertyOptional({ description: 'ترتيب العرض', default: 0 })
    @IsOptional()
    @IsInt()
    sortOrder?: number;

    @ApiPropertyOptional({ description: 'شرائح الاستحقاق', type: [EntitlementTierDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => EntitlementTierDto)
    entitlementTiers?: EntitlementTierDto[];

    @ApiPropertyOptional({ description: 'شرائح أجر الإجازة المرضية', type: [SickPayTierDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SickPayTierDto)
    sickPayTiers?: SickPayTierDto[];
}

export class UpdateLeaveTypeConfigDto {
    @ApiPropertyOptional({ description: 'الاسم بالعربي' })
    @IsOptional()
    @IsString()
    nameAr?: string;

    @ApiPropertyOptional({ description: 'الاسم بالإنجليزي' })
    @IsOptional()
    @IsString()
    nameEn?: string;

    @ApiPropertyOptional({ description: 'الوصف' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'الاستحقاق الافتراضي' })
    @IsOptional()
    @IsInt()
    @Min(0)
    defaultEntitlement?: number;

    @ApiPropertyOptional({ description: 'الحد الأقصى للتراكم' })
    @IsOptional()
    @IsInt()
    @Min(0)
    maxBalanceCap?: number;

    @ApiPropertyOptional({ description: 'السماح بالترحيل' })
    @IsOptional()
    @IsBoolean()
    allowCarryForward?: boolean;

    @ApiPropertyOptional({ description: 'الحد الأقصى للأيام المرحلة' })
    @IsOptional()
    @IsInt()
    @Min(0)
    maxCarryForwardDays?: number;

    @ApiPropertyOptional({ description: 'هل مفعل؟' })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ description: 'ترتيب العرض' })
    @IsOptional()
    @IsInt()
    sortOrder?: number;
}
