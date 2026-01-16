declare enum LeaveCategory {
    BALANCED = "BALANCED",
    CASUAL = "CASUAL",
    SICK = "SICK",
    UNPAID = "UNPAID"
}
export declare class EntitlementTierDto {
    minServiceYears: number;
    maxServiceYears: number;
    entitlementDays: number;
}
export declare class SickPayTierDto {
    fromDay: number;
    toDay: number;
    paymentPercent: number;
}
export declare class CreateLeaveTypeConfigDto {
    code: string;
    nameAr: string;
    nameEn?: string;
    description?: string;
    category: LeaveCategory;
    isEntitlementBased?: boolean;
    defaultEntitlement?: number;
    maxBalanceCap?: number;
    allowCarryForward?: boolean;
    maxCarryForwardDays?: number;
    carryForwardExpiryMonths?: number;
    isPaid?: boolean;
    paymentPercentage?: number;
    requiresAttachment?: boolean;
    attachmentRequiredAfterDays?: number;
    minNoticeDays?: number;
    minRequestDays?: number;
    maxRequestDays?: number;
    allowNegativeBalance?: boolean;
    deductFromAnnual?: boolean;
    isOneTimeOnly?: boolean;
    sortOrder?: number;
    entitlementTiers?: EntitlementTierDto[];
    sickPayTiers?: SickPayTierDto[];
}
export declare class UpdateLeaveTypeConfigDto {
    nameAr?: string;
    nameEn?: string;
    description?: string;
    defaultEntitlement?: number;
    maxBalanceCap?: number;
    allowCarryForward?: boolean;
    maxCarryForwardDays?: number;
    isActive?: boolean;
    sortOrder?: number;
}
export {};
