"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AdvancedAIService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedAIService = void 0;
const common_1 = require("@nestjs/common");
let AdvancedAIService = AdvancedAIService_1 = class AdvancedAIService {
    constructor() {
        this.logger = new common_1.Logger(AdvancedAIService_1.name);
        this.memories = new Map();
        this.positivePatterns = /شكر|ممتاز|رائع|سعيد|مبروك|أحسنت|thank|great|excellent|happy/i;
        this.negativePatterns = /مشكلة|صعب|سيء|غضب|خطأ|فشل|problem|bad|angry|wrong|fail/i;
        this.emotionKeywords = {
            joy: { ar: 'فرح', patterns: /سعيد|مبروك|فرح|happy|joy|celebrate/i },
            frustration: { ar: 'إحباط', patterns: /محبط|صعب|مشكلة|frustrat|difficult/i },
            gratitude: { ar: 'امتنان', patterns: /شكر|ممتن|thank|grateful/i },
            concern: { ar: 'قلق', patterns: /قلق|خائف|worried|concern/i },
            excitement: { ar: 'حماس', patterns: /متحمس|رائع|excit|amazing/i },
        };
    }
    analyzeSentiment(text) {
        const hasPositive = this.positivePatterns.test(text);
        const hasNegative = this.negativePatterns.test(text);
        let sentiment;
        let sentimentAr;
        if (hasPositive && hasNegative) {
            sentiment = 'mixed';
            sentimentAr = 'مختلط';
        }
        else if (hasPositive) {
            sentiment = 'positive';
            sentimentAr = 'إيجابي';
        }
        else if (hasNegative) {
            sentiment = 'negative';
            sentimentAr = 'سلبي';
        }
        else {
            sentiment = 'neutral';
            sentimentAr = 'محايد';
        }
        const emotions = [];
        for (const [emotion, data] of Object.entries(this.emotionKeywords)) {
            if (data.patterns.test(text)) {
                emotions.push({
                    emotion,
                    emotionAr: data.ar,
                    score: 0.7 + Math.random() * 0.25,
                });
            }
        }
        const words = text.split(/\s+/).filter(w => w.length > 3);
        const keywords = [...new Set(words)].slice(0, 5);
        return {
            text,
            sentiment,
            sentimentAr,
            confidence: 0.75 + Math.random() * 0.2,
            emotions,
            keywords,
        };
    }
    summarizeText(text, maxLength = 100) {
        const sentences = text.split(/[.。！？!?]/).filter(s => s.trim());
        const originalLength = text.length;
        let summary = '';
        const keyPoints = [];
        for (const sentence of sentences) {
            if (summary.length + sentence.length <= maxLength) {
                summary += sentence.trim() + '. ';
                keyPoints.push(sentence.trim());
            }
            else {
                break;
            }
        }
        if (!summary && sentences.length > 0) {
            summary = sentences[0].substring(0, maxLength) + '...';
            keyPoints.push(summary);
        }
        return {
            originalLength,
            summaryLength: summary.length,
            compression: Math.round((1 - summary.length / originalLength) * 100),
            summary: summary.trim(),
            keyPoints,
            entities: this.extractEntities(text),
        };
    }
    extractEntities(text) {
        const entities = [];
        const dateMatch = text.match(/\d{4}[-/]\d{2}[-/]\d{2}|\d{1,2}[-/]\d{1,2}[-/]\d{4}/);
        if (dateMatch) {
            entities.push({ type: 'date', value: dateMatch[0] });
        }
        const numMatch = text.match(/\d+(?:,\d{3})*(?:\.\d+)?/);
        if (numMatch) {
            entities.push({ type: 'number', value: numMatch[0] });
        }
        const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
        if (emailMatch) {
            entities.push({ type: 'email', value: emailMatch[0] });
        }
        return entities;
    }
    getSuggestions(context, lastMessage) {
        const suggestions = [];
        if (/إجازة|leave/i.test(lastMessage)) {
            suggestions.push({
                id: '1',
                type: 'action',
                typeAr: 'إجراء',
                text: 'هل تريد طلب إجازة الآن؟',
                confidence: 0.85,
            });
        }
        if (/راتب|salary/i.test(lastMessage)) {
            suggestions.push({
                id: '2',
                type: 'action',
                typeAr: 'إجراء',
                text: 'هل تريد عرض كشف الراتب؟',
                confidence: 0.9,
            });
        }
        if (/شكر|thank/i.test(lastMessage)) {
            suggestions.push({
                id: '3',
                type: 'followup',
                typeAr: 'متابعة',
                text: 'هل هناك شيء آخر يمكنني مساعدتك به؟',
                confidence: 0.8,
            });
        }
        if (suggestions.length === 0) {
            suggestions.push({ id: 'd1', type: 'action', typeAr: 'إجراء', text: 'عرض رصيد الإجازات', confidence: 0.6 }, { id: 'd2', type: 'action', typeAr: 'إجراء', text: 'تسجيل الحضور', confidence: 0.6 }, { id: 'd3', type: 'action', typeAr: 'إجراء', text: 'طلب المساعدة', confidence: 0.5 });
        }
        return suggestions.slice(0, 3);
    }
    storeMemory(userId, topic, value) {
        let memory = this.memories.get(userId);
        if (!memory) {
            memory = { userId, topics: [], preferences: {}, context: [] };
            this.memories.set(userId, memory);
        }
        const existingTopic = memory.topics.find(t => t.topic === topic);
        if (existingTopic) {
            existingTopic.frequency++;
            existingTopic.lastMentioned = new Date();
        }
        else {
            memory.topics.push({ topic, frequency: 1, lastMentioned: new Date() });
        }
        memory.context.push({
            key: topic,
            value,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        if (memory.context.length > 10) {
            memory.context = memory.context.slice(-10);
        }
    }
    getMemory(userId) {
        return this.memories.get(userId) || null;
    }
    generateInsights(data) {
        return [
            {
                category: 'productivity',
                categoryAr: 'الإنتاجية',
                insight: 'لاحظت أنك تسأل عن الإجازات كثيراً. هل تحتاج لاستراحة؟',
                confidence: 0.75,
                actionable: true,
                suggestedAction: 'جدول إجازة قصيرة',
            },
            {
                category: 'pattern',
                categoryAr: 'نمط',
                insight: 'معظم استفساراتك تكون في الصباح الباكر',
                confidence: 0.85,
                actionable: false,
            },
        ];
    }
    formatSentiment(result) {
        const emoji = {
            positive: '😊',
            negative: '😔',
            neutral: '😐',
            mixed: '😕',
        }[result.sentiment];
        let message = `${emoji} **تحليل المشاعر:**\n\n`;
        message += `📊 ${result.sentimentAr} (${Math.round(result.confidence * 100)}% ثقة)\n\n`;
        if (result.emotions.length > 0) {
            message += `**المشاعر المكتشفة:**\n`;
            for (const emotion of result.emotions) {
                message += `• ${emotion.emotionAr}: ${Math.round(emotion.score * 100)}%\n`;
            }
        }
        return message;
    }
    formatSuggestions(suggestions) {
        let message = '💡 **اقتراحات:**\n\n';
        for (let i = 0; i < suggestions.length; i++) {
            message += `${i + 1}. ${suggestions[i].text}\n`;
        }
        return message;
    }
};
exports.AdvancedAIService = AdvancedAIService;
exports.AdvancedAIService = AdvancedAIService = AdvancedAIService_1 = __decorate([
    (0, common_1.Injectable)()
], AdvancedAIService);
//# sourceMappingURL=advanced-ai.service.js.map