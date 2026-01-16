import { PrismaService } from '../../common/prisma/prisma.service';
import { RecognitionType } from '@prisma/client';
export declare class RecognitionService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createCoreValue(companyId: string, dto: {
        name: string;
        nameEn?: string;
        description?: string;
        icon?: string;
        color?: string;
    }): Promise<{
        id: string;
        name: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        description: string | null;
        isActive: boolean;
        sortOrder: number;
        color: string | null;
        icon: string | null;
    }>;
    getCoreValues(companyId: string): Promise<{
        id: string;
        name: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        description: string | null;
        isActive: boolean;
        sortOrder: number;
        color: string | null;
        icon: string | null;
    }[]>;
    updateCoreValue(id: string, dto: Partial<{
        name: string;
        nameEn: string;
        description: string;
        icon: string;
        color: string;
        isActive: boolean;
        sortOrder: number;
    }>): Promise<{
        id: string;
        name: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        description: string | null;
        isActive: boolean;
        sortOrder: number;
        color: string | null;
        icon: string | null;
    }>;
    deleteCoreValue(id: string): Promise<{
        id: string;
        name: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        description: string | null;
        isActive: boolean;
        sortOrder: number;
        color: string | null;
        icon: string | null;
    }>;
    giveRecognition(companyId: string, giverId: string, dto: {
        receiverId: string;
        type?: RecognitionType;
        message: string;
        coreValueId?: string;
        pointsAwarded?: number;
        monetaryValue?: number;
        isPublic?: boolean;
    }): Promise<{
        id: string;
        createdAt: Date;
        companyId: string;
        type: import(".prisma/client").$Enums.RecognitionType;
        isPublic: boolean;
        message: string;
        giverId: string;
        receiverId: string;
        coreValueId: string | null;
        pointsAwarded: number;
        monetaryValue: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    getRecognitionWall(companyId: string, page?: number, limit?: number): Promise<{
        data: ({
            reactions: {
                userId: string;
                emoji: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            companyId: string;
            type: import(".prisma/client").$Enums.RecognitionType;
            isPublic: boolean;
            message: string;
            giverId: string;
            receiverId: string;
            coreValueId: string | null;
            pointsAwarded: number;
            monetaryValue: import("@prisma/client/runtime/library").Decimal | null;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getMyRecognitions(userId: string): Promise<{
        given: {
            id: string;
            createdAt: Date;
            companyId: string;
            type: import(".prisma/client").$Enums.RecognitionType;
            isPublic: boolean;
            message: string;
            giverId: string;
            receiverId: string;
            coreValueId: string | null;
            pointsAwarded: number;
            monetaryValue: import("@prisma/client/runtime/library").Decimal | null;
        }[];
        received: {
            id: string;
            createdAt: Date;
            companyId: string;
            type: import(".prisma/client").$Enums.RecognitionType;
            isPublic: boolean;
            message: string;
            giverId: string;
            receiverId: string;
            coreValueId: string | null;
            pointsAwarded: number;
            monetaryValue: import("@prisma/client/runtime/library").Decimal | null;
        }[];
        stats: {
            totalGiven: number;
            totalReceived: number;
            totalPointsReceived: number;
        };
    }>;
    addReaction(recognitionId: string, userId: string, emoji: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        emoji: string;
        recognitionId: string;
    } | null>;
    removeReaction(recognitionId: string, userId: string, emoji: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        emoji: string;
        recognitionId: string;
    }>;
    getLeaderboard(companyId: string, period?: 'week' | 'month' | 'year'): Promise<{
        userId: string;
        points: number;
    }[]>;
    getRecognitionStats(companyId: string): Promise<{
        total: number;
        thisMonth: number;
        lastMonth: number;
        growthRate: string | number;
        byType: {
            type: import(".prisma/client").$Enums.RecognitionType;
            count: number;
        }[];
    }>;
    getTopCoreValues(companyId: string): Promise<{
        recognitionCount: number;
        id: string;
        name: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        description: string | null;
        isActive: boolean;
        sortOrder: number;
        color: string | null;
        icon: string | null;
    }[]>;
}
