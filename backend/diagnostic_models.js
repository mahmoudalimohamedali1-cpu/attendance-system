
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testModel(modelName) {
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Say 'OK'");
        console.log(`${modelName}: SUCCESS - ${result.response.text().trim()}`);
        return true;
    } catch (e) {
        console.log(`${modelName}: FAILED - ${e.message.split('\n')[0]}`);
        return false;
    }
}

async function runTests() {
    const models = [
        'gemini-1.5-flash',
        'gemini-1.5-flash-latest',
        'gemini-flash-latest',
        'gemini-2.0-flash-lite-preview',
        'gemini-2.0-flash-exp',
        'gemini-2.0-flash-lite',
        'gemini-pro-latest',
        'gemini-1.5-pro'
    ];
    console.log('--- Starting Model Access Test ---');
    for (const m of models) {
        await testModel(m);
    }
}

runTests();
