import { PrismaService } from "../../common/prisma/prisma.service";
import { PolicyPayrollLine } from "../payroll-calculation/dto/calculation.types";
import { PolicyContextService, EnrichedPolicyContext } from "./policy-context.service";
import { FormulaParserService } from "./formula-parser.service";
import { DynamicQueryService } from "./dynamic-query.service";
import { AiAgentService } from "./ai-agent.service";
import { PolicyExceptionService } from "./policy-exception.service";
import { TieredPenaltyService } from "./tiered-penalty.service";
export interface SmartPolicyExecutionResult {
    success: boolean;
    amount: number;
    policyLine?: PolicyPayrollLine;
    explanation?: string;
    error?: string;
}
export interface SmartPolicyExecutionContext {
    employee: any;
    baseSalary: number;
    workingDays: number;
    absentDays: number;
    lateDays: number;
    overtimeHours: number;
    month: number;
    year: number;
    presentDays?: number;
    attendancePercentage?: number;
    yearsOfService?: number;
}
export declare class SmartPolicyExecutorService {
    private prisma;
    private policyContext;
    private formulaParser;
    private dynamicQuery;
    private aiAgent;
    private policyException;
    private tieredPenalty;
    private readonly logger;
    constructor(prisma: PrismaService, policyContext: PolicyContextService, formulaParser: FormulaParserService, dynamicQuery: DynamicQueryService, aiAgent: AiAgentService, policyException: PolicyExceptionService, tieredPenalty: TieredPenaltyService);
    executeSmartPolicies(companyId: string, context: SmartPolicyExecutionContext): Promise<SmartPolicyExecutionResult[]>;
    executeSmartPoliciesWithTransaction(companyId: string, context: SmartPolicyExecutionContext, options?: {
        payrollRunId?: string;
        rollbackOnFailure?: boolean;
    }): Promise<{
        results: SmartPolicyExecutionResult[];
        success: boolean;
        error?: string;
        rolledBack: boolean;
    }>;
    executeBatchSmartPolicies(companyId: string, employees: Array<{
        employee: any;
        baseSalary: number;
        workingDays: number;
        absentDays: number;
        lateDays: number;
        overtimeHours: number;
    }>, month: number, year: number, payrollRunId?: string): Promise<Map<string, SmartPolicyExecutionResult[]>>;
    evaluateAdvancedPolicy(policy: any, context: EnrichedPolicyContext): Promise<SmartPolicyExecutionResult>;
    private evaluateAdvancedConditions;
    private resolveDynamicField;
    private getNestedValue;
    private applyOperator;
    private evaluateConditions;
    private executeAIDynamicQuery;
    persistExecutionResult(policyId: string, employeeId: string, employeeName: string, result: SmartPolicyExecutionResult, context: {
        month: number;
        year: number;
        payrollRunId?: string;
    }): Promise<void>;
    private policyCache;
    private readonly CACHE_TTL_MS;
    getCachedPolicies(companyId: string): Promise<any[]>;
    invalidatePolicyCache(companyId: string): void;
}
