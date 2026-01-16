const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY not found in .env');
        return;
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    try {
        console.log('Listing available models...');
        // The SDK might not have a direct listModels, we might need to use the REST API or a different approach
        // But let's try a different set of common names first if listModels isn't easy
        // Actually, let's use the REST API via fetch to list models
        const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log('Available Models:');
            data.models.forEach(m => console.log(`- ${m.name} (${m.supportedGenerationMethods})`));
        } else {
            console.log('No models found or error:', JSON.stringify(data));
        }
    } catch (e) {
        console.error('Failed to list models:', e.message);
    }
}

listModels();

