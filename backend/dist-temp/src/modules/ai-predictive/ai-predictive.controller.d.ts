import { AiPredictiveService } from './ai-predictive.service';
export declare class AiPredictiveController {
    private readonly predictiveService;
    constructor(predictiveService: AiPredictiveService);
    forecastAttendance(req: any, days?: string): Promise<{
        success: boolean;
        data: {
            period: string;
            expectedAttendanceRate: number;
            expectedAbsences: number;
            riskDays: string[];
            insights: string[];
        };
    }>;
    predictTurnover(req: any): Promise<{
        success: boolean;
        data: {
            riskLevel: "low" | "medium" | "high";
            atRiskEmployees: {
                name: string;
                riskFactors: string[];
            }[];
            recommendations: string[];
        };
    }>;
    forecastCosts(req: any): Promise<{
        success: boolean;
        data: {
            currentMonthlyPayroll: number;
            projectedNextMonth: number;
            potentialSavings: string[];
            budgetAlerts: string[];
        };
    }>;
    getAiPredictions(req: any): Promise<{
        success: boolean;
        predictions: string;
    }>;
}
