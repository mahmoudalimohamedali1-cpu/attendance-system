import { PolicyTemplate } from '../policy-generator.service';

/**
 * 🏖️ سياسات الإجازات
 * 
 * تغطي:
 * - الإجازة السنوية
 * - الإجازة المرضية
 * - إجازات المناسبات
 * - العمل من المنزل
 * - الإجازات بدون راتب
 */

export const LEAVES_POLICIES: PolicyTemplate[] = [
    // ========================================
    // 📅 الإجازة السنوية
    // ========================================
    {
        id: 'LV-ANN-001',
        category: 'LEAVES',
        subcategory: 'ANNUAL',
        industry: ['ALL'],
        nameAr: 'استحقاق الإجازة السنوية',
        nameEn: 'Annual Leave Entitlement',
        descriptionAr: 'إضافة رصيد الإجازة السنوية بداية كل عام (21 يوم للسنوات الـ5 الأولى، 30 يوم بعدها)',
        descriptionEn: 'Add annual leave balance at start of year (21 days for first 5 years, 30 after)',
        legalReference: 'نظام العمل السعودي - المادة 109',
        laborLawArticle: '109',
        trigger: { event: 'YEAR_START', timing: 'AFTER', description: 'بداية السنة' },
        conditions: [
            { id: 'c1', field: 'employeeStatus', operator: 'EQUALS', value: 'ACTIVE', description: 'موظف نشط' }
        ],
        actions: [
            { type: 'UPDATE_RECORD', value: 0, unit: 'DAYS', description: 'رصيد الإجازة السنوية', formula: '{yearsOfService} < 5 ? 21 : 30' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'موظف جديد', input: { yearsOfService: 2, employeeStatus: 'ACTIVE' }, expectedResult: { shouldTrigger: true, expectedValue: 21 } },
            { id: 'test2', name: 'موظف قديم', input: { yearsOfService: 6, employeeStatus: 'ACTIVE' }, expectedResult: { shouldTrigger: true, expectedValue: 30 } }
        ],
        tags: ['إجازة', 'سنوية', 'رصيد'],
        difficulty: 'SIMPLE',
        popularity: 100,
        rating: 5.0
    },

    {
        id: 'LV-ANN-002',
        category: 'LEAVES',
        subcategory: 'ANNUAL',
        industry: ['ALL'],
        nameAr: 'ترحيل الإجازة السنوية',
        nameEn: 'Annual Leave Carryover',
        descriptionAr: 'ترحيل رصيد الإجازة المتبقي للسنة التالية (بحد أقصى)',
        descriptionEn: 'Carryover remaining leave balance to next year (with limit)',
        trigger: { event: 'YEAR_END', timing: 'AFTER', description: 'نهاية السنة' },
        conditions: [
            { id: 'c1', field: 'remainingLeaveBalance', operator: 'GREATER_THAN', value: 0, description: 'رصيد متبقي' }
        ],
        actions: [
            { type: 'UPDATE_RECORD', value: 0, unit: 'DAYS', description: 'الرصيد المرحل', formula: 'Math.min({remainingLeaveBalance}, {maxCarryover})' }
        ],
        variables: [
            { name: 'maxCarryover', nameAr: 'الحد الأقصى للترحيل (يوم)', type: 'NUMBER', defaultValue: 15, min: 0, max: 30, description: 'أقصى رصيد يمكن ترحيله' }
        ],
        testCases: [
            { id: 'test1', name: 'رصيد 10 أيام', input: { remainingLeaveBalance: 10 }, expectedResult: { shouldTrigger: true, expectedValue: 10 } },
            { id: 'test2', name: 'رصيد 20 يوم', input: { remainingLeaveBalance: 20 }, expectedResult: { shouldTrigger: true, expectedValue: 15 } }
        ],
        tags: ['إجازة', 'سنوية', 'ترحيل'],
        difficulty: 'SIMPLE',
        popularity: 90,
        rating: 4.8
    },

    {
        id: 'LV-ANN-003',
        category: 'LEAVES',
        subcategory: 'ANNUAL',
        industry: ['ALL'],
        nameAr: 'صرف بدل الإجازة',
        nameEn: 'Leave Balance Cash Out',
        descriptionAr: 'صرف بدل نقدي عن رصيد الإجازة غير المستخدم عند انتهاء الخدمة',
        descriptionEn: 'Pay cash for unused leave balance upon service end',
        legalReference: 'نظام العمل السعودي - المادة 111',
        laborLawArticle: '111',
        trigger: { event: 'EMPLOYMENT_TERMINATED', timing: 'AFTER', description: 'انتهاء الخدمة' },
        conditions: [
            { id: 'c1', field: 'remainingLeaveBalance', operator: 'GREATER_THAN', value: 0, description: 'رصيد متبقي' }
        ],
        actions: [
            { type: 'ADD_TO_PAYROLL', value: 0, unit: 'SAR', description: 'بدل الإجازة', formula: '{remainingLeaveBalance} * ({totalSalary} / 30)' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: '15 يوم متبقي', input: { remainingLeaveBalance: 15, totalSalary: 9000 }, expectedResult: { shouldTrigger: true, expectedValue: 4500 } }
        ],
        tags: ['إجازة', 'بدل', 'نهاية خدمة'],
        difficulty: 'SIMPLE',
        popularity: 95,
        rating: 4.9
    },

    // ========================================
    // 🏥 الإجازة المرضية
    // ========================================
    {
        id: 'LV-SICK-001',
        category: 'LEAVES',
        subcategory: 'SICK',
        industry: ['ALL'],
        nameAr: 'الإجازة المرضية بأجر كامل (أول 30 يوم)',
        nameEn: 'Sick Leave Full Pay (First 30 Days)',
        descriptionAr: 'أجر كامل لأول 30 يوم من الإجازة المرضية في السنة',
        descriptionEn: 'Full pay for first 30 days of sick leave per year',
        legalReference: 'نظام العمل السعودي - المادة 117',
        laborLawArticle: '117',
        trigger: { event: 'SICK_LEAVE_APPROVED', timing: 'AFTER', description: 'موافقة على إجازة مرضية' },
        conditions: [
            { id: 'c1', field: 'totalSickDaysThisYear', operator: 'LESS_THAN_OR_EQUALS', value: 30, description: 'ضمن أول 30 يوم' },
            { id: 'c2', field: 'hasMedicalReport', operator: 'EQUALS', value: true, description: 'تقرير طبي معتمد' }
        ],
        actions: [
            { type: 'SET_VALUE', value: 100, unit: '%', description: 'أجر كامل' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'يوم 15 مرضي', input: { totalSickDaysThisYear: 15, hasMedicalReport: true }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['إجازة', 'مرضية', 'أجر كامل'],
        difficulty: 'SIMPLE',
        popularity: 100,
        rating: 5.0
    },

    {
        id: 'LV-SICK-002',
        category: 'LEAVES',
        subcategory: 'SICK',
        industry: ['ALL'],
        nameAr: 'الإجازة المرضية بثلاثة أرباع الأجر (31-90 يوم)',
        nameEn: 'Sick Leave 75% Pay (Days 31-90)',
        descriptionAr: '75% من الأجر للإجازة المرضية من اليوم 31 إلى 90',
        descriptionEn: '75% pay for sick leave from day 31 to 90',
        legalReference: 'نظام العمل السعودي - المادة 117',
        laborLawArticle: '117',
        trigger: { event: 'SICK_LEAVE_APPROVED', timing: 'AFTER', description: 'موافقة على إجازة مرضية' },
        conditions: [
            { id: 'c1', field: 'totalSickDaysThisYear', operator: 'GREATER_THAN', value: 30, description: 'بعد 30 يوم' },
            { id: 'c2', field: 'totalSickDaysThisYear', operator: 'LESS_THAN_OR_EQUALS', value: 90, description: 'ضمن 90 يوم' },
            { id: 'c3', field: 'hasMedicalReport', operator: 'EQUALS', value: true, description: 'تقرير طبي' }
        ],
        actions: [
            { type: 'SET_VALUE', value: 75, unit: '%', description: 'ثلاثة أرباع الأجر' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'يوم 50 مرضي', input: { totalSickDaysThisYear: 50, hasMedicalReport: true }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['إجازة', 'مرضية', '75%'],
        difficulty: 'MEDIUM',
        popularity: 95,
        rating: 4.9
    },

    {
        id: 'LV-SICK-003',
        category: 'LEAVES',
        subcategory: 'SICK',
        industry: ['ALL'],
        nameAr: 'الإجازة المرضية بدون أجر (91-120 يوم)',
        nameEn: 'Sick Leave No Pay (Days 91-120)',
        descriptionAr: 'بدون أجر للإجازة المرضية من اليوم 91 إلى 120',
        descriptionEn: 'No pay for sick leave from day 91 to 120',
        legalReference: 'نظام العمل السعودي - المادة 117',
        laborLawArticle: '117',
        trigger: { event: 'SICK_LEAVE_APPROVED', timing: 'AFTER', description: 'موافقة على إجازة مرضية' },
        conditions: [
            { id: 'c1', field: 'totalSickDaysThisYear', operator: 'GREATER_THAN', value: 90, description: 'بعد 90 يوم' },
            { id: 'c2', field: 'totalSickDaysThisYear', operator: 'LESS_THAN_OR_EQUALS', value: 120, description: 'ضمن 120 يوم' }
        ],
        actions: [
            { type: 'SET_VALUE', value: 0, unit: '%', description: 'بدون أجر' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'يوم 100 مرضي', input: { totalSickDaysThisYear: 100 }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['إجازة', 'مرضية', 'بدون أجر'],
        difficulty: 'SIMPLE',
        popularity: 90,
        rating: 4.8
    },

    // ========================================
    // 🎉 إجازات المناسبات
    // ========================================
    {
        id: 'LV-OCC-001',
        category: 'LEAVES',
        subcategory: 'MARRIAGE',
        industry: ['ALL'],
        nameAr: 'إجازة الزواج',
        nameEn: 'Marriage Leave',
        descriptionAr: 'إجازة 5 أيام بأجر كامل بمناسبة الزواج',
        descriptionEn: '5 days paid leave for marriage',
        legalReference: 'نظام العمل السعودي - المادة 113',
        laborLawArticle: '113',
        trigger: { event: 'MARRIAGE_LEAVE_REQUESTED', timing: 'AFTER', description: 'طلب إجازة زواج' },
        conditions: [
            { id: 'c1', field: 'leaveType', operator: 'EQUALS', value: 'MARRIAGE', description: 'إجازة زواج' }
        ],
        actions: [
            { type: 'SET_VALUE', value: 5, unit: 'DAYS', description: '5 أيام إجازة' },
            { type: 'SET_VALUE', value: 100, unit: '%', description: 'أجر كامل' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'طلب إجازة زواج', input: { leaveType: 'MARRIAGE' }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['إجازة', 'زواج', 'مناسبة'],
        difficulty: 'SIMPLE',
        popularity: 95,
        rating: 5.0
    },

    {
        id: 'LV-OCC-002',
        category: 'LEAVES',
        subcategory: 'BEREAVEMENT',
        industry: ['ALL'],
        nameAr: 'إجازة الوفاة',
        nameEn: 'Bereavement Leave',
        descriptionAr: 'إجازة 5 أيام بأجر كامل لوفاة قريب من الدرجة الأولى',
        descriptionEn: '5 days paid leave for death of first-degree relative',
        legalReference: 'نظام العمل السعودي - المادة 113',
        laborLawArticle: '113',
        trigger: { event: 'BEREAVEMENT_LEAVE_REQUESTED', timing: 'AFTER', description: 'طلب إجازة وفاة' },
        conditions: [
            { id: 'c1', field: 'leaveType', operator: 'EQUALS', value: 'BEREAVEMENT', description: 'إجازة وفاة' },
            { id: 'c2', field: 'relationshipDegree', operator: 'EQUALS', value: 'FIRST', description: 'قريب درجة أولى' }
        ],
        actions: [
            { type: 'SET_VALUE', value: 5, unit: 'DAYS', description: '5 أيام إجازة' },
            { type: 'SET_VALUE', value: 100, unit: '%', description: 'أجر كامل' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'وفاة والد', input: { leaveType: 'BEREAVEMENT', relationshipDegree: 'FIRST' }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['إجازة', 'وفاة', 'مناسبة'],
        difficulty: 'SIMPLE',
        popularity: 93,
        rating: 4.9
    },

    {
        id: 'LV-OCC-003',
        category: 'LEAVES',
        subcategory: 'PATERNITY',
        industry: ['ALL'],
        nameAr: 'إجازة الأبوة',
        nameEn: 'Paternity Leave',
        descriptionAr: 'إجازة 3 أيام للأب بمناسبة المولود الجديد',
        descriptionEn: '3 days leave for father on birth of child',
        trigger: { event: 'PATERNITY_LEAVE_REQUESTED', timing: 'AFTER', description: 'طلب إجازة أبوة' },
        conditions: [
            { id: 'c1', field: 'leaveType', operator: 'EQUALS', value: 'PATERNITY', description: 'إجازة أبوة' },
            { id: 'c2', field: 'gender', operator: 'EQUALS', value: 'MALE', description: 'موظف ذكر' }
        ],
        actions: [
            { type: 'SET_VALUE', value: 3, unit: 'DAYS', description: '3 أيام إجازة' },
            { type: 'SET_VALUE', value: 100, unit: '%', description: 'أجر كامل' }
        ],
        variables: [
            { name: 'paternityDays', nameAr: 'أيام إجازة الأبوة', type: 'NUMBER', defaultValue: 3, min: 1, max: 5, description: 'عدد أيام الإجازة' }
        ],
        testCases: [
            { id: 'test1', name: 'مولود جديد', input: { leaveType: 'PATERNITY', gender: 'MALE' }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['إجازة', 'أبوة', 'مولود'],
        difficulty: 'SIMPLE',
        popularity: 88,
        rating: 4.7
    },

    {
        id: 'LV-OCC-004',
        category: 'LEAVES',
        subcategory: 'MATERNITY',
        industry: ['ALL'],
        nameAr: 'إجازة الأمومة',
        nameEn: 'Maternity Leave',
        descriptionAr: 'إجازة 70 يوم بأجر كامل للأم بمناسبة الوضع',
        descriptionEn: '70 days maternity leave with full pay',
        legalReference: 'نظام العمل السعودي - المادة 151',
        laborLawArticle: '151',
        trigger: { event: 'MATERNITY_LEAVE_REQUESTED', timing: 'AFTER', description: 'طلب إجازة أمومة' },
        conditions: [
            { id: 'c1', field: 'leaveType', operator: 'EQUALS', value: 'MATERNITY', description: 'إجازة أمومة' },
            { id: 'c2', field: 'gender', operator: 'EQUALS', value: 'FEMALE', description: 'موظفة' }
        ],
        actions: [
            { type: 'SET_VALUE', value: 70, unit: 'DAYS', description: '70 يوم إجازة' },
            { type: 'SET_VALUE', value: 100, unit: '%', description: 'أجر كامل' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'إجازة أمومة', input: { leaveType: 'MATERNITY', gender: 'FEMALE' }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['إجازة', 'أمومة', 'وضع'],
        difficulty: 'SIMPLE',
        popularity: 98,
        rating: 5.0
    },

    {
        id: 'LV-OCC-005',
        category: 'LEAVES',
        subcategory: 'HAJJ',
        industry: ['ALL'],
        nameAr: 'إجازة الحج',
        nameEn: 'Hajj Leave',
        descriptionAr: 'إجازة 10-15 يوم بأجر كامل لأداء فريضة الحج (مرة واحدة)',
        descriptionEn: '10-15 days paid leave for Hajj (once during service)',
        legalReference: 'نظام العمل السعودي - المادة 112',
        laborLawArticle: '112',
        trigger: { event: 'HAJJ_LEAVE_REQUESTED', timing: 'AFTER', description: 'طلب إجازة حج' },
        conditions: [
            { id: 'c1', field: 'yearsOfService', operator: 'GREATER_THAN_OR_EQUALS', value: 2, description: 'سنتان خدمة' },
            { id: 'c2', field: 'hajjLeaveTaken', operator: 'EQUALS', value: false, description: 'لم يأخذ إجازة حج سابقاً' }
        ],
        actions: [
            { type: 'SET_VALUE', value: 15, unit: 'DAYS', description: '15 يوم إجازة' },
            { type: 'SET_VALUE', value: 100, unit: '%', description: 'أجر كامل' }
        ],
        variables: [
            { name: 'hajjDays', nameAr: 'أيام إجازة الحج', type: 'NUMBER', defaultValue: 15, min: 10, max: 15, description: 'عدد أيام الإجازة' }
        ],
        testCases: [
            { id: 'test1', name: 'أول إجازة حج', input: { yearsOfService: 3, hajjLeaveTaken: false }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['إجازة', 'حج', 'دينية'],
        difficulty: 'SIMPLE',
        popularity: 92,
        rating: 4.9
    },

    // ========================================
    // 🏠 العمل من المنزل
    // ========================================
    {
        id: 'LV-WFH-001',
        category: 'LEAVES',
        subcategory: 'WORK_FROM_HOME',
        industry: ['ALL'],
        nameAr: 'حد العمل من المنزل الشهري',
        nameEn: 'Monthly WFH Limit',
        descriptionAr: 'تحديد عدد أيام العمل من المنزل المسموحة شهرياً',
        descriptionEn: 'Set maximum allowed work from home days per month',
        trigger: { event: 'WFH_REQUESTED', timing: 'BEFORE', description: 'قبل طلب العمل من المنزل' },
        conditions: [
            { id: 'c1', field: 'monthlyWfhCount', operator: 'LESS_THAN', value: 4, valueVariable: 'maxWfhDays', description: 'ضمن الحد المسموح' },
            { id: 'c2', field: 'jobAllowsWfh', operator: 'EQUALS', value: true, description: 'الوظيفة تسمح بالعمل عن بعد' }
        ],
        actions: [
            { type: 'SET_VALUE', value: 'APPROVED', description: 'موافقة تلقائية' }
        ],
        variables: [
            { name: 'maxWfhDays', nameAr: 'الحد الأقصى للعمل من المنزل (يوم/شهر)', type: 'NUMBER', defaultValue: 4, min: 0, max: 20, description: 'أيام مسموحة شهرياً' }
        ],
        testCases: [
            { id: 'test1', name: 'ضمن الحد', input: { monthlyWfhCount: 2, jobAllowsWfh: true }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['عمل من المنزل', 'WFH', 'عن بعد'],
        difficulty: 'SIMPLE',
        popularity: 85,
        rating: 4.6
    },

    // ========================================
    // 📝 إجازات خاصة
    // ========================================
    {
        id: 'LV-SPEC-001',
        category: 'LEAVES',
        subcategory: 'UNPAID',
        industry: ['ALL'],
        nameAr: 'إجازة بدون راتب',
        nameEn: 'Unpaid Leave',
        descriptionAr: 'إجازة بدون راتب بموافقة الإدارة',
        descriptionEn: 'Unpaid leave with management approval',
        trigger: { event: 'UNPAID_LEAVE_APPROVED', timing: 'AFTER', description: 'موافقة على إجازة بدون راتب' },
        conditions: [
            { id: 'c1', field: 'leaveType', operator: 'EQUALS', value: 'UNPAID', description: 'إجازة بدون راتب' },
            { id: 'c2', field: 'hasApproval', operator: 'EQUALS', value: true, description: 'موافقة الإدارة' }
        ],
        actions: [
            { type: 'SET_VALUE', value: 0, unit: '%', description: 'بدون أجر' },
            { type: 'UPDATE_RECORD', value: 'SUSPENDED', description: 'تعليق التأمينات' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'إجازة بدون راتب', input: { leaveType: 'UNPAID', hasApproval: true }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['إجازة', 'بدون راتب', 'استثنائية'],
        difficulty: 'SIMPLE',
        popularity: 80,
        rating: 4.5
    },

    {
        id: 'LV-SPEC-002',
        category: 'LEAVES',
        subcategory: 'STUDY',
        industry: ['ALL'],
        nameAr: 'إجازة الدراسة',
        nameEn: 'Study Leave',
        descriptionAr: 'إجازة للموظف لأداء الاختبارات أو الدراسة',
        descriptionEn: 'Leave for employee to attend exams or study',
        trigger: { event: 'STUDY_LEAVE_REQUESTED', timing: 'AFTER', description: 'طلب إجازة دراسية' },
        conditions: [
            { id: 'c1', field: 'leaveType', operator: 'EQUALS', value: 'STUDY', description: 'إجازة دراسية' },
            { id: 'c2', field: 'hasExamSchedule', operator: 'EQUALS', value: true, description: 'جدول اختبارات' }
        ],
        actions: [
            { type: 'SET_VALUE', value: 100, unit: '%', description: 'أجر كامل' }
        ],
        variables: [
            { name: 'maxStudyDays', nameAr: 'الحد الأقصى لإجازة الدراسة (يوم)', type: 'NUMBER', defaultValue: 15, min: 5, max: 30, description: 'أيام مسموحة' }
        ],
        testCases: [
            { id: 'test1', name: 'إجازة اختبارات', input: { leaveType: 'STUDY', hasExamSchedule: true }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['إجازة', 'دراسة', 'اختبارات'],
        difficulty: 'SIMPLE',
        popularity: 75,
        rating: 4.4
    },
];

export const LEAVES_POLICIES_COUNT = LEAVES_POLICIES.length;
