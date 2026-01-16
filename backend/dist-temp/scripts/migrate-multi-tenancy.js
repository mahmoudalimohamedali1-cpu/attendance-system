"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🚀 Starting migration for multi-tenancy...');
    const defaultCompany = await prisma.company.upsert({
        where: { name: 'الشركة الافتراضية' },
        update: {},
        create: {
            name: 'الشركة الافتراضية',
            nameEn: 'Default Company',
        },
    });
    console.log(`✅ Default Company created: ${defaultCompany.id}`);
    const companyId = defaultCompany.id;
    console.log('📦 Updating organizational models...');
    await prisma.user.updateMany({ data: { companyId } });
    await prisma.branch.updateMany({ data: { companyId } });
    await prisma.department.updateMany({ data: { companyId } });
    await prisma.jobTitle.updateMany({ data: { companyId } });
    console.log('⚙️ Updating configuration models...');
    await prisma.costCenter.updateMany({ data: { companyId } });
    await prisma.salaryComponent.updateMany({ data: { companyId } });
    await prisma.salaryStructure.updateMany({ data: { companyId } });
    await prisma.policy.updateMany({ data: { companyId } });
    await prisma.workSchedule.updateMany({ data: { companyId } });
    await prisma.holiday.updateMany({ data: { companyId } });
    await prisma.gosiConfig.updateMany({ data: { companyId } });
    console.log('📄 Updating transactional models...');
    await prisma.payrollPeriod.updateMany({ data: { companyId } });
    await prisma.payrollRun.updateMany({ data: { companyId } });
    await prisma.attendance.updateMany({ data: { companyId } });
    await prisma.leaveRequest.updateMany({ data: { companyId } });
    await prisma.letterRequest.updateMany({ data: { companyId } });
    await prisma.notification.updateMany({ data: { companyId } });
    await prisma.auditLog.updateMany({ data: { companyId } });
    await prisma.advanceRequest.updateMany({ data: { companyId } });
    await prisma.retroPay.updateMany({ data: { companyId } });
    console.log('🎉 Migration completed successfully!');
}
main()
    .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=migrate-multi-tenancy.js.map