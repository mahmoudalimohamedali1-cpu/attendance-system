"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiChatModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("../../common/prisma/prisma.module");
const ai_module_1 = require("../ai/ai.module");
const ai_chat_service_1 = require("./ai-chat.service");
const ai_agent_tools_service_1 = require("./ai-agent-tools.service");
const secure_ai_chat_service_1 = require("./secure-ai-chat.service");
const security_1 = require("./security");
const ai_chat_controller_1 = require("./ai-chat.controller");
let AiChatModule = class AiChatModule {
};
exports.AiChatModule = AiChatModule;
exports.AiChatModule = AiChatModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            prisma_module_1.PrismaModule,
            (0, common_1.forwardRef)(() => ai_module_1.AiModule),
        ],
        controllers: [ai_chat_controller_1.AiChatController],
        providers: [
            security_1.SecureCommandService,
            security_1.SecureFileService,
            security_1.InputValidationService,
            security_1.RateLimiterGuard,
            security_1.AIResponseValidatorService,
            security_1.RetryCircuitBreakerService,
            security_1.ConversationStorageService,
            security_1.ErrorHandlerService,
            security_1.AIPromptManagerService,
            security_1.EnhancedIntentClassifierService,
            security_1.PerformanceOptimizationService,
            security_1.SmartFeaturesService,
            security_1.NaturalLanguageQueryService,
            security_1.ShiftManagementService,
            security_1.ExpenseManagementService,
            security_1.AnalyticsService,
            security_1.WellnessService,
            security_1.GamificationService,
            security_1.ITSupportService,
            security_1.LearningService,
            security_1.MeetingService,
            security_1.OnboardingService,
            security_1.FeedbackService,
            security_1.DocumentFinderService,
            security_1.CareerAdvisorService,
            security_1.MultiCulturalService,
            security_1.DailyBriefingService,
            security_1.PerformanceCoachService,
            security_1.NotificationsService,
            security_1.TeamCollaborationService,
            security_1.ComplianceAssistantService,
            security_1.PredictiveInsightsService,
            security_1.HRAssistantService,
            security_1.SmartSchedulerService,
            security_1.VoiceAccessibilityService,
            security_1.SocialEngagementService,
            security_1.IntegrationHubService,
            security_1.AdvancedAIService,
            security_1.ReportsBuilderService,
            security_1.EmergencyService,
            security_1.FacilitiesService,
            security_1.TravelExpensesService,
            security_1.MobileFeaturesService,
            security_1.DataExportService,
            security_1.AutomationRulesService,
            security_1.StatisticsDashboardService,
            security_1.SystemContextBuilderService,
            security_1.ActionExecutorService,
            secure_ai_chat_service_1.SecureAiChatService,
            ai_chat_service_1.AiChatService,
            ai_agent_tools_service_1.AiAgentToolsService,
        ],
        exports: [
            secure_ai_chat_service_1.SecureAiChatService,
            security_1.SecureCommandService,
            security_1.SecureFileService,
            security_1.InputValidationService,
            security_1.RateLimiterGuard,
            security_1.ErrorHandlerService,
            security_1.AIPromptManagerService,
            security_1.PerformanceOptimizationService,
            security_1.SmartFeaturesService,
            security_1.NaturalLanguageQueryService,
            security_1.ShiftManagementService,
            security_1.ExpenseManagementService,
            security_1.AnalyticsService,
            security_1.WellnessService,
            security_1.GamificationService,
            security_1.ITSupportService,
            security_1.LearningService,
            security_1.MeetingService,
            security_1.OnboardingService,
            security_1.FeedbackService,
            security_1.DocumentFinderService,
            security_1.CareerAdvisorService,
            security_1.MultiCulturalService,
            security_1.DailyBriefingService,
            security_1.PerformanceCoachService,
            security_1.NotificationsService,
            security_1.TeamCollaborationService,
            security_1.ComplianceAssistantService,
            security_1.PredictiveInsightsService,
            security_1.HRAssistantService,
            security_1.SmartSchedulerService,
            security_1.VoiceAccessibilityService,
            security_1.SocialEngagementService,
            security_1.IntegrationHubService,
            security_1.AdvancedAIService,
            security_1.ReportsBuilderService,
            security_1.EmergencyService,
            security_1.FacilitiesService,
            security_1.TravelExpensesService,
            security_1.MobileFeaturesService,
            security_1.DataExportService,
            security_1.AutomationRulesService,
            security_1.StatisticsDashboardService,
            ai_chat_service_1.AiChatService,
            ai_agent_tools_service_1.AiAgentToolsService,
        ],
    })
], AiChatModule);
//# sourceMappingURL=ai-chat.module.js.map