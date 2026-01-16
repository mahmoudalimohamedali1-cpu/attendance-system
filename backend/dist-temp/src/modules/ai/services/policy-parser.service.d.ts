import { AiService } from "../ai.service";
export interface ParsedPolicyRule {
    understood: boolean;
    trigger: {
        event: "ATTENDANCE" | "LEAVE" | "CUSTODY" | "PAYROLL" | "ANNIVERSARY" | "CONTRACT" | "DISCIPLINARY" | "PERFORMANCE" | "CUSTOM";
        subEvent?: string;
    };
    conditions: Array<{
        field: string;
        operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "CONTAINS" | "IN" | "BETWEEN" | "EQUALS" | "GREATER_THAN" | "LESS_THAN" | "GREATER_THAN_OR_EQUAL";
        value: any;
        aggregation?: "SUM" | "COUNT" | "AVG" | "MAX" | "MIN";
        period?: "DAY" | "WEEK" | "MONTH" | "YEAR" | "ALL_TIME";
    }>;
    actions: Array<{
        type: "ADD_TO_PAYROLL" | "DEDUCT_FROM_PAYROLL" | "SEND_NOTIFICATION" | "ALERT_HR" | "CREATE_RECORD";
        valueType?: "FIXED" | "PERCENTAGE" | "DAYS" | "FORMULA";
        value?: number | string;
        base?: "BASIC" | "TOTAL";
        componentCode?: string;
        description?: string;
        message?: string;
    }>;
    scope: {
        type: "ALL_EMPLOYEES" | "ALL" | "EMPLOYEE" | "DEPARTMENT" | "BRANCH" | "JOB_TITLE";
        targetId?: string;
        targetName?: string;
    };
    explanation: string;
    clarificationNeeded?: string;
    conditionLogic?: "ALL" | "ANY";
    dateRange?: {
        type: "SPECIFIC_DATE" | "DATE_RANGE" | "MONTH" | "HIJRI_MONTH" | "RECURRING";
        startDate?: string;
        endDate?: string;
        month?: number;
        hijriMonth?: number;
        dayOfWeek?: number[];
    };
    lookbackMonths?: number;
    dynamicQuery?: {
        type: "DATE_SPECIFIC" | "TIME_RANGE" | "COUNT_CONDITION" | "AGGREGATE" | "CUSTOM";
        table: "Attendance" | "LeaveRequest" | "Contract" | "User" | "DisciplinaryCase";
        where: {
            field: string;
            operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "BETWEEN" | "IN";
            value: any;
        }[];
        operation: "COUNT" | "SUM" | "AVG" | "MAX" | "MIN" | "EXISTS";
        targetField?: string;
        description: string;
    };
}
export declare class PolicyParserService {
    private readonly aiService;
    private readonly logger;
    constructor(aiService: AiService);
    parsePolicy(naturalText: string): Promise<ParsedPolicyRule>;
    private detectAndGenerateDynamicQuery;
    validateParsedRule(rule: ParsedPolicyRule): {
        valid: boolean;
        errors: string[];
    };
}
