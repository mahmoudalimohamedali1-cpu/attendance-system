import { PrismaService } from '../../common/prisma/prisma.service';
export interface LaborLawValidation {
    isCompliant: boolean;
    violations: Array<{
        article: string;
        articleText: string;
        issue: string;
        severity: 'ERROR' | 'WARNING' | 'INFO';
    }>;
    suggestions: string[];
}
export interface OptimizationSuggestion {
    type: 'PERFORMANCE' | 'CLARITY' | 'COVERAGE' | 'FAIRNESS';
    suggestion: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
}
export interface PatternAnalysis {
    patterns: Array<{
        type: string;
        description: string;
        affectedEmployees: number;
        suggestedAction: string;
    }>;
    insights: string[];
}
export interface RecommendedPolicy {
    title: string;
    description: string;
    originalText: string;
    reason: string;
    impact: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
}
export declare class PolicyCoachService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    validateAgainstLaborLaw(policyText: string, parsedRule?: any): Promise<LaborLawValidation>;
    suggestOptimizations(policyId: string): Promise<OptimizationSuggestion[]>;
    analyzePatterns(companyId: string): Promise<PatternAnalysis>;
    recommendPolicies(companyId: string): Promise<RecommendedPolicy[]>;
}
