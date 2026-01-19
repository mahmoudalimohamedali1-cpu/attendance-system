/**
 * 📋 ثوابت نظام السياسات الذكية
 * جميع الـ magic numbers والـ configuration في مكان واحد
 */

// ============== Cache Configuration ==============
export const CACHE_CONFIG = {
    /** مدة الـ cache للسياسات (بالـ milliseconds) */
    POLICY_CACHE_TTL_MS: 5 * 60 * 1000, // 5 دقائق

    /** مدة الـ cache للـ schema (بالـ milliseconds) */
    SCHEMA_CACHE_TTL_MS: 10 * 60 * 1000, // 10 دقائق

    /** مدة الـ cache للـ context (بالـ milliseconds) */
    CONTEXT_CACHE_TTL_MS: 2 * 60 * 1000, // 2 دقيقة

    /** الحد الأقصى لعدد العناصر في الـ cache */
    MAX_CACHE_SIZE: 10000,
} as const;

// ============== Batch Processing ==============
export const BATCH_CONFIG = {
    /** حجم الدفعة للمعالجة */
    BATCH_SIZE: 50,

    /** الحد الأقصى للموظفين في المحاكاة */
    MAX_SIMULATION_EMPLOYEES: 10000,

    /** الحد الأقصى للموظفين في الـ batch execution */
    MAX_BATCH_EMPLOYEES: 5000,

    /** timeout للـ batch operations (بالـ milliseconds) */
    BATCH_TIMEOUT_MS: 300000, // 5 دقائق

    /** الحد الأقصى للـ concurrent operations */
    MAX_CONCURRENCY: 10,
} as const;

// ============== Validation Limits ==============
export const VALIDATION_LIMITS = {
    /** الحد الأقصى لطول نص السياسة */
    MAX_POLICY_TEXT_LENGTH: 2000,

    /** الحد الأدنى لطول نص السياسة */
    MIN_POLICY_TEXT_LENGTH: 10,

    /** الحد الأقصى لطول اسم السياسة */
    MAX_POLICY_NAME_LENGTH: 200,

    /** الحد الأقصى للمعادلة */
    MAX_FORMULA_LENGTH: 1000,

    /** الحد الأقصى للشروط في سياسة واحدة */
    MAX_CONDITIONS_PER_POLICY: 20,

    /** الحد الأقصى للإجراءات في سياسة واحدة */
    MAX_ACTIONS_PER_POLICY: 10,

    /** الحد الأقصى لأشهر التطبيق الرجعي */
    MAX_RETRO_MONTHS: 12,

    /** الحد الأقصى للأولوية */
    MAX_PRIORITY: 1000,

    /** الحد الأدنى للأولوية */
    MIN_PRIORITY: 0,
} as const;

// ============== Pagination ==============
export const PAGINATION_CONFIG = {
    /** الصفحة الافتراضية */
    DEFAULT_PAGE: 1,

    /** عدد العناصر الافتراضي */
    DEFAULT_LIMIT: 20,

    /** الحد الأقصى للعناصر في الصفحة */
    MAX_LIMIT: 100,

    /** الحد الأدنى للعناصر في الصفحة */
    MIN_LIMIT: 1,
} as const;

// ============== Time Constants ==============
export const TIME_CONSTANTS = {
    /** عدد أيام السنة */
    DAYS_IN_YEAR: 365,

    /** عدد أيام الشهر (متوسط) */
    DAYS_IN_MONTH: 30,

    /** ساعات العمل القياسية يومياً */
    STANDARD_WORK_HOURS: 8,

    /** ساعات العمل الشهرية القياسية */
    STANDARD_MONTHLY_HOURS: 240,

    /** الوقت المسموح خارج نطاق الشركة (بالدقائق) */
    ALLOWED_GEOFENCE_MINUTES: 15,

    /** فترة التجربة الافتراضية (بالأشهر) */
    DEFAULT_PROBATION_MONTHS: 3,
} as const;

// ============== Performance Achievement Levels ==============
export const ACHIEVEMENT_LEVELS = {
    /** حد المستوى المتميز */
    OUTSTANDING_THRESHOLD: 110,

    /** حد المستوى المتجاوز */
    EXCEEDED_THRESHOLD: 105,

    /** حد المستوى المطابق */
    MET_THRESHOLD: 100,
} as const;

