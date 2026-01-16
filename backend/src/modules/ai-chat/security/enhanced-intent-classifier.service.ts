import { Injectable, Logger } from '@nestjs/common';

/**
 * 🎯 Enhanced Intent Classifier Service
 * Fixes: #61, #62, #63, #64, #65, #66, #67, #68, #70
 * 
 * - Arabic text normalization
 * - Fuzzy matching
 * - Confidence scoring
 * - Disambiguation prompts
 * - Entity extraction with confidence
 */

export interface IntentMatch {
    intent: string;
    confidence: number;
    entities: Record<string, { value: string; confidence: number }>;
    alternativeIntents?: { intent: string; confidence: number }[];
    needsDisambiguation: boolean;
    disambiguationPrompt?: string;
}

interface IntentPattern {
    intent: string;
    patterns: RegExp[];
    keywords: string[];
    priority: number;
    entityExtractors?: Record<string, RegExp>;
}

@Injectable()
export class EnhancedIntentClassifierService {
    private readonly logger = new Logger(EnhancedIntentClassifierService.name);

    // Arabic normalization map
    private readonly arabicNormalization: Record<string, string> = {
        'أ': 'ا', 'إ': 'ا', 'آ': 'ا',
        'ى': 'ي',
        'ة': 'ه',
        'ؤ': 'و',
        'ئ': 'ي',
    };

    // Diacritics to remove
    private readonly diacritics = /[\u064B-\u0652]/g;

    // Intent patterns with priorities
    private readonly intentPatterns: IntentPattern[] = [
        // Executive commands (highest priority)
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
        // Enhancement requests
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
        // Employee operations
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
        // Leave operations
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
        // Attendance
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
        // Queries
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

    /**
     * 🔤 Normalize Arabic text
     */
    normalizeArabic(text: string): string {
        let normalized = text;

        // Remove diacritics
        normalized = normalized.replace(this.diacritics, '');

        // Normalize characters
        for (const [from, to] of Object.entries(this.arabicNormalization)) {
            normalized = normalized.replace(new RegExp(from, 'g'), to);
        }

        // Normalize whitespace
        normalized = normalized.replace(/\s+/g, ' ').trim();

        return normalized;
    }

    /**
     * 🎯 Classify intent with confidence scoring
     */
    classify(message: string): IntentMatch {
        const normalized = this.normalizeArabic(message.toLowerCase());
        const matches: { intent: string; confidence: number; priority: number; pattern: IntentPattern }[] = [];

        for (const pattern of this.intentPatterns) {
            let confidence = 0;
            let matched = false;

            // Check regex patterns
            for (const regex of pattern.patterns) {
                if (regex.test(normalized)) {
                    confidence = Math.max(confidence, 0.9);
                    matched = true;
                    break;
                }
            }

            // Check keywords with fuzzy matching
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

        // Sort by priority then confidence
        matches.sort((a, b) => {
            if (a.priority !== b.priority) return b.priority - a.priority;
            return b.confidence - a.confidence;
        });

        // Check for disambiguation needed
        const topMatch = matches[0];
        const alternatives = matches.slice(1, 3);

        const needsDisambiguation =
            alternatives.length > 0 &&
            topMatch &&
            alternatives[0].confidence > topMatch.confidence * 0.8;

        // Extract entities
        const entities: Record<string, { value: string; confidence: number }> = {};
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

    /**
     * 📊 Calculate string similarity (Levenshtein-based)
     */
    private calculateSimilarity(str1: string, str2: string): number {
        if (str1.includes(str2) || str2.includes(str1)) {
            return 0.9;
        }

        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1.0;

        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    /**
     * 📏 Levenshtein distance
     */
    private levenshteinDistance(str1: string, str2: string): number {
        const m = str1.length;
        const n = str2.length;
        const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,
                    dp[i][j - 1] + 1,
                    dp[i - 1][j - 1] + cost
                );
            }
        }

        return dp[m][n];
    }

    /**
     * ❓ Create disambiguation prompt
     */
    private createDisambiguationPrompt(intent1: string, intent2: string): string {
        const prompts: Record<string, string> = {
            'EMPLOYEE_CREATE-ENHANCEMENT': 'هل تريد إضافة موظف جديد أم تعديل النظام؟',
            'EMPLOYEE_UPDATE-ENHANCEMENT': 'هل تريد تعديل بيانات موظف أم تعديل النظام؟',
            'LEAVE_REQUEST-LEAVE_BALANCE': 'هل تريد طلب إجازة أم معرفة رصيد إجازاتك؟',
            'QUERY_COUNT-QUERY_LIST': 'هل تريد عدد فقط أم قائمة تفصيلية؟',
        };

        const key = `${intent1}-${intent2}`;
        const reverseKey = `${intent2}-${intent1}`;

        return prompts[key] || prompts[reverseKey] || 'هل يمكنك توضيح طلبك أكثر؟';
    }

    /**
     * 📋 Get supported intents
     */
    getSupportedIntents(): string[] {
        return this.intentPatterns.map(p => p.intent);
    }
}
