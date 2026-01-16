import { PolicyTemplate } from '../policy-generator.service';

/**
 * 💰 سياسات الرواتب والمستحقات
 * 
 * تغطي:
 * - حساب الرواتب والبدلات
 * - الخصومات والاستقطاعات
 * - التأمينات والضرائب
 * - المكافآت والحوافز
 * - العمولات
 */

export const PAYROLL_POLICIES: PolicyTemplate[] = [
    // ========================================
    // 💵 البدلات الأساسية
    // ========================================
    {
        id: 'PAY-ALLOW-001',
        category: 'ALLOWANCES',
        subcategory: 'HOUSING',
        industry: ['ALL'],
        nameAr: 'بدل السكن الشهري',
        nameEn: 'Monthly Housing Allowance',
        descriptionAr: 'إضافة بدل سكن شهري بنسبة من الراتب الأساسي',
        descriptionEn: 'Add monthly housing allowance as percentage of basic salary',
        trigger: { event: 'PAYROLL_CALCULATION', timing: 'DURING', description: 'أثناء حساب الراتب' },
        conditions: [
            { id: 'c1', field: 'employeeStatus', operator: 'EQUALS', value: 'ACTIVE', description: 'موظف نشط' },
            { id: 'c2', field: 'hasHousingAllowance', operator: 'EQUALS', value: true, description: 'مستحق لبدل السكن' }
        ],
        actions: [
            { type: 'ADD_PERCENTAGE', value: 25, valueVariable: 'housingPercentage', unit: '%', description: 'بدل سكن', formula: '{basicSalary} * {housingPercentage} / 100' }
        ],
        variables: [
            { name: 'housingPercentage', nameAr: 'نسبة بدل السكن (%)', type: 'PERCENTAGE', defaultValue: 25, min: 10, max: 50, description: 'النسبة من الراتب الأساسي' }
        ],
        testCases: [
            { id: 'test1', name: 'راتب 10000', input: { basicSalary: 10000, employeeStatus: 'ACTIVE', hasHousingAllowance: true }, expectedResult: { shouldTrigger: true, expectedValue: 2500 } }
        ],
        tags: ['بدل', 'سكن', 'راتب'],
        difficulty: 'SIMPLE',
        popularity: 100,
        rating: 5.0
    },

    {
        id: 'PAY-ALLOW-002',
        category: 'ALLOWANCES',
        subcategory: 'TRANSPORTATION',
        industry: ['ALL'],
        nameAr: 'بدل النقل الشهري',
        nameEn: 'Monthly Transportation Allowance',
        descriptionAr: 'إضافة بدل نقل ثابت أو نسبة من الراتب',
        descriptionEn: 'Add fixed or percentage-based transportation allowance',
        trigger: { event: 'PAYROLL_CALCULATION', timing: 'DURING', description: 'أثناء حساب الراتب' },
        conditions: [
            { id: 'c1', field: 'employeeStatus', operator: 'EQUALS', value: 'ACTIVE', description: 'موظف نشط' },
            { id: 'c2', field: 'hasCompanyCar', operator: 'EQUALS', value: false, description: 'لا يملك سيارة شركة' }
        ],
        actions: [
            { type: 'ADD_TO_PAYROLL', value: 500, valueVariable: 'transportAllowance', unit: 'SAR', description: 'بدل نقل' }
        ],
        variables: [
            { name: 'transportAllowance', nameAr: 'بدل النقل (ريال)', type: 'NUMBER', defaultValue: 500, min: 200, max: 2000, description: 'قيمة بدل النقل الشهري' }
        ],
        testCases: [
            { id: 'test1', name: 'موظف بدون سيارة', input: { employeeStatus: 'ACTIVE', hasCompanyCar: false }, expectedResult: { shouldTrigger: true, expectedValue: 500 } }
        ],
        tags: ['بدل', 'نقل', 'مواصلات'],
        difficulty: 'SIMPLE',
        popularity: 98,
        rating: 4.9
    },

    {
        id: 'PAY-ALLOW-003',
        category: 'ALLOWANCES',
        subcategory: 'PHONE',
        industry: ['ALL'],
        nameAr: 'بدل الاتصالات',
        nameEn: 'Communication Allowance',
        descriptionAr: 'بدل شهري لتغطية مصاريف الهاتف والإنترنت',
        descriptionEn: 'Monthly allowance for phone and internet expenses',
        trigger: { event: 'PAYROLL_CALCULATION', timing: 'DURING', description: 'أثناء حساب الراتب' },
        conditions: [
            { id: 'c1', field: 'employeeStatus', operator: 'EQUALS', value: 'ACTIVE', description: 'موظف نشط' },
            { id: 'c2', field: 'requiresPhone', operator: 'EQUALS', value: true, description: 'وظيفة تتطلب اتصالات' }
        ],
        actions: [
            { type: 'ADD_TO_PAYROLL', value: 300, valueVariable: 'phoneAllowance', unit: 'SAR', description: 'بدل اتصالات' }
        ],
        variables: [
            { name: 'phoneAllowance', nameAr: 'بدل الاتصالات (ريال)', type: 'NUMBER', defaultValue: 300, min: 100, max: 1000, description: 'قيمة البدل الشهري' }
        ],
        testCases: [
            { id: 'test1', name: 'موظف مبيعات', input: { employeeStatus: 'ACTIVE', requiresPhone: true }, expectedResult: { shouldTrigger: true, expectedValue: 300 } }
        ],
        tags: ['بدل', 'اتصالات', 'هاتف'],
        difficulty: 'SIMPLE',
        popularity: 85,
        rating: 4.6
    },

    // ========================================
    // 🏦 التأمينات الاجتماعية (GOSI)
    // ========================================
    {
        id: 'PAY-GOSI-001',
        category: 'DEDUCTIONS',
        subcategory: 'GOSI',
        industry: ['ALL'],
        nameAr: 'خصم التأمينات الاجتماعية - حصة الموظف',
        nameEn: 'GOSI Deduction - Employee Share',
        descriptionAr: 'خصم 9.75% من الراتب للتأمينات الاجتماعية (حصة الموظف السعودي)',
        descriptionEn: 'Deduct 9.75% for GOSI (Saudi employee share)',
        legalReference: 'نظام التأمينات الاجتماعية',
        trigger: { event: 'PAYROLL_CALCULATION', timing: 'DURING', description: 'أثناء حساب الراتب' },
        conditions: [
            { id: 'c1', field: 'nationality', operator: 'EQUALS', value: 'SAUDI', description: 'موظف سعودي' },
            { id: 'c2', field: 'registeredInGOSI', operator: 'EQUALS', value: true, description: 'مسجل في التأمينات' }
        ],
        actions: [
            { type: 'DEDUCT_PERCENTAGE', value: 9.75, unit: '%', description: 'خصم التأمينات', formula: '{gosiEligibleSalary} * 0.0975' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'سعودي راتب 8000', input: { nationality: 'SAUDI', registeredInGOSI: true, gosiEligibleSalary: 8000 }, expectedResult: { shouldTrigger: true, expectedValue: 780 } }
        ],
        tags: ['تأمينات', 'GOSI', 'خصم', 'سعودي'],
        difficulty: 'SIMPLE',
        popularity: 100,
        rating: 5.0
    },

    {
        id: 'PAY-GOSI-002',
        category: 'DEDUCTIONS',
        subcategory: 'GOSI',
        industry: ['ALL'],
        nameAr: 'خصم التأمينات - الموظف غير السعودي',
        nameEn: 'GOSI Deduction - Non-Saudi Employee',
        descriptionAr: 'خصم 2% من الراتب للتأمينات (حصة الموظف غير السعودي - أخطار مهنية)',
        descriptionEn: 'Deduct 2% for GOSI (Non-Saudi employee share - occupational hazards)',
        legalReference: 'نظام التأمينات الاجتماعية',
        trigger: { event: 'PAYROLL_CALCULATION', timing: 'DURING', description: 'أثناء حساب الراتب' },
        conditions: [
            { id: 'c1', field: 'nationality', operator: 'NOT_EQUALS', value: 'SAUDI', description: 'موظف غير سعودي' },
            { id: 'c2', field: 'registeredInGOSI', operator: 'EQUALS', value: true, description: 'مسجل في التأمينات' }
        ],
        actions: [
            { type: 'DEDUCT_PERCENTAGE', value: 2, unit: '%', description: 'خصم أخطار مهنية', formula: '{gosiEligibleSalary} * 0.02' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'أجنبي راتب 5000', input: { nationality: 'EGYPTIAN', registeredInGOSI: true, gosiEligibleSalary: 5000 }, expectedResult: { shouldTrigger: true, expectedValue: 100 } }
        ],
        tags: ['تأمينات', 'GOSI', 'خصم', 'أجنبي'],
        difficulty: 'SIMPLE',
        popularity: 95,
        rating: 4.9
    },

    // ========================================
    // 🎁 المكافآت والحوافز
    // ========================================
    {
        id: 'PAY-BONUS-001',
        category: 'INCENTIVES',
        subcategory: 'ANNUAL_BONUS',
        industry: ['ALL'],
        nameAr: 'مكافأة نهاية السنة',
        nameEn: 'Year-End Bonus',
        descriptionAr: 'مكافأة سنوية بناءً على تقييم الأداء',
        descriptionEn: 'Annual bonus based on performance rating',
        trigger: { event: 'YEAR_END', timing: 'AFTER', description: 'نهاية السنة' },
        conditions: [
            { id: 'c1', field: 'yearsOfService', operator: 'GREATER_THAN_OR_EQUALS', value: 1, description: 'سنة خدمة على الأقل' },
            { id: 'c2', field: 'performanceRating', operator: 'GREATER_THAN_OR_EQUALS', value: 3, description: 'تقييم جيد فأعلى' }
        ],
        actions: [
            { type: 'ADD_TO_PAYROLL', value: 0, unit: 'SAR', description: 'مكافأة نهاية السنة', formula: '{basicSalary} * {performanceRating} / 5 * {bonusMultiplier}' }
        ],
        variables: [
            { name: 'bonusMultiplier', nameAr: 'مضاعف المكافأة', type: 'NUMBER', defaultValue: 1, min: 0.5, max: 3, description: 'مضاعف راتب أساسي' }
        ],
        testCases: [
            { id: 'test1', name: 'تقييم ممتاز', input: { yearsOfService: 2, performanceRating: 5, basicSalary: 10000 }, expectedResult: { shouldTrigger: true, expectedValue: 10000 } }
        ],
        tags: ['مكافأة', 'سنوية', 'أداء'],
        difficulty: 'MEDIUM',
        popularity: 92,
        rating: 4.8
    },

    {
        id: 'PAY-BONUS-002',
        category: 'INCENTIVES',
        subcategory: 'ATTENDANCE_BONUS',
        industry: ['ALL'],
        nameAr: 'مكافأة الانضباط الشهرية',
        nameEn: 'Monthly Attendance Bonus',
        descriptionAr: 'مكافأة للموظف الملتزم بالحضور بدون تأخير أو غياب',
        descriptionEn: 'Bonus for employee with no lateness or absence',
        trigger: { event: 'MONTH_END', timing: 'AFTER', description: 'نهاية الشهر' },
        conditions: [
            { id: 'c1', field: 'lateCount', operator: 'EQUALS', value: 0, description: 'لا تأخيرات' },
            { id: 'c2', field: 'absenceCount', operator: 'EQUALS', value: 0, description: 'لا غيابات' },
            { id: 'c3', field: 'workingDays', operator: 'GREATER_THAN_OR_EQUALS', value: 22, description: 'أيام عمل كاملة' }
        ],
        actions: [
            { type: 'ADD_TO_PAYROLL', value: 500, valueVariable: 'attendanceBonus', unit: 'SAR', description: 'مكافأة الانضباط' }
        ],
        variables: [
            { name: 'attendanceBonus', nameAr: 'مكافأة الانضباط (ريال)', type: 'NUMBER', defaultValue: 500, min: 200, max: 2000, description: 'قيمة المكافأة الشهرية' }
        ],
        testCases: [
            { id: 'test1', name: 'حضور كامل', input: { lateCount: 0, absenceCount: 0, workingDays: 23 }, expectedResult: { shouldTrigger: true, expectedValue: 500 } }
        ],
        tags: ['مكافأة', 'حضور', 'انضباط'],
        difficulty: 'SIMPLE',
        popularity: 95,
        rating: 4.9
    },

    {
        id: 'PAY-BONUS-003',
        category: 'INCENTIVES',
        subcategory: 'PROJECT_BONUS',
        industry: ['ALL'],
        nameAr: 'مكافأة إنجاز المشروع',
        nameEn: 'Project Completion Bonus',
        descriptionAr: 'مكافأة عند إكمال مشروع قبل الموعد أو بجودة عالية',
        descriptionEn: 'Bonus for completing project early or with high quality',
        trigger: { event: 'PROJECT_COMPLETED', timing: 'AFTER', description: 'بعد إكمال المشروع' },
        conditions: [
            { id: 'c1', field: 'completedOnTime', operator: 'EQUALS', value: true, description: 'أنجز في الوقت' },
            { id: 'c2', field: 'qualityScore', operator: 'GREATER_THAN_OR_EQUALS', value: 90, description: 'جودة عالية' }
        ],
        actions: [
            { type: 'ADD_TO_PAYROLL', value: 0, unit: 'SAR', description: 'مكافأة المشروع', formula: '{projectValue} * {bonusPercentage} / 100' }
        ],
        variables: [
            { name: 'bonusPercentage', nameAr: 'نسبة المكافأة من قيمة المشروع (%)', type: 'PERCENTAGE', defaultValue: 5, min: 1, max: 20, description: 'النسبة المستحقة' }
        ],
        testCases: [
            { id: 'test1', name: 'مشروع ناجح', input: { completedOnTime: true, qualityScore: 95, projectValue: 100000 }, expectedResult: { shouldTrigger: true, expectedValue: 5000 } }
        ],
        tags: ['مكافأة', 'مشروع', 'إنجاز'],
        difficulty: 'MEDIUM',
        popularity: 85,
        rating: 4.7
    },

    // ========================================
    // 💹 العمولات
    // ========================================
    {
        id: 'PAY-COMM-001',
        category: 'INCENTIVES',
        subcategory: 'SALES_COMMISSION',
        industry: ['RETAIL', 'SALES', 'ALL'],
        nameAr: 'عمولة المبيعات',
        nameEn: 'Sales Commission',
        descriptionAr: 'عمولة نسبية على المبيعات المحققة',
        descriptionEn: 'Percentage commission on achieved sales',
        trigger: { event: 'MONTH_END', timing: 'AFTER', description: 'نهاية الشهر' },
        conditions: [
            { id: 'c1', field: 'totalSales', operator: 'GREATER_THAN', value: 0, description: 'مبيعات محققة' },
            { id: 'c2', field: 'isSalesEmployee', operator: 'EQUALS', value: true, description: 'موظف مبيعات' }
        ],
        actions: [
            { type: 'ADD_TO_PAYROLL', value: 0, unit: 'SAR', description: 'عمولة المبيعات', formula: '{totalSales} * {commissionRate} / 100' }
        ],
        variables: [
            { name: 'commissionRate', nameAr: 'نسبة العمولة (%)', type: 'PERCENTAGE', defaultValue: 5, min: 1, max: 20, description: 'نسبة العمولة من المبيعات' }
        ],
        testCases: [
            { id: 'test1', name: 'مبيعات 50000', input: { totalSales: 50000, isSalesEmployee: true }, expectedResult: { shouldTrigger: true, expectedValue: 2500 } }
        ],
        tags: ['عمولة', 'مبيعات', 'حافز'],
        difficulty: 'SIMPLE',
        popularity: 90,
        rating: 4.8
    },

    {
        id: 'PAY-COMM-002',
        category: 'INCENTIVES',
        subcategory: 'TIERED_COMMISSION',
        industry: ['RETAIL', 'SALES', 'ALL'],
        nameAr: 'عمولة متدرجة حسب الهدف',
        nameEn: 'Tiered Commission by Target',
        descriptionAr: 'عمولة تزيد كلما تجاوز الموظف نسبة الهدف المحدد',
        descriptionEn: 'Commission increases as employee exceeds target percentage',
        trigger: { event: 'MONTH_END', timing: 'AFTER', description: 'نهاية الشهر' },
        conditions: [
            { id: 'c1', field: 'targetAchievement', operator: 'GREATER_THAN_OR_EQUALS', value: 80, description: 'تحقيق 80% من الهدف على الأقل' }
        ],
        actions: [
            { type: 'ADD_TO_PAYROLL', value: 0, unit: 'SAR', description: 'عمولة متدرجة', formula: '{targetAchievement} >= 120 ? {totalSales} * 0.08 : ({targetAchievement} >= 100 ? {totalSales} * 0.05 : {totalSales} * 0.03)' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'تحقيق 120%', input: { targetAchievement: 120, totalSales: 100000 }, expectedResult: { shouldTrigger: true, expectedValue: 8000 } },
            { id: 'test2', name: 'تحقيق 100%', input: { targetAchievement: 100, totalSales: 100000 }, expectedResult: { shouldTrigger: true, expectedValue: 5000 } }
        ],
        tags: ['عمولة', 'متدرجة', 'هدف'],
        difficulty: 'COMPLEX',
        popularity: 88,
        rating: 4.7
    },

    // ========================================
    // ⏰ حسابات الراتب
    // ========================================
    {
        id: 'PAY-CALC-001',
        category: 'PAYROLL',
        subcategory: 'DAILY_RATE',
        industry: ['ALL'],
        nameAr: 'حساب الأجر اليومي',
        nameEn: 'Daily Rate Calculation',
        descriptionAr: 'حساب الأجر اليومي بقسمة الراتب على 30 يوم',
        descriptionEn: 'Calculate daily rate by dividing salary by 30 days',
        trigger: { event: 'PAYROLL_CALCULATION', timing: 'DURING', description: 'أثناء الحساب' },
        conditions: [],
        actions: [
            { type: 'SET_VALUE', value: 0, unit: 'SAR', description: 'الأجر اليومي', formula: '{totalSalary} / 30' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'راتب 9000', input: { totalSalary: 9000 }, expectedResult: { shouldTrigger: true, expectedValue: 300 } }
        ],
        tags: ['راتب', 'يومي', 'حساب'],
        difficulty: 'SIMPLE',
        popularity: 100,
        rating: 5.0
    },

    {
        id: 'PAY-CALC-002',
        category: 'PAYROLL',
        subcategory: 'HOURLY_RATE',
        industry: ['ALL'],
        nameAr: 'حساب الأجر بالساعة',
        nameEn: 'Hourly Rate Calculation',
        descriptionAr: 'حساب أجر الساعة للعمل الإضافي والخصومات',
        descriptionEn: 'Calculate hourly rate for overtime and deductions',
        trigger: { event: 'PAYROLL_CALCULATION', timing: 'DURING', description: 'أثناء الحساب' },
        conditions: [],
        actions: [
            { type: 'SET_VALUE', value: 0, unit: 'SAR', description: 'الأجر بالساعة', formula: '{totalSalary} / 30 / 8' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'راتب 7200', input: { totalSalary: 7200 }, expectedResult: { shouldTrigger: true, expectedValue: 30 } }
        ],
        tags: ['راتب', 'ساعة', 'حساب'],
        difficulty: 'SIMPLE',
        popularity: 98,
        rating: 5.0
    },

    // ========================================
    // 🔻 الخصومات
    // ========================================
    {
        id: 'PAY-DED-001',
        category: 'DEDUCTIONS',
        subcategory: 'ABSENCE',
        industry: ['ALL'],
        nameAr: 'خصم أيام الغياب',
        nameEn: 'Absence Days Deduction',
        descriptionAr: 'خصم الأيام التي غاب فيها الموظف بدون إذن',
        descriptionEn: 'Deduct days when employee was absent without permission',
        trigger: { event: 'PAYROLL_CALCULATION', timing: 'DURING', description: 'أثناء حساب الراتب' },
        conditions: [
            { id: 'c1', field: 'unauthorizedAbsenceDays', operator: 'GREATER_THAN', value: 0, description: 'أيام غياب بدون إذن' }
        ],
        actions: [
            { type: 'DEDUCT_FROM_PAYROLL', value: 0, unit: 'SAR', description: 'خصم الغياب', formula: '{unauthorizedAbsenceDays} * ({totalSalary} / 30)' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'غياب يومين', input: { unauthorizedAbsenceDays: 2, totalSalary: 9000 }, expectedResult: { shouldTrigger: true, expectedValue: 600 } }
        ],
        tags: ['خصم', 'غياب', 'راتب'],
        difficulty: 'SIMPLE',
        popularity: 95,
        rating: 4.9
    },

    {
        id: 'PAY-DED-002',
        category: 'DEDUCTIONS',
        subcategory: 'LATENESS',
        industry: ['ALL'],
        nameAr: 'خصم دقائق التأخير',
        nameEn: 'Lateness Minutes Deduction',
        descriptionAr: 'خصم مقابل دقائق التأخير المتراكمة خلال الشهر',
        descriptionEn: 'Deduct accumulated lateness minutes during month',
        trigger: { event: 'PAYROLL_CALCULATION', timing: 'DURING', description: 'أثناء حساب الراتب' },
        conditions: [
            { id: 'c1', field: 'totalLateMinutes', operator: 'GREATER_THAN', value: 0, description: 'دقائق تأخير' }
        ],
        actions: [
            { type: 'DEDUCT_FROM_PAYROLL', value: 0, unit: 'SAR', description: 'خصم التأخير', formula: '{totalLateMinutes} * ({totalSalary} / 30 / 8 / 60)' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'تأخير 60 دقيقة', input: { totalLateMinutes: 60, totalSalary: 7200 }, expectedResult: { shouldTrigger: true, expectedValue: 30 } }
        ],
        tags: ['خصم', 'تأخير', 'راتب'],
        difficulty: 'SIMPLE',
        popularity: 92,
        rating: 4.8
    },

    {
        id: 'PAY-DED-003',
        category: 'DEDUCTIONS',
        subcategory: 'LOAN',
        industry: ['ALL'],
        nameAr: 'خصم قسط السلفة',
        nameEn: 'Advance Installment Deduction',
        descriptionAr: 'خصم القسط الشهري للسلفة من الراتب',
        descriptionEn: 'Deduct monthly advance installment from salary',
        trigger: { event: 'PAYROLL_CALCULATION', timing: 'DURING', description: 'أثناء حساب الراتب' },
        conditions: [
            { id: 'c1', field: 'hasActiveAdvance', operator: 'EQUALS', value: true, description: 'سلفة نشطة' },
            { id: 'c2', field: 'remainingAdvanceBalance', operator: 'GREATER_THAN', value: 0, description: 'رصيد متبقي' }
        ],
        actions: [
            { type: 'DEDUCT_FROM_PAYROLL', value: 0, valueVariable: 'advanceInstallment', unit: 'SAR', description: 'قسط السلفة' }
        ],
        variables: [
            { name: 'advanceInstallment', nameAr: 'القسط الشهري (ريال)', type: 'NUMBER', defaultValue: 500, min: 100, max: 5000, description: 'قيمة القسط الشهري' }
        ],
        testCases: [
            { id: 'test1', name: 'سلفة نشطة', input: { hasActiveAdvance: true, remainingAdvanceBalance: 2000 }, expectedResult: { shouldTrigger: true, expectedValue: 500 } }
        ],
        tags: ['خصم', 'سلفة', 'قسط'],
        difficulty: 'SIMPLE',
        popularity: 90,
        rating: 4.7
    },
];

export const PAYROLL_POLICIES_COUNT = PAYROLL_POLICIES.length;
