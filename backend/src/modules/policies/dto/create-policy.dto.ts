import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsDateString, IsOptional, IsBoolean, IsNumber, IsObject, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export enum PolicyType {
    OVERTIME = 'OVERTIME',
    LEAVE = 'LEAVE',
    DEDUCTION = 'DEDUCTION',
    ALLOWANCE = 'ALLOWANCE',
    ATTENDANCE = 'ATTENDANCE',
    GENERAL = 'GENERAL',
}

export enum PolicyScope {
    COMPANY = 'COMPANY',
    BRANCH = 'BRANCH',
    DEPARTMENT = 'DEPARTMENT',
    JOB_TITLE = 'JOB_TITLE',
    EMPLOYEE = 'EMPLOYEE',
}

export class CreatePolicyRuleDto {
    @ApiProperty({ description: 'كود القاعدة', example: 'OT_WEEKDAY' })
    @IsString()
    code: string;

    @ApiProperty({ description: 'اسم القاعدة بالعربي' })
    @IsString()
    nameAr: string;

    @ApiPropertyOptional({ description: 'شروط التطبيق (JSON)' })
    @IsObject()
    @IsOptional()
    conditions?: Record<string, any>;

    @ApiProperty({ description: 'نوع القيمة', enum: ['PERCENTAGE', 'FIXED', 'FORMULA'] })
    @IsString()
    valueType: string;

    @ApiProperty({ description: 'القيمة أو المعادلة' })
    @IsString()
    value: string;

    @ApiPropertyOptional({ description: 'ترتيب التطبيق' })
    @IsNumber()
    @IsOptional()
    ruleOrder?: number;
}

export class CreatePolicyDto {
    @ApiProperty({ description: 'كود السياسة', example: 'OT_POLICY_2024' })
    @IsString()
    code: string;

    @ApiProperty({ description: 'اسم السياسة بالعربي' })
    @IsString()
    nameAr: string;

    @ApiPropertyOptional({ description: 'اسم السياسة بالإنجليزي' })
    @IsString()
    @IsOptional()
    nameEn?: string;

    @ApiPropertyOptional({ description: 'وصف السياسة' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'نوع السياسة', enum: PolicyType })
    @IsEnum(PolicyType)
    type: PolicyType;

    @ApiProperty({ description: 'نطاق السياسة', enum: PolicyScope })
    @IsEnum(PolicyScope)
    scope: PolicyScope;

    @ApiProperty({ description: 'تاريخ بداية السياسة' })
    @IsDateString()
    effectiveFrom: string;

    @ApiPropertyOptional({ description: 'تاريخ نهاية السياسة' })
    @IsDateString()
    @IsOptional()
    effectiveTo?: string;

    @ApiPropertyOptional({ description: 'معرف الفرع (إذا كان النطاق BRANCH)' })
    @IsString()
    @IsOptional()
    branchId?: string;

    @ApiPropertyOptional({ description: 'معرف القسم (إذا كان النطاق DEPARTMENT)' })
    @IsString()
    @IsOptional()
    departmentId?: string;

    @ApiPropertyOptional({ description: 'معرف الدرجة الوظيفية (إذا كان النطاق JOB_TITLE)' })
    @IsString()
    @IsOptional()
    jobTitleId?: string;

    @ApiPropertyOptional({ description: 'معرف الموظف (إذا كان النطاق EMPLOYEE)' })
    @IsString()
    @IsOptional()
    employeeId?: string;

    @ApiPropertyOptional({ description: 'إعدادات إضافية (JSON)' })
    @IsObject()
    @IsOptional()
    settings?: Record<string, any>;

    @ApiPropertyOptional({ description: 'أولوية السياسة (الأعلى يُطبق أولاً)' })
    @IsNumber()
    @IsOptional()
    priority?: number;

    @ApiPropertyOptional({ description: 'قواعد السياسة' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreatePolicyRuleDto)
    @IsOptional()
    rules?: CreatePolicyRuleDto[];
}
