const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    const policy = await p.smartPolicyTemplate.findFirst({
        where: { isSystemTemplate: true }
    });
    
    console.log('Policy ID:', policy.id);
    console.log('Policy Name:', policy.name);
    console.log('\n=== parsedRule Structure ===');
    console.log(JSON.stringify(policy.parsedRule, null, 2));
    
    // Check critical fields
    const parsed = policy.parsedRule;
    console.log('\n=== Critical Fields Check ===');
    console.log('understood:', parsed.understood);
    console.log('scope:', JSON.stringify(parsed.scope));
    console.log('conditions count:', parsed.conditions?.length);
    console.log('actions count:', parsed.actions?.length);
    
    if (parsed.conditions?.length > 0) {
        console.log('\nFirst condition field:', parsed.conditions[0].field);
    }
    
    await p.$disconnect();
}

main().catch(console.error);
