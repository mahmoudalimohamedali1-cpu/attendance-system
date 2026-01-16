export declare enum PolicyType {
    OVERTIME = "OVERTIME",
    LEAVE = "LEAVE",
    DEDUCTION = "DEDUCTION",
    ALLOWANCE = "ALLOWANCE",
    ATTENDANCE = "ATTENDANCE",
    GENERAL = "GENERAL"
}
export declare enum PolicyScope {
    COMPANY = "COMPANY",
    BRANCH = "BRANCH",
    DEPARTMENT = "DEPARTMENT",
    JOB_TITLE = "JOB_TITLE",
    EMPLOYEE = "EMPLOYEE"
}
export declare class CreatePolicyRuleDto {
    code: string;
    nameAr: string;
    conditions?: Record<string, any>;
    valueType: string;
    value: string;
    ruleOrder?: number;
}
export declare class CreatePolicyDto {
    code: string;
    nameAr: string;
    nameEn?: string;
    description?: string;
    type: PolicyType;
    scope: PolicyScope;
    effectiveFrom: string;
    effectiveTo?: string;
    branchId?: string;
    departmentId?: string;
    jobTitleId?: string;
    employeeId?: string;
    settings?: Record<string, any>;
    priority?: number;
    rules?: CreatePolicyRuleDto[];
}
