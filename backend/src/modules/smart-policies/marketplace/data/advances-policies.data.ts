import { PolicyTemplate } from '../policy-generator.service';

/**
 * 💸 سياسات السلف والقروض
 */

export const ADVANCES_POLICIES: PolicyTemplate[] = [
    // ========================================
    // 💵 طلب السلف
    // ========================================
    {
        id: 'ADV-REQ-001',
        category: 'PAYROLL',
        subcategory: 'ADVANCE_REQUEST',
        industry: ['ALL'],
        nameAr: 'شروط طلب السلفة',
        nameEn: 'Advance Request Conditions',
        descriptionAr: 'تحديد شروط استحقاق طلب سلفة جديدة',
        descriptionEn: 'Set conditions for eligibility to request new advance',
        trigger: { event: 'ADVANCE_REQUESTED', timing: 'BEFORE', description: 'قبل طلب السلفة' },
        conditions: [
            { id: 'c1', field: 'yearsOfService', operator: 'GREATER_THAN_OR_EQUALS', value: 1, valueVariable: 'minServiceYears', description: 'سنة خدمة على الأقل' },
            { id: 'c2', field: 'hasActiveAdvance', operator: 'EQUALS', value: false, description: 'لا سلفة نشطة' },
            { id: 'c3', field: 'lastAdvanceMonthsAgo', operator: 'GREATER_THAN_OR_EQUALS', value: 6, valueVariable: 'minMonthsBetween', description: 'مضى 6 أشهر من آخر سلفة' }
        ],
        actions: [
            { type: 'SET_VALUE', value: 'ELIGIBLE', description: 'مؤهل للسلفة' }
        ],
        variables: [
            { name: 'minServiceYears', nameAr: 'الحد الأدنى لسنوات الخدمة', type: 'NUMBER', defaultValue: 1, min: 0, max: 3, description: 'سنوات الخدمة المطلوبة' },
            { name: 'minMonthsBetween', nameAr: 'الحد الأدنى بين السلف (شهر)', type: 'NUMBER', defaultValue: 6, min: 3, max: 12, description: 'أشهر بين السلفة والتالية' }
        ],
        testCases: [
            { id: 'test1', name: 'موظف مؤهل', input: { yearsOfService: 2, hasActiveAdvance: false, lastAdvanceMonthsAgo: 8 }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['سلفة', 'طلب', 'شروط'],
        difficulty: 'MEDIUM',
        popularity: 95,
        rating: 4.9
    },

    {
        id: 'ADV-REQ-002',
        category: 'PAYROLL',
        subcategory: 'ADVANCE_LIMIT',
        industry: ['ALL'],
        nameAr: 'الحد الأقصى للسلفة',
        nameEn: 'Maximum Advance Amount',
        descriptionAr: 'تحديد الحد الأقصى لقيمة السلفة بناءً على الراتب',
        descriptionEn: 'Set maximum advance amount based on salary',
        trigger: { event: 'ADVANCE_REQUESTED', timing: 'BEFORE', description: 'قبل طلب السلفة' },
        conditions: [
            { id: 'c1', field: 'requestedAmount', operator: 'GREATER_THAN', value: 0, description: 'مبلغ مطلوب' }
        ],
        actions: [
            { type: 'SET_VALUE', value: 0, unit: 'SAR', description: 'الحد الأقصى المسموح', formula: '{basicSalary} * {maxSalaryMultiplier}' }
        ],
        variables: [
            { name: 'maxSalaryMultiplier', nameAr: 'مضاعف الراتب الأقصى', type: 'NUMBER', defaultValue: 3, min: 1, max: 6, description: 'كم راتب كحد أقصى' }
        ],
        testCases: [
            { id: 'test1', name: 'راتب 8000', input: { requestedAmount: 20000, basicSalary: 8000 }, expectedResult: { shouldTrigger: true, expectedValue: 24000 } }
        ],
        tags: ['سلفة', 'حد أقصى', 'راتب'],
        difficulty: 'SIMPLE',
        popularity: 92,
        rating: 4.8
    },

    {
        id: 'ADV-REQ-003',
        category: 'PAYROLL',
        subcategory: 'ADVANCE_APPROVAL',
        industry: ['ALL'],
        nameAr: 'موافقة تلقائية على السلف الصغيرة',
        nameEn: 'Auto-Approve Small Advances',
        descriptionAr: 'موافقة تلقائية على السلف التي لا تتجاوز راتب شهر',
        descriptionEn: 'Auto-approve advances not exceeding one month salary',
        trigger: { event: 'ADVANCE_REQUESTED', timing: 'AFTER', description: 'بعد طلب السلفة' },
        conditions: [
            { id: 'c1', field: 'requestedAmount', operator: 'LESS_THAN_OR_EQUALS', value: 10000, valueVariable: 'maxAutoApprove', description: 'مبلغ صغير' },
            { id: 'c2', field: 'employeeRating', operator: 'GREATER_THAN_OR_EQUALS', value: 3, description: 'تقييم جيد' }
        ],
        actions: [
            { type: 'SET_VALUE', value: 'AUTO_APPROVED', description: 'موافقة تلقائية' },
            { type: 'SEND_NOTIFICATION', value: 'تمت الموافقة على سلفتك تلقائياً', description: 'إشعار' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'سلفة صغيرة', input: { requestedAmount: 5000, basicSalary: 8000, employeeRating: 4 }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['سلفة', 'موافقة تلقائية', 'صغيرة'],
        difficulty: 'MEDIUM',
        popularity: 85,
        rating: 4.6
    },

    // ========================================
    // 💳 سداد السلف
    // ========================================
    {
        id: 'ADV-PAY-001',
        category: 'DEDUCTIONS',
        subcategory: 'ADVANCE_PAYMENT',
        industry: ['ALL'],
        nameAr: 'خصم قسط السلفة الشهري',
        nameEn: 'Monthly Advance Installment Deduction',
        descriptionAr: 'خصم قسط السلفة تلقائياً من الراتب الشهري',
        descriptionEn: 'Automatically deduct advance installment from monthly salary',
        trigger: { event: 'PAYROLL_CALCULATION', timing: 'DURING', description: 'أثناء حساب الراتب' },
        conditions: [
            { id: 'c1', field: 'hasActiveAdvance', operator: 'EQUALS', value: true, description: 'سلفة نشطة' },
            { id: 'c2', field: 'remainingBalance', operator: 'GREATER_THAN', value: 0, description: 'رصيد متبقي' }
        ],
        actions: [
            { type: 'DEDUCT_FROM_PAYROLL', value: 0, unit: 'SAR', description: 'قسط السلفة', formula: 'Math.min({monthlyInstallment}, {remainingBalance})' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'قسط شهري', input: { hasActiveAdvance: true, remainingBalance: 5000, monthlyInstallment: 1000 }, expectedResult: { shouldTrigger: true, expectedValue: 1000 } }
        ],
        tags: ['سلفة', 'قسط', 'خصم'],
        difficulty: 'SIMPLE',
        popularity: 98,
        rating: 5.0
    },

    {
        id: 'ADV-PAY-002',
        category: 'DEDUCTIONS',
        subcategory: 'ADVANCE_FINAL',
        industry: ['ALL'],
        nameAr: 'خصم رصيد السلفة من المخالصة',
        nameEn: 'Deduct Advance Balance from Final Settlement',
        descriptionAr: 'خصم كامل رصيد السلفة المتبقي من مستحقات نهاية الخدمة',
        descriptionEn: 'Deduct full remaining advance balance from end of service dues',
        trigger: { event: 'FINAL_SETTLEMENT', timing: 'DURING', description: 'أثناء المخالصة' },
        conditions: [
            { id: 'c1', field: 'remainingAdvanceBalance', operator: 'GREATER_THAN', value: 0, description: 'رصيد سلفة متبقي' }
        ],
        actions: [
            { type: 'DEDUCT_FROM_PAYROLL', value: 0, unit: 'SAR', description: 'رصيد السلفة', formula: '{remainingAdvanceBalance}' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'سلفة متبقية', input: { remainingAdvanceBalance: 10000 }, expectedResult: { shouldTrigger: true, expectedValue: 10000 } }
        ],
        tags: ['سلفة', 'مخالصة', 'نهاية خدمة'],
        difficulty: 'SIMPLE',
        popularity: 95,
        rating: 4.9
    },

    // ========================================
    // ⚠️ تنبيهات السلف
    // ========================================
    {
        id: 'ADV-ALT-001',
        category: 'COMPLIANCE',
        subcategory: 'ADVANCE_ALERTS',
        industry: ['ALL'],
        nameAr: 'تنبيه قبل آخر قسط',
        nameEn: 'Alert Before Last Installment',
        descriptionAr: 'إرسال تنبيه للموظف قبل آخر قسط للسلفة',
        descriptionEn: 'Send alert to employee before last advance installment',
        trigger: { event: 'ADVANCE_INSTALLMENT_PAID', timing: 'AFTER', description: 'بعد دفع القسط' },
        conditions: [
            { id: 'c1', field: 'remainingInstallments', operator: 'EQUALS', value: 1, description: 'آخر قسط' }
        ],
        actions: [
            { type: 'SEND_NOTIFICATION', value: 'الشهر القادم آخر قسط لسلفتك', description: 'تنبيه' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'قسط أخير', input: { remainingInstallments: 1 }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['سلفة', 'تنبيه', 'قسط أخير'],
        difficulty: 'SIMPLE',
        popularity: 80,
        rating: 4.5
    },

    {
        id: 'ADV-ALT-002',
        category: 'COMPLIANCE',
        subcategory: 'ADVANCE_ALERTS',
        industry: ['ALL'],
        nameAr: 'تنبيه اكتمال سداد السلفة',
        nameEn: 'Advance Fully Paid Alert',
        descriptionAr: 'إرسال إشعار عند اكتمال سداد السلفة',
        descriptionEn: 'Send notification when advance is fully paid',
        trigger: { event: 'ADVANCE_FULLY_PAID', timing: 'AFTER', description: 'بعد اكتمال السداد' },
        conditions: [],
        actions: [
            { type: 'SEND_NOTIFICATION', value: 'مبروك! تم سداد السلفة بالكامل', description: 'إشعار' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'سداد كامل', input: {}, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['سلفة', 'سداد', 'إشعار'],
        difficulty: 'SIMPLE',
        popularity: 88,
        rating: 4.7
    },
];

export const ADVANCES_POLICIES_COUNT = ADVANCES_POLICIES.length;
