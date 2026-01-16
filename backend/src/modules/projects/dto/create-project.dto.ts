import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsOptional,
    IsDateString,
    IsNumber,
    IsBoolean,
    IsArray,
    IsEnum,
    Min,
    Max,
} from 'class-validator';

export enum ProjectStatus {
    INITIATION = 'INITIATION',
    PLANNING = 'PLANNING',
    EXECUTION = 'EXECUTION',
    MONITORING = 'MONITORING',
    CLOSING = 'CLOSING',
    COMPLETED = 'COMPLETED',
    ON_HOLD = 'ON_HOLD',
    CANCELLED = 'CANCELLED',
}

export enum ProjectPriority {
    CRITICAL = 'CRITICAL',
    HIGH = 'HIGH',
    MEDIUM = 'MEDIUM',
    LOW = 'LOW',
}

export enum HealthStatus {
    ON_TRACK = 'ON_TRACK',
    AT_RISK = 'AT_RISK',
    OFF_TRACK = 'OFF_TRACK',
    COMPLETED = 'COMPLETED',
}

export class CreateProjectDto {
    @ApiProperty({ description: 'اسم المشروع' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ description: 'اسم المشروع بالإنجليزية' })
    @IsString()
    @IsOptional()
    nameEn?: string;

    @ApiPropertyOptional({ description: 'وصف المشروع' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ description: 'كود المشروع' })
    @IsString()
    @IsOptional()
    code?: string;

    @ApiPropertyOptional({ description: 'لون المشروع' })
    @IsString()
    @IsOptional()
    color?: string;

    @ApiPropertyOptional({ description: 'أيقونة المشروع' })
    @IsString()
    @IsOptional()
    icon?: string;

    @ApiPropertyOptional({ description: 'معرف البرنامج الأب' })
    @IsString()
    @IsOptional()
    programId?: string;

    @ApiPropertyOptional({ description: 'معرف القالب' })
    @IsString()
    @IsOptional()
    templateId?: string;

    @ApiPropertyOptional({ description: 'معرف مالك المشروع' })
    @IsString()
    @IsOptional()
    ownerId?: string;

    @ApiPropertyOptional({ description: 'معرف مدير المشروع' })
    @IsString()
    @IsOptional()
    managerId?: string;

    @ApiPropertyOptional({ description: 'معرف راعي المشروع' })
    @IsString()
    @IsOptional()
    sponsorId?: string;

    @ApiPropertyOptional({ description: 'تاريخ البداية' })
    @IsDateString()
    @IsOptional()
    startDate?: string;

    @ApiPropertyOptional({ description: 'تاريخ الانتهاء المخطط' })
    @IsDateString()
    @IsOptional()
    plannedEndDate?: string;

    @ApiPropertyOptional({ description: 'الميزانية المخططة' })
    @IsNumber()
    @IsOptional()
    @Min(0)
    plannedBudget?: number;

    @ApiPropertyOptional({ description: 'عملة الميزانية' })
    @IsString()
    @IsOptional()
    budgetCurrency?: string;

    @ApiPropertyOptional({ description: 'حالة المشروع', enum: ProjectStatus })
    @IsEnum(ProjectStatus)
    @IsOptional()
    status?: ProjectStatus;

    @ApiPropertyOptional({ description: 'الأولوية', enum: ProjectPriority })
    @IsEnum(ProjectPriority)
    @IsOptional()
    priority?: ProjectPriority;

    @ApiPropertyOptional({ description: 'مشروع عام' })
    @IsBoolean()
    @IsOptional()
    isPublic?: boolean;

    @ApiPropertyOptional({ description: 'السماح بتسجيل الوقت' })
    @IsBoolean()
    @IsOptional()
    allowTimeLogging?: boolean;

    @ApiPropertyOptional({ description: 'يتطلب موافقة' })
    @IsBoolean()
    @IsOptional()
    requireApproval?: boolean;

