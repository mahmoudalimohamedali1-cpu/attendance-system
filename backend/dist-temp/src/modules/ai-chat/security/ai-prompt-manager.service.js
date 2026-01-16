"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AIPromptManagerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIPromptManagerService = void 0;
const common_1 = require("@nestjs/common");
let AIPromptManagerService = AIPromptManagerService_1 = class AIPromptManagerService {
    constructor() {
        this.logger = new common_1.Logger(AIPromptManagerService_1.name);
        this.cache = new Map();
        this.CACHE_TTL_MS = 5 * 60 * 1000;
        this.MAX_CACHE_SIZE = 100;
        this.totalInputTokens = 0;
        this.totalOutputTokens = 0;
        this.totalCalls = 0;
        this.templates = new Map([
            ['enhancement_analysis', {
                    name: 'Enhancement Analysis',
                    systemInstruction: `أنت محلل طلبات تطوير نظام الموارد البشرية.
حلل طلب المستخدم وأرجع JSON بالشكل التالي:
{
  "operation": "add_enum|update_value|create_field|add_feature",
  "targetSystem": "leaves|attendance|employees|payroll",
  "description": "وصف مختصر",
  "confidence": 0.0-1.0,
  "requiredChanges": ["تغيير 1", "تغيير 2"]
}`,
                    fewShotExamples: [
                        {
                            input: 'ضيف نوع إجازة اسمه إجازة زواج',
                            output: '{"operation":"add_enum","targetSystem":"leaves","description":"إضافة نوع إجازة جديد: إجازة زواج","confidence":0.95,"requiredChanges":["إضافة enum في نوع الإجازات","تحديث نموذج الإجازة"]}'
                        },
                        {
                            input: 'زود عدد أيام الإجازة السنوية لـ 25',
                            output: '{"operation":"update_value","targetSystem":"leaves","description":"تغيير الحد الأقصى للإجازة السنوية","confidence":0.9,"requiredChanges":["تحديث الإعدادات الافتراضية"]}'
                        }
                    ],
                    maxTokens: 500,
                    temperature: 0.3,
                }],
            ['employee_action', {
                    name: 'Employee Action Parser',
                    systemInstruction: `أنت مساعد إدارة الموظفين.
حلل طلب المستخدم وحدد الإجراء المطلوب:
{
  "action": "create|update|delete|query",
  "employeeName": "اسم الموظف",
  "field": "الحقل المطلوب تعديله (اختياري)",
  "value": "القيمة الجديدة (اختياري)"
}`,
                    fewShotExamples: [
                        {
                            input: 'سجل موظف جديد اسمه أحمد محمد',
                            output: '{"action":"create","employeeName":"أحمد محمد"}'
                        },
                        {
                            input: 'عدل راتب محمد علي ليصبح 8000',
                            output: '{"action":"update","employeeName":"محمد علي","field":"salary","value":8000}'
                        }
                    ],
                    maxTokens: 300,
                    temperature: 0.2,
                }],
            ['general_assistant', {
                    name: 'General HR Assistant',
                    systemInstruction: `أنت مساعد ذكي لنظام الحضور والموارد البشرية.
أجب على أسئلة المستخدم بشكل مختصر ومفيد بالعربية.
لا تخترع بيانات - اذكر فقط المعلومات المتوفرة.
إذا لم تكن متأكداً، اطلب توضيحاً.`,
                    maxTokens: 1000,
                    temperature: 0.7,
                }],
            ['query_builder', {
                    name: 'Query Builder',
                    systemInstruction: `أنت مساعد استعلام البيانات.
حلل سؤال المستخدم وحدد:
{
  "queryType": "count|list|aggregate|detail",
  "entity": "employees|attendance|leaves|payroll",
  "filters": {},
  "timeRange": {"from": "", "to": ""}
}`,
                    fewShotExamples: [
                        {
                            input: 'كم موظف في قسم التقنية؟',
                            output: '{"queryType":"count","entity":"employees","filters":{"department":"التقنية"}}'
                        },
                        {
                            input: 'أعطني تقرير الحضور لهذا الشهر',
                            output: '{"queryType":"list","entity":"attendance","timeRange":{"from":"2026-01-01","to":"2026-01-31"}}'
                        }
                    ],
                    maxTokens: 400,
                    temperature: 0.3,
                }],
            ['code_generator', {
                    name: 'Code Generator',
                    systemInstruction: `أنت مطور TypeScript/NestJS محترف.
اكتب كود نظيف وآمن مع:
- التحقق من المدخلات
- معالجة الأخطاء
- التعليقات بالعربية
- أنواع TypeScript الصحيحة`,
                    maxTokens: 2000,
                    temperature: 0.4,
                }],
        ]);
    }
    getTemplate(name) {
        return this.templates.get(name);
    }
    buildPrompt(templateName, userMessage, context) {
        const template = this.templates.get(templateName);
        if (!template) {
            const fallback = this.templates.get('general_assistant');
            return {
                systemInstruction: fallback.systemInstruction,
                prompt: userMessage,
                config: { maxTokens: fallback.maxTokens || 1000, temperature: fallback.temperature || 0.7 },
            };
        }
        let prompt = '';
        if (template.fewShotExamples && template.fewShotExamples.length > 0) {
            prompt += 'أمثلة:\n\n';
            for (const example of template.fewShotExamples) {
                prompt += `المستخدم: ${example.input}\nالمساعد: ${example.output}\n\n`;
            }
            prompt += '---\n\n';
        }
        if (context) {
            prompt += `السياق:\n${context}\n\n`;
        }
        prompt += `المستخدم: ${userMessage}\nالمساعد: `;
        return {
            systemInstruction: template.systemInstruction,
            prompt,
            config: {
                maxTokens: template.maxTokens || 1000,
                temperature: template.temperature || 0.5,
            },
        };
    }
    getCached(key) {
        const cacheKey = this.hashKey(key);
        const cached = this.cache.get(cacheKey);
        if (!cached)
            return null;
        if (Date.now() - cached.timestamp > this.CACHE_TTL_MS) {
            this.cache.delete(cacheKey);
            return null;
        }
        cached.hitCount++;
        return cached.response;
    }
    setCache(key, response) {
        if (this.cache.size >= this.MAX_CACHE_SIZE) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey)
                this.cache.delete(oldestKey);
        }
        const cacheKey = this.hashKey(key);
        this.cache.set(cacheKey, {
            response,
            timestamp: Date.now(),
            hitCount: 1,
        });
    }
    hashKey(input) {
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }
    trackUsage(inputTokens, outputTokens) {
        this.totalInputTokens += inputTokens;
        this.totalOutputTokens += outputTokens;
        this.totalCalls++;
        if (this.totalCalls % 100 === 0) {
            this.logger.log(`AI Usage: ${this.totalCalls} calls, ${this.totalInputTokens}/${this.totalOutputTokens} tokens (in/out)`);
        }
    }
    getUsageStats() {
        let totalHits = 0;
        for (const cached of this.cache.values()) {
            totalHits += cached.hitCount;
        }
        return {
            totalCalls: this.totalCalls,
            totalInputTokens: this.totalInputTokens,
            totalOutputTokens: this.totalOutputTokens,
            cacheHitRate: this.totalCalls > 0 ? (totalHits / this.totalCalls) * 100 : 0,
            cacheSize: this.cache.size,
        };
    }
    clearCache() {
        this.cache.clear();
        this.logger.log('AI response cache cleared');
    }
    listTemplates() {
        return Array.from(this.templates.keys());
    }
};
exports.AIPromptManagerService = AIPromptManagerService;
exports.AIPromptManagerService = AIPromptManagerService = AIPromptManagerService_1 = __decorate([
    (0, common_1.Injectable)()
], AIPromptManagerService);
//# sourceMappingURL=ai-prompt-manager.service.js.map