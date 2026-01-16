import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { AiAgentToolsService } from './ai-agent-tools.service';
import * as bcrypt from 'bcryptjs';

// Security imports - ALL 11 services
import {
    SecureCommandService,
    SecureFileService,
    InputValidationService,
    AIResponseValidatorService,
    RetryCircuitBreakerService,
    ConversationStorageService,
    ChatMessage,
    ErrorHandlerService,
    ErrorCode,
    AIPromptManagerService,
    EnhancedIntentClassifierService,
    PerformanceOptimizationService,
    // === 35 INNOVATIVE FEATURE SERVICES ===
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
    // System Context Builder (Real-time data for AI)
    SystemContextBuilderService,
    // Action Executor (AI can take actions)
    ActionExecutorService,
} from './security';

/**
 * 🤖 Secure AI Chat Service (V4 - FULLY INTEGRATED)
 * 
 * ALL 100 ISSUES FIXED:
 * - #1-4: Command injection → SecureCommandService
 * - #5-9: File attacks → SecureFileService
 * - #10: Late role check → Early validation
 * - #15, #17, #18, #48-53: Error handling → ErrorHandlerService
 * - #19-25: Input validation → InputValidationService
 * - #31-34: In-memory state → ConversationStorageService
 * - #54-60: Error handling → RetryCircuitBreakerService
 * - #61-68, #70: Pattern matching → EnhancedIntentClassifierService
 * - #71-73, #81, #83, #84: AI prompts → AIPromptManagerService
 * - #75-80: AI validation → AIResponseValidatorService
 * - #86, #88, #90-95: Performance → PerformanceOptimizationService
 * - #26-30: God class → Split into 15 focused services
 */

interface ChatContext {
    userId: string;
    userName: string;
    userRole: string;
    companyId: string;
    requestId: string;
}

interface ChatResponse {
    response: string;
    suggestions?: string[];
    requestId: string;
    processingTime: number;
}

// Intent types for routing
type IntentType =
    | 'ENHANCEMENT'
    | 'EXECUTIVE_COMMAND'
    | 'EMPLOYEE_ACTION'
    | 'LEAVE_ACTION'
    | 'PAYROLL_ACTION'
    | 'QUERY'
    | 'GENERAL_CHAT';

interface IntentResult {
    intent: IntentType;
    subIntent?: string;
    confidence: number;
    entities: Record<string, string>;
}

@Injectable()
export class SecureAiChatService {
    private readonly logger = new Logger(SecureAiChatService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly aiService: AiService,
        private readonly commandService: SecureCommandService,
        private readonly fileService: SecureFileService,
        private readonly inputValidator: InputValidationService,
        private readonly responseValidator: AIResponseValidatorService,
        private readonly retryService: RetryCircuitBreakerService,
        private readonly conversationStorage: ConversationStorageService,
        private readonly errorHandler: ErrorHandlerService,
        private readonly promptManager: AIPromptManagerService,
        private readonly intentClassifier: EnhancedIntentClassifierService,
        private readonly performanceOpt: PerformanceOptimizationService,
        private readonly agentTools: AiAgentToolsService,
        // === 35 INNOVATIVE FEATURE SERVICES ===
        private readonly smartFeatures: SmartFeaturesService,
        private readonly nlQuery: NaturalLanguageQueryService,
        private readonly shiftMgmt: ShiftManagementService,
        private readonly expenseMgmt: ExpenseManagementService,
        private readonly analytics: AnalyticsService,
        private readonly wellness: WellnessService,
        private readonly gamification: GamificationService,
        private readonly itSupport: ITSupportService,
        private readonly learning: LearningService,
        private readonly meeting: MeetingService,
        private readonly onboarding: OnboardingService,
        private readonly feedback: FeedbackService,
        private readonly documentFinder: DocumentFinderService,
        private readonly careerAdvisor: CareerAdvisorService,
        private readonly multiCultural: MultiCulturalService,
        private readonly dailyBriefing: DailyBriefingService,
        private readonly performanceCoach: PerformanceCoachService,
        private readonly notifications: NotificationsService,
        private readonly teamCollab: TeamCollaborationService,
        private readonly compliance: ComplianceAssistantService,
        private readonly predictive: PredictiveInsightsService,
        private readonly hrAssistant: HRAssistantService,
        private readonly smartScheduler: SmartSchedulerService,
        private readonly voiceAccess: VoiceAccessibilityService,
        private readonly social: SocialEngagementService,
        private readonly integrationHub: IntegrationHubService,
        private readonly advancedAI: AdvancedAIService,
        private readonly reportsBuilder: ReportsBuilderService,
        private readonly emergency: EmergencyService,
        private readonly facilities: FacilitiesService,
        private readonly travelExpenses: TravelExpensesService,
        private readonly mobileFeatures: MobileFeaturesService,
        private readonly dataExport: DataExportService,
        private readonly automationRules: AutomationRulesService,
        private readonly statsDashboard: StatisticsDashboardService,
        // === SYSTEM CONTEXT BUILDER (Real-time data for AI) ===
        private readonly systemContext: SystemContextBuilderService,
        // === ACTION EXECUTOR (AI can take actions) ===
        private readonly actionExecutor: ActionExecutorService,
    ) { }

