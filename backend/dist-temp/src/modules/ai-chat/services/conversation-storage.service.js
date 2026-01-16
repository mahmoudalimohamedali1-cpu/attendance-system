"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ConversationStorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationStorageService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../common/prisma/prisma.service");
let ConversationStorageService = ConversationStorageService_1 = class ConversationStorageService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(ConversationStorageService_1.name);
        this.memoryCache = new Map();
        this.MAX_MESSAGES_PER_SESSION = 50;
        this.SESSION_TTL_HOURS = 24;
        this.CACHE_SIZE_LIMIT = 1000;
        setInterval(() => this.cleanupCache(), 3600000);
    }
    async getSession(userId, companyId) {
        const cacheKey = this.getCacheKey(userId, companyId);
        if (this.memoryCache.has(cacheKey)) {
            return this.memoryCache.get(cacheKey);
        }
        const dbSession = await this.loadFromDatabase(userId, companyId);
        if (dbSession) {
            this.memoryCache.set(cacheKey, dbSession);
            return dbSession;
        }
        const newSession = {
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
    async addMessage(userId, companyId, message) {
        const session = await this.getSession(userId, companyId);
        session.messages.push(message);
        session.updatedAt = new Date();
        if (session.messages.length > this.MAX_MESSAGES_PER_SESSION) {
            session.messages = session.messages.slice(-this.MAX_MESSAGES_PER_SESSION);
        }
        const cacheKey = this.getCacheKey(userId, companyId);
        this.memoryCache.set(cacheKey, session);
        this.persistToDatabase(session).catch(err => {
            this.logger.error(`Failed to persist session: ${err.message}`);
        });
    }
    async getHistory(userId, companyId, limit) {
        const session = await this.getSession(userId, companyId);
        const messages = session.messages;
        if (limit) {
            return messages.slice(-limit);
        }
        return messages;
    }
    async clearHistory(userId, companyId) {
        const cacheKey = this.getCacheKey(userId, companyId);
        const session = this.memoryCache.get(cacheKey);
        if (session) {
            session.messages = [];
            session.updatedAt = new Date();
        }
        await this.deleteFromDatabase(userId, companyId);
    }
    getCacheKey(userId, companyId) {
        return `${companyId}:${userId}`;
    }
    async loadFromDatabase(userId, companyId) {
        try {
            const result = await this.prisma.$queryRaw `
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'chat_sessions'
                );
            `;
            if (!result?.[0]?.exists) {
                return null;
            }
            const session = await this.prisma.$queryRaw `
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
        }
        catch (error) {
            this.logger.debug(`Database session not available: ${error.message}`);
            return null;
        }
    }
    async persistToDatabase(session) {
        try {
            await this.prisma.$executeRaw `
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
        }
        catch (error) {
            this.logger.debug(`Database persist skipped: ${error.message}`);
        }
    }
    async deleteFromDatabase(userId, companyId) {
        try {
            await this.prisma.$executeRaw `
                DELETE FROM chat_sessions 
                WHERE user_id = ${userId} AND company_id = ${companyId};
            `;
        }
        catch {
        }
    }
    cleanupCache() {
        const now = Date.now();
        const ttlMs = this.SESSION_TTL_HOURS * 3600000;
        let cleaned = 0;
        for (const [key, session] of this.memoryCache.entries()) {
            if (now - session.updatedAt.getTime() > ttlMs) {
                this.memoryCache.delete(key);
                cleaned++;
            }
        }
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
    getCacheStats() {
        return {
            size: this.memoryCache.size,
            limit: this.CACHE_SIZE_LIMIT,
        };
    }
};
exports.ConversationStorageService = ConversationStorageService;
exports.ConversationStorageService = ConversationStorageService = ConversationStorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ConversationStorageService);
//# sourceMappingURL=conversation-storage.service.js.map