import { PolicyTemplate } from '../policy-generator.service';

/**
 * ⚠️ سياسات التأديب والجزاءات
 */

export const DISCIPLINARY_POLICIES: PolicyTemplate[] = [
    // ========================================
    // 📝 الإنذارات
    // ========================================
    {
        id: 'DIS-WRN-001',
        category: 'COMPLIANCE',
        subcategory: 'WARNING',
        industry: ['ALL'],
        nameAr: 'إنذار شفهي - المخالفة الأولى',
        nameEn: 'Verbal Warning - First Offense',
        descriptionAr: 'إنذار شفهي للمخالفة الأولى مع التوثيق',
        descriptionEn: 'Verbal warning for first offense with documentation',
        legalReference: 'نظام العمل السعودي - المادة 66',
        laborLawArticle: '66',
        trigger: { event: 'VIOLATION_RECORDED', timing: 'AFTER', description: 'بعد تسجيل مخالفة' },
        conditions: [
            { id: 'c1', field: 'violationCountThisYear', operator: 'EQUALS', value: 1, description: 'المخالفة الأولى' },
            { id: 'c2', field: 'violationSeverity', operator: 'EQUALS', value: 'MINOR', description: 'مخالفة بسيطة' }
        ],
        actions: [
            { type: 'SEND_NOTIFICATION', value: 'إنذار شفهي بسبب مخالفة', description: 'إشعار للموظف' },
            { type: 'CREATE_TASK', value: 'توثيق الإنذار الشفهي', description: 'مهمة للـ HR' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'مخالفة أولى بسيطة', input: { violationCountThisYear: 1, violationSeverity: 'MINOR' }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['تأديب', 'إنذار', 'شفهي'],
        difficulty: 'SIMPLE',
        popularity: 95,
        rating: 4.9
    },

    {
        id: 'DIS-WRN-002',
        category: 'COMPLIANCE',
        subcategory: 'WARNING',
        industry: ['ALL'],
        nameAr: 'إنذار كتابي أول',
        nameEn: 'First Written Warning',
        descriptionAr: 'إنذار كتابي رسمي للمخالفة الثانية',
        descriptionEn: 'Official written warning for second offense',
        legalReference: 'نظام العمل السعودي - المادة 66',
        laborLawArticle: '66',
        trigger: { event: 'VIOLATION_RECORDED', timing: 'AFTER', description: 'بعد تسجيل مخالفة' },
        conditions: [
            { id: 'c1', field: 'violationCountThisYear', operator: 'EQUALS', value: 2, description: 'المخالفة الثانية' }
        ],
        actions: [
            { type: 'SEND_NOTIFICATION', value: 'إنذار كتابي أول', description: 'إشعار رسمي' },
            { type: 'CREATE_TASK', value: 'إعداد وتوقيع الإنذار الكتابي', description: 'مهمة للـ HR' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'مخالفة ثانية', input: { violationCountThisYear: 2 }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['تأديب', 'إنذار', 'كتابي'],
        difficulty: 'SIMPLE',
        popularity: 93,
        rating: 4.8
    },

    {
        id: 'DIS-WRN-003',
        category: 'COMPLIANCE',
        subcategory: 'WARNING',
        industry: ['ALL'],
        nameAr: 'إنذار كتابي نهائي',
        nameEn: 'Final Written Warning',
        descriptionAr: 'إنذار كتابي نهائي قبل الفصل',
        descriptionEn: 'Final written warning before termination',
        legalReference: 'نظام العمل السعودي - المادة 66',
        laborLawArticle: '66',
        trigger: { event: 'VIOLATION_RECORDED', timing: 'AFTER', description: 'بعد تسجيل مخالفة' },
        conditions: [
            { id: 'c1', field: 'violationCountThisYear', operator: 'EQUALS', value: 3, description: 'المخالفة الثالثة' }
        ],
        actions: [
            { type: 'SEND_NOTIFICATION', value: 'إنذار كتابي نهائي - المخالفة القادمة قد تؤدي للفصل', description: 'إشعار خطير' },
            { type: 'CREATE_TASK', value: 'اجتماع تأديبي مع الموظف', description: 'مهمة للمدير' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'مخالفة ثالثة', input: { violationCountThisYear: 3 }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['تأديب', 'إنذار', 'نهائي'],
        difficulty: 'SIMPLE',
        popularity: 90,
        rating: 4.7
    },

    // ========================================
    // 💸 الخصومات التأديبية
    // ========================================
    {
        id: 'DIS-DED-001',
        category: 'DEDUCTIONS',
        subcategory: 'DISCIPLINARY',
        industry: ['ALL'],
        nameAr: 'خصم يوم - مخالفة متوسطة',
        nameEn: 'One Day Deduction - Medium Offense',
        descriptionAr: 'خصم يوم واحد من الراتب للمخالفة المتوسطة',
        descriptionEn: 'One day salary deduction for medium offense',
        legalReference: 'نظام العمل السعودي - المادة 66',
        laborLawArticle: '66',
        trigger: { event: 'DISCIPLINARY_ACTION_APPROVED', timing: 'AFTER', description: 'بعد الموافقة على الجزاء' },
        conditions: [
            { id: 'c1', field: 'violationSeverity', operator: 'EQUALS', value: 'MEDIUM', description: 'مخالفة متوسطة' },
            { id: 'c2', field: 'disciplinaryAction', operator: 'EQUALS', value: 'ONE_DAY_DEDUCTION', description: 'الجزاء خصم يوم' }
        ],
        actions: [
            { type: 'DEDUCT_FROM_PAYROLL', value: 0, unit: 'SAR', description: 'خصم يوم', formula: '{totalSalary} / 30' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'خصم يوم', input: { violationSeverity: 'MEDIUM', disciplinaryAction: 'ONE_DAY_DEDUCTION', totalSalary: 9000 }, expectedResult: { shouldTrigger: true, expectedValue: 300 } }
        ],
        tags: ['تأديب', 'خصم', 'يوم'],
        difficulty: 'SIMPLE',
        popularity: 88,
        rating: 4.6
    },

    {
        id: 'DIS-DED-002',
        category: 'DEDUCTIONS',
        subcategory: 'DISCIPLINARY',
        industry: ['ALL'],
        nameAr: 'خصم 5 أيام - مخالفة جسيمة',
        nameEn: 'Five Days Deduction - Serious Offense',
        descriptionAr: 'خصم 5 أيام من الراتب للمخالفة الجسيمة',
        descriptionEn: 'Five days salary deduction for serious offense',
        legalReference: 'نظام العمل السعودي - المادة 66',
        laborLawArticle: '66',
        trigger: { event: 'DISCIPLINARY_ACTION_APPROVED', timing: 'AFTER', description: 'بعد الموافقة على الجزاء' },
        conditions: [
            { id: 'c1', field: 'violationSeverity', operator: 'EQUALS', value: 'SERIOUS', description: 'مخالفة جسيمة' },
            { id: 'c2', field: 'disciplinaryAction', operator: 'EQUALS', value: 'FIVE_DAYS_DEDUCTION', description: 'الجزاء خصم 5 أيام' }
        ],
        actions: [
            { type: 'DEDUCT_FROM_PAYROLL', value: 0, unit: 'SAR', description: 'خصم 5 أيام', formula: '({totalSalary} / 30) * 5' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'خصم 5 أيام', input: { violationSeverity: 'SERIOUS', disciplinaryAction: 'FIVE_DAYS_DEDUCTION', totalSalary: 9000 }, expectedResult: { shouldTrigger: true, expectedValue: 1500 } }
        ],
        tags: ['تأديب', 'خصم', 'جسيم'],
        difficulty: 'SIMPLE',
        popularity: 85,
        rating: 4.5
    },

    // ========================================
    // 🚫 الإيقاف عن العمل
    // ========================================
    {
        id: 'DIS-SUS-001',
        category: 'COMPLIANCE',
        subcategory: 'SUSPENSION',
        industry: ['ALL'],
        nameAr: 'إيقاف عن العمل مع الراتب',
        nameEn: 'Suspension With Pay',
        descriptionAr: 'إيقاف الموظف عن العمل مؤقتاً مع صرف الراتب للتحقيق',
        descriptionEn: 'Temporarily suspend employee with pay for investigation',
        trigger: { event: 'SUSPENSION_APPROVED', timing: 'AFTER', description: 'بعد الموافقة على الإيقاف' },
        conditions: [
            { id: 'c1', field: 'suspensionType', operator: 'EQUALS', value: 'WITH_PAY', description: 'إيقاف مع راتب' }
        ],
        actions: [
            { type: 'UPDATE_RECORD', value: 'SUSPENDED', description: 'تحديث حالة الموظف' },
            { type: 'SEND_NOTIFICATION', value: 'تم إيقافك عن العمل مؤقتاً للتحقيق', description: 'إشعار للموظف' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'إيقاف مع راتب', input: { suspensionType: 'WITH_PAY' }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['تأديب', 'إيقاف', 'تحقيق'],
        difficulty: 'MEDIUM',
        popularity: 75,
        rating: 4.4
    },

    {
        id: 'DIS-SUS-002',
        category: 'COMPLIANCE',
        subcategory: 'SUSPENSION',
        industry: ['ALL'],
        nameAr: 'إيقاف عن العمل بدون راتب',
        nameEn: 'Suspension Without Pay',
        descriptionAr: 'إيقاف الموظف عن العمل بدون راتب كجزاء',
        descriptionEn: 'Suspend employee without pay as disciplinary action',
        legalReference: 'نظام العمل السعودي - المادة 66',
        laborLawArticle: '66',
        trigger: { event: 'SUSPENSION_APPROVED', timing: 'AFTER', description: 'بعد الموافقة على الإيقاف' },
        conditions: [
            { id: 'c1', field: 'suspensionType', operator: 'EQUALS', value: 'WITHOUT_PAY', description: 'إيقاف بدون راتب' }
        ],
        actions: [
            { type: 'UPDATE_RECORD', value: 'SUSPENDED_NO_PAY', description: 'تحديث الحالة' },
            { type: 'DEDUCT_FROM_PAYROLL', value: 0, unit: 'SAR', description: 'خصم أيام الإيقاف', formula: '({totalSalary} / 30) * {suspensionDays}' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'إيقاف 3 أيام', input: { suspensionType: 'WITHOUT_PAY', totalSalary: 9000, suspensionDays: 3 }, expectedResult: { shouldTrigger: true, expectedValue: 900 } }
        ],
        tags: ['تأديب', 'إيقاف', 'بدون راتب'],
        difficulty: 'MEDIUM',
        popularity: 72,
        rating: 4.3
    },

    // ========================================
    // 🚪 إنهاء الخدمة
    // ========================================
    {
        id: 'DIS-TRM-001',
        category: 'COMPLIANCE',
        subcategory: 'TERMINATION',
        industry: ['ALL'],
        nameAr: 'فصل بموجب المادة 80',
        nameEn: 'Termination Under Article 80',
        descriptionAr: 'إنهاء خدمة بدون مكافأة وفق أسباب المادة 80',
        descriptionEn: 'Termination without reward per Article 80 reasons',
        legalReference: 'نظام العمل السعودي - المادة 80',
        laborLawArticle: '80',
        trigger: { event: 'TERMINATION_APPROVED', timing: 'AFTER', description: 'بعد الموافقة على الفصل' },
        conditions: [
            { id: 'c1', field: 'terminationType', operator: 'EQUALS', value: 'ARTICLE_80', description: 'فصل بالمادة 80' }
        ],
        actions: [
            { type: 'UPDATE_RECORD', value: 'TERMINATED', description: 'إنهاء الخدمة' },
            { type: 'SET_VALUE', value: 0, unit: 'SAR', description: 'لا مكافأة نهاية خدمة' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'فصل مادة 80', input: { terminationType: 'ARTICLE_80' }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['تأديب', 'فصل', 'مادة 80'],
        difficulty: 'COMPLEX',
        popularity: 70,
        rating: 4.5
    },
];

export const DISCIPLINARY_POLICIES_COUNT = DISCIPLINARY_POLICIES.length;
