import {
    IsString,
    IsOptional,
    IsBoolean,
    IsNumber,
    IsEnum,
    IsDate,
    IsArray,
    ValidateNested,
    IsNotEmpty,
    MinLength,
    MaxLength,
    Min,
    Max,
    IsUUID,
    Matches,
    ArrayMinSize,
    ArrayMaxSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SmartPolicyStatus, SmartPolicyTrigger } from '@prisma/client';

// ============== Base DTOs ==============

/**
 * DTO لإنشاء سياسة ذكية
 */
export class CreateSmartPolicyDto {
    @ApiProperty({
        description: 'النص الأصلي للسياسة بالعربي',
        example: 'الموظف اللي يتأخر أكتر من 3 مرات في الشهر يتخصم منه 100 ريال',
        minLength: 10,
        maxLength: 2000,
    })
    @IsString({ message: 'النص يجب أن يكون نص' })
    @IsNotEmpty({ message: 'النص الأصلي مطلوب' })
    @MinLength(10, { message: 'النص يجب أن يكون 10 أحرف على الأقل' })
    @MaxLength(2000, { message: 'النص يجب أن لا يتجاوز 2000 حرف' })
    @Transform(({ value }) => value?.trim())
    originalText: string;

    @ApiPropertyOptional({
        description: 'اسم السياسة',
        example: 'سياسة خصم التأخير',
        maxLength: 200,
    })
    @IsOptional()
    @IsString({ message: 'الاسم يجب أن يكون نص' })
    @MaxLength(200, { message: 'الاسم يجب أن لا يتجاوز 200 حرف' })
    @Transform(({ value }) => value?.trim())
    name?: string;

    @ApiPropertyOptional({
        description: 'تاريخ بداية السريان',
        example: '2025-01-01',
    })
    @IsOptional()
    @IsDate({ message: 'تاريخ البداية يجب أن يكون تاريخ صحيح' })
    @Type(() => Date)
    effectiveFrom?: Date;

    @ApiPropertyOptional({
        description: 'تاريخ نهاية السريان',
        example: '2025-12-31',
    })
    @IsOptional()
    @IsDate({ message: 'تاريخ النهاية يجب أن يكون تاريخ صحيح' })
    @Type(() => Date)
    effectiveTo?: Date;
}

/**
 * DTO لتحديث سياسة ذكية
 */
export class UpdateSmartPolicyDto {
    @ApiPropertyOptional({
        description: 'اسم السياسة',
        maxLength: 200,
    })
    @IsOptional()
    @IsString({ message: 'الاسم يجب أن يكون نص' })
    @MaxLength(200, { message: 'الاسم يجب أن لا يتجاوز 200 حرف' })
    @Transform(({ value }) => value?.trim())
    name?: string;

    @ApiPropertyOptional({
        description: 'حالة السياسة',
        enum: SmartPolicyStatus,
    })
    @IsOptional()
    @IsEnum(SmartPolicyStatus, { message: 'حالة السياسة غير صالحة' })
    status?: SmartPolicyStatus;

    @ApiPropertyOptional({
        description: 'هل السياسة نشطة',
    })
    @IsOptional()
    @IsBoolean({ message: 'القيمة يجب أن تكون صح أو خطأ' })
    isActive?: boolean;

    @ApiPropertyOptional({
        description: 'أولوية السياسة',
        minimum: 0,
        maximum: 1000,
    })
    @IsOptional()
    @IsNumber({}, { message: 'الأولوية يجب أن تكون رقم' })
    @Min(0, { message: 'الأولوية يجب أن تكون 0 أو أكثر' })
    @Max(1000, { message: 'الأولوية يجب أن لا تتجاوز 1000' })
    priority?: number;

    @ApiPropertyOptional({
        description: 'تاريخ بداية السريان',
    })
    @IsOptional()
    @IsDate({ message: 'تاريخ البداية يجب أن يكون تاريخ صحيح' })
    @Type(() => Date)
    effectiveFrom?: Date;

    @ApiPropertyOptional({
        description: 'تاريخ نهاية السريان',
    })
    @IsOptional()
    @IsDate({ message: 'تاريخ النهاية يجب أن يكون تاريخ صحيح' })
    @Type(() => Date)
    effectiveTo?: Date;
}

/**
 * DTO لتحليل نص السياسة
 */
