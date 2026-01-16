const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    console.log('Deleting old system templates...');
    const deleted = await p.smartPolicyTemplate.deleteMany({
        where: { isSystemTemplate: true }
    });
    console.log('Deleted:', deleted.count);
    await p.$disconnect();
}

main().catch(console.error);
