"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartPoliciesModule = void 0;
const common_1 = require("@nestjs/common");
const smart_policies_controller_1 = require("./smart-policies.controller");
const smart_policies_service_1 = require("./smart-policies.service");
const smart_policy_executor_service_1 = require("./smart-policy-executor.service");
const smart_policy_trigger_service_1 = require("./smart-policy-trigger.service");
const ai_policy_evaluator_service_1 = require("./ai-policy-evaluator.service");
const policy_context_service_1 = require("./policy-context.service");
const formula_parser_service_1 = require("./formula-parser.service");
const dynamic_query_service_1 = require("./dynamic-query.service");
const schema_discovery_service_1 = require("./schema-discovery.service");
const ai_agent_service_1 = require("./ai-agent.service");
const ai_schema_generator_service_1 = require("./ai-schema-generator.service");
const ai_code_generator_service_1 = require("./ai-code-generator.service");
const policy_versioning_service_1 = require("./policy-versioning.service");
const policy_approval_service_1 = require("./policy-approval.service");
const policy_simulation_service_1 = require("./policy-simulation.service");
const policy_conflict_service_1 = require("./policy-conflict.service");
const policy_audit_service_1 = require("./policy-audit.service");
const policy_notification_service_1 = require("./policy-notification.service");
const policy_exception_service_1 = require("./policy-exception.service");
const tiered_penalty_service_1 = require("./tiered-penalty.service");
const retroactive_policy_service_1 = require("./retroactive-policy.service");
const payroll_protection_service_1 = require("./payroll-protection.service");
const policy_analytics_service_1 = require("./policy-analytics.service");
const policy_templates_service_1 = require("./policy-templates.service");
const policy_coach_service_1 = require("./policy-coach.service");
const prisma_module_1 = require("../../common/prisma/prisma.module");
const ai_module_1 = require("../ai/ai.module");
let SmartPoliciesModule = class SmartPoliciesModule {
};
exports.SmartPoliciesModule = SmartPoliciesModule;
exports.SmartPoliciesModule = SmartPoliciesModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, (0, common_1.forwardRef)(() => ai_module_1.AiModule)],
        controllers: [smart_policies_controller_1.SmartPoliciesController],
        providers: [
            smart_policies_service_1.SmartPoliciesService,
            smart_policy_executor_service_1.SmartPolicyExecutorService,
            smart_policy_trigger_service_1.SmartPolicyTriggerService,
            ai_policy_evaluator_service_1.AIPolicyEvaluatorService,
            policy_context_service_1.PolicyContextService,
            formula_parser_service_1.FormulaParserService,
            dynamic_query_service_1.DynamicQueryService,
            schema_discovery_service_1.SchemaDiscoveryService,
            ai_agent_service_1.AiAgentService,
            ai_schema_generator_service_1.AiSchemaGeneratorService,
            ai_code_generator_service_1.AiCodeGeneratorService,
            policy_versioning_service_1.PolicyVersioningService,
            policy_approval_service_1.PolicyApprovalService,
            policy_simulation_service_1.PolicySimulationService,
            policy_conflict_service_1.PolicyConflictService,
            policy_audit_service_1.PolicyAuditService,
            policy_notification_service_1.PolicyNotificationService,
            policy_exception_service_1.PolicyExceptionService,
            tiered_penalty_service_1.TieredPenaltyService,
            retroactive_policy_service_1.RetroactivePolicyService,
            payroll_protection_service_1.PayrollProtectionService,
            policy_analytics_service_1.PolicyAnalyticsService,
            policy_templates_service_1.PolicyTemplatesService,
            policy_coach_service_1.PolicyCoachService,
        ],
        exports: [
            smart_policies_service_1.SmartPoliciesService,
            smart_policy_executor_service_1.SmartPolicyExecutorService,
            smart_policy_trigger_service_1.SmartPolicyTriggerService,
            ai_policy_evaluator_service_1.AIPolicyEvaluatorService,
            policy_context_service_1.PolicyContextService,
            formula_parser_service_1.FormulaParserService,
            dynamic_query_service_1.DynamicQueryService,
            schema_discovery_service_1.SchemaDiscoveryService,
            ai_agent_service_1.AiAgentService,
            ai_schema_generator_service_1.AiSchemaGeneratorService,
            ai_code_generator_service_1.AiCodeGeneratorService,
            policy_versioning_service_1.PolicyVersioningService,
            policy_approval_service_1.PolicyApprovalService,
            policy_simulation_service_1.PolicySimulationService,
            policy_conflict_service_1.PolicyConflictService,
            policy_audit_service_1.PolicyAuditService,
            policy_notification_service_1.PolicyNotificationService,
            policy_exception_service_1.PolicyExceptionService,
            tiered_penalty_service_1.TieredPenaltyService,
            retroactive_policy_service_1.RetroactivePolicyService,
            payroll_protection_service_1.PayrollProtectionService,
            policy_analytics_service_1.PolicyAnalyticsService,
            policy_templates_service_1.PolicyTemplatesService,
            policy_coach_service_1.PolicyCoachService,
        ],
    })
], SmartPoliciesModule);
//# sourceMappingURL=smart-policies.module.js.map