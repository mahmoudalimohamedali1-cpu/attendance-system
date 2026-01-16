import { PerformanceReviewCycleType } from '@prisma/client';
export declare class CreateReviewCycleDto {
    name: string;
    nameEn?: string;
    type?: PerformanceReviewCycleType;
    periodStart: string;
    periodEnd: string;
    selfReviewStart?: string;
    selfReviewEnd?: string;
    managerReviewStart?: string;
    managerReviewEnd?: string;
    feedbackStart?: string;
    feedbackEnd?: string;
    calibrationStart?: string;
    calibrationEnd?: string;
    includeSelfReview?: boolean;
    include360Feedback?: boolean;
    includeGoalRating?: boolean;
    includeCompetencyRating?: boolean;
    goalWeight?: number;
    competencyWeight?: number;
    valueWeight?: number;
    competencyFrameworkId?: string;
}
