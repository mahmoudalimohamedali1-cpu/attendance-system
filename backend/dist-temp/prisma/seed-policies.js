"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const samplePolicies = [
    {
        code: 'OT_DEFAULT',
        nameAr: 'سياسة الوقت الإضافي الافتراضية',
        nameEn: 'Default Overtime Policy',
        type: 'OVERTIME',
        scope: 'COMPANY',
        effectiveFrom: new Date('2024-01-01'),
        settings: {
            maxOvertimeHoursPerMonth: 40,
            requiresApproval: true,
            minHoursToQualify: 0.5,
        },
        rules: [
            {
                code: 'OT_WEEKDAY',
                nameAr: 'الوقت الإضافي - أيام العمل',
                conditions: { dayType: 'WEEKDAY' },
                valueType: 'MULTIPLIER',
                value: '1.5',
                order: 1,
            },
            {
                code: 'OT_WEEKEND',
                nameAr: 'الوقت الإضافي - نهاية الأسبوع',
                conditions: { dayType: 'WEEKEND' },
                valueType: 'MULTIPLIER',
                value: '2.0',
                order: 2,
            },
            {
                code: 'OT_HOLIDAY',
                nameAr: 'الوقت الإضافي - الإجازات الرسمية',
                conditions: { dayType: 'HOLIDAY' },
                valueType: 'MULTIPLIER',
                value: '2.5',
                order: 3,
            },
        ],
    },
    {
        code: 'DED_LATE',
        nameAr: 'سياسة خصم التأخير',
        nameEn: 'Late Deduction Policy',
        type: 'DEDUCTION',
        scope: 'COMPANY',
        effectiveFrom: new Date('2024-01-01'),
        settings: {
            gracePeriodMinutes: 10,
            maxDeductionPercentage: 10,
        },
        rules: [
            {
                code: 'LATE_15_30',
                nameAr: 'تأخير 15-30 دقيقة',
                conditions: { lateMinutes: { gte: 15, lt: 30 } },
                valueType: 'PERCENTAGE',
                value: '1',
                order: 1,
            },
            {
                code: 'LATE_30_60',
                nameAr: 'تأخير 30-60 دقيقة',
                conditions: { lateMinutes: { gte: 30, lt: 60 } },
                valueType: 'PERCENTAGE',
                value: '2',
                order: 2,
            },
            {
                code: 'LATE_60_PLUS',
                nameAr: 'تأخير أكثر من ساعة',
                conditions: { lateMinutes: { gte: 60 } },
                valueType: 'PERCENTAGE',
                value: '5',
                order: 3,
            },
        ],
    },
    {
        code: 'LEAVE_DEFAULT',
        nameAr: 'سياسة الإجازات الافتراضية',
        nameEn: 'Default Leave Policy',
        type: 'LEAVE',
        scope: 'COMPANY',
        effectiveFrom: new Date('2024-01-01'),
        settings: {
            annualLeaveBalance: 21,
            sickLeaveBalance: 15,
            carryOverLimit: 5,
            carryOverExpiryMonths: 3,
            minDaysForAdvanceRequest: 7,
            allowNegativeBalance: false,
        },
        rules: [],
    },
    {
        code: 'ATT_DEFAULT',
        nameAr: 'سياسة الحضور الافتراضية',
        nameEn: 'Default Attendance Policy',
        type: 'ATTENDANCE',
        scope: 'COMPANY',
        effectiveFrom: new Date('2024-01-01'),
        settings: {
            workStartTime: '09:00',
            workEndTime: '17:00',
            lateGracePeriod: 10,
            earlyLeaveGracePeriod: 5,
            minWorkHours: 8,
            requirePhotoOnCheckIn: true,
            requireLocationOnCheckIn: true,
            geofenceRadius: 500,
        },
        rules: [],
    },
    {
        code: 'ALW_DEFAULT',
        nameAr: 'سياسة البدلات الافتراضية',
        nameEn: 'Default Allowance Policy',
        type: 'ALLOWANCE',
        scope: 'COMPANY',
        effectiveFrom: new Date('2024-01-01'),
        settings: {},
        rules: [
            {
                code: 'ALW_HOUSING',
                nameAr: 'بدل السكن',
                conditions: {},
                valueType: 'PERCENTAGE',
                value: '25',
                order: 1,
            },
            {
                code: 'ALW_TRANSPORT',
                nameAr: 'بدل المواصلات',
                conditions: {},
                valueType: 'PERCENTAGE',
                value: '10',
                order: 2,
            },
        ],
    },
];
async function seedPolicies() {
    console.log('📋 Seeding sample policies...');
    const company = await prisma.company.findFirst();
    if (!company) {
        console.error('❌ No company found. Run main seed first.');
        return;
    }
    let created = 0;
    let updated = 0;
    for (const policyData of samplePolicies) {
        const { rules, ...policy } = policyData;
        const existing = await prisma.policy.findFirst({
            where: { code: policy.code, companyId: company.id }
        });
        if (existing) {
            await prisma.policy.update({
                where: { id: existing.id },
                data: {
                    nameAr: policy.nameAr,
                    nameEn: policy.nameEn,
                    settings: policy.settings,
                }
            });
            updated++;
        }
        else {
            await prisma.policy.create({
                data: {
                    code: policy.code,
                    nameAr: policy.nameAr,
                    nameEn: policy.nameEn,
                    type: policy.type,
                    scope: policy.scope,
                    effectiveFrom: policy.effectiveFrom,
                    settings: policy.settings,
                    companyId: company.id,
                    isActive: true,
                    priority: 0,
                    rules: {
                        create: rules.map((r, i) => ({
                            code: r.code,
                            nameAr: r.nameAr,
                            conditions: r.conditions,
                            valueType: r.valueType,
                            value: r.value,
                            order: r.order ?? i,
                            isActive: true,
                        })),
                    },
                },
            });
            created++;
        }
    }
    console.log(`✅ Policies seeded: ${created} created, ${updated} updated`);
    console.log('📊 Sample policies include: Overtime, Late Deduction, Leave, Attendance, Allowance');
}
seedPolicies()
    .then(() => prisma.$disconnect())
    .catch((e) => {
    console.error('Error seeding policies:', e);
    prisma.$disconnect();
    process.exit(1);
});
//# sourceMappingURL=seed-policies.js.map