import { Module, forwardRef } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { SmartPoliciesController } from "./smart-policies.controller";
import { SmartPoliciesService } from "./smart-policies.service";
import { SmartPolicyExecutorService } from "./smart-policy-executor.service";
import { SmartPolicyTriggerService } from "./smart-policy-trigger.service";
import { AIPolicyEvaluatorService } from "./ai-policy-evaluator.service";
import { PolicyContextService } from "./policy-context.service";
import { FormulaParserService } from "./formula-parser.service";
import { DynamicQueryService } from "./dynamic-query.service";
import { SchemaDiscoveryService } from "./schema-discovery.service";
import { AiAgentService } from "./ai-agent.service";
import { AiSchemaGeneratorService } from "./ai-schema-generator.service";
import { AiCodeGeneratorService } from "./ai-code-generator.service";
import { PolicyVersioningService } from "./policy-versioning.service";
import { PolicyApprovalService } from "./policy-approval.service";
import { PolicySimulationService } from "./policy-simulation.service";
import { PolicyConflictService } from "./policy-conflict.service";
import { PolicyAuditService } from "./policy-audit.service";
import { PolicyNotificationService } from "./policy-notification.service";
// === New Enterprise Services ===
import { PolicyExceptionService } from "./policy-exception.service";
import { TieredPenaltyService } from "./tiered-penalty.service";
import { RetroactivePolicyService } from "./retroactive-policy.service";
import { PayrollProtectionService } from "./payroll-protection.service";
// === Phase 2: Analytics, Coach & Templates ===
import { PolicyAnalyticsService } from "./policy-analytics.service";
import { PolicyTemplatesService } from "./policy-templates.service";
import { PolicyCoachService } from "./policy-coach.service";
// === Phase 3: Accountant Tools ===
import { AccountantDashboardService } from "./accountant-dashboard.service";
import { PayrollPolicyIntegrationService } from "./payroll-policy-integration.service";
import { PolicyFinancialReportService } from "./policy-financial-report.service";
import { PolicyExportService } from "./policy-export.service";
// === Security & Utilities ===
import { SafeExpressionParserService } from "./safe-expression-parser.service";
import { RateLimitGuard } from "./guards/rate-limit.guard";
import { SmartPolicyExceptionFilter } from "./filters/smart-policy-exception.filter";
// === Enhanced Services ===
import { PolicyCacheService } from "./services/policy-cache.service";
import { PolicyValidationService } from "./services/policy-validation.service";
import { PolicyTransactionService } from "./services/policy-transaction.service";
import { PolicyRetryService } from "./services/policy-retry.service";
import { ResponseFormatterService } from "./services/response-formatter.service";
import { PolicyLoggerService } from "./services/policy-logger.service";
import { PolicyHealthService } from "./services/policy-health.service";
import { PolicyDLQService } from "./services/policy-dlq.service";
// === Interceptors ===
import { ApiVersionInterceptor, PerformanceInterceptor, ResponseTransformInterceptor } from "./interceptors/api-version.interceptor";
// === Advanced Features ===
import { AIPolicyBuilderService } from "./features/ai-policy-builder.service";
import { RealtimeDashboardService } from "./features/realtime-dashboard.service";
import { AdvancedAnalyticsService } from "./features/advanced-analytics.service";
import { SmartNotificationsService } from "./features/smart-notifications.service";
import { PolicyWizardService } from "./features/policy-wizard.service";
import { IntegrationHubService } from "./features/integration-hub.service";
import { AdvancedReportingService } from "./features/advanced-reporting.service";
import { PolicyMarketplaceService } from "./features/policy-marketplace.service";
// === Marketplace Seed ===
import { MarketplaceSeedService } from "./marketplace/marketplace-seed.service";
import { PolicyGeneratorService } from "./marketplace/policy-generator.service";
// === AI-Free Rule Engine (Phase V2) ===
import { PolicyTemplateRegistryService } from "./templates/policy-template.registry";
import { PELParserService } from "./engines/pel-parser.service";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { AiModule } from "../ai/ai.module";
import { ScheduleModule } from "@nestjs/schedule";
import { EventEmitterModule } from "@nestjs/event-emitter";

