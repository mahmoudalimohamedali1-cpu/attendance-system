import { api } from './api.service';

// 📊 Enums
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum FeatureImpact {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

// 📊 Interfaces
export interface FeatureImportance {
  feature: string;
  impact: FeatureImpact;
  description: string;
  weight: number;
}

export interface EmployeePrediction {
  userId: string;
  employeeName: string;
  absenceLikelihood: number;
  riskLevel: RiskLevel;
  contributingFactors: string[];
  departmentComparison?: string;
  predictionDate: Date;
}

export interface PredictionExplanation {
  summary: string;
  riskLevel: RiskLevel;
  likelihood: number;
  topFactors: FeatureImportance[];
  detailedExplanation: string;
  recommendations: string[];
}

export interface PatternInsight {
  patternType: string;
  description: string;
  affectedEmployees: string[];
  confidence: number;
  detectedAt: Date;
  insights: string[];
}

export interface AccuracyMetrics {
  modelVersion: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  evaluatedAt: Date;
  predictionCount: number;
}

export interface EmployeePredictionResponse {
  success: boolean;
  count: number;
  generatedAt: Date;
  predictions: EmployeePrediction[];
}

export interface EmployeePredictionWithExplanation {
  prediction: EmployeePrediction;
  explanation: PredictionExplanation;
}

export interface PatternsResponse {
  success: boolean;
  count: number;
  detectedAt: Date;
  patterns: PatternInsight[];
}

export interface ModelAccuracyResponse {
  success: boolean;
  metrics: AccuracyMetrics | null;
  message?: string;
}

export interface TrainModelResponse {
  success: boolean;
  message: string;
  modelVersion: string;
  accuracy: number;
  trainedAt: Date;
}

export interface RecommendationsResponse {
  success: boolean;
  overview: {
    summary: string;
    riskDistribution: {
      high: number;
      medium: number;
      low: number;
    };
    averageLikelihood: number;
    insights: string[];
  };
  recommendations: string[];
  patterns: PatternInsight[];
}

// 📡 AI Predictive Service
export const aiPredictiveService = {
  /**
   * 🎯 الحصول على توقعات غياب الموظفين
   * Get employee absence predictions
   */
  async getEmployeePredictions(targetDate?: string): Promise<EmployeePredictionResponse> {
    const params = targetDate ? { targetDate } : {};
    const response = await api.get('/ai-predictive/employee-predictions', { params }) as EmployeePredictionResponse | { data: EmployeePredictionResponse };
    return (response as any).data || response as EmployeePredictionResponse;
  },

  /**
   * 🔍 الحصول على توقع موظف واحد مع الشرح التفصيلي
   * Get single employee prediction with detailed explanation
   */
  async getEmployeePrediction(userId: string, targetDate?: string): Promise<EmployeePredictionWithExplanation> {
    const params = targetDate ? { targetDate } : {};
    const response = await api.get(`/ai-predictive/employee-predictions/${userId}`, { params }) as EmployeePredictionWithExplanation | { data: EmployeePredictionWithExplanation };
    return (response as any).data || response as EmployeePredictionWithExplanation;
  },

  /**
   * 🔍 الحصول على الأنماط المكتشفة
   * Get detected absence patterns
   */
  async getPatterns(patternType?: string, limit?: number): Promise<PatternsResponse> {
    const params: any = {};
    if (patternType) params.patternType = patternType;
    if (limit) params.limit = limit;
    const response = await api.get('/ai-predictive/patterns', { params }) as PatternsResponse | { data: PatternsResponse };
    return (response as any).data || response as PatternsResponse;
  },

  /**
   * 📈 الحصول على مقاييس دقة النموذج
   * Get ML model accuracy metrics
   */
  async getModelAccuracy(): Promise<ModelAccuracyResponse> {
    const response = await api.get('/ai-predictive/model-accuracy') as ModelAccuracyResponse | { data: ModelAccuracyResponse };
    return (response as any).data || response as ModelAccuracyResponse;
  },

  /**
   * 🚀 تدريب نموذج التعلم الآلي
   * Train ML model on historical data
   */
  async trainModel(): Promise<TrainModelResponse> {
    const response = await api.post('/ai-predictive/train-model', {}) as TrainModelResponse | { data: TrainModelResponse };
    return (response as any).data || response as TrainModelResponse;
  },

  /**
   * 💡 الحصول على التوصيات المدعومة بالذكاء الاصطناعي
   * Get AI-driven recommendations
   */
  async getRecommendations(): Promise<RecommendationsResponse> {
    const response = await api.get('/ai-predictive/recommendations') as RecommendationsResponse | { data: RecommendationsResponse };
    return (response as any).data || response as RecommendationsResponse;
  },
};
