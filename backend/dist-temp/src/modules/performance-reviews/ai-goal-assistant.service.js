"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AiGoalAssistantService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiGoalAssistantService = void 0;
const common_1 = require("@nestjs/common");
const sdk_1 = require("@anthropic-ai/sdk");
let AiGoalAssistantService = AiGoalAssistantService_1 = class AiGoalAssistantService {
    constructor() {
        this.logger = new common_1.Logger(AiGoalAssistantService_1.name);
        this.anthropic = null;
        const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
        if (apiKey) {
            this.anthropic = new sdk_1.default({ apiKey });
        }
    }
    async generateGoal(prompt, context) {
        try {
            if (!this.anthropic) {
                throw new Error('AI service not configured');
            }
            const systemPrompt = `أنت مساعد ذكي لإنشاء أهداف SMART (محددة، قابلة للقياس، قابلة للتحقيق، ذات صلة، محددة زمنياً).

المستخدم سيعطيك فكرة عامة عن هدف يريده، ويجب عليك:
1. تحويلها إلى هدف SMART واضح ومحدد
2. اقتراح طريقة لقياس الهدف (رقم، نسبة، الخ)
3. تقديم 3 اقتراحات بديلة

${context ? `السياق الإضافي: ${context}` : ''}

أجب بصيغة JSON فقط:
{
  "title": "عنوان الهدف بالعربي",
  "titleEn": "Goal title in English",
  "description": "وصف تفصيلي للهدف وكيفية تحقيقه",
  "targetValue": 100,
  "unit": "نسبة مئوية أو عدد أو ريال",
  "suggestions": ["اقتراح 1", "اقتراح 2", "اقتراح 3"]
}`;
            const response = await this.anthropic.messages.create({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 2048,
                system: systemPrompt,
                messages: [{ role: 'user', content: `فكرة الهدف: ${prompt}` }]
            });
            const textContent = response.content.find(c => c.type === 'text');
            if (textContent && textContent.type === 'text') {
                const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            }
            return {
                title: prompt,
                description: 'هدف تم إنشاؤه بناءً على طلبك',
                suggestions: [],
            };
        }
        catch (error) {
            this.logger.error('AI Goal Generation Error:', error);
            return {
                title: prompt,
                description: 'لم نتمكن من معالجة الهدف بالذكاء الاصطناعي',
                suggestions: [],
            };
        }
    }
    async generateOKR(objective, context) {
        try {
            if (!this.anthropic) {
                throw new Error('AI service not configured');
            }
            const systemPrompt = `أنت خبير في منهجية OKR (الأهداف والنتائج الرئيسية).

المستخدم سيعطيك هدف عام، ويجب عليك:
1. صياغة الهدف (Objective) بشكل ملهم وطموح
2. إنشاء 3-5 نتائج رئيسية (Key Results) قابلة للقياس

${context ? `السياق الإضافي: ${context}` : ''}

أجب بصيغة JSON فقط:
{
  "objective": {
    "title": "عنوان الهدف الملهم",
    "description": "وصف مختصر"
  },
  "keyResults": [
    {
      "title": "النتيجة الرئيسية الأولى",
      "targetValue": 100,
      "unit": "%"
    },
    {
      "title": "النتيجة الرئيسية الثانية",
      "targetValue": 50,
      "unit": "عميل"
    }
  ]
}`;
            const response = await this.anthropic.messages.create({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 2048,
                system: systemPrompt,
                messages: [{ role: 'user', content: `الهدف المطلوب: ${objective}` }]
            });
            const textContent = response.content.find(c => c.type === 'text');
            if (textContent && textContent.type === 'text') {
                const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            }
            return {
                objective: {
                    title: objective,
                    description: '',
                },
                keyResults: [],
            };
        }
        catch (error) {
            this.logger.error('AI OKR Generation Error:', error);
            return {
                objective: {
                    title: objective,
                    description: '',
                },
                keyResults: [],
            };
        }
    }
    async summarizeFeedback(feedbackComments) {
        try {
            if (!this.anthropic) {
                throw new Error('AI service not configured');
            }
            const systemPrompt = `أنت محلل تقييمات أداء. لديك مجموعة من الملاحظات حول موظف.

قم بـ:
1. تلخيص الملاحظات في فقرة واحدة
2. استخراج نقاط القوة
3. استخراج نقاط التحسين
4. تحديد الموضوعات المتكررة

أجب بصيغة JSON:
{
  "summary": "ملخص شامل",
  "strengths": ["قوة 1", "قوة 2"],
  "improvements": ["تحسين 1", "تحسين 2"],
  "themes": ["موضوع 1", "موضوع 2"]
}`;
            const response = await this.anthropic.messages.create({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 2048,
                system: systemPrompt,
                messages: [{ role: 'user', content: `الملاحظات:\n${feedbackComments.join('\n---\n')}` }]
            });
            const textContent = response.content.find(c => c.type === 'text');
            if (textContent && textContent.type === 'text') {
                const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            }
            return {
                summary: 'لم نتمكن من التحليل',
                strengths: [],
                improvements: [],
                themes: [],
            };
        }
        catch (error) {
            this.logger.error('AI Feedback Summary Error:', error);
            return {
                summary: 'خطأ في التحليل',
                strengths: [],
                improvements: [],
                themes: [],
            };
        }
    }
};
exports.AiGoalAssistantService = AiGoalAssistantService;
exports.AiGoalAssistantService = AiGoalAssistantService = AiGoalAssistantService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], AiGoalAssistantService);
//# sourceMappingURL=ai-goal-assistant.service.js.map