    @ApiPropertyOptional({ description: 'العلامات', type: [String] })
    @IsArray()
    @IsOptional()
    tags?: string[];
}

export class UpdateProjectDto {
    @ApiPropertyOptional({ description: 'اسم المشروع' })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional({ description: 'اسم المشروع بالإنجليزية' })
    @IsString()
    @IsOptional()
    nameEn?: string;

    @ApiPropertyOptional({ description: 'وصف المشروع' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ description: 'لون المشروع' })
    @IsString()
    @IsOptional()
    color?: string;

    @ApiPropertyOptional({ description: 'أيقونة المشروع' })
    @IsString()
    @IsOptional()
    icon?: string;

    @ApiPropertyOptional({ description: 'معرف البرنامج الأب' })
    @IsString()
    @IsOptional()
    programId?: string;

    @ApiPropertyOptional({ description: 'معرف مالك المشروع' })
    @IsString()
    @IsOptional()
    ownerId?: string;

    @ApiPropertyOptional({ description: 'معرف مدير المشروع' })
    @IsString()
    @IsOptional()
    managerId?: string;

    @ApiPropertyOptional({ description: 'معرف راعي المشروع' })
    @IsString()
    @IsOptional()
    sponsorId?: string;

    @ApiPropertyOptional({ description: 'تاريخ البداية' })
    @IsDateString()
    @IsOptional()
    startDate?: string;

    @ApiPropertyOptional({ description: 'تاريخ الانتهاء المخطط' })
    @IsDateString()
    @IsOptional()
    plannedEndDate?: string;

    @ApiPropertyOptional({ description: 'تاريخ الانتهاء الفعلي' })
    @IsDateString()
    @IsOptional()
    actualEndDate?: string;

    @ApiPropertyOptional({ description: 'الميزانية المخططة' })
    @IsNumber()
    @IsOptional()
    @Min(0)
    plannedBudget?: number;

    @ApiPropertyOptional({ description: 'الميزانية الفعلية' })
    @IsNumber()
    @IsOptional()
    @Min(0)
    actualBudget?: number;

    @ApiPropertyOptional({ description: 'حالة المشروع', enum: ProjectStatus })
    @IsEnum(ProjectStatus)
    @IsOptional()
    status?: ProjectStatus;

    @ApiPropertyOptional({ description: 'الحالة الصحية', enum: HealthStatus })
    @IsEnum(HealthStatus)
    @IsOptional()
    healthStatus?: HealthStatus;

    @ApiPropertyOptional({ description: 'الأولوية', enum: ProjectPriority })
    @IsEnum(ProjectPriority)
    @IsOptional()
    priority?: ProjectPriority;

    @ApiPropertyOptional({ description: 'نسبة الإنجاز' })
    @IsNumber()
    @IsOptional()
    @Min(0)
    @Max(100)
    progress?: number;

    @ApiPropertyOptional({ description: 'مشروع عام' })
    @IsBoolean()
    @IsOptional()
    isPublic?: boolean;

    @ApiPropertyOptional({ description: 'العلامات', type: [String] })
    @IsArray()
    @IsOptional()
    tags?: string[];
}

export class AddProjectMemberDto {
    @ApiProperty({ description: 'معرف المستخدم' })
    @IsString()
    userId: string;

    @ApiPropertyOptional({ description: 'الدور' })
    @IsString()
    @IsOptional()
    role?: string;

    @ApiPropertyOptional({ description: 'نسبة التخصيص' })
    @IsNumber()
    @IsOptional()
    @Min(0)
    @Max(100)
    allocationPct?: number;

    @ApiPropertyOptional({ description: 'السعر بالساعة' })
    @IsNumber()
    @IsOptional()
    @Min(0)
    hourlyRate?: number;
}

export class CreatePhaseDto {
    @ApiProperty({ description: 'اسم المرحلة' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ description: 'اسم المرحلة بالإنجليزية' })
    @IsString()
    @IsOptional()
    nameEn?: string;

