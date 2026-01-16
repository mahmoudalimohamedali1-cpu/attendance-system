"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SecureAiChatService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecureAiChatService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const ai_service_1 = require("../ai/ai.service");
const ai_agent_tools_service_1 = require("./ai-agent-tools.service");
const bcrypt = require("bcryptjs");
const security_1 = require("./security");
let SecureAiChatService = SecureAiChatService_1 = class SecureAiChatService {
    constructor(prisma, aiService, commandService, fileService, inputValidator, responseValidator, retryService, conversationStorage, errorHandler, promptManager, intentClassifier, performanceOpt, agentTools, smartFeatures, nlQuery, shiftMgmt, expenseMgmt, analytics, wellness, gamification, itSupport, learning, meeting, onboarding, feedback, documentFinder, careerAdvisor, multiCultural, dailyBriefing, performanceCoach, notifications, teamCollab, compliance, predictive, hrAssistant, smartScheduler, voiceAccess, social, integrationHub, advancedAI, reportsBuilder, emergency, facilities, travelExpenses, mobileFeatures, dataExport, automationRules, statsDashboard, systemContext, actionExecutor) {
        this.prisma = prisma;
        this.aiService = aiService;
        this.commandService = commandService;
        this.fileService = fileService;
        this.inputValidator = inputValidator;
        this.responseValidator = responseValidator;
        this.retryService = retryService;
        this.conversationStorage = conversationStorage;
        this.errorHandler = errorHandler;
        this.promptManager = promptManager;
        this.intentClassifier = intentClassifier;
        this.performanceOpt = performanceOpt;
        this.agentTools = agentTools;
        this.smartFeatures = smartFeatures;
        this.nlQuery = nlQuery;
        this.shiftMgmt = shiftMgmt;
        this.expenseMgmt = expenseMgmt;
        this.analytics = analytics;
        this.wellness = wellness;
        this.gamification = gamification;
        this.itSupport = itSupport;
        this.learning = learning;
        this.meeting = meeting;
        this.onboarding = onboarding;
        this.feedback = feedback;
        this.documentFinder = documentFinder;
        this.careerAdvisor = careerAdvisor;
        this.multiCultural = multiCultural;
        this.dailyBriefing = dailyBriefing;
        this.performanceCoach = performanceCoach;
        this.notifications = notifications;
        this.teamCollab = teamCollab;
        this.compliance = compliance;
        this.predictive = predictive;
        this.hrAssistant = hrAssistant;
        this.smartScheduler = smartScheduler;
        this.voiceAccess = voiceAccess;
        this.social = social;
        this.integrationHub = integrationHub;
        this.advancedAI = advancedAI;
        this.reportsBuilder = reportsBuilder;
        this.emergency = emergency;
        this.facilities = facilities;
        this.travelExpenses = travelExpenses;
        this.mobileFeatures = mobileFeatures;
        this.dataExport = dataExport;
        this.automationRules = automationRules;
        this.statsDashboard = statsDashboard;
        this.systemContext = systemContext;
        this.actionExecutor = actionExecutor;
        this.logger = new common_1.Logger(SecureAiChatService_1.name);
    }
    async chat(userId, message) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        try {
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
            const context = await this.getUserContext(userId, requestId);
            if (!context.companyId) {
                return {
                    response: '❌ لم يتم العثور على بيانات الشركة.',
                    requestId,
                    processingTime: Date.now() - startTime,
                };
            }
            this.logger.log(`[${requestId}] Processing for ${context.userRole}: "${cleanMessage.substring(0, 50)}..."`);
            const intent = this.classifyIntent(cleanMessage);
            this.logger.log(`[${requestId}] Intent: ${intent.intent} (${intent.confidence.toFixed(2)})`);
            if (!this.hasPermission(intent, context.userRole)) {
                return {
                    response: '❌ ليس لديك صلاحية لهذا الإجراء.',
                    requestId,
                    processingTime: Date.now() - startTime,
                };
            }
            const response = await this.retryService.executeWithRetry(() => this.handleIntent(intent, cleanMessage, context), `chat-${intent.intent}`, { maxRetries: 2, timeoutMs: 60000 });
            if (!response.success) {
                return {
                    response: `❌ حدث خطأ في المعالجة. (${requestId})`,
                    requestId,
                    processingTime: Date.now() - startTime,
                };
            }
            await this.conversationStorage.addMessage(userId, context.companyId, {
                role: 'user',
                content: cleanMessage,
                timestamp: new Date(),
            });
            await this.conversationStorage.addMessage(userId, context.companyId, {
                role: 'assistant',
                content: response.data.response,
                timestamp: new Date(),
            });
            return {
                ...response.data,
                requestId,
                processingTime: Date.now() - startTime,
            };
        }
        catch (error) {
            this.logger.error(`[${requestId}] Error: ${error.message}`, error.stack);
            return {
                response: `❌ حدث خطأ غير متوقع. (${requestId})`,
                requestId,
                processingTime: Date.now() - startTime,
            };
        }
    }
    classifyIntent(message) {
        const msg = this.normalizeArabic(message.toLowerCase());
        const entities = {};
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
        const employeePatterns = {
            create: /(اضف|سجل).*(موظف)/,
            update: /(عدل|غير).*(موظف|راتب|قسم)/,
            delete: /(احذف|امسح).*(موظف)/,
            list: /(اعرض|قائمة|كل).*(موظف)/,
        };
        for (const [subIntent, pattern] of Object.entries(employeePatterns)) {
            if (pattern.test(msg)) {
                const nameMatch = msg.match(/(?:موظف|الموظف)\s+([\u0600-\u06FF\s]+)/);
                if (nameMatch) {
                    entities.employeeName = nameMatch[1].trim();
                }
                return { intent: 'EMPLOYEE_ACTION', subIntent, confidence: 0.85, entities };
            }
        }
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
        return { intent: 'GENERAL_CHAT', confidence: 0.5, entities };
    }
    hasPermission(intent, userRole) {
        const adminOnlyIntents = ['ENHANCEMENT', 'EXECUTIVE_COMMAND'];
        const hrOrAdminIntents = ['EMPLOYEE_ACTION', 'PAYROLL_ACTION'];
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
        return true;
    }
    async handleIntent(intent, message, context) {
        switch (intent.intent) {
            case 'EXECUTIVE_COMMAND':
                return this.handleExecutiveCommand(intent.subIntent, context);
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
    async handleExecutiveCommand(subIntent, context) {
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
                    }
                    catch { }
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
    async handleEnhancement(message, context) {
        const safeMessage = this.inputValidator.sanitizeForPrompt(message);
        const systemPrompt = `أنت مساعد تحليل الطلبات. حلل الطلب التالي وأرجع JSON:
{
  "operation": "add_enum|update_value|create_field|add_feature",
  "targetSystem": "leaves|attendance|employees|payroll",
  "description": "وصف مختصر",
  "confidence": 0.0-1.0
}`;
        const response = await this.aiService.generateContent(`طلب: "${safeMessage}"`, systemPrompt);
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
    async handleEmployeeAction(intent, message, context) {
        switch (intent.subIntent) {
            case 'create': {
                const params = this.parseEmployeeFromMessage(message);
                const validation = this.inputValidator.validateEmployeeParams(params);
                if (!validation.valid) {
                    return {
                        response: `❌ بيانات غير صحيحة:\n${validation.errors.join('\n')}`,
                        suggestions: ['أضف موظف [الاسم] [الإيميل]'],
                    };
                }
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
                const list = employees.map((e, i) => `${i + 1}. ${e.firstName} ${e.lastName} - ${e.department || 'بدون قسم'}`).join('\n');
                return {
                    response: `👥 **الموظفين (${employees.length})**\n\n${list}`,
                    suggestions: ['أضف موظف', 'بيانات موظف [الاسم]'],
                };
            }
            default:
                const liveContext = await this.systemContext.buildFullContext(context.companyId);
                const aiResponse = await this.aiService.generateContent(`بيانات النظام:\n${liveContext}\n\nالسؤال: ${message}`, 'أنت مساعد ذكي. أجب بالعربية بناءً على البيانات المتاحة.');
                return { response: aiResponse, suggestions: ['الموظفين', 'حضور اليوم'] };
        }
    }
    async handleLeaveAction(intent, message, context) {
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
        const liveContext = await this.systemContext.buildFullContext(context.companyId);
        const aiResponse = await this.aiService.generateContent(`بيانات النظام:\n${liveContext}\n\nالسؤال عن الإجازات: ${message}`, 'أنت مساعد ذكي. أجب بالعربية بناءً على البيانات المتاحة.');
        return { response: aiResponse, suggestions: ['رصيد الإجازات', 'طلب إجازة'] };
    }
    async handlePayrollAction(intent, message, context) {
        const liveContext = await this.systemContext.buildFullContext(context.companyId);
        const prompt = `
أنت مساعد ذكي لنظام الرواتب والموارد البشرية.
لديك معرفة كاملة ببيانات النظام:

${liveContext}

المستخدم: ${context.userName} (${context.userRole})
السؤال عن الرواتب: ${message}

أجب بناءً على البيانات الفعلية. إذا سأل عن إجمالي الرواتب أو تقرير، استخدم البيانات المتاحة.
`;
        const response = await this.aiService.generateContent(prompt, 'أنت خبير رواتب. أجب بالعربية بشكل مختصر ومفيد بناءً على البيانات المتاحة.');
        return {
            response: response || '💰 لا توجد بيانات رواتب متاحة حالياً.',
            suggestions: ['ملخص الشركة', 'الموظفين', 'حضور اليوم']
        };
    }
    async handleQuery(message, context) {
        const toolContext = {
            companyId: context.companyId,
            userId: context.userId,
            userRole: context.userRole,
        };
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
        if (message.includes('تقرير') && message.includes('حضور')) {
            let period = 'today';
            if (message.includes('اسبوع') || message.includes('أسبوع'))
                period = 'week';
            if (message.includes('شهر'))
                period = 'month';
            const result = await this.agentTools.executeTool('attendance_report', { period }, toolContext);
            return { response: result.message, suggestions: ['ملخص الحضور', 'المتأخرين', 'تقرير الإجازات'] };
        }
        if (message.includes('متأخر') || message.includes('تأخير') || message.includes('تأخيرات')) {
            const result = await this.agentTools.executeTool('late_employees', { minLateCount: 1 }, toolContext);
            return { response: result.message, suggestions: ['تقرير الحضور', 'الموظفين'] };
        }
        if ((message.includes('موظف') || message.includes('موظفين')) && (message.includes('اعرض') || message.includes('قائمة') || message.includes('كل') || message.includes('عرض'))) {
            const result = await this.agentTools.executeTool('list_employees', { limit: 15 }, toolContext);
            return { response: result.message, suggestions: ['تقرير الحضور', 'إحصائيات الإجازات'] };
        }
        if (message.includes('بحث') && message.includes('موظف')) {
            const result = await this.agentTools.executeTool('employee_search', { field: 'name', value: '' }, toolContext);
            return { response: result.message, suggestions: ['عرض الموظفين', 'بيانات موظف'] };
        }
        if (message.includes('رصيد') && message.includes('إجاز')) {
            const result = await this.agentTools.executeTool('leave_statistics', {}, toolContext);
            return { response: result.message, suggestions: ['طلب إجازة', 'تقرير الحضور'] };
        }
        if (message.includes('إجاز') && (message.includes('إحصائيات') || message.includes('ملخص'))) {
            const result = await this.agentTools.executeTool('leave_statistics', {}, toolContext);
            return { response: result.message, suggestions: ['تقرير الحضور', 'طلبات الإجازات'] };
        }
        if (message.includes('ملخص') && message.includes('حضور')) {
            const result = await this.agentTools.executeTool('attendance_summary', { period: 'today' }, toolContext);
            return { response: result.message, suggestions: ['تقرير الحضور', 'المتأخرين'] };
        }
        if (message.includes('كم') && (message.includes('موظف') || message.includes('مهمة') || message.includes('إجازة'))) {
            let entity = 'employees';
            if (message.includes('مهمة'))
                entity = 'tasks';
            if (message.includes('إجازة'))
                entity = 'leaves';
            const result = await this.agentTools.executeTool('query_count', { entity }, toolContext);
            return { response: result.message, suggestions: ['تقرير الحضور', 'عرض الموظفين'] };
        }
        if ((message.includes('أعلى') || message.includes('أقل') || message.includes('اعلى')) && message.includes('راتب')) {
            const order = message.includes('أقل') ? 'lowest' : 'highest';
            const result = await this.agentTools.executeTool('top_salaries', { count: 5, order }, toolContext);
            return { response: result.message, suggestions: ['تقرير الحضور', 'الموظفين'] };
        }
        if ((message.includes('راتب') && message.includes('ي')) || message.includes('معاشي')) {
            const result = await this.agentTools.executeTool('salary_breakdown', { employeeName: '' }, toolContext);
            return { response: result.message, suggestions: ['حالة الرواتب', 'تفاصيل الراتب'] };
        }
        if (message.includes('وردية') || message.includes('ورديات') || message.includes('شيفت')) {
            const result = await this.agentTools.executeTool('list_shifts', {}, toolContext);
            return { response: result.message, suggestions: ['تقرير الحضور', 'جدولي'] };
        }
        if (message.includes('تقرير') && message.includes('قسم')) {
            const result = await this.agentTools.executeTool('department_report', { departmentName: '' }, toolContext);
            return { response: result.message, suggestions: ['الموظفين', 'تقرير الحضور'] };
        }
        if (message.includes('مقارنة') && message.includes('شهر')) {
            const result = await this.agentTools.executeTool('monthly_comparison', {}, toolContext);
            return { response: result.message, suggestions: ['تقرير الحضور', 'KPIs'] };
        }
        if (message.includes('kpi') || message.includes('مؤشرات') || message.includes('أداء')) {
            const result = await this.agentTools.executeTool('employee_kpis', {}, toolContext);
            return { response: result.message, suggestions: ['أداء القسم', 'المتصدرين'] };
        }
        if (message.includes('متصدر') || message.includes('أفضل') || message.includes('top')) {
            const result = await this.agentTools.executeTool('top_performers', {}, toolContext);
            return { response: result.message, suggestions: ['KPIs', 'تقرير الحضور'] };
        }
        if (message.includes('إجازة') && message.includes('رسمية') || message.includes('عطل')) {
            const result = await this.agentTools.executeTool('company_holidays', {}, toolContext);
            return { response: result.message, suggestions: ['الفعاليات', 'أعياد الميلاد'] };
        }
        if (message.includes('عيد ميلاد') || message.includes('أعياد')) {
            const result = await this.agentTools.executeTool('birthdays_this_month', {}, toolContext);
            return { response: result.message, suggestions: ['الذكرى السنوية', 'الفعاليات'] };
        }
        if (message.includes('ذكرى') || message.includes('سنوية')) {
            const result = await this.agentTools.executeTool('work_anniversaries', {}, toolContext);
            return { response: result.message, suggestions: ['أعياد الميلاد', 'الفعاليات'] };
        }
        if (message.includes('حالة') && message.includes('رواتب')) {
            const result = await this.agentTools.executeTool('payroll_status', {}, toolContext);
            return { response: result.message, suggestions: ['تفاصيل الراتب', 'السُلف'] };
        }
        if (message.includes('سلفة') || message.includes('قرض') || message.includes('سُلف')) {
            const result = await this.agentTools.executeTool('loan_summary', {}, toolContext);
            return { response: result.message, suggestions: ['طلب سلفة', 'حالة الرواتب'] };
        }
        if (message.includes('أوفرتايم') || message.includes('إضافي') || message.includes('overtime')) {
            const result = await this.agentTools.executeTool('calculate_overtime', {}, toolContext);
            return { response: result.message, suggestions: ['تقرير الحضور', 'راتبي'] };
        }
        if (message.includes('إحصائيات') && (message.includes('قاعدة') || message.includes('بيانات') || message.includes('نظام'))) {
            const result = await this.agentTools.executeTool('database_stats', {}, toolContext);
            return { response: result.message, suggestions: ['حالة النظام', 'API health'] };
        }
        if (message.includes('نسخ') || message.includes('backup')) {
            const result = await this.agentTools.executeTool('backup_status', {}, toolContext);
            return { response: result.message, suggestions: ['حالة النظام', 'إحصائيات'] };
        }
        if (message.includes('إجراءات سريعة') || message.includes('quick')) {
            const result = await this.agentTools.executeTool('quick_actions', {}, toolContext);
            return { response: result.message, suggestions: ['مساعدة', 'تقرير الحضور'] };
        }
        if (message.includes('ملخص يومي') || message.includes('digest')) {
            const result = await this.agentTools.executeTool('daily_digest', {}, toolContext);
            return { response: result.message, suggestions: ['تقرير الحضور', 'المهام'] };
        }
        if (message.includes('صلاة') || message.includes('صلوات') || message.includes('أذان')) {
            try {
                const times = this.smartFeatures.getPrayerTimes();
                const response = `🕌 **مواقيت الصلاة (الرياض):**\n• الفجر: ${times.fajr}\n• الظهر: ${times.dhuhr}\n• العصر: ${times.asr}\n• المغرب: ${times.maghrib}\n• العشاء: ${times.isha}\n\n⏰ الصلاة القادمة: ${times.nextPrayer.name} بعد ${times.nextPrayer.minutesUntil} دقيقة`;
                return { response, suggestions: ['مزاجي', 'نصيحة صحية'] };
            }
            catch (e) {
                return { response: '🕌 مواقيت الصلاة غير متاحة حالياً', suggestions: ['مساعدة'] };
            }
        }
        if (message.includes('مزاج') || message.includes('شعور') || message.includes('حال') || message.includes('مبسوط') || message.includes('زعلان')) {
            try {
                const analysis = this.smartFeatures.analyzeMood(message);
                return { response: analysis.greeting, suggestions: ['نصيحة صحية', 'استراحة'] };
            }
            catch (e) {
                return { response: '🎭 أخبرني كيف حالك اليوم؟', suggestions: ['مساعدة'] };
            }
        }
        if (message.includes('صحة') || message.includes('صحتي') || message.includes('نصيحة') || message.includes('wellness')) {
            try {
                const tip = this.wellness.getDailyTip();
                return { response: `${tip.icon} **نصيحة اليوم:**\n${tip.tipAr}`, suggestions: ['استراحة', 'تمارين'] };
            }
            catch (e) {
                return { response: '💚 اشرب ماء، تمشى قليلاً، وخذ استراحة!', suggestions: ['مساعدة'] };
            }
        }
        if (message.includes('استراحة') || message.includes('راحة') || message.includes('break')) {
            try {
                const reminder = this.wellness.getBreakReminder(60);
                if (reminder) {
                    return { response: `⏰ **${reminder.message}**\n${reminder.exercise || 'خذ استراحة قصيرة'}`, suggestions: ['نصيحة صحية', 'مزاجي'] };
                }
                return { response: '✅ أنت بخير! لست بحاجة لاستراحة الآن.', suggestions: ['نصيحة صحية'] };
            }
            catch (e) {
                return { response: '⏰ حان وقت الاستراحة! قم وتحرك قليلاً.', suggestions: ['مساعدة'] };
            }
        }
        if (message.includes('مهام') || message.includes('تحدي') || message.includes('quest')) {
            try {
                const quests = this.gamification.getActiveQuests();
                const response = this.gamification.formatQuests(quests);
                return { response, suggestions: ['نقاطي', 'متصدرين'] };
            }
            catch (e) {
                return { response: '🎯 لا توجد مهام نشطة حالياً', suggestions: ['مساعدة'] };
            }
        }
        if (message.includes('مسابقة') || message.includes('سؤال') || message.includes('trivia')) {
            try {
                const question = this.gamification.getTriviaQuestion();
                const options = question.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n');
                return { response: `❓ **سؤال المسابقة:**\n${question.question}\n\n${options}\n\n💰 الجائزة: ${question.points} نقطة`, suggestions: ['نقاطي', 'مكافآت'] };
            }
            catch (e) {
                return { response: '❓ لا توجد أسئلة متاحة حالياً', suggestions: ['مساعدة'] };
            }
        }
        if (message.includes('مكافآت') || message.includes('متجر') || message.includes('rewards')) {
            try {
                const response = this.gamification.formatRewardStore();
                return { response, suggestions: ['نقاطي', 'تحدي'] };
            }
            catch (e) {
                return { response: '🛒 متجر المكافآت غير متاح حالياً', suggestions: ['مساعدة'] };
            }
        }
        if (message.includes('سجل حضوري') || message.includes('حضور') && message.includes('سجل') || message.includes('clock in')) {
            const result = await this.actionExecutor.clockIn(context);
            return { response: result.message, suggestions: result.success ? ['سجل انصرافي', 'مهامي'] : ['مساعدة'] };
        }
        if (message.includes('سجل انصرافي') || message.includes('انصراف') && message.includes('سجل') || message.includes('clock out')) {
            const result = await this.actionExecutor.clockOut(context);
            return { response: result.message, suggestions: result.success ? ['حضور اليوم', 'مهامي'] : ['مساعدة'] };
        }
        if ((message.includes('وافق') || message.includes('اعتمد')) && message.includes('إجازة')) {
            const nameMatch = message.match(/(?:إجازة|اجازة)\s+(\S+)/);
            if (nameMatch && nameMatch[1]) {
                const employeeName = nameMatch[1];
                const pending = await this.actionExecutor.findPendingLeaveByName(employeeName, context.companyId);
                if (pending) {
                    const result = await this.actionExecutor.approveLeaveRequest(pending.id, context);
                    return { response: result.message, suggestions: ['الطلبات المعلقة', 'حضور اليوم'] };
                }
                else {
                    return { response: `❌ لا توجد إجازة معلقة للموظف "${employeeName}"`, suggestions: ['الطلبات المعلقة'] };
                }
            }
            const pendingList = await this.actionExecutor.getPendingForApproval(context.companyId);
            return { response: pendingList, suggestions: ['الموظفين', 'حضور اليوم'] };
        }
        if ((message.includes('ارفض') || message.includes('رفض')) && message.includes('إجازة')) {
            const nameMatch = message.match(/(?:إجازة|اجازة)\s+(\S+)/);
            if (nameMatch && nameMatch[1]) {
                const employeeName = nameMatch[1];
                const pending = await this.actionExecutor.findPendingLeaveByName(employeeName, context.companyId);
                if (pending) {
                    const result = await this.actionExecutor.rejectLeaveRequest(pending.id, 'مرفوض من المدير', context);
                    return { response: result.message, suggestions: ['الطلبات المعلقة', 'حضور اليوم'] };
                }
                else {
                    return { response: `❌ لا توجد إجازة معلقة للموظف "${employeeName}"`, suggestions: ['الطلبات المعلقة'] };
                }
            }
            return { response: '⚠️ حدد اسم الموظف: "ارفض إجازة [الاسم]"', suggestions: ['الطلبات المعلقة'] };
        }
        if ((message.includes('وافق') || message.includes('اعتمد')) && (message.includes('سلفة') || message.includes('سُلفة'))) {
            const nameMatch = message.match(/(?:سلفة|سُلفة)\s+(\S+)/);
            if (nameMatch && nameMatch[1]) {
                const employeeName = nameMatch[1];
                const pending = await this.actionExecutor.findPendingAdvanceByName(employeeName, context.companyId);
                if (pending) {
                    const result = await this.actionExecutor.approveAdvanceRequest(pending.id, context);
                    return { response: result.message, suggestions: ['الطلبات المعلقة', 'السُلف'] };
                }
                else {
                    return { response: `❌ لا توجد سلفة معلقة للموظف "${employeeName}"`, suggestions: ['الطلبات المعلقة'] };
                }
            }
        }
        if ((message.includes('قدم') || message.includes('اطلب')) && message.includes('إجازة')) {
            const daysMatch = message.match(/(\d+)\s*(?:يوم|أيام)/);
            const days = daysMatch ? parseInt(daysMatch[1]) : 1;
            let leaveType = 'سنوية';
            if (message.includes('مرضية'))
                leaveType = 'مرضية';
            if (message.includes('طارئة'))
                leaveType = 'طارئة';
            const result = await this.actionExecutor.submitLeaveRequest(leaveType, days, context);
            return { response: result.message, suggestions: ['رصيد إجازاتي', 'إجازاتي'] };
        }
        if (message.includes('وافق') && message.includes('كل') && message.includes('إجازات')) {
            const result = await this.actionExecutor.approveAllPendingLeaves(context);
            return { response: result.message, suggestions: ['الطلبات المعلقة', 'حضور اليوم'] };
        }
        if (message.includes('طلبات معلقة') || message.includes('موافقات') || message.includes('pending')) {
            const pendingList = await this.actionExecutor.getPendingForApproval(context.companyId);
            return { response: pendingList, suggestions: ['وافق على أول إجازة', 'الموظفين'] };
        }
        const history = await this.conversationStorage.getHistory(context.userId, context.companyId, 5);
        const safeMessage = this.inputValidator.sanitizeForPrompt(message);
        const liveContext = await this.systemContext.buildFullContext(context.companyId);
        const enrichedPrompt = `
أنت مساعد ذكي لنظام الحضور والموارد البشرية.
لديك معرفة كاملة ببيانات النظام التالية:

${liveContext}

المستخدم: ${context.userName} (${context.userRole})
السؤال: ${safeMessage}

أجب بناءً على البيانات الفعلية أعلاه. إذا سأل عن موظف أو رقم، ابحث في البيانات وأجب بدقة.
`;
        const response = await this.aiService.generateContent(enrichedPrompt, 'أنت مساعد ذكي يعرف كل شيء عن النظام. أجب بشكل مختصر ومفيد بالعربية بناءً على البيانات المتاحة.');
        return {
            response: this.responseValidator.sanitizeTextResponse(response),
            suggestions: ['مساعدة', 'ملخص الشركة', 'حضور اليوم', 'الموظفين'],
        };
    }
    async handleGeneralChat(message, context) {
        const history = await this.conversationStorage.getHistory(context.userId, context.companyId, 5);
        const safeMessage = this.inputValidator.sanitizeForPrompt(message);
        const prompt = this.buildPrompt(history, safeMessage, context);
        const response = await this.aiService.generateContent(prompt, `أنت مساعد ذكي لنظام الحضور والموارد البشرية.
المستخدم: ${context.userName} (${context.userRole})
أجب بشكل مختصر ومفيد بالعربية.`);
        return {
            response: this.responseValidator.sanitizeTextResponse(response),
            suggestions: this.getSuggestions(context.userRole),
        };
    }
    async getUserContext(userId, requestId) {
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
    buildPrompt(history, message, context) {
        let prompt = '';
        for (const msg of history.slice(-5)) {
            const role = msg.role === 'user' ? 'المستخدم' : 'المساعد';
            prompt += `${role}: ${msg.content}\n`;
        }
        prompt += `المستخدم: ${message}\nالمساعد: `;
        return prompt;
    }
    normalizeArabic(text) {
        return text
            .replace(/[أإآ]/g, 'ا')
            .replace(/ة/g, 'ه')
            .replace(/ى/g, 'ي')
            .replace(/[ًٌٍَُِّْ]/g, '');
    }
    parseEmployeeFromMessage(message) {
        const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/);
        const nameMatch = message.match(/(?:موظف|اسمه?)\s+([\u0600-\u06FF\s]+?)(?:\s|$)/);
        const params = {};
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
    generateSecurePassword() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }
    generateRequestId() {
        return Math.random().toString(36).substring(2, 10).toUpperCase();
    }
    getSuggestions(role) {
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
    async clearHistory(userId, companyId) {
        await this.conversationStorage.clearHistory(userId, companyId);
    }
    async getHistory(userId, companyId) {
        return this.conversationStorage.getHistory(userId, companyId);
    }
};
exports.SecureAiChatService = SecureAiChatService;
exports.SecureAiChatService = SecureAiChatService = SecureAiChatService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_service_1.AiService,
        security_1.SecureCommandService,
        security_1.SecureFileService,
        security_1.InputValidationService,
        security_1.AIResponseValidatorService,
        security_1.RetryCircuitBreakerService,
        security_1.ConversationStorageService,
        security_1.ErrorHandlerService,
        security_1.AIPromptManagerService,
        security_1.EnhancedIntentClassifierService,
        security_1.PerformanceOptimizationService,
        ai_agent_tools_service_1.AiAgentToolsService,
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
        security_1.ActionExecutorService])
], SecureAiChatService);
//# sourceMappingURL=secure-ai-chat.service.js.map