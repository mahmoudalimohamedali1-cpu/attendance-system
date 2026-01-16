const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    const policies = await p.smartPolicyTemplate.findMany({
        where: { 
            isSystemTemplate: true,
            category: 'ATTENDANCE'
        },
        select: { id: true, name: true }
    });
    
    console.log('Attendance policies found:', policies.length);
    policies.forEach(pol => {
        console.log(`  - ${pol.id}: ${pol.name}`);
    });
    
    // Check one policy
    if (policies.length > 0) {
        const policy = await p.smartPolicyTemplate.findUnique({
            where: { id: policies[0].id }
        });
        console.log('\n=== First Policy Details ===');
        console.log(JSON.stringify(policy.parsedRule, null, 2));
    }
    
    await p.$disconnect();
}

main().catch(console.error);