export class AnalyzePolicyDto {
    @ApiProperty({
        description: 'نص السياسة للتحليل',
        minLength: 5,
        maxLength: 2000,
    })
    @IsString({ message: 'النص يجب أن يكون نص' })
    @IsNotEmpty({ message: 'النص مطلوب' })
    @MinLength(5, { message: 'النص يجب أن يكون 5 أحرف على الأقل' })
    @MaxLength(2000, { message: 'النص يجب أن لا يتجاوز 2000 حرف' })
    @Transform(({ value }) => value?.trim())
    text: string;
}

/**
 * DTO للتوسيع التلقائي
 */
export class AutoExtendDto {
    @ApiProperty({
        description: 'نص السياسة',
        minLength: 5,
        maxLength: 2000,
    })
    @IsString({ message: 'النص يجب أن يكون نص' })
    @IsNotEmpty({ message: 'النص مطلوب' })
    @MinLength(5, { message: 'النص يجب أن يكون 5 أحرف على الأقل' })
    @MaxLength(2000, { message: 'النص يجب أن لا يتجاوز 2000 حرف' })
    @Transform(({ value }) => value?.trim())
    text: string;

    @ApiPropertyOptional({
        description: 'تأكيد التوسيع',
        default: false,
    })
    @IsOptional()
    @IsBoolean({ message: 'التأكيد يجب أن يكون صح أو خطأ' })
    confirm?: boolean;
}

// ============== Query DTOs ==============

/**
 * DTO لفلترة السياسات
 */
export class FilterPoliciesDto {
    @ApiPropertyOptional({
        description: 'حالة السياسة',
        enum: SmartPolicyStatus,
    })
    @IsOptional()
    @IsEnum(SmartPolicyStatus, { message: 'حالة السياسة غير صالحة' })
    status?: SmartPolicyStatus;

    @ApiPropertyOptional({
        description: 'نوع الـ trigger',
        enum: SmartPolicyTrigger,
    })
    @IsOptional()
    @IsEnum(SmartPolicyTrigger, { message: 'نوع الـ trigger غير صالح' })
    triggerEvent?: SmartPolicyTrigger;

    @ApiPropertyOptional({
        description: 'هل نشطة فقط',
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({
        description: 'رقم الصفحة',
        minimum: 1,
        default: 1,
    })
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsNumber()
    @Min(1, { message: 'رقم الصفحة يجب أن يكون 1 أو أكثر' })
    page?: number;

    @ApiPropertyOptional({
        description: 'عدد العناصر في الصفحة',
        minimum: 1,
        maximum: 100,
        default: 20,
    })
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsNumber()
    @Min(1, { message: 'عدد العناصر يجب أن يكون 1 أو أكثر' })
    @Max(100, { message: 'عدد العناصر يجب أن لا يتجاوز 100' })
    limit?: number;
}

// ============== Simulation DTOs ==============

/**
 * DTO للمحاكاة
 */
export class SimulatePolicyDto {
    @ApiProperty({
        description: 'الفترة بصيغة YYYY-MM',
        example: '2025-01',
        pattern: '^\\d{4}-(0[1-9]|1[0-2])$',
    })
    @IsString({ message: 'الفترة يجب أن تكون نص' })
    @IsNotEmpty({ message: 'الفترة مطلوبة' })
    @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
        message: 'صيغة الفترة غير صحيحة. استخدم YYYY-MM مثل 2025-01',
    })
    period: string;

    @ApiPropertyOptional({
        description: 'قائمة معرفات الموظفين (اختياري)',
        type: [String],
    })
    @IsOptional()
    @IsArray({ message: 'قائمة الموظفين يجب أن تكون مصفوفة' })
    @ArrayMaxSize(1000, { message: 'الحد الأقصى 1000 موظف' })
    @IsUUID('4', { each: true, message: 'معرف الموظف غير صالح' })
    employeeIds?: string[];
}

// ============== Exception DTOs ==============

/**
 * DTO لإنشاء استثناء
 */
export class CreatePolicyExceptionDto {
    @ApiProperty({
        description: 'نوع الاستثناء',
        enum: ['EMPLOYEE', 'DEPARTMENT', 'JOB_TITLE', 'BRANCH'],
    })
    @IsString({ message: 'نوع الاستثناء يجب أن يكون نص' })
    @IsNotEmpty({ message: 'نوع الاستثناء مطلوب' })
    @IsEnum(['EMPLOYEE', 'DEPARTMENT', 'JOB_TITLE', 'BRANCH'], {
        message: 'نوع الاستثناء غير صالح',
    })
    exceptionType: 'EMPLOYEE' | 'DEPARTMENT' | 'JOB_TITLE' | 'BRANCH';

    @ApiProperty({
        description: 'معرف الهدف',
    })
    @IsString({ message: 'معرف الهدف يجب أن يكون نص' })
    @IsNotEmpty({ message: 'معرف الهدف مطلوب' })
    @IsUUID('4', { message: 'معرف الهدف غير صالح' })
    targetId: string;

