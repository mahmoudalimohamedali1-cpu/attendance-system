/**
 * AI Predictive Analytics Types
 * Type definitions for AI-powered absence predictions, patterns, and insights
 */

// 📊 Risk Level Enum
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// 📊 Feature Impact Enum
export enum FeatureImpact {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

// 🔍 Feature Importance
export interface FeatureImportance {
  feature: string;
  impact: FeatureImpact;
  description: string;
  weight: number;
}

// 👤 Employee Absence Prediction
export interface EmployeePrediction {
  userId: string;
  employeeName: string;
  absenceLikelihood: number;
  riskLevel: RiskLevel;
  contributingFactors: string[];
  departmentComparison?: string;
  predictionDate: Date;
}

// 📝 Prediction Explanation
export interface PredictionExplanation {
  summary: string;
  riskLevel: RiskLevel;
  likelihood: number;
  topFactors: FeatureImportance[];
  detailedExplanation: string;
  recommendations: string[];
}

// 🔍 Pattern Insight
export interface PatternInsight {
  patternType: string;
  description: string;
  affectedEmployees: string[];
  confidence: number;
  detectedAt: Date;
  insights: string[];
}

// 📈 Model Accuracy Metrics
export interface AccuracyMetrics {
  modelVersion: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  evaluatedAt: Date;
  predictionCount: number;
}

// 📡 API Response Types

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
