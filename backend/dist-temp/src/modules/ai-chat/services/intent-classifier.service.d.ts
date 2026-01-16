import { ConfigService } from '@nestjs/config';
export interface IntentResult {
    intent: IntentType;
    confidence: number;
    subIntent?: string;
    entities: Record<string, any>;
    requiresClarification: boolean;
    suggestedClarification?: string;
}
export declare enum IntentType {
    ENHANCEMENT = "enhancement",
    CREATION = "creation",
    QUERY = "query",
    EXECUTIVE_COMMAND = "executive_command",
    SELF_HEAL = "self_heal",
    EMPLOYEE_ACTION = "employee_action",
    LEAVE_ACTION = "leave_action",
    TASK_ACTION = "task_action",
    REPORT = "report",
    GENERAL_CHAT = "general_chat",
    UNKNOWN = "unknown"
}
export declare class IntentClassifierService {
    private configService;
    private readonly logger;
    private readonly patterns;
    private readonly CONFIDENCE_THRESHOLD;
    constructor(configService: ConfigService);
    private normalizeArabic;
    private initializePatterns;
    classifyIntent(message: string): IntentResult;
    private isNewSystemRequest;
    private generateClarification;
    requiresAdminRole(intent: IntentType): boolean;
    getPatternStats(): {
        total: number;
        byIntent: Record<string, number>;
    };
}
