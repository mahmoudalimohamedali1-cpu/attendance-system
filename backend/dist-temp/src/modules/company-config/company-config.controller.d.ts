import { CompanyConfigService } from './company-config.service';
import { CreateCompanyConfigDto, UpdateCompanyConfigDto, CompanyType } from './dto';
export declare class CompanyConfigController {
    private readonly service;
    constructor(service: CompanyConfigService);
    getAvailableTemplates(): Promise<{
        type: string;
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
        } | {
            OKR: boolean;
            COMPETENCY: boolean;
            FEEDBACK_360: boolean;
            VALUES: boolean;
            DELIVERY: boolean;
            ATTENDANCE: boolean;
        } | {
            KPI: boolean;
            OKR: boolean;
            COMPETENCY: boolean;
            FEEDBACK_360: boolean;
            VALUES: boolean;
        } | {
            OKR: boolean;
            COMPETENCY: boolean;
            FEEDBACK_360: boolean;
            VALUES: boolean;
            DELIVERY: boolean;
        } | {
            KPI: boolean;
            COMPETENCY: boolean;
            VALUES: boolean;
            ATTENDANCE: boolean;
        } | {
            OKR: boolean;
            KPI: boolean;
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
        } | {
            OKR: number;
            COMPETENCY: number;
            FEEDBACK_360: number;
            VALUES: number;
            DELIVERY: number;
        } | {
            KPI: number;
            OKR: number;
            COMPETENCY: number;
            FEEDBACK_360: number;
            VALUES: number;
        } | {
            OKR: number;
            COMPETENCY: number;
            FEEDBACK_360: number;
            VALUES: number;
        } | {
            KPI: number;
            COMPETENCY: number;
            VALUES: number;
            ATTENDANCE: number;
        } | {
            OKR: number;
            KPI: number;
            COMPETENCY: number;
            FEEDBACK_360: number;
            VALUES: number;
        };
    }[]>;
    seedTemplates(): Promise<{
        seeded: number;
        templates: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            policies: import("@prisma/client/runtime/library").JsonValue;
            companyId: string | null;
            code: string;
            nameAr: string | null;
            version: number;
            isActive: boolean;
            modules: import("@prisma/client/runtime/library").JsonValue;
            isDefault: boolean;
            companyType: import(".prisma/client").$Enums.CompanyType;
            uiConfig: import("@prisma/client/runtime/library").JsonValue;
            weights: import("@prisma/client/runtime/library").JsonValue;
        }[];
    }>;
    getRoleLevels(jobFamilyId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        jobFamilyId: string;
        code: string;
        nameAr: string | null;
        rank: number;
        isManager: boolean;
        weightOverrides: import("@prisma/client/runtime/library").JsonValue | null;
        minEvidenceRequired: number | null;
    }[]>;
    createRoleLevel(jobFamilyId: string, data: {
        code: string;
        name: string;
        nameAr?: string;
        rank: number;
        isManager?: boolean;
        weightOverrides?: Record<string, number>;
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        jobFamilyId: string;
        code: string;
        nameAr: string | null;
        rank: number;
        isManager: boolean;
        weightOverrides: import("@prisma/client/runtime/library").JsonValue | null;
        minEvidenceRequired: number | null;
    }>;
    getConfig(companyId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        policies: import("@prisma/client/runtime/library").JsonValue;
        companyId: string;
        companyType: import(".prisma/client").$Enums.CompanyType;
        philosophy: import(".prisma/client").$Enums.EvalPhilosophy;
        enabledModules: import("@prisma/client/runtime/library").JsonValue;
        defaultWeights: import("@prisma/client/runtime/library").JsonValue;
        uiConfig: import("@prisma/client/runtime/library").JsonValue;
    } | {
        id: null;
        companyId: string;
        companyType: string;
        philosophy: string;
        enabledModules: {
            OKR: boolean;
            KPI: boolean;
            COMPETENCY: boolean;
            FEEDBACK_360: boolean;
            VALUES: boolean;
        };
        defaultWeights: {
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
        createdAt: null;
        updatedAt: null;
    }>;
    createConfig(dto: CreateCompanyConfigDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        policies: import("@prisma/client/runtime/library").JsonValue;
        companyId: string;
        companyType: import(".prisma/client").$Enums.CompanyType;
        philosophy: import(".prisma/client").$Enums.EvalPhilosophy;
        enabledModules: import("@prisma/client/runtime/library").JsonValue;
        defaultWeights: import("@prisma/client/runtime/library").JsonValue;
        uiConfig: import("@prisma/client/runtime/library").JsonValue;
    }>;
    updateConfig(companyId: string, dto: UpdateCompanyConfigDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        policies: import("@prisma/client/runtime/library").JsonValue;
        companyId: string;
        companyType: import(".prisma/client").$Enums.CompanyType;
        philosophy: import(".prisma/client").$Enums.EvalPhilosophy;
        enabledModules: import("@prisma/client/runtime/library").JsonValue;
        defaultWeights: import("@prisma/client/runtime/library").JsonValue;
        uiConfig: import("@prisma/client/runtime/library").JsonValue;
    }>;
    applyTemplate(companyId: string, companyType: CompanyType): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        policies: import("@prisma/client/runtime/library").JsonValue;
        companyId: string;
        companyType: import(".prisma/client").$Enums.CompanyType;
        philosophy: import(".prisma/client").$Enums.EvalPhilosophy;
        enabledModules: import("@prisma/client/runtime/library").JsonValue;
        defaultWeights: import("@prisma/client/runtime/library").JsonValue;
        uiConfig: import("@prisma/client/runtime/library").JsonValue;
    }>;
    getEmployeeBlueprint(companyId: string, employeeId: string, cycleId?: string): Promise<{
        modules: Record<string, boolean>;
        weights: Record<string, number>;
        policies: Record<string, unknown>;
        ui: Record<string, unknown>;
        employeeId: string;
        companyType: string;
        philosophy: string;
    }>;
    getJobFamilies(companyId: string): Promise<({
        roleLevels: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            jobFamilyId: string;
            code: string;
            nameAr: string | null;
            rank: number;
            isManager: boolean;
            weightOverrides: import("@prisma/client/runtime/library").JsonValue | null;
            minEvidenceRequired: number | null;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        code: string;
        nameAr: string | null;
        moduleOverrides: import("@prisma/client/runtime/library").JsonValue | null;
        evidenceTypes: import("@prisma/client/runtime/library").JsonValue | null;
        competencyModelId: string | null;
    })[]>;
    createJobFamily(companyId: string, data: {
        code: string;
        name: string;
        nameAr?: string;
        moduleOverrides?: Record<string, boolean>;
        evidenceTypes?: string[];
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        code: string;
        nameAr: string | null;
        moduleOverrides: import("@prisma/client/runtime/library").JsonValue | null;
        evidenceTypes: import("@prisma/client/runtime/library").JsonValue | null;
        competencyModelId: string | null;
    }>;
}
