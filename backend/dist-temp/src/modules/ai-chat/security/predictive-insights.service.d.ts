export interface AbsencePrediction {
    date: Date;
    predictedAbsences: number;
    confidence: number;
    factors: string[];
    recommendation: string;
}
export interface WorkloadForecast {
    period: string;
    currentLoad: number;
    predictedLoad: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    peakDays: string[];
    recommendation: string;
}
export interface BudgetPrediction {
    category: string;
    categoryAr: string;
    currentSpend: number;
    predictedSpend: number;
    variance: number;
    variancePercent: number;
    status: 'under' | 'on_track' | 'over';
}
export interface HiringForecast {
    department: string;
    departmentAr: string;
    currentHeadcount: number;
    predictedNeed: number;
    timeline: string;
    reason: string;
    priority: 'low' | 'medium' | 'high';
}
export interface TrendAnalysis {
    metric: string;
    metricAr: string;
    current: number;
    previous: number;
    change: number;
    changePercent: number;
    trend: 'up' | 'down' | 'stable';
    insight: string;
}
export declare class PredictiveInsightsService {
    private readonly logger;
    predictAbsences(date: Date): AbsencePrediction;
    forecastWorkload(department: string): WorkloadForecast;
    predictBudget(): BudgetPrediction[];
    forecastHiring(): HiringForecast[];
    analyzeTrends(): TrendAnalysis[];
    formatAbsencePrediction(pred: AbsencePrediction): string;
    formatWorkloadForecast(forecast: WorkloadForecast): string;
    formatBudgetPrediction(predictions: BudgetPrediction[]): string;
    formatHiringForecast(forecasts: HiringForecast[]): string;
}
