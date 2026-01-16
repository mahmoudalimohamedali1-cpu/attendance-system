/**
 * 📦 Smart Policies Module Exports
 * تصدير كل المكونات العامة للنظام
 */

// ============== Core Services ==============
export { SmartPoliciesService, CreateSmartPolicyDto, UpdateSmartPolicyDto } from './smart-policies.service';
export { SmartPolicyExecutorService, SmartPolicyExecutionResult, SmartPolicyExecutionContext } from './smart-policy-executor.service';
export { SmartPolicyTriggerService } from './smart-policy-trigger.service';
export { PolicyContextService, EnrichedPolicyContext } from './policy-context.service';
export { FormulaParserService } from './formula-parser.service';
export { DynamicQueryService } from './dynamic-query.service';
export { SchemaDiscoveryService } from './schema-discovery.service';
export { SafeExpressionParserService } from './safe-expression-parser.service';

// ============== AI Services ==============
export { AiAgentService } from './ai-agent.service';
export { AiSchemaGeneratorService, MissingField, GeneratedModel } from './ai-schema-generator.service';
export { AiCodeGeneratorService } from './ai-code-generator.service';
export { AIPolicyEvaluatorService } from './ai-policy-evaluator.service';

// ============== Workflow Services ==============
export { PolicyVersioningService } from './policy-versioning.service';
export { PolicyApprovalService } from './policy-approval.service';
export { PolicySimulationService, EmployeeSimulationResult } from './policy-simulation.service';
export { PolicyConflictService } from './policy-conflict.service';
export { PolicyAuditService } from './policy-audit.service';
export { PolicyNotificationService } from './policy-notification.service';

// ============== Enterprise Services ==============
export { PolicyExceptionService } from './policy-exception.service';
export { TieredPenaltyService, TieredPenaltyConfig, TieredPenaltyResult } from './tiered-penalty.service';
export { RetroactivePolicyService, CreateRetroApplicationDto, EmployeeRetroResult } from './retroactive-policy.service';
export { PayrollProtectionService } from './payroll-protection.service';

// ============== Analytics & Templates ==============
export { PolicyAnalyticsService } from './policy-analytics.service';
export { PolicyTemplatesService } from './policy-templates.service';
export { PolicyCoachService } from './policy-coach.service';

// ============== Accountant Tools ==============
export { AccountantDashboardService } from './accountant-dashboard.service';
export { PayrollPolicyIntegrationService } from './payroll-policy-integration.service';
export { PolicyFinancialReportService } from './policy-financial-report.service';
export { PolicyExportService } from './policy-export.service';

// ============== Utility Services ==============
export { PolicyCacheService } from './services/policy-cache.service';
export { PolicyValidationService, ValidationResult, ValidationError, ValidationWarning } from './services/policy-validation.service';

// ============== Guards ==============
export { 
    RateLimitGuard,
    RateLimit,
    AIRateLimit,
    AutoExtendRateLimit,
    SimulationRateLimit,
    ReadRateLimit,
    WriteRateLimit,
    ExportRateLimit,
    DEFAULT_RATE_LIMITS,
} from './guards/rate-limit.guard';

// ============== Filters ==============
export {
    SmartPolicyExceptionFilter,
    PolicyNotFoundException,
    PolicyValidationException,
    PolicyParseException,
    FormulaEvaluationException,
    ApprovalRequiredException,
    ConflictException,
    RetroApplicationException,
    throwPolicyNotFound,
    throwValidationError,
    throwParseError,
    throwFormulaError,
    assertPolicyExists,
    assertValid,
} from './filters/smart-policy-exception.filter';

// ============== DTOs ==============
export * from './dto/smart-policy.dto';

// ============== Constants ==============
export * from './constants/smart-policy.constants';

// ============== Helpers ==============
export * from './helpers/smart-policy.helpers';

// ============== Interceptors ==============
export {
    ApiVersionInterceptor,
    DeprecationInterceptor,
    PerformanceInterceptor,
    ResponseTransformInterceptor,
    API_VERSION,
    API_PREFIX,
} from './interceptors/api-version.interceptor';

// ============== Additional Services ==============
export { PolicyTransactionService, TransactionOptions, BatchOptions, BatchResult } from './services/policy-transaction.service';
export { PolicyRetryService, RetryOptions, RetryResult, CircuitBreakerState } from './services/policy-retry.service';
export { PolicyLoggerService, LogContext, PerformanceLog } from './services/policy-logger.service';
export { ResponseFormatterService, ApiResponse, PaginatedData, PaginationMeta } from './services/response-formatter.service';
export { PolicyHealthService, HealthStatus, HealthCheck, SystemMetrics } from './services/policy-health.service';
export { PolicyDLQService, FailedOperation, DLQStats, OperationType, DLQStatus } from './services/policy-dlq.service';

// ============== Module ==============
export { SmartPoliciesModule } from './smart-policies.module';