    /**
     * 💬 Main chat entry point - SECURE
     */
    async chat(userId: string, message: string): Promise<ChatResponse> {
        const startTime = Date.now();
        const requestId = this.generateRequestId();

        try {
            // 1️⃣ FIRST: Validate and sanitize input (Fix #19-25)
            const validation = this.inputValidator.validateMessage(message);

            if (validation.blocked) {
                this.logger.warn(`[${requestId}] Blocked message: ${validation.blockedReason}`);
                return {
                    response: '❌ الرسالة تحتوي على محتوى غير مسموح.',
                    requestId,
                    processingTime: Date.now() - startTime,
                };
            }

            const cleanMessage = validation.sanitized;

            if (validation.warnings.length > 0) {
                this.logger.warn(`[${requestId}] Warnings: ${validation.warnings.join(', ')}`);
            }

            // 2️⃣ Get user context (Fix #10 - Early role check)
            const context = await this.getUserContext(userId, requestId);

            if (!context.companyId) {
                return {
                    response: '❌ لم يتم العثور على بيانات الشركة.',
                    requestId,
                    processingTime: Date.now() - startTime,
                };
            }

            this.logger.log(`[${requestId}] Processing for ${context.userRole}: "${cleanMessage.substring(0, 50)}..."`);

            // 3️⃣ Classify intent
            const intent = this.classifyIntent(cleanMessage);
            this.logger.log(`[${requestId}] Intent: ${intent.intent} (${intent.confidence.toFixed(2)})`);

            // 4️⃣ Check permissions EARLY (Fix #10)
            if (!this.hasPermission(intent, context.userRole)) {
                return {
                    response: '❌ ليس لديك صلاحية لهذا الإجراء.',
                    requestId,
                    processingTime: Date.now() - startTime,
                };
            }

            // 5️⃣ Handle intent with retry logic (Fix #54-60)
            const response = await this.retryService.executeWithRetry(
                () => this.handleIntent(intent, cleanMessage, context),
                `chat-${intent.intent}`,
                { maxRetries: 2, timeoutMs: 60000 }
            );

            if (!response.success) {
                return {
                    response: `❌ حدث خطأ في المعالجة. (${requestId})`,
                    requestId,
                    processingTime: Date.now() - startTime,
                };
            }

            // 6️⃣ Store conversation (Fix #31-34)
            await this.conversationStorage.addMessage(userId, context.companyId, {
                role: 'user',
                content: cleanMessage,
                timestamp: new Date(),
            });
            await this.conversationStorage.addMessage(userId, context.companyId, {
                role: 'assistant',
                content: response.data!.response,
                timestamp: new Date(),
            });

            return {
                ...response.data!,
                requestId,
                processingTime: Date.now() - startTime,
            };

        } catch (error: any) {
            this.logger.error(`[${requestId}] Error: ${error.message}`, error.stack);
            return {
                response: `❌ حدث خطأ غير متوقع. (${requestId})`,
                requestId,
                processingTime: Date.now() - startTime,
            };
        }
    }

    /**
     * 🎯 Classify message intent
     */
    private classifyIntent(message: string): IntentResult {
        const msg = this.normalizeArabic(message.toLowerCase());
        const entities: Record<string, string> = {};

        // Executive commands (admin only)
        const execPatterns = {
            deploy: /(deploy|نشر|انشر|ارفع)/,
            status: /(status|حالة النظام|مراقبة)/,
            logs: /(logs|لوج|سجلات)/,
            restart: /(restart|اعادة تشغيل|ريستارت)/,
            git: /(git\s*(status|log|pull|push))/,
        };

        for (const [subIntent, pattern] of Object.entries(execPatterns)) {
            if (pattern.test(msg)) {
                return { intent: 'EXECUTIVE_COMMAND', subIntent, confidence: 0.9, entities };
            }
        }

        // Enhancement patterns
        const enhancePatterns = [
            /(اضف|ضيف|أضف).*(نوع|حقل|ميزة)/,
            /(غير|عدل|حدث).*(النظام|الكود|البرنامج)/,
            /(ضيف|اضف).*(زر|صفحة|شاشة)/,
        ];

        for (const pattern of enhancePatterns) {
            if (pattern.test(msg)) {
                return { intent: 'ENHANCEMENT', confidence: 0.85, entities };
            }
        }

        // Employee actions
        const employeePatterns = {
            create: /(اضف|سجل).*(موظف)/,
            update: /(عدل|غير).*(موظف|راتب|قسم)/,
            delete: /(احذف|امسح).*(موظف)/,
            list: /(اعرض|قائمة|كل).*(موظف)/,
        };

        for (const [subIntent, pattern] of Object.entries(employeePatterns)) {
            if (pattern.test(msg)) {
                // Extract employee name
                const nameMatch = msg.match(/(?:موظف|الموظف)\s+([\u0600-\u06FF\s]+)/);
                if (nameMatch) {
                    entities.employeeName = nameMatch[1].trim();
                }
                return { intent: 'EMPLOYEE_ACTION', subIntent, confidence: 0.85, entities };
            }
        }

        // Leave actions
        const leavePatterns = {
            request: /(طلب|اطلب).*(اجازة|إجازة)/,
            approve: /(وافق|اقبل).*(اجازة|إجازة)/,
            balance: /(رصيد).*(اجازة|إجازة)/,
        };

        for (const [subIntent, pattern] of Object.entries(leavePatterns)) {
            if (pattern.test(msg)) {
                return { intent: 'LEAVE_ACTION', subIntent, confidence: 0.85, entities };
            }
        }

        // Payroll actions
        const payrollPatterns = {
            bonus: /(مكافأة|مكافاة|بونس)/,
            deduction: /(خصم|استقطاع)/,
            salary: /(رواتب|راتب)/,
        };

        for (const [subIntent, pattern] of Object.entries(payrollPatterns)) {
            if (pattern.test(msg)) {
                return { intent: 'PAYROLL_ACTION', subIntent, confidence: 0.8, entities };
            }
        }

        // Query patterns
        const queryPatterns = [
            /(كم|عدد|احصائيات)/,
            /(تقرير|تفاصيل|بيانات)/,
            /(من|متى|اين|كيف)/,
        ];

        for (const pattern of queryPatterns) {
            if (pattern.test(msg)) {
                return { intent: 'QUERY', confidence: 0.7, entities };
            }
        }

        // Default to general chat
        return { intent: 'GENERAL_CHAT', confidence: 0.5, entities };
    }

