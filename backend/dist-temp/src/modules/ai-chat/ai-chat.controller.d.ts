import { SecureAiChatService } from './secure-ai-chat.service';
export declare class AiChatController {
    private readonly chatService;
    private readonly logger;
    constructor(chatService: SecureAiChatService);
    sendMessage(message: string, req: any): Promise<{
        success: boolean;
        response: string;
    } | {
        response: string;
        suggestions?: string[];
        requestId: string;
        processingTime: number;
        success: boolean;
    }>;
    getHistory(req: any): Promise<{
        success: boolean;
        history: {
            role: "user" | "assistant" | "system";
            content: string;
            timestamp: Date;
        }[];
    }>;
    clearHistory(req: any): Promise<{
        success: boolean;
    }>;
    getSuggestions(req: any): Promise<{
        suggestions: string[];
    }>;
}
