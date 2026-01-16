export interface CareerPath {
    currentRole: string;
    currentRoleAr: string;
    currentLevel: number;
    nextRoles: CareerOption[];
    lateralMoves: CareerOption[];
    timeInRole: number;
}
export interface CareerOption {
    title: string;
    titleAr: string;
    level: number;
    requirements: string[];
    skills: string[];
    avgTimeToReach: number;
    salaryIncrease: number;
    available: boolean;
}
export interface PromotionReadiness {
    employeeId: string;
    employeeName: string;
    currentRole: string;
    targetRole: string;
    readinessScore: number;
    gaps: {
        skill: string;
        current: number;
        required: number;
    }[];
    recommendations: string[];
    estimatedTime: number;
}
export interface SalaryProgression {
    currentSalary: number;
    marketAverage: number;
    percentile: number;
    projections: {
        year: number;
        estimated: number;
    }[];
}
export declare class CareerAdvisorService {
    private readonly logger;
    private readonly careerLadder;
    private readonly roleRequirements;
    getCareerPath(currentRole: string, timeInRole?: number): CareerPath;
    private getSkillAr;
    assessPromotionReadiness(employeeId: string, employeeName: string, currentRole: string, targetRole: string, currentSkills: {
        skill: string;
        level: number;
    }[]): PromotionReadiness;
    calculateSalaryProgression(currentSalary: number, currentLevel: number): SalaryProgression;
    formatCareerPath(path: CareerPath): string;
    formatReadinessAssessment(readiness: PromotionReadiness): string;
}
