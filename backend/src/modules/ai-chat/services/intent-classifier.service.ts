import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';

/**
 * 🎯 Intent Classifier Service
 * Centralized intent detection with confidence scoring
 */

export interface IntentResult {
    intent: IntentType;
    confidence: number;
    subIntent?: string;
    entities: Record<string, any>;
    requiresClarification: boolean;
    suggestedClarification?: string;
}

export enum IntentType {
    ENHANCEMENT = 'enhancement',
    CREATION = 'creation',
    QUERY = 'query',
    EXECUTIVE_COMMAND = 'executive_command',
    SELF_HEAL = 'self_heal',
    EMPLOYEE_ACTION = 'employee_action',
    LEAVE_ACTION = 'leave_action',
    TASK_ACTION = 'task_action',
    GOAL_ACTION = 'goal_action',
    PERFORMANCE_ACTION = 'performance_action',
    RECOGNITION_ACTION = 'recognition_action',
    PAYROLL_ACTION = 'payroll_action',
    REPORT = 'report',
    GENERAL_CHAT = 'general_chat',
    UNKNOWN = 'unknown',
}

interface PatternConfig {
    pattern: RegExp;
    intent: IntentType;
    subIntent?: string;
    priority: number;
    extractors?: ((match: RegExpMatchArray, message: string) => Record<string, any>)[];
}

@Injectable()
export class IntentClassifierService {
    private readonly logger = new Logger(IntentClassifierService.name);
    private readonly patterns: PatternConfig[] = [];
    private readonly CONFIDENCE_THRESHOLD = 0.6;

    constructor(private configService: ConfigService) {
        this.initializePatterns();
    }

