import { PerformanceReviewStatus } from '@prisma/client';
export declare class UpdateReviewDto {
    status?: PerformanceReviewStatus;
    performanceScore?: number;
    potentialScore?: number;
    nineBoxPosition?: string;
}
