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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecognitionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
let RecognitionService = class RecognitionService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createCoreValue(companyId, dto) {
        const count = await this.prisma.coreValue.count({ where: { companyId } });
        return this.prisma.coreValue.create({
            data: {
                companyId,
                ...dto,
                sortOrder: count,
            },
        });
    }
    async getCoreValues(companyId) {
        return this.prisma.coreValue.findMany({
            where: { companyId, isActive: true },
            orderBy: { sortOrder: 'asc' },
        });
    }
    async updateCoreValue(id, dto) {
        return this.prisma.coreValue.update({
            where: { id },
            data: dto,
        });
    }
    async deleteCoreValue(id) {
        return this.prisma.coreValue.delete({ where: { id } });
    }
    async giveRecognition(companyId, giverId, dto) {
        return this.prisma.recognition.create({
            data: {
                companyId,
                giverId,
                receiverId: dto.receiverId,
                type: dto.type || client_1.RecognitionType.KUDOS,
                message: dto.message,
                coreValueId: dto.coreValueId,
                pointsAwarded: dto.pointsAwarded || 0,
                monetaryValue: dto.monetaryValue,
                isPublic: dto.isPublic ?? true,
            },
        });
    }
    async getRecognitionWall(companyId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [recognitions, total] = await Promise.all([
            this.prisma.recognition.findMany({
                where: { companyId, isPublic: true },
                include: {
                    reactions: {
                        select: { emoji: true, userId: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.recognition.count({ where: { companyId, isPublic: true } }),
        ]);
        return {
            data: recognitions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getMyRecognitions(userId) {
        const [given, received] = await Promise.all([
            this.prisma.recognition.findMany({
                where: { giverId: userId },
                orderBy: { createdAt: 'desc' },
                take: 50,
            }),
            this.prisma.recognition.findMany({
                where: { receiverId: userId },
                orderBy: { createdAt: 'desc' },
                take: 50,
            }),
        ]);
        const totalPointsReceived = received.reduce((sum, r) => sum + r.pointsAwarded, 0);
        return {
            given,
            received,
            stats: {
                totalGiven: given.length,
                totalReceived: received.length,
                totalPointsReceived,
            },
        };
    }
    async addReaction(recognitionId, userId, emoji) {
        try {
            return await this.prisma.recognitionReaction.create({
                data: {
                    recognitionId,
                    userId,
                    emoji,
                },
            });
        }
        catch {
            await this.prisma.recognitionReaction.delete({
                where: {
                    recognitionId_userId_emoji: { recognitionId, userId, emoji },
                },
            });
            return null;
        }
    }
    async removeReaction(recognitionId, userId, emoji) {
        return this.prisma.recognitionReaction.delete({
            where: {
                recognitionId_userId_emoji: { recognitionId, userId, emoji },
            },
        });
    }
    async getLeaderboard(companyId, period = 'month') {
        const now = new Date();
        let startDate;
        switch (period) {
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
        }
        const recognitions = await this.prisma.recognition.findMany({
            where: {
                companyId,
                createdAt: { gte: startDate },
            },
            select: {
                receiverId: true,
                pointsAwarded: true,
            },
        });
        const pointsByUser = recognitions.reduce((acc, r) => {
            acc[r.receiverId] = (acc[r.receiverId] || 0) + r.pointsAwarded;
            return acc;
        }, {});
        const leaderboard = Object.entries(pointsByUser)
            .map(([userId, points]) => ({ userId, points }))
            .sort((a, b) => b.points - a.points)
            .slice(0, 10);
        return leaderboard;
    }
    async getRecognitionStats(companyId) {
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const [total, thisMonthCount, lastMonthCount, byType] = await Promise.all([
            this.prisma.recognition.count({ where: { companyId } }),
            this.prisma.recognition.count({
                where: { companyId, createdAt: { gte: thisMonth } },
            }),
            this.prisma.recognition.count({
                where: {
                    companyId,
                    createdAt: { gte: lastMonth, lt: thisMonth },
                },
            }),
            this.prisma.recognition.groupBy({
                by: ['type'],
                where: { companyId },
                _count: true,
            }),
        ]);
        const growthRate = lastMonthCount > 0
            ? (((thisMonthCount - lastMonthCount) / lastMonthCount) * 100).toFixed(1)
            : 0;
        return {
            total,
            thisMonth: thisMonthCount,
            lastMonth: lastMonthCount,
            growthRate,
            byType: byType.map((t) => ({
                type: t.type,
                count: t._count,
            })),
        };
    }
    async getTopCoreValues(companyId) {
        const recognitions = await this.prisma.recognition.findMany({
            where: {
                companyId,
                coreValueId: { not: null },
            },
            select: { coreValueId: true },
        });
        const counts = recognitions.reduce((acc, r) => {
            if (r.coreValueId) {
                acc[r.coreValueId] = (acc[r.coreValueId] || 0) + 1;
            }
            return acc;
        }, {});
        const coreValues = await this.prisma.coreValue.findMany({
            where: { id: { in: Object.keys(counts) } },
        });
        return coreValues
            .map((cv) => ({
            ...cv,
            recognitionCount: counts[cv.id] || 0,
        }))
            .sort((a, b) => b.recognitionCount - a.recognitionCount);
    }
};
exports.RecognitionService = RecognitionService;
exports.RecognitionService = RecognitionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RecognitionService);
//# sourceMappingURL=recognition.service.js.map