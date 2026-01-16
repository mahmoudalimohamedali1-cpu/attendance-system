
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/src/app.module');
const { AiSchemaGeneratorService } = require('./dist/src/modules/smart-policies/ai-schema-generator.service');

async function verify() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const service = app.get(AiSchemaGeneratorService);

    const policy = "إذا الموظف كان ليه طفل ذكر تحت ال 5 سنين يزيد راتبه 2000 ريال";
    console.log('--- Starting Standalone Verification ---');
    console.log('Policy:', policy);

    try {
        const result = await service.analyzePolicy(policy);
        console.log('ANALYSIS RESULT:');
        console.log(JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('VERIFICATION FAILED:', e);
    } finally {
        await app.close();
    }
}

verify();
