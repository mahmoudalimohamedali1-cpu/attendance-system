import { PrismaService } from '../../common/prisma/prisma.service';
import { OccurrenceResetPeriod } from '@prisma/client';
export interface TieredPenaltyConfig {
    tier: number;
    minOccurrences: number;
    maxOccurrences?: number;
    action: {
        type: 'NONE' | 'DEDUCT' | 'ADD' | 'NOTIFY';
        value?: number;
        valueType?: 'FIXED' | 'PERCENTAGE' | 'FORMULA';
        perOccurrence?: boolean;
        formula?: string;
    };
}
export interface TieredPenaltyResult {
    tier: number;
    occurrenceCount: number;
    action: TieredPenaltyConfig['action'];
    calculatedAmount: number;
    explanation: string;
}
export declare class TieredPenaltyService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    recordOccurrence(policyId: string, employeeId: string, occurrenceType: string, eventData?: any): Promise<number>;
    getOccurrenceCount(policyId: string, employeeId: string, occurrenceType: string): Promise<number>;
    calculatePenalty(policyId: string, employeeId: string, occurrenceType: string, tiers: TieredPenaltyConfig[], baseSalary: number): Promise<TieredPenaltyResult>;
    resetTracker(trackerId: string): Promise<void>;
    resetAllForPolicy(policyId: string): Promise<number>;
    updateResetPeriod(policyId: string, employeeId: string, occurrenceType: string, resetPeriod: OccurrenceResetPeriod): Promise<void>;
    getOccurrenceStats(policyId: string): Promise<{
        totalTrackers: number;
        totalOccurrences: number;
        byType: Record<string, {
            count: number;
            employees: number;
        }>;
        topOffenders: {
            employeeId: string;
            count: number;
            type: string;
        }[];
    }>;
    getEmployeeOccurrenceHistory(employeeId: string): Promise<({
        policy: {
            id: string;
            name: string | null;
            originalText: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        policyId: string;
        count: number;
        occurrenceType: string;
        resetPeriod: import(".prisma/client").$Enums.OccurrenceResetPeriod;
        lastResetAt: Date;
        lastOccurredAt: Date | null;
        lastEventData: import("@prisma/client/runtime/library").JsonValue | null;
    })[]>;
    processAutoResets(): Promise<number>;
    private shouldReset;
    private evaluateFormula;
    private generateExplanation;
}