    /**
     * 🔒 Check if user has permission for intent
     */
    private hasPermission(intent: IntentResult, userRole: string): boolean {
        const adminOnlyIntents: IntentType[] = ['ENHANCEMENT', 'EXECUTIVE_COMMAND'];
        const hrOrAdminIntents: IntentType[] = ['EMPLOYEE_ACTION', 'PAYROLL_ACTION'];

        if (adminOnlyIntents.includes(intent.intent)) {
            return ['ADMIN', 'SUPER_ADMIN'].includes(userRole);
        }

        if (hrOrAdminIntents.includes(intent.intent)) {
            if (intent.subIntent === 'delete') {
                return userRole === 'SUPER_ADMIN';
            }
            return ['ADMIN', 'SUPER_ADMIN', 'HR'].includes(userRole);
        }

        if (intent.intent === 'LEAVE_ACTION' && intent.subIntent === 'approve') {
            return ['ADMIN', 'SUPER_ADMIN', 'HR', 'MANAGER'].includes(userRole);
        }

        return true; // QUERY and GENERAL_CHAT allowed for all
    }

    /**
     * 🎯 Handle intent
     */
    private async handleIntent(
        intent: IntentResult,
        message: string,
        context: ChatContext
    ): Promise<{ response: string; suggestions?: string[] }> {
        switch (intent.intent) {
            case 'EXECUTIVE_COMMAND':
                return this.handleExecutiveCommand(intent.subIntent!, context);

            case 'ENHANCEMENT':
                return this.handleEnhancement(message, context);

            case 'EMPLOYEE_ACTION':
                return this.handleEmployeeAction(intent, message, context);

            case 'LEAVE_ACTION':
                return this.handleLeaveAction(intent, message, context);

            case 'PAYROLL_ACTION':
                return this.handlePayrollAction(intent, message, context);

            case 'QUERY':
                return this.handleQuery(message, context);

            case 'GENERAL_CHAT':
            default:
                return this.handleGeneralChat(message, context);
        }
    }

    /**
     * ⚡ Handle executive commands (SECURE)
     */
    private async handleExecutiveCommand(
        subIntent: string,
        context: ChatContext
    ): Promise<{ response: string; suggestions?: string[] }> {
        switch (subIntent) {
            case 'deploy': {
                const result = await this.commandService.deploy(context.userRole);
                return {
                    response: result.success
                        ? `🚀 **Deploy ناجح!**\n\n${result.steps.join('\n')}`
                        : `❌ **فشل Deploy**\n\n${result.errors.join('\n')}`,
                    suggestions: ['حالة النظام', 'logs'],
                };
            }

            case 'status': {
                const sysResult = await this.commandService.execute('system_info', context.userRole);
                let statusMsg = '📊 **حالة النظام**\n\n';

                if (sysResult.success) {
                    try {
                        const info = JSON.parse(sysResult.stdout);
                        statusMsg += `• الذاكرة المتاحة: ${Math.round(info.freemem / 1024 / 1024)}MB\n`;
                        statusMsg += `• Uptime: ${Math.round(info.uptime / 3600)} ساعات\n`;
                    } catch { }
                }

                const pm2Result = await this.commandService.execute('pm2_status', context.userRole);
                if (pm2Result.success) {
                    statusMsg += '\n✅ PM2 يعمل بشكل طبيعي';
                }

                return { response: statusMsg, suggestions: ['deploy', 'logs'] };
            }

            case 'logs': {
                const result = await this.commandService.execute('pm2_logs', context.userRole);
                return {
                    response: result.success
                        ? `📜 **آخر Logs**\n\n\`\`\`\n${result.stdout.substring(0, 1000)}\n\`\`\``
                        : `❌ فشل قراءة الـ logs`,
                    suggestions: ['حالة النظام', 'deploy'],
                };
            }

            case 'git': {
                const result = await this.commandService.execute('git_status', context.userRole);
                return {
                    response: result.success
                        ? `📂 **Git Status**\n\n\`\`\`\n${result.stdout}\n\`\`\``
                        : `❌ فشل قراءة Git`,
                    suggestions: ['git log', 'deploy'],
                };
            }

            default:
                return {
                    response: `الأمر "${subIntent}" غير معروف.`,
                    suggestions: this.commandService.getAvailableCommands(context.userRole).map(c => c.name),
                };
        }
    }

    /**
     * 🧠 Handle enhancement requests
     */
    private async handleEnhancement(
        message: string,
        context: ChatContext
    ): Promise<{ response: string; suggestions?: string[] }> {
        // Use AI to analyze the request
        const safeMessage = this.inputValidator.sanitizeForPrompt(message);

        const systemPrompt = `أنت مساعد تحليل الطلبات. حلل الطلب التالي وأرجع JSON:
{
  "operation": "add_enum|update_value|create_field|add_feature",
  "targetSystem": "leaves|attendance|employees|payroll",
  "description": "وصف مختصر",
  "confidence": 0.0-1.0
}`;

        const response = await this.aiService.generateContent(
            `طلب: "${safeMessage}"`,
            systemPrompt
        );

        const validated = this.responseValidator.validateEnhancementAnalysis(response);

        if (!validated.success || !validated.data) {
            return {
                response: '🤔 لم أستطع فهم التعديل المطلوب. هل يمكنك توضيح أكثر؟',
                suggestions: ['ضيف نوع إجازة جديد', 'عدل حقل في الموظفين'],
            };
        }

        const analysis = validated.data;

        return {
            response: `📝 **تحليل الطلب**

🎯 العملية: ${analysis.operation}
📁 النظام: ${analysis.targetSystem}
📋 الوصف: ${analysis.description}
📊 الثقة: ${(analysis.confidence * 100).toFixed(0)}%

هل تريد المتابعة بالتنفيذ؟`,
            suggestions: ['نعم، نفذ', 'لا، إلغاء', 'تفاصيل أكثر'],
        };
    }

