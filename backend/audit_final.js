const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const user = await prisma.user.findFirst({
        where: { role: { not: 'ADMIN' } },
        select: { firstName: true, lastName: true, id: true, salary: true, companyId: true }
    });
    if (user) {
        console.log('--- REAL DATABASE RECORD FOUND ---');
        console.log(`FULL_NAME: ${user.firstName} ${user.lastName}`);
        console.log(`EMPLOYEE_ID: ${user.id}`);
        console.log(`RAW_SALARY_IN_DB: ${user.salary}`);
        console.log(`COMPANY_RELATION: ${user.companyId}`);
        console.log('---------------------------------');
    } else {
        console.log('No realistic employee records found in the database yet.');
    }
}
main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
