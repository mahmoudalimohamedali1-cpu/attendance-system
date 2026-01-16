import { PolicyTemplate } from '../policy-generator.service';

/**
 * ✅ سياسات المهام
 */
export const TASKS_POLICIES: PolicyTemplate[] = [
    {
        id: 'TSK-ASN-001',
        category: 'PERFORMANCE',
        subcategory: 'TASK_ASSIGNMENT',
        industry: ['ALL'],
        nameAr: 'توزيع المهام التلقائي',
        nameEn: 'Auto Task Assignment',
        descriptionAr: 'توزيع المهام تلقائياً على الموظفين حسب التخصص',
        descriptionEn: 'Automatically assign tasks to employees based on specialization',
        trigger: { event: 'TASK_CREATED', timing: 'AFTER', description: 'بعد إنشاء مهمة' },
        conditions: [
            { id: 'c1', field: 'taskCategory', operator: 'IS_NOT_NULL', value: true, description: 'تصنيف محدد' },
            { id: 'c2', field: 'autoAssign', operator: 'EQUALS', value: true, description: 'توزيع تلقائي مفعل' }
        ],
        actions: [
            { type: 'TRIGGER_WORKFLOW', value: 'AUTO_ASSIGN_TASK', description: 'تفعيل التوزيع' },
            { type: 'SEND_NOTIFICATION', value: 'تم تعيين مهمة جديدة لك', description: 'إشعار للموظف' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'مهمة بتصنيف', input: { taskCategory: 'IT', autoAssign: true }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['مهام', 'توزيع', 'تلقائي'],
        difficulty: 'MEDIUM',
        popularity: 85,
        rating: 4.6
    },

    {
        id: 'TSK-DL-001',
        category: 'COMPLIANCE',
        subcategory: 'TASK_DEADLINE',
        industry: ['ALL'],
        nameAr: 'تنبيه قبل انتهاء المهمة',
        nameEn: 'Task Deadline Reminder',
        descriptionAr: 'تذكير بالمهام قبل انتهاء موعدها',
        descriptionEn: 'Remind about tasks before deadline',
        trigger: { event: 'TASK_DEADLINE_APPROACHING', timing: 'BEFORE', description: 'قبل انتهاء المهمة' },
        conditions: [
            { id: 'c1', field: 'daysUntilDeadline', operator: 'LESS_THAN_OR_EQUALS', value: 2, valueVariable: 'reminderDays', description: 'قبل يومين' },
            { id: 'c2', field: 'taskStatus', operator: 'NOT_EQUALS', value: 'COMPLETED', description: 'غير مكتملة' }
        ],
        actions: [
            { type: 'SEND_NOTIFICATION', value: 'تذكير: المهمة تنتهي قريباً', description: 'تنبيه' }
        ],
        variables: [
            { name: 'reminderDays', nameAr: 'أيام التذكير', type: 'NUMBER', defaultValue: 2, min: 1, max: 7, description: 'كم يوم قبل الموعد' }
        ],
        testCases: [
            { id: 'test1', name: 'مهمة قريبة', input: { daysUntilDeadline: 1, taskStatus: 'IN_PROGRESS' }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['مهام', 'تذكير', 'موعد'],
        difficulty: 'SIMPLE',
        popularity: 92,
        rating: 4.8
    },

    {
        id: 'TSK-OVD-001',
        category: 'COMPLIANCE',
        subcategory: 'TASK_OVERDUE',
        industry: ['ALL'],
        nameAr: 'تصعيد المهام المتأخرة',
        nameEn: 'Escalate Overdue Tasks',
        descriptionAr: 'تصعيد المهام المتأخرة للمدير',
        descriptionEn: 'Escalate overdue tasks to manager',
        trigger: { event: 'TASK_OVERDUE', timing: 'AFTER', description: 'بعد تأخر المهمة' },
        conditions: [
            { id: 'c1', field: 'daysOverdue', operator: 'GREATER_THAN_OR_EQUALS', value: 1, description: 'متأخرة يوم أو أكثر' }
        ],
        actions: [
            { type: 'SEND_NOTIFICATION', value: 'مهمة متأخرة تحتاج متابعة', description: 'إشعار للمدير' },
            { type: 'UPDATE_RECORD', value: 'ESCALATED', description: 'تحديث الحالة' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'مهمة متأخرة', input: { daysOverdue: 2 }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['مهام', 'تصعيد', 'متأخر'],
        difficulty: 'SIMPLE',
        popularity: 88,
        rating: 4.7
    },
];

/**
 * 📄 سياسات العقود
 */
export const CONTRACTS_POLICIES: PolicyTemplate[] = [
    {
        id: 'CNT-EXP-001',
        category: 'COMPLIANCE',
        subcategory: 'CONTRACT_EXPIRY',
        industry: ['ALL'],
        nameAr: 'تنبيه قبل انتهاء العقد',
        nameEn: 'Contract Expiry Alert',
        descriptionAr: 'تنبيه قبل انتهاء عقد الموظف بشهرين',
        descriptionEn: 'Alert 2 months before employee contract expires',
        trigger: { event: 'CONTRACT_EXPIRY_APPROACHING', timing: 'BEFORE', description: 'قبل انتهاء العقد' },
        conditions: [
            { id: 'c1', field: 'daysUntilExpiry', operator: 'LESS_THAN_OR_EQUALS', value: 60, valueVariable: 'alertDays', description: 'قبل شهرين' }
        ],
        actions: [
            { type: 'SEND_NOTIFICATION', value: 'عقد الموظف ينتهي قريباً', description: 'إشعار للـ HR' },
            { type: 'CREATE_TASK', value: 'مراجعة تجديد العقد', description: 'مهمة' }
        ],
        variables: [
            { name: 'alertDays', nameAr: 'أيام التنبيه قبل الانتهاء', type: 'NUMBER', defaultValue: 60, min: 30, max: 90, description: 'كم يوم قبل' }
        ],
        testCases: [
            { id: 'test1', name: 'عقد قريب الانتهاء', input: { daysUntilExpiry: 45 }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['عقود', 'انتهاء', 'تنبيه'],
        difficulty: 'SIMPLE',
        popularity: 98,
        rating: 5.0
    },

    {
        id: 'CNT-RNW-001',
        category: 'COMPLIANCE',
        subcategory: 'CONTRACT_RENEWAL',
        industry: ['ALL'],
        nameAr: 'تجديد العقد التلقائي',
        nameEn: 'Auto Contract Renewal',
        descriptionAr: 'تجديد العقد تلقائياً للموظفين المتميزين',
        descriptionEn: 'Automatically renew contract for outstanding employees',
        trigger: { event: 'CONTRACT_EXPIRY_APPROACHING', timing: 'BEFORE', description: 'قبل انتهاء العقد' },
        conditions: [
            { id: 'c1', field: 'lastPerformanceRating', operator: 'GREATER_THAN_OR_EQUALS', value: 4, description: 'تقييم جيد جداً' },
            { id: 'c2', field: 'violationsCount', operator: 'EQUALS', value: 0, description: 'لا مخالفات' },
            { id: 'c3', field: 'autoRenewalEnabled', operator: 'EQUALS', value: true, description: 'التجديد التلقائي مفعل' }
        ],
        actions: [
            { type: 'CREATE_TASK', value: 'إعداد عقد التجديد', description: 'مهمة للـ HR' },
            { type: 'SEND_NOTIFICATION', value: 'سيتم تجديد عقدك تلقائياً', description: 'إشعار للموظف' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'موظف مؤهل للتجديد', input: { lastPerformanceRating: 4.5, violationsCount: 0, autoRenewalEnabled: true }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['عقود', 'تجديد', 'تلقائي'],
        difficulty: 'MEDIUM',
        popularity: 85,
        rating: 4.7
    },

    {
        id: 'CNT-PRB-001',
        category: 'COMPLIANCE',
        subcategory: 'PROBATION',
        industry: ['ALL'],
        nameAr: 'تحويل من تجربة لدائم',
        nameEn: 'Convert Probation to Permanent',
        descriptionAr: 'تحويل العقد من تجربة إلى دائم بعد اجتياز فترة التجربة',
        descriptionEn: 'Convert probation contract to permanent after passing probation',
        trigger: { event: 'PROBATION_EVALUATION_COMPLETED', timing: 'AFTER', description: 'بعد تقييم التجربة' },
        conditions: [
            { id: 'c1', field: 'probationResult', operator: 'EQUALS', value: 'PASSED', description: 'اجتاز التجربة' }
        ],
        actions: [
            { type: 'UPDATE_RECORD', value: 'PERMANENT', description: 'تحويل لدائم' },
            { type: 'SEND_NOTIFICATION', value: 'مبروك! تم تثبيتك كموظف دائم', description: 'إشعار' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'اجتياز التجربة', input: { probationResult: 'PASSED' }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['عقود', 'تجربة', 'تثبيت'],
        difficulty: 'SIMPLE',
        popularity: 95,
        rating: 4.9
    },
];

/**
 * 📈 سياسات العلاوات والترقيات
 */
export const RAISES_POLICIES: PolicyTemplate[] = [
    {
        id: 'RAS-ANN-001',
        category: 'PAYROLL',
        subcategory: 'ANNUAL_RAISE',
        industry: ['ALL'],
        nameAr: 'العلاوة السنوية',
        nameEn: 'Annual Raise',
        descriptionAr: 'علاوة سنوية تلقائية بناءً على الأداء وسنوات الخدمة',
        descriptionEn: 'Automatic annual raise based on performance and years of service',
        trigger: { event: 'ANNUAL_RAISE_CYCLE', timing: 'AFTER', description: 'دورة العلاوات السنوية' },
        conditions: [
            { id: 'c1', field: 'yearsOfService', operator: 'GREATER_THAN_OR_EQUALS', value: 1, description: 'سنة خدمة على الأقل' },
            { id: 'c2', field: 'lastPerformanceRating', operator: 'GREATER_THAN_OR_EQUALS', value: 3, description: 'تقييم جيد' }
        ],
        actions: [
            { type: 'ADD_PERCENTAGE', value: 0, unit: '%', description: 'علاوة سنوية', formula: '{baseRaisePercentage} * ({lastPerformanceRating} / 5)' }
        ],
        variables: [
            { name: 'baseRaisePercentage', nameAr: 'نسبة العلاوة الأساسية (%)', type: 'PERCENTAGE', defaultValue: 5, min: 2, max: 15, description: 'نسبة الزيادة القصوى' }
        ],
        testCases: [
            { id: 'test1', name: 'تقييم ممتاز', input: { yearsOfService: 2, lastPerformanceRating: 5 }, expectedResult: { shouldTrigger: true, expectedValue: 5 } },
            { id: 'test2', name: 'تقييم جيد', input: { yearsOfService: 2, lastPerformanceRating: 3 }, expectedResult: { shouldTrigger: true, expectedValue: 3 } }
        ],
        tags: ['علاوة', 'سنوية', 'راتب'],
        difficulty: 'MEDIUM',
        popularity: 98,
        rating: 5.0
    },

    {
        id: 'RAS-PRM-001',
        category: 'PAYROLL',
        subcategory: 'PROMOTION_RAISE',
        industry: ['ALL'],
        nameAr: 'زيادة الترقية',
        nameEn: 'Promotion Raise',
        descriptionAr: 'زيادة الراتب عند الترقية لمنصب أعلى',
        descriptionEn: 'Salary increase upon promotion to higher position',
        trigger: { event: 'PROMOTION_APPROVED', timing: 'AFTER', description: 'بعد الموافقة على الترقية' },
        conditions: [
            { id: 'c1', field: 'promotionType', operator: 'IS_NOT_NULL', value: true, description: 'ترقية محددة' }
        ],
        actions: [
            { type: 'ADD_PERCENTAGE', value: 15, valueVariable: 'promotionRaisePercentage', unit: '%', description: 'زيادة الترقية' }
        ],
        variables: [
            { name: 'promotionRaisePercentage', nameAr: 'نسبة زيادة الترقية (%)', type: 'PERCENTAGE', defaultValue: 15, min: 10, max: 30, description: 'نسبة الزيادة' }
        ],
        testCases: [
            { id: 'test1', name: 'ترقية لمدير', input: { promotionType: 'MANAGER' }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['علاوة', 'ترقية', 'منصب'],
        difficulty: 'SIMPLE',
        popularity: 95,
        rating: 4.9
    },

    {
        id: 'RAS-COL-001',
        category: 'PAYROLL',
        subcategory: 'COLA',
        industry: ['ALL'],
        nameAr: 'علاوة غلاء المعيشة',
        nameEn: 'Cost of Living Allowance (COLA)',
        descriptionAr: 'علاوة غلاء المعيشة السنوية لجميع الموظفين',
        descriptionEn: 'Annual cost of living allowance for all employees',
        trigger: { event: 'COLA_CYCLE', timing: 'AFTER', description: 'دورة علاوة غلاء المعيشة' },
        conditions: [
            { id: 'c1', field: 'employeeStatus', operator: 'EQUALS', value: 'ACTIVE', description: 'موظف نشط' }
        ],
        actions: [
            { type: 'ADD_PERCENTAGE', value: 3, valueVariable: 'colaPercentage', unit: '%', description: 'علاوة غلاء المعيشة' }
        ],
        variables: [
            { name: 'colaPercentage', nameAr: 'نسبة علاوة غلاء المعيشة (%)', type: 'PERCENTAGE', defaultValue: 3, min: 1, max: 10, description: 'النسبة' }
        ],
        testCases: [
            { id: 'test1', name: 'موظف نشط', input: { employeeStatus: 'ACTIVE' }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['علاوة', 'غلاء معيشة', 'سنوية'],
        difficulty: 'SIMPLE',
        popularity: 90,
        rating: 4.8
    },
];

export const TASKS_POLICIES_COUNT = TASKS_POLICIES.length;
export const CONTRACTS_POLICIES_COUNT = CONTRACTS_POLICIES.length;
export const RAISES_POLICIES_COUNT = RAISES_POLICIES.length;
