export declare enum CompanyType {
    OPERATIONAL = "OPERATIONAL",
    TECH = "TECH",
    SALES = "SALES",
    CREATIVE = "CREATIVE",
    ADMIN = "ADMIN",
    HYBRID = "HYBRID"
}
export declare enum EvalPhilosophy {
    RESULTS_FIRST = "RESULTS_FIRST",
    BALANCED = "BALANCED",
    CULTURE_FIRST = "CULTURE_FIRST"
}
export interface EnabledModules {
    OKR?: boolean;
    KPI?: boolean;
    COMPETENCY?: boolean;
    FEEDBACK_360?: boolean;
    VALUES?: boolean;
    ATTENDANCE?: boolean;
    DELIVERY?: boolean;
}
export interface ModuleWeights {
    OKR?: number;
    KPI?: number;
    COMPETENCY?: number;
    FEEDBACK_360?: number;
    VALUES?: number;
    ATTENDANCE?: number;
    DELIVERY?: number;
}
export interface EvalPolicies {
    minEvidenceForExceeds?: number;
    allowStretchGoals?: boolean;
    anonymous360?: boolean;
    min360Raters?: number;
    complaintCapEnabled?: boolean;
}
export interface UIConfig {
    primaryWidgets?: string[];
    hide?: string[];
}
export declare class CreateCompanyConfigDto {
    companyId: string;
    companyType?: CompanyType;
    philosophy?: EvalPhilosophy;
    enabledModules?: EnabledModules;
    defaultWeights?: ModuleWeights;
    policies?: EvalPolicies;
    uiConfig?: UIConfig;
}
export declare class UpdateCompanyConfigDto {
    companyType?: CompanyType;
    philosophy?: EvalPhilosophy;
    enabledModules?: EnabledModules;
    defaultWeights?: ModuleWeights;
    policies?: EvalPolicies;
    uiConfig?: UIConfig;
}
export declare const EVALUATION_TEMPLATES: {
    OPERATIONAL: {
        code: string;
        name: string;
        nameAr: string;
        modules: {
            KPI: boolean;
            ATTENDANCE: boolean;
            OKR: boolean;
            COMPETENCY: boolean;
            FEEDBACK_360: boolean;
            VALUES: boolean;
        };
        weights: {
            KPI: number;
            ATTENDANCE: number;
            COMPETENCY: number;
            VALUES: number;
            MANAGER: number;
        };
        policies: {
            minEvidenceForExceeds: number;
            allowStretchGoals: boolean;
        };
        uiConfig: {
            primaryWidgets: string[];
            hide: string[];
        };
    };
    TECH: {
        code: string;
        name: string;
        nameAr: string;
        modules: {
            OKR: boolean;
            COMPETENCY: boolean;
            FEEDBACK_360: boolean;
            VALUES: boolean;
            DELIVERY: boolean;
            ATTENDANCE: boolean;
        };
        weights: {
            OKR: number;
            COMPETENCY: number;
            FEEDBACK_360: number;
            VALUES: number;
            DELIVERY: number;
        };
        policies: {
            minEvidenceForExceeds: number;
            allowStretchGoals: boolean;
            anonymous360: boolean;
        };
        uiConfig: {
            primaryWidgets: string[];
            hide: string[];
        };
    };
    SALES: {
        code: string;
        name: string;
        nameAr: string;
        modules: {
            KPI: boolean;
            OKR: boolean;
            COMPETENCY: boolean;
            FEEDBACK_360: boolean;
            VALUES: boolean;
        };
        weights: {
            KPI: number;
            OKR: number;
            COMPETENCY: number;
            FEEDBACK_360: number;
            VALUES: number;
        };
        policies: {
            minEvidenceForExceeds: number;
            complaintCapEnabled: boolean;
        };
        uiConfig: {
            primaryWidgets: string[];
            hide: never[];
        };
    };
    CREATIVE: {
        code: string;
        name: string;
        nameAr: string;
        modules: {
            OKR: boolean;
            COMPETENCY: boolean;
            FEEDBACK_360: boolean;
            VALUES: boolean;
            DELIVERY: boolean;
        };
        weights: {
            OKR: number;
            COMPETENCY: number;
            FEEDBACK_360: number;
            VALUES: number;
        };
        policies: {
            minEvidenceForExceeds: number;
            allowStretchGoals: boolean;
        };
        uiConfig: {
            primaryWidgets: string[];
            hide: string[];
        };
    };
    ADMIN: {
        code: string;
        name: string;
        nameAr: string;
        modules: {
            KPI: boolean;
            COMPETENCY: boolean;
            VALUES: boolean;
            ATTENDANCE: boolean;
        };
        weights: {
            KPI: number;
            COMPETENCY: number;
            VALUES: number;
            ATTENDANCE: number;
        };
        policies: {
            minEvidenceForExceeds: number;
        };
        uiConfig: {
            primaryWidgets: string[];
            hide: string[];
        };
    };
    HYBRID: {
        code: string;
        name: string;
        nameAr: string;
        modules: {
            OKR: boolean;
            KPI: boolean;
            COMPETENCY: boolean;
            FEEDBACK_360: boolean;
            VALUES: boolean;
        };
        weights: {
            OKR: number;
            KPI: number;
            COMPETENCY: number;
            FEEDBACK_360: number;
            VALUES: number;
        };
        policies: {
            minEvidenceForExceeds: number;
            allowStretchGoals: boolean;
            anonymous360: boolean;
        };
        uiConfig: {
            primaryWidgets: string[];
            hide: never[];
        };
    };
};
