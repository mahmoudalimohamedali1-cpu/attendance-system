/**
 * نظام العمولات المتقدم - Commission System
 * يدعم أنواع متعددة من العمولات مع حسابات مرنة
 */

// ==================== أنواع العمولات ====================

export enum CommissionType {
  // عمولات المبيعات
  SALES = 'SALES',                        // عمولة مبيعات عامة
  REVENUE = 'REVENUE',                    // عمولة على الإيرادات
  PROFIT = 'PROFIT',                      // عمولة على الأرباح
  UNITS_SOLD = 'UNITS_SOLD',              // عمولة على الوحدات المباعة
  NEW_CUSTOMERS = 'NEW_CUSTOMERS',        // عمولة عملاء جدد
  RENEWALS = 'RENEWALS',                  // عمولة تجديدات
  UPSELL = 'UPSELL',                      // عمولة ترقية

  // عمولات الخدمات
  SERVICE = 'SERVICE',                    // عمولة خدمات
  CONSULTING = 'CONSULTING',              // عمولة استشارات
  MAINTENANCE = 'MAINTENANCE',            // عمولة صيانة

  // عمولات الأداء
  TARGET_ACHIEVEMENT = 'TARGET_ACHIEVEMENT', // عمولة تحقيق الهدف
  OVERACHIEVEMENT = 'OVERACHIEVEMENT',    // عمولة تجاوز الهدف
  TEAM_BONUS = 'TEAM_BONUS',              // عمولة فريق

  // عمولات أخرى
  REFERRAL = 'REFERRAL',                  // عمولة إحالة
  COLLECTION = 'COLLECTION',              // عمولة تحصيل
  CUSTOM = 'CUSTOM',                      // عمولة مخصصة
}

// طريقة حساب العمولة
export enum CommissionCalculationMethod {
  FLAT_PERCENTAGE = 'FLAT_PERCENTAGE',    // نسبة ثابتة
  FLAT_AMOUNT = 'FLAT_AMOUNT',            // مبلغ ثابت لكل عملية
  TIERED_PERCENTAGE = 'TIERED_PERCENTAGE', // نسب متدرجة
  TIERED_AMOUNT = 'TIERED_AMOUNT',        // مبالغ متدرجة
  ACCELERATED = 'ACCELERATED',            // نسبة متصاعدة
  DECELERATING = 'DECELERATING',          // نسبة متناقصة
  THRESHOLD = 'THRESHOLD',                // بعد حد معين
  SPLIT = 'SPLIT',                        // مقسمة بين موظفين
  FORMULA = 'FORMULA',                    // معادلة مخصصة
}

// حالة العمولة
export enum CommissionStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  SCHEDULED = 'SCHEDULED',
  PAID = 'PAID',
  CLAWED_BACK = 'CLAWED_BACK',            // مسترجعة
  CANCELLED = 'CANCELLED',
}

// تكرار حساب العمولة
export enum CommissionFrequency {
  PER_TRANSACTION = 'PER_TRANSACTION',    // لكل عملية
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BI_WEEKLY = 'BI_WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUAL = 'ANNUAL',
}

// ==================== شرائح العمولة ====================

export interface CommissionTier {
  minValue: number;           // الحد الأدنى للمبيعات
  maxValue: number;           // الحد الأقصى (null = غير محدود)
  percentage?: number;        // النسبة لهذه الشريحة
  flatAmount?: number;        // المبلغ الثابت لهذه الشريحة
  isIncremental?: boolean;    // هل تطبق على الزيادة فقط أم على الكل
}

// ==================== خطة العمولات ====================

export interface CommissionPlan {
  id: string;
  companyId: string;
  code: string;
  nameAr: string;
  nameEn?: string;
  description?: string;

  // نوع وطريقة الحساب
  commissionType: CommissionType;
  calculationMethod: CommissionCalculationMethod;
  frequency: CommissionFrequency;

  // قيم الحساب
  flatPercentage?: number;
  flatAmount?: number;
  tiers?: CommissionTier[];
  formula?: string;

  // إعدادات الهدف
  targetAmount?: number;      // الهدف المطلوب
  threshold?: number;         // الحد الأدنى للبدء
  cap?: number;               // الحد الأقصى للعمولة

  // Clawback (استرجاع العمولة)
  clawbackEnabled: boolean;
  clawbackPeriodDays?: number;
  clawbackConditions?: string[];

  // Split (تقسيم العمولة)
  splitEnabled: boolean;
  splitRules?: CommissionSplitRule[];

  // الفترة
  effectiveFrom: Date;
  effectiveTo?: Date;

  // إعدادات
  isTaxable: boolean;
  isGosiEligible: boolean;
  requiresApproval: boolean;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

// قاعدة تقسيم العمولة
export interface CommissionSplitRule {
  roleId?: string;
  employeeId?: string;
  percentage: number;
  description?: string;
}

// ==================== معاملة عمولة ====================

export interface CommissionTransaction {
  id: string;
  companyId: string;
  planId: string;
  employeeId: string;

  // تفاصيل المعاملة
  transactionType: string;
  transactionId?: string;     // معرف المعاملة الأصلية (فاتورة، عقد، إلخ)
  transactionDate: Date;
  transactionAmount: number;  // قيمة المعاملة
  description?: string;

