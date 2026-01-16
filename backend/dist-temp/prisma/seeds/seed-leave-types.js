"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedLeaveTypes = seedLeaveTypes;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function seedLeaveTypes(companyId) {
    console.log(`🌱 Seeding leave types for company: ${companyId}`);
    const existingCount = await prisma.leaveTypeConfig.count({
        where: { companyId },
    });
    if (existingCount > 0) {
        console.log(`⚠️ Company already has ${existingCount} leave types. Skipping...`);
        return;
    }
    const defaultTypes = [
        {
            code: 'ANNUAL',
            nameAr: 'إجازة سنوية',
            nameEn: 'Annual Leave',
            category: client_1.LeaveCategory.BALANCED,
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
        {
            code: 'SICK',
            nameAr: 'إجازة مرضية',
            nameEn: 'Sick Leave',
            category: client_1.LeaveCategory.SICK,
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
        {
            code: 'MARRIAGE',
            nameAr: 'إجازة زواج',
            nameEn: 'Marriage Leave',
            category: client_1.LeaveCategory.CASUAL,
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
            category: client_1.LeaveCategory.CASUAL,
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
            category: client_1.LeaveCategory.CASUAL,
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
            category: client_1.LeaveCategory.CASUAL,
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
            category: client_1.LeaveCategory.CASUAL,
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
            category: client_1.LeaveCategory.CASUAL,
            isEntitlementBased: false,
            defaultEntitlement: 0,
            allowCarryForward: false,
            isPaid: true,
            sortOrder: 8,
        },
        {
            code: 'UNPAID',
            nameAr: 'إجازة بدون راتب',
            nameEn: 'Unpaid Leave',
            category: client_1.LeaveCategory.UNPAID,
            isEntitlementBased: false,
            defaultEntitlement: 0,
            allowCarryForward: false,
            isPaid: false,
            allowNegativeBalance: true,
            sortOrder: 10,
        },
    ];
    for (const typeData of defaultTypes) {
        const { entitlementTiers, sickPayTiers, ...leaveTypeData } = typeData;
        console.log(`  📌 Creating: ${typeData.nameAr} (${typeData.code})`);
        const leaveType = await prisma.leaveTypeConfig.create({
            data: {
                companyId,
                ...leaveTypeData,
            },
        });
        if (entitlementTiers && entitlementTiers.length > 0) {
            await prisma.leaveEntitlementTier.createMany({
                data: entitlementTiers.map((tier) => ({
                    leaveTypeId: leaveType.id,
                    ...tier,
                })),
            });
            console.log(`    ├── Added ${entitlementTiers.length} entitlement tiers`);
        }
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
async function main() {
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
exports.default = seedLeaveTypes;
//# sourceMappingURL=seed-leave-types.js.map