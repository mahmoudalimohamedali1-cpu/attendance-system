export declare enum KPISourceType {
    MANUAL = "MANUAL",
    SYSTEM_SYNC = "SYSTEM_SYNC",
    API_IMPORT = "API_IMPORT",
    CSV_IMPORT = "CSV_IMPORT"
}
export declare enum KPIFrequency {
    DAILY = "DAILY",
    WEEKLY = "WEEKLY",
    MONTHLY = "MONTHLY",
    QUARTERLY = "QUARTERLY",
    YEARLY = "YEARLY"
}
export declare class CreateKPIDefinitionDto {
    companyId: string;
    jobFamilyId?: string;
    code: string;
    name: string;
    nameAr?: string;
    description?: string;
    unit: string;
    formula?: Record<string, any>;
    thresholds: {
        exceptional: number;
        exceeds: number;
        meets: number;
        partial: number;
    };
    sourceType?: KPISourceType;
    frequency?: KPIFrequency;
    minValue?: number;
    maxValue?: number;
    targetValue?: number;
}
export declare class UpdateKPIDefinitionDto {
    name?: string;
    nameAr?: string;
    description?: string;
    unit?: string;
    formula?: Record<string, any>;
    thresholds?: {
        exceptional: number;
        exceeds: number;
        meets: number;
        partial: number;
    };
    sourceType?: KPISourceType;
    frequency?: KPIFrequency;
    minValue?: number;
    maxValue?: number;
    targetValue?: number;
    isActive?: boolean;
}
export declare class CreateKPIAssignmentDto {
    cycleId: string;
    employeeId: string;
    kpiDefinitionId: string;
    target: number;
    weight?: number;
    notes?: string;
}
export declare class BulkCreateKPIAssignmentDto {
    cycleId: string;
    employeeIds: string[];
    kpiDefinitionId: string;
    target: number;
    weight?: number;
}
export declare class UpdateKPIAssignmentDto {
    target?: number;
    weight?: number;
    notes?: string;
}
export declare class CreateKPIEntryDto {
    assignmentId: string;
    periodStart: string;
    periodEnd: string;
    value: number;
    source?: string;
    notes?: string;
}
export declare class BulkCreateKPIEntryDto {
    entries: CreateKPIEntryDto[];
}
export declare class ImportKPIEntriesDto {
    cycleId: string;
    data: {
        employeeCode?: string;
        employeeId?: string;
        kpiCode: string;
        periodStart: string;
        periodEnd: string;
        value: number;
    }[];
}
export declare class GetKPIDefinitionsQueryDto {
    jobFamilyId?: string;
    isActive?: boolean;
    sourceType?: KPISourceType;
    frequency?: KPIFrequency;
}
export declare class GetKPIAssignmentsQueryDto {
    cycleId?: string;
    employeeId?: string;
    kpiDefinitionId?: string;
}
export declare class CalculateKPIScoreDto {
    assignmentId: string;
}
export declare class RecalculateAllScoresDto {
    cycleId: string;
    employeeId?: string;
}
