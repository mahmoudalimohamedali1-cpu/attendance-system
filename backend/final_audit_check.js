const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const user = await prisma.user.findFirst({
        where: { role: { not: 'ADMIN' } },
        select: { firstName: true, lastName: true, id: true, companyId: true }
    });
    if (user) {
        console.log(`REAL_USER_FOUND: ${user.firstName} ${user.lastName}`);
        console.log(`USER_ID: ${user.id}`);
    } else {
        console.log('No non-admin users found.');
    }
}
main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