    @ApiProperty({
        description: 'اسم الهدف',
        maxLength: 200,
    })
    @IsString({ message: 'اسم الهدف يجب أن يكون نص' })
    @IsNotEmpty({ message: 'اسم الهدف مطلوب' })
    @MaxLength(200, { message: 'اسم الهدف يجب أن لا يتجاوز 200 حرف' })
    @Transform(({ value }) => value?.trim())
    targetName: string;

    @ApiPropertyOptional({
        description: 'سبب الاستثناء',
        maxLength: 500,
    })
    @IsOptional()
    @IsString({ message: 'السبب يجب أن يكون نص' })
    @MaxLength(500, { message: 'السبب يجب أن لا يتجاوز 500 حرف' })
    @Transform(({ value }) => value?.trim())
    reason?: string;

    @ApiPropertyOptional({
        description: 'تاريخ بداية الاستثناء',
    })
    @IsOptional()
    @IsDate({ message: 'تاريخ البداية يجب أن يكون تاريخ صحيح' })
    @Type(() => Date)
    exceptionFrom?: Date;

    @ApiPropertyOptional({
        description: 'تاريخ نهاية الاستثناء',
    })
    @IsOptional()
    @IsDate({ message: 'تاريخ النهاية يجب أن يكون تاريخ صحيح' })
    @Type(() => Date)
    exceptionTo?: Date;
}

// ============== Retroactive DTOs ==============

/**
 * DTO لطلب تطبيق بأثر رجعي
 */
export class CreateRetroApplicationDto {
    @ApiProperty({
        description: 'بداية الفترة بصيغة YYYY-MM',
        example: '2024-10',
    })
    @IsString({ message: 'بداية الفترة يجب أن تكون نص' })
    @IsNotEmpty({ message: 'بداية الفترة مطلوبة' })
    @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
        message: 'صيغة الفترة غير صحيحة. استخدم YYYY-MM مثل 2024-10',
    })
    startPeriod: string;

    @ApiProperty({
        description: 'نهاية الفترة بصيغة YYYY-MM',
        example: '2024-12',
    })
    @IsString({ message: 'نهاية الفترة يجب أن تكون نص' })
    @IsNotEmpty({ message: 'نهاية الفترة مطلوبة' })
    @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
        message: 'صيغة الفترة غير صحيحة. استخدم YYYY-MM مثل 2024-12',
    })
    endPeriod: string;

    @ApiPropertyOptional({
        description: 'ملاحظات',
        maxLength: 1000,
    })
    @IsOptional()
    @IsString({ message: 'الملاحظات يجب أن تكون نص' })
    @MaxLength(1000, { message: 'الملاحظات يجب أن لا تتجاوز 1000 حرف' })
    @Transform(({ value }) => value?.trim())
    notes?: string;
}

/**
 * DTO لتنفيذ التطبيق الرجعي
 */
export class ApplyRetroDto {
    @ApiProperty({
        description: 'فترة الرواتب المستهدفة بصيغة YYYY-MM',
        example: '2025-01',
    })
    @IsString({ message: 'الفترة يجب أن تكون نص' })
    @IsNotEmpty({ message: 'الفترة مطلوبة' })
    @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
        message: 'صيغة الفترة غير صحيحة. استخدم YYYY-MM مثل 2025-01',
    })
    targetPayrollPeriod: string;
}

// ============== Approval DTOs ==============

/**
 * DTO للإرسال للموافقة
 */
export class SubmitForApprovalDto {
    @ApiPropertyOptional({
        description: 'ملاحظات الإرسال',
        maxLength: 500,
    })
    @IsOptional()
    @IsString({ message: 'الملاحظات يجب أن تكون نص' })
    @MaxLength(500, { message: 'الملاحظات يجب أن لا تتجاوز 500 حرف' })
    @Transform(({ value }) => value?.trim())
    notes?: string;
}

/**
 * DTO للموافقة
 */
export class ApprovePolicyDto {
    @ApiPropertyOptional({
        description: 'ملاحظات الموافقة',
        maxLength: 500,
    })
    @IsOptional()
    @IsString({ message: 'الملاحظات يجب أن تكون نص' })
    @MaxLength(500, { message: 'الملاحظات يجب أن لا تتجاوز 500 حرف' })
    @Transform(({ value }) => value?.trim())
    notes?: string;

