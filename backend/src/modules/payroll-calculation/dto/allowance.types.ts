/**
 * نظام البدلات المتقدم - Advanced Allowance System
 * يدعم جميع أنواع البدلات مع حسابات مرنة ومتقدمة
 */

// ==================== أنواع البدلات ====================

export enum AllowanceType {
  // بدلات أساسية
  HOUSING = 'HOUSING',                      // بدل سكن
  TRANSPORTATION = 'TRANSPORTATION',        // بدل مواصلات/نقل
  FOOD = 'FOOD',                            // بدل طعام
  PHONE = 'PHONE',                          // بدل هاتف
  INTERNET = 'INTERNET',                    // بدل إنترنت

  // بدلات وظيفية
  POSITION = 'POSITION',                    // بدل منصب
  RESPONSIBILITY = 'RESPONSIBILITY',        // بدل مسؤولية
  SUPERVISORY = 'SUPERVISORY',              // بدل إشراف
  HAZARD = 'HAZARD',                        // بدل خطر
  HARDSHIP = 'HARDSHIP',                    // بدل صعوبة عمل
  NIGHT_SHIFT = 'NIGHT_SHIFT',              // بدل عمل ليلي
  REMOTE = 'REMOTE',                        // بدل عمل عن بعد

  // بدلات مهنية
  PROFESSIONAL = 'PROFESSIONAL',            // بدل مهني
  CERTIFICATION = 'CERTIFICATION',          // بدل شهادات
  EDUCATION = 'EDUCATION',                  // بدل تعليم
  LANGUAGE = 'LANGUAGE',                    // بدل لغة
  TECHNICAL = 'TECHNICAL',                  // بدل فني

  // بدلات عائلية
  FAMILY = 'FAMILY',                        // بدل عائلة
  CHILDREN = 'CHILDREN',                    // بدل أطفال
  SPOUSE = 'SPOUSE',                        // بدل زوجة

  // بدلات سفر وانتقال
  TRAVEL = 'TRAVEL',                        // بدل سفر
  RELOCATION = 'RELOCATION',                // بدل انتقال
  EXPATRIATE = 'EXPATRIATE',                // بدل اغتراب
  FIELD_WORK = 'FIELD_WORK',                // بدل عمل ميداني

  // بدلات أخرى
  APPEARANCE = 'APPEARANCE',                // بدل مظهر
  UNIFORM = 'UNIFORM',                      // بدل ملابس/زي
  EQUIPMENT = 'EQUIPMENT',                  // بدل معدات
  TOOL = 'TOOL',                            // بدل أدوات
  MEDICAL = 'MEDICAL',                      // بدل طبي
  INSURANCE = 'INSURANCE',                  // بدل تأمين
  SOCIAL = 'SOCIAL',                        // بدل اجتماعي
  COST_OF_LIVING = 'COST_OF_LIVING',        // بدل غلاء معيشة
  CUSTOM = 'CUSTOM',                        // بدل مخصص
}

// طريقة حساب البدل
export enum AllowanceCalculationMethod {
  FIXED_AMOUNT = 'FIXED_AMOUNT',                    // مبلغ ثابت
  PERCENTAGE_OF_BASIC = 'PERCENTAGE_OF_BASIC',      // نسبة من الأساسي
  PERCENTAGE_OF_GROSS = 'PERCENTAGE_OF_GROSS',      // نسبة من الإجمالي
  PER_DAY = 'PER_DAY',                              // لكل يوم عمل
  PER_HOUR = 'PER_HOUR',                            // لكل ساعة عمل
  PER_DEPENDENT = 'PER_DEPENDENT',                  // لكل معال
  PER_CHILD = 'PER_CHILD',                          // لكل طفل
  TIERED = 'TIERED',                                // شرائح متدرجة
  FORMULA = 'FORMULA',                              // معادلة مخصصة
  PRORATED = 'PRORATED',                            // تناسبي
  CONDITIONAL = 'CONDITIONAL',                      // مشروط
}

// تكرار البدل
export enum AllowanceFrequency {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMI_ANNUAL = 'SEMI_ANNUAL',
  ANNUAL = 'ANNUAL',
  ONE_TIME = 'ONE_TIME',
  PER_OCCURRENCE = 'PER_OCCURRENCE',
}

// حالة البدل
export enum AllowanceStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED',
}

// ==================== شرائح البدل ====================

export interface AllowanceTier {
  condition: string;              // الشرط (مثل: years_of_service, salary_grade)
  minValue: number;
  maxValue: number;
  amount?: number;
  percentage?: number;
}

// ==================== شروط البدل ====================

export interface AllowanceCondition {
  field: string;                  // الحقل المطلوب التحقق منه
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'exists' | 'between';
  value: any;
  logicalOperator?: 'AND' | 'OR'; // للربط مع الشرط التالي
}

// ==================== تعريف البدل ====================

export interface AllowanceDefinition {
  id: string;
  companyId: string;
  code: string;
  nameAr: string;
  nameEn?: string;
  description?: string;

  // النوع والحساب
  allowanceType: AllowanceType;
  calculationMethod: AllowanceCalculationMethod;
  frequency: AllowanceFrequency;

