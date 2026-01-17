/**
 * Workforce Planning Service - Frontend API Client
 */

import { api } from '../services/api.service';

const BASE_URL = '/workforce-planning';

// ============================================================================
// Types & Interfaces
// ============================================================================

export enum ForecastType {
    STAFFING_NEEDS = 'STAFFING_NEEDS',
    COVERAGE_GAPS = 'COVERAGE_GAPS',
    COST_OPTIMIZATION = 'COST_OPTIMIZATION',
}

export enum CoverageAnalysisType {
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
}

export enum GapSeverity {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL',
}

export enum ScenarioType {
    HIRE = 'HIRE',
    TERMINATE = 'TERMINATE',
    SCHEDULE_CHANGE = 'SCHEDULE_CHANGE',
    COST_REDUCTION = 'COST_REDUCTION',
    EXPANSION = 'EXPANSION',
}

export enum ScenarioStatus {
    DRAFT = 'DRAFT',
    ANALYZING = 'ANALYZING',
    COMPLETED = 'COMPLETED',
    IMPLEMENTED = 'IMPLEMENTED',
    REJECTED = 'REJECTED',
}

// Forecast Types
export interface ForecastRequestDto {
    startDate: string;
    endDate: string;
    type?: ForecastType;
    branchId?: string;
    departmentId?: string;
}

export interface DemandPrediction {
    date: string;
    requiredStaff: number;
    availableStaff: number;
    gap: number;
    confidence: number;
}

export interface CoverageGap {
    startDate: string;
    endDate: string;
    department: string;
    gapSize: number;
    severity: string;
    recommendations: string[];
}

export interface CostOptimization {
    currentCost: number;
    optimizedCost: number;
    savings: number;
    savingsPercentage: number;
    recommendedActions: string[];
}

export interface ForecastResponseDto {
    companyId: string;
    startDate: string;
    endDate: string;
    predictions: DemandPrediction[];
    coverageGaps: CoverageGap[];
    costOptimization: CostOptimization;
    insights: string[];
    generatedAt: Date;
}

// Schedule Optimization Types
export interface ScheduleConstraints {
    minStaff?: number;
    maxStaff?: number;
    maxWeeklyHours?: number;
    minRestHours?: number;
    weekendDays?: number[];
}

export interface OptimizeScheduleRequestDto {
    startDate: string;
    endDate: string;
    branchId?: string;
    departmentId?: string;
    constraints?: ScheduleConstraints;
}

export interface ScheduleShift {
    date: string;
    userId: string;
    employeeName: string;
    startTime: string;
    endTime: string;
    hours: number;
    department?: string;
}

export interface ScheduleOptimizationResult {
    totalShifts: number;
    totalHours: number;
    estimatedCost: number;
    coverageRate: number;
    optimizationScore: number;
}

export interface OptimizeScheduleResponseDto {
    companyId: string;
    startDate: string;
    endDate: string;
    shifts: ScheduleShift[];
    result: ScheduleOptimizationResult;
    recommendations: string[];
    generatedAt: Date;
}

// Coverage Analysis Types
export interface CoverageAnalysisRequestDto {
    date: string;
    analysisType?: CoverageAnalysisType;
    branchId?: string;
    departmentId?: string;
}

export interface DepartmentCoverage {
    departmentName: string;
    departmentId: string;
    requiredStaff: number;
    availableStaff: number;
    presentStaff: number;
    onLeave: number;
    gap: number;
    coveragePercentage: number;
    severity: GapSeverity;
}

export interface ShiftCoverage {
    shiftName: string;
    startTime: string;
    endTime: string;
    requiredStaff: number;
    scheduledStaff: number;
    gap: number;
    coveragePercentage: number;
    severity: GapSeverity;
}

export interface CoverageGapDetail {
    date: string;
    department: string;
    gapSize: number;
    severity: GapSeverity;
    reason: string;
    recommendations: string[];
    impact: string;
}

export interface CoverageAnalysisResponseDto {
    companyId: string;
    date: string;
    analysisType: CoverageAnalysisType;
    overallCoveragePercentage: number;
    totalGaps: number;
    departmentCoverage: DepartmentCoverage[];
    shiftCoverage: ShiftCoverage[];
    criticalGaps: CoverageGapDetail[];
    recommendations: string[];
    overallStatus: string;
    generatedAt: Date;
}

