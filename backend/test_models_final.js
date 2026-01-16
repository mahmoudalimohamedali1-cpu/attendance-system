
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testModel(modelName) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY not found in .env');
        return;
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    try {
        console.log(`Testing model: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("hello");
        const text = result.response.text();
        console.log(`${modelName}: SUCCESS (Length: ${text.length})`);
        return true;
    } catch (e) {
        console.error(`${modelName}: FAILED - ${e.message}`);
        return false;
    }
}

async function runTests() {
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest', 'gemini-pro-latest'];
    for (const m of models) {
        await testModel(m);
    }
}

runTests();
