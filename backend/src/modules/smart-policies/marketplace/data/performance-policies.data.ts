import { PolicyTemplate } from '../policy-generator.service';

/**
 * 🎯 سياسات الأداء والتقييم
 */

export const PERFORMANCE_POLICIES: PolicyTemplate[] = [
    // ========================================
    // ⭐ تقييم الأداء
    // ========================================
    {
        id: 'PERF-EVL-001',
        category: 'PERFORMANCE',
        subcategory: 'EVALUATION',
        industry: ['ALL'],
        nameAr: 'تقييم الأداء السنوي',
        nameEn: 'Annual Performance Review',
        descriptionAr: 'إنشاء تقييم أداء سنوي لجميع الموظفين',
        descriptionEn: 'Create annual performance review for all employees',
        trigger: { event: 'REVIEW_CYCLE_START', timing: 'AFTER', description: 'بداية دورة التقييم' },
        conditions: [
            { id: 'c1', field: 'employeeStatus', operator: 'EQUALS', value: 'ACTIVE', description: 'موظف نشط' },
            { id: 'c2', field: 'yearsOfService', operator: 'GREATER_THAN_OR_EQUALS', value: 0.5, description: '6 أشهر خدمة' }
        ],
        actions: [
            { type: 'CREATE_TASK', value: 'إكمال تقييم الأداء', description: 'مهمة للمدير' },
            { type: 'SEND_NOTIFICATION', value: 'بدأت دورة تقييم الأداء', description: 'إشعار للمدير' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'موظف مؤهل للتقييم', input: { employeeStatus: 'ACTIVE', yearsOfService: 1 }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['أداء', 'تقييم', 'سنوي'],
        difficulty: 'SIMPLE',
        popularity: 98,
        rating: 4.9
    },

    {
        id: 'PERF-EVL-002',
        category: 'PERFORMANCE',
        subcategory: 'PROBATION',
        industry: ['ALL'],
        nameAr: 'تقييم فترة التجربة',
        nameEn: 'Probation Period Evaluation',
        descriptionAr: 'تقييم الموظف قبل انتهاء فترة التجربة',
        descriptionEn: 'Evaluate employee before probation period ends',
        trigger: { event: 'PROBATION_END_APPROACHING', timing: 'BEFORE', description: 'قبل انتهاء فترة التجربة' },
        conditions: [
            { id: 'c1', field: 'isOnProbation', operator: 'EQUALS', value: true, description: 'في فترة تجربة' },
            { id: 'c2', field: 'daysUntilProbationEnd', operator: 'LESS_THAN_OR_EQUALS', value: 14, valueVariable: 'reminderDays', description: 'قبل الانتهاء بأسبوعين' }
        ],
        actions: [
            { type: 'CREATE_TASK', value: 'تقييم فترة التجربة', description: 'مهمة للمدير' },
            { type: 'SEND_NOTIFICATION', value: 'فترة التجربة للموظف تنتهي قريباً', description: 'تنبيه' }
        ],
        variables: [
            { name: 'reminderDays', nameAr: 'أيام التذكير قبل الانتهاء', type: 'NUMBER', defaultValue: 14, min: 7, max: 30, description: 'كم يوم قبل' }
        ],
        testCases: [
            { id: 'test1', name: 'قبل انتهاء التجربة', input: { isOnProbation: true, daysUntilProbationEnd: 10 }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['أداء', 'تقييم', 'تجربة'],
        difficulty: 'SIMPLE',
        popularity: 95,
        rating: 4.9
    },

    // ========================================
    // 📈 ربط الأداء بالمكافآت
    // ========================================
    {
        id: 'PERF-RWD-001',
        category: 'INCENTIVES',
        subcategory: 'PERFORMANCE_BONUS',
        industry: ['ALL'],
        nameAr: 'مكافأة الأداء المتميز',
        nameEn: 'Outstanding Performance Bonus',
        descriptionAr: 'مكافأة للموظفين الحاصلين على تقييم ممتاز',
        descriptionEn: 'Bonus for employees with excellent rating',
        trigger: { event: 'PERFORMANCE_REVIEW_COMPLETED', timing: 'AFTER', description: 'بعد اكتمال التقييم' },
        conditions: [
            { id: 'c1', field: 'overallRating', operator: 'GREATER_THAN_OR_EQUALS', value: 4.5, description: 'تقييم ممتاز' }
        ],
        actions: [
            { type: 'ADD_TO_PAYROLL', value: 0, unit: 'SAR', description: 'مكافأة الأداء', formula: '{basicSalary} * {bonusMultiplier}' }
        ],
        variables: [
            { name: 'bonusMultiplier', nameAr: 'مضاعف المكافأة', type: 'NUMBER', defaultValue: 1, min: 0.5, max: 3, description: 'كم راتب مكافأة' }
        ],
        testCases: [
            { id: 'test1', name: 'تقييم 5', input: { overallRating: 5, basicSalary: 10000 }, expectedResult: { shouldTrigger: true, expectedValue: 10000 } }
        ],
        tags: ['أداء', 'مكافأة', 'ممتاز'],
        difficulty: 'SIMPLE',
        popularity: 92,
        rating: 4.8
    },

    {
        id: 'PERF-RWD-002',
        category: 'INCENTIVES',
        subcategory: 'GOAL_BONUS',
        industry: ['ALL'],
        nameAr: 'مكافأة تحقيق الأهداف',
        nameEn: 'Goal Achievement Bonus',
        descriptionAr: 'مكافأة عند تحقيق الأهداف المحددة',
        descriptionEn: 'Bonus for achieving set goals',
        trigger: { event: 'GOAL_COMPLETED', timing: 'AFTER', description: 'بعد تحقيق الهدف' },
        conditions: [
            { id: 'c1', field: 'goalAchievementRate', operator: 'GREATER_THAN_OR_EQUALS', value: 100, description: 'تحقيق الهدف بالكامل' }
        ],
        actions: [
            { type: 'ADD_TO_PAYROLL', value: 0, unit: 'SAR', description: 'مكافأة الهدف', formula: '{goalValue} * {bonusPercentage} / 100' }
        ],
        variables: [
            { name: 'bonusPercentage', nameAr: 'نسبة المكافأة من قيمة الهدف (%)', type: 'PERCENTAGE', defaultValue: 10, min: 5, max: 25, description: 'النسبة المستحقة' }
        ],
        testCases: [
            { id: 'test1', name: 'هدف 100%', input: { goalAchievementRate: 100, goalValue: 50000 }, expectedResult: { shouldTrigger: true, expectedValue: 5000 } }
        ],
        tags: ['أداء', 'هدف', 'مكافأة'],
        difficulty: 'MEDIUM',
        popularity: 88,
        rating: 4.7
    },

    // ========================================
    // ⚠️ خطة تحسين الأداء (PIP)
    // ========================================
    {
        id: 'PERF-PIP-001',
        category: 'PERFORMANCE',
        subcategory: 'PIP',
        industry: ['ALL'],
        nameAr: 'بدء خطة تحسين الأداء',
        nameEn: 'Start Performance Improvement Plan',
        descriptionAr: 'إنشاء خطة تحسين للموظفين ذوي الأداء المنخفض',
        descriptionEn: 'Create improvement plan for low performing employees',
        trigger: { event: 'PERFORMANCE_REVIEW_COMPLETED', timing: 'AFTER', description: 'بعد التقييم' },
        conditions: [
            { id: 'c1', field: 'overallRating', operator: 'LESS_THAN', value: 2.5, description: 'تقييم ضعيف' }
        ],
        actions: [
            { type: 'CREATE_TASK', value: 'إعداد خطة تحسين الأداء', description: 'مهمة للمدير' },
            { type: 'SEND_NOTIFICATION', value: 'الموظف يحتاج خطة تحسين أداء', description: 'تنبيه للـ HR' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'تقييم ضعيف', input: { overallRating: 2 }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['أداء', 'تحسين', 'PIP'],
        difficulty: 'MEDIUM',
        popularity: 85,
        rating: 4.6
    },

    {
        id: 'PERF-PIP-002',
        category: 'PERFORMANCE',
        subcategory: 'PIP_REVIEW',
        industry: ['ALL'],
        nameAr: 'مراجعة خطة تحسين الأداء',
        nameEn: 'Review Performance Improvement Plan',
        descriptionAr: 'مراجعة دورية لتقدم الموظف في خطة التحسين',
        descriptionEn: 'Periodic review of employee progress in improvement plan',
        trigger: { event: 'PIP_REVIEW_DUE', timing: 'AFTER', description: 'موعد المراجعة' },
        conditions: [
            { id: 'c1', field: 'hasActivePIP', operator: 'EQUALS', value: true, description: 'خطة تحسين نشطة' }
        ],
        actions: [
            { type: 'CREATE_TASK', value: 'مراجعة تقدم خطة التحسين', description: 'مهمة' },
            { type: 'SEND_NOTIFICATION', value: 'موعد مراجعة خطة تحسين الأداء', description: 'تذكير' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'خطة نشطة', input: { hasActivePIP: true }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['أداء', 'تحسين', 'مراجعة'],
        difficulty: 'SIMPLE',
        popularity: 80,
        rating: 4.5
    },

    // ========================================
    // 🏆 الترقيات
    // ========================================
    {
        id: 'PERF-PRM-001',
        category: 'PERFORMANCE',
        subcategory: 'PROMOTION',
        industry: ['ALL'],
        nameAr: 'ترشيح تلقائي للترقية',
        nameEn: 'Auto-Nominate for Promotion',
        descriptionAr: 'ترشيح الموظفين ذوي الأداء المتميز للترقية',
        descriptionEn: 'Nominate high performing employees for promotion',
        trigger: { event: 'PERFORMANCE_REVIEW_COMPLETED', timing: 'AFTER', description: 'بعد التقييم' },
        conditions: [
            { id: 'c1', field: 'consecutiveHighRatings', operator: 'GREATER_THAN_OR_EQUALS', value: 2, description: 'تقييمين ممتازين متتاليين' },
            { id: 'c2', field: 'yearsInCurrentRole', operator: 'GREATER_THAN_OR_EQUALS', value: 2, description: 'سنتان في المنصب' }
        ],
        actions: [
            { type: 'CREATE_TASK', value: 'مراجعة ترشيح للترقية', description: 'مهمة للـ HR' },
            { type: 'SEND_NOTIFICATION', value: 'الموظف مرشح للترقية', description: 'إشعار' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'موظف مؤهل', input: { consecutiveHighRatings: 2, yearsInCurrentRole: 3 }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['أداء', 'ترقية', 'ترشيح'],
        difficulty: 'MEDIUM',
        popularity: 90,
        rating: 4.8
    },
];

export const PERFORMANCE_POLICIES_COUNT = PERFORMANCE_POLICIES.length;