    @ApiPropertyOptional({ description: 'الوصف' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ description: 'الترتيب' })
    @IsNumber()
    @IsOptional()
    order?: number;

    @ApiPropertyOptional({ description: 'اللون' })
    @IsString()
    @IsOptional()
    color?: string;

    @ApiPropertyOptional({ description: 'تاريخ البداية المخطط' })
    @IsDateString()
    @IsOptional()
    plannedStartDate?: string;

    @ApiPropertyOptional({ description: 'تاريخ الانتهاء المخطط' })
    @IsDateString()
    @IsOptional()
    plannedEndDate?: string;

    @ApiPropertyOptional({ description: 'الميزانية المخططة' })
    @IsNumber()
    @IsOptional()
    @Min(0)
    plannedBudget?: number;

    @ApiPropertyOptional({ description: 'التسليمات', type: [String] })
    @IsArray()
    @IsOptional()
    deliverables?: string[];
}

export class CreateMilestoneDto {
    @ApiProperty({ description: 'اسم المعلم' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ description: 'اسم المعلم بالإنجليزية' })
    @IsString()
    @IsOptional()
    nameEn?: string;

    @ApiPropertyOptional({ description: 'الوصف' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'تاريخ الاستحقاق' })
    @IsDateString()
    dueDate: string;

    @ApiPropertyOptional({ description: 'معرف المسؤول' })
    @IsString()
    @IsOptional()
    ownerId?: string;

    @ApiPropertyOptional({ description: 'معلم حرج' })
    @IsBoolean()
    @IsOptional()
    isCritical?: boolean;

    @ApiPropertyOptional({ description: 'مرتبط بدفعة' })
    @IsBoolean()
    @IsOptional()
    isPayment?: boolean;

    @ApiPropertyOptional({ description: 'مبلغ الدفعة' })
    @IsNumber()
    @IsOptional()
    @Min(0)
    paymentAmount?: number;
}

export class CreateRiskDto {
    @ApiProperty({ description: 'عنوان الخطر' })
    @IsString()
    title: string;

    @ApiPropertyOptional({ description: 'الوصف' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'التصنيف' })
    @IsString()
    category: string;

    @ApiPropertyOptional({ description: 'الاحتمالية' })
    @IsString()
    @IsOptional()
    probability?: string;

    @ApiPropertyOptional({ description: 'التأثير' })
    @IsString()
    @IsOptional()
    impact?: string;

    @ApiPropertyOptional({ description: 'الاستجابة' })
    @IsString()
    @IsOptional()
    response?: string;

    @ApiPropertyOptional({ description: 'خطة التخفيف' })
    @IsString()
    @IsOptional()
    mitigationPlan?: string;

    @ApiPropertyOptional({ description: 'خطة الطوارئ' })
    @IsString()
    @IsOptional()
    contingencyPlan?: string;

    @ApiPropertyOptional({ description: 'معرف المسؤول' })
    @IsString()
    @IsOptional()
    ownerId?: string;

    @ApiPropertyOptional({ description: 'التكلفة المحتملة' })
    @IsNumber()
    @IsOptional()
    @Min(0)
    potentialCost?: number;
}

export class CreateBudgetDto {
    @ApiProperty({ description: 'اسم بند الميزانية' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'التصنيف' })
    @IsString()
    category: string;

    @ApiPropertyOptional({ description: 'الوصف' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'المبلغ المخطط' })
    @IsNumber()
    @Min(0)
    plannedAmount: number;

    @ApiPropertyOptional({ description: 'العملة' })
    @IsString()
    @IsOptional()
    currency?: string;

    @ApiPropertyOptional({ description: 'بداية الفترة' })
    @IsDateString()
    @IsOptional()
    periodStart?: string;

    @ApiPropertyOptional({ description: 'نهاية الفترة' })
    @IsDateString()
    @IsOptional()
    periodEnd?: string;
}
