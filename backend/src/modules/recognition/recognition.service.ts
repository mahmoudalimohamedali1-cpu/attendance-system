import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RecognitionType, Recognition, CoreValue } from '@prisma/client';

@Injectable()
export class RecognitionService {
    constructor(private readonly prisma: PrismaService) { }

    // ==================== Core Values ====================

    async createCoreValue(companyId: string, dto: {
        name: string;
        nameEn?: string;
        description?: string;
        icon?: string;
        color?: string;
    }) {
        const count = await this.prisma.coreValue.count({ where: { companyId } });

        return this.prisma.coreValue.create({
            data: {
                companyId,
                ...dto,
                sortOrder: count,
            },
        });
    }

    async getCoreValues(companyId: string) {
        return this.prisma.coreValue.findMany({
            where: { companyId, isActive: true },
            orderBy: { sortOrder: 'asc' },
        });
    }

    async updateCoreValue(id: string, dto: Partial<{
        name: string;
        nameEn: string;
        description: string;
        icon: string;
        color: string;
        isActive: boolean;
        sortOrder: number;
    }>) {
        return this.prisma.coreValue.update({
            where: { id },
            data: dto,
        });
    }

    async deleteCoreValue(id: string) {
        return this.prisma.coreValue.delete({ where: { id } });
    }

    // ==================== Recognition (Kudos) ====================

    async giveRecognition(companyId: string, giverId: string, dto: {
        receiverId: string;
        type?: RecognitionType;
        message: string;
        coreValueId?: string;
        pointsAwarded?: number;
        monetaryValue?: number;
        isPublic?: boolean;
    }) {
        return this.prisma.recognition.create({
            data: {
                companyId,
                giverId,
                receiverId: dto.receiverId,
                type: dto.type || RecognitionType.KUDOS,
                message: dto.message,
                coreValueId: dto.coreValueId,
                pointsAwarded: dto.pointsAwarded || 0,
                monetaryValue: dto.monetaryValue,
                isPublic: dto.isPublic ?? true,
            },
        });
    }

    async getRecognitionWall(companyId: string, page = 1, limit = 20) {
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

    async getMyRecognitions(userId: string) {
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

        const totalPointsReceived = received.reduce((sum: number, r: Recognition) => sum + r.pointsAwarded, 0);

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

    // ==================== Reactions ====================

    async addReaction(recognitionId: string, userId: string, emoji: string) {
        try {
            return await this.prisma.recognitionReaction.create({
                data: {
                    recognitionId,
                    userId,
                    emoji,
                },
            });
        } catch {
            // إذا كان التفاعل موجوداً مسبقاً، نحذفه (toggle)
            await this.prisma.recognitionReaction.delete({
                where: {
                    recognitionId_userId_emoji: { recognitionId, userId, emoji },
                },
            });
            return null;
        }
    }

    async removeReaction(recognitionId: string, userId: string, emoji: string) {
        return this.prisma.recognitionReaction.delete({
            where: {
                recognitionId_userId_emoji: { recognitionId, userId, emoji },
            },
        });
    }

    // ==================== Leaderboard ====================

    async getLeaderboard(companyId: string, period: 'week' | 'month' | 'year' = 'month') {
        const now = new Date();
        let startDate: Date;

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

        // تجميع النقاط لكل موظف
        const pointsByUser: Record<string, number> = recognitions.reduce((acc: Record<string, number>, r: { receiverId: string; pointsAwarded: number }) => {
            acc[r.receiverId] = (acc[r.receiverId] || 0) + r.pointsAwarded;
            return acc;
        }, {});

        // ترتيب حسب النقاط
        const leaderboard = Object.entries(pointsByUser)
            .map(([userId, points]) => ({ userId, points }))
            .sort((a, b) => b.points - a.points)
            .slice(0, 10);

        return leaderboard;
    }

    // ==================== Analytics ====================

    async getRecognitionStats(companyId: string) {
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
            byType: byType.map((t: { type: RecognitionType; _count: number }) => ({
                type: t.type,
                count: t._count,
            })),
        };
    }

    async getTopCoreValues(companyId: string) {
        const recognitions = await this.prisma.recognition.findMany({
            where: {
                companyId,
                coreValueId: { not: null },
            },
            select: { coreValueId: true },
        });

        const counts: Record<string, number> = recognitions.reduce((acc: Record<string, number>, r: { coreValueId: string | null }) => {
            if (r.coreValueId) {
                acc[r.coreValueId] = (acc[r.coreValueId] || 0) + 1;
            }
            return acc;
        }, {});

        const coreValues = await this.prisma.coreValue.findMany({
            where: { id: { in: Object.keys(counts) } },
        });

        return coreValues
            .map((cv: CoreValue) => ({
                ...cv,
                recognitionCount: counts[cv.id] || 0,
            }))
            .sort((a: { recognitionCount: number }, b: { recognitionCount: number }) => b.recognitionCount - a.recognitionCount);
    }
}
