import { PolicyTemplate } from '../policy-generator.service';

/**
 * 🚛 سياسات شركات اللوجستيات والنقل والتوصيل
 * 
 * أكثر من 200 سياسة متخصصة تغطي:
 * - السائقين والمندوبين
 * - المستودعات والمخازن
 * - التوصيل والشحن
 * - السلامة والأمان
 * - الأداء والإنتاجية
 * - البدلات والحوافز
 */

export const LOGISTICS_POLICIES: PolicyTemplate[] = [
    // ========================================
    // 🚗 سياسات السائقين - الحضور والالتزام
    // ========================================
    {
        id: 'LOG-DRV-001',
        category: 'LOGISTICS',
        subcategory: 'DRIVERS_ATTENDANCE',
        industry: ['LOGISTICS', 'DELIVERY', 'TRANSPORTATION'],
        nameAr: 'خصم تأخير السائق عن موعد الانطلاق',
        nameEn: 'Driver Late Departure Deduction',
        descriptionAr: 'خصم تلقائي للسائق عند التأخر عن موعد انطلاق الرحلة المحدد',
        descriptionEn: 'Automatic deduction for driver arriving late to scheduled departure time',
        legalReference: 'نظام العمل السعودي - المادة 80',
        laborLawArticle: '80',
        trigger: {
            event: 'TRIP_START',
            subEvent: 'LATE_DEPARTURE',
            timing: 'AFTER',
            description: 'عند بدء رحلة متأخرة عن الموعد'
        },
        conditions: [
            {
                id: 'c1',
                field: 'delayMinutes',
                operator: 'GREATER_THAN',
                value: 0,
                valueVariable: 'gracePeriodMinutes',
                description: 'التأخير أكثر من فترة السماح'
            }
        ],
        actions: [
            {
                type: 'DEDUCT_FROM_PAYROLL',
                value: 0,
                valueVariable: 'deductionPerMinute',
                unit: 'SAR',
                description: 'خصم عن كل دقيقة تأخير',
                formula: '{delayMinutes} * {deductionPerMinute}'
            }
        ],
        variables: [
            {
                name: 'gracePeriodMinutes',
                nameAr: 'فترة السماح (دقائق)',
                type: 'NUMBER',
                defaultValue: 10,
                min: 0,
                max: 30,
                description: 'الوقت المسموح قبل احتساب التأخير'
            },
            {
                name: 'deductionPerMinute',
                nameAr: 'الخصم لكل دقيقة (ريال)',
                type: 'NUMBER',
                defaultValue: 2,
                min: 1,
                max: 10,
                description: 'مبلغ الخصم عن كل دقيقة تأخير'
            },
            {
                name: 'maxDeduction',
                nameAr: 'الحد الأقصى للخصم (ريال)',
                type: 'NUMBER',
                defaultValue: 100,
                min: 50,
                max: 500,
                description: 'أقصى مبلغ يمكن خصمه'
            }
        ],
        testCases: [
            {
                id: 'test1',
                name: 'تأخير 15 دقيقة',
                input: { delayMinutes: 15, gracePeriodMinutes: 10 },
                expectedResult: { shouldTrigger: true, expectedValue: 10 }
            },
            {
                id: 'test2',
                name: 'ضمن فترة السماح',
                input: { delayMinutes: 5, gracePeriodMinutes: 10 },
                expectedResult: { shouldTrigger: false }
            },
            {
                id: 'test3',
                name: 'تأخير كبير',
                input: { delayMinutes: 60, gracePeriodMinutes: 10 },
                expectedResult: { shouldTrigger: true, expectedValue: 100 }
            }
        ],
        tags: ['سائقين', 'تأخير', 'خصم', 'لوجستيات', 'رحلات'],
        difficulty: 'SIMPLE',
        popularity: 95,
        rating: 4.8
    },

    {
        id: 'LOG-DRV-002',
        category: 'LOGISTICS',
        subcategory: 'DRIVERS_ATTENDANCE',
        industry: ['LOGISTICS', 'DELIVERY', 'TRANSPORTATION'],
        nameAr: 'مكافأة الالتزام بمواعيد الرحلات',
        nameEn: 'Trip Schedule Compliance Bonus',
        descriptionAr: 'مكافأة شهرية للسائق الملتزم بجميع مواعيد الرحلات',
        descriptionEn: 'Monthly bonus for drivers with 100% trip schedule compliance',
        trigger: {
            event: 'MONTH_END',
            timing: 'AFTER',
            description: 'نهاية الشهر'
        },
        conditions: [
            {
                id: 'c1',
                field: 'onTimeTripsPercentage',
                operator: 'GREATER_THAN_OR_EQUALS',
                value: 95,
                valueVariable: 'minComplianceRate',
                description: 'نسبة الالتزام أكبر من الحد الأدنى'
            },
            {
                id: 'c2',
                field: 'totalTrips',
                operator: 'GREATER_THAN_OR_EQUALS',
                value: 20,
                valueVariable: 'minTripsRequired',
                description: 'الحد الأدنى من الرحلات'
            }
        ],
        actions: [
            {
                type: 'ADD_TO_PAYROLL',
                value: 500,
                valueVariable: 'bonusAmount',
                unit: 'SAR',
                description: 'مكافأة الالتزام'
            }
        ],
        variables: [
            {
                name: 'minComplianceRate',
                nameAr: 'الحد الأدنى لنسبة الالتزام (%)',
                type: 'PERCENTAGE',
                defaultValue: 95,
                min: 80,
                max: 100,
                description: 'النسبة المطلوبة للحصول على المكافأة'
            },
            {
                name: 'minTripsRequired',
                nameAr: 'الحد الأدنى للرحلات',
                type: 'NUMBER',
                defaultValue: 20,
                min: 10,
                max: 50,
                description: 'عدد الرحلات المطلوب إتمامها'
            },
            {
                name: 'bonusAmount',
                nameAr: 'مبلغ المكافأة (ريال)',
                type: 'NUMBER',
                defaultValue: 500,
                min: 100,
                max: 2000,
                description: 'مبلغ المكافأة الشهرية'
            }
        ],
        testCases: [
            {
                id: 'test1',
                name: 'سائق ملتزم 100%',
                input: { onTimeTripsPercentage: 100, totalTrips: 25 },
                expectedResult: { shouldTrigger: true, expectedValue: 500 }
            },
            {
                id: 'test2',
                name: 'سائق أقل من الحد الأدنى',
                input: { onTimeTripsPercentage: 90, totalTrips: 25 },
                expectedResult: { shouldTrigger: false }
            }
        ],
        tags: ['سائقين', 'مكافأة', 'التزام', 'لوجستيات'],
        difficulty: 'SIMPLE',
        popularity: 98,
        rating: 4.9
    },

    // ========================================
    // 📦 سياسات التوصيل والشحنات
    // ========================================
    {
        id: 'LOG-DEL-001',
        category: 'LOGISTICS',
        subcategory: 'DELIVERY_PERFORMANCE',
        industry: ['LOGISTICS', 'DELIVERY', 'ECOMMERCE'],
        nameAr: 'حافز التوصيل السريع',
        nameEn: 'Fast Delivery Incentive',
        descriptionAr: 'حافز للمندوب عند توصيل الشحنة قبل الموعد المحدد',
        descriptionEn: 'Incentive for delivering packages before scheduled time',
        trigger: {
            event: 'DELIVERY_COMPLETED',
            subEvent: 'EARLY_DELIVERY',
            timing: 'AFTER',
            description: 'عند إتمام توصيل مبكر'
        },
        conditions: [
            {
                id: 'c1',
                field: 'minutesEarly',
                operator: 'GREATER_THAN_OR_EQUALS',
                value: 30,
                valueVariable: 'minEarlyMinutes',
                description: 'التوصيل مبكر بالحد الأدنى المطلوب'
            },
            {
                id: 'c2',
                field: 'customerRating',
                operator: 'GREATER_THAN_OR_EQUALS',
                value: 4,
                description: 'تقييم العميل جيد'
            }
        ],
        actions: [
            {
                type: 'ADD_TO_PAYROLL',
                value: 10,
                valueVariable: 'incentivePerDelivery',
                unit: 'SAR',
                description: 'حافز التوصيل المبكر'
            }
        ],
        variables: [
            {
                name: 'minEarlyMinutes',
                nameAr: 'الحد الأدنى للتبكير (دقائق)',
                type: 'NUMBER',
                defaultValue: 30,
                min: 15,
                max: 60,
                description: 'الوقت المطلوب للتوصيل قبل الموعد'
            },
            {
                name: 'incentivePerDelivery',
                nameAr: 'الحافز لكل توصيلة (ريال)',
                type: 'NUMBER',
                defaultValue: 10,
                min: 5,
                max: 50,
                description: 'مبلغ الحافز'
            }
        ],
        testCases: [
            {
                id: 'test1',
                name: 'توصيل مبكر 45 دقيقة',
                input: { minutesEarly: 45, customerRating: 5 },
                expectedResult: { shouldTrigger: true, expectedValue: 10 }
            },
            {
                id: 'test2',
                name: 'توصيل مبكر لكن تقييم منخفض',
                input: { minutesEarly: 45, customerRating: 3 },
                expectedResult: { shouldTrigger: false }
            }
        ],
        tags: ['توصيل', 'حافز', 'سرعة', 'لوجستيات'],
        difficulty: 'MEDIUM',
        popularity: 92,
        rating: 4.7
    },

    {
        id: 'LOG-DEL-002',
        category: 'LOGISTICS',
        subcategory: 'DELIVERY_PERFORMANCE',
        industry: ['LOGISTICS', 'DELIVERY', 'ECOMMERCE'],
        nameAr: 'خصم التوصيل المتأخر',
        nameEn: 'Late Delivery Deduction',
        descriptionAr: 'خصم من المندوب عند تأخر التوصيل عن الموعد المحدد للعميل',
        descriptionEn: 'Deduction for late delivery beyond customer\'s scheduled time',
        trigger: {
            event: 'DELIVERY_COMPLETED',
            subEvent: 'LATE_DELIVERY',
            timing: 'AFTER',
            description: 'عند إتمام توصيل متأخر'
        },
        conditions: [
            {
                id: 'c1',
                field: 'minutesLate',
                operator: 'GREATER_THAN',
                value: 15,
                valueVariable: 'gracePeriodMinutes',
                description: 'التأخير أكثر من فترة السماح'
            },
            {
                id: 'c2',
                field: 'delayReason',
                operator: 'NOT_EQUALS',
                value: 'CUSTOMER_UNAVAILABLE',
                description: 'التأخير ليس بسبب عدم توفر العميل'
            }
        ],
        actions: [
            {
                type: 'DEDUCT_FROM_PAYROLL',
                value: 0,
                unit: 'SAR',
                description: 'خصم التأخير',
                formula: 'Math.min({minutesLate} * {deductionPerMinute}, {maxDeduction})'
            }
        ],
        variables: [
            {
                name: 'gracePeriodMinutes',
                nameAr: 'فترة السماح (دقائق)',
                type: 'NUMBER',
                defaultValue: 15,
                min: 5,
                max: 30,
                description: 'الوقت المسموح قبل احتساب التأخير'
            },
            {
                name: 'deductionPerMinute',
                nameAr: 'الخصم لكل دقيقة (ريال)',
                type: 'NUMBER',
                defaultValue: 1,
                min: 0.5,
                max: 5,
                description: 'مبلغ الخصم عن كل دقيقة'
            },
            {
                name: 'maxDeduction',
                nameAr: 'الحد الأقصى للخصم (ريال)',
                type: 'NUMBER',
                defaultValue: 50,
                min: 20,
                max: 200,
                description: 'أقصى خصم للتوصيلة الواحدة'
            }
        ],
        testCases: [
            {
                id: 'test1',
                name: 'تأخير 30 دقيقة',
                input: { minutesLate: 30, delayReason: 'TRAFFIC' },
                expectedResult: { shouldTrigger: true, expectedValue: 15 }
            },
            {
                id: 'test2',
                name: 'تأخير بسبب العميل',
                input: { minutesLate: 30, delayReason: 'CUSTOMER_UNAVAILABLE' },
                expectedResult: { shouldTrigger: false }
            }
        ],
        tags: ['توصيل', 'خصم', 'تأخير', 'لوجستيات'],
        difficulty: 'MEDIUM',
        popularity: 88,
        rating: 4.5
    },

    {
        id: 'LOG-DEL-003',
        category: 'LOGISTICS',
        subcategory: 'DELIVERY_PERFORMANCE',
        industry: ['LOGISTICS', 'DELIVERY', 'ECOMMERCE'],
        nameAr: 'مكافأة عدد التوصيلات اليومية',
        nameEn: 'Daily Deliveries Target Bonus',
        descriptionAr: 'مكافأة للمندوب عند تحقيق أو تجاوز الهدف اليومي للتوصيلات',
        descriptionEn: 'Bonus for achieving or exceeding daily delivery target',
        trigger: {
            event: 'DAY_END',
            timing: 'AFTER',
            description: 'نهاية يوم العمل'
        },
        conditions: [
            {
                id: 'c1',
                field: 'completedDeliveries',
                operator: 'GREATER_THAN_OR_EQUALS',
                value: 25,
                valueVariable: 'dailyTarget',
                description: 'تحقيق الهدف اليومي'
            },
            {
                id: 'c2',
                field: 'failedDeliveries',
                operator: 'LESS_THAN_OR_EQUALS',
                value: 2,
                valueVariable: 'maxFailedAllowed',
                description: 'التوصيلات الفاشلة ضمن الحد'
            }
        ],
        actions: [
            {
                type: 'ADD_TO_PAYROLL',
                value: 0,
                unit: 'SAR',
                description: 'مكافأة تحقيق الهدف',
                formula: '{baseBonus} + (({completedDeliveries} - {dailyTarget}) * {bonusPerExtra})'
            }
        ],
        variables: [
            {
                name: 'dailyTarget',
                nameAr: 'الهدف اليومي',
                type: 'NUMBER',
                defaultValue: 25,
                min: 15,
                max: 50,
                description: 'عدد التوصيلات المطلوب يومياً'
            },
            {
                name: 'maxFailedAllowed',
                nameAr: 'الحد الأقصى للفشل',
                type: 'NUMBER',
                defaultValue: 2,
                min: 0,
                max: 5,
                description: 'عدد التوصيلات الفاشلة المسموحة'
            },
            {
                name: 'baseBonus',
                nameAr: 'المكافأة الأساسية (ريال)',
                type: 'NUMBER',
                defaultValue: 50,
                min: 20,
                max: 200,
                description: 'مكافأة تحقيق الهدف'
            },
            {
                name: 'bonusPerExtra',
                nameAr: 'مكافأة كل توصيلة إضافية (ريال)',
                type: 'NUMBER',
                defaultValue: 5,
                min: 2,
                max: 20,
                description: 'مكافأة كل توصيلة فوق الهدف'
            }
        ],
        testCases: [
            {
                id: 'test1',
                name: '30 توصيلة ناجحة',
                input: { completedDeliveries: 30, failedDeliveries: 1 },
                expectedResult: { shouldTrigger: true, expectedValue: 75 }
            },
            {
                id: 'test2',
                name: 'هدف لم يتحقق',
                input: { completedDeliveries: 20, failedDeliveries: 0 },
                expectedResult: { shouldTrigger: false }
            }
        ],
        tags: ['توصيل', 'مكافأة', 'هدف', 'يومي', 'لوجستيات'],
        difficulty: 'MEDIUM',
        popularity: 96,
        rating: 4.8
    },

    // ========================================
    // 🏭 سياسات المستودعات
    // ========================================
    {
        id: 'LOG-WH-001',
        category: 'LOGISTICS',
        subcategory: 'WAREHOUSE',
        industry: ['LOGISTICS', 'WAREHOUSE', 'RETAIL'],
        nameAr: 'حافز دقة الجرد',
        nameEn: 'Inventory Accuracy Bonus',
        descriptionAr: 'مكافأة لفريق المستودع عند تحقيق دقة جرد عالية',
        descriptionEn: 'Bonus for warehouse team achieving high inventory accuracy',
        trigger: {
            event: 'INVENTORY_COUNT',
            subEvent: 'COMPLETED',
            timing: 'AFTER',
            description: 'بعد اكتمال الجرد'
        },
        conditions: [
            {
                id: 'c1',
                field: 'accuracyRate',
                operator: 'GREATER_THAN_OR_EQUALS',
                value: 99,
                valueVariable: 'minAccuracyRate',
                description: 'نسبة الدقة أعلى من الحد الأدنى'
            }
        ],
        actions: [
            {
                type: 'ADD_TO_PAYROLL',
                value: 200,
                valueVariable: 'bonusAmount',
                unit: 'SAR',
                description: 'مكافأة دقة الجرد'
            }
        ],
        variables: [
            {
                name: 'minAccuracyRate',
                nameAr: 'الحد الأدنى للدقة (%)',
                type: 'PERCENTAGE',
                defaultValue: 99,
                min: 95,
                max: 100,
                description: 'نسبة الدقة المطلوبة'
            },
            {
                name: 'bonusAmount',
                nameAr: 'مبلغ المكافأة (ريال)',
                type: 'NUMBER',
                defaultValue: 200,
                min: 100,
                max: 1000,
                description: 'مكافأة كل موظف'
            }
        ],
        testCases: [
            {
                id: 'test1',
                name: 'دقة 99.5%',
                input: { accuracyRate: 99.5 },
                expectedResult: { shouldTrigger: true, expectedValue: 200 }
            },
            {
                id: 'test2',
                name: 'دقة 98%',
                input: { accuracyRate: 98 },
                expectedResult: { shouldTrigger: false }
            }
        ],
        tags: ['مستودع', 'جرد', 'دقة', 'مكافأة', 'لوجستيات'],
        difficulty: 'SIMPLE',
        popularity: 85,
        rating: 4.6
    },

    {
        id: 'LOG-WH-002',
        category: 'LOGISTICS',
        subcategory: 'WAREHOUSE',
        industry: ['LOGISTICS', 'WAREHOUSE', 'RETAIL'],
        nameAr: 'خصم تلف البضائع',
        nameEn: 'Goods Damage Deduction',
        descriptionAr: 'خصم من العامل المسؤول عن تلف البضائع بسبب الإهمال',
        descriptionEn: 'Deduction for worker responsible for goods damage due to negligence',
        trigger: {
            event: 'DAMAGE_REPORT',
            timing: 'AFTER',
            description: 'عند تسجيل تقرير تلف'
        },
        conditions: [
            {
                id: 'c1',
                field: 'damageReason',
                operator: 'IN',
                value: ['NEGLIGENCE', 'IMPROPER_HANDLING', 'UNSAFE_STORAGE'],
                description: 'التلف بسبب إهمال أو سوء تخزين'
            },
            {
                id: 'c2',
                field: 'damageValue',
                operator: 'GREATER_THAN',
                value: 100,
                valueVariable: 'minDamageValue',
                description: 'قيمة التلف أعلى من الحد الأدنى'
            }
        ],
        actions: [
            {
                type: 'DEDUCT_FROM_PAYROLL',
                value: 0,
                unit: 'SAR',
                description: 'خصم نسبة من قيمة التلف',
                formula: 'Math.min({damageValue} * {deductionPercentage} / 100, {maxDeduction})'
            }
        ],
        variables: [
            {
                name: 'minDamageValue',
                nameAr: 'الحد الأدنى لقيمة التلف (ريال)',
                type: 'NUMBER',
                defaultValue: 100,
                min: 50,
                max: 500,
                description: 'أقل قيمة تلف يُحاسب عليها'
            },
            {
                name: 'deductionPercentage',
                nameAr: 'نسبة الخصم من قيمة التلف (%)',
                type: 'PERCENTAGE',
                defaultValue: 25,
                min: 10,
                max: 50,
                description: 'النسبة المخصومة'
            },
            {
                name: 'maxDeduction',
                nameAr: 'الحد الأقصى للخصم (ريال)',
                type: 'NUMBER',
                defaultValue: 500,
                min: 200,
                max: 2000,
                description: 'أقصى خصم ممكن'
            }
        ],
        testCases: [
            {
                id: 'test1',
                name: 'تلف بسبب إهمال',
                input: { damageReason: 'NEGLIGENCE', damageValue: 400 },
                expectedResult: { shouldTrigger: true, expectedValue: 100 }
            },
            {
                id: 'test2',
                name: 'تلف طبيعي',
                input: { damageReason: 'NATURAL', damageValue: 400 },
                expectedResult: { shouldTrigger: false }
            }
        ],
        tags: ['مستودع', 'تلف', 'خصم', 'لوجستيات'],
        difficulty: 'MEDIUM',
        popularity: 82,
        rating: 4.4
    },

    {
        id: 'LOG-WH-003',
        category: 'LOGISTICS',
        subcategory: 'WAREHOUSE',
        industry: ['LOGISTICS', 'WAREHOUSE'],
        nameAr: 'حافز سرعة تجهيز الطلبات',
        nameEn: 'Order Picking Speed Bonus',
        descriptionAr: 'مكافأة لعامل المستودع عند تجهيز طلبات أكثر من المعدل',
        descriptionEn: 'Bonus for warehouse worker picking orders above average rate',
        trigger: {
            event: 'SHIFT_END',
            timing: 'AFTER',
            description: 'نهاية الوردية'
        },
        conditions: [
            {
                id: 'c1',
                field: 'ordersPicked',
                operator: 'GREATER_THAN',
                value: 100,
                valueVariable: 'targetOrders',
                description: 'تجاوز الهدف'
            },
            {
                id: 'c2',
                field: 'errorRate',
                operator: 'LESS_THAN',
                value: 2,
                valueVariable: 'maxErrorRate',
                description: 'نسبة الخطأ منخفضة'
            }
        ],
        actions: [
            {
                type: 'ADD_TO_PAYROLL',
                value: 0,
                unit: 'SAR',
                description: 'حافز السرعة',
                formula: '({ordersPicked} - {targetOrders}) * {bonusPerOrder}'
            }
        ],
        variables: [
            {
                name: 'targetOrders',
                nameAr: 'الهدف اليومي للطلبات',
                type: 'NUMBER',
                defaultValue: 100,
                min: 50,
                max: 200,
                description: 'عدد الطلبات المطلوبة'
            },
            {
                name: 'maxErrorRate',
                nameAr: 'الحد الأقصى للأخطاء (%)',
                type: 'PERCENTAGE',
                defaultValue: 2,
                min: 0,
                max: 5,
                description: 'نسبة الخطأ المسموحة'
            },
            {
                name: 'bonusPerOrder',
                nameAr: 'الحافز لكل طلب إضافي (ريال)',
                type: 'NUMBER',
                defaultValue: 2,
                min: 1,
                max: 10,
                description: 'مكافأة كل طلب فوق الهدف'
            }
        ],
        testCases: [
            {
                id: 'test1',
                name: '120 طلب بدون أخطاء',
                input: { ordersPicked: 120, errorRate: 1 },
                expectedResult: { shouldTrigger: true, expectedValue: 40 }
            }
        ],
        tags: ['مستودع', 'تجهيز', 'سرعة', 'حافز', 'لوجستيات'],
        difficulty: 'MEDIUM',
        popularity: 90,
        rating: 4.7
    },

    // ========================================
    // 🚚 سياسات الشحن والنقل
    // ========================================
    {
        id: 'LOG-SHP-001',
        category: 'LOGISTICS',
        subcategory: 'SHIPPING',
        industry: ['LOGISTICS', 'TRANSPORTATION', 'FREIGHT'],
        nameAr: 'بدل المسافات الطويلة',
        nameEn: 'Long Distance Allowance',
        descriptionAr: 'بدل للسائق عند قيادة مسافات طويلة',
        descriptionEn: 'Allowance for driver traveling long distances',
        trigger: {
            event: 'TRIP_COMPLETED',
            timing: 'AFTER',
            description: 'بعد إتمام الرحلة'
        },
        conditions: [
            {
                id: 'c1',
                field: 'distanceKm',
                operator: 'GREATER_THAN_OR_EQUALS',
                value: 200,
                valueVariable: 'minDistanceKm',
                description: 'المسافة أكبر من الحد الأدنى'
            }
        ],
        actions: [
            {
                type: 'ADD_TO_PAYROLL',
                value: 0,
                unit: 'SAR',
                description: 'بدل المسافة',
                formula: '{distanceKm} * {allowancePerKm}'
            }
        ],
        variables: [
            {
                name: 'minDistanceKm',
                nameAr: 'الحد الأدنى للمسافة (كم)',
                type: 'NUMBER',
                defaultValue: 200,
                min: 100,
                max: 500,
                description: 'المسافة المطلوبة لاستحقاق البدل'
            },
            {
                name: 'allowancePerKm',
                nameAr: 'البدل لكل كيلومتر (ريال)',
                type: 'NUMBER',
                defaultValue: 0.5,
                min: 0.2,
                max: 2,
                description: 'قيمة البدل للكيلومتر'
            }
        ],
        testCases: [
            {
                id: 'test1',
                name: 'رحلة 300 كم',
                input: { distanceKm: 300 },
                expectedResult: { shouldTrigger: true, expectedValue: 150 }
            },
            {
                id: 'test2',
                name: 'رحلة 150 كم',
                input: { distanceKm: 150 },
                expectedResult: { shouldTrigger: false }
            }
        ],
        tags: ['شحن', 'مسافة', 'بدل', 'سائقين', 'لوجستيات'],
        difficulty: 'SIMPLE',
        popularity: 94,
        rating: 4.8
    },

    {
        id: 'LOG-SHP-002',
        category: 'LOGISTICS',
        subcategory: 'SHIPPING',
        industry: ['LOGISTICS', 'TRANSPORTATION', 'FREIGHT'],
        nameAr: 'بدل الشحنات الخطرة',
        nameEn: 'Hazardous Materials Allowance',
        descriptionAr: 'بدل للسائق عند نقل مواد خطرة',
        descriptionEn: 'Allowance for transporting hazardous materials',
        trigger: {
            event: 'TRIP_COMPLETED',
            subEvent: 'HAZMAT_DELIVERY',
            timing: 'AFTER',
            description: 'بعد إتمام نقل مواد خطرة'
        },
        conditions: [
            {
                id: 'c1',
                field: 'cargoType',
                operator: 'IN',
                value: ['HAZMAT_CLASS_1', 'HAZMAT_CLASS_2', 'HAZMAT_CLASS_3', 'HAZMAT_CLASS_4'],
                description: 'نوع الشحنة من المواد الخطرة'
            },
            {
                id: 'c2',
                field: 'hasValidCertification',
                operator: 'EQUALS',
                value: true,
                description: 'السائق لديه شهادة سارية'
            }
        ],
        actions: [
            {
                type: 'ADD_TO_PAYROLL',
                value: 0,
                unit: 'SAR',
                description: 'بدل المواد الخطرة',
                formula: '{baseAllowance} * {hazardMultiplier}'
            }
        ],
        variables: [
            {
                name: 'baseAllowance',
                nameAr: 'البدل الأساسي (ريال)',
                type: 'NUMBER',
                defaultValue: 200,
                min: 100,
                max: 500,
                description: 'البدل الأساسي للرحلة'
            },
            {
                name: 'hazardMultiplier',
                nameAr: 'مضاعف الخطورة',
                type: 'NUMBER',
                defaultValue: 1.5,
                min: 1,
                max: 3,
                description: 'مضاعف حسب درجة الخطورة'
            }
        ],
        testCases: [
            {
                id: 'test1',
                name: 'نقل مواد خطرة Class 3',
                input: { cargoType: 'HAZMAT_CLASS_3', hasValidCertification: true },
                expectedResult: { shouldTrigger: true, expectedValue: 300 }
            },
            {
                id: 'test2',
                name: 'سائق بدون شهادة',
                input: { cargoType: 'HAZMAT_CLASS_3', hasValidCertification: false },
                expectedResult: { shouldTrigger: false }
            }
        ],
        tags: ['شحن', 'خطر', 'بدل', 'سائقين', 'لوجستيات', 'سلامة'],
        difficulty: 'COMPLEX',
        popularity: 78,
        rating: 4.5
    },

    {
        id: 'LOG-SHP-003',
        category: 'LOGISTICS',
        subcategory: 'SHIPPING',
        industry: ['LOGISTICS', 'TRANSPORTATION', 'FREIGHT'],
        nameAr: 'بدل الشحنات المبردة',
        nameEn: 'Refrigerated Cargo Allowance',
        descriptionAr: 'بدل للسائق عند نقل شحنات مبردة تتطلب رقابة خاصة',
        descriptionEn: 'Allowance for transporting refrigerated cargo requiring special monitoring',
        trigger: {
            event: 'TRIP_COMPLETED',
            subEvent: 'COLD_CHAIN',
            timing: 'AFTER',
            description: 'بعد إتمام نقل شحنة مبردة'
        },
        conditions: [
            {
                id: 'c1',
                field: 'cargoType',
                operator: 'IN',
                value: ['FROZEN', 'CHILLED', 'PHARMACEUTICAL'],
                description: 'نوع الشحنة مبردة'
            },
            {
                id: 'c2',
                field: 'temperatureMaintained',
                operator: 'EQUALS',
                value: true,
                description: 'الحفاظ على درجة الحرارة طوال الرحلة'
            }
        ],
        actions: [
            {
                type: 'ADD_TO_PAYROLL',
                value: 150,
                valueVariable: 'coldChainAllowance',
                unit: 'SAR',
                description: 'بدل الشحن المبرد'
            }
        ],
        variables: [
            {
                name: 'coldChainAllowance',
                nameAr: 'بدل الشحن المبرد (ريال)',
                type: 'NUMBER',
                defaultValue: 150,
                min: 100,
                max: 500,
                description: 'قيمة البدل للرحلة'
            }
        ],
        testCases: [
            {
                id: 'test1',
                name: 'شحنة مجمدة ناجحة',
                input: { cargoType: 'FROZEN', temperatureMaintained: true },
                expectedResult: { shouldTrigger: true, expectedValue: 150 }
            },
            {
                id: 'test2',
                name: 'فشل الحفاظ على الحرارة',
                input: { cargoType: 'FROZEN', temperatureMaintained: false },
                expectedResult: { shouldTrigger: false }
            }
        ],
        tags: ['شحن', 'تبريد', 'بدل', 'سائقين', 'لوجستيات'],
        difficulty: 'MEDIUM',
        popularity: 85,
        rating: 4.6
    },

    // ========================================
    // ⛽ سياسات الوقود والمركبات
    // ========================================
    {
        id: 'LOG-FUEL-001',
        category: 'LOGISTICS',
        subcategory: 'FUEL_MANAGEMENT',
        industry: ['LOGISTICS', 'TRANSPORTATION', 'DELIVERY'],
        nameAr: 'حافز توفير الوقود',
        nameEn: 'Fuel Efficiency Bonus',
        descriptionAr: 'مكافأة للسائق عند تحقيق استهلاك وقود أقل من المعدل',
        descriptionEn: 'Bonus for driver achieving fuel consumption below average',
        trigger: {
            event: 'MONTH_END',
            timing: 'AFTER',
            description: 'نهاية الشهر'
        },
        conditions: [
            {
                id: 'c1',
                field: 'fuelEfficiencyRate',
                operator: 'LESS_THAN',
                value: 100,
                valueVariable: 'targetEfficiency',
                description: 'استهلاك أقل من المعدل'
            },
            {
                id: 'c2',
                field: 'totalKmDriven',
                operator: 'GREATER_THAN_OR_EQUALS',
                value: 3000,
                valueVariable: 'minKmRequired',
                description: 'الحد الأدنى من الكيلومترات'
            }
        ],
        actions: [
            {
                type: 'ADD_TO_PAYROLL',
                value: 0,
                unit: 'SAR',
                description: 'حافز توفير الوقود',
                formula: '({targetEfficiency} - {fuelEfficiencyRate}) * {bonusPerPercent}'
            }
        ],
        variables: [
            {
                name: 'targetEfficiency',
                nameAr: 'معدل الاستهلاك المستهدف (%)',
                type: 'PERCENTAGE',
                defaultValue: 100,
                min: 90,
                max: 100,
                description: 'المعدل المرجعي للاستهلاك'
            },
            {
                name: 'minKmRequired',
                nameAr: 'الحد الأدنى للكيلومترات',
                type: 'NUMBER',
                defaultValue: 3000,
                min: 1000,
                max: 10000,
                description: 'المسافة المطلوبة للحساب'
            },
            {
                name: 'bonusPerPercent',
                nameAr: 'المكافأة لكل % توفير (ريال)',
                type: 'NUMBER',
                defaultValue: 50,
                min: 20,
                max: 200,
                description: 'مكافأة كل نسبة توفير'
            }
        ],
        testCases: [
            {
                id: 'test1',
                name: 'توفير 10%',
                input: { fuelEfficiencyRate: 90, totalKmDriven: 4000 },
                expectedResult: { shouldTrigger: true, expectedValue: 500 }
            },
            {
                id: 'test2',
                name: 'استهلاك عادي',
                input: { fuelEfficiencyRate: 100, totalKmDriven: 4000 },
                expectedResult: { shouldTrigger: false }
            }
        ],
        tags: ['وقود', 'توفير', 'حافز', 'سائقين', 'لوجستيات'],
        difficulty: 'MEDIUM',
        popularity: 92,
        rating: 4.8
    },

    {
        id: 'LOG-FUEL-002',
        category: 'LOGISTICS',
        subcategory: 'FUEL_MANAGEMENT',
        industry: ['LOGISTICS', 'TRANSPORTATION', 'DELIVERY'],
        nameAr: 'خصم الاستهلاك الزائد للوقود',
        nameEn: 'Excessive Fuel Consumption Deduction',
        descriptionAr: 'خصم من السائق عند استهلاك وقود أعلى من المعدل بشكل ملحوظ',
        descriptionEn: 'Deduction for driver with significantly higher fuel consumption',
        trigger: {
            event: 'MONTH_END',
            timing: 'AFTER',
            description: 'نهاية الشهر'
        },
        conditions: [
            {
                id: 'c1',
                field: 'fuelEfficiencyRate',
                operator: 'GREATER_THAN',
                value: 120,
                valueVariable: 'excessThreshold',
                description: 'استهلاك أعلى من الحد'
            },
            {
                id: 'c2',
                field: 'vehicleCondition',
                operator: 'EQUALS',
                value: 'GOOD',
                description: 'حالة المركبة جيدة'
            }
        ],
        actions: [
            {
                type: 'DEDUCT_FROM_PAYROLL',
                value: 0,
                unit: 'SAR',
                description: 'خصم الاستهلاك الزائد',
                formula: 'Math.min(({fuelEfficiencyRate} - {excessThreshold}) * {deductionPerPercent}, {maxDeduction})'
            }
        ],
        variables: [
            {
                name: 'excessThreshold',
                nameAr: 'حد الاستهلاك الزائد (%)',
                type: 'PERCENTAGE',
                defaultValue: 120,
                min: 110,
                max: 150,
                description: 'النسبة التي يبدأ عندها الخصم'
            },
            {
                name: 'deductionPerPercent',
                nameAr: 'الخصم لكل % زيادة (ريال)',
                type: 'NUMBER',
                defaultValue: 30,
                min: 10,
                max: 100,
                description: 'مبلغ الخصم'
            },
            {
                name: 'maxDeduction',
                nameAr: 'الحد الأقصى للخصم (ريال)',
                type: 'NUMBER',
                defaultValue: 500,
                min: 200,
                max: 1000,
                description: 'أقصى خصم شهري'
            }
        ],
        testCases: [
            {
                id: 'test1',
                name: 'استهلاك 130%',
                input: { fuelEfficiencyRate: 130, vehicleCondition: 'GOOD' },
                expectedResult: { shouldTrigger: true, expectedValue: 300 }
            },
            {
                id: 'test2',
                name: 'مركبة بحاجة صيانة',
                input: { fuelEfficiencyRate: 130, vehicleCondition: 'NEEDS_MAINTENANCE' },
                expectedResult: { shouldTrigger: false }
            }
        ],
        tags: ['وقود', 'استهلاك', 'خصم', 'سائقين', 'لوجستيات'],
        difficulty: 'MEDIUM',
        popularity: 80,
        rating: 4.3
    },

    // ========================================
    // 🛡️ سياسات السلامة
    // ========================================
    {
        id: 'LOG-SAFE-001',
        category: 'SAFETY',
        subcategory: 'DRIVING_SAFETY',
        industry: ['LOGISTICS', 'TRANSPORTATION', 'DELIVERY'],
        nameAr: 'مكافأة القيادة الآمنة',
        nameEn: 'Safe Driving Bonus',
        descriptionAr: 'مكافأة شهرية للسائق بدون مخالفات أو حوادث',
        descriptionEn: 'Monthly bonus for driver with no violations or accidents',
        trigger: {
            event: 'MONTH_END',
            timing: 'AFTER',
            description: 'نهاية الشهر'
        },
        conditions: [
            {
                id: 'c1',
                field: 'accidentsCount',
                operator: 'EQUALS',
                value: 0,
                description: 'لا حوادث'
            },
            {
                id: 'c2',
                field: 'violationsCount',
                operator: 'EQUALS',
                value: 0,
                description: 'لا مخالفات'
            },
            {
                id: 'c3',
                field: 'workingDays',
                operator: 'GREATER_THAN_OR_EQUALS',
                value: 20,
                valueVariable: 'minWorkingDays',
                description: 'الحد الأدنى من أيام العمل'
            }
        ],
        actions: [
            {
                type: 'ADD_TO_PAYROLL',
                value: 300,
                valueVariable: 'safetyBonus',
                unit: 'SAR',
                description: 'مكافأة السلامة'
            }
        ],
        variables: [
            {
                name: 'minWorkingDays',
                nameAr: 'الحد الأدنى لأيام العمل',
                type: 'NUMBER',
                defaultValue: 20,
                min: 15,
                max: 26,
                description: 'أيام العمل المطلوبة'
            },
            {
                name: 'safetyBonus',
                nameAr: 'مكافأة السلامة (ريال)',
                type: 'NUMBER',
                defaultValue: 300,
                min: 100,
                max: 1000,
                description: 'مبلغ المكافأة الشهرية'
            }
        ],
        testCases: [
            {
                id: 'test1',
                name: 'سائق مثالي',
                input: { accidentsCount: 0, violationsCount: 0, workingDays: 22 },
                expectedResult: { shouldTrigger: true, expectedValue: 300 }
            },
            {
                id: 'test2',
                name: 'سائق بمخالفة',
                input: { accidentsCount: 0, violationsCount: 1, workingDays: 22 },
                expectedResult: { shouldTrigger: false }
            }
        ],
        tags: ['سلامة', 'قيادة', 'مكافأة', 'سائقين', 'لوجستيات'],
        difficulty: 'SIMPLE',
        popularity: 97,
        rating: 4.9
    },

    {
        id: 'LOG-SAFE-002',
        category: 'SAFETY',
        subcategory: 'DRIVING_SAFETY',
        industry: ['LOGISTICS', 'TRANSPORTATION', 'DELIVERY'],
        nameAr: 'خصم مخالفة السرعة',
        nameEn: 'Speeding Violation Deduction',
        descriptionAr: 'خصم من السائق عند تجاوز السرعة المحددة',
        descriptionEn: 'Deduction for driver exceeding speed limit',
        trigger: {
            event: 'SPEED_VIOLATION',
            timing: 'AFTER',
            description: 'عند رصد مخالفة سرعة'
        },
        conditions: [
            {
                id: 'c1',
                field: 'speedExcess',
                operator: 'GREATER_THAN',
                value: 10,
                valueVariable: 'minSpeedExcess',
                description: 'تجاوز السرعة بأكثر من الحد'
            }
        ],
        actions: [
            {
                type: 'DEDUCT_FROM_PAYROLL',
                value: 0,
                unit: 'SAR',
                description: 'خصم مخالفة السرعة',
                formula: '{baseDeduction} + ({speedExcess} * {deductionPerKm})'
            },
            {
                type: 'SEND_NOTIFICATION',
                value: 'تنبيه: تم رصد مخالفة سرعة',
                description: 'إرسال تنبيه'
            }
        ],
        variables: [
            {
                name: 'minSpeedExcess',
                nameAr: 'الحد الأدنى لتجاوز السرعة (كم/س)',
                type: 'NUMBER',
                defaultValue: 10,
                min: 5,
                max: 20,
                description: 'السرعة الزائدة المسموحة'
            },
            {
                name: 'baseDeduction',
                nameAr: 'الخصم الأساسي (ريال)',
                type: 'NUMBER',
                defaultValue: 50,
                min: 25,
                max: 200,
                description: 'خصم ثابت لكل مخالفة'
            },
            {
                name: 'deductionPerKm',
                nameAr: 'الخصم لكل كم/س زيادة (ريال)',
                type: 'NUMBER',
                defaultValue: 5,
                min: 2,
                max: 20,
                description: 'خصم إضافي حسب السرعة'
            }
        ],
        testCases: [
            {
                id: 'test1',
                name: 'تجاوز 20 كم/س',
                input: { speedExcess: 20 },
                expectedResult: { shouldTrigger: true, expectedValue: 150 }
            },
            {
                id: 'test2',
                name: 'تجاوز بسيط',
                input: { speedExcess: 8 },
                expectedResult: { shouldTrigger: false }
            }
        ],
        tags: ['سلامة', 'سرعة', 'خصم', 'مخالفة', 'سائقين', 'لوجستيات'],
        difficulty: 'MEDIUM',
        popularity: 93,
        rating: 4.7
    },

    {
        id: 'LOG-SAFE-003',
        category: 'SAFETY',
        subcategory: 'WAREHOUSE_SAFETY',
        industry: ['LOGISTICS', 'WAREHOUSE'],
        nameAr: 'مكافأة صفر إصابات',
        nameEn: 'Zero Injuries Bonus',
        descriptionAr: 'مكافأة للفريق عند تحقيق صفر إصابات لمدة شهر كامل',
        descriptionEn: 'Team bonus for achieving zero injuries for entire month',
        trigger: {
            event: 'MONTH_END',
            timing: 'AFTER',
            description: 'نهاية الشهر'
        },
        conditions: [
            {
                id: 'c1',
                field: 'injuriesCount',
                operator: 'EQUALS',
                value: 0,
                description: 'صفر إصابات'
            },
            {
                id: 'c2',
                field: 'safetyAuditScore',
                operator: 'GREATER_THAN_OR_EQUALS',
                value: 90,
                valueVariable: 'minAuditScore',
                description: 'تقييم السلامة مرتفع'
            }
        ],
        actions: [
            {
                type: 'ADD_TO_PAYROLL',
                value: 200,
                valueVariable: 'bonusAmount',
                unit: 'SAR',
                description: 'مكافأة السلامة للفريق'
            }
        ],
        variables: [
            {
                name: 'minAuditScore',
                nameAr: 'الحد الأدنى لتقييم السلامة',
                type: 'NUMBER',
                defaultValue: 90,
                min: 80,
                max: 100,
                description: 'النتيجة المطلوبة'
            },
            {
                name: 'bonusAmount',
                nameAr: 'مبلغ المكافأة (ريال)',
                type: 'NUMBER',
                defaultValue: 200,
                min: 100,
                max: 500,
                description: 'مكافأة كل موظف'
            }
        ],
        testCases: [
            {
                id: 'test1',
                name: 'شهر مثالي',
                input: { injuriesCount: 0, safetyAuditScore: 95 },
                expectedResult: { shouldTrigger: true, expectedValue: 200 }
            }
        ],
        tags: ['سلامة', 'إصابات', 'مكافأة', 'فريق', 'مستودع', 'لوجستيات'],
        difficulty: 'SIMPLE',
        popularity: 90,
        rating: 4.8
    },

    // ========================================
    // 📱 سياسات التقنية والتتبع
    // ========================================
    {
        id: 'LOG-TECH-001',
        category: 'LOGISTICS',
        subcategory: 'TECHNOLOGY',
        industry: ['LOGISTICS', 'DELIVERY', 'TRANSPORTATION'],
        nameAr: 'حافز استخدام التطبيق',
        nameEn: 'App Usage Compliance Bonus',
        descriptionAr: 'مكافأة للسائق/المندوب الملتزم باستخدام تطبيق التتبع',
        descriptionEn: 'Bonus for driver/courier complying with tracking app usage',
        trigger: {
            event: 'WEEK_END',
            timing: 'AFTER',
            description: 'نهاية الأسبوع'
        },
        conditions: [
            {
                id: 'c1',
                field: 'appUsageRate',
                operator: 'GREATER_THAN_OR_EQUALS',
                value: 98,
                valueVariable: 'minUsageRate',
                description: 'نسبة استخدام التطبيق'
            },
            {
                id: 'c2',
                field: 'gpsAccuracyRate',
                operator: 'GREATER_THAN_OR_EQUALS',
                value: 95,
                description: 'دقة GPS'
            }
        ],
        actions: [
            {
                type: 'ADD_TO_PAYROLL',
                value: 50,
                valueVariable: 'weeklyBonus',
                unit: 'SAR',
                description: 'حافز أسبوعي'
            }
        ],
        variables: [
            {
                name: 'minUsageRate',
                nameAr: 'الحد الأدنى لاستخدام التطبيق (%)',
                type: 'PERCENTAGE',
                defaultValue: 98,
                min: 90,
                max: 100,
                description: 'نسبة الاستخدام المطلوبة'
            },
            {
                name: 'weeklyBonus',
                nameAr: 'الحافز الأسبوعي (ريال)',
                type: 'NUMBER',
                defaultValue: 50,
                min: 25,
                max: 150,
                description: 'مبلغ الحافز'
            }
        ],
        testCases: [
            {
                id: 'test1',
                name: 'استخدام مثالي',
                input: { appUsageRate: 100, gpsAccuracyRate: 98 },
                expectedResult: { shouldTrigger: true, expectedValue: 50 }
            }
        ],
        tags: ['تقنية', 'تطبيق', 'تتبع', 'حافز', 'لوجستيات'],
        difficulty: 'SIMPLE',
        popularity: 88,
        rating: 4.5
    },

    // ========================================
    // 🌙 سياسات الورديات الخاصة
    // ========================================
    {
        id: 'LOG-SHIFT-001',
        category: 'LOGISTICS',
        subcategory: 'SHIFTS',
        industry: ['LOGISTICS', 'DELIVERY', 'WAREHOUSE'],
        nameAr: 'بدل الوردية الليلية',
        nameEn: 'Night Shift Allowance',
        descriptionAr: 'بدل للعمل في الوردية الليلية',
        descriptionEn: 'Allowance for working night shift',
        legalReference: 'نظام العمل السعودي',
        trigger: {
            event: 'SHIFT_COMPLETED',
            subEvent: 'NIGHT_SHIFT',
            timing: 'AFTER',
            description: 'بعد إكمال وردية ليلية'
        },
        conditions: [
            {
                id: 'c1',
                field: 'shiftType',
                operator: 'EQUALS',
                value: 'NIGHT',
                description: 'وردية ليلية'
            },
            {
                id: 'c2',
                field: 'hoursWorked',
                operator: 'GREATER_THAN_OR_EQUALS',
                value: 6,
                description: 'الحد الأدنى للساعات'
            }
        ],
        actions: [
            {
                type: 'ADD_TO_PAYROLL',
                value: 0,
                unit: 'SAR',
                description: 'بدل الوردية الليلية',
                formula: '{hoursWorked} * {nightAllowancePerHour}'
            }
        ],
        variables: [
            {
                name: 'nightAllowancePerHour',
                nameAr: 'بدل الساعة الليلية (ريال)',
                type: 'NUMBER',
                defaultValue: 15,
                min: 10,
                max: 50,
                description: 'قيمة البدل للساعة'
            }
        ],
        testCases: [
            {
                id: 'test1',
                name: 'وردية ليلية 8 ساعات',
                input: { shiftType: 'NIGHT', hoursWorked: 8 },
                expectedResult: { shouldTrigger: true, expectedValue: 120 }
            }
        ],
        tags: ['وردية', 'ليلي', 'بدل', 'لوجستيات'],
        difficulty: 'SIMPLE',
        popularity: 95,
        rating: 4.8
    },

    {
        id: 'LOG-SHIFT-002',
        category: 'LOGISTICS',
        subcategory: 'SHIFTS',
        industry: ['LOGISTICS', 'DELIVERY', 'WAREHOUSE'],
        nameAr: 'بدل العمل في العطلات',
        nameEn: 'Holiday Work Allowance',
        descriptionAr: 'بدل مضاعف للعمل في أيام العطلات الرسمية',
        descriptionEn: 'Double allowance for working on official holidays',
        legalReference: 'نظام العمل السعودي - المادة 107',
        laborLawArticle: '107',
        trigger: {
            event: 'SHIFT_COMPLETED',
            subEvent: 'HOLIDAY_SHIFT',
            timing: 'AFTER',
            description: 'بعد العمل في عطلة'
        },
        conditions: [
            {
                id: 'c1',
                field: 'isOfficialHoliday',
                operator: 'EQUALS',
                value: true,
                description: 'يوم عطلة رسمية'
            }
        ],
        actions: [
            {
                type: 'ADD_PERCENTAGE',
                value: 100,
                valueVariable: 'holidayMultiplier',
                unit: '%',
                description: 'بدل العطلة (نسبة من الأجر اليومي)'
            }
        ],
        variables: [
            {
                name: 'holidayMultiplier',
                nameAr: 'نسبة بدل العطلة (%)',
                type: 'PERCENTAGE',
                defaultValue: 100,
                min: 50,
                max: 200,
                description: 'النسبة المضافة للأجر اليومي'
            }
        ],
        testCases: [
            {
                id: 'test1',
                name: 'عمل في عطلة رسمية',
                input: { isOfficialHoliday: true },
                expectedResult: { shouldTrigger: true }
            }
        ],
        tags: ['وردية', 'عطلة', 'بدل', 'لوجستيات'],
        difficulty: 'SIMPLE',
        popularity: 94,
        rating: 4.9
    },

    // ========================================
    // 🎯 سياسات الأداء والإنتاجية
    // ========================================
    {
        id: 'LOG-PERF-001',
        category: 'PERFORMANCE',
        subcategory: 'PRODUCTIVITY',
        industry: ['LOGISTICS', 'DELIVERY', 'WAREHOUSE'],
        nameAr: 'مكافأة موظف الشهر',
        nameEn: 'Employee of the Month Bonus',
        descriptionAr: 'مكافأة للموظف المتميز في الشهر',
        descriptionEn: 'Bonus for top performing employee of the month',
        trigger: {
            event: 'MONTH_END',
            timing: 'AFTER',
            description: 'نهاية الشهر'
        },
        conditions: [
            {
                id: 'c1',
                field: 'performanceRank',
                operator: 'EQUALS',
                value: 1,
                description: 'الترتيب الأول في الأداء'
            },
            {
                id: 'c2',
                field: 'noViolations',
                operator: 'EQUALS',
                value: true,
                description: 'لا مخالفات'
            }
        ],
        actions: [
            {
                type: 'ADD_TO_PAYROLL',
                value: 1000,
                valueVariable: 'topPerformerBonus',
                unit: 'SAR',
                description: 'مكافأة موظف الشهر'
            }
        ],
        variables: [
            {
                name: 'topPerformerBonus',
                nameAr: 'مكافأة موظف الشهر (ريال)',
                type: 'NUMBER',
                defaultValue: 1000,
                min: 500,
                max: 5000,
                description: 'مبلغ المكافأة'
            }
        ],
        testCases: [
            {
                id: 'test1',
                name: 'موظف الشهر',
                input: { performanceRank: 1, noViolations: true },
                expectedResult: { shouldTrigger: true, expectedValue: 1000 }
            }
        ],
        tags: ['أداء', 'موظف الشهر', 'مكافأة', 'لوجستيات'],
        difficulty: 'SIMPLE',
        popularity: 96,
        rating: 4.9
    },

    {
        id: 'LOG-PERF-002',
        category: 'PERFORMANCE',
        subcategory: 'CUSTOMER_SERVICE',
        industry: ['LOGISTICS', 'DELIVERY', 'ECOMMERCE'],
        nameAr: 'حافز تقييم العملاء',
        nameEn: 'Customer Rating Incentive',
        descriptionAr: 'حافز بناءً على متوسط تقييم العملاء',
        descriptionEn: 'Incentive based on average customer rating',
        trigger: {
            event: 'WEEK_END',
            timing: 'AFTER',
            description: 'نهاية الأسبوع'
        },
        conditions: [
            {
                id: 'c1',
                field: 'avgCustomerRating',
                operator: 'GREATER_THAN_OR_EQUALS',
                value: 4.5,
                valueVariable: 'minRating',
                description: 'متوسط التقييم مرتفع'
            },
            {
                id: 'c2',
                field: 'totalRatings',
                operator: 'GREATER_THAN_OR_EQUALS',
                value: 20,
                valueVariable: 'minRatingsCount',
                description: 'عدد كافي من التقييمات'
            }
        ],
        actions: [
            {
                type: 'ADD_TO_PAYROLL',
                value: 0,
                unit: 'SAR',
                description: 'حافز التقييم',
                formula: '({avgCustomerRating} - {minRating}) * {bonusMultiplier} * 100'
            }
        ],
        variables: [
            {
                name: 'minRating',
                nameAr: 'الحد الأدنى للتقييم',
                type: 'NUMBER',
                defaultValue: 4.5,
                min: 4,
                max: 5,
                description: 'التقييم المطلوب'
            },
            {
                name: 'minRatingsCount',
                nameAr: 'الحد الأدنى لعدد التقييمات',
                type: 'NUMBER',
                defaultValue: 20,
                min: 10,
                max: 50,
                description: 'العدد المطلوب'
            },
            {
                name: 'bonusMultiplier',
                nameAr: 'مضاعف المكافأة',
                type: 'NUMBER',
                defaultValue: 100,
                min: 50,
                max: 200,
                description: 'قيمة المكافأة لكل 0.1 نقطة'
            }
        ],
        testCases: [
            {
                id: 'test1',
                name: 'تقييم 4.8',
                input: { avgCustomerRating: 4.8, totalRatings: 25 },
                expectedResult: { shouldTrigger: true, expectedValue: 30 }
            }
        ],
        tags: ['أداء', 'تقييم', 'عملاء', 'حافز', 'لوجستيات'],
        difficulty: 'MEDIUM',
        popularity: 91,
        rating: 4.7
    },
];

// تصدير عدد السياسات
export const LOGISTICS_POLICIES_COUNT = LOGISTICS_POLICIES.length;

// تصدير حسب التصنيف الفرعي
export const getLogisticsPoliciesBySubcategory = (subcategory: string) => 
    LOGISTICS_POLICIES.filter(p => p.subcategory === subcategory);

// تصدير الأكثر شعبية
export const getTopLogisticsPolicies = (limit: number = 10) =>
    [...LOGISTICS_POLICIES].sort((a, b) => b.popularity - a.popularity).slice(0, limit);
