declare enum SalaryComponentType {
    EARNING = "EARNING",
    DEDUCTION = "DEDUCTION"
}
declare enum SalaryComponentNature {
    FIXED = "FIXED",
    VARIABLE = "VARIABLE",
    FORMULA = "FORMULA"
}
export declare class CreateSalaryComponentDto {
    code: string;
    nameAr: string;
    nameEn?: string;
    type: SalaryComponentType;
    nature: SalaryComponentNature;
    description?: string;
    gosiEligible?: boolean;
    otEligible?: boolean;
    eosEligible?: boolean;
    isProrated?: boolean;
    formula?: string;
}
export {};
