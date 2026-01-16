"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var VoiceAccessibilityService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceAccessibilityService = void 0;
const common_1 = require("@nestjs/common");
let VoiceAccessibilityService = VoiceAccessibilityService_1 = class VoiceAccessibilityService {
    constructor() {
        this.logger = new common_1.Logger(VoiceAccessibilityService_1.name);
        this.preferences = new Map();
        this.voicePatterns = [
            { pattern: /سجل.*حضور|check.*in|حضرت/i, intent: 'check_in', intentAr: 'تسجيل حضور' },
            { pattern: /سجل.*انصراف|check.*out|انصرفت/i, intent: 'check_out', intentAr: 'تسجيل انصراف' },
            { pattern: /طلب.*إجازة|request.*leave|أريد إجازة/i, intent: 'request_leave', intentAr: 'طلب إجازة' },
            { pattern: /رصيد.*إجازة|leave.*balance|كم باقي/i, intent: 'leave_balance', intentAr: 'رصيد الإجازات' },
            { pattern: /راتب|salary|كشف.*حساب/i, intent: 'salary_info', intentAr: 'معلومات الراتب' },
            { pattern: /اجتماع|meeting|حجز.*قاعة/i, intent: 'schedule_meeting', intentAr: 'جدولة اجتماع' },
            { pattern: /مساعدة|help|كيف/i, intent: 'help', intentAr: 'المساعدة' },
            { pattern: /إعدادات|settings|ضبط/i, intent: 'settings', intentAr: 'الإعدادات' },
        ];
        this.quickActions = [
            { id: '1', name: 'Check In', nameAr: 'تسجيل حضور', command: 'سجل حضوري', shortcut: 'Ctrl+Shift+I', category: 'attendance' },
            { id: '2', name: 'Check Out', nameAr: 'تسجيل انصراف', command: 'سجل انصرافي', shortcut: 'Ctrl+Shift+O', category: 'attendance' },
            { id: '3', name: 'Request Leave', nameAr: 'طلب إجازة', command: 'أريد إجازة', shortcut: 'Ctrl+Shift+L', category: 'leave' },
            { id: '4', name: 'My Salary', nameAr: 'راتبي', command: 'كشف راتبي', shortcut: 'Ctrl+Shift+S', category: 'hr' },
            { id: '5', name: 'Dashboard', nameAr: 'لوحة التحكم', command: 'الصفحة الرئيسية', shortcut: 'Ctrl+Shift+D', category: 'navigation' },
        ];
    }
    parseVoiceCommand(text) {
        for (const { pattern, intent, intentAr } of this.voicePatterns) {
            if (pattern.test(text)) {
                return {
                    text,
                    intent,
                    intentAr,
                    entities: this.extractEntities(text, intent),
                    confidence: 0.85 + Math.random() * 0.1,
                };
            }
        }
        return {
            text,
            intent: 'unknown',
            intentAr: 'غير معروف',
            entities: [],
            confidence: 0.3,
        };
    }
    extractEntities(text, intent) {
        const entities = [];
        const dateMatch = text.match(/غدا|اليوم|الأسبوع القادم/);
        if (dateMatch) {
            entities.push({ type: 'date', value: dateMatch[0] });
        }
        const numMatch = text.match(/\d+/);
        if (numMatch) {
            entities.push({ type: 'number', value: numMatch[0] });
        }
        if (intent === 'request_leave') {
            const leaveMatch = text.match(/سنوية|مرضية|طارئة/);
            if (leaveMatch) {
                entities.push({ type: 'leave_type', value: leaveMatch[0] });
            }
        }
        return entities;
    }
    formatForTTS(text) {
        const cleanText = text
            .replace(/\*\*/g, '')
            .replace(/[#•📊💰🎯✅❌⚠️🔔]/g, '')
            .replace(/\n+/g, '. ')
            .trim();
        const ssml = `<speak>
            <prosody rate="medium" pitch="medium">
                ${cleanText}
            </prosody>
        </speak>`;
        return {
            text: cleanText,
            ssml,
            duration: Math.ceil(cleanText.length / 15),
        };
    }
    getPreferences(userId) {
        return this.preferences.get(userId) || this.getDefaultPreferences(userId);
    }
    getDefaultPreferences(userId) {
        return {
            userId,
            highContrast: false,
            largeText: false,
            reduceMotion: false,
            screenReader: false,
            voiceEnabled: false,
            language: 'ar',
        };
    }
    updatePreferences(userId, updates) {
        const current = this.getPreferences(userId);
        const updated = { ...current, ...updates };
        this.preferences.set(userId, updated);
        return updated;
    }
    formatForScreenReader(text) {
        return text
            .replace(/✅/g, 'مكتمل: ')
            .replace(/❌/g, 'خطأ: ')
            .replace(/⚠️/g, 'تحذير: ')
            .replace(/📊/g, 'إحصائية: ')
            .replace(/💰/g, 'مالي: ')
            .replace(/📅/g, 'تاريخ: ')
            .replace(/\*\*/g, '')
            .replace(/\n{2,}/g, '. ');
    }
    getQuickActions(category) {
        if (category) {
            return this.quickActions.filter(a => a.category === category);
        }
        return this.quickActions;
    }
    formatVoiceCommandResult(command) {
        const confidencePercent = Math.round(command.confidence * 100);
        let message = `🎙️ **الأمر الصوتي:**\n\n`;
        message += `📝 النص: "${command.text}"\n`;
        message += `🎯 القصد: ${command.intentAr}\n`;
        message += `📊 الثقة: ${confidencePercent}%\n`;
        if (command.entities.length > 0) {
            message += `\n📋 **العناصر المستخرجة:**\n`;
            for (const entity of command.entities) {
                message += `• ${entity.type}: ${entity.value}\n`;
            }
        }
        if (command.intent === 'unknown') {
            message += `\n💡 لم أفهم الأمر. جرب:\n`;
            message += `• "سجل حضوري"\n`;
            message += `• "أريد إجازة"\n`;
            message += `• "كشف راتبي"`;
        }
        return message;
    }
    formatQuickActions() {
        let message = '⌨️ **الاختصارات السريعة:**\n\n';
        const categories = {
            attendance: 'الحضور',
            leave: 'الإجازات',
            hr: 'الموارد البشرية',
            navigation: 'التنقل',
        };
        const grouped = this.quickActions.reduce((acc, action) => {
            if (!acc[action.category])
                acc[action.category] = [];
            acc[action.category].push(action);
            return acc;
        }, {});
        for (const [category, actions] of Object.entries(grouped)) {
            message += `**${categories[category]}:**\n`;
            for (const action of actions) {
                message += `• ${action.nameAr} - \`${action.shortcut}\`\n`;
            }
            message += '\n';
        }
        message += '💡 أو قل الأمر صوتياً!';
        return message;
    }
    formatAccessibilitySettings(userId) {
        const prefs = this.getPreferences(userId);
        let message = '♿ **إعدادات إمكانية الوصول:**\n\n';
        message += `${prefs.highContrast ? '✅' : '⬜'} تباين عالي\n`;
        message += `${prefs.largeText ? '✅' : '⬜'} نص كبير\n`;
        message += `${prefs.reduceMotion ? '✅' : '⬜'} تقليل الحركة\n`;
        message += `${prefs.screenReader ? '✅' : '⬜'} قارئ الشاشة\n`;
        message += `${prefs.voiceEnabled ? '✅' : '⬜'} الأوامر الصوتية\n`;
        message += `\n🌐 اللغة: ${prefs.language === 'ar' ? 'العربية' : 'English'}\n`;
        message += '\n💡 قل "تفعيل [الخيار]" للتغيير';
        return message;
    }
};
exports.VoiceAccessibilityService = VoiceAccessibilityService;
exports.VoiceAccessibilityService = VoiceAccessibilityService = VoiceAccessibilityService_1 = __decorate([
    (0, common_1.Injectable)()
], VoiceAccessibilityService);
//# sourceMappingURL=voice-accessibility.service.js.map