import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class AiGoalAssistantService {
    private readonly logger = new Logger(AiGoalAssistantService.name);
    private readonly anthropic: Anthropic | null = null;

    constructor() {
        const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
        if (apiKey) {
            this.anthropic = new Anthropic({ apiKey });
        }
    }

    /**
     * توليد هدف SMART من نص طبيعي
     */
    async generateGoal(prompt: string, context?: string): Promise<{
        title: string;
        titleEn?: string;
        description: string;
        targetValue?: number;
        unit?: string;
        suggestions: string[];
    }> {
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
        } catch (error) {
            this.logger.error('AI Goal Generation Error:', error);
            return {
                title: prompt,
                description: 'لم نتمكن من معالجة الهدف بالذكاء الاصطناعي',
                suggestions: [],
            };
        }
    }

    /**
     * توليد OKR كامل (هدف + نتائج رئيسية)
     */
    async generateOKR(objective: string, context?: string): Promise<{
        objective: {
            title: string;
            description: string;
        };
        keyResults: Array<{
            title: string;
            targetValue: number;
            unit: string;
        }>;
    }> {
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
        } catch (error) {
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

    /**
     * تحليل وتلخيص ملاحظات التقييم
     */
    async summarizeFeedback(feedbackComments: string[]): Promise<{
        summary: string;
        strengths: string[];
        improvements: string[];
        themes: string[];
    }> {
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
        } catch (error) {
            this.logger.error('AI Feedback Summary Error:', error);
            return {
                summary: 'خطأ في التحليل',
                strengths: [],
                improvements: [],
                themes: [],
            };
        }
    }
}