// ============== Operator Mappings ==============
export const OPERATOR_MAPPINGS: Record<string, string[]> = {
    GREATER_THAN: ['>', 'GREATER_THAN', 'أكبر من', 'اكبر من'],
    LESS_THAN: ['<', 'LESS_THAN', 'أصغر من', 'اصغر من'],
    GREATER_THAN_OR_EQUAL: ['>=', 'GREATER_THAN_OR_EQUAL', 'أكبر من أو يساوي'],
    LESS_THAN_OR_EQUAL: ['<=', 'LESS_THAN_OR_EQUAL', 'أصغر من أو يساوي'],
    EQUALS: ['==', '===', '=', 'EQUALS', 'يساوي'],
    NOT_EQUALS: ['!=', '!==', 'NOT_EQUALS', 'لا يساوي'],
    CONTAINS: ['CONTAINS', 'يحتوي'],
    IN: ['IN', 'ضمن'],
    BETWEEN: ['BETWEEN', 'بين'],
    IS_TRUE: ['IS_TRUE', 'صحيح'],
    IS_FALSE: ['IS_FALSE', 'خاطئ'],
} as const;

// ============== Action Types ==============
export const ACTION_TYPES = {
    // Payroll Actions
    ADD_TO_PAYROLL: 'ADD_TO_PAYROLL',
    DEDUCT_FROM_PAYROLL: 'DEDUCT_FROM_PAYROLL',

    // Component Actions
    BONUS: 'BONUS',
    ALLOWANCE: 'ALLOWANCE',
    DEDUCTION: 'DEDUCTION',

    // Notification Actions
    ALERT_HR: 'ALERT_HR',
    SEND_NOTIFICATION: 'SEND_NOTIFICATION',

    // Workflow Actions
    CREATE_TASK: 'CREATE_TASK',
    TRIGGER_WORKFLOW: 'TRIGGER_WORKFLOW',
} as const;

// ============== Value Types ==============
export const VALUE_TYPES = {
    FIXED: 'FIXED',
    PERCENTAGE: 'PERCENTAGE',
    FORMULA: 'FORMULA',
} as const;

// ============== Scope Types ==============
export const SCOPE_TYPES = {
    ALL_EMPLOYEES: 'ALL_EMPLOYEES',
    DEPARTMENT: 'DEPARTMENT',
    BRANCH: 'BRANCH',
    JOB_TITLE: 'JOB_TITLE',
    INDIVIDUAL: 'INDIVIDUAL',
    CUSTOM: 'CUSTOM',
} as const;

// ============== Exception Types ==============
export const EXCEPTION_TYPES = {
    EMPLOYEE: 'EMPLOYEE',
    DEPARTMENT: 'DEPARTMENT',
    JOB_TITLE: 'JOB_TITLE',
    BRANCH: 'BRANCH',
} as const;

// ============== Occurrence Types ==============
export const OCCURRENCE_TYPES = {
    LATE: 'LATE',
    ABSENCE: 'ABSENCE',
    EARLY_DEPARTURE: 'EARLY_DEPARTURE',
    OVERTIME: 'OVERTIME',
    GEOFENCE_EXIT: 'GEOFENCE_EXIT',
} as const;

// ============== Reset Periods ==============
export const RESET_PERIODS = {
    MONTHLY: 'MONTHLY',
    QUARTERLY: 'QUARTERLY',
    YEARLY: 'YEARLY',
    NEVER: 'NEVER',
} as const;