// Business Metrics Types
export enum MetricType {
    SALES = 'SALES',
    PRODUCTION = 'PRODUCTION',
    ORDERS = 'ORDERS',
    TRAFFIC = 'TRAFFIC',
    WORKLOAD = 'WORKLOAD',
    CUSTOM = 'CUSTOM',
}

export interface CreateBusinessMetricDto {
    metricType: MetricType;
    metricName: string;
    date: string;
    value: number;
    branchId?: string;
    source?: string;
    metadata?: Record<string, any>;
}

export interface UpdateBusinessMetricDto {
    value?: number;
    source?: string;
    metadata?: Record<string, any>;
}

export interface BulkCreateMetricsDto {
    metrics: CreateBusinessMetricDto[];
}

export interface BusinessMetricQueryDto {
    metricType?: MetricType;
    branchId?: string;
    startDate?: string;
    endDate?: string;
}

export interface BusinessMetricResponseDto {
    id: string;
    companyId: string;
    branchId?: string;
    metricType: MetricType;
    metricName: string;
    date: Date;
    value: number;
    source?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

export interface MetricsSummaryDto {
    metricType: MetricType;
    total: number;
    average: number;
    min: number;
    max: number;
    count: number;
}

export interface MetricsTrendDto {
    date: string;
    value: number;
    changePercentage: number;
}

export interface WorkforceCorrelation {
    metric: string;
    correlation: number;
    impact: 'LOW' | 'MEDIUM' | 'HIGH';
    recommendation: string;
}

export interface BusinessMetricsAnalysisDto {
    companyId: string;
    startDate: string;
    endDate: string;
    summaries: MetricsSummaryDto[];
    trends: MetricsTrendDto[];
    insights: string[];
    workforceCorrelation: WorkforceCorrelation[];
    analyzedAt: Date;
}

// Coverage Gap Alerts Types
export enum AlertPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL',
}

export enum AlertStatus {
    PENDING = 'PENDING',
    SENT = 'SENT',
    ACKNOWLEDGED = 'ACKNOWLEDGED',
    RESOLVED = 'RESOLVED',
}

export interface CoverageGapAlert {
    id: string;
    companyId: string;
    date: string;
    departmentId?: string;
    departmentName?: string;
    branchId?: string;
    branchName?: string;
    gapSize: number;
    coveragePercentage: number;
    severity: GapSeverity;
    priority: AlertPriority;
    status: AlertStatus;
    reason: string;
    impact: string;
    recommendations: string[];
    createdAt: Date;
    notifiedAt?: Date;
    acknowledgedAt?: Date;
    resolvedAt?: Date;
}

export interface AlertQueryParams {
    priority?: AlertPriority;
    departmentId?: string;
    branchId?: string;
    startDate?: string;
    endDate?: string;
}

export interface AlertGenerationRequest {
    date: string;
    branchId?: string;
    departmentId?: string;
    notifyImmediately?: boolean;
    thresholds?: {
        criticalBelow?: number;
        highBelow?: number;
        mediumBelow?: number;
    };
}

export interface AlertGenerationResponse {
    companyId: string;
    date: string;
    totalAlertsGenerated: number;
    criticalAlerts: number;
    highAlerts: number;
    mediumAlerts: number;
    lowAlerts: number;
    alerts: CoverageGapAlert[];
    notificationsSent: number;
    generatedAt: Date;
}

export interface AlertStatistics {
    totalAlerts: number;
    byPriority: Record<AlertPriority, number>;
    byDepartment: Record<string, number>;
    averageCoveragePercentage: number;
    mostAffectedDepartments: Array<{ departmentName: string; alertCount: number }>;
}

export interface AutomatedDetectionResponse {
    todayAlerts: AlertGenerationResponse;
    upcomingAlerts: AlertGenerationResponse[];
    summary: {
        totalAlerts: number;
        criticalCount: number;
        highCount: number;
        notificationsSent: number;
    };
}

