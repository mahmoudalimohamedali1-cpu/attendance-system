export interface BenefitsInfo {
    type: string;
    typeAr: string;
    category: 'health' | 'insurance' | 'allowance' | 'leave' | 'other';
    description: string;
    eligibility: string;
    value?: string;
    enrolled: boolean;
}
export interface LeaveBalance {
    type: string;
    typeAr: string;
    total: number;
    used: number;
    pending: number;
    available: number;
    expiresAt?: Date;
}
export interface PayslipSummary {
    period: string;
    grossSalary: number;
    deductions: {
        name: string;
        amount: number;
    }[];
    additions: {
        name: string;
        amount: number;
    }[];
    netSalary: number;
    paymentDate: Date;
}
export interface HRFaq {
    question: string;
    questionAr: string;
    answer: string;
    answerAr: string;
    category: string;
}
export declare class HRAssistantService {
    private readonly logger;
    private readonly benefits;
    private readonly leaveTypes;
    private readonly faqs;
    getBenefits(includeUnenrolled?: boolean): BenefitsInfo[];
    getLeaveBalances(yearsOfService?: number): LeaveBalance[];
    getPayslipSummary(salary?: number): PayslipSummary;
    answerFaq(query: string): {
        found: boolean;
        answer?: string;
        category?: string;
    };
    formatBenefits(): string;
    formatLeaveBalances(yearsOfService?: number): string;
    private getProgressBar;
    formatPayslip(salary?: number): string;
    formatHRMenu(): string;
}
