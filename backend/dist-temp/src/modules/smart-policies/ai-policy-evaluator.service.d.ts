import { PrismaService } from "../../common/prisma/prisma.service";
import { AiService } from "../ai/ai.service";
import { PolicyPayrollLine } from "../payroll-calculation/dto/calculation.types";
export interface EmployeePayrollContext {
    employeeId: string;
    employeeName: string;
    department?: string | null;
    jobTitle?: string | null;
    hireDate?: Date | null;
    yearsOfService: number;
    baseSalary: number;
    totalSalary: number;
    workingDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    lateMinutes: number;
    overtimeHours: number;
    attendancePercentage: number;
    leavesTaken: number;
    unpaidLeaves: number;
    activePenalties: number;
    pendingCustodyReturns: number;
    returnedCustodyThisMonth: number;
    month: number;
    year: number;
}
export interface AIPolicyEvaluationResult {
    policyId: string;
    policyName: string;
    applies: boolean;
    amount: number;
    type: "EARNING" | "DEDUCTION";
    reason: string;
}
export declare class AIPolicyEvaluatorService {
    private prisma;
    private aiService;
    private readonly logger;
    constructor(prisma: PrismaService, aiService: AiService);
    evaluateAllPolicies(companyId: string, context: EmployeePayrollContext): Promise<PolicyPayrollLine[]>;
    private evaluatePolicyWithAI;
}