  // القيم
  fixedAmount?: number;
  percentage?: number;
  perUnitAmount?: number;         // المبلغ لكل وحدة (يوم/ساعة/معال)
  minAmount?: number;             // الحد الأدنى
  maxAmount?: number;             // الحد الأقصى
  formula?: string;
  tiers?: AllowanceTier[];

  // الشروط
  conditions?: AllowanceCondition[];
  eligibleDepartments?: string[];
  eligibleJobTitles?: string[];
  eligibleGrades?: string[];
  minServiceMonths?: number;

  // إعدادات الحساب
  isProrated: boolean;            // تناسبي للموظفين الجدد
  includedInGross: boolean;       // يضاف للإجمالي
  isGosiEligible: boolean;        // خاضع للتأمينات
  isTaxable: boolean;             // خاضع للضريبة
  isRecurring: boolean;           // متكرر
  affectedByAbsence: boolean;     // يتأثر بالغياب

  // الفترة
  effectiveFrom: Date;
  effectiveTo?: Date;

  // الحالة
  status: AllowanceStatus;
  priority: number;               // ترتيب التطبيق

  createdAt: Date;
  updatedAt: Date;
}

// ==================== تخصيص بدل لموظف ====================

export interface EmployeeAllowance {
  id: string;
  employeeId: string;
  allowanceDefinitionId: string;
  companyId: string;

  // تجاوز القيم الافتراضية
  overrideAmount?: number;
  overridePercentage?: number;
  overrideFormula?: string;

  // بيانات إضافية
  dependentsCount?: number;       // عدد المعالين
  childrenCount?: number;         // عدد الأطفال
  customData?: Record<string, any>;

  // الحالة
  status: AllowanceStatus;
  effectiveFrom: Date;
  effectiveTo?: Date;

  // التعديلات
  adjustments?: AllowanceAdjustment[];

  createdAt: Date;
  updatedAt: Date;
}

// تعديل على البدل
export interface AllowanceAdjustment {
  date: Date;
  type: 'increase' | 'decrease' | 'suspend' | 'resume';
  amount?: number;
  percentage?: number;
  reason: string;
  approvedBy: string;
}

// ==================== حساب البدل ====================

export interface AllowanceCalculationResult {
  allowanceId: string;
  allowanceCode: string;
  allowanceName: string;
  allowanceType: AllowanceType;
  calculatedAmount: number;
  proRataFactor?: number;
  adjustments: number;
  finalAmount: number;
  isApplicable: boolean;
  notApplicableReason?: string;
  calculationDetails: {
    method: AllowanceCalculationMethod;
    baseValue?: number;
    percentage?: number;
    units?: number;
    unitRate?: number;
    tierApplied?: AllowanceTier;
    formula?: string;
    breakdown: {
      component: string;
      value: number;
      description: string;
    }[];
  };
}

// ==================== DTOs ====================

export interface CreateAllowanceDefinitionDto {
  code: string;
  nameAr: string;
  nameEn?: string;
  description?: string;
  allowanceType: AllowanceType;
  calculationMethod: AllowanceCalculationMethod;
  frequency: AllowanceFrequency;
  fixedAmount?: number;
  percentage?: number;
  perUnitAmount?: number;
  minAmount?: number;
  maxAmount?: number;
  formula?: string;
  tiers?: AllowanceTier[];
  conditions?: AllowanceCondition[];
  eligibleDepartments?: string[];
  eligibleJobTitles?: string[];
  minServiceMonths?: number;
  isProrated?: boolean;
  includedInGross?: boolean;
  isGosiEligible?: boolean;
  isTaxable?: boolean;
  isRecurring?: boolean;
  affectedByAbsence?: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  priority?: number;
}

export interface AssignAllowanceDto {
  employeeId: string;
  allowanceDefinitionId: string;
  overrideAmount?: number;
  overridePercentage?: number;
  dependentsCount?: number;
  childrenCount?: number;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface BulkAssignAllowanceDto {
  allowanceDefinitionId: string;
  employeeIds: string[];
  overrideAmount?: number;
  effectiveFrom: string;
}

export interface AdjustAllowanceDto {
  employeeAllowanceId: string;
  type: 'increase' | 'decrease' | 'suspend' | 'resume';
  amount?: number;
  percentage?: number;
  reason: string;
  effectiveDate: string;
}

// ==================== ملخص البدلات ====================

export interface AllowanceSummary {
  companyId: string;
  period: { year: number; month: number };
  totalAllowances: number;
  totalAmount: number;
  byType: {
    type: AllowanceType;
    count: number;
    amount: number;
  }[];
  byDepartment: {
    departmentId: string;
    departmentName: string;
    amount: number;
  }[];
  topAllowances: {
    code: string;
    name: string;
    totalAmount: number;
    employeeCount: number;
  }[];
}

// ==================== تقرير بدلات الموظف ====================

export interface EmployeeAllowanceReport {
  employeeId: string;
  employeeName: string;
  department?: string;
  jobTitle?: string;
  period: { year: number; month: number };
  allowances: AllowanceCalculationResult[];
  totalAmount: number;
  totalGosiEligible: number;
  totalTaxable: number;
}
