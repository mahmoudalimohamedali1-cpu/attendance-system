export interface VoiceCommand {
    text: string;
    intent: string;
    intentAr: string;
    entities: {
        type: string;
        value: string;
    }[];
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
export declare class VoiceAccessibilityService {
    private readonly logger;
    private preferences;
    private readonly voicePatterns;
    private readonly quickActions;
    parseVoiceCommand(text: string): VoiceCommand;
    private extractEntities;
    formatForTTS(text: string): TTSResponse;
    getPreferences(userId: string): AccessibilityPreferences;
    private getDefaultPreferences;
    updatePreferences(userId: string, updates: Partial<AccessibilityPreferences>): AccessibilityPreferences;
    formatForScreenReader(text: string): string;
    getQuickActions(category?: QuickAction['category']): QuickAction[];
    formatVoiceCommandResult(command: VoiceCommand): string;
    formatQuickActions(): string;
    formatAccessibilitySettings(userId: string): string;
}
