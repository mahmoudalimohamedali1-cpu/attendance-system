import { PrismaClient, LeaveCategory } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * إعداد أنواع الإجازات الافتراضية للشركة
 * متوافقة مع نظام العمل السعودي
 */
export async function seedLeaveTypes(companyId: string) {
    console.log(`🌱 Seeding leave types for company: ${companyId}`);

    // التحقق من وجود أنواع إجازات مسبقة
    const existingCount = await prisma.leaveTypeConfig.count({
        where: { companyId },
    });

    if (existingCount > 0) {
        console.log(`⚠️ Company already has ${existingCount} leave types. Skipping...`);
        return;
    }

    // تعريف الأنواع الافتراضية
    const defaultTypes = [
        // ===== إجازات متوازنة (Balanced) =====
        {
            code: 'ANNUAL',
            nameAr: 'إجازة سنوية',
            nameEn: 'Annual Leave',
            category: LeaveCategory.BALANCED,
            isEntitlementBased: true,
            defaultEntitlement: 21,
            maxBalanceCap: 60,
            allowCarryForward: true,
            maxCarryForwardDays: 30,
            isPaid: true,
            paymentPercentage: 100,
            minNoticeDays: 7,
            sortOrder: 1,
            entitlementTiers: [
                { minServiceYears: 0, maxServiceYears: 5, entitlementDays: 21 },
                { minServiceYears: 5, maxServiceYears: 10, entitlementDays: 25 },
                { minServiceYears: 10, maxServiceYears: 999, entitlementDays: 30 },
            ],
        },
        // ===== إجازات مرضية (Sick) =====
        {
            code: 'SICK',
            nameAr: 'إجازة مرضية',
            nameEn: 'Sick Leave',
            category: LeaveCategory.SICK,
            isEntitlementBased: true,
            defaultEntitlement: 30,
            allowCarryForward: false,
            isPaid: true,
            requiresAttachment: true,
            attachmentRequiredAfterDays: 3,
            sortOrder: 2,
            sickPayTiers: [
                { fromDay: 1, toDay: 30, paymentPercent: 100 },
                { fromDay: 31, toDay: 90, paymentPercent: 75 },
                { fromDay: 91, toDay: 120, paymentPercent: 0 },
            ],
        },
        // ===== إجازات عارضة (Casual) =====
        {
            code: 'MARRIAGE',
            nameAr: 'إجازة زواج',
            nameEn: 'Marriage Leave',
            category: LeaveCategory.CASUAL,
            isEntitlementBased: false,
            defaultEntitlement: 5,
            allowCarryForward: false,
            isPaid: true,
            isOneTimeOnly: true,
            requiresAttachment: true,
            sortOrder: 3,
        },
        {
            code: 'BEREAVEMENT',
            nameAr: 'إجازة وفاة',
            nameEn: 'Bereavement Leave',
            category: LeaveCategory.CASUAL,
            isEntitlementBased: false,
            defaultEntitlement: 5,
            allowCarryForward: false,
            isPaid: true,
            requiresAttachment: true,
            sortOrder: 4,
        },
        {
            code: 'NEW_BABY',
            nameAr: 'إجازة مولود جديد',
            nameEn: 'Paternity Leave',
            category: LeaveCategory.CASUAL,
            isEntitlementBased: false,
            defaultEntitlement: 3,
            allowCarryForward: false,
            isPaid: true,
            requiresAttachment: true,
            sortOrder: 5,
        },
        {
            code: 'HAJJ',
            nameAr: 'إجازة حج',
            nameEn: 'Hajj Leave',
            category: LeaveCategory.CASUAL,
            isEntitlementBased: false,
            defaultEntitlement: 15,
            allowCarryForward: false,
            isPaid: true,
            isOneTimeOnly: true,
            minNoticeDays: 30,
            sortOrder: 6,
        },
        {
            code: 'EXAM',
            nameAr: 'إجازة اختبارات',
            nameEn: 'Exam Leave',
            category: LeaveCategory.CASUAL,
            isEntitlementBased: false,
            defaultEntitlement: 0,
            allowCarryForward: false,
            isPaid: true,
            requiresAttachment: true,
            sortOrder: 7,
        },
        {
            code: 'WORK_MISSION',
            nameAr: 'مهمة عمل',
            nameEn: 'Work Mission',
            category: LeaveCategory.CASUAL,
            isEntitlementBased: false,
            defaultEntitlement: 0,
            allowCarryForward: false,
            isPaid: true,
            sortOrder: 8,
        },
        // ===== إجازات بدون راتب (Unpaid) =====
        {
            code: 'UNPAID',
            nameAr: 'إجازة بدون راتب',
            nameEn: 'Unpaid Leave',
            category: LeaveCategory.UNPAID,
            isEntitlementBased: false,
            defaultEntitlement: 0,
            allowCarryForward: false,
            isPaid: false,
            allowNegativeBalance: true,
            sortOrder: 10,
        },
    ];

    // إنشاء الأنواع مع الشرائح
    for (const typeData of defaultTypes) {
        const { entitlementTiers, sickPayTiers, ...leaveTypeData } = typeData;

        console.log(`  📌 Creating: ${typeData.nameAr} (${typeData.code})`);

        const leaveType = await prisma.leaveTypeConfig.create({
            data: {
                companyId,
                ...leaveTypeData,
            },
        });

        // إنشاء شرائح الاستحقاق
        if (entitlementTiers && entitlementTiers.length > 0) {
            await prisma.leaveEntitlementTier.createMany({
                data: entitlementTiers.map((tier) => ({
                    leaveTypeId: leaveType.id,
                    ...tier,
                })),
            });
            console.log(`    ├── Added ${entitlementTiers.length} entitlement tiers`);
        }

        // إنشاء شرائح الأجر المرضي
        if (sickPayTiers && sickPayTiers.length > 0) {
            await prisma.sickPayTier.createMany({
                data: sickPayTiers.map((tier) => ({
                    leaveTypeId: leaveType.id,
                    ...tier,
                })),
            });
            console.log(`    └── Added ${sickPayTiers.length} sick pay tiers`);
        }
    }

    console.log(`✅ Successfully seeded ${defaultTypes.length} leave types`);
}

// تشغيل مباشر للـ seed
async function main() {
    // الحصول على جميع الشركات
    const companies = await prisma.company.findMany({
        select: { id: true, name: true },
    });

    console.log(`\n🏢 Found ${companies.length} companies\n`);

    for (const company of companies) {
        console.log(`\n═══════════════════════════════════════`);
        console.log(`🏢 Company: ${company.name}`);
        console.log(`═══════════════════════════════════════`);
        await seedLeaveTypes(company.id);
    }

    console.log('\n🎉 All done!\n');
}

// تشغيل الـ seed إذا تم تنفيذ الملف مباشرة
if (require.main === module) {
    main()
        .catch((e) => {
            console.error('❌ Error:', e);
            process.exit(1);
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}

export default seedLeaveTypes;