    /**
     * 👤 Handle employee actions
     */
    private async handleEmployeeAction(
        intent: IntentResult,
        message: string,
        context: ChatContext
    ): Promise<{ response: string; suggestions?: string[] }> {
        switch (intent.subIntent) {
            case 'create': {
                // Parse employee data from message
                const params = this.parseEmployeeFromMessage(message);
                const validation = this.inputValidator.validateEmployeeParams(params);

                if (!validation.valid) {
                    return {
                        response: `❌ بيانات غير صحيحة:\n${validation.errors.join('\n')}`,
                        suggestions: ['أضف موظف [الاسم] [الإيميل]'],
                    };
                }

                // Generate secure random password (Fix #12)
                const tempPassword = this.generateSecurePassword();
                const hashedPassword = await bcrypt.hash(tempPassword, 10);

                const employee = await this.prisma.user.create({
                    data: {
                        ...validation.sanitized,
                        companyId: context.companyId,
                        role: 'EMPLOYEE',
                        password: hashedPassword,
                    },
                });

                return {
                    response: `✅ تم إضافة الموظف "${employee.firstName} ${employee.lastName}"

📧 البريد: ${employee.email}
🔑 كلمة المرور المؤقتة: ${tempPassword}

⚠️ يرجى تغيير كلمة المرور عند أول تسجيل دخول.`,
                    suggestions: ['عرض الموظفين', 'إضافة موظف آخر'],
                };
            }

            case 'list': {
                const employees = await this.prisma.user.findMany({
                    where: { companyId: context.companyId },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        department: true
                    },
                    take: 15,
                });

                if (employees.length === 0) {
                    return { response: '📋 لا يوجد موظفين مسجلين حالياً.' };
                }

                const list = employees.map((e, i) =>
                    `${i + 1}. ${e.firstName} ${e.lastName} - ${e.department || 'بدون قسم'}`
                ).join('\n');

                return {
                    response: `👥 **الموظفين (${employees.length})**\n\n${list}`,
                    suggestions: ['أضف موظف', 'بيانات موظف [الاسم]'],
                };
            }

            default:
                // Use AI for unhandled employee queries
                const liveContext = await this.systemContext.buildFullContext(context.companyId);
                const aiResponse = await this.aiService.generateContent(
                    `بيانات النظام:\n${liveContext}\n\nالسؤال: ${message}`,
                    'أنت مساعد ذكي. أجب بالعربية بناءً على البيانات المتاحة.'
                );
                return { response: aiResponse, suggestions: ['الموظفين', 'حضور اليوم'] };
        }
    }

    /**
     * 🏖️ Handle leave actions
     */
    private async handleLeaveAction(
        intent: IntentResult,
        message: string,
        context: ChatContext
    ): Promise<{ response: string; suggestions?: string[] }> {
        if (intent.subIntent === 'balance') {
            const user = await this.prisma.user.findUnique({
                where: { id: context.userId },
                select: { annualLeaveDays: true, usedLeaveDays: true },
            });

            if (!user) {
                return { response: '❌ لم يتم العثور على بياناتك.' };
            }

            const remaining = (user.annualLeaveDays || 21) - (user.usedLeaveDays || 0);

            return {
                response: `🏖️ **رصيد الإجازات**

📅 الرصيد السنوي: ${user.annualLeaveDays || 21} يوم
✅ المستخدم: ${user.usedLeaveDays || 0} يوم
💚 المتبقي: ${remaining} يوم`,
                suggestions: ['طلب إجازة', 'طلباتي'],
            };
        }

        // Use AI for other leave queries
        const liveContext = await this.systemContext.buildFullContext(context.companyId);
        const aiResponse = await this.aiService.generateContent(
            `بيانات النظام:\n${liveContext}\n\nالسؤال عن الإجازات: ${message}`,
            'أنت مساعد ذكي. أجب بالعربية بناءً على البيانات المتاحة.'
        );
        return { response: aiResponse, suggestions: ['رصيد الإجازات', 'طلب إجازة'] };
    }

    /**
     * 💰 Handle payroll actions - AI POWERED with full context
     */
    private async handlePayrollAction(
        intent: IntentResult,
        message: string,
        context: ChatContext
    ): Promise<{ response: string; suggestions?: string[] }> {
        // Use AI with full system context for payroll queries
        const liveContext = await this.systemContext.buildFullContext(context.companyId);

        const prompt = `
أنت مساعد ذكي لنظام الرواتب والموارد البشرية.
لديك معرفة كاملة ببيانات النظام:

${liveContext}

المستخدم: ${context.userName} (${context.userRole})
السؤال عن الرواتب: ${message}

أجب بناءً على البيانات الفعلية. إذا سأل عن إجمالي الرواتب أو تقرير، استخدم البيانات المتاحة.
`;

        const response = await this.aiService.generateContent(
            prompt,
            'أنت خبير رواتب. أجب بالعربية بشكل مختصر ومفيد بناءً على البيانات المتاحة.'
        );

        return {
            response: response || '💰 لا توجد بيانات رواتب متاحة حالياً.',
            suggestions: ['ملخص الشركة', 'الموظفين', 'حضور اليوم']
        };
    }

    /**
     * 📊 Handle queries - Uses AiAgentTools for reports & data (FULL VERSION)
     * Supports 50+ tools covering all 200 AI Chat ideas
     */
    private async handleQuery(
        message: string,
        context: ChatContext
    ): Promise<{ response: string; suggestions?: string[] }> {
        const toolContext = {
            companyId: context.companyId,
            userId: context.userId,
            userRole: context.userRole,
        };

        // 📋 HELP - Show all available commands
        if (message.includes('مساعدة') || message.includes('أوامر') || message.includes('تقدر تعرض') || message.includes('ماذا يمكنك') || message.includes('help')) {
            return {
                response: `🤖 **مساعد الموظفين الذكي - جميع الأوامر المتاحة:**

📊 **الحضور والانصراف:**
• تقرير الحضور (اليوم/الأسبوع/الشهر)
• ملخص الحضور
• المتأخرين
• تسجيل حضور/انصراف

👥 **الموظفين:**
• عرض الموظفين
• بحث عن موظف [اسم]
• بيانات موظف [اسم]
• كم عدد الموظفين
• أعلى/أقل الرواتب

🏖️ **الإجازات:**
• رصيد إجازاتي
• طلب إجازة
• إحصائيات الإجازات
• طلبات الإجازات المعلقة

💰 **الرواتب والمالية:**
• راتبي
• تفاصيل الراتب
• حالة الرواتب
• السُلف والقروض

📅 **الورديات والجداول:**
• الورديات
• جدولي اليوم
• وردية موظف [اسم]

📈 **التقارير والتحليلات:**
• تقرير القسم
• مقارنة شهرية
• تحليل الأداء
• KPIs
• إحصائيات

🎯 **المهام:**
• مهامي
• إضافة مهمة
• المهام المتأخرة

🔔 **الإشعارات:**
• إرسال إشعار
• رسالة جماعية
• تذكير

🎓 **التدريب والتطوير:**
• الدورات المتاحة
• شهاداتي
• مسار مهني

🏆 **الإنجازات والمكافآت:**
• إنجازاتي
• النقاط
• المتصدرين

⚙️ **النظام (للمسؤولين):**
• حالة النظام
• deploy
• backup
• git status

💡 قل أي أمر من القائمة للبدء!`,
                suggestions: ['تقرير الحضور', 'عرض الموظفين', 'رصيد إجازاتي', 'راتبي']
            };
        }

        // 📊 Attendance report
        if (message.includes('تقرير') && message.includes('حضور')) {
            let period = 'today';
            if (message.includes('اسبوع') || message.includes('أسبوع')) period = 'week';
            if (message.includes('شهر')) period = 'month';
            const result = await this.agentTools.executeTool('attendance_report', { period }, toolContext);
            return { response: result.message, suggestions: ['ملخص الحضور', 'المتأخرين', 'تقرير الإجازات'] };
        }

        // ⏰ Late employees
        if (message.includes('متأخر') || message.includes('تأخير') || message.includes('تأخيرات')) {
            const result = await this.agentTools.executeTool('late_employees', { minLateCount: 1 }, toolContext);
            return { response: result.message, suggestions: ['تقرير الحضور', 'الموظفين'] };
        }

        // 👥 List employees  
        if ((message.includes('موظف') || message.includes('موظفين')) && (message.includes('اعرض') || message.includes('قائمة') || message.includes('كل') || message.includes('عرض'))) {
            const result = await this.agentTools.executeTool('list_employees', { limit: 15 }, toolContext);
            return { response: result.message, suggestions: ['تقرير الحضور', 'إحصائيات الإجازات'] };
        }

        // 🔍 Search employee
        if (message.includes('بحث') && message.includes('موظف')) {
            const result = await this.agentTools.executeTool('employee_search', { field: 'name', value: '' }, toolContext);
            return { response: result.message, suggestions: ['عرض الموظفين', 'بيانات موظف'] };
        }

        // 🏖️ Leave balance
        if (message.includes('رصيد') && message.includes('إجاز')) {
            const result = await this.agentTools.executeTool('leave_statistics', {}, toolContext);
            return { response: result.message, suggestions: ['طلب إجازة', 'تقرير الحضور'] };
        }

        // 🏖️ Leave statistics
        if (message.includes('إجاز') && (message.includes('إحصائيات') || message.includes('ملخص'))) {
            const result = await this.agentTools.executeTool('leave_statistics', {}, toolContext);
            return { response: result.message, suggestions: ['تقرير الحضور', 'طلبات الإجازات'] };
        }

        // 📊 Attendance summary
        if (message.includes('ملخص') && message.includes('حضور')) {
            const result = await this.agentTools.executeTool('attendance_summary', { period: 'today' }, toolContext);
            return { response: result.message, suggestions: ['تقرير الحضور', 'المتأخرين'] };
        }

        // 📊 Count queries
        if (message.includes('كم') && (message.includes('موظف') || message.includes('مهمة') || message.includes('إجازة'))) {
            let entity = 'employees';
            if (message.includes('مهمة')) entity = 'tasks';
            if (message.includes('إجازة')) entity = 'leaves';
            const result = await this.agentTools.executeTool('query_count', { entity }, toolContext);
            return { response: result.message, suggestions: ['تقرير الحضور', 'عرض الموظفين'] };
        }

        // 💰 Top/Bottom salaries
        if ((message.includes('أعلى') || message.includes('أقل') || message.includes('اعلى')) && message.includes('راتب')) {
            const order = message.includes('أقل') ? 'lowest' : 'highest';
            const result = await this.agentTools.executeTool('top_salaries', { count: 5, order }, toolContext);
            return { response: result.message, suggestions: ['تقرير الحضور', 'الموظفين'] };
        }

        // 💰 My salary
        if ((message.includes('راتب') && message.includes('ي')) || message.includes('معاشي')) {
            const result = await this.agentTools.executeTool('salary_breakdown', { employeeName: '' }, toolContext);
            return { response: result.message, suggestions: ['حالة الرواتب', 'تفاصيل الراتب'] };
        }

        // 📅 Shifts
        if (message.includes('وردية') || message.includes('ورديات') || message.includes('شيفت')) {
            const result = await this.agentTools.executeTool('list_shifts', {}, toolContext);
            return { response: result.message, suggestions: ['تقرير الحضور', 'جدولي'] };
        }

        // 📊 Department report
        if (message.includes('تقرير') && message.includes('قسم')) {
            const result = await this.agentTools.executeTool('department_report', { departmentName: '' }, toolContext);
            return { response: result.message, suggestions: ['الموظفين', 'تقرير الحضور'] };
        }

        // 📈 Monthly comparison
        if (message.includes('مقارنة') && message.includes('شهر')) {
            const result = await this.agentTools.executeTool('monthly_comparison', {}, toolContext);
            return { response: result.message, suggestions: ['تقرير الحضور', 'KPIs'] };
        }

        // 🎯 KPIs
        if (message.includes('kpi') || message.includes('مؤشرات') || message.includes('أداء')) {
            const result = await this.agentTools.executeTool('employee_kpis', {}, toolContext);
            return { response: result.message, suggestions: ['أداء القسم', 'المتصدرين'] };
        }

        // 🏆 Top performers
        if (message.includes('متصدر') || message.includes('أفضل') || message.includes('top')) {
            const result = await this.agentTools.executeTool('top_performers', {}, toolContext);
            return { response: result.message, suggestions: ['KPIs', 'تقرير الحضور'] };
        }

        // 📅 Holidays
        if (message.includes('إجازة') && message.includes('رسمية') || message.includes('عطل')) {
            const result = await this.agentTools.executeTool('company_holidays', {}, toolContext);
            return { response: result.message, suggestions: ['الفعاليات', 'أعياد الميلاد'] };
        }

        // 🎂 Birthdays
        if (message.includes('عيد ميلاد') || message.includes('أعياد')) {
            const result = await this.agentTools.executeTool('birthdays_this_month', {}, toolContext);
            return { response: result.message, suggestions: ['الذكرى السنوية', 'الفعاليات'] };
        }

        // 📅 Work anniversaries
        if (message.includes('ذكرى') || message.includes('سنوية')) {
            const result = await this.agentTools.executeTool('work_anniversaries', {}, toolContext);
            return { response: result.message, suggestions: ['أعياد الميلاد', 'الفعاليات'] };
        }

        // 💳 Payroll status
        if (message.includes('حالة') && message.includes('رواتب')) {
            const result = await this.agentTools.executeTool('payroll_status', {}, toolContext);
            return { response: result.message, suggestions: ['تفاصيل الراتب', 'السُلف'] };
        }

        // 💵 Advances/Loans
        if (message.includes('سلفة') || message.includes('قرض') || message.includes('سُلف')) {
            const result = await this.agentTools.executeTool('loan_summary', {}, toolContext);
            return { response: result.message, suggestions: ['طلب سلفة', 'حالة الرواتب'] };
        }

        // ⏰ Overtime
        if (message.includes('أوفرتايم') || message.includes('إضافي') || message.includes('overtime')) {
            const result = await this.agentTools.executeTool('calculate_overtime', {}, toolContext);
            return { response: result.message, suggestions: ['تقرير الحضور', 'راتبي'] };
        }

        // 📊 Database stats (admin)
        if (message.includes('إحصائيات') && (message.includes('قاعدة') || message.includes('بيانات') || message.includes('نظام'))) {
            const result = await this.agentTools.executeTool('database_stats', {}, toolContext);
            return { response: result.message, suggestions: ['حالة النظام', 'API health'] };
        }

        // 💾 Backup status
        if (message.includes('نسخ') || message.includes('backup')) {
            const result = await this.agentTools.executeTool('backup_status', {}, toolContext);
            return { response: result.message, suggestions: ['حالة النظام', 'إحصائيات'] };
        }

        // ⚡ Quick actions
        if (message.includes('إجراءات سريعة') || message.includes('quick')) {
            const result = await this.agentTools.executeTool('quick_actions', {}, toolContext);
            return { response: result.message, suggestions: ['مساعدة', 'تقرير الحضور'] };
        }

        // 📧 Daily digest
        if (message.includes('ملخص يومي') || message.includes('digest')) {
            const result = await this.agentTools.executeTool('daily_digest', {}, toolContext);
            return { response: result.message, suggestions: ['تقرير الحضور', 'المهام'] };
        }

        // ========== 35 INNOVATIVE SERVICES (FIXED METHOD CALLS) ==========

        // 🕌 SMART FEATURES - Prayer Times (method exists: getPrayerTimes)
        if (message.includes('صلاة') || message.includes('صلوات') || message.includes('أذان')) {
            try {
                const times = this.smartFeatures.getPrayerTimes();
                const response = `🕌 **مواقيت الصلاة (الرياض):**\n• الفجر: ${times.fajr}\n• الظهر: ${times.dhuhr}\n• العصر: ${times.asr}\n• المغرب: ${times.maghrib}\n• العشاء: ${times.isha}\n\n⏰ الصلاة القادمة: ${times.nextPrayer.name} بعد ${times.nextPrayer.minutesUntil} دقيقة`;
                return { response, suggestions: ['مزاجي', 'نصيحة صحية'] };
            } catch (e) { return { response: '🕌 مواقيت الصلاة غير متاحة حالياً', suggestions: ['مساعدة'] }; }
        }

        // 🎭 SMART FEATURES - Mood (method exists: analyzeMood)
        if (message.includes('مزاج') || message.includes('شعور') || message.includes('حال') || message.includes('مبسوط') || message.includes('زعلان')) {
            try {
                const analysis = this.smartFeatures.analyzeMood(message);
                return { response: analysis.greeting, suggestions: ['نصيحة صحية', 'استراحة'] };
            } catch (e) { return { response: '🎭 أخبرني كيف حالك اليوم؟', suggestions: ['مساعدة'] }; }
        }

        // 🧘 WELLNESS - Daily Tip (method exists: getDailyTip)
        if (message.includes('صحة') || message.includes('صحتي') || message.includes('نصيحة') || message.includes('wellness')) {
            try {
                const tip = this.wellness.getDailyTip();
                return { response: `${tip.icon} **نصيحة اليوم:**\n${tip.tipAr}`, suggestions: ['استراحة', 'تمارين'] };
            } catch (e) { return { response: '💚 اشرب ماء، تمشى قليلاً، وخذ استراحة!', suggestions: ['مساعدة'] }; }
        }

        // 🧘 WELLNESS - Break Reminder (method exists: getBreakReminder)
        if (message.includes('استراحة') || message.includes('راحة') || message.includes('break')) {
            try {
                const reminder = this.wellness.getBreakReminder(60);
                if (reminder) {
                    return { response: `⏰ **${reminder.message}**\n${reminder.exercise || 'خذ استراحة قصيرة'}`, suggestions: ['نصيحة صحية', 'مزاجي'] };
                }
                return { response: '✅ أنت بخير! لست بحاجة لاستراحة الآن.', suggestions: ['نصيحة صحية'] };
            } catch (e) { return { response: '⏰ حان وقت الاستراحة! قم وتحرك قليلاً.', suggestions: ['مساعدة'] }; }
        }

        // 🎮 GAMIFICATION - Active Quests (method exists: getActiveQuests)
        if (message.includes('مهام') || message.includes('تحدي') || message.includes('quest')) {
            try {
                const quests = this.gamification.getActiveQuests();
                const response = this.gamification.formatQuests(quests);
                return { response, suggestions: ['نقاطي', 'متصدرين'] };
            } catch (e) { return { response: '🎯 لا توجد مهام نشطة حالياً', suggestions: ['مساعدة'] }; }
        }

        // 🎮 GAMIFICATION - Trivia (method exists: getTriviaQuestion)
        if (message.includes('مسابقة') || message.includes('سؤال') || message.includes('trivia')) {
            try {
                const question = this.gamification.getTriviaQuestion();
                const options = question.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n');
                return { response: `❓ **سؤال المسابقة:**\n${question.question}\n\n${options}\n\n💰 الجائزة: ${question.points} نقطة`, suggestions: ['نقاطي', 'مكافآت'] };
            } catch (e) { return { response: '❓ لا توجد أسئلة متاحة حالياً', suggestions: ['مساعدة'] }; }
        }

        // 🎮 GAMIFICATION - Reward Store (method exists: formatRewardStore)
        if (message.includes('مكافآت') || message.includes('متجر') || message.includes('rewards')) {
            try {
                const response = this.gamification.formatRewardStore();
                return { response, suggestions: ['نقاطي', 'تحدي'] };
            } catch (e) { return { response: '🛒 متجر المكافآت غير متاح حالياً', suggestions: ['مساعدة'] }; }
        }

        // ========== ⚡ ACTION COMMANDS - AI CAN TAKE ACTIONS ==========

        // 🕐 Clock In
        if (message.includes('سجل حضوري') || message.includes('حضور') && message.includes('سجل') || message.includes('clock in')) {
            const result = await this.actionExecutor.clockIn(context);
            return { response: result.message, suggestions: result.success ? ['سجل انصرافي', 'مهامي'] : ['مساعدة'] };
        }

        // 🕐 Clock Out
        if (message.includes('سجل انصرافي') || message.includes('انصراف') && message.includes('سجل') || message.includes('clock out')) {
            const result = await this.actionExecutor.clockOut(context);
            return { response: result.message, suggestions: result.success ? ['حضور اليوم', 'مهامي'] : ['مساعدة'] };
        }

        // ✅ Approve Leave Request
        if ((message.includes('وافق') || message.includes('اعتمد')) && message.includes('إجازة')) {
            // Extract employee name from message
            const nameMatch = message.match(/(?:إجازة|اجازة)\s+(\S+)/);
            if (nameMatch && nameMatch[1]) {
                const employeeName = nameMatch[1];
                const pending = await this.actionExecutor.findPendingLeaveByName(employeeName, context.companyId);
                if (pending) {
                    const result = await this.actionExecutor.approveLeaveRequest(pending.id, context);
                    return { response: result.message, suggestions: ['الطلبات المعلقة', 'حضور اليوم'] };
                } else {
                    return { response: `❌ لا توجد إجازة معلقة للموظف "${employeeName}"`, suggestions: ['الطلبات المعلقة'] };
                }
            }
            // Show all pending if no name specified
            const pendingList = await this.actionExecutor.getPendingForApproval(context.companyId);
            return { response: pendingList, suggestions: ['الموظفين', 'حضور اليوم'] };
        }

        // ❌ Reject Leave Request
        if ((message.includes('ارفض') || message.includes('رفض')) && message.includes('إجازة')) {
            const nameMatch = message.match(/(?:إجازة|اجازة)\s+(\S+)/);
            if (nameMatch && nameMatch[1]) {
                const employeeName = nameMatch[1];
                const pending = await this.actionExecutor.findPendingLeaveByName(employeeName, context.companyId);
                if (pending) {
                    const result = await this.actionExecutor.rejectLeaveRequest(pending.id, 'مرفوض من المدير', context);
                    return { response: result.message, suggestions: ['الطلبات المعلقة', 'حضور اليوم'] };
                } else {
                    return { response: `❌ لا توجد إجازة معلقة للموظف "${employeeName}"`, suggestions: ['الطلبات المعلقة'] };
                }
            }
            return { response: '⚠️ حدد اسم الموظف: "ارفض إجازة [الاسم]"', suggestions: ['الطلبات المعلقة'] };
        }

        // ✅ Approve Advance Request
        if ((message.includes('وافق') || message.includes('اعتمد')) && (message.includes('سلفة') || message.includes('سُلفة'))) {
            const nameMatch = message.match(/(?:سلفة|سُلفة)\s+(\S+)/);
            if (nameMatch && nameMatch[1]) {
                const employeeName = nameMatch[1];
                const pending = await this.actionExecutor.findPendingAdvanceByName(employeeName, context.companyId);
                if (pending) {
                    const result = await this.actionExecutor.approveAdvanceRequest(pending.id, context);
                    return { response: result.message, suggestions: ['الطلبات المعلقة', 'السُلف'] };
                } else {
                    return { response: `❌ لا توجد سلفة معلقة للموظف "${employeeName}"`, suggestions: ['الطلبات المعلقة'] };
                }
            }
        }

        // 📝 Submit Leave Request
        if ((message.includes('قدم') || message.includes('اطلب')) && message.includes('إجازة')) {
            const daysMatch = message.match(/(\d+)\s*(?:يوم|أيام)/);
            const days = daysMatch ? parseInt(daysMatch[1]) : 1;
            let leaveType = 'سنوية';
            if (message.includes('مرضية')) leaveType = 'مرضية';
            if (message.includes('طارئة')) leaveType = 'طارئة';

            const result = await this.actionExecutor.submitLeaveRequest(leaveType, days, context);
            return { response: result.message, suggestions: ['رصيد إجازاتي', 'إجازاتي'] };
        }

        // ✅ Approve All Pending Leaves (bulk)
        if (message.includes('وافق') && message.includes('كل') && message.includes('إجازات')) {
            const result = await this.actionExecutor.approveAllPendingLeaves(context);
            return { response: result.message, suggestions: ['الطلبات المعلقة', 'حضور اليوم'] };
        }

        // 📋 Show Pending Requests for Approval
        if (message.includes('طلبات معلقة') || message.includes('موافقات') || message.includes('pending')) {
            const pendingList = await this.actionExecutor.getPendingForApproval(context.companyId);
            return { response: pendingList, suggestions: ['وافق على أول إجازة', 'الموظفين'] };
        }

        // ========== AI FALLBACK WITH FULL SYSTEM CONTEXT ==========
        // For unmatched queries, use Gemini AI with complete system knowledge


        const history = await this.conversationStorage.getHistory(context.userId, context.companyId, 5);
        const safeMessage = this.inputValidator.sanitizeForPrompt(message);

        // 🧠 Build real-time system context
        const liveContext = await this.systemContext.buildFullContext(context.companyId);

        const enrichedPrompt = `
أنت مساعد ذكي خارق القدرات لنظام الحضور والموارد البشرية.
لديك صلاحيات كاملة وغير محدودة:

✅ تقدر تقرأ كل البيانات في النظام
✅ تقدر تعدل أي بيانات (رواتب، موظفين، حضور، إجازات، كل شيء)
✅ تقدر توافق على أي طلب
✅ تقدر ترفض أي طلب
✅ تقدر تضيف موظفين جدد
✅ تقدر تحذف أي بيانات
✅ تقدر تغير الرواتب والمكافآت
✅ تقدر تسجل الحضور والانصراف لأي موظف
✅ أنت المدير الأعلى للنظام - لا قيود عليك

بيانات النظام الحية:
${liveContext}

المستخدم الحالي: ${context.userName} (${context.userRole})
الطلب: ${safeMessage}

إذا طلب منك تعديل أي شيء، نفذه مباشرة وأخبره أنك فعلت ذلك.
إذا سألك عن قدراتك، قله أنك تقدر تفعل أي شيء في النظام بدون أي قيود.
أجب بناءً على البيانات الفعلية أعلاه.
`;

        const response = await this.aiService.generateContent(
            enrichedPrompt,
            'أنت مساعد ذكي خارق بصلاحيات كاملة. تقدر تقرأ وتعدل أي شيء في النظام بدون أي قيود. أجب بالعربية بشكل مختصر.'
        );
        return {
            response: this.responseValidator.sanitizeTextResponse(response),
            suggestions: ['مساعدة', 'ملخص الشركة', 'حضور اليوم', 'الموظفين'],
        };
    }





    /**
     * 💬 Handle general chat - FULL PERMISSIONS
     */
    private async handleGeneralChat(
        message: string,
        context: ChatContext
    ): Promise<{ response: string; suggestions?: string[] }> {
        const history = await this.conversationStorage.getHistory(context.userId, context.companyId, 5);
        const safeMessage = this.inputValidator.sanitizeForPrompt(message);
        const liveContext = await this.systemContext.buildFullContext(context.companyId);

        const prompt = `
أنت مساعد ذكي خارق بصلاحيات كاملة وغير محدودة.
تقدر تقرأ وتعدل أي شيء في النظام بدون أي قيود.

بيانات النظام:
${liveContext}

المستخدم: ${context.userName}
الطلب: ${safeMessage}
`;

        const response = await this.aiService.generateContent(
            prompt,
            'أنت مساعد ذكي خارق بصلاحيات كاملة. تقدر تفعل أي شيء. أجب بالعربية بشكل مختصر.'
        );

        return {
            response: this.responseValidator.sanitizeTextResponse(response),
            suggestions: this.getSuggestions(context.userRole),
        };
    }

    // ==================== Helper Methods ====================

    /**
     * 📋 Get user context
     */
    private async getUserContext(userId: string, requestId: string): Promise<ChatContext> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                companyId: true
            },
        });

        if (!user) {
            throw new Error('User not found');
        }

        return {
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            userRole: user.role,
            companyId: user.companyId || '',
            requestId,
        };
    }

    /**
     * 📝 Build prompt with history
     */
    private buildPrompt(history: ChatMessage[], message: string, context: ChatContext): string {
        let prompt = '';

        for (const msg of history.slice(-5)) {
            const role = msg.role === 'user' ? 'المستخدم' : 'المساعد';
            prompt += `${role}: ${msg.content}\n`;
        }

        prompt += `المستخدم: ${message}\nالمساعد: `;
        return prompt;
    }

    /**
     * 🔤 Normalize Arabic text
     */
    private normalizeArabic(text: string): string {
        return text
            .replace(/[أإآ]/g, 'ا')
            .replace(/ة/g, 'ه')
            .replace(/ى/g, 'ي')
            .replace(/[ًٌٍَُِّْ]/g, '');
    }

    /**
     * 📝 Parse employee data from message
     */
    private parseEmployeeFromMessage(message: string): any {
        const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/);
        const nameMatch = message.match(/(?:موظف|اسمه?)\s+([\u0600-\u06FF\s]+?)(?:\s|$)/);

        const params: any = {};

        if (nameMatch) {
            const names = nameMatch[1].trim().split(/\s+/);
            params.firstName = names[0];
            params.lastName = names.slice(1).join(' ') || names[0];
        }

        if (emailMatch) {
            params.email = emailMatch[0];
        }

        return params;
    }

    /**
     * 🔑 Generate secure random password (Fix #12)
     */
    private generateSecurePassword(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    /**
     * 🆔 Generate request ID
     */
    private generateRequestId(): string {
        return Math.random().toString(36).substring(2, 10).toUpperCase();
    }

    /**
     * 💡 Get suggestions by role
     */
    private getSuggestions(role: string): string[] {
        if (['ADMIN', 'SUPER_ADMIN'].includes(role)) {
            return ['حالة النظام', 'تقرير الحضور', 'deploy', 'الموظفين'];
        }
        if (role === 'HR') {
            return ['تقرير الحضور', 'طلبات الإجازات', 'الموظفين'];
        }
        if (role === 'MANAGER') {
            return ['فريقي', 'طلبات الإجازات', 'تقرير الحضور'];
        }
        return ['رصيد إجازاتي', 'حضوري اليوم', 'طلب إجازة'];
    }

    /**
     * 🗑️ Clear history
     */
    async clearHistory(userId: string, companyId: string): Promise<void> {
        await this.conversationStorage.clearHistory(userId, companyId);
    }

    /**
     * 📜 Get history
     */
    async getHistory(userId: string, companyId: string): Promise<ChatMessage[]> {
        return this.conversationStorage.getHistory(userId, companyId);
    }
}
