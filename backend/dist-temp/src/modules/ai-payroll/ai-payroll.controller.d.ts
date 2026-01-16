import { AiPayrollService } from './ai-payroll.service';
export declare class AiPayrollController {
    private readonly payrollService;
    constructor(payrollService: AiPayrollService);
    detectAnomalies(req: any): Promise<{
        success: boolean;
        count: number;
        data: import("./ai-payroll.service").SalaryAnomaly[];
    }>;
    assessAdvanceRisk(body: {
        userId: string;
        amount: number;
    }): Promise<{
        success: boolean;
        data: import("./ai-payroll.service").AdvanceRiskAssessment;
    }>;
    getDeductionTips(userId: string): Promise<{
        success: boolean;
        tips: string;
    }>;
    getSalaryTrends(req: any): Promise<{
        success: boolean;
        data: {
            averageSalary: number;
            totalPayroll: number;
            employeeCount: number;
            insights: string[];
        };
    }>;
}
