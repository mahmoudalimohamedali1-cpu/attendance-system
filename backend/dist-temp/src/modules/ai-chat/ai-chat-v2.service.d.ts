import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { IntentClassifierService } from './services/intent-classifier.service';
import { EnhancementService } from './services/enhancement.service';
import { SafeExecutorService } from './services/safe-executor.service';
import { ResponseValidatorService } from './services/response-validator.service';
import { ConversationStorageService, ChatMessage } from './services/conversation-storage.service';
import { RetryService } from './services/retry.service';
import { InputSanitizerService } from './services/input-sanitizer.service';
interface ChatResponse {
    response: string;
    suggestions?: string[];
    requestId?: string;
    processingTime?: number;
}
export declare class AiChatServiceV2 {
    private readonly prisma;
    private readonly aiService;
    private readonly intentClassifier;
    private readonly enhancementService;
    private readonly safeExecutor;
    private readonly responseValidator;
    private readonly conversationStorage;
    private readonly retryService;
    private readonly inputSanitizer;
    private readonly logger;
    constructor(prisma: PrismaService, aiService: AiService, intentClassifier: IntentClassifierService, enhancementService: EnhancementService, safeExecutor: SafeExecutorService, responseValidator: ResponseValidatorService, conversationStorage: ConversationStorageService, retryService: RetryService, inputSanitizer: InputSanitizerService);
    chat(userId: string, message: string): Promise<ChatResponse>;
    private handleIntent;
    private handleEnhancement;
    private handleExecutiveCommand;
    private handleCreation;
    private handleSelfHeal;
    private handleEmployeeAction;
    private handleLeaveAction;
    private handleQuery;
    private handleGeneralChat;
    private generateAiResponse;
    private buildPrompt;
    private storeConversation;
    private getUserContext;
    private getContextualSuggestions;
    clearHistory(userId: string, companyId: string): Promise<void>;
    getHistory(userId: string, companyId: string): Promise<ChatMessage[]>;
}
export {};
