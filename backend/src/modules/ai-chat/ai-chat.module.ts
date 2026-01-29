import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

// Legacy services (for backward compatibility during migration)
import { AiChatService } from './ai-chat.service';
import { AiAgentToolsService } from './ai-agent-tools.service';

// New secure services
import { SecureAiChatService } from './secure-ai-chat.service';
import {
    SecureCommandService,
    SecureFileService,
    InputValidationService,
    RateLimiterGuard,
    AIResponseValidatorService,
    RetryCircuitBreakerService,
    ConversationStorageService,
    ErrorHandlerService,
    AIPromptManagerService,
    EnhancedIntentClassifierService,
    PerformanceOptimizationService,
    // Innovative Feature Services (Phase 1)
    SmartFeaturesService,
    NaturalLanguageQueryService,
    ShiftManagementService,
    ExpenseManagementService,
    // Innovative Feature Services (Phase 2)
    AnalyticsService,
    WellnessService,
    GamificationService,
    ITSupportService,
    LearningService,
    MeetingService,
    OnboardingService,
    FeedbackService,
    // Innovative Feature Services (Phase 3)
    DocumentFinderService,
    CareerAdvisorService,
    MultiCulturalService,
    DailyBriefingService,
    PerformanceCoachService,
    NotificationsService,
    // Innovative Feature Services (Phase 4)
    TeamCollaborationService,
    ComplianceAssistantService,
    PredictiveInsightsService,
    HRAssistantService,
    SmartSchedulerService,
    VoiceAccessibilityService,
    // Innovative Feature Services (Phase 5)
    SocialEngagementService,
    IntegrationHubService,
    AdvancedAIService,
    ReportsBuilderService,
    EmergencyService,
    // Innovative Feature Services (Phase 6 - Final)
    FacilitiesService,
    TravelExpensesService,
    MobileFeaturesService,
    DataExportService,
    AutomationRulesService,
    StatisticsDashboardService,
    // System Context Builder (Real-time data for AI)
    SystemContextBuilderService,
    // Action Executor (AI can take actions)
    ActionExecutorService,
} from './security';

// Controllers
import { AiChatController } from './ai-chat.controller';
import { GeniusAiController } from './genius-ai.controller';

// 🧠 GENIUS AI Services (New Enhanced AI)
import { GeniusAiService } from './services/genius-ai.service';
import { GeniusContextService } from './services/genius-context.service';
import { GeniusQueryService } from './services/genius-query.service';
import { GeniusActionsService } from './services/genius-actions.service';
import { GeniusIntentService } from './services/genius-intent.service';
import { LocalAiEngineService } from './services/local-ai-engine.service';
import { DynamicQueryEngineService } from './services/dynamic-query-engine.service';

// Schema Discovery from Smart Policies
import { SchemaDiscoveryService } from '../smart-policies/schema-discovery.service';

/**
 * 🤖 AI Chat Module (V10 - Complete 200 Ideas)
 * 
 * This module registers all 50 services:
 * - 8 Security services (100 critical issues fixed)
 * - 4 Medium/Low fix services
 * - 35 Innovative feature services (200 ideas complete!)
 * - 3 Legacy services (backward compatibility)
 */
@Module({
    imports: [
        ConfigModule,
        PrismaModule,
        forwardRef(() => AiModule),
    ],
    controllers: [AiChatController, GeniusAiController],
    providers: [
        // Security services (Phase 1)
        SecureCommandService,
        SecureFileService,
        InputValidationService,
        RateLimiterGuard,
        AIResponseValidatorService,
        RetryCircuitBreakerService,
        ConversationStorageService,

        // Medium/Low fix services (Phase 2)
        ErrorHandlerService,
        AIPromptManagerService,
        EnhancedIntentClassifierService,
        PerformanceOptimizationService,

        // 🚀 Innovative Feature Services - Phase 1
        SmartFeaturesService,
        NaturalLanguageQueryService,
        ShiftManagementService,
        ExpenseManagementService,

        // 🚀 Innovative Feature Services - Phase 2
        AnalyticsService,
        WellnessService,
        GamificationService,
        ITSupportService,
        LearningService,
        MeetingService,
        OnboardingService,
        FeedbackService,

        // 🚀 Innovative Feature Services - Phase 3
        DocumentFinderService,
        CareerAdvisorService,
        MultiCulturalService,
        DailyBriefingService,
        PerformanceCoachService,
        NotificationsService,

        // 🚀 Innovative Feature Services - Phase 4
        TeamCollaborationService,
        ComplianceAssistantService,
        PredictiveInsightsService,
        HRAssistantService,
        SmartSchedulerService,
        VoiceAccessibilityService,

        // 🚀 Innovative Feature Services - Phase 5
        SocialEngagementService,
        IntegrationHubService,
        AdvancedAIService,
        ReportsBuilderService,
        EmergencyService,

        // 🚀 Innovative Feature Services - Phase 6 (Final)
        FacilitiesService,
        TravelExpensesService,
        MobileFeaturesService,
        DataExportService,
        AutomationRulesService,
        StatisticsDashboardService,

        // 🧠 System Context Builder (Real-time data for AI)
        SystemContextBuilderService,

        // ⚡ Action Executor (AI can take actions)
        ActionExecutorService,

        // New secure chat service
        SecureAiChatService,

        // Legacy services (kept for migration)
        AiChatService,
        AiAgentToolsService,

        // 🧠 GENIUS AI Services (Enhanced AI)
        GeniusAiService,
        GeniusContextService,
        GeniusQueryService,
        GeniusActionsService,
        GeniusIntentService,

        // 🧠 Local AI Engine (Self-Hosted - No External API)
        LocalAiEngineService,

        // 🧠 Dynamic Query Engine (Schema-Aware AI)
        DynamicQueryEngineService,
        SchemaDiscoveryService,
    ],
    exports: [
        // Export secure service for other modules
        SecureAiChatService,

        // Export security services for reuse
        SecureCommandService,
        SecureFileService,
        InputValidationService,
        RateLimiterGuard,
        ErrorHandlerService,
        AIPromptManagerService,
        PerformanceOptimizationService,

        // Export innovative feature services
        SmartFeaturesService,
        NaturalLanguageQueryService,
        ShiftManagementService,
        ExpenseManagementService,
        AnalyticsService,
        WellnessService,
        GamificationService,
        ITSupportService,
        LearningService,
        MeetingService,
        OnboardingService,
        FeedbackService,
        DocumentFinderService,
        CareerAdvisorService,
        MultiCulturalService,
        DailyBriefingService,
        PerformanceCoachService,
        NotificationsService,
        TeamCollaborationService,
        ComplianceAssistantService,
        PredictiveInsightsService,
        HRAssistantService,
        SmartSchedulerService,
        VoiceAccessibilityService,
        SocialEngagementService,
        IntegrationHubService,
        AdvancedAIService,
        ReportsBuilderService,
        EmergencyService,
        FacilitiesService,
        TravelExpensesService,
        MobileFeaturesService,
        DataExportService,
        AutomationRulesService,
        StatisticsDashboardService,

        // Keep legacy export during migration
        AiChatService,
        AiAgentToolsService,

        // 🧠 GENIUS AI Services exports
        GeniusAiService,
        GeniusContextService,
        GeniusQueryService,
        GeniusActionsService,
        GeniusIntentService,
        LocalAiEngineService,
        DynamicQueryEngineService,
        SchemaDiscoveryService,
    ],
})
export class AiChatModule { }