  // حساب العمولة
  commissionAmount: number;
  calculationDetails: CommissionCalculationDetails;

  // الحالة
  status: CommissionStatus;
  scheduledPayDate?: Date;
  actualPayDate?: Date;

  // الموافقات
  approvedById?: string;
  approvedAt?: Date;
  rejectionReason?: string;

  // Clawback
  isClawedBack: boolean;
  clawbackDate?: Date;
  clawbackReason?: string;
  clawbackAmount?: number;

  createdAt: Date;
  updatedAt: Date;
}

// تفاصيل حساب العمولة
export interface CommissionCalculationDetails {
  method: CommissionCalculationMethod;
  transactionAmount: number;
  tierApplied?: CommissionTier;
  percentageUsed?: number;
  formulaUsed?: string;
  baseAmount: number;
  adjustments?: {
    type: string;
    amount: number;
    reason: string;
  }[];
  splitDetails?: {
    employeeId: string;
    percentage: number;
    amount: number;
  }[];
  breakdown: {
    component: string;
    value: number;
    description: string;
  }[];
}

// ==================== ملخص عمولات الموظف ====================

export interface EmployeeCommissionSummary {
  employeeId: string;
  employeeName: string;
  periodStart: Date;
  periodEnd: Date;

  // الإجماليات
  totalTransactions: number;
  totalTransactionAmount: number;
  totalCommission: number;
  paidCommission: number;
  pendingCommission: number;
  clawedBackAmount: number;

  // التفاصيل
  byPlan: {
    planId: string;
    planName: string;
    transactions: number;
    amount: number;
  }[];

  // مقارنة بالهدف
  targetAmount?: number;
  achievementPercentage?: number;
  amountToTarget?: number;
}

// ==================== DTOs ====================

export interface CreateCommissionPlanDto {
  code: string;
  nameAr: string;
  nameEn?: string;
  description?: string;
  commissionType: CommissionType;
  calculationMethod: CommissionCalculationMethod;
  frequency: CommissionFrequency;
  flatPercentage?: number;
  flatAmount?: number;
  tiers?: CommissionTier[];
  formula?: string;
  targetAmount?: number;
  threshold?: number;
  cap?: number;
  clawbackEnabled?: boolean;
  clawbackPeriodDays?: number;
  clawbackConditions?: string[];
  splitEnabled?: boolean;
  splitRules?: CommissionSplitRule[];
  effectiveFrom: string;
  effectiveTo?: string;
  isTaxable?: boolean;
  isGosiEligible?: boolean;
  requiresApproval?: boolean;
}

export interface RecordCommissionDto {
  planId: string;
  employeeId: string;
  transactionType: string;
  transactionId?: string;
  transactionDate: string;
  transactionAmount: number;
  description?: string;
  customCommissionAmount?: number; // لتجاوز الحساب التلقائي
}

export interface BulkRecordCommissionDto {
  planId: string;
  transactions: {
    employeeId: string;
    transactionType: string;
    transactionId?: string;
    transactionDate: string;
    transactionAmount: number;
    description?: string;
  }[];
}

export interface ApproveCommissionDto {
  transactionId: string;
  adjustedAmount?: number;
  notes?: string;
}

export interface ClawbackCommissionDto {
  transactionId: string;
  reason: string;
  amount?: number; // إذا كان الاسترجاع جزئي
}

// ==================== تقارير العمولات ====================

export interface CommissionReport {
  periodStart: Date;
  periodEnd: Date;
  companyId: string;

  // إجماليات
  totalTransactions: number;
  totalTransactionValue: number;
  totalCommissions: number;
  totalPaid: number;
  totalPending: number;
  totalClawedBack: number;

  // حسب الخطة
  byPlan: {
    planId: string;
    planName: string;
    planType: CommissionType;
    transactionCount: number;
    transactionValue: number;
    commissionAmount: number;
  }[];

  // حسب الموظف
  byEmployee: {
    employeeId: string;
    employeeName: string;
    department?: string;
    transactionCount: number;
    transactionValue: number;
    commissionAmount: number;
    targetAchievement?: number;
  }[];

  // اتجاهات
  monthlyTrend: {
    month: string;
    transactions: number;
    transactionValue: number;
    commissions: number;
  }[];

  // أعلى المحققين
  topPerformers: {
    employeeId: string;
    employeeName: string;
    totalSales: number;
    totalCommission: number;
    achievementRate: number;
  }[];
}

// ==================== إعدادات الموظف للعمولات ====================

export interface EmployeeCommissionSettings {
  employeeId: string;
  planId: string;
  customTargetAmount?: number;   // هدف مخصص
  customPercentage?: number;     // نسبة مخصصة
  customCap?: number;            // حد أقصى مخصص
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;
}

// ==================== قواعد العمولة المتقدمة ====================

export interface CommissionRule {
  id: string;
  planId: string;
  name: string;
  priority: number;             // ترتيب تطبيق القاعدة
  conditions: CommissionCondition[];
  actions: CommissionAction[];
  isActive: boolean;
}

export interface CommissionCondition {
  field: string;                // حقل الشرط (مثل: transactionAmount, customerType)
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains';
  value: any;
}

export interface CommissionAction {
  type: 'set_percentage' | 'set_amount' | 'multiply' | 'add' | 'cap' | 'skip';
  value: number;
  description?: string;
}
