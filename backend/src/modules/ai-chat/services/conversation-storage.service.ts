import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * 💾 Conversation Storage Service
 * Persists conversation history to database (not just memory)
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
    metadata?: Record<string, any>;
}

@Injectable()
export class ConversationStorageService {
    private readonly logger = new Logger(ConversationStorageService.name);

    // In-memory cache for active conversations (backed by DB)
    private memoryCache: Map<string, ConversationSession> = new Map();

    // Configuration
    private readonly MAX_MESSAGES_PER_SESSION = 50;
    private readonly SESSION_TTL_HOURS = 24;
    private readonly CACHE_SIZE_LIMIT = 1000;

    constructor(private readonly prisma: PrismaService) {
        // Periodic cache cleanup
        setInterval(() => this.cleanupCache(), 3600000); // Every hour
    }

    /**
     * 💬 Get or create conversation session
     */
    async getSession(userId: string, companyId: string): Promise<ConversationSession> {
        const cacheKey = this.getCacheKey(userId, companyId);

        // Check memory cache first
        if (this.memoryCache.has(cacheKey)) {
            return this.memoryCache.get(cacheKey)!;
        }

        // Try to load from database
        const dbSession = await this.loadFromDatabase(userId, companyId);

        if (dbSession) {
            this.memoryCache.set(cacheKey, dbSession);
            return dbSession;
        }

        // Create new session
        const newSession: ConversationSession = {
            id: `${userId}-${Date.now()}`,
            userId,
            companyId,
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        this.memoryCache.set(cacheKey, newSession);
        return newSession;
    }

    /**
     * 📝 Add message to session
     */
    async addMessage(
        userId: string,
        companyId: string,
        message: ChatMessage
    ): Promise<void> {
        const session = await this.getSession(userId, companyId);

        session.messages.push(message);
        session.updatedAt = new Date();

        // Trim if over limit
        if (session.messages.length > this.MAX_MESSAGES_PER_SESSION) {
            session.messages = session.messages.slice(-this.MAX_MESSAGES_PER_SESSION);
        }

        const cacheKey = this.getCacheKey(userId, companyId);
        this.memoryCache.set(cacheKey, session);

        // Async persist to database (non-blocking)
        this.persistToDatabase(session).catch(err => {
            this.logger.error(`Failed to persist session: ${err.message}`);
        });
    }

    /**
     * 📜 Get conversation history
     */
    async getHistory(
        userId: string,
        companyId: string,
        limit?: number
    ): Promise<ChatMessage[]> {
        const session = await this.getSession(userId, companyId);
        const messages = session.messages;

        if (limit) {
            return messages.slice(-limit);
        }
        return messages;
    }

    /**
     * 🗑️ Clear conversation
     */
    async clearHistory(userId: string, companyId: string): Promise<void> {
        const cacheKey = this.getCacheKey(userId, companyId);

        const session = this.memoryCache.get(cacheKey);
        if (session) {
            session.messages = [];
            session.updatedAt = new Date();
        }

        // Clear from database
        await this.deleteFromDatabase(userId, companyId);
    }

    /**
     * 🔑 Generate cache key
     */
    private getCacheKey(userId: string, companyId: string): string {
        return `${companyId}:${userId}`;
    }

    /**
     * 📤 Load session from database
     */
    private async loadFromDatabase(
        userId: string,
        companyId: string
    ): Promise<ConversationSession | null> {
        try {
            // Check if chat_sessions table exists by trying to query
            // This uses a dynamic approach since the table may not exist yet
            const result = await this.prisma.$queryRaw<any[]>`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'chat_sessions'
                );
            `;

            if (!result?.[0]?.exists) {
                return null; // Table doesn't exist, fall back to memory only
            }

            const session = await this.prisma.$queryRaw<any[]>`
                SELECT * FROM chat_sessions 
                WHERE user_id = ${userId} AND company_id = ${companyId}
                ORDER BY updated_at DESC
                LIMIT 1;
            `;

            if (session?.[0]) {
                return {
                    id: session[0].id,
                    userId: session[0].user_id,
                    companyId: session[0].company_id,
                    messages: session[0].messages || [],
                    createdAt: session[0].created_at,
                    updatedAt: session[0].updated_at,
                    metadata: session[0].metadata,
                };
            }

            return null;
        } catch (error) {
            // Table doesn't exist, that's okay
            this.logger.debug(`Database session not available: ${error.message}`);
            return null;
        }
    }

    /**
     * 💾 Persist session to database
     */
    private async persistToDatabase(session: ConversationSession): Promise<void> {
        try {
            // Use raw query for flexibility (table may not exist)
            await this.prisma.$executeRaw`
                INSERT INTO chat_sessions (id, user_id, company_id, messages, created_at, updated_at)
                VALUES (
                    ${session.id},
                    ${session.userId},
                    ${session.companyId},
                    ${JSON.stringify(session.messages)}::jsonb,
                    ${session.createdAt},
                    ${session.updatedAt}
                )
                ON CONFLICT (user_id, company_id) 
                DO UPDATE SET 
                    messages = ${JSON.stringify(session.messages)}::jsonb,
                    updated_at = ${session.updatedAt};
            `;
        } catch (error) {
            // Silently fail if table doesn't exist - memory cache still works
            this.logger.debug(`Database persist skipped: ${error.message}`);
        }
    }

    /**
     * 🗑️ Delete session from database
     */
    private async deleteFromDatabase(userId: string, companyId: string): Promise<void> {
        try {
            await this.prisma.$executeRaw`
                DELETE FROM chat_sessions 
                WHERE user_id = ${userId} AND company_id = ${companyId};
            `;
        } catch {
            // Ignore if table doesn't exist
        }
    }

    /**
     * 🧹 Cleanup old cache entries
     */
    private cleanupCache(): void {
        const now = Date.now();
        const ttlMs = this.SESSION_TTL_HOURS * 3600000;
        let cleaned = 0;

        for (const [key, session] of this.memoryCache.entries()) {
            if (now - session.updatedAt.getTime() > ttlMs) {
                this.memoryCache.delete(key);
                cleaned++;
            }
        }

        // If still over limit, remove oldest
        if (this.memoryCache.size > this.CACHE_SIZE_LIMIT) {
            const entries = Array.from(this.memoryCache.entries())
                .sort((a, b) => a[1].updatedAt.getTime() - b[1].updatedAt.getTime());

            const toRemove = entries.slice(0, this.memoryCache.size - this.CACHE_SIZE_LIMIT);
            for (const [key] of toRemove) {
                this.memoryCache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            this.logger.debug(`Cleaned ${cleaned} expired sessions from cache`);
        }
    }

    /**
     * 📊 Get cache statistics
     */
    getCacheStats(): { size: number; limit: number } {
        return {
            size: this.memoryCache.size,
            limit: this.CACHE_SIZE_LIMIT,
        };
    }
}
