export interface TurnoverRisk {
    employeeId: string;
    employeeName: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number;
    factors: string[];
    recommendations: string[];
}
export interface PerformanceForecast {
    employeeId: string;
    employeeName: string;
    currentRating: number;
    predictedRating: number;
    trend: 'improving' | 'stable' | 'declining';
    factors: string[];
}
export interface EngagementScore {
    employeeId: string;
    score: number;
    category: 'highly_engaged' | 'engaged' | 'neutral' | 'disengaged' | 'at_risk';
    categoryAr: string;
    indicators: {
        name: string;
        value: number;
        status: 'good' | 'warning' | 'bad';
    }[];
}
export interface BurnoutWarning {
    employeeId: string;
    employeeName: string;
    burnoutRisk: 'low' | 'moderate' | 'high' | 'critical';
    riskScore: number;
    signals: string[];
    recommendations: string[];
}
export interface TeamAnalytics {
    teamSize: number;
    averageEngagement: number;
    turnoverRisk: number;
    topPerformers: string[];
    needsAttention: string[];
}
export declare class AnalyticsService {
    private readonly logger;
    private readonly turnoverFactors;
    private readonly engagementIndicators;
    predictTurnoverRisk(employeeData: {
        id: string;
        name: string;
        tenureMonths: number;
        lastPromotion?: number;
        salaryPercentile?: number;
        absenceRate?: number;
        engagementScore?: number;
    }): TurnoverRisk;
    calculateEngagementScore(employeeData: {
        id: string;
        attendanceRate: number;
        punctualityRate: number;
        taskCompletionRate: number;
        collaborationScore: number;
        initiativeScore: number;
    }): EngagementScore;
    detectBurnoutRisk(employeeData: {
        id: string;
        name: string;
        weeklyHours: number;
        overtimeHours: number;
        vacationDaysUsed: number;
        vacationDaysAvailable: number;
        recentAbsences: number;
        projectCount: number;
    }): BurnoutWarning;
    formatTurnoverRisk(risk: TurnoverRisk): string;
    formatEngagementScore(score: EngagementScore): string;
    formatBurnoutWarning(warning: BurnoutWarning): string;
}
