import { RecognitionService } from './recognition.service';
interface RequestWithUser {
    user: {
        id: string;
        companyId: string;
    };
}
export declare class RecognitionController {
    private readonly recognitionService;
    constructor(recognitionService: RecognitionService);
    createCoreValue(req: RequestWithUser, dto: any): Promise<{
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
    getCoreValues(req: RequestWithUser): Promise<{
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
    updateCoreValue(id: string, dto: any): Promise<{
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
    giveRecognition(req: RequestWithUser, dto: any): Promise<{
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
    getRecognitionWall(req: RequestWithUser, page?: number, limit?: number): Promise<{
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
    getMyRecognitions(req: RequestWithUser): Promise<{
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
    addReaction(req: RequestWithUser, id: string, body: {
        emoji: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        emoji: string;
        recognitionId: string;
    } | null>;
    removeReaction(req: RequestWithUser, id: string, emoji: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        emoji: string;
        recognitionId: string;
    }>;
    getLeaderboard(req: RequestWithUser, period?: 'week' | 'month' | 'year'): Promise<{
        userId: string;
        points: number;
    }[]>;
    getRecognitionStats(req: RequestWithUser): Promise<{
        total: number;
        thisMonth: number;
        lastMonth: number;
        growthRate: string | number;
        byType: {
            type: import(".prisma/client").$Enums.RecognitionType;
            count: number;
        }[];
    }>;
    getTopCoreValues(req: RequestWithUser): Promise<{
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
export {};
