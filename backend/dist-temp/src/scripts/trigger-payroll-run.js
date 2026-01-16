"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../app.module");
const payroll_runs_service_1 = require("../modules/payroll-runs/payroll-runs.service");
const prisma_service_1 = require("../common/prisma/prisma.service");
async function bootstrap() {
    console.log('🚀 Triggering PayrollRun calculation...\n');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const prisma = app.get(prisma_service_1.PrismaService);
    const payrollService = app.get(payroll_runs_service_1.PayrollRunsService);
    try {
        const company = await prisma.company.findFirst();
        if (!company)
            throw new Error('No company found');
        const period = await prisma.payrollPeriod.findFirst({
            where: { companyId: company.id, year: 2025, month: 1 }
        });
        if (!period)
            throw new Error('Period 2025-01 not found');
        console.log(`Company: ${company.name}`);
        console.log(`Period: ${period.year}-${period.month} (${period.id})`);
        const admin = await prisma.user.findFirst({
            where: { companyId: company.id, role: 'ADMIN' }
        });
        if (!admin)
            throw new Error('No admin user found');
        console.log(`Admin: ${admin.firstName} ${admin.lastName}\n`);
        console.log('Creating PayrollRun with calculation...');
        const result = await payrollService.create({ periodId: period.id }, company.id, admin.id);
        console.log('\n✅ PayrollRun created successfully!');
        console.log(`Run ID: ${result.id}`);
        console.log(`Status: ${result.status}`);
    }
    catch (error) {
        console.error('\n❌ Error:', error.message);
    }
    finally {
        await app.close();
    }
}
bootstrap();
//# sourceMappingURL=trigger-payroll-run.js.map