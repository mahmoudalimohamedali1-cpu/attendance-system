import { PolicyTemplate } from '../policy-generator.service';

/**
 * 📦 سياسات العهد
 * 
 * تغطي:
 * - تسليم واستلام العهد
 * - صيانة العهد
 * - نقل العهد بين الموظفين
 * - تلف وفقدان العهد
 * - جرد العهد
 */

export const CUSTODY_POLICIES: PolicyTemplate[] = [
    // ========================================
    // 📋 تسليم العهد
    // ========================================
    {
        id: 'CUS-ASN-001',
        category: 'COMPLIANCE',
        subcategory: 'CUSTODY_ASSIGNMENT',
        industry: ['ALL'],
        nameAr: 'تسليم العهد الجديدة',
        nameEn: 'New Custody Assignment',
        descriptionAr: 'إجراءات تسليم عهدة جديدة للموظف مع توثيق الاستلام',
        descriptionEn: 'Procedures for assigning new custody to employee with receipt documentation',
        trigger: { event: 'CUSTODY_ASSIGNED', timing: 'AFTER', description: 'بعد تسليم العهدة' },
        conditions: [
            { id: 'c1', field: 'employeeStatus', operator: 'EQUALS', value: 'ACTIVE', description: 'موظف نشط' },
            { id: 'c2', field: 'itemCondition', operator: 'EQUALS', value: 'NEW', description: 'عهدة جديدة' }
        ],
        actions: [
            { type: 'CREATE_TASK', value: 'توقيع استلام العهدة', description: 'مهمة للموظف' },
            { type: 'SEND_NOTIFICATION', value: 'تم تسليمك عهدة جديدة', description: 'إشعار للموظف' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'تسليم لابتوب', input: { employeeStatus: 'ACTIVE', itemCondition: 'NEW' }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['عهدة', 'تسليم', 'استلام'],
        difficulty: 'SIMPLE',
        popularity: 95,
        rating: 4.9
    },

    {
        id: 'CUS-ASN-002',
        category: 'COMPLIANCE',
        subcategory: 'CUSTODY_ASSIGNMENT',
        industry: ['ALL'],
        nameAr: 'حد أقصى للعهد المسلمة',
        nameEn: 'Maximum Custody Items Limit',
        descriptionAr: 'تحديد الحد الأقصى للعهد التي يمكن تسليمها لموظف واحد',
        descriptionEn: 'Set maximum custody items that can be assigned to one employee',
        trigger: { event: 'CUSTODY_ASSIGNMENT_REQUESTED', timing: 'BEFORE', description: 'قبل تسليم عهدة' },
        conditions: [
            { id: 'c1', field: 'currentCustodyCount', operator: 'GREATER_THAN_OR_EQUALS', value: 10, valueVariable: 'maxCustodyItems', description: 'تجاوز الحد' }
        ],
        actions: [
            { type: 'SET_VALUE', value: 'REJECTED', description: 'رفض التسليم' },
            { type: 'SEND_NOTIFICATION', value: 'تجاوز الحد الأقصى للعهد', description: 'إشعار تحذير' }
        ],
        variables: [
            { name: 'maxCustodyItems', nameAr: 'الحد الأقصى للعهد', type: 'NUMBER', defaultValue: 10, min: 5, max: 50, description: 'أقصى عدد عهد للموظف' }
        ],
        testCases: [
            { id: 'test1', name: 'تجاوز الحد', input: { currentCustodyCount: 10 }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['عهدة', 'حد أقصى', 'تحكم'],
        difficulty: 'SIMPLE',
        popularity: 85,
        rating: 4.6
    },

    // ========================================
    // 🔄 استرجاع العهد
    // ========================================
    {
        id: 'CUS-RET-001',
        category: 'COMPLIANCE',
        subcategory: 'CUSTODY_RETURN',
        industry: ['ALL'],
        nameAr: 'استرجاع العهد عند انتهاء الخدمة',
        nameEn: 'Custody Return on Service End',
        descriptionAr: 'إلزام الموظف بإرجاع جميع العهد عند انتهاء الخدمة',
        descriptionEn: 'Require employee to return all custody items when service ends',
        trigger: { event: 'EMPLOYMENT_TERMINATED', timing: 'BEFORE', description: 'قبل انتهاء الخدمة' },
        conditions: [
            { id: 'c1', field: 'activeCustodyCount', operator: 'GREATER_THAN', value: 0, description: 'عهد نشطة' }
        ],
        actions: [
            { type: 'CREATE_TASK', value: 'إرجاع جميع العهد', description: 'مهمة للموظف' },
            { type: 'SEND_NOTIFICATION', value: 'يرجى إرجاع العهد قبل إنهاء الإجراءات', description: 'إشعار' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'موظف بعهد', input: { activeCustodyCount: 3 }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['عهدة', 'استرجاع', 'نهاية خدمة'],
        difficulty: 'SIMPLE',
        popularity: 98,
        rating: 5.0
    },

    {
        id: 'CUS-RET-002',
        category: 'COMPLIANCE',
        subcategory: 'CUSTODY_RETURN',
        industry: ['ALL'],
        nameAr: 'خصم قيمة العهد غير المرتجعة',
        nameEn: 'Deduct Unreturned Custody Value',
        descriptionAr: 'خصم قيمة العهد من مستحقات الموظف إذا لم يرجعها',
        descriptionEn: 'Deduct custody value from employee dues if not returned',
        trigger: { event: 'FINAL_SETTLEMENT', timing: 'DURING', description: 'أثناء حساب المخالصة' },
        conditions: [
            { id: 'c1', field: 'unreturnedCustodyValue', operator: 'GREATER_THAN', value: 0, description: 'قيمة عهد غير مرتجعة' }
        ],
        actions: [
            { type: 'DEDUCT_FROM_PAYROLL', value: 0, unit: 'SAR', description: 'خصم قيمة العهد', formula: '{unreturnedCustodyValue}' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'عهد غير مرتجعة 5000', input: { unreturnedCustodyValue: 5000 }, expectedResult: { shouldTrigger: true, expectedValue: 5000 } }
        ],
        tags: ['عهدة', 'خصم', 'مخالصة'],
        difficulty: 'MEDIUM',
        popularity: 92,
        rating: 4.8
    },

    // ========================================
    // 🔧 صيانة العهد
    // ========================================
    {
        id: 'CUS-MNT-001',
        category: 'COMPLIANCE',
        subcategory: 'CUSTODY_MAINTENANCE',
        industry: ['ALL'],
        nameAr: 'جدولة صيانة دورية للعهد',
        nameEn: 'Schedule Periodic Custody Maintenance',
        descriptionAr: 'إنشاء مهمة صيانة تلقائية للعهد بشكل دوري',
        descriptionEn: 'Create automatic maintenance task for custody periodically',
        trigger: { event: 'CUSTODY_MAINTENANCE_DUE', timing: 'AFTER', description: 'موعد الصيانة' },
        conditions: [
            { id: 'c1', field: 'daysSinceLastMaintenance', operator: 'GREATER_THAN_OR_EQUALS', value: 90, valueVariable: 'maintenanceInterval', description: 'مضى وقت كافي' },
            { id: 'c2', field: 'requiresMaintenance', operator: 'EQUALS', value: true, description: 'يتطلب صيانة' }
        ],
        actions: [
            { type: 'CREATE_TASK', value: 'صيانة دورية للعهدة', description: 'مهمة صيانة' },
            { type: 'SEND_NOTIFICATION', value: 'موعد صيانة العهدة', description: 'إشعار للموظف' }
        ],
        variables: [
            { name: 'maintenanceInterval', nameAr: 'فترة الصيانة (يوم)', type: 'NUMBER', defaultValue: 90, min: 30, max: 365, description: 'الفترة بين الصيانات' }
        ],
        testCases: [
            { id: 'test1', name: 'مضى 100 يوم', input: { daysSinceLastMaintenance: 100, requiresMaintenance: true }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['عهدة', 'صيانة', 'جدولة'],
        difficulty: 'MEDIUM',
        popularity: 82,
        rating: 4.5
    },

    {
        id: 'CUS-MNT-002',
        category: 'COMPLIANCE',
        subcategory: 'CUSTODY_MAINTENANCE',
        industry: ['ALL'],
        nameAr: 'خصم تكلفة الصيانة بسبب الإهمال',
        nameEn: 'Deduct Maintenance Cost Due to Negligence',
        descriptionAr: 'خصم تكلفة الصيانة من الموظف إذا كان التلف بسبب إهمال',
        descriptionEn: 'Deduct maintenance cost from employee if damage was due to negligence',
        trigger: { event: 'CUSTODY_MAINTENANCE_COMPLETED', timing: 'AFTER', description: 'بعد إتمام الصيانة' },
        conditions: [
            { id: 'c1', field: 'damageReason', operator: 'EQUALS', value: 'NEGLIGENCE', description: 'التلف بسبب إهمال' },
            { id: 'c2', field: 'maintenanceCost', operator: 'GREATER_THAN', value: 0, description: 'تكلفة صيانة' }
        ],
        actions: [
            { type: 'DEDUCT_FROM_PAYROLL', value: 0, unit: 'SAR', description: 'خصم تكلفة الصيانة', formula: '{maintenanceCost} * {deductionPercentage} / 100' }
        ],
        variables: [
            { name: 'deductionPercentage', nameAr: 'نسبة الخصم من تكلفة الصيانة (%)', type: 'PERCENTAGE', defaultValue: 50, min: 25, max: 100, description: 'النسبة المخصومة' }
        ],
        testCases: [
            { id: 'test1', name: 'صيانة بسبب إهمال', input: { damageReason: 'NEGLIGENCE', maintenanceCost: 1000 }, expectedResult: { shouldTrigger: true, expectedValue: 500 } }
        ],
        tags: ['عهدة', 'صيانة', 'خصم', 'إهمال'],
        difficulty: 'MEDIUM',
        popularity: 78,
        rating: 4.4
    },

    // ========================================
    // 🔀 نقل العهد
    // ========================================
    {
        id: 'CUS-TRF-001',
        category: 'COMPLIANCE',
        subcategory: 'CUSTODY_TRANSFER',
        industry: ['ALL'],
        nameAr: 'نقل العهد بين الموظفين',
        nameEn: 'Custody Transfer Between Employees',
        descriptionAr: 'إجراءات نقل العهد من موظف لآخر مع التوثيق',
        descriptionEn: 'Procedures for transferring custody between employees with documentation',
        trigger: { event: 'CUSTODY_TRANSFER_REQUESTED', timing: 'AFTER', description: 'طلب نقل عهدة' },
        conditions: [
            { id: 'c1', field: 'fromEmployeeStatus', operator: 'EQUALS', value: 'ACTIVE', description: 'المُسلِّم نشط' },
            { id: 'c2', field: 'toEmployeeStatus', operator: 'EQUALS', value: 'ACTIVE', description: 'المُستلِم نشط' }
        ],
        actions: [
            { type: 'CREATE_TASK', value: 'توقيع محضر تسليم واستلام', description: 'مهمة للطرفين' },
            { type: 'SEND_NOTIFICATION', value: 'طلب نقل عهدة يحتاج موافقتك', description: 'إشعار للمدير' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'نقل عهدة', input: { fromEmployeeStatus: 'ACTIVE', toEmployeeStatus: 'ACTIVE' }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['عهدة', 'نقل', 'تحويل'],
        difficulty: 'SIMPLE',
        popularity: 88,
        rating: 4.7
    },

    // ========================================
    // 📊 جرد العهد
    // ========================================
    {
        id: 'CUS-INV-001',
        category: 'COMPLIANCE',
        subcategory: 'CUSTODY_INVENTORY',
        industry: ['ALL'],
        nameAr: 'جرد العهد الدوري',
        nameEn: 'Periodic Custody Inventory',
        descriptionAr: 'تذكير بجرد العهد بشكل دوري',
        descriptionEn: 'Remind for periodic custody inventory',
        trigger: { event: 'INVENTORY_DUE', timing: 'AFTER', description: 'موعد الجرد' },
        conditions: [
            { id: 'c1', field: 'daysSinceLastInventory', operator: 'GREATER_THAN_OR_EQUALS', value: 180, valueVariable: 'inventoryInterval', description: 'مضت الفترة المحددة' }
        ],
        actions: [
            { type: 'CREATE_TASK', value: 'جرد العهد', description: 'مهمة جرد' },
            { type: 'SEND_NOTIFICATION', value: 'موعد جرد العهد السنوي', description: 'إشعار' }
        ],
        variables: [
            { name: 'inventoryInterval', nameAr: 'فترة الجرد (يوم)', type: 'NUMBER', defaultValue: 180, min: 90, max: 365, description: 'الفترة بين الجرود' }
        ],
        testCases: [
            { id: 'test1', name: 'مضى 200 يوم', input: { daysSinceLastInventory: 200 }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['عهدة', 'جرد', 'دوري'],
        difficulty: 'SIMPLE',
        popularity: 80,
        rating: 4.5
    },

    // ========================================
    // ⚠️ تلف وفقدان العهد
    // ========================================
    {
        id: 'CUS-DMG-001',
        category: 'COMPLIANCE',
        subcategory: 'CUSTODY_DAMAGE',
        industry: ['ALL'],
        nameAr: 'الإبلاغ عن تلف العهدة',
        nameEn: 'Report Custody Damage',
        descriptionAr: 'إجراءات الإبلاغ عن تلف عهدة وتحديد المسؤولية',
        descriptionEn: 'Procedures for reporting custody damage and determining liability',
        trigger: { event: 'CUSTODY_DAMAGE_REPORTED', timing: 'AFTER', description: 'بعد الإبلاغ عن تلف' },
        conditions: [
            { id: 'c1', field: 'damageType', operator: 'NOT_EQUALS', value: 'NATURAL_WEAR', description: 'ليس تآكل طبيعي' }
        ],
        actions: [
            { type: 'CREATE_TASK', value: 'تحقيق في سبب التلف', description: 'مهمة للمدير' },
            { type: 'SEND_NOTIFICATION', value: 'تم الإبلاغ عن تلف عهدة', description: 'إشعار' }
        ],
        variables: [],
        testCases: [
            { id: 'test1', name: 'تلف بسبب سوء استخدام', input: { damageType: 'MISUSE' }, expectedResult: { shouldTrigger: true } }
        ],
        tags: ['عهدة', 'تلف', 'إبلاغ'],
        difficulty: 'SIMPLE',
        popularity: 85,
        rating: 4.6
    },

    {
        id: 'CUS-DMG-002',
        category: 'COMPLIANCE',
        subcategory: 'CUSTODY_LOSS',
        industry: ['ALL'],
        nameAr: 'خصم قيمة العهدة المفقودة',
        nameEn: 'Deduct Lost Custody Value',
        descriptionAr: 'خصم قيمة العهدة المفقودة من راتب الموظف',
        descriptionEn: 'Deduct lost custody value from employee salary',
        trigger: { event: 'CUSTODY_LOST_CONFIRMED', timing: 'AFTER', description: 'تأكيد فقدان العهدة' },
        conditions: [
            { id: 'c1', field: 'lossReason', operator: 'NOT_EQUALS', value: 'THEFT_WITH_REPORT', description: 'ليس سرقة مع بلاغ' }
        ],
        actions: [
            { type: 'DEDUCT_FROM_PAYROLL', value: 0, unit: 'SAR', description: 'خصم قيمة العهدة', formula: '{itemCurrentValue} * {deductionPercentage} / 100' }
        ],
        variables: [
            { name: 'deductionPercentage', nameAr: 'نسبة الخصم من القيمة (%)', type: 'PERCENTAGE', defaultValue: 100, min: 50, max: 100, description: 'النسبة المخصومة' }
        ],
        testCases: [
            { id: 'test1', name: 'فقدان بسبب إهمال', input: { lossReason: 'NEGLIGENCE', itemCurrentValue: 3000 }, expectedResult: { shouldTrigger: true, expectedValue: 3000 } }
        ],
        tags: ['عهدة', 'فقدان', 'خصم'],
        difficulty: 'MEDIUM',
        popularity: 90,
        rating: 4.7
    },
];

export const CUSTODY_POLICIES_COUNT = CUSTODY_POLICIES.length;
