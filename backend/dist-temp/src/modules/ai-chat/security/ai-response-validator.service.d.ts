import { z, ZodSchema } from 'zod';
export declare const EnhancementAnalysisSchema: z.ZodObject<{
    operation: z.ZodEnum<{
        unknown: "unknown";
        add_feature: "add_feature";
        add_enum: "add_enum";
        update_value: "update_value";
        create_field: "create_field";
        modify_logic: "modify_logic";
    }>;
    targetSystem: z.ZodEnum<{
        employees: "employees";
        settings: "settings";
        attendance: "attendance";
        leaves: "leaves";
        payroll: "payroll";
        unknown: "unknown";
    }>;
    description: z.ZodString;
    confidence: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export declare const EmployeeActionSchema: z.ZodObject<{
    action: z.ZodEnum<{
        query: "query";
        create: "create";
        update: "update";
        delete: "delete";
    }>;
    employeeName: z.ZodOptional<z.ZodString>;
    field: z.ZodOptional<z.ZodString>;
    value: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>;
export declare const QueryResultSchema: z.ZodObject<{
    type: z.ZodEnum<{
        count: "count";
        aggregate: "aggregate";
        list: "list";
        detail: "detail";
    }>;
    data: z.ZodUnknown;
    summary: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type EnhancementAnalysis = z.infer<typeof EnhancementAnalysisSchema>;
export type EmployeeAction = z.infer<typeof EmployeeActionSchema>;
export type QueryResult = z.infer<typeof QueryResultSchema>;
export interface ValidationResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    rawResponse?: string;
    fallback?: T;
}
export declare class AIResponseValidatorService {
    private readonly logger;
    private readonly MAX_RESPONSE_LENGTH;
    private readonly MAX_JSON_DEPTH;
    validate<T>(response: string | null | undefined, schema: ZodSchema<T>, fallback?: T): ValidationResult<T>;
    private extractJson;
    private repairJson;
    validateEnhancementAnalysis(response: string): ValidationResult<EnhancementAnalysis>;
    validateEmployeeAction(response: string): ValidationResult<EmployeeAction>;
    sanitizeTextResponse(response: string | null | undefined): string;
    detectHallucination(response: string, context: {
        employeeNames?: string[];
        validOptions?: string[];
    }): boolean;
}
