import { KPIService } from './kpi.service';
import { CreateKPIDefinitionDto, UpdateKPIDefinitionDto, CreateKPIAssignmentDto, BulkCreateKPIAssignmentDto, UpdateKPIAssignmentDto, CreateKPIEntryDto, BulkCreateKPIEntryDto, ImportKPIEntriesDto, GetKPIDefinitionsQueryDto, GetKPIAssignmentsQueryDto, RecalculateAllScoresDto } from './dto';
export declare class KPIController {
    private readonly kpiService;
    constructor(kpiService: KPIService);
    createDefinition(dto: CreateKPIDefinitionDto): Promise<{
        jobFamily: {
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
        } | null;
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        jobFamilyId: string | null;
        code: string;
        nameAr: string | null;
        description: string | null;
        formula: import("@prisma/client/runtime/library").JsonValue | null;
        isActive: boolean;
        sourceType: import(".prisma/client").$Enums.KPISourceType;
        unit: string;
        frequency: import(".prisma/client").$Enums.KPIFrequency;
        thresholds: import("@prisma/client/runtime/library").JsonValue;
    }>;
    getDefinitions(companyId: string, query: GetKPIDefinitionsQueryDto): Promise<({
        _count: {
            assignments: number;
        };
        jobFamily: {
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
        } | null;
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        jobFamilyId: string | null;
        code: string;
        nameAr: string | null;
        description: string | null;
        formula: import("@prisma/client/runtime/library").JsonValue | null;
        isActive: boolean;
        sourceType: import(".prisma/client").$Enums.KPISourceType;
        unit: string;
        frequency: import(".prisma/client").$Enums.KPIFrequency;
        thresholds: import("@prisma/client/runtime/library").JsonValue;
    })[]>;
    getDefinitionById(id: string): Promise<{
        jobFamily: {
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
        } | null;
        assignments: ({
            employee: {
                id: string;
                firstName: string;
                lastName: string;
                employeeCode: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            notes: string | null;
            cycleId: string;
            kpiDefinitionId: string;
            target: import("@prisma/client/runtime/library").Decimal;
            weight: number;
            actualValue: import("@prisma/client/runtime/library").Decimal | null;
            score: import("@prisma/client/runtime/library").Decimal | null;
        })[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        jobFamilyId: string | null;
        code: string;
        nameAr: string | null;
        description: string | null;
        formula: import("@prisma/client/runtime/library").JsonValue | null;
        isActive: boolean;
        sourceType: import(".prisma/client").$Enums.KPISourceType;
        unit: string;
        frequency: import(".prisma/client").$Enums.KPIFrequency;
        thresholds: import("@prisma/client/runtime/library").JsonValue;
    }>;
    updateDefinition(id: string, dto: UpdateKPIDefinitionDto): Promise<{
        jobFamily: {
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
        } | null;
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        jobFamilyId: string | null;
        code: string;
        nameAr: string | null;
        description: string | null;
        formula: import("@prisma/client/runtime/library").JsonValue | null;
        isActive: boolean;
        sourceType: import(".prisma/client").$Enums.KPISourceType;
        unit: string;
        frequency: import(".prisma/client").$Enums.KPIFrequency;
        thresholds: import("@prisma/client/runtime/library").JsonValue;
    }>;
    deleteDefinition(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        jobFamilyId: string | null;
        code: string;
        nameAr: string | null;
        description: string | null;
        formula: import("@prisma/client/runtime/library").JsonValue | null;
        isActive: boolean;
        sourceType: import(".prisma/client").$Enums.KPISourceType;
        unit: string;
        frequency: import(".prisma/client").$Enums.KPIFrequency;
        thresholds: import("@prisma/client/runtime/library").JsonValue;
    }>;
    seedDefaultKPIs(companyId: string): Promise<{
        seeded: number;
        kpis: ({
            jobFamily: {
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
            } | null;
        } & {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            jobFamilyId: string | null;
            code: string;
            nameAr: string | null;
            description: string | null;
            formula: import("@prisma/client/runtime/library").JsonValue | null;
            isActive: boolean;
            sourceType: import(".prisma/client").$Enums.KPISourceType;
            unit: string;
            frequency: import(".prisma/client").$Enums.KPIFrequency;
            thresholds: import("@prisma/client/runtime/library").JsonValue;
        })[];
    }>;
    createAssignment(dto: CreateKPIAssignmentDto): Promise<{
        employee: {
            id: string;
            firstName: string;
            lastName: string;
            employeeCode: string | null;
        };
        kpiDefinition: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            jobFamilyId: string | null;
            code: string;
            nameAr: string | null;
            description: string | null;
            formula: import("@prisma/client/runtime/library").JsonValue | null;
            isActive: boolean;
            sourceType: import(".prisma/client").$Enums.KPISourceType;
            unit: string;
            frequency: import(".prisma/client").$Enums.KPIFrequency;
            thresholds: import("@prisma/client/runtime/library").JsonValue;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        notes: string | null;
        cycleId: string;
        kpiDefinitionId: string;
        target: import("@prisma/client/runtime/library").Decimal;
        weight: number;
        actualValue: import("@prisma/client/runtime/library").Decimal | null;
        score: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    bulkCreateAssignments(dto: BulkCreateKPIAssignmentDto): Promise<{
        created: number;
        failed: number;
        results: ({
            employee: {
                id: string;
                firstName: string;
                lastName: string;
                employeeCode: string | null;
            };
            kpiDefinition: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                companyId: string;
                jobFamilyId: string | null;
                code: string;
                nameAr: string | null;
                description: string | null;
                formula: import("@prisma/client/runtime/library").JsonValue | null;
                isActive: boolean;
                sourceType: import(".prisma/client").$Enums.KPISourceType;
                unit: string;
                frequency: import(".prisma/client").$Enums.KPIFrequency;
                thresholds: import("@prisma/client/runtime/library").JsonValue;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            notes: string | null;
            cycleId: string;
            kpiDefinitionId: string;
            target: import("@prisma/client/runtime/library").Decimal;
            weight: number;
            actualValue: import("@prisma/client/runtime/library").Decimal | null;
            score: import("@prisma/client/runtime/library").Decimal | null;
        })[];
        errors: {
            employeeId: string;
            error: any;
        }[];
    }>;
    getAssignments(query: GetKPIAssignmentsQueryDto): Promise<({
        _count: {
            entries: number;
        };
        employee: {
            id: string;
            firstName: string;
            lastName: string;
            avatar: string | null;
            employeeCode: string | null;
            department: {
                id: string;
                name: string;
            } | null;
        };
        cycle: {
            id: string;
            name: string;
        };
        kpiDefinition: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            jobFamilyId: string | null;
            code: string;
            nameAr: string | null;
            description: string | null;
            formula: import("@prisma/client/runtime/library").JsonValue | null;
            isActive: boolean;
            sourceType: import(".prisma/client").$Enums.KPISourceType;
            unit: string;
            frequency: import(".prisma/client").$Enums.KPIFrequency;
            thresholds: import("@prisma/client/runtime/library").JsonValue;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        notes: string | null;
        cycleId: string;
        kpiDefinitionId: string;
        target: import("@prisma/client/runtime/library").Decimal;
        weight: number;
        actualValue: import("@prisma/client/runtime/library").Decimal | null;
        score: import("@prisma/client/runtime/library").Decimal | null;
    })[]>;
    getAssignmentById(id: string): Promise<{
        employee: {
            id: string;
            firstName: string;
            lastName: string;
            avatar: string | null;
            employeeCode: string | null;
        };
        entries: {
            id: string;
            createdAt: Date;
            notes: string | null;
            value: import("@prisma/client/runtime/library").Decimal;
            assignmentId: string;
            createdBy: string;
            source: string | null;
            periodStart: Date;
            periodEnd: Date;
        }[];
        cycle: {
            id: string;
            name: string;
            nameEn: string | null;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.PerformanceReviewCycleStatus;
            companyId: string;
            type: import(".prisma/client").$Enums.PerformanceReviewCycleType;
            periodStart: Date;
            periodEnd: Date;
            selfReviewStart: Date | null;
            selfReviewEnd: Date | null;
            managerReviewStart: Date | null;
            managerReviewEnd: Date | null;
            feedbackStart: Date | null;
            feedbackEnd: Date | null;
            calibrationStart: Date | null;
            calibrationEnd: Date | null;
            includeSelfReview: boolean;
            include360Feedback: boolean;
            includeGoalRating: boolean;
            includeCompetencyRating: boolean;
            goalWeight: number;
            competencyWeight: number;
            valueWeight: number;
            competencyFrameworkId: string | null;
        };
        kpiDefinition: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            jobFamilyId: string | null;
            code: string;
            nameAr: string | null;
            description: string | null;
            formula: import("@prisma/client/runtime/library").JsonValue | null;
            isActive: boolean;
            sourceType: import(".prisma/client").$Enums.KPISourceType;
            unit: string;
            frequency: import(".prisma/client").$Enums.KPIFrequency;
            thresholds: import("@prisma/client/runtime/library").JsonValue;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        notes: string | null;
        cycleId: string;
        kpiDefinitionId: string;
        target: import("@prisma/client/runtime/library").Decimal;
        weight: number;
        actualValue: import("@prisma/client/runtime/library").Decimal | null;
        score: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    updateAssignment(id: string, dto: UpdateKPIAssignmentDto): Promise<{
        employee: {
            id: string;
            firstName: string;
            lastName: string;
        };
        kpiDefinition: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            jobFamilyId: string | null;
            code: string;
            nameAr: string | null;
            description: string | null;
            formula: import("@prisma/client/runtime/library").JsonValue | null;
            isActive: boolean;
            sourceType: import(".prisma/client").$Enums.KPISourceType;
            unit: string;
            frequency: import(".prisma/client").$Enums.KPIFrequency;
            thresholds: import("@prisma/client/runtime/library").JsonValue;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        notes: string | null;
        cycleId: string;
        kpiDefinitionId: string;
        target: import("@prisma/client/runtime/library").Decimal;
        weight: number;
        actualValue: import("@prisma/client/runtime/library").Decimal | null;
        score: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    deleteAssignment(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        notes: string | null;
        cycleId: string;
        kpiDefinitionId: string;
        target: import("@prisma/client/runtime/library").Decimal;
        weight: number;
        actualValue: import("@prisma/client/runtime/library").Decimal | null;
        score: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    createEntry(dto: CreateKPIEntryDto, req: any): Promise<{
        id: string;
        createdAt: Date;
        notes: string | null;
        value: import("@prisma/client/runtime/library").Decimal;
        assignmentId: string;
        createdBy: string;
        source: string | null;
        periodStart: Date;
        periodEnd: Date;
    }>;
    bulkCreateEntries(dto: BulkCreateKPIEntryDto, req: any): Promise<{
        created: number;
        failed: number;
        results: {
            id: string;
            createdAt: Date;
            notes: string | null;
            value: import("@prisma/client/runtime/library").Decimal;
            assignmentId: string;
            createdBy: string;
            source: string | null;
            periodStart: Date;
            periodEnd: Date;
        }[];
        errors: {
            entry: CreateKPIEntryDto;
            error: any;
        }[];
    }>;
    importEntries(dto: ImportKPIEntriesDto, req: any): Promise<{
        imported: number;
        failed: number;
        results: {
            id: string;
            createdAt: Date;
            notes: string | null;
            value: import("@prisma/client/runtime/library").Decimal;
            assignmentId: string;
            createdBy: string;
            source: string | null;
            periodStart: Date;
            periodEnd: Date;
        }[];
        errors: {
            item: {
                employeeCode?: string;
                employeeId?: string;
                kpiCode: string;
                periodStart: string;
                periodEnd: string;
                value: number;
            };
            error: any;
        }[];
    }>;
    getEntriesForAssignment(assignmentId: string): Promise<{
        id: string;
        createdAt: Date;
        notes: string | null;
        value: import("@prisma/client/runtime/library").Decimal;
        assignmentId: string;
        createdBy: string;
        source: string | null;
        periodStart: Date;
        periodEnd: Date;
    }[]>;
    deleteEntry(id: string): Promise<{
        deleted: boolean;
    }>;
    calculateScore(assignmentId: string): Promise<{
        actualValue: number;
        score: number;
        ratingBand: string;
    }>;
    recalculateAllScores(dto: RecalculateAllScoresDto): Promise<{
        recalculated: number;
        results: {
            actualValue: number;
            score: number;
            ratingBand: string;
            assignmentId: string;
        }[];
    }>;
    getEmployeeSummary(employeeId: string, cycleId?: string): Promise<{
        employeeId: string;
        totalKPIs: number;
        assignmentsWithScores: number;
        averageScore: number;
        ratingBand: string;
        assignments: ({
            _count: {
                entries: number;
            };
            cycle: {
                id: string;
                name: string;
                nameEn: string | null;
                createdAt: Date;
                updatedAt: Date;
                status: import(".prisma/client").$Enums.PerformanceReviewCycleStatus;
                companyId: string;
                type: import(".prisma/client").$Enums.PerformanceReviewCycleType;
                periodStart: Date;
                periodEnd: Date;
                selfReviewStart: Date | null;
                selfReviewEnd: Date | null;
                managerReviewStart: Date | null;
                managerReviewEnd: Date | null;
                feedbackStart: Date | null;
                feedbackEnd: Date | null;
                calibrationStart: Date | null;
                calibrationEnd: Date | null;
                includeSelfReview: boolean;
                include360Feedback: boolean;
                includeGoalRating: boolean;
                includeCompetencyRating: boolean;
                goalWeight: number;
                competencyWeight: number;
                valueWeight: number;
                competencyFrameworkId: string | null;
            };
            kpiDefinition: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                companyId: string;
                jobFamilyId: string | null;
                code: string;
                nameAr: string | null;
                description: string | null;
                formula: import("@prisma/client/runtime/library").JsonValue | null;
                isActive: boolean;
                sourceType: import(".prisma/client").$Enums.KPISourceType;
                unit: string;
                frequency: import(".prisma/client").$Enums.KPIFrequency;
                thresholds: import("@prisma/client/runtime/library").JsonValue;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            notes: string | null;
            cycleId: string;
            kpiDefinitionId: string;
            target: import("@prisma/client/runtime/library").Decimal;
            weight: number;
            actualValue: import("@prisma/client/runtime/library").Decimal | null;
            score: import("@prisma/client/runtime/library").Decimal | null;
        })[];
    }>;
    getCycleOverview(cycleId: string): Promise<{
        cycleId: string;
        totalAssignments: number;
        assignmentsWithScores: number;
        averageScore: number;
        byDepartment: {
            department: string;
            count: number;
            avgScore: number;
        }[];
        byKPI: {
            kpi: string;
            count: number;
            avgScore: number;
        }[];
    }>;
}
