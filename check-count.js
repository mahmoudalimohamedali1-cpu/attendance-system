const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    const count = await p.smartPolicyTemplate.count();
    console.log('Total policies in database:', count);
    
    const byCategory = await p.smartPolicyTemplate.groupBy({
        by: ['category'],
        _count: true,
    });
    
    console.log('\nBy Category:');
    byCategory.forEach(item => {
        console.log(`  ${item.category}: ${item._count}`);
    });
    
    await p.$disconnect();
}

main().catch(console.error);
