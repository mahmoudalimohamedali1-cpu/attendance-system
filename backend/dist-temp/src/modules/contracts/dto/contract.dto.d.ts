export declare enum ContractType {
    PERMANENT = "PERMANENT",
    FIXED_TERM = "FIXED_TERM",
    PART_TIME = "PART_TIME",
    SEASONAL = "SEASONAL",
    PROBATION = "PROBATION"
}
export declare enum ContractStatus {
    DRAFT = "DRAFT",
    PENDING_EMPLOYEE = "PENDING_EMPLOYEE",
    PENDING_EMPLOYER = "PENDING_EMPLOYER",
    PENDING_QIWA = "PENDING_QIWA",
    ACTIVE = "ACTIVE",
    EXPIRED = "EXPIRED",
    TERMINATED = "TERMINATED",
    RENEWED = "RENEWED",
    SUSPENDED = "SUSPENDED",
    REJECTED = "REJECTED"
}
export declare enum QiwaAuthStatus {
    NOT_SUBMITTED = "NOT_SUBMITTED",
    PENDING = "PENDING",
    AUTHENTICATED = "AUTHENTICATED",
    REJECTED = "REJECTED",
    EXPIRED = "EXPIRED"
}
export declare class CreateContractDto {
    userId: string;
    contractNumber?: string;
    type: ContractType;
    startDate: string;
    endDate?: string;
    probationEndDate?: string;
    salaryCycle?: string;
    basicSalary?: number;
    housingAllowance?: number;
    transportAllowance?: number;
    otherAllowances?: number;
    contractJobTitle?: string;
    workLocation?: string;
    workingHoursPerWeek?: number;
    annualLeaveDays?: number;
    noticePeriodDays?: number;
    documentUrl?: string;
    additionalTerms?: string;
    notes?: string;
}
export declare class UpdateContractDto {
    type?: ContractType;
    status?: ContractStatus;
    startDate?: string;
    endDate?: string;
    probationEndDate?: string;
    salaryCycle?: string;
    basicSalary?: number;
    housingAllowance?: number;
    transportAllowance?: number;
    otherAllowances?: number;
    contractJobTitle?: string;
    workLocation?: string;
    workingHoursPerWeek?: number;
    annualLeaveDays?: number;
    noticePeriodDays?: number;
    documentUrl?: string;
    additionalTerms?: string;
    notes?: string;
    qiwaContractId?: string;
    qiwaStatus?: QiwaAuthStatus;
}
export declare class TerminateContractDto {
    terminationReason: string;
}
export declare class RenewContractDto {
    newEndDate: string;
    newType?: ContractType;
    newBasicSalary?: number;
}
export declare class SignContractDto {
    signatureNotes?: string;
}
export declare class RejectContractDto {
    rejectionReason: string;
}
export declare class UpdateQiwaStatusDto {
    qiwaContractId?: string;
    qiwaStatus: QiwaAuthStatus;
    rejectReason?: string;
    authDate?: string;
}
