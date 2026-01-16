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
    expiresAt: Date;
}
export declare class ConversationStorageService {
    private readonly prisma;
    private readonly logger;
    private readonly cache;
    private readonly MAX_MESSAGES_PER_SESSION;
    private readonly SESSION_TTL_HOURS;
    private readonly CACHE_CLEANUP_INTERVAL_MS;
    constructor(prisma: PrismaService);
    private getCacheKey;
    getHistory(userId: string, companyId: string, limit?: number): Promise<ChatMessage[]>;
    addMessage(userId: string, companyId: string, message: ChatMessage): Promise<void>;
    clearHistory(userId: string, companyId: string): Promise<void>;
    private loadFromDb;
    private saveToDb;
    private cleanupCache;
    cleanupOldRecords(): Promise<number>;
    getStats(): {
        cachedSessions: number;
        oldestCached: Date | null;
    };
}
