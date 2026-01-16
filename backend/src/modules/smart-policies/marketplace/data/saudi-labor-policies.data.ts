import { PolicyTemplate } from '../policy-generator.service';

/**
 * 🇸🇦 سياسات نظام العمل السعودي
 * 
 * سياسات متوافقة مع نظام العمل السعودي تغطي:
 * - الأجور والبدلات
 * - الإجازات بأنواعها
 * - ساعات العمل والراحة
 * - نهاية الخدمة والمكافآت
 * - الجزاءات والمخالفات
 */

export const SAUDI_LABOR_POLICIES: PolicyTemplate[] = [
    // ========================================
    // 💰 المادة 107 - العمل الإضافي
    // ========================================
    {
        id: 'SAL-107-001',
        category: 'COMPLIANCE',
        subcategory: 'OVERTIME_LAW',
        industry: ['ALL'],
        nameAr: 'بدل العمل الإضافي - المادة 107',
        nameEn: 'Overtime Allowance - Article 107',
        descriptionAr: 'احتساب أجر إضافي بنسبة 150% للساعات التي تزيد عن ساعات العمل الفعلية وفق المادة 107',
        descriptionEn: 'Calculate 150% overtime pay for hours exceeding actual working hours as per Article 107',
        legalReference: 'نظام العمل السعودي - المادة 107',
        laborLawArticle: '107',
        trigger: {
            event: 'PAYROLL_CALCULATION',
            timing: 'DURING',
            description: 'أثناء حساب الرواتب'
        },
        conditions: [
            { id: 'c1', field: 'totalOvertimeHours', operator: 'GREATER_THAN', value: 0, description: 'ساعات إضافية موجودة' }
        ],
        actions: [
            {
                type: 'ADD_TO_PAYROLL',
                value: 0,
                unit: 'SAR',
                description: 'بدل الساعات الإضافية',
                formula: '{totalOvertimeHours} * ({basicSalary} / 30 / 8) * 1.5'
            }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: '10 ساعات إضافية', input: { totalOvertimeHours: 10, basicSalary: 6000 }, expectedResult: { shouldTrigger: true, expectedValue: 375 } }
        ],
        tags: ['نظام العمل', 'مادة 107', 'عمل إضافي', 'قانوني'],
        difficulty: 'SIMPLE',
        popularity: 100,
        rating: 5.0
    },

    // ========================================
    // 🏖️ المادة 109 - الإجازة السنوية
    // ========================================
    {
        id: 'SAL-109-001',
        category: 'LEAVES',
        subcategory: 'ANNUAL_LEAVE',
        industry: ['ALL'],
        nameAr: 'رصيد الإجازة السنوية - المادة 109',
        nameEn: 'Annual Leave Balance - Article 109',
        descriptionAr: 'إضافة رصيد إجازة سنوية 21 يوم للسنوات الخمس الأولى، و30 يوم بعدها',
        descriptionEn: 'Add 21 days annual leave for first 5 years, 30 days after',
        legalReference: 'نظام العمل السعودي - المادة 109',
        laborLawArticle: '109',
        trigger: {
            event: 'YEAR_START',
            timing: 'AFTER',
            description: 'بداية السنة'
        },
        conditions: [],
        actions: [
            {
                type: 'UPDATE_RECORD',
                value: 0,
                unit: 'DAYS',
                description: 'تحديث رصيد الإجازة',
                formula: '{yearsOfService} < 5 ? 21 : 30'
            }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'موظف جديد (سنة 2)', input: { yearsOfService: 2 }, expectedResult: { shouldTrigger: true, expectedValue: 21 } },
            { id: 'test2', name: 'موظف قديم (سنة 6)', input: { yearsOfService: 6 }, expectedResult: { shouldTrigger: true, expectedValue: 30 } }
        ],
        tags: ['نظام العمل', 'مادة 109', 'إجازة سنوية', 'قانوني'],
        difficulty: 'SIMPLE',
        popularity: 100,
        rating: 5.0
    },

    // ========================================
    // 🤒 المادة 117 - الإجازة المرضية
    // ========================================
    {
        id: 'SAL-117-001',
        category: 'LEAVES',
        subcategory: 'SICK_LEAVE',
        industry: ['ALL'],
        nameAr: 'الإجازة المرضية - المادة 117',
        nameEn: 'Sick Leave - Article 117',
        descriptionAr: 'حساب الإجازة المرضية: أول 30 يوم بأجر كامل، 60 يوم بثلاثة أرباع الأجر، 30 يوم بدون أجر',
        descriptionEn: 'Sick leave calculation: First 30 days full pay, 60 days 75% pay, 30 days no pay',
        legalReference: 'نظام العمل السعودي - المادة 117',
        laborLawArticle: '117',
        trigger: {
            event: 'SICK_LEAVE_APPROVED',
            timing: 'AFTER',
            description: 'عند الموافقة على إجازة مرضية'
        },
        conditions: [
            { id: 'c1', field: 'hasMedicalReport', operator: 'EQUALS', value: true, description: 'تقرير طبي معتمد' }
        ],
        actions: [
            {
                type: 'SET_VALUE',
                value: 0,
                unit: '%',
                description: 'نسبة الراتب المستحقة',
                formula: '{totalSickDaysThisYear} <= 30 ? 100 : ({totalSickDaysThisYear} <= 90 ? 75 : 0)'
            }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'أول 30 يوم', input: { totalSickDaysThisYear: 15, hasMedicalReport: true }, expectedResult: { shouldTrigger: true, expectedValue: 100 } },
            { id: 'test2', name: 'بعد 30 يوم', input: { totalSickDaysThisYear: 50, hasMedicalReport: true }, expectedResult: { shouldTrigger: true, expectedValue: 75 } }
        ],
        tags: ['نظام العمل', 'مادة 117', 'إجازة مرضية', 'قانوني'],
        difficulty: 'COMPLEX',
        popularity: 98,
        rating: 4.9
    },

    // ========================================
    // 👶 المادة 151 - إجازة الوضع
    // ========================================
    {
        id: 'SAL-151-001',
        category: 'LEAVES',
        subcategory: 'MATERNITY',
        industry: ['ALL'],
        nameAr: 'إجازة الوضع - المادة 151',
        nameEn: 'Maternity Leave - Article 151',
        descriptionAr: 'إجازة وضع 70 يوم بأجر كامل للمرأة العاملة',
        descriptionEn: '70 days maternity leave with full pay for working women',
        legalReference: 'نظام العمل السعودي - المادة 151',
        laborLawArticle: '151',
        trigger: {
            event: 'MATERNITY_LEAVE_APPROVED',
            timing: 'AFTER',
            description: 'عند الموافقة على إجازة الوضع'
        },
        conditions: [
            { id: 'c1', field: 'gender', operator: 'EQUALS', value: 'FEMALE', description: 'موظفة' },
            { id: 'c2', field: 'leaveType', operator: 'EQUALS', value: 'MATERNITY', description: 'إجازة وضع' }
        ],
        actions: [
            {
                type: 'SET_VALUE',
                value: 100,
                unit: '%',
                description: 'أجر كامل لمدة 70 يوم'
            }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'إجازة وضع', input: { gender: 'FEMALE', leaveType: 'MATERNITY' }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['نظام العمل', 'مادة 151', 'إجازة وضع', 'أمومة', 'قانوني'],
        difficulty: 'SIMPLE',
        popularity: 95,
        rating: 5.0
    },

    // ========================================
    // 💍 المادة 113 - إجازة الزواج
    // ========================================
    {
        id: 'SAL-113-001',
        category: 'LEAVES',
        subcategory: 'MARRIAGE',
        industry: ['ALL'],
        nameAr: 'إجازة الزواج - المادة 113',
        nameEn: 'Marriage Leave - Article 113',
        descriptionAr: 'إجازة زواج 5 أيام بأجر كامل',
        descriptionEn: '5 days marriage leave with full pay',
        legalReference: 'نظام العمل السعودي - المادة 113',
        laborLawArticle: '113',
        trigger: {
            event: 'MARRIAGE_LEAVE_APPROVED',
            timing: 'AFTER',
            description: 'عند الموافقة على إجازة الزواج'
        },
        conditions: [
            { id: 'c1', field: 'leaveType', operator: 'EQUALS', value: 'MARRIAGE', description: 'إجازة زواج' }
        ],
        actions: [
            {
                type: 'SET_VALUE',
                value: 100,
                unit: '%',
                description: 'أجر كامل لمدة 5 أيام'
            }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'إجازة زواج', input: { leaveType: 'MARRIAGE' }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['نظام العمل', 'مادة 113', 'إجازة زواج', 'قانوني'],
        difficulty: 'SIMPLE',
        popularity: 92,
        rating: 4.9
    },

    // ========================================
    // ⚰️ المادة 113 - إجازة الوفاة
    // ========================================
    {
        id: 'SAL-113-002',
        category: 'LEAVES',
        subcategory: 'BEREAVEMENT',
        industry: ['ALL'],
        nameAr: 'إجازة الوفاة - المادة 113',
        nameEn: 'Bereavement Leave - Article 113',
        descriptionAr: 'إجازة وفاة 5 أيام بأجر كامل (الزوج/الزوجة أو أحد الأصول أو الفروع)',
        descriptionEn: '5 days bereavement leave with full pay (spouse, parent, or child)',
        legalReference: 'نظام العمل السعودي - المادة 113',
        laborLawArticle: '113',
        trigger: {
            event: 'BEREAVEMENT_LEAVE_APPROVED',
            timing: 'AFTER',
            description: 'عند الموافقة على إجازة الوفاة'
        },
        conditions: [
            { id: 'c1', field: 'leaveType', operator: 'EQUALS', value: 'BEREAVEMENT', description: 'إجازة وفاة' },
            { id: 'c2', field: 'relationshipType', operator: 'IN', value: ['SPOUSE', 'PARENT', 'CHILD', 'SIBLING'], description: 'قريب من الدرجة الأولى' }
        ],
        actions: [
            {
                type: 'SET_VALUE',
                value: 100,
                unit: '%',
                description: 'أجر كامل لمدة 5 أيام'
            }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'وفاة والد', input: { leaveType: 'BEREAVEMENT', relationshipType: 'PARENT' }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['نظام العمل', 'مادة 113', 'إجازة وفاة', 'قانوني'],
        difficulty: 'SIMPLE',
        popularity: 90,
        rating: 4.9
    },

    // ========================================
    // 🎖️ المادة 84 - مكافأة نهاية الخدمة
    // ========================================
    {
        id: 'SAL-84-001',
        category: 'COMPLIANCE',
        subcategory: 'END_OF_SERVICE',
        industry: ['ALL'],
        nameAr: 'مكافأة نهاية الخدمة - المادة 84',
        nameEn: 'End of Service Award - Article 84',
        descriptionAr: 'حساب مكافأة نهاية الخدمة: نصف شهر لكل سنة من الخمس الأولى، شهر لكل سنة بعدها',
        descriptionEn: 'End of service calculation: Half month for first 5 years, full month for years after',
        legalReference: 'نظام العمل السعودي - المادة 84',
        laborLawArticle: '84',
        trigger: {
            event: 'EMPLOYMENT_TERMINATED',
            timing: 'AFTER',
            description: 'عند انتهاء الخدمة'
        },
        conditions: [
            { id: 'c1', field: 'yearsOfService', operator: 'GREATER_THAN_OR_EQUALS', value: 2, description: 'خدمة سنتين على الأقل' },
            { id: 'c2', field: 'terminationType', operator: 'NOT_EQUALS', value: 'DISMISSAL_80', description: 'ليس فصل بسبب المادة 80' }
        ],
        actions: [
            {
                type: 'ADD_TO_PAYROLL',
                value: 0,
                unit: 'SAR',
                description: 'مكافأة نهاية الخدمة',
                formula: '(Math.min({yearsOfService}, 5) * {lastSalary} / 2) + (Math.max(0, {yearsOfService} - 5) * {lastSalary})'
            }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: '3 سنوات خدمة', input: { yearsOfService: 3, lastSalary: 10000, terminationType: 'RESIGNATION' }, expectedResult: { shouldTrigger: true, expectedValue: 15000 } },
            { id: 'test2', name: '8 سنوات خدمة', input: { yearsOfService: 8, lastSalary: 10000, terminationType: 'RESIGNATION' }, expectedResult: { shouldTrigger: true, expectedValue: 55000 } }
        ],
        tags: ['نظام العمل', 'مادة 84', 'نهاية خدمة', 'مكافأة', 'قانوني'],
        difficulty: 'COMPLEX',
        popularity: 100,
        rating: 5.0
    },

    // ========================================
    // ⚠️ المادة 80 - الجزاءات والمخالفات
    // ========================================
    {
        id: 'SAL-80-001',
        category: 'COMPLIANCE',
        subcategory: 'VIOLATIONS',
        industry: ['ALL'],
        nameAr: 'إنذار كتابي - المادة 66',
        nameEn: 'Written Warning - Article 66',
        descriptionAr: 'إصدار إنذار كتابي للمخالفة الأولى قبل اتخاذ إجراء تأديبي',
        descriptionEn: 'Issue written warning for first violation before disciplinary action',
        legalReference: 'نظام العمل السعودي - المادة 66',
        laborLawArticle: '66',
        trigger: {
            event: 'VIOLATION_RECORDED',
            timing: 'AFTER',
            description: 'عند تسجيل مخالفة'
        },
        conditions: [
            { id: 'c1', field: 'violationCount', operator: 'EQUALS', value: 1, description: 'المخالفة الأولى' }
        ],
        actions: [
            {
                type: 'SEND_NOTIFICATION',
                value: 'إنذار كتابي بسبب المخالفة',
                description: 'إرسال إنذار'
            }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'مخالفة أولى', input: { violationCount: 1 }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['نظام العمل', 'مادة 66', 'إنذار', 'جزاء', 'قانوني'],
        difficulty: 'SIMPLE',
        popularity: 95,
        rating: 4.8
    },

    {
        id: 'SAL-80-002',
        category: 'COMPLIANCE',
        subcategory: 'VIOLATIONS',
        industry: ['ALL'],
        nameAr: 'خصم يوم - المادة 66',
        nameEn: 'One Day Deduction - Article 66',
        descriptionAr: 'خصم يوم واحد للمخالفة الثانية خلال السنة',
        descriptionEn: 'One day deduction for second violation within the year',
        legalReference: 'نظام العمل السعودي - المادة 66',
        laborLawArticle: '66',
        trigger: {
            event: 'VIOLATION_RECORDED',
            timing: 'AFTER',
            description: 'عند تسجيل مخالفة'
        },
        conditions: [
            { id: 'c1', field: 'violationCount', operator: 'EQUALS', value: 2, description: 'المخالفة الثانية' }
        ],
        actions: [
            {
                type: 'DEDUCT_PERCENTAGE',
                value: 100,
                unit: '%',
                description: 'خصم يوم واحد'
            }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'مخالفة ثانية', input: { violationCount: 2 }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['نظام العمل', 'مادة 66', 'خصم', 'جزاء', 'قانوني'],
        difficulty: 'SIMPLE',
        popularity: 93,
        rating: 4.7
    },

    // ========================================
    // 🕌 المادة 112 - إجازة الحج
    // ========================================
    {
        id: 'SAL-112-001',
        category: 'LEAVES',
        subcategory: 'HAJJ',
        industry: ['ALL'],
        nameAr: 'إجازة الحج - المادة 112',
        nameEn: 'Hajj Leave - Article 112',
        descriptionAr: 'إجازة حج 10-15 يوم بأجر كامل لأداء فريضة الحج (مرة واحدة خلال الخدمة)',
        descriptionEn: '10-15 days Hajj leave with full pay for performing Hajj (once during service)',
        legalReference: 'نظام العمل السعودي - المادة 112',
        laborLawArticle: '112',
        trigger: {
            event: 'HAJJ_LEAVE_APPROVED',
            timing: 'AFTER',
            description: 'عند الموافقة على إجازة الحج'
        },
        conditions: [
            { id: 'c1', field: 'yearsOfService', operator: 'GREATER_THAN_OR_EQUALS', value: 2, description: 'سنتان خدمة على الأقل' },
            { id: 'c2', field: 'hajjLeaveTaken', operator: 'EQUALS', value: false, description: 'لم يأخذ إجازة حج سابقاً' }
        ],
        actions: [
            {
                type: 'SET_VALUE',
                value: 100,
                unit: '%',
                description: 'أجر كامل لمدة 10-15 يوم'
            }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'إجازة حج أولى', input: { yearsOfService: 3, hajjLeaveTaken: false }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['نظام العمل', 'مادة 112', 'إجازة حج', 'قانوني'],
        difficulty: 'SIMPLE',
        popularity: 88,
        rating: 4.9
    },

    // ========================================
    // ⏰ المادة 98 - ساعات العمل
    // ========================================
    {
        id: 'SAL-98-001',
        category: 'COMPLIANCE',
        subcategory: 'WORKING_HOURS',
        industry: ['ALL'],
        nameAr: 'تنبيه تجاوز ساعات العمل - المادة 98',
        nameEn: 'Working Hours Exceed Alert - Article 98',
        descriptionAr: 'تنبيه عند تجاوز 8 ساعات عمل يومياً أو 48 ساعة أسبوعياً',
        descriptionEn: 'Alert when exceeding 8 hours daily or 48 hours weekly',
        legalReference: 'نظام العمل السعودي - المادة 98',
        laborLawArticle: '98',
        trigger: {
            event: 'ATTENDANCE_CHECK_OUT',
            timing: 'AFTER',
            description: 'عند تسجيل الانصراف'
        },
        conditions: [
            { id: 'c1', field: 'dailyHours', operator: 'GREATER_THAN', value: 8, description: 'تجاوز 8 ساعات يومياً' }
        ],
        actions: [
            {
                type: 'SEND_NOTIFICATION',
                value: 'تنبيه: تجاوز ساعات العمل القانونية',
                description: 'إرسال تنبيه للإدارة'
            }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: '10 ساعات عمل', input: { dailyHours: 10 }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['نظام العمل', 'مادة 98', 'ساعات عمل', 'قانوني'],
        difficulty: 'SIMPLE',
        popularity: 85,
        rating: 4.6
    },

    // ========================================
    // 🌙 المادة 99 - ساعات رمضان
    // ========================================
    {
        id: 'SAL-99-001',
        category: 'COMPLIANCE',
        subcategory: 'RAMADAN',
        industry: ['ALL'],
        nameAr: 'تخفيض ساعات رمضان - المادة 99',
        nameEn: 'Ramadan Hours Reduction - Article 99',
        descriptionAr: 'تخفيض ساعات العمل للمسلمين في رمضان إلى 6 ساعات يومياً (36 أسبوعياً)',
        descriptionEn: 'Reduce working hours for Muslims in Ramadan to 6 hours daily (36 weekly)',
        legalReference: 'نظام العمل السعودي - المادة 99',
        laborLawArticle: '99',
        trigger: {
            event: 'RAMADAN_START',
            timing: 'AFTER',
            description: 'بداية رمضان'
        },
        conditions: [
            { id: 'c1', field: 'religion', operator: 'EQUALS', value: 'MUSLIM', description: 'موظف مسلم' }
        ],
        actions: [
            {
                type: 'UPDATE_RECORD',
                value: 6,
                unit: 'HOURS',
                description: 'تحديث ساعات العمل اليومية'
            }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'موظف مسلم', input: { religion: 'MUSLIM' }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['نظام العمل', 'مادة 99', 'رمضان', 'قانوني'],
        difficulty: 'SIMPLE',
        popularity: 90,
        rating: 4.8
    },

    // ========================================
    // 🏥 المادة 137 - السلامة المهنية
    // ========================================
    {
        id: 'SAL-137-001',
        category: 'SAFETY',
        subcategory: 'OCCUPATIONAL',
        industry: ['ALL'],
        nameAr: 'تعويض إصابة العمل - المادة 137',
        nameEn: 'Work Injury Compensation - Article 137',
        descriptionAr: 'تعويض الموظف عن إصابات العمل وفق نظام التأمينات الاجتماعية',
        descriptionEn: 'Compensate employee for work injuries according to social insurance system',
        legalReference: 'نظام العمل السعودي - المادة 137',
        laborLawArticle: '137',
        trigger: {
            event: 'WORK_INJURY_REPORTED',
            timing: 'AFTER',
            description: 'عند الإبلاغ عن إصابة عمل'
        },
        conditions: [
            { id: 'c1', field: 'injuryType', operator: 'EQUALS', value: 'WORK_RELATED', description: 'إصابة متعلقة بالعمل' },
            { id: 'c2', field: 'hasGOSI', operator: 'EQUALS', value: true, description: 'مسجل في التأمينات' }
        ],
        actions: [
            {
                type: 'SET_VALUE',
                value: 100,
                unit: '%',
                description: 'أجر كامل أثناء العلاج'
            },
            {
                type: 'CREATE_TASK',
                value: 'إبلاغ التأمينات الاجتماعية',
                description: 'مهمة للموارد البشرية'
            }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'إصابة عمل', input: { injuryType: 'WORK_RELATED', hasGOSI: true }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['نظام العمل', 'مادة 137', 'إصابة عمل', 'تعويض', 'قانوني'],
        difficulty: 'MEDIUM',
        popularity: 92,
        rating: 4.8
    },
];

// إحصائيات
export const SAUDI_LABOR_POLICIES_COUNT = SAUDI_LABOR_POLICIES.length;
export const getSaudiLaborPoliciesByArticle = (article: string) => 
    SAUDI_LABOR_POLICIES.filter(p => p.laborLawArticle === article);
