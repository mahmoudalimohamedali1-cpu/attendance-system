import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString, IsNumber } from 'class-validator';

export enum EosReason {
    RESIGNATION = 'RESIGNATION',           // استقالة
    TERMINATION = 'TERMINATION',            // إنهاء خدمات من الشركة
    END_OF_CONTRACT = 'END_OF_CONTRACT',    // انتهاء العقد
    RETIREMENT = 'RETIREMENT',              // تقاعد
    DEATH = 'DEATH',                        // وفاة
}

export class CalculateEosDto {
    @ApiProperty({ description: 'سبب إنهاء الخدمة', enum: EosReason })
    @IsEnum(EosReason)
    reason: EosReason;

    @ApiProperty({ description: 'تاريخ آخر يوم عمل' })
    @IsDateString()
    lastWorkingDay: string;

    @ApiPropertyOptional({ description: 'تجاوز الراتب الأساسي (اختياري)', example: 10000 })
    @IsNumber()
    @IsOptional()
    overrideBaseSalary?: number;

    @ApiPropertyOptional({ description: 'تجاوز عدد أيام الإجازة المتبقية (اختياري)', example: 15 })
    @IsNumber()
    @IsOptional()
    overrideRemainingLeaveDays?: number;

    @ApiPropertyOptional({ description: 'ملاحظات إضافية' })
    @IsString()
    @IsOptional()
    notes?: string;
}

export interface EosBreakdown {
    employeeId: string;
    employeeName: string;
    hireDate: Date;
    lastWorkingDay: Date;
    yearsOfService: number;
    monthsOfService: number;
    daysOfService: number;        // الأيام المتبقية
    totalDaysOfService: number;

    baseSalary: number;

    // 🆕 البدلات الثابتة
    housingAllowance: number;
    transportationAllowance: number;
    phoneAllowance: number;
    otherFixedAllowances: number;
    totalSalary: number;

    reason: EosReason;

    // حساب المكافأة
    eosForFirst5Years: number;    // 1/2 شهر عن كل سنة
    eosForRemaining: number;      // شهر عن كل سنة بعد الخامسة
    totalEos: number;

    // تعديلات حسب السبب (استقالة قبل 5 سنوات)
    eosAdjustmentFactor: number;  // 1.0 = كامل، 0.5 = نصف، 0.333 = ثلث
    adjustedEos: number;

    // رصيد الإجازات
    remainingLeaveDays: number;
    remainingLeaveDaysOverridden: boolean;
    leavePayout: number;

    // الخصومات التفصيلية
    outstandingLoans: number;       // السلف المستحقة
    unreturnedCustodyValue: number; // قيمة العهد غير المرجعة
    custodyItems: CustodyItemBreakdown[]; // 🆕 قائمة العهد للتحكم
    outstandingDebts: number;       // ديون أخرى
    unpaidPenalties: number;        // الجزاءات غير المسددة
    totalDeductions: number;        // إجمالي الخصومات

    // المبلغ النهائي
    netSettlement: number;
}

// 🆕 تفاصيل العهدة
export interface CustodyItemBreakdown {
    id: string;
    name: string;
    code: string;
    value: number;
    returned: boolean;
}

