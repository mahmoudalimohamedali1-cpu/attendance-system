/**
 * نظام المكافآت المتقدم - Bonus System
 * يدعم أنواع متعددة من المكافآت مع حسابات مرنة
 */

// ==================== أنواع المكافآت ====================

export enum BonusType {
  // مكافآت دورية
  ANNUAL = 'ANNUAL',                    // مكافأة سنوية
  QUARTERLY = 'QUARTERLY',              // مكافأة ربع سنوية
  MONTHLY = 'MONTHLY',                  // مكافأة شهرية

  // مكافآت أداء
  PERFORMANCE = 'PERFORMANCE',          // مكافأة أداء
  KPI_ACHIEVEMENT = 'KPI_ACHIEVEMENT',  // مكافأة تحقيق KPI
  TARGET_BONUS = 'TARGET_BONUS',        // مكافأة تحقيق الهدف

  // مكافآت خاصة
  SIGNING = 'SIGNING',                  // مكافأة توقيع العقد
  RETENTION = 'RETENTION',              // مكافأة استبقاء
  REFERRAL = 'REFERRAL',                // مكافأة إحالة موظف
  SPOT = 'SPOT',                        // مكافأة فورية
  PROJECT = 'PROJECT',                  // مكافأة مشروع
  SALES = 'SALES',                      // مكافأة مبيعات

  // مكافآت موسمية
  EID = 'EID',                          // مكافأة العيد
  RAMADAN = 'RAMADAN',                  // مكافأة رمضان
  NATIONAL_DAY = 'NATIONAL_DAY',        // مكافأة اليوم الوطني

  // مكافآت أخرى
  ATTENDANCE = 'ATTENDANCE',            // مكافأة انتظام
  SAFETY = 'SAFETY',                    // مكافأة سلامة
  INNOVATION = 'INNOVATION',            // مكافأة ابتكار
  CUSTOMER_SERVICE = 'CUSTOMER_SERVICE', // مكافأة خدمة عملاء
  CUSTOM = 'CUSTOM',                    // مكافأة مخصصة
}

// طريقة حساب المكافأة
export enum BonusCalculationMethod {
  FIXED_AMOUNT = 'FIXED_AMOUNT',              // مبلغ ثابت
  PERCENTAGE_OF_BASIC = 'PERCENTAGE_OF_BASIC', // نسبة من الراتب الأساسي
  PERCENTAGE_OF_GROSS = 'PERCENTAGE_OF_GROSS', // نسبة من الإجمالي
  PERCENTAGE_OF_NET = 'PERCENTAGE_OF_NET',     // نسبة من الصافي
  SALARY_MULTIPLIER = 'SALARY_MULTIPLIER',     // مضاعف الراتب (مثل راتب شهر)
  FORMULA = 'FORMULA',                         // معادلة مخصصة
  PRORATED = 'PRORATED',                       // تناسبي حسب أيام العمل
  TIERED = 'TIERED',                           // شرائح متدرجة
}

// حالة المكافأة
export enum BonusStatus {
  DRAFT = 'DRAFT',           // مسودة
  PENDING = 'PENDING',       // بانتظار الموافقة
  APPROVED = 'APPROVED',     // معتمدة
  SCHEDULED = 'SCHEDULED',   // مجدولة للصرف
  PAID = 'PAID',             // مصروفة
  CANCELLED = 'CANCELLED',   // ملغاة
  ON_HOLD = 'ON_HOLD',       // معلقة
}

// تكرار المكافأة
export enum BonusFrequency {
  ONE_TIME = 'ONE_TIME',     // مرة واحدة
  MONTHLY = 'MONTHLY',       // شهرياً
  QUARTERLY = 'QUARTERLY',   // ربع سنوي
  SEMI_ANNUAL = 'SEMI_ANNUAL', // نصف سنوي
  ANNUAL = 'ANNUAL',         // سنوي
  CUSTOM = 'CUSTOM',         // مخصص
}

// ==================== واجهات البيانات ====================

// تعريف شريحة المكافأة (للمكافآت المتدرجة)
export interface BonusTier {
  minValue: number;       // الحد الأدنى (مثل 0%)
  maxValue: number;       // الحد الأقصى (مثل 100%)
  bonusAmount?: number;   // المبلغ الثابت
  bonusPercentage?: number; // النسبة من الراتب
  multiplier?: number;    // المضاعف
}

// شرط استحقاق المكافأة
export interface BonusEligibilityCriteria {
  minServiceMonths?: number;        // الحد الأدنى لأشهر الخدمة
  minAttendancePercentage?: number; // الحد الأدنى لنسبة الحضور
  minPerformanceScore?: number;     // الحد الأدنى لدرجة الأداء
  requiredStatus?: string[];        // الحالات المطلوبة
  excludedDepartments?: string[];   // الأقسام المستثناة
  excludedJobTitles?: string[];     // الوظائف المستثناة
  includedDepartments?: string[];   // الأقسام المشمولة فقط
  includedJobTitles?: string[];     // الوظائف المشمولة فقط
  customConditions?: Record<string, any>; // شروط مخصصة
}

// تعريف برنامج المكافآت
export interface BonusProgram {
  id: string;
  companyId: string;
  code: string;
  nameAr: string;
  nameEn?: string;
  description?: string;

