export interface LaborLawArticle {
    id: string;
    articleNumber: string;
    title: string;
    titleAr: string;
    content: string;
    contentAr: string;
    category: 'working_hours' | 'leave' | 'termination' | 'wages' | 'safety' | 'contracts';
    categoryAr: string;
}
export interface GOSICalculation {
    basicSalary: number;
    housingAllowance: number;
    totalInsurable: number;
    employeeShare: number;
    employerShare: number;
    totalContribution: number;
}
export interface EndOfServiceCalculation {
    yearsOfService: number;
    lastSalary: number;
    terminationType: 'resignation' | 'termination' | 'retirement' | 'contract_end';
    entitlement: number;
    breakdown: {
        period: string;
        amount: number;
    }[];
}
export interface ComplianceCheck {
    area: string;
    areaAr: string;
    status: 'compliant' | 'warning' | 'violation';
    details: string;
    recommendation?: string;
}
export declare class ComplianceAssistantService {
    private readonly logger;
    private readonly laborLawArticles;
    private readonly faqPatterns;
    answerQuestion(question: string): {
        found: boolean;
        article?: LaborLawArticle;
        message: string;
    };
    private formatArticle;
    calculateGOSI(basicSalary: number, housingAllowance?: number): GOSICalculation;
    calculateEndOfService(yearsOfService: number, lastSalary: number, terminationType: EndOfServiceCalculation['terminationType']): EndOfServiceCalculation;
    checkCompliance(data: {
        weeklyHours: number;
        overtimeHours: number;
        annualLeaveDays: number;
        yearsOfService: number;
    }): ComplianceCheck[];
    formatGOSICalculation(calc: GOSICalculation): string;
    formatEndOfService(calc: EndOfServiceCalculation): string;
    formatComplianceCheck(checks: ComplianceCheck[]): string;
}
