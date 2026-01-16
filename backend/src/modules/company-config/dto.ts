import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

// أنواع الشركات
export enum CompanyType {
    OPERATIONAL = 'OPERATIONAL',
    TECH = 'TECH',
    SALES = 'SALES',
    CREATIVE = 'CREATIVE',
    ADMIN = 'ADMIN',
    HYBRID = 'HYBRID',
}

// فلسفة التقييم
export enum EvalPhilosophy {
    RESULTS_FIRST = 'RESULTS_FIRST',
    BALANCED = 'BALANCED',
    CULTURE_FIRST = 'CULTURE_FIRST',
}

// الوحدات المتاحة
export interface EnabledModules {
    OKR?: boolean;
    KPI?: boolean;
    COMPETENCY?: boolean;
    FEEDBACK_360?: boolean;
    VALUES?: boolean;
    ATTENDANCE?: boolean;
    DELIVERY?: boolean;
}

// الأوزان
export interface ModuleWeights {
    OKR?: number;
    KPI?: number;
    COMPETENCY?: number;
    FEEDBACK_360?: number;
    VALUES?: number;
    ATTENDANCE?: number;
    DELIVERY?: number;
}

// السياسات
export interface EvalPolicies {
    minEvidenceForExceeds?: number;
    allowStretchGoals?: boolean;
    anonymous360?: boolean;
    min360Raters?: number;
    complaintCapEnabled?: boolean;
}

// إعدادات الواجهة
export interface UIConfig {
    primaryWidgets?: string[];
    hide?: string[];
}

export class CreateCompanyConfigDto {
    @IsString()
    companyId: string;

    @IsEnum(CompanyType)
    @IsOptional()
    companyType?: CompanyType = CompanyType.HYBRID;

    @IsEnum(EvalPhilosophy)
    @IsOptional()
    philosophy?: EvalPhilosophy = EvalPhilosophy.BALANCED;

    @IsObject()
    @IsOptional()
    enabledModules?: EnabledModules;

    @IsObject()
    @IsOptional()
    defaultWeights?: ModuleWeights;

    @IsObject()
    @IsOptional()
    policies?: EvalPolicies;

    @IsObject()
    @IsOptional()
    uiConfig?: UIConfig;
}

export class UpdateCompanyConfigDto {
    @IsEnum(CompanyType)
    @IsOptional()
    companyType?: CompanyType;

    @IsEnum(EvalPhilosophy)
    @IsOptional()
    philosophy?: EvalPhilosophy;

    @IsObject()
    @IsOptional()
    enabledModules?: EnabledModules;

    @IsObject()
    @IsOptional()
    defaultWeights?: ModuleWeights;

    @IsObject()
    @IsOptional()
    policies?: EvalPolicies;

    @IsObject()
    @IsOptional()
    uiConfig?: UIConfig;
}

// قوالب التقييم الجاهزة
export const EVALUATION_TEMPLATES = {
    OPERATIONAL: {
        code: 'OPERATIONAL_CORE_V1',
        name: 'Operational Core',
        nameAr: 'القالب التشغيلي',
        modules: { KPI: true, ATTENDANCE: true, OKR: false, COMPETENCY: true, FEEDBACK_360: false, VALUES: true },
        weights: { KPI: 45, ATTENDANCE: 20, COMPETENCY: 20, VALUES: 10, MANAGER: 5 },
        policies: { minEvidenceForExceeds: 1, allowStretchGoals: false },
        uiConfig: { primaryWidgets: ['kpiBoard', 'attendanceCard'], hide: ['okrBuilder', 'peerFeedback'] },
    },
    TECH: {
        code: 'TECH_PRODUCT_V1',
        name: 'Tech Product',
        nameAr: 'القالب التقني',
        modules: { OKR: true, COMPETENCY: true, FEEDBACK_360: true, VALUES: true, DELIVERY: true, ATTENDANCE: false },
        weights: { OKR: 45, COMPETENCY: 25, FEEDBACK_360: 15, VALUES: 10, DELIVERY: 5 },
        policies: { minEvidenceForExceeds: 2, allowStretchGoals: true, anonymous360: true },
        uiConfig: { primaryWidgets: ['okrProgress', 'evidencePanel'], hide: ['attendanceCard'] },
    },
    SALES: {
        code: 'SALES_QUOTA_V1',
        name: 'Sales Quota',
        nameAr: 'قالب المبيعات',
        modules: { KPI: true, OKR: true, COMPETENCY: true, FEEDBACK_360: true, VALUES: true },
        weights: { KPI: 50, OKR: 20, COMPETENCY: 15, FEEDBACK_360: 10, VALUES: 5 },
        policies: { minEvidenceForExceeds: 2, complaintCapEnabled: true },
        uiConfig: { primaryWidgets: ['quotaBoard', 'pipelineOKR'], hide: [] },
    },
    CREATIVE: {
        code: 'CREATIVE_STUDIO_V1',
        name: 'Creative Studio',
        nameAr: 'القالب الإبداعي',
        modules: { OKR: true, COMPETENCY: true, FEEDBACK_360: true, VALUES: true, DELIVERY: true },
        weights: { OKR: 40, COMPETENCY: 30, FEEDBACK_360: 20, VALUES: 10 },
        policies: { minEvidenceForExceeds: 1, allowStretchGoals: true },
        uiConfig: { primaryWidgets: ['projectShowcase', 'feedbackCards'], hide: ['kpiBoard'] },
    },
    ADMIN: {
        code: 'CORPORATE_ADMIN_V1',
        name: 'Corporate Admin',
        nameAr: 'القالب الإداري',
        modules: { KPI: true, COMPETENCY: true, VALUES: true, ATTENDANCE: true },
        weights: { KPI: 40, COMPETENCY: 30, VALUES: 20, ATTENDANCE: 10 },
        policies: { minEvidenceForExceeds: 1 },
        uiConfig: { primaryWidgets: ['processKPI', 'complianceCard'], hide: ['okrBuilder'] },
    },
    HYBRID: {
        code: 'HYBRID_MULTI_V1',
        name: 'Hybrid Multi-Family',
        nameAr: 'القالب المختلط',
        modules: { OKR: true, KPI: true, COMPETENCY: true, FEEDBACK_360: true, VALUES: true },
        weights: { OKR: 30, KPI: 25, COMPETENCY: 25, FEEDBACK_360: 10, VALUES: 10 },
        policies: { minEvidenceForExceeds: 2, allowStretchGoals: true, anonymous360: true },
        uiConfig: { primaryWidgets: ['combinedDashboard'], hide: [] },
    },
};