  // نوع وطريقة الحساب
  bonusType: BonusType;
  calculationMethod: BonusCalculationMethod;
  frequency: BonusFrequency;

  // قيم الحساب
  fixedAmount?: number;
  percentage?: number;
  multiplier?: number;
  formula?: string;
  tiers?: BonusTier[];

  // الجدولة
  effectiveFrom: Date;
  effectiveTo?: Date;
  payoutMonth?: number;     // شهر الصرف (1-12)
  payoutDay?: number;       // يوم الصرف

  // شروط الاستحقاق
  eligibilityCriteria?: BonusEligibilityCriteria;

  // إعدادات إضافية
  isTaxable: boolean;
  isGosiEligible: boolean;
  requiresApproval: boolean;
  maxBudget?: number;
  maxPerEmployee?: number;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

// مكافأة فردية للموظف
export interface EmployeeBonus {
  id: string;
  companyId: string;
  employeeId: string;
  programId?: string;         // رابط لبرنامج المكافآت (اختياري)

  // التفاصيل
  bonusType: BonusType;
  nameAr: string;
  nameEn?: string;
  description?: string;

  // المبالغ
  calculatedAmount: number;   // المبلغ المحسوب
  adjustedAmount?: number;    // المبلغ المعدل (بعد التعديل اليدوي)
  finalAmount: number;        // المبلغ النهائي للصرف
  taxAmount?: number;         // مبلغ الضريبة
  netAmount: number;          // الصافي بعد الضريبة

  // الحالة والجدولة
  status: BonusStatus;
  periodYear: number;
  periodMonth?: number;       // للمكافآت الشهرية
  periodQuarter?: number;     // للمكافآت الربعية
  scheduledPayDate?: Date;
  actualPayDate?: Date;

  // الموافقات
  requestedById?: string;
  approvedById?: string;
  approvedAt?: Date;
  rejectionReason?: string;

  // الحساب
  calculationDetails?: BonusCalculationDetails;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

// تفاصيل حساب المكافأة
export interface BonusCalculationDetails {
  method: BonusCalculationMethod;
  baseSalary?: number;
  grossSalary?: number;
  workingDays?: number;
  actualDays?: number;
  proRataFactor?: number;
  performanceScore?: number;
  kpiAchievement?: number;
  attendancePercentage?: number;
  tierApplied?: BonusTier;
  formula?: string;
  formulaResult?: number;
  adjustments?: {
    type: string;
    amount: number;
    reason: string;
  }[];
  breakdown: {
    component: string;
    value: number;
    description: string;
  }[];
}

// ==================== DTOs ====================

export interface CreateBonusProgramDto {
  code: string;
  nameAr: string;
  nameEn?: string;
  description?: string;
  bonusType: BonusType;
  calculationMethod: BonusCalculationMethod;
  frequency: BonusFrequency;
  fixedAmount?: number;
  percentage?: number;
  multiplier?: number;
  formula?: string;
  tiers?: BonusTier[];
  effectiveFrom: string;
  effectiveTo?: string;
  payoutMonth?: number;
  payoutDay?: number;
  eligibilityCriteria?: BonusEligibilityCriteria;
  isTaxable?: boolean;
  isGosiEligible?: boolean;
  requiresApproval?: boolean;
  maxBudget?: number;
  maxPerEmployee?: number;
}

export interface CreateEmployeeBonusDto {
  employeeId: string;
  programId?: string;
  bonusType: BonusType;
  nameAr: string;
  nameEn?: string;
  description?: string;
  amount: number;
  periodYear: number;
  periodMonth?: number;
  periodQuarter?: number;
  scheduledPayDate?: string;
  notes?: string;
}

export interface ApproveBonusDto {
  bonusId: string;
  adjustedAmount?: number;
  notes?: string;
}

export interface BulkBonusGenerationDto {
  programId: string;
  periodYear: number;
  periodMonth?: number;
  periodQuarter?: number;
  employeeIds?: string[];     // إذا كان فارغاً، يتم الحساب لجميع المستحقين
  overrideExisting?: boolean;
}

// ==================== نتائج الحساب ====================

export interface BonusCalculationResult {
  employeeId: string;
  employeeName: string;
  programId?: string;
  programName?: string;
  bonusType: BonusType;
  calculatedAmount: number;
  adjustments: number;
  taxDeduction: number;
  netAmount: number;
  isEligible: boolean;
  eligibilityReason?: string;
  calculationDetails: BonusCalculationDetails;
}

export interface BulkBonusResult {
  totalEmployees: number;
  eligibleCount: number;
  ineligibleCount: number;
  totalAmount: number;
  averageAmount: number;
  maxAmount: number;
  minAmount: number;
  bonuses: BonusCalculationResult[];
  errors: {
    employeeId: string;
    employeeName: string;
    error: string;
  }[];
}

// ==================== إحصائيات ====================

export interface BonusStatistics {
  totalPaid: number;
  totalPending: number;
  totalScheduled: number;
  countByType: Record<BonusType, { count: number; amount: number }>;
  countByStatus: Record<BonusStatus, number>;
  averagePerEmployee: number;
  topRecipients: {
    employeeId: string;
    employeeName: string;
    totalAmount: number;
    count: number;
  }[];
  monthlyTrend: {
    month: string;
    amount: number;
    count: number;
  }[];
}
