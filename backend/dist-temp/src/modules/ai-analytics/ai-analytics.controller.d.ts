import { AiAnalyticsService } from './ai-analytics.service';
export declare class AiAnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AiAnalyticsService);
    getMyScore(req: any): Promise<{
        success: boolean;
        data: import("./ai-analytics.service").EmployeeScore;
    }>;
    getEmployeeScore(id: string): Promise<{
        success: boolean;
        data: import("./ai-analytics.service").EmployeeScore;
    }>;
    getTeamAnalytics(req: any): Promise<{
        success: boolean;
        data: import("./ai-analytics.service").TeamAnalytics;
    }>;
    getMyInsights(req: any): Promise<{
        success: boolean;
        insights: string;
    }>;
    predictAbsence(id: string): Promise<{
        success: boolean;
        data: {
            probability: number;
            factors: string[];
            recommendation: string;
        };
    }>;
    getLatePatterns(req: any): Promise<{
        success: boolean;
        data: {
            pattern: string;
            affectedEmployees: number;
            insights: string[];
        };
    }>;
}
