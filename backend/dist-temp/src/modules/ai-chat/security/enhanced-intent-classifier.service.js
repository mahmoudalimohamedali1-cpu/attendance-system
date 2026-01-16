"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var EnhancedIntentClassifierService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedIntentClassifierService = void 0;
const common_1 = require("@nestjs/common");
let EnhancedIntentClassifierService = EnhancedIntentClassifierService_1 = class EnhancedIntentClassifierService {
    constructor() {
        this.logger = new common_1.Logger(EnhancedIntentClassifierService_1.name);
        this.arabicNormalization = {
            'أ': 'ا', 'إ': 'ا', 'آ': 'ا',
            'ى': 'ي',
            'ة': 'ه',
            'ؤ': 'و',
            'ئ': 'ي',
        };
        this.diacritics = /[\u064B-\u0652]/g;
        this.intentPatterns = [
            {
                intent: 'EXECUTIVE_DEPLOY',
                patterns: [
                    /^(deploy|نشر|انشر|ارفع|رفع)$/i,
                    /(نشر|deploy).*(النظام|المشروع|الكود)/i,
                ],
                keywords: ['deploy', 'نشر', 'انشر', 'ارفع'],
                priority: 100,
            },
            {
                intent: 'EXECUTIVE_STATUS',
                patterns: [
                    /(حالة|status).*(النظام|السيرفر|الخادم)/i,
                    /^(status|حالة النظام|مراقبة)$/i,
                ],
                keywords: ['حالة', 'status', 'مراقبة'],
                priority: 100,
            },
            {
                intent: 'EXECUTIVE_LOGS',
                patterns: [
                    /(logs|لوج|سجلات)/i,
                ],
                keywords: ['logs', 'لوج', 'سجلات'],
                priority: 100,
            },
            {
                intent: 'ENHANCEMENT',
                patterns: [
                    /(اضف|ضيف|اضيف).*(نوع|حقل|ميزة|زر|صفحة)/i,
                    /(غير|عدل|حدث).*(النظام|الكود|البرنامج)/i,
                    /(ضيف|اضف).*(enum|قيمة)/i,
                ],
                keywords: ['ضيف', 'اضف', 'ميزة', 'تعديل النظام'],
                priority: 90,
            },
            {
                intent: 'EMPLOYEE_CREATE',
                patterns: [
                    /(اضف|سجل|انشئ).*(موظف)/i,
                ],
                keywords: ['اضف موظف', 'سجل موظف', 'موظف جديد'],
                priority: 80,
                entityExtractors: {
                    employeeName: /(?:موظف|اسمه?)\s+([\u0600-\u06FF\s]+?)(?:\s|$|،)/i,
                },
            },
            {
                intent: 'EMPLOYEE_UPDATE',
                patterns: [
                    /(عدل|غير|حدث).*(موظف|راتب|قسم)/i,
                ],
                keywords: ['عدل', 'غير', 'حدث'],
                priority: 80,
                entityExtractors: {
                    employeeName: /(موظف|الموظف)\s+([\u0600-\u06FF\s]+?)(?:\s|$|،)/i,
                    field: /(راتب|قسم|ايميل|رقم)/i,
                },
            },
            {
                intent: 'EMPLOYEE_LIST',
                patterns: [
                    /(اعرض|قائمة|كل|جميع).*(موظف)/i,
                    /الموظف(ين|ون)/i,
                ],
                keywords: ['الموظفين', 'قائمة موظفين', 'عرض الموظفين'],
                priority: 70,
            },
            {
                intent: 'LEAVE_REQUEST',
                patterns: [
                    /(طلب|اطلب).*(اجازة|إجازة)/i,
                ],
                keywords: ['طلب اجازة', 'اطلب اجازة'],
                priority: 80,
            },
            {
                intent: 'LEAVE_BALANCE',
                patterns: [
                    /(رصيد).*(اجازة|إجازة)/i,
                    /كم (يوم|اجازة) (لي|عندي)/i,
                ],
                keywords: ['رصيد', 'اجازات', 'رصيد الاجازات'],
                priority: 70,
            },
            {
                intent: 'ATTENDANCE_REPORT',
                patterns: [
                    /(تقرير|سجل).*(حضور|الحضور)/i,
                ],
                keywords: ['تقرير الحضور', 'سجل الحضور'],
                priority: 70,
            },
            {
                intent: 'ATTENDANCE_TODAY',
                patterns: [
                    /(حضور|الحضور).*(اليوم|هالحين)/i,
                    /من.*(حضر|غاب).*(اليوم)/i,
                ],
                keywords: ['حضور اليوم', 'من حضر', 'من غاب'],
                priority: 70,
            },
            {
                intent: 'QUERY_COUNT',
                patterns: [
                    /^كم\s/i,
                    /عدد\s/i,
                ],
                keywords: ['كم', 'عدد', 'احصائيات'],
                priority: 60,
            },
            {
                intent: 'QUERY_LIST',
                patterns: [
                    /^(اعرض|قائمة|اعطني)\s/i,
                ],
                keywords: ['اعرض', 'قائمة', 'اعطني'],
                priority: 60,
            },
        ];
    }
    normalizeArabic(text) {
        let normalized = text;
        normalized = normalized.replace(this.diacritics, '');
        for (const [from, to] of Object.entries(this.arabicNormalization)) {
            normalized = normalized.replace(new RegExp(from, 'g'), to);
        }
        normalized = normalized.replace(/\s+/g, ' ').trim();
        return normalized;
    }
    classify(message) {
        const normalized = this.normalizeArabic(message.toLowerCase());
        const matches = [];
        for (const pattern of this.intentPatterns) {
            let confidence = 0;
            let matched = false;
            for (const regex of pattern.patterns) {
                if (regex.test(normalized)) {
                    confidence = Math.max(confidence, 0.9);
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                for (const keyword of pattern.keywords) {
                    const keywordNorm = this.normalizeArabic(keyword.toLowerCase());
                    const similarity = this.calculateSimilarity(normalized, keywordNorm);
                    if (similarity > 0.6) {
                        confidence = Math.max(confidence, similarity * 0.8);
                        matched = true;
                    }
                }
            }
            if (matched && confidence > 0.3) {
                matches.push({ intent: pattern.intent, confidence, priority: pattern.priority, pattern });
            }
        }
        matches.sort((a, b) => {
            if (a.priority !== b.priority)
                return b.priority - a.priority;
            return b.confidence - a.confidence;
        });
        const topMatch = matches[0];
        const alternatives = matches.slice(1, 3);
        const needsDisambiguation = alternatives.length > 0 &&
            topMatch &&
            alternatives[0].confidence > topMatch.confidence * 0.8;
        const entities = {};
        if (topMatch?.pattern.entityExtractors) {
            for (const [entityName, regex] of Object.entries(topMatch.pattern.entityExtractors)) {
                const match = normalized.match(regex);
                if (match) {
                    entities[entityName] = {
                        value: match[1] || match[0],
                        confidence: 0.85,
                    };
                }
            }
        }
        if (!topMatch) {
            return {
                intent: 'GENERAL_CHAT',
                confidence: 0.5,
                entities: {},
                needsDisambiguation: false,
            };
        }
        return {
            intent: topMatch.intent,
            confidence: topMatch.confidence,
            entities,
            alternativeIntents: alternatives.map(a => ({ intent: a.intent, confidence: a.confidence })),
            needsDisambiguation,
            disambiguationPrompt: needsDisambiguation
                ? this.createDisambiguationPrompt(topMatch.intent, alternatives[0].intent)
                : undefined,
        };
    }
    calculateSimilarity(str1, str2) {
        if (str1.includes(str2) || str2.includes(str1)) {
            return 0.9;
        }
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        if (longer.length === 0)
            return 1.0;
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }
    levenshteinDistance(str1, str2) {
        const m = str1.length;
        const n = str2.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
        for (let i = 0; i <= m; i++)
            dp[i][0] = i;
        for (let j = 0; j <= n; j++)
            dp[0][j] = j;
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
            }
        }
        return dp[m][n];
    }
    createDisambiguationPrompt(intent1, intent2) {
        const prompts = {
            'EMPLOYEE_CREATE-ENHANCEMENT': 'هل تريد إضافة موظف جديد أم تعديل النظام؟',
            'EMPLOYEE_UPDATE-ENHANCEMENT': 'هل تريد تعديل بيانات موظف أم تعديل النظام؟',
            'LEAVE_REQUEST-LEAVE_BALANCE': 'هل تريد طلب إجازة أم معرفة رصيد إجازاتك؟',
            'QUERY_COUNT-QUERY_LIST': 'هل تريد عدد فقط أم قائمة تفصيلية؟',
        };
        const key = `${intent1}-${intent2}`;
        const reverseKey = `${intent2}-${intent1}`;
        return prompts[key] || prompts[reverseKey] || 'هل يمكنك توضيح طلبك أكثر؟';
    }
    getSupportedIntents() {
        return this.intentPatterns.map(p => p.intent);
    }
};
exports.EnhancedIntentClassifierService = EnhancedIntentClassifierService;
exports.EnhancedIntentClassifierService = EnhancedIntentClassifierService = EnhancedIntentClassifierService_1 = __decorate([
    (0, common_1.Injectable)()
], EnhancedIntentClassifierService);
//# sourceMappingURL=enhanced-intent-classifier.service.js.map