// Cost Optimization Types
export enum OptimizationType {
    SCHEDULE_ADJUSTMENT = 'SCHEDULE_ADJUSTMENT',
    HEADCOUNT_CHANGE = 'HEADCOUNT_CHANGE',
    SHIFT_RESTRUCTURE = 'SHIFT_RESTRUCTURE',
    OVERTIME_REDUCTION = 'OVERTIME_REDUCTION',
    COST_SAVING = 'COST_SAVING',
}

export enum OptimizationStatus {
    PENDING = 'PENDING',
    REVIEWED = 'REVIEWED',
    APPROVED = 'APPROVED',
    IMPLEMENTED = 'IMPLEMENTED',
    REJECTED = 'REJECTED',
}

export interface GenerateCostOptimizationDto {
    branchId?: string;
    departmentId?: string;
    startDate: string;
    endDate: string;
    optimizationTypes?: OptimizationType[];
}

export interface CostOptimizationQueryDto {
    optimizationType?: OptimizationType;
    status?: OptimizationStatus;
    branchId?: string;
    departmentId?: string;
    minPriority?: number;
}

export interface CostOptimizationRecommendationDto {
    id: string;
    companyId: string;
    branchId?: string;
    departmentId?: string;
    title: string;
    description: string;
    optimizationType: OptimizationType;
    status: OptimizationStatus;
    currentCost: number;
    optimizedCost: number;
    potentialSavings: number;
    savingsPercentage: number;
    priority: number;
    analysisData: Record<string, any>;
    recommendations: string;
    requirements?: string;
    risks?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CostOptimizationSummaryDto {
    totalRecommendations: number;
    totalPotentialSavings: number;
    byType: Record<OptimizationType, {
        count: number;
        potentialSavings: number;
    }>;
    byStatus: Record<OptimizationStatus, number>;
    topPriorityRecommendations: CostOptimizationRecommendationDto[];
}

export interface AIOptimizationAnalysisDto {
    companyId: string;
    startDate: string;
    endDate: string;
    recommendations: CostOptimizationRecommendationDto[];
    summary: {
        totalCurrentCost: number;
        totalOptimizedCost: number;
        totalPotentialSavings: number;
        overallSavingsPercentage: number;
    };
    insights: string[];
    analyzedAt: Date;
}

export interface UpdateOptimizationStatusDto {
    status: OptimizationStatus;
    notes?: string;
}

// Scenario Modeling Types
export interface ScenarioParameters {
    employeeCount?: number;
    departmentId?: string;
    branchId?: string;
    averageSalary?: number;
    changePercentage?: number;
    additionalData?: any;
}

export interface CreateScenarioRequestDto {
    name: string;
    description?: string;
    type: ScenarioType;
    startDate: string;
    endDate: string;
    parameters: ScenarioParameters;
}

export interface ScenarioImpactAnalysis {
    baselineCost: number;
    projectedCost: number;
    costDifference: number;
    costChangePercentage: number;
    baselineCoverage: number;
    projectedCoverage: number;
    coverageChange: number;
    impactAnalysis: string;
    risks: string[];
    benefits: string[];
    aiInsights: string;
}

export interface ScenarioResponseDto {
    id: string;
    companyId: string;
    name: string;
    description?: string;
    type: ScenarioType;
    status: ScenarioStatus;
    startDate: string;
    endDate: string;
    parameters: ScenarioParameters;
    impact: ScenarioImpactAnalysis;
    createdAt: Date;
    createdBy: string;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get demand forecast for staffing needs
 */
export const getForecast = async (params: ForecastRequestDto): Promise<ForecastResponseDto> => {
    return api.post<ForecastResponseDto>(`${BASE_URL}/forecast`, params);
};

/**
 * Optimize employee schedules
 */
export const optimizeSchedule = async (params: OptimizeScheduleRequestDto): Promise<OptimizeScheduleResponseDto> => {
    return api.post<OptimizeScheduleResponseDto>(`${BASE_URL}/optimize-schedule`, params);
};

/**
 * Get coverage gap analysis
 */
export const getCoverageGaps = async (params: CoverageAnalysisRequestDto): Promise<CoverageAnalysisResponseDto> => {
    return api.get<CoverageAnalysisResponseDto>(`${BASE_URL}/coverage-gaps`, {
        params: {
            date: params.date,
            analysisType: params.analysisType,
            branchId: params.branchId,
            departmentId: params.departmentId,
        }
    });
};

/**
 * Create what-if scenario
 */
export const createScenario = async (params: CreateScenarioRequestDto): Promise<ScenarioResponseDto> => {
    return api.post<ScenarioResponseDto>(`${BASE_URL}/scenario`, params);
};

/**
 * Get list of scenarios
 */
export const getScenarios = async (params?: { status?: ScenarioStatus; type?: ScenarioType }): Promise<ScenarioResponseDto[]> => {
    return api.get<ScenarioResponseDto[]>(`${BASE_URL}/scenarios`, { params });
};

// ============================================================================
// Business Metrics API Functions
// ============================================================================

/**
 * Get business metrics with optional filtering
 */
export const getBusinessMetrics = async (params?: BusinessMetricQueryDto): Promise<BusinessMetricResponseDto[]> => {
    return api.get<BusinessMetricResponseDto[]>(`${BASE_URL}/business-metrics`, { params });
};

/**
 * Get a specific business metric by ID
 */
export const getBusinessMetric = async (metricId: string): Promise<BusinessMetricResponseDto> => {
    return api.get<BusinessMetricResponseDto>(`${BASE_URL}/business-metrics/${metricId}`);
};

/**
 * Create a new business metric
 */
export const createBusinessMetric = async (dto: CreateBusinessMetricDto): Promise<BusinessMetricResponseDto> => {
    return api.post<BusinessMetricResponseDto>(`${BASE_URL}/business-metrics`, dto);
};

/**
 * Bulk create business metrics
 */
export const bulkCreateBusinessMetrics = async (dto: BulkCreateMetricsDto): Promise<{ created: number; failed: number }> => {
    return api.post<{ created: number; failed: number }>(`${BASE_URL}/business-metrics/bulk`, dto);
};

/**
 * Update a business metric
 */
export const updateBusinessMetric = async (metricId: string, dto: UpdateBusinessMetricDto): Promise<BusinessMetricResponseDto> => {
    return api.put<BusinessMetricResponseDto>(`${BASE_URL}/business-metrics/${metricId}`, dto);
};

/**
 * Delete a business metric
 */
export const deleteBusinessMetric = async (metricId: string): Promise<void> => {
    return api.delete<void>(`${BASE_URL}/business-metrics/${metricId}`);
};

/**
 * Get business metrics summary for a date range
 */
export const getBusinessMetricsSummary = async (params: {
    startDate: string;
    endDate: string;
    branchId?: string;
}): Promise<MetricsSummaryDto[]> => {
    return api.get<MetricsSummaryDto[]>(`${BASE_URL}/business-metrics/summary`, { params });
};

/**
 * Get business metrics trends over time
 */
export const getBusinessMetricsTrends = async (params: {
    metricType: MetricType;
    startDate: string;
    endDate: string;
    branchId?: string;
}): Promise<MetricsTrendDto[]> => {
    return api.get<MetricsTrendDto[]>(`${BASE_URL}/business-metrics/trends`, { params });
};

/**
 * Analyze business metrics and workforce correlation using AI
 */
export const analyzeBusinessMetrics = async (params: {
    startDate: string;
    endDate: string;
    branchId?: string;
}): Promise<BusinessMetricsAnalysisDto> => {
    return api.get<BusinessMetricsAnalysisDto>(`${BASE_URL}/business-metrics/analyze`, { params });
};

// ============================================================================
// Coverage Gap Alerts API Functions
// ============================================================================

/**
 * Get active coverage gap alerts
 */
export const getActiveAlerts = async (params?: AlertQueryParams): Promise<CoverageGapAlert[]> => {
    return api.get<CoverageGapAlert[]>(`${BASE_URL}/coverage-gap-alerts`, { params });
};

/**
 * Generate coverage gap alerts for a specific date
 */
export const generateAlerts = async (params: AlertGenerationRequest): Promise<AlertGenerationResponse> => {
    return api.post<AlertGenerationResponse>(`${BASE_URL}/coverage-gap-alerts/generate`, params);
};

/**
 * Check for coverage gaps in upcoming days
 */
export const checkUpcomingGaps = async (daysAhead?: number): Promise<AlertGenerationResponse[]> => {
    return api.get<AlertGenerationResponse[]>(`${BASE_URL}/coverage-gap-alerts/upcoming`, {
        params: daysAhead ? { daysAhead } : undefined
    });
};

/**
 * Run automated gap detection and send notifications
 */
export const runAutomatedDetection = async (): Promise<AutomatedDetectionResponse> => {
    return api.post<AutomatedDetectionResponse>(`${BASE_URL}/coverage-gap-alerts/automated-detection`);
};

/**
 * Get coverage gap alert statistics
 */
export const getAlertStatistics = async (params: {
    startDate: string;
    endDate: string;
}): Promise<AlertStatistics> => {
    return api.get<AlertStatistics>(`${BASE_URL}/coverage-gap-alerts/statistics`, { params });
};

/**
 * Acknowledge a coverage gap alert
 */
export const acknowledgeAlert = async (alertId: string): Promise<{ success: boolean; message: string }> => {
    return api.patch<{ success: boolean; message: string }>(`${BASE_URL}/coverage-gap-alerts/${alertId}/acknowledge`);
};

/**
 * Resolve a coverage gap alert
 */
export const resolveAlert = async (alertId: string, resolution: string): Promise<{ success: boolean; message: string }> => {
    return api.patch<{ success: boolean; message: string }>(`${BASE_URL}/coverage-gap-alerts/${alertId}/resolve`, { resolution });
};

// ============================================================================
// Cost Optimization API Functions
// ============================================================================

/**
 * Get cost optimization recommendations with filtering
 */
export const getCostOptimizations = async (params?: CostOptimizationQueryDto): Promise<CostOptimizationRecommendationDto[]> => {
    return api.get<CostOptimizationRecommendationDto[]>(`${BASE_URL}/cost-optimization`, { params });
};

/**
 * Get a specific cost optimization recommendation
 */
export const getCostOptimization = async (recommendationId: string): Promise<CostOptimizationRecommendationDto> => {
    return api.get<CostOptimizationRecommendationDto>(`${BASE_URL}/cost-optimization/${recommendationId}`);
};

/**
 * Get cost optimization summary
 */
export const getCostOptimizationSummary = async (branchId?: string): Promise<CostOptimizationSummaryDto> => {
    return api.get<CostOptimizationSummaryDto>(`${BASE_URL}/cost-optimization/summary`, {
        params: branchId ? { branchId } : undefined
    });
};

/**
 * Generate AI-powered cost optimization recommendations
 */
export const generateCostOptimizations = async (dto: GenerateCostOptimizationDto): Promise<AIOptimizationAnalysisDto> => {
    return api.post<AIOptimizationAnalysisDto>(`${BASE_URL}/cost-optimization/generate`, dto);
};

/**
 * Update cost optimization recommendation status
 */
export const updateCostOptimizationStatus = async (
    recommendationId: string,
    dto: UpdateOptimizationStatusDto
): Promise<CostOptimizationRecommendationDto> => {
    return api.patch<CostOptimizationRecommendationDto>(`${BASE_URL}/cost-optimization/${recommendationId}/status`, dto);
};

/**
 * Delete a cost optimization recommendation
 */
export const deleteCostOptimization = async (recommendationId: string): Promise<void> => {
    return api.delete<void>(`${BASE_URL}/cost-optimization/${recommendationId}`);
};

export default {
    // Core functions
    getForecast,
    optimizeSchedule,
    getCoverageGaps,
    createScenario,
    getScenarios,
    // Business Metrics
    getBusinessMetrics,
    getBusinessMetric,
    createBusinessMetric,
    bulkCreateBusinessMetrics,
    updateBusinessMetric,
    deleteBusinessMetric,
    getBusinessMetricsSummary,
    getBusinessMetricsTrends,
    analyzeBusinessMetrics,
    // Coverage Gap Alerts
    getActiveAlerts,
    generateAlerts,
    checkUpcomingGaps,
    runAutomatedDetection,
    getAlertStatistics,
    acknowledgeAlert,
    resolveAlert,
    // Cost Optimization
    getCostOptimizations,
    getCostOptimization,
    getCostOptimizationSummary,
    generateCostOptimizations,
    updateCostOptimizationStatus,
    deleteCostOptimization,
};
