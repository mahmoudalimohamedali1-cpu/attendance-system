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
var IntentClassifierService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentClassifierService = exports.IntentType = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
var IntentType;
(function (IntentType) {
    IntentType["ENHANCEMENT"] = "enhancement";
    IntentType["CREATION"] = "creation";
    IntentType["QUERY"] = "query";
    IntentType["EXECUTIVE_COMMAND"] = "executive_command";
    IntentType["SELF_HEAL"] = "self_heal";
    IntentType["EMPLOYEE_ACTION"] = "employee_action";
    IntentType["LEAVE_ACTION"] = "leave_action";
    IntentType["TASK_ACTION"] = "task_action";
    IntentType["REPORT"] = "report";
    IntentType["GENERAL_CHAT"] = "general_chat";
    IntentType["UNKNOWN"] = "unknown";
})(IntentType || (exports.IntentType = IntentType = {}));
let IntentClassifierService = IntentClassifierService_1 = class IntentClassifierService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(IntentClassifierService_1.name);
        this.patterns = [];
        this.CONFIDENCE_THRESHOLD = 0.6;
        this.initializePatterns();
    }
    normalizeArabic(text) {
        return text
            .replace(/[\u064B-\u065F\u0670]/g, '')
            .replace(/[أإآ]/g, 'ا')
            .replace(/[ى]/g, 'ي')
            .replace(/[ة]/g, 'ه')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }
    initializePatterns() {
        this.patterns.push({
            pattern: /^(ضيف|أضف|اضف)\s+(ل|إلى|الى|لـ|على|نوع)/,
            intent: IntentType.ENHANCEMENT,
            subIntent: 'add_to_system',
            priority: 100,
        }, {
            pattern: /(لسيستم|للسيستم|لنظام|للنظام)\s*(ال)?(اجازات?|حضور|رواتب|موظفين)/,
            intent: IntentType.ENHANCEMENT,
            subIntent: 'modify_system',
            priority: 95,
        }, {
            pattern: /(اجازة|إجازة|اجازات|إجازات).*(نوع|جديد|مرضية|سنوية|طارئة)/,
            intent: IntentType.ENHANCEMENT,
            subIntent: 'leave_type',
            priority: 90,
        }, {
            pattern: /كل\s*موظف.*(يوم|ايام|أيام).*(اجازه|إجازة|سنوي)/,
            intent: IntentType.ENHANCEMENT,
            subIntent: 'employee_leave_quota',
            priority: 90,
        }, {
            pattern: /^(deploy|نشر|انشر)\b/i,
            intent: IntentType.EXECUTIVE_COMMAND,
            subIntent: 'deploy',
            priority: 85,
        }, {
            pattern: /^(backup|باك ?اب)\b/i,
            intent: IntentType.EXECUTIVE_COMMAND,
            subIntent: 'backup',
            priority: 85,
        }, {
            pattern: /(حالة النظام|monitor|مراقبة|status)/i,
            intent: IntentType.EXECUTIVE_COMMAND,
            subIntent: 'monitor',
            priority: 85,
        }, {
            pattern: /^(logs|لوج|سجلات)\b/i,
            intent: IntentType.EXECUTIVE_COMMAND,
            subIntent: 'logs',
            priority: 85,
        }, {
            pattern: /^git\s+(status|log|pull|push)/i,
            intent: IntentType.EXECUTIVE_COMMAND,
            subIntent: 'git',
            priority: 85,
        }, {
            pattern: /(اصلح|صلح|fix|heal)\s*(موديول|module)?/i,
            intent: IntentType.SELF_HEAL,
            priority: 80,
        }, {
            pattern: /^(اعمل|انشئ|أنشئ|إنشاء|create|build)\s+(نظام|سيستم|موديول|module)/i,
            intent: IntentType.CREATION,
            subIntent: 'new_system',
            priority: 75,
        }, {
            pattern: /(اضف|ضيف|أضف)\s+(موظف|عامل)/,
            intent: IntentType.EMPLOYEE_ACTION,
            subIntent: 'add_employee',
            priority: 70,
        }, {
            pattern: /(عدل|غير|حدث)\s+(راتب|قسم|بيانات)\s+\w+/,
            intent: IntentType.EMPLOYEE_ACTION,
            subIntent: 'update_employee',
            priority: 70,
        }, {
            pattern: /(احذف|امسح)\s+(موظف)/,
            intent: IntentType.EMPLOYEE_ACTION,
            subIntent: 'delete_employee',
            priority: 70,
        }, {
            pattern: /(طلب|اجازة|إجازة)\s+(من|ل)?\s*\d+/,
            intent: IntentType.LEAVE_ACTION,
            subIntent: 'create_leave',
            priority: 65,
        }, {
            pattern: /(وافق|قبول|رفض)\s+(على\s+)?(طلب|اجازة)/,
            intent: IntentType.LEAVE_ACTION,
            subIntent: 'approve_leave',
            priority: 65,
        }, {
            pattern: /(مهمة|task)\s+(جديدة|ل|الى)/i,
            intent: IntentType.TASK_ACTION,
            subIntent: 'create_task',
            priority: 65,
        }, {
            pattern: /(تقرير|احصائيات|report|statistics)/i,
            intent: IntentType.REPORT,
            priority: 60,
        }, {
            pattern: /(كم|عدد|مين|من)\s+(الموظفين|المتأخرين|الغائبين)/,
            intent: IntentType.QUERY,
            priority: 55,
        }, {
            pattern: /(اعرض|عرض|كم|ما|show|list)\s+/i,
            intent: IntentType.QUERY,
            priority: 50,
        });
        this.patterns.sort((a, b) => b.priority - a.priority);
    }
    classifyIntent(message) {
        const normalized = this.normalizeArabic(message);
        const original = message.trim();
        let bestMatch = {
            intent: IntentType.GENERAL_CHAT,
            confidence: 0.3,
            entities: {},
            requiresClarification: false,
        };
        for (const config of this.patterns) {
            const match = normalized.match(config.pattern) || original.match(config.pattern);
            if (match) {
                const matchLength = match[0].length;
                const messageLength = normalized.length;
                const coverageRatio = matchLength / messageLength;
                const confidence = Math.min(0.95, 0.6 + (coverageRatio * 0.3) + (config.priority / 300));
                if (confidence > bestMatch.confidence) {
                    const entities = {};
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
        if (bestMatch.intent === IntentType.ENHANCEMENT &&
            this.isNewSystemRequest(normalized)) {
            bestMatch.intent = IntentType.CREATION;
            bestMatch.subIntent = 'new_system';
        }
        if (bestMatch.requiresClarification) {
            bestMatch.suggestedClarification = this.generateClarification(bestMatch.intent, message);
        }
        this.logger.debug(`Intent: ${bestMatch.intent} (${bestMatch.confidence.toFixed(2)}) for: "${message.substring(0, 50)}..."`);
        return bestMatch;
    }
    isNewSystemRequest(normalized) {
        const newSystemPatterns = [
            /اعمل\s+نظام\s+جديد/,
            /انشئ\s+سيستم/,
            /create\s+new\s+system/i,
            /نظام.*كامل/,
        ];
        return newSystemPatterns.some(p => p.test(normalized));
    }
    generateClarification(intent, message) {
        switch (intent) {
            case IntentType.ENHANCEMENT:
                return 'هل تريد تعديل نظام موجود أم إنشاء نظام جديد؟';
            case IntentType.EMPLOYEE_ACTION:
                return 'هل يمكنك تحديد اسم الموظف بشكل أوضح؟';
            case IntentType.LEAVE_ACTION:
                return 'ما نوع الإجازة والمدة المطلوبة؟';
            default:
                return 'هل يمكنك توضيح طلبك بشكل أكثر تفصيلاً؟';
        }
    }
    requiresAdminRole(intent) {
        const adminIntents = [
            IntentType.ENHANCEMENT,
            IntentType.CREATION,
            IntentType.EXECUTIVE_COMMAND,
            IntentType.SELF_HEAL,
        ];
        return adminIntents.includes(intent);
    }
    getPatternStats() {
        const byIntent = {};
        for (const p of this.patterns) {
            byIntent[p.intent] = (byIntent[p.intent] || 0) + 1;
        }
        return { total: this.patterns.length, byIntent };
    }
};
exports.IntentClassifierService = IntentClassifierService;
exports.IntentClassifierService = IntentClassifierService = IntentClassifierService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], IntentClassifierService);
//# sourceMappingURL=intent-classifier.service.js.map