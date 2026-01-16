import { PrismaService } from '../../common/prisma/prisma.service';
import { PolicyContextService } from './policy-context.service';
import { SmartPolicyExecutorService } from './smart-policy-executor.service';
import { FormulaParserService } from './formula-parser.service';
import { Decimal } from '@prisma/client/runtime/library';
export interface EmployeeSimulationResult {
    employeeId: string;
    employeeName: string;
    amount: number;
    type: 'ADDITION' | 'DEDUCTION' | 'NONE';
    reason: string;
    conditionsMet: boolean;
    details?: any;
}
export declare class PolicySimulationService {
    private readonly prisma;
    private readonly policyContext;
    private readonly policyExecutor;
    private readonly formulaParser;
    private readonly logger;
    constructor(prisma: PrismaService, policyContext: PolicyContextService, policyExecutor: SmartPolicyExecutorService, formulaParser: FormulaParserService);
    simulate(policyId: string, period: string, simulatorId: string, simulatorName: string): Promise<{
        id: string;
        summary: {
            totalEmployees: number;
            affectedEmployees: number;
            totalAdditions: number;
            totalDeductions: number;
            netImpact: number;
            executionTimeMs: number;
            warningsCount: number;
        };
        results: EmployeeSimulationResult[];
        warnings: string[];
    }>;
    private simulateForEmployee;
    private evaluateConditions;
    private mapFieldPath;
    private getNestedValue;
    private applyOperator;
    private evaluateSimpleFormula;
    simulateForEmployees(policyId: string, employeeIds: string[], period: string, simulatorId: string, simulatorName: string): Promise<{
        results: EmployeeSimulationResult[];
        summary: {
            totalEmployees: number;
            affectedEmployees: number;
            totalAdditions: number;
            totalDeductions: number;
        };
    }>;
    getSimulationHistory(policyId: string, options?: {
        page?: number;
        limit?: number;
    }): Promise<{
        data: {
            id: string;
            createdAt: Date;
            totalDeductions: Decimal;
            simulatedByName: string;
            simulationPeriod: string;
            totalEmployeesAffected: number;
            totalAdditions: Decimal;
            executionTimeMs: number | null;
            warningsCount: number;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getSimulationDetails(simulationId: string): Promise<{
        id: string;
        createdAt: Date;
        totalDeductions: Decimal;
        policyId: string;
        results: import("@prisma/client/runtime/library").JsonValue;
        simulatedBy: string;
        simulatedByName: string;
        simulationPeriod: string;
        totalEmployeesAffected: number;
        totalAdditions: Decimal;
        executionTimeMs: number | null;
        warningsCount: number;
        warnings: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
}