    /**
     * 📝 Normalize Arabic text for better matching
     */
    private normalizeArabic(text: string): string {
        return text
            // Remove Arabic diacritics (Tashkeel)
            .replace(/[\u064B-\u065F\u0670]/g, '')
            // Normalize Alef variations
            .replace(/[أإآ]/g, 'ا')
            // Normalize Yaa/Alef Maqsura
            .replace(/[ى]/g, 'ي')
            // Normalize Taa Marbuta
            .replace(/[ة]/g, 'ه')
            // Normalize spaces
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    /**
     * 🔧 Initialize pattern configurations
     */
    private initializePatterns(): void {
        this.patterns.push(
            // Enhancement patterns (highest priority)
            {
                pattern: /^(ضيف|أضف|اضف)\s+(ل|إلى|الى|لـ|على|نوع)/,
                intent: IntentType.ENHANCEMENT,
                subIntent: 'add_to_system',
                priority: 100,
            },
            {
                pattern: /(لسيستم|للسيستم|لنظام|للنظام)\s*(ال)?(اجازات?|حضور|رواتب|موظفين)/,
                intent: IntentType.ENHANCEMENT,
                subIntent: 'modify_system',
                priority: 95,
            },
            {
                pattern: /(اجازة|إجازة|اجازات|إجازات).*(نوع|جديد|مرضية|سنوية|طارئة)/,
                intent: IntentType.ENHANCEMENT,
                subIntent: 'leave_type',
                priority: 90,
            },
            {
                pattern: /كل\s*موظف.*(يوم|ايام|أيام).*(اجازه|إجازة|سنوي)/,
                intent: IntentType.ENHANCEMENT,
                subIntent: 'employee_leave_quota',
                priority: 90,
            },

            // Executive commands
            {
                pattern: /^(deploy|نشر|انشر)\b/i,
                intent: IntentType.EXECUTIVE_COMMAND,
                subIntent: 'deploy',
                priority: 85,
            },
            {
                pattern: /^(backup|باك ?اب)\b/i,
                intent: IntentType.EXECUTIVE_COMMAND,
                subIntent: 'backup',
                priority: 85,
            },
            {
                pattern: /(حالة النظام|monitor|مراقبة|status)/i,
                intent: IntentType.EXECUTIVE_COMMAND,
                subIntent: 'monitor',
                priority: 85,
            },
            {
                pattern: /^(logs|لوج|سجلات)\b/i,
                intent: IntentType.EXECUTIVE_COMMAND,
                subIntent: 'logs',
                priority: 85,
            },
            {
                pattern: /^git\s+(status|log|pull|push)/i,
                intent: IntentType.EXECUTIVE_COMMAND,
                subIntent: 'git',
                priority: 85,
            },

            // Self-heal
            {
                pattern: /(اصلح|صلح|fix|heal)\s*(موديول|module)?/i,
                intent: IntentType.SELF_HEAL,
                priority: 80,
            },

            // Creation patterns
            {
                pattern: /^(اعمل|انشئ|أنشئ|إنشاء|create|build)\s+(نظام|سيستم|موديول|module)/i,
                intent: IntentType.CREATION,
                subIntent: 'new_system',
                priority: 75,
            },

            // Employee actions
            {
                pattern: /(اضف|ضيف|أضف)\s+(موظف|عامل)/,
                intent: IntentType.EMPLOYEE_ACTION,
                subIntent: 'add_employee',
                priority: 70,
            },
            {
                pattern: /(عدل|غير|حدث)\s+(راتب|قسم|بيانات)\s+\w+/,
                intent: IntentType.EMPLOYEE_ACTION,
                subIntent: 'update_employee',
                priority: 70,
            },
            {
                pattern: /(احذف|امسح)\s+(موظف)/,
                intent: IntentType.EMPLOYEE_ACTION,
                subIntent: 'delete_employee',
                priority: 70,
            },

            // Leave actions
            {
                pattern: /(طلب|اجازة|إجازة)\s+(من|ل)?\s*\d+/,
                intent: IntentType.LEAVE_ACTION,
                subIntent: 'create_leave',
                priority: 65,
            },
            {
                pattern: /(وافق|قبول|رفض)\s+(على\s+)?(طلب|اجازة)/,
                intent: IntentType.LEAVE_ACTION,
                subIntent: 'approve_leave',
                priority: 65,
            },

            // Task actions
            {
                pattern: /(مهمة|task)\s+(جديدة|ل|الى)/i,
                intent: IntentType.TASK_ACTION,
                subIntent: 'create_task',
                priority: 65,
            },

            // Goal actions
            {
                pattern: /(اضف|أضف|انشئ|حدد)\s+(هدف)/,
                intent: IntentType.GOAL_ACTION,
                subIntent: 'create_goal',
                priority: 65,
            },
            {
                pattern: /(عدل|حدث|غير)\s+(هدف)/,
                intent: IntentType.GOAL_ACTION,
                subIntent: 'update_goal',
                priority: 65,
            },
            {
                pattern: /(تقدم|أهداف|هدف).*(\d+%|نسبة)/,
                intent: IntentType.GOAL_ACTION,
                subIntent: 'update_progress',
                priority: 65,
            },

            // Performance review actions
            {
                pattern: /(انشئ|أضف)\s+(تقييم|تقييم أداء)/,
                intent: IntentType.PERFORMANCE_ACTION,
                subIntent: 'create_review',
                priority: 65,
            },
            {
                pattern: /(تقييم|أداء)\s+(ل|\u0644ـ)\s*\w+/,
                intent: IntentType.PERFORMANCE_ACTION,
                subIntent: 'create_review',
                priority: 64,
            },

            // Recognition actions
            {
                pattern: /(ارسل|أرسل)\s+(تقدير|شكر)/,
                intent: IntentType.RECOGNITION_ACTION,
                subIntent: 'send_recognition',
                priority: 65,
            },
            {
                pattern: /(تقدير|شكر)\s+(ل|\u0644ـ)\s*\w+/,
                intent: IntentType.RECOGNITION_ACTION,
                subIntent: 'send_recognition',
                priority: 64,
            },

            // Payroll actions
            {
                pattern: /(احسب|حساب)\s+(رواتب|الرواتب)/,
                intent: IntentType.PAYROLL_ACTION,
                subIntent: 'calculate_payroll',
                priority: 65,
            },
            {
                pattern: /(وافق)\s+(على)?\s*(رواتب|مسير)/,
                intent: IntentType.PAYROLL_ACTION,
                subIntent: 'approve_payroll',
                priority: 65,
            },
            {
                pattern: /(مسير|مسيرات)\s+(رواتب)/,
                intent: IntentType.PAYROLL_ACTION,
                subIntent: 'view_payroll',
                priority: 60,
            },

            // Reports
            {
                pattern: /(تقرير|احصائيات|report|statistics)/i,
                intent: IntentType.REPORT,
                priority: 60,
            },
            {
                pattern: /(كم|عدد|مين|من)\s+(الموظفين|المتأخرين|الغائبين)/,
                intent: IntentType.QUERY,
                priority: 55,
            },

            // Query patterns
            {
                pattern: /(اعرض|عرض|كم|ما|show|list)\s+/i,
                intent: IntentType.QUERY,
                priority: 50,
            },
        );

        // Sort by priority descending
        this.patterns.sort((a, b) => b.priority - a.priority);
    }

    /**
     * 🎯 Classify the intent of a message
     */
    classifyIntent(message: string): IntentResult {
        const normalized = this.normalizeArabic(message);
        const original = message.trim();

        let bestMatch: IntentResult = {
            intent: IntentType.GENERAL_CHAT,
            confidence: 0.3,
            entities: {},
            requiresClarification: false,
        };

        for (const config of this.patterns) {
            const match = normalized.match(config.pattern) || original.match(config.pattern);

            if (match) {
                // Calculate confidence based on match quality
                const matchLength = match[0].length;
                const messageLength = normalized.length;
                const coverageRatio = matchLength / messageLength;
                const confidence = Math.min(0.95, 0.6 + (coverageRatio * 0.3) + (config.priority / 300));

                if (confidence > bestMatch.confidence) {
                    const entities: Record<string, any> = {};

                    // Extract entities if extractors defined
                    if (config.extractors) {
                        for (const extractor of config.extractors) {
                            Object.assign(entities, extractor(match, original));
                        }
                    }

                    bestMatch = {
                        intent: config.intent,
                        confidence,
                        subIntent: config.subIntent,
                        entities,
                        requiresClarification: confidence < this.CONFIDENCE_THRESHOLD,
                    };
                }
            }
        }

        // If low confidence, check for new system creation exclusion
        if (bestMatch.intent === IntentType.ENHANCEMENT &&
            this.isNewSystemRequest(normalized)) {
            bestMatch.intent = IntentType.CREATION;
            bestMatch.subIntent = 'new_system';
        }

        // Add clarification suggestion if needed
        if (bestMatch.requiresClarification) {
            bestMatch.suggestedClarification = this.generateClarification(bestMatch.intent, message);
        }

        this.logger.debug(`Intent: ${bestMatch.intent} (${bestMatch.confidence.toFixed(2)}) for: "${message.substring(0, 50)}..."`);

        return bestMatch;
    }

    /**
     * 🔍 Check if this is a new system request (not enhancement)
     */
    private isNewSystemRequest(normalized: string): boolean {
        const newSystemPatterns = [
            /اعمل\s+نظام\s+جديد/,
            /انشئ\s+سيستم/,
            /create\s+new\s+system/i,
            /نظام.*كامل/,
        ];

        return newSystemPatterns.some(p => p.test(normalized));
    }

    /**
     * 💬 Generate clarification question
     */
    private generateClarification(intent: IntentType, message: string): string {
        switch (intent) {
            case IntentType.ENHANCEMENT:
                return 'هل تريد تعديل نظام موجود أم إنشاء نظام جديد؟';
            case IntentType.EMPLOYEE_ACTION:
                return 'هل يمكنك تحديد اسم الموظف بشكل أوضح؟';
            case IntentType.LEAVE_ACTION:
                return 'ما نوع الإجازة والمدة المطلوبة؟';
            case IntentType.GOAL_ACTION:
                return 'ما هو عنوان الهدف؟ ولمن؟';
            case IntentType.PERFORMANCE_ACTION:
                return 'لأي موظف تريد إنشاء تقييم الأداء؟';
            case IntentType.RECOGNITION_ACTION:
                return 'لمن تريد إرسال التقدير؟ وما السبب؟';
            case IntentType.PAYROLL_ACTION:
                return 'لأي شهر وسنة تريد حساب الرواتب؟';
            default:
                return 'هل يمكنك توضيح طلبك بشكل أكثر تفصيلاً؟';
        }
    }

    /**
     * ✅ Check if intent requires admin role
     */
    requiresAdminRole(intent: IntentType): boolean {
        const adminIntents = [
            IntentType.ENHANCEMENT,
            IntentType.CREATION,
            IntentType.EXECUTIVE_COMMAND,
            IntentType.SELF_HEAL,
        ];
        return adminIntents.includes(intent);
    }

    /**
     * 📊 Get all pattern statistics
     */
    getPatternStats(): { total: number; byIntent: Record<string, number> } {
        const byIntent: Record<string, number> = {};
        for (const p of this.patterns) {
            byIntent[p.intent] = (byIntent[p.intent] || 0) + 1;
        }
        return { total: this.patterns.length, byIntent };
    }
}
