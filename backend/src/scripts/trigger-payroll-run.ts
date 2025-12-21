/**
 * Trigger PayrollRun calculation via NestJS service
 * Usage: npx ts-node src/scripts/trigger-payroll-run.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PayrollRunsService } from '../modules/payroll-runs/payroll-runs.service';
import { PrismaService } from '../common/prisma/prisma.service';

async function bootstrap() {
    console.log('🚀 Triggering PayrollRun calculation...\n');

    const app = await NestFactory.createApplicationContext(AppModule);
    const prisma = app.get(PrismaService);
    const payrollService = app.get(PayrollRunsService);

    try {
        // Get company and period
        const company = await prisma.company.findFirst();
        if (!company) throw new Error('No company found');

        const period = await prisma.payrollPeriod.findFirst({
            where: { companyId: company.id, year: 2025, month: 1 }
        });
        if (!period) throw new Error('Period 2025-01 not found');

        console.log(`Company: ${company.name}`);
        console.log(`Period: ${period.year}-${period.month} (${period.id})`);

        // Get admin user for processedBy
        const admin = await prisma.user.findFirst({
            where: { companyId: company.id, role: 'ADMIN' }
        });
        if (!admin) throw new Error('No admin user found');

        console.log(`Admin: ${admin.firstName} ${admin.lastName}\n`);

        // Create PayrollRun (this triggers full calculation)
        console.log('Creating PayrollRun with calculation...');
        const result = await payrollService.create(
            { periodId: period.id },
            company.id,
            admin.id
        );

        console.log('\n✅ PayrollRun created successfully!');
        console.log(`Run ID: ${result.id}`);
        console.log(`Payslips: ${result.payslips?.length || 'N/A'}`);

    } catch (error: any) {
        console.error('\n❌ Error:', error.message);
    } finally {
        await app.close();
    }
}

bootstrap();
