import { PrismaService } from '../../common/prisma/prisma.service';
export declare class StuckDetectionService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    detectStuckSubmissions(): Promise<void>;
    private createStuckAlert;
    manualCheck(): Promise<{
        message: string;
    }>;
    getStuckStats(): Promise<{
        mudad: number;
        wps: number;
        total: number;
        threshold: string;
    }>;
}
