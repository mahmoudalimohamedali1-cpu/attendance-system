import { api } from './api.service';
import type {
  EmployeePrediction,
  PredictionExplanation,
  PatternInsight,
  AccuracyMetrics,
  EmployeePredictionResponse,
  EmployeePredictionWithExplanation,
  PatternsResponse,
  ModelAccuracyResponse,
  TrainModelResponse,
  RecommendationsResponse,
} from '../types/ai-predictive.types';

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
