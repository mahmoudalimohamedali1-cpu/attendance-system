import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * 💾 Conversation Storage Service
 * Fixes: #31, #33, #34 - In-memory state issues
 * 
 * Persists conversation history to database.
 * Implements caching for performance.
 * Handles cleanup of old conversations.
 */

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

@Injectable()
export class ConversationStorageService {
    private readonly logger = new Logger(ConversationStorageService.name);

    // In-memory cache for active sessions (backed by DB)
    private readonly cache: Map<string, ConversationSession> = new Map();

    // Configuration
    private readonly MAX_MESSAGES_PER_SESSION = 50;
    private readonly SESSION_TTL_HOURS = 24;
    private readonly CACHE_CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

    constructor(private readonly prisma: PrismaService) {
        // Periodic cache cleanup
        setInterval(() => this.cleanupCache(), this.CACHE_CLEANUP_INTERVAL_MS);
    }

    /**
     * 📝 Get cache key
     */
    private getCacheKey(userId: string, companyId: string): string {
        return `${companyId}:${userId}`;
    }

    /**
     * 📖 Get conversation history
     */
    async getHistory(userId: string, companyId: string, limit?: number): Promise<ChatMessage[]> {
        const cacheKey = this.getCacheKey(userId, companyId);

        // Check cache first
        let session = this.cache.get(cacheKey);

        if (!session) {
            // Load from database
            const loaded = await this.loadFromDb(userId, companyId);
            if (loaded) {
                session = loaded;
                this.cache.set(cacheKey, session);
            }
        }

        if (!session) {
            return [];
        }

        const messages = session.messages;
        return limit ? messages.slice(-limit) : messages;
    }

    /**
     * ➕ Add message to conversation
     */
    async addMessage(
        userId: string,
        companyId: string,
        message: ChatMessage
    ): Promise<void> {
        const cacheKey = this.getCacheKey(userId, companyId);

        let session = this.cache.get(cacheKey);

        if (!session) {
            // Load or create session
            const loaded = await this.loadFromDb(userId, companyId);
            if (loaded) {
                session = loaded;
            } else {
                session = {
                    id: `${companyId}_${userId}_${Date.now()}`,
                    userId,
                    companyId,
                    messages: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    expiresAt: new Date(Date.now() + this.SESSION_TTL_HOURS * 60 * 60 * 1000),
                };
            }
        }

        // Add message
        session.messages.push({
            ...message,
            timestamp: message.timestamp || new Date(),
        });

        // Trim if too many messages
        if (session.messages.length > this.MAX_MESSAGES_PER_SESSION) {
            session.messages = session.messages.slice(-this.MAX_MESSAGES_PER_SESSION);
        }

        session.updatedAt = new Date();

        // Update cache
        this.cache.set(cacheKey, session);

        // Persist to database (async, don't wait)
        this.saveToDb(session).catch(err => {
            this.logger.error(`Failed to save conversation: ${err.message}`);
        });
    }

    /**
     * 🗑️ Clear conversation history
     */
    async clearHistory(userId: string, companyId: string): Promise<void> {
        const cacheKey = this.getCacheKey(userId, companyId);

        // Clear from cache
        this.cache.delete(cacheKey);

        // Clear from database
        try {
            await this.prisma.aiConversation.deleteMany({
                where: { userId, companyId },
            });
        } catch (err: any) {
            this.logger.error(`Failed to clear conversation: ${err.message}`);
        }
    }

    /**
     * 💾 Load session from database
     */
    private async loadFromDb(userId: string, companyId: string): Promise<ConversationSession | null> {
        try {
            const record = await this.prisma.aiConversation.findFirst({
                where: {
                    userId,
                    companyId,
                    expiresAt: { gt: new Date() },
                },
                orderBy: { updatedAt: 'desc' },
            });

            if (!record) {
                return null;
            }

            return {
                id: record.id,
                userId: record.userId,
                companyId: record.companyId,
                messages: (record.messages as any) || [],
                createdAt: record.createdAt,
                updatedAt: record.updatedAt,
                expiresAt: record.expiresAt,
            };
        } catch (err: any) {
            // Table might not exist yet - that's OK
            if (err.code === 'P2021') {
                this.logger.warn('AiConversation table not found - using in-memory only');
                return null;
            }
            this.logger.error(`Failed to load conversation: ${err.message}`);
            return null;
        }
    }

    /**
     * 💾 Save session to database
     */
    private async saveToDb(session: ConversationSession): Promise<void> {
        try {
            await this.prisma.aiConversation.upsert({
                where: { id: session.id },
                create: {
                    id: session.id,
                    userId: session.userId,
                    companyId: session.companyId,
                    messages: session.messages as any,
                    expiresAt: session.expiresAt,
                },
                update: {
                    messages: session.messages as any,
                    updatedAt: new Date(),
                },
            });
        } catch (err: any) {
            // Table might not exist yet
            if (err.code === 'P2021') {
                return; // Silent fail - will use in-memory
            }
            throw err;
        }
    }

    /**
     * 🧹 Cleanup expired cache entries
     */
    private cleanupCache(): void {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, session] of this.cache) {
            if (session.expiresAt.getTime() < now) {
                this.cache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            this.logger.debug(`Cleaned ${cleaned} expired conversation sessions`);
        }
    }

    /**
     * 🧹 Cleanup old database records
     */
    async cleanupOldRecords(): Promise<number> {
        try {
            const result = await this.prisma.aiConversation.deleteMany({
                where: {
                    expiresAt: { lt: new Date() },
                },
            });
            this.logger.log(`Cleaned up ${result.count} expired conversations from DB`);
            return result.count;
        } catch (err: any) {
            this.logger.error(`Failed to cleanup old records: ${err.message}`);
            return 0;
        }
    }

    /**
     * 📊 Get storage stats
     */
    getStats(): {
        cachedSessions: number;
        oldestCached: Date | null;
    } {
        let oldest: Date | null = null;

        for (const session of this.cache.values()) {
            if (!oldest || session.createdAt < oldest) {
                oldest = session.createdAt;
            }
        }

        return {
            cachedSessions: this.cache.size,
            oldestCached: oldest,
        };
    }
}