// ============== Error Messages ==============
export const ERROR_MESSAGES = {
    // General
    INTERNAL_ERROR: 'حدث خطأ داخلي',
    UNAUTHORIZED: 'غير مصرح',
    FORBIDDEN: 'ممنوع الوصول',
    NOT_FOUND: 'غير موجود',

    // Policy
    POLICY_NOT_FOUND: 'السياسة غير موجودة',
    POLICY_ALREADY_EXISTS: 'سياسة مشابهة موجودة بالفعل',
    POLICY_INVALID_TEXT: 'نص السياسة غير صالح',
    POLICY_PARSE_FAILED: 'فشل في فهم السياسة',
    POLICY_ACTIVATION_FAILED: 'فشل في تفعيل السياسة',

    // Validation
    INVALID_PERIOD_FORMAT: 'صيغة الفترة غير صحيحة. استخدم YYYY-MM مثل 2025-01',
    INVALID_DATE_RANGE: 'نطاق التاريخ غير صالح',
    RETRO_PERIOD_TOO_LONG: 'لا يمكن تطبيق السياسة بأثر رجعي لأكثر من 12 شهر',

    // Formula
    FORMULA_INVALID: 'المعادلة غير صالحة',
    FORMULA_TOO_LONG: 'المعادلة طويلة جداً',
    FORMULA_DIVISION_BY_ZERO: 'القسمة على صفر غير مسموحة',
    FORMULA_UNSAFE_PATTERN: 'المعادلة تحتوي على أنماط غير مسموحة',

    // Approval
    APPROVAL_REQUIRED: 'يتطلب موافقة قبل التفعيل',
    ALREADY_APPROVED: 'تمت الموافقة مسبقاً',
    ALREADY_REJECTED: 'تم الرفض مسبقاً',

    // Simulation
    NO_EMPLOYEES_FOUND: 'لم يتم العثور على موظفين',
    SIMULATION_FAILED: 'فشلت المحاكاة',
} as const;

// ============== Success Messages ==============
export const SUCCESS_MESSAGES = {
    POLICY_CREATED: 'تم إنشاء السياسة بنجاح',
    POLICY_UPDATED: 'تم تحديث السياسة بنجاح',
    POLICY_DELETED: 'تم حذف السياسة بنجاح',
    POLICY_ACTIVATED: 'تم تفعيل السياسة بنجاح',
    POLICY_DEACTIVATED: 'تم إيقاف السياسة بنجاح',
    EXCEPTION_CREATED: 'تم إضافة الاستثناء بنجاح',
    EXCEPTION_DELETED: 'تم حذف الاستثناء بنجاح',
    SIMULATION_COMPLETED: 'اكتملت المحاكاة بنجاح',
    RETRO_APPLIED: 'تم تطبيق الأثر الرجعي بنجاح',
} as const;

