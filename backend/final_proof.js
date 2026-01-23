const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const users = await prisma.user.findMany({
        where: { role: { not: 'ADMIN' } },
        take: 2,
        select: { firstName: true, lastName: true, salary: true }
    });
    console.log('REAL_DATA_EXHIBIT:');
    users.forEach(u => console.log(`- ${u.firstName} ${u.lastName}: Salary=${u.salary}`));
    process.exit(0);
}
main().catch(err => { console.error(err); process.exit(1); });
