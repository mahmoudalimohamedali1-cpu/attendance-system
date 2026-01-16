// 🔐 Security & Feature Services Index
// Centralized exports for all AI chat services

export { SecureCommandService, CommandResult } from './secure-command.service';
export { SecureFileService, FileResult } from './secure-file.service';
export {
    InputValidationService,
    ValidationResult,
    EmailValidation,
    NumberValidation
} from './input-validation.service';
export { RateLimiterGuard } from './rate-limiter.guard';
export {
    AIResponseValidatorService,
    EnhancementAnalysisSchema,
    EmployeeActionSchema,
    QueryResultSchema,
    EnhancementAnalysis,
    EmployeeAction,
    QueryResult,
    ValidationResult as AIValidationResult,
} from './ai-response-validator.service';
export {
    RetryCircuitBreakerService,
    RetryConfig,
    RetryResult
} from './retry-circuit-breaker.service';
export {
    ConversationStorageService,
    ChatMessage,
    ConversationSession
} from './conversation-storage.service';
export {
    ErrorHandlerService,
    ErrorCode,
    ErrorResponse,
} from './error-handler.service';
export {
    AIPromptManagerService,
    PromptTemplate,
} from './ai-prompt-manager.service';
export {
    EnhancedIntentClassifierService,
    IntentMatch,
} from './enhanced-intent-classifier.service';
export {
    PerformanceOptimizationService,
    PaginatedResult,
    PaginationParams,
} from './performance-optimization.service';

// 🚀 Innovative Feature Services
export {
    SmartFeaturesService,
    MoodAnalysis,
    PersonalizedPrompt,
    PrayerTimes,
    EmployeeStreak,
    Badge,
    ExpiringDocument,
} from './smart-features.service';
export {
    NaturalLanguageQueryService,
    QueryResult as NLQueryResult,
} from './natural-language-query.service';
export {
    ShiftManagementService,
    ShiftSwapRequest,
    ShiftMatch,
} from './shift-management.service';
export {
    ExpenseManagementService,
    ExpenseItem,
    ExpenseReport,
} from './expense-management.service';

// 📊 Analytics & Intelligence
export {
    AnalyticsService,
    TurnoverRisk,
    PerformanceForecast,
    EngagementScore,
    BurnoutWarning,
} from './analytics.service';

// 💚 Wellness & Support
export {
    WellnessService,
    MentalHealthCheckIn,
    WorkLifeBalance,
    BreakReminder,
} from './wellness.service';

// 🏆 Advanced Gamification
export {
    GamificationService,
    Quest,
    RewardItem,
    LuckyDraw,
    Leaderboard,
} from './gamification.service';

// 🔧 Support Services
export {
    ITSupportService,
    ITTicket,
    SelfServiceSolution,
} from './it-support.service';

// 📚 Learning & Development
export {
    LearningService,
    Course,
    LearningPath,
    SkillGap,
} from './learning.service';

// 📅 Meeting & Calendar
export {
    MeetingService,
    Meeting,
    MeetingRoom,
} from './meeting.service';

// 👋 Onboarding
export {
    OnboardingService,
    OnboardingChecklist,
    ChecklistItem,
} from './onboarding.service';

// 💬 Feedback & Recognition
export {
    FeedbackService,
    Feedback,
    Recognition,
    InnovationIdea,
} from './feedback.service';

// 📄 Document Management
export {
    DocumentFinderService,
    Document,
    DocumentTemplate,
} from './document-finder.service';

// 🎯 Career Development
export {
    CareerAdvisorService,
    CareerPath,
    PromotionReadiness,
} from './career-advisor.service';

// 🌍 Multi-Cultural Support
export {
    MultiCulturalService,
    CulturalEvent,
    ExpatService,
} from './multi-cultural.service';

// 📰 Daily Briefing
export {
    DailyBriefingService,
    DailyBriefing,
    Announcement,
} from './daily-briefing.service';

// 📊 Performance Coaching
export {
    PerformanceCoachService,
    PerformanceGoal,
    CoachingTip,
} from './performance-coach.service';

// 🔔 Smart Notifications
export {
    NotificationsService,
    Notification,
    NotificationPreferences,
} from './notifications.service';

// 👥 Team Collaboration
export {
    TeamCollaborationService,
    TeamMember,
    TeamMood,
    CollaborationRequest,
} from './team-collaboration.service';

// ⚖️ Compliance Assistant
export {
    ComplianceAssistantService,
    LaborLawArticle,
    GOSICalculation,
    EndOfServiceCalculation,
} from './compliance-assistant.service';

// 🔮 Predictive Insights
export {
    PredictiveInsightsService,
    AbsencePrediction,
    WorkloadForecast,
    BudgetPrediction,
} from './predictive-insights.service';

// 🤖 HR Assistant
export {
    HRAssistantService,
    BenefitsInfo,
    LeaveBalance,
    PayslipSummary,
} from './hr-assistant.service';

// 📅 Smart Scheduler
export {
    SmartSchedulerService,
    MeetingSuggestion,
    FocusTimeBlock,
    CalendarAnalytics,
} from './smart-scheduler.service';

// 🎙️ Voice & Accessibility
export {
    VoiceAccessibilityService,
    VoiceCommand,
    AccessibilityPreferences,
    QuickAction,
} from './voice-accessibility.service';

// 🎉 Social & Engagement
export {
    SocialEngagementService,
    Anniversary,
    SocialPost,
    EmployeeSpotlight,
    Poll,
} from './social-engagement.service';

// 🔗 Integration Hub
export {
    IntegrationHubService,
    ExternalSystem,
    Webhook,
    SyncJob,
    APIHealth,
} from './integration-hub.service';

// 🧠 Advanced AI
export {
    AdvancedAIService,
    SentimentResult,
    Summary,
    SmartSuggestion,
    ConversationMemory,
} from './advanced-ai.service';

// 📊 Reports Builder
export {
    ReportsBuilderService,
    ReportRequest,
    ReportTemplate,
    ScheduledReport,
    ReportData,
} from './reports-builder.service';

// 🚨 Emergency Service
export {
    EmergencyService,
    EmergencyContact,
    SafetyAlert,
    IncidentReport,
    EvacuationPlan,
} from './emergency.service';

// 🏢 Facilities Management
export {
    FacilitiesService,
    Room,
    RoomBooking,
    ParkingSpot,
    FacilityRequest,
} from './facilities.service';

// ✈️ Travel & Expenses
export {
    TravelExpensesService,
    TravelRequest,
    PerDiem,
    VisaInfo,
    TravelPolicy,
} from './travel-expenses.service';

// 📱 Mobile Features
export {
    MobileFeaturesService,
    PushNotificationSettings,
    OfflineAction,
    LocationCheckIn,
} from './mobile-features.service';

// 📤 Data Export
export {
    DataExportService,
    ExportJob,
    DataRequest,
    BackupSchedule,
} from './data-export.service';

// ⚙️ Automation Rules
export {
    AutomationRulesService,
    AutomationRule,
    AutomationLog,
    RuleTemplate,
} from './automation-rules.service';

// 📈 Statistics Dashboard
export {
    StatisticsDashboardService,
    DashboardStats,
    KPI,
    Comparison,
    TrendData,
} from './statistics-dashboard.service';

// 🧠 System Context Builder (Real-time data for AI)
export {
    SystemContextBuilderService,
} from './system-context-builder.service';

// ⚡ Action Executor (AI can take actions)
export {
    ActionExecutorService,
} from './action-executor.service';