@Module({
    imports: [
        PrismaModule,
        forwardRef(() => AiModule),
        ScheduleModule.forRoot(),
        EventEmitterModule.forRoot(),
    ],
    controllers: [SmartPoliciesController],
    providers: [
        // === Core Services ===
        SmartPoliciesService,
        SmartPolicyExecutorService,
        SmartPolicyTriggerService,
        AIPolicyEvaluatorService,
        PolicyContextService,
        FormulaParserService,
        DynamicQueryService,
        SchemaDiscoveryService,
        AiAgentService,
        AiSchemaGeneratorService,
        AiCodeGeneratorService,
        PolicyVersioningService,
        PolicyApprovalService,
        PolicySimulationService,
        PolicyConflictService,
        PolicyAuditService,
        PolicyNotificationService,
        // === New Enterprise Services ===
        PolicyExceptionService,
        TieredPenaltyService,
        RetroactivePolicyService,
        PayrollProtectionService,
        // === Phase 2: Analytics, Coach & Templates ===
        PolicyAnalyticsService,
        PolicyTemplatesService,
        PolicyCoachService,
        // === Phase 3: Accountant Tools ===
        AccountantDashboardService,
        PayrollPolicyIntegrationService,
        PolicyFinancialReportService,
        PolicyExportService,
        // === Security & Utilities ===
        SafeExpressionParserService,
        RateLimitGuard,
        // === Enhanced Services ===
        PolicyCacheService,
        PolicyValidationService,
        PolicyTransactionService,
        PolicyRetryService,
        ResponseFormatterService,
        PolicyLoggerService,
        PolicyHealthService,
        PolicyDLQService,
        // === Interceptors ===
        ApiVersionInterceptor,
        PerformanceInterceptor,
        ResponseTransformInterceptor,
        // === Advanced Features ===
        AIPolicyBuilderService,
        RealtimeDashboardService,
        AdvancedAnalyticsService,
        SmartNotificationsService,
        PolicyWizardService,
        IntegrationHubService,
        AdvancedReportingService,
        PolicyMarketplaceService,
        // === Marketplace Seed ===
        PolicyGeneratorService,
        MarketplaceSeedService,
        // === AI-Free Rule Engine (Phase V2) ===
        PolicyTemplateRegistryService,
        PELParserService,
        // === Global Providers ===
        {
            provide: APP_FILTER,
            useClass: SmartPolicyExceptionFilter,
        },
    ],
    exports: [
        // === Core Services ===
        SmartPoliciesService,
        SmartPolicyExecutorService,
        SmartPolicyTriggerService,
        AIPolicyEvaluatorService,
        PolicyContextService,
        FormulaParserService,
        DynamicQueryService,
        SchemaDiscoveryService,
        AiAgentService,
        AiSchemaGeneratorService,
        AiCodeGeneratorService,
        PolicyVersioningService,
        PolicyApprovalService,
        PolicySimulationService,
        PolicyConflictService,
        PolicyAuditService,
        PolicyNotificationService,
        // === New Enterprise Services ===
        PolicyExceptionService,
        TieredPenaltyService,
        RetroactivePolicyService,
        PayrollProtectionService,
        // === Phase 2: Analytics, Coach & Templates ===
        PolicyAnalyticsService,
        PolicyTemplatesService,
        PolicyCoachService,
        // === Phase 3: Accountant Tools ===
        AccountantDashboardService,
        PayrollPolicyIntegrationService,
        PolicyFinancialReportService,
        PolicyExportService,
        // === Security & Utilities ===
        SafeExpressionParserService,
        RateLimitGuard,
        // === Enhanced Services ===
        PolicyCacheService,
        PolicyValidationService,
        PolicyTransactionService,
        PolicyRetryService,
        ResponseFormatterService,
        PolicyLoggerService,
        PolicyHealthService,
        PolicyDLQService,
        // === Interceptors ===
        ApiVersionInterceptor,
        PerformanceInterceptor,
        ResponseTransformInterceptor,
        // === Advanced Features ===
        AIPolicyBuilderService,
        RealtimeDashboardService,
        AdvancedAnalyticsService,
        SmartNotificationsService,
        PolicyWizardService,
        IntegrationHubService,
        AdvancedReportingService,
        PolicyMarketplaceService,
        // === AI-Free Rule Engine (Phase V2) ===
        PolicyTemplateRegistryService,
        PELParserService,
    ],
})
export class SmartPoliciesModule { }
