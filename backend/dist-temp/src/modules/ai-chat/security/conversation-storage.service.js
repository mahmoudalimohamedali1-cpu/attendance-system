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
        this.cache = new Map();
        this.MAX_MESSAGES_PER_SESSION = 50;
        this.SESSION_TTL_HOURS = 24;
        this.CACHE_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
        setInterval(() => this.cleanupCache(), this.CACHE_CLEANUP_INTERVAL_MS);
    }
    getCacheKey(userId, companyId) {
        return `${companyId}:${userId}`;
    }
    async getHistory(userId, companyId, limit) {
        const cacheKey = this.getCacheKey(userId, companyId);
        let session = this.cache.get(cacheKey);
        if (!session) {
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
    async addMessage(userId, companyId, message) {
        const cacheKey = this.getCacheKey(userId, companyId);
        let session = this.cache.get(cacheKey);
        if (!session) {
            const loaded = await this.loadFromDb(userId, companyId);
            if (loaded) {
                session = loaded;
            }
            else {
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
        session.messages.push({
            ...message,
            timestamp: message.timestamp || new Date(),
        });
        if (session.messages.length > this.MAX_MESSAGES_PER_SESSION) {
            session.messages = session.messages.slice(-this.MAX_MESSAGES_PER_SESSION);
        }
        session.updatedAt = new Date();
        this.cache.set(cacheKey, session);
        this.saveToDb(session).catch(err => {
            this.logger.error(`Failed to save conversation: ${err.message}`);
        });
    }
    async clearHistory(userId, companyId) {
        const cacheKey = this.getCacheKey(userId, companyId);
        this.cache.delete(cacheKey);
        try {
            await this.prisma.aiConversation.deleteMany({
                where: { userId, companyId },
            });
        }
        catch (err) {
            this.logger.error(`Failed to clear conversation: ${err.message}`);
        }
    }
    async loadFromDb(userId, companyId) {
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
                messages: record.messages || [],
                createdAt: record.createdAt,
                updatedAt: record.updatedAt,
                expiresAt: record.expiresAt,
            };
        }
        catch (err) {
            if (err.code === 'P2021') {
                this.logger.warn('AiConversation table not found - using in-memory only');
                return null;
            }
            this.logger.error(`Failed to load conversation: ${err.message}`);
            return null;
        }
    }
    async saveToDb(session) {
        try {
            await this.prisma.aiConversation.upsert({
                where: { id: session.id },
                create: {
                    id: session.id,
                    userId: session.userId,
                    companyId: session.companyId,
                    messages: session.messages,
                    expiresAt: session.expiresAt,
                },
                update: {
                    messages: session.messages,
                    updatedAt: new Date(),
                },
            });
        }
        catch (err) {
            if (err.code === 'P2021') {
                return;
            }
            throw err;
        }
    }
    cleanupCache() {
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
    async cleanupOldRecords() {
        try {
            const result = await this.prisma.aiConversation.deleteMany({
                where: {
                    expiresAt: { lt: new Date() },
                },
            });
            this.logger.log(`Cleaned up ${result.count} expired conversations from DB`);
            return result.count;
        }
        catch (err) {
            this.logger.error(`Failed to cleanup old records: ${err.message}`);
            return 0;
        }
    }
    getStats() {
        let oldest = null;
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
};
exports.ConversationStorageService = ConversationStorageService;
exports.ConversationStorageService = ConversationStorageService = ConversationStorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ConversationStorageService);
//# sourceMappingURL=conversation-storage.service.js.map