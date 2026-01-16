"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
async function main() {
    const prisma = new client_1.PrismaClient();
    const periods = await prisma.payrollPeriod.findMany({
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 5
    });
    console.log('--- RECENT PERIODS ---');
    console.log(JSON.stringify(periods, null, 2));
    const runs = await prisma.payrollRun.findMany({
        include: { period: true },
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    console.log('--- RECENT RUNS ---');
    console.log(JSON.stringify(runs, null, 2));
    await prisma.$disconnect();
}
main().catch(console.error);
//# sourceMappingURL=check-payroll-data.js.map