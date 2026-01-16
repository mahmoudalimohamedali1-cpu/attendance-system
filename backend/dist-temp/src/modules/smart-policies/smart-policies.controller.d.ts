import { SmartPoliciesService, CreateSmartPolicyDto, UpdateSmartPolicyDto } from './smart-policies.service';
import { AiSchemaGeneratorService } from './ai-schema-generator.service';
import { AiCodeGeneratorService } from './ai-code-generator.service';
import { SchemaDiscoveryService } from './schema-discovery.service';
import { PolicyVersioningService } from './policy-versioning.service';
import { PolicyApprovalService } from './policy-approval.service';
import { PolicySimulationService } from './policy-simulation.service';
import { PolicyConflictService } from './policy-conflict.service';
import { PolicyAuditService } from './policy-audit.service';
import { PolicyExceptionService, CreatePolicyExceptionDto } from './policy-exception.service';
import { RetroactivePolicyService } from './retroactive-policy.service';
import { TieredPenaltyService } from './tiered-penalty.service';
import { PayrollProtectionService } from './payroll-protection.service';
import { PolicyAnalyticsService } from './policy-analytics.service';
import { PolicyTemplatesService } from './policy-templates.service';
import { PolicyCoachService } from './policy-coach.service';
import { SmartPolicyStatus, SmartPolicyTrigger } from '@prisma/client';
export declare class SmartPoliciesController {
    private readonly service;
    private readonly schemaGenerator;
    private readonly codeGenerator;
    private readonly schemaDiscovery;
    private readonly versioningService;
    private readonly approvalService;
    private readonly simulationService;
    private readonly conflictService;
    private readonly auditService;
    private readonly exceptionService;
    private readonly retroService;
    private readonly tieredPenaltyService;
    private readonly payrollProtection;
    private readonly analyticsService;
    private readonly templatesService;
    private readonly coachService;
    constructor(service: SmartPoliciesService, schemaGenerator: AiSchemaGeneratorService, codeGenerator: AiCodeGeneratorService, schemaDiscovery: SchemaDiscoveryService, versioningService: PolicyVersioningService, approvalService: PolicyApprovalService, simulationService: PolicySimulationService, conflictService: PolicyConflictService, auditService: PolicyAuditService, exceptionService: PolicyExceptionService, retroService: RetroactivePolicyService, tieredPenaltyService: TieredPenaltyService, payrollProtection: PayrollProtectionService, analyticsService: PolicyAnalyticsService, templatesService: PolicyTemplatesService, coachService: PolicyCoachService);
    analyzeSchema(body: {
        text: string;
    }): Promise<{
        missingFields: import("./ai-schema-generator.service").MissingField[];
        suggestedModels: import("./ai-schema-generator.service").GeneratedModel[];
        canExecute: boolean;
        success: boolean;
    }>;
    autoExtend(body: {
        text: string;
        confirm?: boolean;
    }): Promise<{
        success: boolean;
        message: string;
        needsExtension: boolean;
        missingFields?: undefined;
        suggestedModels?: undefined;
        extended?: undefined;
        addedModels?: undefined;
        frontendPages?: undefined;
        errors?: undefined;
    } | {
        success: boolean;
        needsExtension: boolean;
        message: string;
        missingFields: import("./ai-schema-generator.service").MissingField[];
        suggestedModels: {
            name: string;
            fields: {
                name: string;
                type: string;
                description: string;
            }[];
        }[];
        extended?: undefined;
        addedModels?: undefined;
        frontendPages?: undefined;
        errors?: undefined;
    } | {
        success: boolean;
        needsExtension: boolean;
        extended: boolean;
        addedModels: string[];
        frontendPages: string[];
        errors: string[] | undefined;
        message: string;
        missingFields?: undefined;
        suggestedModels?: undefined;
    }>;
    getAvailableFields(): Promise<{
        success: boolean;
        data: {
            category: string;
            fields: string[];
        }[];
    }>;
    getApprovalQueue(user: any): Promise<{
        data: {
            id: string;
            name: string;
            originalText: string;
            triggerEvent: import(".prisma/client").$Enums.SmartPolicyTrigger;
            priority: number;
            currentVersion: number;
            submittedBy: string;
            submittedAt: Date;
            requiredLevel: string;
        }[];
        total: number;
        success: boolean;
    }>;
    analyze(body: {
        text: string;
    }): Promise<{
        success: boolean;
        parsedRule: import("../ai/services/policy-parser.service").ParsedPolicyRule;
    }>;
    quickCreate(body: {
        text: string;
    }, user: any): Promise<{
        created: boolean;
        policies: {
            id: string;
            name: string | null;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.SmartPolicyStatus;
            companyId: string;
            description: string | null;
            isActive: boolean;
            priority: number;
            effectiveFrom: Date | null;
            effectiveTo: Date | null;
            createdById: string | null;
            requiresApproval: boolean;
            conditions: import("@prisma/client/runtime/library").JsonValue;
            approvedAt: Date | null;
            approvedById: string | null;
            originalText: string;
            triggerEvent: import(".prisma/client").$Enums.SmartPolicyTrigger;
            triggerSubEvent: string | null;
            parsedRule: import("@prisma/client/runtime/library").JsonValue;
            actions: import("@prisma/client/runtime/library").JsonValue;
            conditionLogic: string;
            lookbackMonths: number | null;
            scopeType: string;
            scopeId: string | null;
            scopeName: string | null;
            aiExplanation: string | null;
            clarificationNeeded: string | null;
            executionCount: number;
            lastExecutedAt: Date | null;
            totalAmountPaid: import("@prisma/client/runtime/library").Decimal;
            totalAmountDeduct: import("@prisma/client/runtime/library").Decimal;
            currentVersion: number;
            executionOrder: number;
            executionGroup: string | null;
            dependsOnPolicies: string[];
            blockLowerPriority: boolean;
        }[];
        message: string;
        count?: undefined;
        warning?: undefined;
        missingFields?: undefined;
        availableFields?: undefined;
        parsedRule?: undefined;
        success: boolean;
    } | {
        created: boolean;
        policies: {
            id: string;
            name: string | null;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.SmartPolicyStatus;
            companyId: string;
            description: string | null;
            isActive: boolean;
            priority: number;
            effectiveFrom: Date | null;
            effectiveTo: Date | null;
            createdById: string | null;
            requiresApproval: boolean;
            conditions: import("@prisma/client/runtime/library").JsonValue;
            approvedAt: Date | null;
            approvedById: string | null;
            originalText: string;
            triggerEvent: import(".prisma/client").$Enums.SmartPolicyTrigger;
            triggerSubEvent: string | null;
            parsedRule: import("@prisma/client/runtime/library").JsonValue;
            actions: import("@prisma/client/runtime/library").JsonValue;
            conditionLogic: string;
            lookbackMonths: number | null;
            scopeType: string;
            scopeId: string | null;
            scopeName: string | null;
            aiExplanation: string | null;
            clarificationNeeded: string | null;
            executionCount: number;
            lastExecutedAt: Date | null;
            totalAmountPaid: import("@prisma/client/runtime/library").Decimal;
            totalAmountDeduct: import("@prisma/client/runtime/library").Decimal;
            currentVersion: number;
            executionOrder: number;
            executionGroup: string | null;
            dependsOnPolicies: string[];
            blockLowerPriority: boolean;
        }[];
        count: number;
        message: string;
        warning: string | undefined;
        missingFields: string[] | undefined;
        availableFields: string[];
        parsedRule: import("../ai/services/policy-parser.service").ParsedPolicyRule;
        success: boolean;
    }>;
    create(dto: CreateSmartPolicyDto, user: any): Promise<{
        success: boolean;
        data: {
            id: string;
            name: string | null;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.SmartPolicyStatus;
            companyId: string;
            description: string | null;
            isActive: boolean;
            priority: number;
            effectiveFrom: Date | null;
            effectiveTo: Date | null;
            createdById: string | null;
            requiresApproval: boolean;
            conditions: import("@prisma/client/runtime/library").JsonValue;
            approvedAt: Date | null;
            approvedById: string | null;
            originalText: string;
            triggerEvent: import(".prisma/client").$Enums.SmartPolicyTrigger;
            triggerSubEvent: string | null;
            parsedRule: import("@prisma/client/runtime/library").JsonValue;
            actions: import("@prisma/client/runtime/library").JsonValue;
            conditionLogic: string;
            lookbackMonths: number | null;
            scopeType: string;
            scopeId: string | null;
            scopeName: string | null;
            aiExplanation: string | null;
            clarificationNeeded: string | null;
            executionCount: number;
            lastExecutedAt: Date | null;
            totalAmountPaid: import("@prisma/client/runtime/library").Decimal;
            totalAmountDeduct: import("@prisma/client/runtime/library").Decimal;
            currentVersion: number;
            executionOrder: number;
            executionGroup: string | null;
            dependsOnPolicies: string[];
            blockLowerPriority: boolean;
        };
    }>;
    findAll(user: any, status?: SmartPolicyStatus, triggerEvent?: SmartPolicyTrigger, isActive?: string, page?: string, limit?: string): Promise<{
        data: {
            id: string;
            name: string | null;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.SmartPolicyStatus;
            companyId: string;
            description: string | null;
            isActive: boolean;
            priority: number;
            effectiveFrom: Date | null;
            effectiveTo: Date | null;
            createdById: string | null;
            requiresApproval: boolean;
            conditions: import("@prisma/client/runtime/library").JsonValue;
            approvedAt: Date | null;
            approvedById: string | null;
            originalText: string;
            triggerEvent: import(".prisma/client").$Enums.SmartPolicyTrigger;
            triggerSubEvent: string | null;
            parsedRule: import("@prisma/client/runtime/library").JsonValue;
            actions: import("@prisma/client/runtime/library").JsonValue;
            conditionLogic: string;
            lookbackMonths: number | null;
            scopeType: string;
            scopeId: string | null;
            scopeName: string | null;
            aiExplanation: string | null;
            clarificationNeeded: string | null;
            executionCount: number;
            lastExecutedAt: Date | null;
            totalAmountPaid: import("@prisma/client/runtime/library").Decimal;
            totalAmountDeduct: import("@prisma/client/runtime/library").Decimal;
            currentVersion: number;
            executionOrder: number;
            executionGroup: string | null;
            dependsOnPolicies: string[];
            blockLowerPriority: boolean;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    findOne(id: string): Promise<{
        success: boolean;
        data: {
            executions: {
                id: string;
                payrollPeriod: string | null;
                employeeId: string;
                triggerEvent: string;
                triggerSubEvent: string | null;
                employeeName: string;
                triggerData: import("@prisma/client/runtime/library").JsonValue | null;
                conditionsMet: boolean;
                conditionsLog: import("@prisma/client/runtime/library").JsonValue | null;
                actionType: string | null;
                actionValue: import("@prisma/client/runtime/library").Decimal | null;
                actionResult: import("@prisma/client/runtime/library").JsonValue | null;
                isSuccess: boolean;
                errorMessage: string | null;
                executedAt: Date;
                policyId: string;
            }[];
        } & {
            id: string;
            name: string | null;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.SmartPolicyStatus;
            companyId: string;
            description: string | null;
            isActive: boolean;
            priority: number;
            effectiveFrom: Date | null;
            effectiveTo: Date | null;
            createdById: string | null;
            requiresApproval: boolean;
            conditions: import("@prisma/client/runtime/library").JsonValue;
            approvedAt: Date | null;
            approvedById: string | null;
            originalText: string;
            triggerEvent: import(".prisma/client").$Enums.SmartPolicyTrigger;
            triggerSubEvent: string | null;
            parsedRule: import("@prisma/client/runtime/library").JsonValue;
            actions: import("@prisma/client/runtime/library").JsonValue;
            conditionLogic: string;
            lookbackMonths: number | null;
            scopeType: string;
            scopeId: string | null;
            scopeName: string | null;
            aiExplanation: string | null;
            clarificationNeeded: string | null;
            executionCount: number;
            lastExecutedAt: Date | null;
            totalAmountPaid: import("@prisma/client/runtime/library").Decimal;
            totalAmountDeduct: import("@prisma/client/runtime/library").Decimal;
            currentVersion: number;
            executionOrder: number;
            executionGroup: string | null;
            dependsOnPolicies: string[];
            blockLowerPriority: boolean;
        };
    }>;
    update(id: string, dto: UpdateSmartPolicyDto, user: any): Promise<{
        success: boolean;
        data: {
            id: string;
            name: string | null;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.SmartPolicyStatus;
            companyId: string;
            description: string | null;
            isActive: boolean;
            priority: number;
            effectiveFrom: Date | null;
            effectiveTo: Date | null;
            createdById: string | null;
            requiresApproval: boolean;
            conditions: import("@prisma/client/runtime/library").JsonValue;
            approvedAt: Date | null;
            approvedById: string | null;
            originalText: string;
            triggerEvent: import(".prisma/client").$Enums.SmartPolicyTrigger;
            triggerSubEvent: string | null;
            parsedRule: import("@prisma/client/runtime/library").JsonValue;
            actions: import("@prisma/client/runtime/library").JsonValue;
            conditionLogic: string;
            lookbackMonths: number | null;
            scopeType: string;
            scopeId: string | null;
            scopeName: string | null;
            aiExplanation: string | null;
            clarificationNeeded: string | null;
            executionCount: number;
            lastExecutedAt: Date | null;
            totalAmountPaid: import("@prisma/client/runtime/library").Decimal;
            totalAmountDeduct: import("@prisma/client/runtime/library").Decimal;
            currentVersion: number;
            executionOrder: number;
            executionGroup: string | null;
            dependsOnPolicies: string[];
            blockLowerPriority: boolean;
        };
    }>;
    delete(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    activate(id: string, user: any): Promise<{
        success: boolean;
        data: {
            id: string;
            name: string | null;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.SmartPolicyStatus;
            companyId: string;
            description: string | null;
            isActive: boolean;
            priority: number;
            effectiveFrom: Date | null;
            effectiveTo: Date | null;
            createdById: string | null;
            requiresApproval: boolean;
            conditions: import("@prisma/client/runtime/library").JsonValue;
            approvedAt: Date | null;
            approvedById: string | null;
            originalText: string;
            triggerEvent: import(".prisma/client").$Enums.SmartPolicyTrigger;
            triggerSubEvent: string | null;
            parsedRule: import("@prisma/client/runtime/library").JsonValue;
            actions: import("@prisma/client/runtime/library").JsonValue;
            conditionLogic: string;
            lookbackMonths: number | null;
            scopeType: string;
            scopeId: string | null;
            scopeName: string | null;
            aiExplanation: string | null;
            clarificationNeeded: string | null;
            executionCount: number;
            lastExecutedAt: Date | null;
            totalAmountPaid: import("@prisma/client/runtime/library").Decimal;
            totalAmountDeduct: import("@prisma/client/runtime/library").Decimal;
            currentVersion: number;
            executionOrder: number;
            executionGroup: string | null;
            dependsOnPolicies: string[];
            blockLowerPriority: boolean;
        };
        message: string;
    }>;
    deactivate(id: string, user: any): Promise<{
        success: boolean;
        data: {
            id: string;
            name: string | null;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.SmartPolicyStatus;
            companyId: string;
            description: string | null;
            isActive: boolean;
            priority: number;
            effectiveFrom: Date | null;
            effectiveTo: Date | null;
            createdById: string | null;
            requiresApproval: boolean;
            conditions: import("@prisma/client/runtime/library").JsonValue;
            approvedAt: Date | null;
            approvedById: string | null;
            originalText: string;
            triggerEvent: import(".prisma/client").$Enums.SmartPolicyTrigger;
            triggerSubEvent: string | null;
            parsedRule: import("@prisma/client/runtime/library").JsonValue;
            actions: import("@prisma/client/runtime/library").JsonValue;
            conditionLogic: string;
            lookbackMonths: number | null;
            scopeType: string;
            scopeId: string | null;
            scopeName: string | null;
            aiExplanation: string | null;
            clarificationNeeded: string | null;
            executionCount: number;
            lastExecutedAt: Date | null;
            totalAmountPaid: import("@prisma/client/runtime/library").Decimal;
            totalAmountDeduct: import("@prisma/client/runtime/library").Decimal;
            currentVersion: number;
            executionOrder: number;
            executionGroup: string | null;
            dependsOnPolicies: string[];
            blockLowerPriority: boolean;
        };
        message: string;
    }>;
    getVersionHistory(id: string, page?: string, limit?: string): Promise<{
        data: {
            id: string;
            createdAt: Date;
            version: number;
            conditions: import("@prisma/client/runtime/library").JsonValue;
            originalText: string;
            parsedRule: import("@prisma/client/runtime/library").JsonValue;
            actions: import("@prisma/client/runtime/library").JsonValue;
            policyId: string;
            changeReason: string | null;
            changedBy: string;
            changedByName: string;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
        success: boolean;
    }>;
    getVersion(id: string, version: string): Promise<{
        success: boolean;
        data: {
            id: string;
            createdAt: Date;
            version: number;
            conditions: import("@prisma/client/runtime/library").JsonValue;
            originalText: string;
            parsedRule: import("@prisma/client/runtime/library").JsonValue;
            actions: import("@prisma/client/runtime/library").JsonValue;
            policyId: string;
            changeReason: string | null;
            changedBy: string;
            changedByName: string;
        };
    }>;
    revertToVersion(id: string, version: string, user: any): Promise<{
        success: boolean;
        data: {
            id: string;
            name: string | null;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.SmartPolicyStatus;
            companyId: string;
            description: string | null;
            isActive: boolean;
            priority: number;
            effectiveFrom: Date | null;
            effectiveTo: Date | null;
            createdById: string | null;
            requiresApproval: boolean;
            conditions: import("@prisma/client/runtime/library").JsonValue;
            approvedAt: Date | null;
            approvedById: string | null;
            originalText: string;
            triggerEvent: import(".prisma/client").$Enums.SmartPolicyTrigger;
            triggerSubEvent: string | null;
            parsedRule: import("@prisma/client/runtime/library").JsonValue;
            actions: import("@prisma/client/runtime/library").JsonValue;
            conditionLogic: string;
            lookbackMonths: number | null;
            scopeType: string;
            scopeId: string | null;
            scopeName: string | null;
            aiExplanation: string | null;
            clarificationNeeded: string | null;
            executionCount: number;
            lastExecutedAt: Date | null;
            totalAmountPaid: import("@prisma/client/runtime/library").Decimal;
            totalAmountDeduct: import("@prisma/client/runtime/library").Decimal;
            currentVersion: number;
            executionOrder: number;
            executionGroup: string | null;
            dependsOnPolicies: string[];
            blockLowerPriority: boolean;
        };
        message: string;
    }>;
    submitForApproval(id: string, body: {
        notes?: string;
    }, user: any): Promise<{
        approval: {
            id: string;
            createdAt: Date;
            action: import(".prisma/client").$Enums.PolicyApprovalAction;
            policyId: string;
            rejectionReason: string | null;
            submittedBy: string;
            submittedByName: string;
            submittedAt: Date;
            requiredLevel: string;
            actionBy: string | null;
            actionByName: string | null;
            actionAt: Date | null;
            actionNotes: string | null;
            policyVersion: number;
        };
        message: string;
        success: boolean;
    }>;
    approve(id: string, body: {
        notes?: string;
        activateNow?: boolean;
    }, user: any): Promise<{
        policy: {
            id: string;
            name: string | null;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.SmartPolicyStatus;
            companyId: string;
            description: string | null;
            isActive: boolean;
            priority: number;
            effectiveFrom: Date | null;
            effectiveTo: Date | null;
            createdById: string | null;
            requiresApproval: boolean;
            conditions: import("@prisma/client/runtime/library").JsonValue;
            approvedAt: Date | null;
            approvedById: string | null;
            originalText: string;
            triggerEvent: import(".prisma/client").$Enums.SmartPolicyTrigger;
            triggerSubEvent: string | null;
            parsedRule: import("@prisma/client/runtime/library").JsonValue;
            actions: import("@prisma/client/runtime/library").JsonValue;
            conditionLogic: string;
            lookbackMonths: number | null;
            scopeType: string;
            scopeId: string | null;
            scopeName: string | null;
            aiExplanation: string | null;
            clarificationNeeded: string | null;
            executionCount: number;
            lastExecutedAt: Date | null;
            totalAmountPaid: import("@prisma/client/runtime/library").Decimal;
            totalAmountDeduct: import("@prisma/client/runtime/library").Decimal;
            currentVersion: number;
            executionOrder: number;
            executionGroup: string | null;
            dependsOnPolicies: string[];
            blockLowerPriority: boolean;
        };
        message: string;
        success: boolean;
    }>;
    reject(id: string, body: {
        reason: string;
    }, user: any): Promise<{
        message: string;
        reason: string;
        success: boolean;
    }>;
    getApprovalHistory(id: string): Promise<{
        data: {
            id: string;
            createdAt: Date;
            action: import(".prisma/client").$Enums.PolicyApprovalAction;
            policyId: string;
            rejectionReason: string | null;
            submittedBy: string;
            submittedByName: string;
            submittedAt: Date;
            requiredLevel: string;
            actionBy: string | null;
            actionByName: string | null;
            actionAt: Date | null;
            actionNotes: string | null;
            policyVersion: number;
        }[];
        total: number;
        success: boolean;
    }>;
    simulate(id: string, body: {
        period: string;
        employeeIds?: string[];
    }, user: any): Promise<{
        results: import("./policy-simulation.service").EmployeeSimulationResult[];
        summary: {
            totalEmployees: number;
            affectedEmployees: number;
            totalAdditions: number;
            totalDeductions: number;
        };
        success: boolean;
    }>;
    getSimulationHistory(id: string, page?: string, limit?: string): Promise<{
        data: {
            id: string;
            createdAt: Date;
            totalDeductions: import("@prisma/client/runtime/library").Decimal;
            simulatedByName: string;
            simulationPeriod: string;
            totalEmployeesAffected: number;
            totalAdditions: import("@prisma/client/runtime/library").Decimal;
            executionTimeMs: number | null;
            warningsCount: number;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
        success: boolean;
    }>;
    detectConflicts(id: string): Promise<{
        hasConflicts: boolean;
        conflictingPolicies: Array<{
            id: string;
            name: string;
            triggerEvent: string;
            conflictType: "SAME_TRIGGER" | "OVERLAPPING_CONDITIONS" | "CONTRADICTING_ACTIONS";
            severity: "LOW" | "MEDIUM" | "HIGH";
            description: string;
        }>;
        warnings: string[];
        success: boolean;
    }>;
    canActivate(id: string): Promise<{
        canActivate: boolean;
        warnings: string[];
        blockingConflicts: string[];
        success: boolean;
    }>;
    getConflictMatrix(user: any): Promise<{
        policies: Array<{
            id: string;
            name: string;
            triggerEvent: string;
        }>;
        conflicts: Array<{
            policy1Id: string;
            policy2Id: string;
            conflictType: string;
            severity: string;
        }>;
        success: boolean;
    }>;
    getAuditLog(id: string, page?: string, limit?: string): Promise<{
        data: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
        success: boolean;
    }>;
    getCompanyAuditLog(user: any, page?: string, limit?: string): Promise<{
        data: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
        success: boolean;
    }>;
    getStats(user: any): Promise<{
        success: boolean;
        data: {
            total: number;
            active: number;
            draft: number;
            paused: number;
            pending: number;
        };
    }>;
    createException(id: string, dto: Omit<CreatePolicyExceptionDto, 'policyId'>, user: any): Promise<{
        success: boolean;
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            isActive: boolean;
            reason: string | null;
            policyId: string;
            createdBy: string;
            exceptionType: string;
            targetId: string;
            targetName: string;
            exceptionFrom: Date | null;
            exceptionTo: Date | null;
            createdByName: string;
        };
    }>;
    getExceptions(id: string): Promise<{
        success: boolean;
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            isActive: boolean;
            reason: string | null;
            policyId: string;
            createdBy: string;
            exceptionType: string;
            targetId: string;
            targetName: string;
            exceptionFrom: Date | null;
            exceptionTo: Date | null;
            createdByName: string;
        }[];
    }>;
    deleteException(exceptionId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getExceptionStats(id: string): Promise<{
        success: boolean;
        data: {
            total: number;
            active: number;
            inactive: number;
            byType: {
                EMPLOYEE: number;
                DEPARTMENT: number;
                BRANCH: number;
                JOB_TITLE: number;
            };
            permanent: number;
            temporary: number;
        };
    }>;
    createRetroApplication(id: string, body: {
        startPeriod: string;
        endPeriod: string;
        notes?: string;
    }, user: any): Promise<{
        success: boolean;
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.RetroApplicationStatus;
            companyId: string;
            totalDeductions: import("@prisma/client/runtime/library").Decimal;
            notes: string | null;
            approvedAt: Date | null;
            policyId: string;
            approvedBy: string | null;
            reviewedAt: Date | null;
            reviewedBy: string | null;
            appliedAt: Date | null;
            results: import("@prisma/client/runtime/library").JsonValue;
            totalEmployeesAffected: number;
            totalAdditions: import("@prisma/client/runtime/library").Decimal;
            startPeriod: string;
            endPeriod: string;
            periods: string[];
            netAmount: import("@prisma/client/runtime/library").Decimal;
            requestedBy: string;
            requestedByName: string;
            requestedAt: Date;
            reviewedByName: string | null;
            approvedByName: string | null;
            appliedToPayrollPeriod: string | null;
        };
    }>;
    calculateRetroApplication(appId: string): Promise<{
        success: boolean;
        data: {
            summary: {
                totalEmployees: number;
                totalAdditions: number;
                totalDeductions: number;
                netAmount: number;
            };
            results: import("./retroactive-policy.service").EmployeeRetroResult[];
        };
    }>;
    approveRetroApplication(appId: string, user: any): Promise<{
        success: boolean;
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.RetroApplicationStatus;
            companyId: string;
            totalDeductions: import("@prisma/client/runtime/library").Decimal;
            notes: string | null;
            approvedAt: Date | null;
            policyId: string;
            approvedBy: string | null;
            reviewedAt: Date | null;
            reviewedBy: string | null;
            appliedAt: Date | null;
            results: import("@prisma/client/runtime/library").JsonValue;
            totalEmployeesAffected: number;
            totalAdditions: import("@prisma/client/runtime/library").Decimal;
            startPeriod: string;
            endPeriod: string;
            periods: string[];
            netAmount: import("@prisma/client/runtime/library").Decimal;
            requestedBy: string;
            requestedByName: string;
            requestedAt: Date;
            reviewedByName: string | null;
            approvedByName: string | null;
            appliedToPayrollPeriod: string | null;
        };
    }>;
    applyRetroApplication(appId: string, body: {
        targetPayrollPeriod: string;
    }): Promise<{
        success: boolean;
        data: {
            retroPayRecords: number;
            totalAmount: number;
        };
    }>;
    getRetroApplications(user: any): Promise<{
        success: boolean;
        data: ({
            policy: {
                id: string;
                name: string | null;
                originalText: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.RetroApplicationStatus;
            companyId: string;
            totalDeductions: import("@prisma/client/runtime/library").Decimal;
            notes: string | null;
            approvedAt: Date | null;
            policyId: string;
            approvedBy: string | null;
            reviewedAt: Date | null;
            reviewedBy: string | null;
            appliedAt: Date | null;
            results: import("@prisma/client/runtime/library").JsonValue;
            totalEmployeesAffected: number;
            totalAdditions: import("@prisma/client/runtime/library").Decimal;
            startPeriod: string;
            endPeriod: string;
            periods: string[];
            netAmount: import("@prisma/client/runtime/library").Decimal;
            requestedBy: string;
            requestedByName: string;
            requestedAt: Date;
            reviewedByName: string | null;
            approvedByName: string | null;
            appliedToPayrollPeriod: string | null;
        })[];
    }>;
    getPolicyRetroApplications(id: string): Promise<{
        success: boolean;
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.RetroApplicationStatus;
            companyId: string;
            totalDeductions: import("@prisma/client/runtime/library").Decimal;
            notes: string | null;
            approvedAt: Date | null;
            policyId: string;
            approvedBy: string | null;
            reviewedAt: Date | null;
            reviewedBy: string | null;
            appliedAt: Date | null;
            results: import("@prisma/client/runtime/library").JsonValue;
            totalEmployeesAffected: number;
            totalAdditions: import("@prisma/client/runtime/library").Decimal;
            startPeriod: string;
            endPeriod: string;
            periods: string[];
            netAmount: import("@prisma/client/runtime/library").Decimal;
            requestedBy: string;
            requestedByName: string;
            requestedAt: Date;
            reviewedByName: string | null;
            approvedByName: string | null;
            appliedToPayrollPeriod: string | null;
        }[];
    }>;
    getOccurrenceStats(id: string): Promise<{
        success: boolean;
        data: {
            totalTrackers: number;
            totalOccurrences: number;
            byType: Record<string, {
                count: number;
                employees: number;
            }>;
            topOffenders: {
                employeeId: string;
                count: number;
                type: string;
            }[];
        };
    }>;
    resetOccurrences(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getEmployeeOccurrences(employeeId: string): Promise<{
        success: boolean;
        data: ({
            policy: {
                id: string;
                name: string | null;
                originalText: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            policyId: string;
            count: number;
            occurrenceType: string;
            resetPeriod: import(".prisma/client").$Enums.OccurrenceResetPeriod;
            lastResetAt: Date;
            lastOccurredAt: Date | null;
            lastEventData: import("@prisma/client/runtime/library").JsonValue | null;
        })[];
    }>;
    getPayrollLockStatus(user: any, year?: string, month?: string): Promise<{
        success: boolean;
        data: import("./payroll-protection.service").LockCheckResult;
    }>;
    getRecentPeriodsLockStatus(user: any): Promise<{
        success: boolean;
        data: {
            period: string;
            exists: boolean;
            status: string;
            isLocked: boolean;
            lockedAt: Date | null | undefined;
        }[];
    }>;
    canApplyRetro(user: any, startPeriod: string, endPeriod: string): Promise<{
        success: boolean;
        data: {
            canApply: boolean;
            blockedPeriods: string[];
            message?: string;
        };
    }>;
    getAnalyticsDashboard(user: any, startDate?: string, endDate?: string): Promise<{
        success: boolean;
        data: import("./policy-analytics.service").PolicyAnalytics;
    }>;
    getPolicyHealthScore(id: string): Promise<{
        success: boolean;
        data: import("./policy-analytics.service").PolicyHealthScore;
    }>;
    validatePolicy(body: {
        text: string;
        parsedRule?: any;
    }): Promise<{
        success: boolean;
        data: import("./policy-coach.service").LaborLawValidation;
    }>;
    getPolicySuggestions(id: string): Promise<{
        success: boolean;
        data: import("./policy-coach.service").OptimizationSuggestion[];
    }>;
    analyzePatterns(user: any): Promise<{
        success: boolean;
        data: import("./policy-coach.service").PatternAnalysis;
    }>;
    getRecommendations(user: any): Promise<{
        success: boolean;
        data: import("./policy-coach.service").RecommendedPolicy[];
    }>;
    getTemplates(category?: string, search?: string): Promise<{
        success: boolean;
        data: {
            id: string;
            name: string;
            nameEn: string | null;
            createdAt: Date;
            updatedAt: Date;
            description: string;
            category: string;
            isPublic: boolean;
            originalText: string;
            parsedRule: import("@prisma/client/runtime/library").JsonValue;
            usageCount: number;
            createdBy: string | null;
            legalCompliance: import("@prisma/client/runtime/library").JsonValue;
            laborLawArticles: string[];
            rating: import("@prisma/client/runtime/library").Decimal | null;
            ratingCount: number;
            isSystemTemplate: boolean;
        }[];
    }>;
    getTemplate(templateId: string): Promise<{
        success: boolean;
        data: {
            id: string;
            name: string;
            nameEn: string | null;
            createdAt: Date;
            updatedAt: Date;
            description: string;
            category: string;
            isPublic: boolean;
            originalText: string;
            parsedRule: import("@prisma/client/runtime/library").JsonValue;
            usageCount: number;
            createdBy: string | null;
            legalCompliance: import("@prisma/client/runtime/library").JsonValue;
            laborLawArticles: string[];
            rating: import("@prisma/client/runtime/library").Decimal | null;
            ratingCount: number;
            isSystemTemplate: boolean;
        };
    }>;
    useTemplate(templateId: string, user: any): Promise<{
        success: boolean;
        data: import("./policy-templates.service").UseTemplateResult;
    }>;
    rateTemplate(templateId: string, body: {
        rating: number;
    }): Promise<{
        success: boolean;
        data: {
            rating: number;
            ratingCount: number;
        };
    }>;
    getTemplateCategories(): Promise<{
        success: boolean;
        data: {
            category: string;
            labelAr: string;
            count: number;
        }[];
    }>;
    seedTemplates(): Promise<{
        success: boolean;
        data: {
            seeded: boolean;
            count: number;
        };
    }>;
}
