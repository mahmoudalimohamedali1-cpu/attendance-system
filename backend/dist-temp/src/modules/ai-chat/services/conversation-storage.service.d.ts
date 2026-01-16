import { PrismaService } from '../../../common/prisma/prisma.service';
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}
export interface ConversationSession {
    id: string;
    userId: string;
    companyId: string;
    messages: ChatMessage[];
    createdAt: Date;
    updatedAt: Date;
    metadata?: Record<string, any>;
}
export declare class ConversationStorageService {
    private readonly prisma;
    private readonly logger;
    private memoryCache;
    private readonly MAX_MESSAGES_PER_SESSION;
    private readonly SESSION_TTL_HOURS;
    private readonly CACHE_SIZE_LIMIT;
    constructor(prisma: PrismaService);
    getSession(userId: string, companyId: string): Promise<ConversationSession>;
    addMessage(userId: string, companyId: string, message: ChatMessage): Promise<void>;
    getHistory(userId: string, companyId: string, limit?: number): Promise<ChatMessage[]>;
    clearHistory(userId: string, companyId: string): Promise<void>;
    private getCacheKey;
    private loadFromDatabase;
    private persistToDatabase;
    private deleteFromDatabase;
    private cleanupCache;
    getCacheStats(): {
        size: number;
        limit: number;
    };
}