// ============== Field Mappings (Shortcuts) ==============
export const FIELD_SHORTCUTS: Record<string, string> = {
    // ==========================================
    // Attendance shortcuts (الحضور والانصراف)
    // ==========================================
    'lateDays': 'attendance.currentPeriod.lateDays',
    'absentDays': 'attendance.currentPeriod.absentDays',
    'presentDays': 'attendance.currentPeriod.presentDays',
    'lateMinutes': 'attendance.currentPeriod.lateMinutes',
    'overtimeHours': 'attendance.currentPeriod.overtimeHours',
    'attendancePercentage': 'attendance.currentPeriod.attendancePercentage',
    'workingDays': 'attendance.currentPeriod.workingDays',
    // Aliases for policy compatibility
    'lateCount': 'attendance.currentPeriod.lateDays',
    'absenceCount': 'attendance.currentPeriod.absentDays',
    'monthlyLateCount': 'attendance.currentPeriod.lateDays',
    'monthlyAbsenceCount': 'attendance.currentPeriod.absentDays',
    'earlyArrivalDays': 'attendance.currentPeriod.earlyArrivalDays',
    'earlyLeaveDays': 'attendance.currentPeriod.earlyLeaveDays',
    'earlyMinutes': 'attendance.currentPeriod.earlyMinutes',
    'missedFingerprints': 'attendance.currentPeriod.missedFingerprints',
    'totalLateMinutes': 'attendance.currentPeriod.lateMinutes',
    'totalOvertimeHours': 'attendance.currentPeriod.overtimeHours',
    'onCallDays': 'attendance.currentPeriod.onCallDays',
    'weekendWorkDays': 'attendance.currentPeriod.weekendWorkDays',
    'holidayWorkDays': 'attendance.currentPeriod.holidayWorkDays',
    'isHoliday': 'attendance.isHoliday',
    'absenceType': 'attendance.lastAbsenceType',
    'dailyHours': 'attendance.currentPeriod.dailyHours',
    // 🔧 FIX: Full path aliases for policy compatibility (attendance.* → attendance.currentPeriod.*)
    'attendance.lateDays': 'attendance.currentPeriod.lateDays',
    'attendance.absentDays': 'attendance.currentPeriod.absentDays',
    'attendance.presentDays': 'attendance.currentPeriod.presentDays',
    'attendance.lateMinutes': 'attendance.currentPeriod.lateMinutes',
    'attendance.overtimeHours': 'attendance.currentPeriod.overtimeHours',
    'attendance.attendancePercentage': 'attendance.currentPeriod.attendancePercentage',
    'attendance.workingDays': 'attendance.currentPeriod.workingDays',
    'attendance.lateCount': 'attendance.currentPeriod.lateDays',

    // ==========================================
    // Tenure shortcuts (مدة الخدمة)
    // ==========================================
    'tenure': 'employee.tenure.totalMonths',
    'serviceYears': 'employee.tenure.years',
    'serviceMonths': 'employee.tenure.totalMonths',
    'tenureYears': 'employee.tenure.years',
    'tenureMonths': 'employee.tenure.months',
    'yearsOfService': 'employee.tenure.years',
    'yearsInCurrentRole': 'employee.yearsInCurrentRole',

    // ==========================================
    // Salary shortcuts (الراتب)
    // ==========================================
    'basicSalary': 'contract.basicSalary',
    'employee.basicSalary': 'contract.basicSalary',  // 🔧 FIX: mapping للسياسات التي تستخدم employee.basicSalary
    'employee.salary': 'contract.totalSalary',
    'employee.totalSalary': 'contract.totalSalary',
    'salary': 'contract.totalSalary',
    'totalSalary': 'contract.totalSalary',
    'housingAllowance': 'contract.housingAllowance',
    'transportAllowance': 'contract.transportAllowance',
    'lastSalary': 'contract.totalSalary',
    'hourlyRate': 'contract.hourlyRate',
    'gosiEligibleSalary': 'contract.gosiEligibleSalary',

    // ==========================================
    // Employee shortcuts (بيانات الموظف)
    // ==========================================
    'department': 'employee.department',
    'branch': 'employee.branch',
    'jobTitle': 'employee.jobTitle',
    'isSaudi': 'employee.isSaudi',
    'nationality': 'employee.nationality',
    'employeeStatus': 'employee.status',
    'gender': 'employee.gender',
    'religion': 'employee.religion',

    // ==========================================
    // Contract shortcuts (العقد)
    // ==========================================
    'contractType': 'contract.contractType',
    'isProbation': 'contract.isProbation',
    'isOnProbation': 'contract.isProbation',
    'probationEndDate': 'contract.probationEndDate',
    'probationMonthsRemaining': 'contract.probationMonthsRemaining',
    'daysUntilProbationEnd': 'contract.daysUntilProbationEnd',
    'daysUntilExpiry': 'contract.daysUntilExpiry',
    'probationResult': 'contract.probationResult',
    'terminationType': 'contract.terminationType',
    'autoRenewalEnabled': 'contract.autoRenewalEnabled',

    // ==========================================
    // Performance shortcuts (الأداء)
    // ==========================================
    'targetAchievement': 'performance.targetAchievement',
    'performanceRating': 'performance.lastRating',
    'lastPerformanceRating': 'performance.lastRating',
    'overallRating': 'performance.lastRating',
    'isAbove100': 'performance.isAbove100',
    'isAbove105': 'performance.isAbove105',
    'consecutiveHighRatings': 'performance.consecutiveHighRatings',
    'goalAchievementRate': 'performance.goalAchievementRate',
    'goalValue': 'performance.goalValue',
    'projectValue': 'performance.projectValue',
    'completedOnTime': 'performance.completedOnTime',
    'qualityScore': 'performance.qualityScore',
    'hasActivePIP': 'performance.hasActivePIP',
    'employeeRating': 'performance.lastRating',

    // ==========================================
    // Leaves shortcuts (الإجازات)
    // ==========================================
    'sickDays': 'leaves.currentMonth.sickDays',
    'annualDays': 'leaves.currentMonth.annualDays',
    'annualBalance': 'leaves.balance.annual',
    'remainingLeaveBalance': 'leaves.balance.annual',
    'totalSickDaysThisYear': 'leaves.currentYear.sickDays',
    'consecutiveSickDays': 'leaves.currentMonth.consecutiveSickDays',
    'hasMedicalReport': 'leaves.hasMedicalReport',
    'leaveType': 'leaves.currentLeaveType',
    'hajjLeaveTaken': 'leaves.hajjLeaveTaken',
    'relationshipDegree': 'leaves.relationshipDegree',
    'relationshipType': 'leaves.relationshipType',
    'monthlyWfhCount': 'leaves.monthlyWfhCount',
    'jobAllowsWfh': 'leaves.jobAllowsWfh',
    'hasExamSchedule': 'leaves.hasExamSchedule',
    'hasApproval': 'leaves.hasApproval',

    // ==========================================
    // Location shortcuts (تتبع الموقع)
    // ==========================================
    'minutesOutsideGeofence': 'location.minutesOutsideGeofence',
    'excessMinutes': 'location.excessMinutes',
    'exceededAllowedTime': 'location.exceededAllowedTime',
    'geofenceExitCount': 'location.geofenceExitCount',

    // ==========================================
    // Disciplinary shortcuts (التأديب)
    // ==========================================
    'activeCases': 'disciplinary.activeCases',
    'activeWarnings': 'disciplinary.activeWarnings',
    'violationCount': 'disciplinary.totalCases',
    'violationCountThisYear': 'disciplinary.casesThisYear',
    'violationSeverity': 'disciplinary.lastViolationSeverity',
    'disciplinaryAction': 'disciplinary.lastAction',
    'suspensionType': 'disciplinary.suspensionType',
    'suspensionDays': 'disciplinary.suspensionDays',
    'daysSinceLastIncident': 'disciplinary.daysSinceLastIncident',

    // ==========================================
    // Custody shortcuts (العهد)
    // ==========================================
    'activeCustody': 'custody.active',
    'activeCustodyCount': 'custody.active',
    'currentCustodyCount': 'custody.active',
    'lateReturns': 'custody.lateReturns',
    'unreturnedCustodyValue': 'custody.unreturnedValue',
    'itemCondition': 'custody.itemCondition',
    'daysSinceLastMaintenance': 'custody.daysSinceLastMaintenance',
    'requiresMaintenance': 'custody.requiresMaintenance',
    'maintenanceCost': 'custody.maintenanceCost',
    'damageReason': 'custody.damageReason',
    'damageType': 'custody.damageType',
    'lossReason': 'custody.lossReason',
    'itemCurrentValue': 'custody.itemCurrentValue',
    'daysSinceLastInventory': 'custody.daysSinceLastInventory',
    'fromEmployeeStatus': 'custody.fromEmployeeStatus',
    'toEmployeeStatus': 'custody.toEmployeeStatus',

    // ==========================================
    // Advances shortcuts (السلف)
    // ==========================================
    'hasActiveAdvance': 'advances.hasActiveAdvance',
    'remainingAdvance': 'advances.remainingAmount',
    'remainingAdvanceBalance': 'advances.remainingAmount',
    'remainingBalance': 'advances.remainingAmount',
    'monthlyInstallment': 'advances.monthlyDeduction',
    'advanceInstallment': 'advances.monthlyDeduction',
    'remainingInstallments': 'advances.remainingInstallments',
    'requestedAmount': 'advances.requestedAmount',
    'lastAdvanceMonthsAgo': 'advances.lastAdvanceMonthsAgo',

    // ==========================================
    // Payroll shortcuts (الرواتب)
    // ==========================================
    'hasHousingAllowance': 'payroll.hasHousingAllowance',
    'hasCompanyCar': 'payroll.hasCompanyCar',
    'requiresPhone': 'payroll.requiresPhone',
    'registeredInGOSI': 'payroll.registeredInGOSI',
    'hasGOSI': 'payroll.registeredInGOSI',
    'isSalesEmployee': 'payroll.isSalesEmployee',
    'totalSales': 'payroll.totalSales',
    'unauthorizedAbsenceDays': 'payroll.unauthorizedAbsenceDays',

    // ==========================================
    // Tasks shortcuts (المهام)
    // ==========================================
    'taskCategory': 'tasks.taskCategory',
    'autoAssign': 'tasks.autoAssign',
    'daysUntilDeadline': 'tasks.daysUntilDeadline',
    'taskStatus': 'tasks.taskStatus',
    'daysOverdue': 'tasks.daysOverdue',
    'promotionType': 'tasks.promotionType',

    // ==========================================
    // Injury shortcuts (إصابات العمل)
    // ==========================================
    'injuryType': 'injury.injuryType',

    // ==========================================
    // 🚛 Logistics shortcuts (اللوجستيات)
    // ==========================================

    // === السائقين والرحلات ===
    'delayMinutes': 'logistics.delayMinutes',
    'onTimeTripsPercentage': 'logistics.onTimeTripsPercentage',
    'totalTrips': 'logistics.totalTrips',
    'distanceKm': 'logistics.distanceKm',
    'fuelConsumption': 'logistics.fuelConsumption',
    'fuelEfficiency': 'logistics.fuelEfficiency',
    'safetyScore': 'logistics.safetyScore',
    'violationsCount': 'logistics.violationsCount',

    // === التوصيل ===
    'minutesEarly': 'logistics.minutesEarly',
    'minutesLate': 'logistics.minutesLate',
    'completedDeliveries': 'logistics.completedDeliveries',
    'failedDeliveries': 'logistics.failedDeliveries',
    'customerRating': 'logistics.customerRating',
    'delayReason': 'logistics.delayReason',
    'returnRate': 'logistics.returnRate',

    // === المستودعات والجرد ===
    'accuracyRate': 'logistics.accuracyRate',
    'ordersPicked': 'logistics.ordersPicked',
    'errorRate': 'logistics.errorRate',
    'damageValue': 'logistics.damageValue',
    'inventoryDamageReason': 'logistics.damageReason',
    'inventoryVariance': 'logistics.inventoryVariance',

    // === الشحن والنقل ===
    'loadWeight': 'logistics.loadWeight',
    'cargoValue': 'logistics.cargoValue',
    'tripDuration': 'logistics.tripDuration',
    'restStops': 'logistics.restStops',
    'nightDrivingHours': 'logistics.nightDrivingHours',

    // === السلامة والأصول ===
    'vehicleCondition': 'logistics.vehicleCondition',
    'maintenanceScore': 'logistics.maintenanceScore',
    'accidentFree': 'logistics.accidentFree',
    'appUsageRate': 'logistics.appUsageRate',
    'gpsAccuracyRate': 'logistics.gpsAccuracyRate',
} as const;