    @ApiPropertyOptional({
        description: 'تفعيل السياسة فوراً',
        default: false,
    })
    @IsOptional()
    @IsBoolean({ message: 'القيمة يجب أن تكون صح أو خطأ' })
    activateNow?: boolean;
}

/**
 * DTO للرفض
 */
export class RejectPolicyDto {
    @ApiProperty({
        description: 'سبب الرفض',
        minLength: 10,
        maxLength: 500,
    })
    @IsString({ message: 'السبب يجب أن يكون نص' })
    @IsNotEmpty({ message: 'سبب الرفض مطلوب' })
    @MinLength(10, { message: 'السبب يجب أن يكون 10 أحرف على الأقل' })
    @MaxLength(500, { message: 'السبب يجب أن لا يتجاوز 500 حرف' })
    @Transform(({ value }) => value?.trim())
    reason: string;
}

// ============== Payroll Integration DTOs ==============

/**
 * DTO لمزامنة الرواتب
 */
export class SyncPayrollDto {
    @ApiProperty({
        description: 'معرف دورة الرواتب',
    })
    @IsString({ message: 'معرف الدورة يجب أن يكون نص' })
    @IsNotEmpty({ message: 'معرف الدورة مطلوب' })
    @IsUUID('4', { message: 'معرف الدورة غير صالح' })
    payrollRunId: string;

    @ApiProperty({
        description: 'الشهر',
        minimum: 1,
        maximum: 12,
    })
    @IsNumber({}, { message: 'الشهر يجب أن يكون رقم' })
    @Min(1, { message: 'الشهر يجب أن يكون بين 1 و 12' })
    @Max(12, { message: 'الشهر يجب أن يكون بين 1 و 12' })
    month: number;

    @ApiProperty({
        description: 'السنة',
        minimum: 2000,
        maximum: 2100,
    })
    @IsNumber({}, { message: 'السنة يجب أن تكون رقم' })
    @Min(2000, { message: 'السنة يجب أن تكون 2000 أو أكثر' })
    @Max(2100, { message: 'السنة يجب أن لا تتجاوز 2100' })
    year: number;
}

// ============== Template DTOs ==============

/**
 * DTO لتقييم قالب
 */
export class RateTemplateDto {
    @ApiProperty({
        description: 'التقييم من 1 إلى 5',
        minimum: 1,
        maximum: 5,
    })
    @IsNumber({}, { message: 'التقييم يجب أن يكون رقم' })
    @Min(1, { message: 'التقييم يجب أن يكون 1 على الأقل' })
    @Max(5, { message: 'التقييم يجب أن لا يتجاوز 5' })
    rating: number;
}

// ============== Condition & Action Types ==============

/**
 * نوع الشرط
 */
export class PolicyConditionDto {
    @ApiProperty({
        description: 'اسم الحقل',
        example: 'attendance.currentPeriod.lateDays',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    field: string;

    @ApiProperty({
        description: 'عامل المقارنة',
        example: 'GREATER_THAN',
    })
    @IsString()
    @IsNotEmpty()
    @IsEnum([
        'EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN',
        'GREATER_THAN_OR_EQUAL', 'LESS_THAN_OR_EQUAL',
        'CONTAINS', 'IN', 'BETWEEN', 'IS_TRUE', 'IS_FALSE',
    ])
    operator: string;

    @ApiProperty({
        description: 'القيمة المتوقعة',
    })
    @IsNotEmpty()
    value: any;

    @ApiPropertyOptional({
        description: 'شرط اختياري',
    })
    @IsOptional()
    @IsBoolean()
    optional?: boolean;
}

/**
 * نوع الإجراء
 */
export class PolicyActionDto {
    @ApiProperty({
        description: 'نوع الإجراء',
        example: 'DEDUCT_FROM_PAYROLL',
    })
    @IsString()
    @IsNotEmpty()
    @IsEnum([
        'ADD_TO_PAYROLL', 'DEDUCT_FROM_PAYROLL',
        'BONUS', 'ALLOWANCE', 'DEDUCTION',
        'ALERT_HR', 'SEND_NOTIFICATION',
    ])
    type: string;

    @ApiPropertyOptional({
        description: 'نوع القيمة',
        example: 'FIXED',
    })
    @IsOptional()
    @IsString()
    @IsEnum(['FIXED', 'PERCENTAGE', 'FORMULA'])
    valueType?: string;

    @ApiPropertyOptional({
        description: 'القيمة أو المعادلة',
    })
    @IsOptional()
    value?: number | string;

    @ApiPropertyOptional({
        description: 'كود المكون',
    })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    componentCode?: string;

    @ApiPropertyOptional({
        description: 'الوصف',
    })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    description?: string;
}
