import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateCompanyConfigDto, UpdateCompanyConfigDto, CompanyType } from './dto';
export declare class CompanyConfigService {
    private prisma;
    constructor(prisma: PrismaService);
    getByCompanyId(companyId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        policies: Prisma.JsonValue;
        companyId: string;
        companyType: import(".prisma/client").$Enums.CompanyType;
        philosophy: import(".prisma/client").$Enums.EvalPhilosophy;
        enabledModules: Prisma.JsonValue;
        defaultWeights: Prisma.JsonValue;
        uiConfig: Prisma.JsonValue;
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
    create(dto: CreateCompanyConfigDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        policies: Prisma.JsonValue;
        companyId: string;
        companyType: import(".prisma/client").$Enums.CompanyType;
        philosophy: import(".prisma/client").$Enums.EvalPhilosophy;
        enabledModules: Prisma.JsonValue;
        defaultWeights: Prisma.JsonValue;
        uiConfig: Prisma.JsonValue;
    }>;
    update(companyId: string, dto: UpdateCompanyConfigDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        policies: Prisma.JsonValue;
        companyId: string;
        companyType: import(".prisma/client").$Enums.CompanyType;
        philosophy: import(".prisma/client").$Enums.EvalPhilosophy;
        enabledModules: Prisma.JsonValue;
        defaultWeights: Prisma.JsonValue;
        uiConfig: Prisma.JsonValue;
    }>;
    applyTemplate(companyId: string, companyType: CompanyType): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        policies: Prisma.JsonValue;
        companyId: string;
        companyType: import(".prisma/client").$Enums.CompanyType;
        philosophy: import(".prisma/client").$Enums.EvalPhilosophy;
        enabledModules: Prisma.JsonValue;
        defaultWeights: Prisma.JsonValue;
        uiConfig: Prisma.JsonValue;
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
    getAvailableTemplates(): {
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
    }[];
    private getDefaultConfig;
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
        moduleOverrides: Prisma.JsonValue | null;
        evidenceTypes: Prisma.JsonValue | null;
        competencyModelId: string | null;
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
            weightOverrides: Prisma.JsonValue | null;
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
        moduleOverrides: Prisma.JsonValue | null;
        evidenceTypes: Prisma.JsonValue | null;
        competencyModelId: string | null;
    })[]>;
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
        weightOverrides: Prisma.JsonValue | null;
        minEvidenceRequired: number | null;
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
        weightOverrides: Prisma.JsonValue | null;
        minEvidenceRequired: number | null;
    }[]>;
    seedEvaluationTemplates(): Promise<{
        seeded: number;
        templates: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            policies: Prisma.JsonValue;
            companyId: string | null;
            code: string;
            nameAr: string | null;
            version: number;
            isActive: boolean;
            modules: Prisma.JsonValue;
            isDefault: boolean;
            companyType: import(".prisma/client").$Enums.CompanyType;
            uiConfig: Prisma.JsonValue;
            weights: Prisma.JsonValue;
        }[];
    }>;
}