// ============== Trigger Event Labels (Arabic) ==============
export const TRIGGER_LABELS: Record<string, string> = {
    ATTENDANCE: 'الحضور والانصراف',
    LEAVE: 'الإجازات',
    CUSTODY: 'العهد',
    PAYROLL: 'الرواتب',
    ANNIVERSARY: 'المناسبات السنوية',
    CONTRACT: 'العقود',
    DISCIPLINARY: 'التأديب',
    PERFORMANCE: 'الأداء',
    CUSTOM: 'مخصص',
} as const;

// ============== Status Labels (Arabic) ==============
export const STATUS_LABELS: Record<string, string> = {
    DRAFT: 'مسودة',
    PENDING: 'قيد المراجعة',
    ACTIVE: 'نشطة',
    PAUSED: 'متوقفة',
    ARCHIVED: 'مؤرشفة',
} as const;

// ============== Export all ==============
export default {
    CACHE_CONFIG,
    BATCH_CONFIG,
    VALIDATION_LIMITS,
    PAGINATION_CONFIG,
    TIME_CONSTANTS,
    ACHIEVEMENT_LEVELS,
    OPERATOR_MAPPINGS,
    ACTION_TYPES,
    VALUE_TYPES,
    SCOPE_TYPES,
    EXCEPTION_TYPES,
    OCCURRENCE_TYPES,
    RESET_PERIODS,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    FIELD_SHORTCUTS,
    TRIGGER_LABELS,
    STATUS_LABELS,
};
