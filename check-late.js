const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    const policy = await p.smartPolicyTemplate.findFirst({
        where: { 
            isSystemTemplate: true,
            id: { contains: 'LATE' }
        }
    });
    
    if (!policy) {
        console.log('No lateness policy found');
        await p.$disconnect();
        return;
    }
    
    console.log('Policy ID:', policy.id);
    console.log('Policy Name:', policy.name);
    console.log('\n=== Conditions (with mapped fields) ===');
    
    const parsed = policy.parsedRule;
    for (const cond of (parsed.conditions || [])) {
        console.log(`  - Field: ${cond.field}`);
        console.log(`    Operator: ${cond.operator}`);
        console.log(`    Value: ${cond.value}`);
        console.log(`    Desc: ${cond.description}\n`);
    }
    
    console.log('\n=== Actions ===');
    for (const action of (parsed.actions || [])) {
        console.log(`  - Type: ${action.type}`);
        console.log(`    Value: ${action.value}`);
        console.log(`    ValueType: ${action.valueType}`);
        if (action.formula) console.log(`    Formula: ${action.formula}`);
    }
    
    await p.$disconnect();
}

main().catch(console.error);
