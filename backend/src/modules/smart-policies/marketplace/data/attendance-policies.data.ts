import { PolicyTemplate } from '../policy-generator.service';

/**
 * ⏰ سياسات الحضور والانصراف
 * 
 * سياسات شاملة تغطي:
 * - التأخير والغياب
 * - الحضور المبكر والانصراف المبكر
 * - العمل الإضافي
 * - الالتزام بمواعيد العمل
 * - البصمة والتسجيل
 */

export const ATTENDANCE_POLICIES: PolicyTemplate[] = [
    // ========================================
    // 🕐 سياسات التأخير
    // ========================================
    {
        id: 'ATT-LATE-001',
        category: 'ATTENDANCE',
        subcategory: 'LATENESS',
        industry: ['ALL'],
        nameAr: 'خصم التأخير البسيط (1-15 دقيقة)',
        nameEn: 'Minor Lateness Deduction (1-15 minutes)',
        descriptionAr: 'خصم تلقائي للتأخير البسيط من 1 إلى 15 دقيقة',
        descriptionEn: 'Automatic deduction for minor lateness from 1 to 15 minutes',
        legalReference: 'نظام العمل السعودي - المادة 80',
        laborLawArticle: '80',
        trigger: {
            event: 'ATTENDANCE_CHECK_IN',
            subEvent: 'LATE',
            timing: 'AFTER',
            description: 'عند تسجيل حضور متأخر'
        },
        conditions: [
            { id: 'c1', field: 'lateMinutes', operator: 'GREATER_THAN', value: 0, description: 'متأخر' },
            { id: 'c2', field: 'lateMinutes', operator: 'LESS_THAN_OR_EQUALS', value: 15, description: 'أقل من 15 دقيقة' }
        ],
        actions: [
            {
                type: 'DEDUCT_FROM_PAYROLL',
                value: 0,
                unit: 'SAR',
                description: 'خصم التأخير',
                formula: '{lateMinutes} * {deductionPerMinute}'
            }
        ],
        variables: [
            { name: 'deductionPerMinute', nameAr: 'الخصم لكل دقيقة (ريال)', type: 'NUMBER', defaultValue: 1, min: 0.5, max: 5, description: 'مبلغ الخصم للدقيقة' }
        ],
        testCases: [
            { id: 'test1', name: 'تأخير 10 دقائق', input: { lateMinutes: 10 }, expectedResult: { shouldTrigger: true, expectedValue: 10 } },
            { id: 'test2', name: 'تأخير 20 دقيقة', input: { lateMinutes: 20 }, expectedResult: { shouldTrigger: false } }
        ],
        tags: ['تأخير', 'خصم', 'حضور', 'بسيط'],
        difficulty: 'SIMPLE',
        popularity: 98,
        rating: 4.9
    },

    {
        id: 'ATT-LATE-002',
        category: 'ATTENDANCE',
        subcategory: 'LATENESS',
        industry: ['ALL'],
        nameAr: 'خصم التأخير المتوسط (16-30 دقيقة)',
        nameEn: 'Moderate Lateness Deduction (16-30 minutes)',
        descriptionAr: 'خصم تلقائي للتأخير المتوسط من 16 إلى 30 دقيقة',
        descriptionEn: 'Automatic deduction for moderate lateness from 16 to 30 minutes',
        legalReference: 'نظام العمل السعودي - المادة 80',
        laborLawArticle: '80',
        trigger: {
            event: 'ATTENDANCE_CHECK_IN',
            subEvent: 'LATE',
            timing: 'AFTER',
            description: 'عند تسجيل حضور متأخر'
        },
        conditions: [
            { id: 'c1', field: 'lateMinutes', operator: 'GREATER_THAN', value: 15, description: 'أكثر من 15 دقيقة' },
            { id: 'c2', field: 'lateMinutes', operator: 'LESS_THAN_OR_EQUALS', value: 30, description: 'أقل من 30 دقيقة' }
        ],
        actions: [
            {
                type: 'DEDUCT_PERCENTAGE',
                value: 25,
                valueVariable: 'deductionPercentage',
                unit: '%',
                description: 'خصم نسبة من الأجر اليومي'
            }
        ],
        variables: [
            { name: 'deductionPercentage', nameAr: 'نسبة الخصم من الأجر اليومي (%)', type: 'PERCENTAGE', defaultValue: 25, min: 10, max: 50, description: 'النسبة المخصومة' }
        ],
        testCases: [
            { id: 'test1', name: 'تأخير 20 دقيقة', input: { lateMinutes: 20 }, expectedResult: { shouldTrigger: true } },
            { id: 'test2', name: 'تأخير 35 دقيقة', input: { lateMinutes: 35 }, expectedResult: { shouldTrigger: false } }
        ],
        tags: ['تأخير', 'خصم', 'حضور', 'متوسط'],
        difficulty: 'SIMPLE',
        popularity: 96,
        rating: 4.8
    },

    {
        id: 'ATT-LATE-003',
        category: 'ATTENDANCE',
        subcategory: 'LATENESS',
        industry: ['ALL'],
        nameAr: 'خصم التأخير الكبير (31-60 دقيقة)',
        nameEn: 'Major Lateness Deduction (31-60 minutes)',
        descriptionAr: 'خصم نصف يوم للتأخير الكبير من 31 إلى 60 دقيقة',
        descriptionEn: 'Half day deduction for major lateness from 31 to 60 minutes',
        legalReference: 'نظام العمل السعودي - المادة 80',
        laborLawArticle: '80',
        trigger: {
            event: 'ATTENDANCE_CHECK_IN',
            subEvent: 'LATE',
            timing: 'AFTER',
            description: 'عند تسجيل حضور متأخر'
        },
        conditions: [
            { id: 'c1', field: 'lateMinutes', operator: 'GREATER_THAN', value: 30, description: 'أكثر من 30 دقيقة' },
            { id: 'c2', field: 'lateMinutes', operator: 'LESS_THAN_OR_EQUALS', value: 60, description: 'أقل من ساعة' }
        ],
        actions: [
            {
                type: 'DEDUCT_PERCENTAGE',
                value: 50,
                unit: '%',
                description: 'خصم نصف يوم'
            }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'تأخير 45 دقيقة', input: { lateMinutes: 45 }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['تأخير', 'خصم', 'حضور', 'كبير'],
        difficulty: 'SIMPLE',
        popularity: 94,
        rating: 4.7
    },

    {
        id: 'ATT-LATE-004',
        category: 'ATTENDANCE',
        subcategory: 'LATENESS',
        industry: ['ALL'],
        nameAr: 'خصم التأخير المتدرج حسب التكرار',
        nameEn: 'Progressive Lateness Deduction by Frequency',
        descriptionAr: 'خصم متدرج يزيد مع تكرار التأخير خلال الشهر',
        descriptionEn: 'Progressive deduction that increases with lateness frequency during month',
        legalReference: 'نظام العمل السعودي - المادة 80',
        laborLawArticle: '80',
        trigger: {
            event: 'ATTENDANCE_CHECK_IN',
            subEvent: 'LATE',
            timing: 'AFTER',
            description: 'عند تسجيل حضور متأخر'
        },
        conditions: [
            { id: 'c1', field: 'lateMinutes', operator: 'GREATER_THAN', value: 5, valueVariable: 'gracePeriod', description: 'بعد فترة السماح' }
        ],
        actions: [
            {
                type: 'DEDUCT_FROM_PAYROLL',
                value: 0,
                unit: 'SAR',
                description: 'خصم متدرج',
                formula: '{baseDeduction} * Math.pow({multiplier}, {monthlyLateCount} - 1)'
            }
        ],
        variables: [
            { name: 'gracePeriod', nameAr: 'فترة السماح (دقائق)', type: 'NUMBER', defaultValue: 5, min: 0, max: 15, description: 'الوقت المسموح' },
            { name: 'baseDeduction', nameAr: 'الخصم الأساسي (ريال)', type: 'NUMBER', defaultValue: 20, min: 10, max: 100, description: 'خصم أول تأخير' },
            { name: 'multiplier', nameAr: 'مضاعف التكرار', type: 'NUMBER', defaultValue: 1.5, min: 1.1, max: 3, description: 'مضاعف كل مرة' }
        ],
        testCases: [
            { id: 'test1', name: 'تأخير أول مرة', input: { lateMinutes: 10, monthlyLateCount: 1 }, expectedResult: { shouldTrigger: true, expectedValue: 20 } },
            { id: 'test2', name: 'تأخير ثالث مرة', input: { lateMinutes: 10, monthlyLateCount: 3 }, expectedResult: { shouldTrigger: true, expectedValue: 45 } }
        ],
        tags: ['تأخير', 'خصم', 'متدرج', 'تكرار'],
        difficulty: 'COMPLEX',
        popularity: 92,
        rating: 4.8
    },

    // ========================================
    // 🚫 سياسات الغياب
    // ========================================
    {
        id: 'ATT-ABS-001',
        category: 'ATTENDANCE',
        subcategory: 'ABSENCE',
        industry: ['ALL'],
        nameAr: 'خصم الغياب بدون إذن',
        nameEn: 'Unauthorized Absence Deduction',
        descriptionAr: 'خصم يوم كامل للغياب بدون إذن مسبق',
        descriptionEn: 'Full day deduction for unauthorized absence',
        legalReference: 'نظام العمل السعودي - المادة 80',
        laborLawArticle: '80',
        trigger: {
            event: 'ABSENCE_RECORDED',
            subEvent: 'UNAUTHORIZED',
            timing: 'AFTER',
            description: 'عند تسجيل غياب بدون إذن'
        },
        conditions: [
            { id: 'c1', field: 'absenceType', operator: 'EQUALS', value: 'UNAUTHORIZED', description: 'غياب بدون إذن' }
        ],
        actions: [
            {
                type: 'DEDUCT_PERCENTAGE',
                value: 100,
                unit: '%',
                description: 'خصم يوم كامل'
            }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'غياب بدون إذن', input: { absenceType: 'UNAUTHORIZED' }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['غياب', 'خصم', 'بدون إذن'],
        difficulty: 'SIMPLE',
        popularity: 97,
        rating: 4.9
    },

    {
        id: 'ATT-ABS-002',
        category: 'ATTENDANCE',
        subcategory: 'ABSENCE',
        industry: ['ALL'],
        nameAr: 'خصم الغياب المتكرر',
        nameEn: 'Repeated Absence Deduction',
        descriptionAr: 'خصم مضاعف للغياب المتكرر خلال الشهر',
        descriptionEn: 'Multiplied deduction for repeated absence during month',
        legalReference: 'نظام العمل السعودي - المادة 80',
        laborLawArticle: '80',
        trigger: {
            event: 'ABSENCE_RECORDED',
            timing: 'AFTER',
            description: 'عند تسجيل غياب'
        },
        conditions: [
            { id: 'c1', field: 'monthlyAbsenceCount', operator: 'GREATER_THAN', value: 1, description: 'غياب متكرر' }
        ],
        actions: [
            {
                type: 'DEDUCT_FROM_PAYROLL',
                value: 0,
                unit: 'DAYS',
                description: 'خصم أيام',
                formula: '{monthlyAbsenceCount} * {deductionMultiplier}'
            }
        ],
        variables: [
            { name: 'deductionMultiplier', nameAr: 'مضاعف الخصم', type: 'NUMBER', defaultValue: 1.5, min: 1, max: 3, description: 'مضاعف كل غياب' }
        ],
        testCases: [
            { id: 'test1', name: 'غياب ثالث مرة', input: { monthlyAbsenceCount: 3 }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['غياب', 'خصم', 'متكرر', 'تصاعدي'],
        difficulty: 'MEDIUM',
        popularity: 90,
        rating: 4.6
    },

    // ========================================
    // ✅ سياسات الالتزام والمكافآت
    // ========================================
    {
        id: 'ATT-COMP-001',
        category: 'ATTENDANCE',
        subcategory: 'COMPLIANCE',
        industry: ['ALL'],
        nameAr: 'مكافأة الحضور الكامل',
        nameEn: 'Perfect Attendance Bonus',
        descriptionAr: 'مكافأة شهرية للموظف بحضور كامل بدون تأخير أو غياب',
        descriptionEn: 'Monthly bonus for employee with perfect attendance - no lateness or absence',
        trigger: {
            event: 'MONTH_END',
            timing: 'AFTER',
            description: 'نهاية الشهر'
        },
        conditions: [
            { id: 'c1', field: 'lateCount', operator: 'EQUALS', value: 0, description: 'لا تأخيرات' },
            { id: 'c2', field: 'absenceCount', operator: 'EQUALS', value: 0, description: 'لا غيابات' },
            { id: 'c3', field: 'workingDays', operator: 'GREATER_THAN_OR_EQUALS', value: 22, valueVariable: 'minWorkingDays', description: 'أيام عمل كافية' }
        ],
        actions: [
            {
                type: 'ADD_TO_PAYROLL',
                value: 500,
                valueVariable: 'bonusAmount',
                unit: 'SAR',
                description: 'مكافأة الحضور الكامل'
            }
        ],
        variables: [
            { name: 'minWorkingDays', nameAr: 'الحد الأدنى لأيام العمل', type: 'NUMBER', defaultValue: 22, min: 20, max: 26, description: 'أيام العمل المطلوبة' },
            { name: 'bonusAmount', nameAr: 'مبلغ المكافأة (ريال)', type: 'NUMBER', defaultValue: 500, min: 200, max: 2000, description: 'مكافأة الحضور الكامل' }
        ],
        testCases: [
            { id: 'test1', name: 'حضور كامل', input: { lateCount: 0, absenceCount: 0, workingDays: 23 }, expectedResult: { shouldTrigger: true, expectedValue: 500 } },
            { id: 'test2', name: 'تأخير واحد', input: { lateCount: 1, absenceCount: 0, workingDays: 23 }, expectedResult: { shouldTrigger: false } }
        ],
        tags: ['حضور', 'مكافأة', 'التزام', 'كامل'],
        difficulty: 'SIMPLE',
        popularity: 99,
        rating: 5.0
    },

    {
        id: 'ATT-COMP-002',
        category: 'ATTENDANCE',
        subcategory: 'COMPLIANCE',
        industry: ['ALL'],
        nameAr: 'مكافأة الحضور المبكر',
        nameEn: 'Early Arrival Bonus',
        descriptionAr: 'مكافأة للموظف الذي يحضر قبل موعد الدوام بانتظام',
        descriptionEn: 'Bonus for employee consistently arriving before work time',
        trigger: {
            event: 'MONTH_END',
            timing: 'AFTER',
            description: 'نهاية الشهر'
        },
        conditions: [
            { id: 'c1', field: 'earlyArrivalDays', operator: 'GREATER_THAN_OR_EQUALS', value: 15, valueVariable: 'minEarlyDays', description: 'حضور مبكر متكرر' }
        ],
        actions: [
            {
                type: 'ADD_TO_PAYROLL',
                value: 0,
                unit: 'SAR',
                description: 'مكافأة الحضور المبكر',
                formula: '{earlyArrivalDays} * {bonusPerDay}'
            }
        ],
        variables: [
            { name: 'minEarlyDays', nameAr: 'الحد الأدنى للأيام المبكرة', type: 'NUMBER', defaultValue: 15, min: 10, max: 25, description: 'أيام الحضور المبكر المطلوبة' },
            { name: 'bonusPerDay', nameAr: 'المكافأة لكل يوم (ريال)', type: 'NUMBER', defaultValue: 10, min: 5, max: 30, description: 'مكافأة كل يوم مبكر' }
        ],
        testCases: [
            { id: 'test1', name: '20 يوم مبكر', input: { earlyArrivalDays: 20 }, expectedResult: { shouldTrigger: true, expectedValue: 200 } }
        ],
        tags: ['حضور', 'مبكر', 'مكافأة', 'التزام'],
        difficulty: 'SIMPLE',
        popularity: 88,
        rating: 4.6
    },

    // ========================================
    // 🕛 سياسات العمل الإضافي
    // ========================================
    {
        id: 'ATT-OT-001',
        category: 'OVERTIME',
        subcategory: 'REGULAR_OVERTIME',
        industry: ['ALL'],
        nameAr: 'بدل العمل الإضافي العادي',
        nameEn: 'Regular Overtime Allowance',
        descriptionAr: 'بدل 150% للساعات الإضافية خلال أيام العمل العادية',
        descriptionEn: '150% allowance for overtime hours during regular working days',
        legalReference: 'نظام العمل السعودي - المادة 107',
        laborLawArticle: '107',
        trigger: {
            event: 'ATTENDANCE_CHECK_OUT',
            subEvent: 'OVERTIME',
            timing: 'AFTER',
            description: 'عند تسجيل انصراف مع ساعات إضافية'
        },
        conditions: [
            { id: 'c1', field: 'overtimeHours', operator: 'GREATER_THAN', value: 0, description: 'ساعات إضافية' },
            { id: 'c2', field: 'isHoliday', operator: 'EQUALS', value: false, description: 'ليس يوم عطلة' }
        ],
        actions: [
            {
                type: 'ADD_TO_PAYROLL',
                value: 0,
                unit: 'SAR',
                description: 'بدل العمل الإضافي',
                formula: '{overtimeHours} * {hourlyRate} * {overtimeMultiplier}'
            }
        ],
        variables: [
            { name: 'overtimeMultiplier', nameAr: 'مضاعف العمل الإضافي', type: 'NUMBER', defaultValue: 1.5, min: 1.25, max: 2, description: 'نسبة الزيادة على الساعة' }
        ],
        testCases: [
            { id: 'test1', name: '3 ساعات إضافية', input: { overtimeHours: 3, isHoliday: false, hourlyRate: 50 }, expectedResult: { shouldTrigger: true, expectedValue: 225 } }
        ],
        tags: ['عمل إضافي', 'بدل', 'ساعات', '150%'],
        difficulty: 'SIMPLE',
        popularity: 98,
        rating: 4.9
    },

    {
        id: 'ATT-OT-002',
        category: 'OVERTIME',
        subcategory: 'HOLIDAY_OVERTIME',
        industry: ['ALL'],
        nameAr: 'بدل العمل الإضافي في العطلات',
        nameEn: 'Holiday Overtime Allowance',
        descriptionAr: 'بدل 200% للساعات الإضافية في أيام العطلات',
        descriptionEn: '200% allowance for overtime hours during holidays',
        legalReference: 'نظام العمل السعودي - المادة 107',
        laborLawArticle: '107',
        trigger: {
            event: 'ATTENDANCE_CHECK_OUT',
            subEvent: 'OVERTIME',
            timing: 'AFTER',
            description: 'عند تسجيل انصراف في عطلة'
        },
        conditions: [
            { id: 'c1', field: 'overtimeHours', operator: 'GREATER_THAN', value: 0, description: 'ساعات إضافية' },
            { id: 'c2', field: 'isHoliday', operator: 'EQUALS', value: true, description: 'يوم عطلة' }
        ],
        actions: [
            {
                type: 'ADD_TO_PAYROLL',
                value: 0,
                unit: 'SAR',
                description: 'بدل العمل في العطلة',
                formula: '{overtimeHours} * {hourlyRate} * {holidayMultiplier}'
            }
        ],
        variables: [
            { name: 'holidayMultiplier', nameAr: 'مضاعف العطلة', type: 'NUMBER', defaultValue: 2, min: 1.5, max: 3, description: 'نسبة الزيادة في العطلة' }
        ],
        testCases: [
            { id: 'test1', name: '4 ساعات في عطلة', input: { overtimeHours: 4, isHoliday: true, hourlyRate: 50 }, expectedResult: { shouldTrigger: true, expectedValue: 400 } }
        ],
        tags: ['عمل إضافي', 'عطلة', 'بدل', '200%'],
        difficulty: 'SIMPLE',
        popularity: 96,
        rating: 4.9
    },

    // ========================================
    // ⏱️ سياسات الانصراف
    // ========================================
    {
        id: 'ATT-EARLY-001',
        category: 'ATTENDANCE',
        subcategory: 'EARLY_DEPARTURE',
        industry: ['ALL'],
        nameAr: 'خصم الانصراف المبكر',
        nameEn: 'Early Departure Deduction',
        descriptionAr: 'خصم للانصراف قبل انتهاء الدوام بدون إذن',
        descriptionEn: 'Deduction for leaving before end of shift without permission',
        legalReference: 'نظام العمل السعودي - المادة 80',
        laborLawArticle: '80',
        trigger: {
            event: 'ATTENDANCE_CHECK_OUT',
            subEvent: 'EARLY',
            timing: 'AFTER',
            description: 'عند تسجيل انصراف مبكر'
        },
        conditions: [
            { id: 'c1', field: 'earlyMinutes', operator: 'GREATER_THAN', value: 10, valueVariable: 'gracePeriod', description: 'انصراف مبكر' },
            { id: 'c2', field: 'hasApproval', operator: 'EQUALS', value: false, description: 'بدون موافقة' }
        ],
        actions: [
            {
                type: 'DEDUCT_FROM_PAYROLL',
                value: 0,
                unit: 'SAR',
                description: 'خصم الانصراف المبكر',
                formula: '{earlyMinutes} * {deductionPerMinute}'
            }
        ],
        variables: [
            { name: 'gracePeriod', nameAr: 'فترة السماح (دقائق)', type: 'NUMBER', defaultValue: 10, min: 5, max: 30, description: 'الوقت المسموح' },
            { name: 'deductionPerMinute', nameAr: 'الخصم لكل دقيقة (ريال)', type: 'NUMBER', defaultValue: 1, min: 0.5, max: 5, description: 'مبلغ الخصم' }
        ],
        testCases: [
            { id: 'test1', name: 'انصراف مبكر 30 دقيقة', input: { earlyMinutes: 30, hasApproval: false }, expectedResult: { shouldTrigger: true, expectedValue: 20 } }
        ],
        tags: ['انصراف', 'مبكر', 'خصم'],
        difficulty: 'SIMPLE',
        popularity: 92,
        rating: 4.7
    },

    // ========================================
    // 📱 سياسات البصمة والتسجيل
    // ========================================
    {
        id: 'ATT-FP-001',
        category: 'ATTENDANCE',
        subcategory: 'FINGERPRINT',
        industry: ['ALL'],
        nameAr: 'خصم نسيان البصمة',
        nameEn: 'Missed Fingerprint Deduction',
        descriptionAr: 'خصم عند نسيان تسجيل بصمة الحضور أو الانصراف',
        descriptionEn: 'Deduction for forgetting to record check-in or check-out fingerprint',
        trigger: {
            event: 'DAY_END',
            timing: 'AFTER',
            description: 'نهاية اليوم'
        },
        conditions: [
            { id: 'c1', field: 'missedFingerprints', operator: 'GREATER_THAN', value: 0, description: 'بصمات ناقصة' }
        ],
        actions: [
            {
                type: 'DEDUCT_FROM_PAYROLL',
                value: 0,
                unit: 'SAR',
                description: 'خصم البصمات الناقصة',
                formula: '{missedFingerprints} * {deductionPerMiss}'
            }
        ],
        variables: [
            { name: 'deductionPerMiss', nameAr: 'الخصم لكل بصمة ناقصة (ريال)', type: 'NUMBER', defaultValue: 25, min: 10, max: 100, description: 'مبلغ الخصم' }
        ],
        testCases: [
            { id: 'test1', name: 'بصمة واحدة ناقصة', input: { missedFingerprints: 1 }, expectedResult: { shouldTrigger: true, expectedValue: 25 } }
        ],
        tags: ['بصمة', 'نسيان', 'خصم', 'تسجيل'],
        difficulty: 'SIMPLE',
        popularity: 89,
        rating: 4.5
    },

    {
        id: 'ATT-FP-002',
        category: 'ATTENDANCE',
        subcategory: 'FINGERPRINT',
        industry: ['ALL'],
        nameAr: 'مكافأة تسجيل البصمات الكامل',
        nameEn: 'Complete Fingerprint Recording Bonus',
        descriptionAr: 'مكافأة للموظف الذي يسجل جميع بصماته بانتظام طوال الشهر',
        descriptionEn: 'Bonus for employee who records all fingerprints consistently throughout month',
        trigger: {
            event: 'MONTH_END',
            timing: 'AFTER',
            description: 'نهاية الشهر'
        },
        conditions: [
            { id: 'c1', field: 'missedFingerprints', operator: 'EQUALS', value: 0, description: 'لا بصمات ناقصة' },
            { id: 'c2', field: 'workingDays', operator: 'GREATER_THAN_OR_EQUALS', value: 20, description: 'أيام عمل كافية' }
        ],
        actions: [
            {
                type: 'ADD_TO_PAYROLL',
                value: 100,
                valueVariable: 'bonusAmount',
                unit: 'SAR',
                description: 'مكافأة الانضباط'
            }
        ],
        variables: [
            { name: 'bonusAmount', nameAr: 'مبلغ المكافأة (ريال)', type: 'NUMBER', defaultValue: 100, min: 50, max: 300, description: 'مكافأة الالتزام بالبصمة' }
        ],
        testCases: [
            { id: 'test1', name: 'بصمات كاملة', input: { missedFingerprints: 0, workingDays: 22 }, expectedResult: { shouldTrigger: true, expectedValue: 100 } }
        ],
        tags: ['بصمة', 'التزام', 'مكافأة', 'تسجيل'],
        difficulty: 'SIMPLE',
        popularity: 85,
        rating: 4.4
    },

    // ========================================
    // 🎯 سياسات خاصة
    // ========================================
    {
        id: 'ATT-SPEC-001',
        category: 'ATTENDANCE',
        subcategory: 'SPECIAL',
        industry: ['ALL'],
        nameAr: 'بدل المناوبة',
        nameEn: 'On-Call Allowance',
        descriptionAr: 'بدل للموظف المتاح للاستدعاء خارج أوقات العمل',
        descriptionEn: 'Allowance for employee available for call outside working hours',
        trigger: {
            event: 'WEEK_END',
            timing: 'AFTER',
            description: 'نهاية الأسبوع'
        },
        conditions: [
            { id: 'c1', field: 'onCallDays', operator: 'GREATER_THAN', value: 0, description: 'أيام مناوبة' }
        ],
        actions: [
            {
                type: 'ADD_TO_PAYROLL',
                value: 0,
                unit: 'SAR',
                description: 'بدل المناوبة',
                formula: '{onCallDays} * {dailyOnCallRate}'
            }
        ],
        variables: [
            { name: 'dailyOnCallRate', nameAr: 'بدل يوم المناوبة (ريال)', type: 'NUMBER', defaultValue: 100, min: 50, max: 300, description: 'البدل اليومي للمناوبة' }
        ],
        testCases: [
            { id: 'test1', name: '3 أيام مناوبة', input: { onCallDays: 3 }, expectedResult: { shouldTrigger: true, expectedValue: 300 } }
        ],
        tags: ['مناوبة', 'بدل', 'استدعاء'],
        difficulty: 'SIMPLE',
        popularity: 82,
        rating: 4.4
    },
];

// إحصائيات
export const ATTENDANCE_POLICIES_COUNT = ATTENDANCE_POLICIES.length;
export const getAttendancePoliciesBySubcategory = (subcategory: string) => 
    ATTENDANCE_POLICIES.filter(p => p.subcategory === subcategory);
