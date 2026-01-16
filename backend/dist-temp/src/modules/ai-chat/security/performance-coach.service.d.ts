export interface PerformanceGoal {
    id: string;
    userId: string;
    title: string;
    description: string;
    type: 'objective' | 'key_result' | 'task' | 'development';
    typeAr: string;
    target: number;
    current: number;
    unit: string;
    dueDate: Date;
    status: 'not_started' | 'in_progress' | 'at_risk' | 'completed';
    statusAr: string;
    createdAt: Date;
}
export interface PerformanceReview {
    userId: string;
    period: string;
    overallRating: number;
    categories: ReviewCategory[];
    strengths: string[];
    improvements: string[];
    managerComments?: string;
    selfRating?: number;
}
export interface ReviewCategory {
    name: string;
    nameAr: string;
    rating: number;
    weight: number;
    feedback?: string;
}
export interface CoachingTip {
    id: string;
    category: 'productivity' | 'communication' | 'leadership' | 'technical' | 'wellbeing';
    categoryAr: string;
    title: string;
    content: string;
    actionItems: string[];
}
export interface FeedbackRequest {
    id: string;
    fromUserId: string;
    toUserId: string;
    toUserName: string;
    type: 'peer' | 'manager' | 'direct_report' | '360';
    questions: string[];
    status: 'pending' | 'completed';
    createdAt: Date;
    dueDate: Date;
}
export declare class PerformanceCoachService {
    private readonly logger;
    private goals;
    private readonly coachingTips;
    private readonly reviewCategories;
    createGoal(userId: string, title: string, description: string, type: PerformanceGoal['type'], target: number, unit: string, dueDate: Date): PerformanceGoal;
    updateGoalProgress(goalId: string, newValue: number): {
        success: boolean;
        goal?: PerformanceGoal;
        message: string;
    };
    getUserGoals(userId: string): PerformanceGoal[];
    getCoachingTip(category?: CoachingTip['category']): CoachingTip;
    calculateOverallRating(categoryRatings: {
        category: string;
        rating: number;
    }[]): number;
    formatGoals(userId: string): string;
    private getProgressBar;
    formatCoachingTip(tip: CoachingTip): string;
    formatPerformanceSummary(userId: string): string;
}
