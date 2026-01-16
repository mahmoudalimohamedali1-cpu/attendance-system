import { Injectable, Logger } from '@nestjs/common';

/**
 * 🎙️ Voice & Accessibility Service
 * Implements ideas #151-160: Voice & Accessibility
 * 
 * Features:
 * - Voice command parsing
 * - Text-to-speech formatting
 * - Screen reader optimization
 * - Accessibility shortcuts
 */

export interface VoiceCommand {
    text: string;
    intent: string;
    intentAr: string;
    entities: { type: string; value: string }[];
    confidence: number;
}

export interface AccessibilityPreferences {
    userId: string;
    highContrast: boolean;
    largeText: boolean;
    reduceMotion: boolean;
    screenReader: boolean;
    voiceEnabled: boolean;
    language: 'ar' | 'en';
}

export interface TTSResponse {
    text: string;
    ssml?: string;
    audioUrl?: string;
    duration?: number;
}

export interface QuickAction {
    id: string;
    name: string;
    nameAr: string;
    command: string;
    shortcut: string;
    category: 'attendance' | 'leave' | 'hr' | 'navigation';
}

@Injectable()
export class VoiceAccessibilityService {
    private readonly logger = new Logger(VoiceAccessibilityService.name);

    // User preferences
    private preferences: Map<string, AccessibilityPreferences> = new Map();

    // Voice command patterns
    private readonly voicePatterns: { pattern: RegExp; intent: string; intentAr: string }[] = [
        { pattern: /سجل.*حضور|check.*in|حضرت/i, intent: 'check_in', intentAr: 'تسجيل حضور' },
        { pattern: /سجل.*انصراف|check.*out|انصرفت/i, intent: 'check_out', intentAr: 'تسجيل انصراف' },
        { pattern: /طلب.*إجازة|request.*leave|أريد إجازة/i, intent: 'request_leave', intentAr: 'طلب إجازة' },
        { pattern: /رصيد.*إجازة|leave.*balance|كم باقي/i, intent: 'leave_balance', intentAr: 'رصيد الإجازات' },
        { pattern: /راتب|salary|كشف.*حساب/i, intent: 'salary_info', intentAr: 'معلومات الراتب' },
        { pattern: /اجتماع|meeting|حجز.*قاعة/i, intent: 'schedule_meeting', intentAr: 'جدولة اجتماع' },
        { pattern: /مساعدة|help|كيف/i, intent: 'help', intentAr: 'المساعدة' },
        { pattern: /إعدادات|settings|ضبط/i, intent: 'settings', intentAr: 'الإعدادات' },
    ];

    // Quick actions
    private readonly quickActions: QuickAction[] = [
        { id: '1', name: 'Check In', nameAr: 'تسجيل حضور', command: 'سجل حضوري', shortcut: 'Ctrl+Shift+I', category: 'attendance' },
        { id: '2', name: 'Check Out', nameAr: 'تسجيل انصراف', command: 'سجل انصرافي', shortcut: 'Ctrl+Shift+O', category: 'attendance' },
        { id: '3', name: 'Request Leave', nameAr: 'طلب إجازة', command: 'أريد إجازة', shortcut: 'Ctrl+Shift+L', category: 'leave' },
        { id: '4', name: 'My Salary', nameAr: 'راتبي', command: 'كشف راتبي', shortcut: 'Ctrl+Shift+S', category: 'hr' },
        { id: '5', name: 'Dashboard', nameAr: 'لوحة التحكم', command: 'الصفحة الرئيسية', shortcut: 'Ctrl+Shift+D', category: 'navigation' },
    ];

    /**
     * 🎙️ Parse voice command
     */
    parseVoiceCommand(text: string): VoiceCommand {
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

    private extractEntities(text: string, intent: string): { type: string; value: string }[] {
        const entities: { type: string; value: string }[] = [];

        // Extract dates
        const dateMatch = text.match(/غدا|اليوم|الأسبوع القادم/);
        if (dateMatch) {
            entities.push({ type: 'date', value: dateMatch[0] });
        }

        // Extract numbers
        const numMatch = text.match(/\d+/);
        if (numMatch) {
            entities.push({ type: 'number', value: numMatch[0] });
        }

        // Extract leave types
        if (intent === 'request_leave') {
            const leaveMatch = text.match(/سنوية|مرضية|طارئة/);
            if (leaveMatch) {
                entities.push({ type: 'leave_type', value: leaveMatch[0] });
            }
        }

        return entities;
    }

    /**
     * 📢 Format for TTS
     */
    formatForTTS(text: string): TTSResponse {
        // Clean text for TTS
        const cleanText = text
            .replace(/\*\*/g, '') // Remove bold
            .replace(/[#•📊💰🎯✅❌⚠️🔔]/g, '') // Remove emojis
            .replace(/\n+/g, '. ') // Replace newlines
            .trim();

        // Generate SSML for better pronunciation
        const ssml = `<speak>
            <prosody rate="medium" pitch="medium">
                ${cleanText}
            </prosody>
        </speak>`;

        return {
            text: cleanText,
            ssml,
            duration: Math.ceil(cleanText.length / 15), // Rough estimate
        };
    }

    /**
     * ♿ Get/Set accessibility preferences
     */
    getPreferences(userId: string): AccessibilityPreferences {
        return this.preferences.get(userId) || this.getDefaultPreferences(userId);
    }

    private getDefaultPreferences(userId: string): AccessibilityPreferences {
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

    updatePreferences(userId: string, updates: Partial<AccessibilityPreferences>): AccessibilityPreferences {
        const current = this.getPreferences(userId);
        const updated = { ...current, ...updates };
        this.preferences.set(userId, updated);
        return updated;
    }

    /**
     * 📱 Format for screen reader
     */
    formatForScreenReader(text: string): string {
        // Add ARIA-friendly formatting
        return text
            .replace(/✅/g, 'مكتمل: ')
            .replace(/❌/g, 'خطأ: ')
            .replace(/⚠️/g, 'تحذير: ')
            .replace(/📊/g, 'إحصائية: ')
            .replace(/💰/g, 'مالي: ')
            .replace(/📅/g, 'تاريخ: ')
            .replace(/\*\*/g, '') // Remove markdown bold
            .replace(/\n{2,}/g, '. '); // Convert paragraphs to sentences
    }

    /**
     * ⌨️ Get quick actions
     */
    getQuickActions(category?: QuickAction['category']): QuickAction[] {
        if (category) {
            return this.quickActions.filter(a => a.category === category);
        }
        return this.quickActions;
    }

    /**
     * 📊 Format voice command result
     */
    formatVoiceCommandResult(command: VoiceCommand): string {
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

    /**
     * 📊 Format quick actions
     */
    formatQuickActions(): string {
        let message = '⌨️ **الاختصارات السريعة:**\n\n';

        const categories: Record<string, string> = {
            attendance: 'الحضور',
            leave: 'الإجازات',
            hr: 'الموارد البشرية',
            navigation: 'التنقل',
        };

        const grouped = this.quickActions.reduce((acc, action) => {
            if (!acc[action.category]) acc[action.category] = [];
            acc[action.category].push(action);
            return acc;
        }, {} as Record<string, QuickAction[]>);

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

    /**
     * 📊 Format accessibility settings
     */
    formatAccessibilitySettings(userId: string): string {
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
}
