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
 * Get list of scenarios (optional - for future use)
 */
export const getScenarios = async (): Promise<ScenarioResponseDto[]> => {
    return api.get<ScenarioResponseDto[]>(`${BASE_URL}/scenarios`);
};

export default {
    getForecast,
    optimizeSchedule,
    getCoverageGaps,
    createScenario,
    getScenarios,
};
