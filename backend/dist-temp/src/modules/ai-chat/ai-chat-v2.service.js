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
var AiChatServiceV2_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiChatServiceV2 = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const ai_service_1 = require("../ai/ai.service");
const uuid_1 = require("uuid");
const intent_classifier_service_1 = require("./services/intent-classifier.service");
const enhancement_service_1 = require("./services/enhancement.service");
const safe_executor_service_1 = require("./services/safe-executor.service");
const response_validator_service_1 = require("./services/response-validator.service");
const conversation_storage_service_1 = require("./services/conversation-storage.service");
const retry_service_1 = require("./services/retry.service");
const input_sanitizer_service_1 = require("./services/input-sanitizer.service");
let AiChatServiceV2 = AiChatServiceV2_1 = class AiChatServiceV2 {
    constructor(prisma, aiService, intentClassifier, enhancementService, safeExecutor, responseValidator, conversationStorage, retryService, inputSanitizer) {
        this.prisma = prisma;
        this.aiService = aiService;
        this.intentClassifier = intentClassifier;
        this.enhancementService = enhancementService;
        this.safeExecutor = safeExecutor;
        this.responseValidator = responseValidator;
        this.conversationStorage = conversationStorage;
        this.retryService = retryService;
        this.inputSanitizer = inputSanitizer;
        this.logger = new common_1.Logger(AiChatServiceV2_1.name);
    }
    async chat(userId, message) {
        const startTime = Date.now();
        const requestId = (0, uuid_1.v4)().substring(0, 8);
        try {
            const sanitized = this.inputSanitizer.sanitize(message);
            if (!sanitized.safe) {
                this.logger.warn(`[${requestId}] Sanitized message: ${sanitized.warnings.join(', ')}`);
            }
            const cleanMessage = sanitized.sanitized;
            if (!this.inputSanitizer.isValidRequest(cleanMessage)) {
                return {
                    response: '❌ الرسالة غير صالحة. من فضلك أدخل طلب واضح.',
                    requestId,
                };
            }
            const context = await this.getUserContext(userId, requestId);
            this.logger.log(`[${requestId}] Processing: "${cleanMessage.substring(0, 50)}..." for ${context.userRole}`);
            const intent = this.intentClassifier.classifyIntent(cleanMessage);
            this.logger.log(`[${requestId}] Intent: ${intent.intent} (${intent.confidence.toFixed(2)})`);
            if (this.intentClassifier.requiresAdminRole(intent.intent) &&
                !['ADMIN', 'SUPER_ADMIN'].includes(context.userRole)) {
                return {
                    response: '❌ هذا الطلب يتطلب صلاحيات المسؤول.',
                    requestId,
                    processingTime: Date.now() - startTime,
                };
            }
            const response = await this.handleIntent(intent, cleanMessage, context);
            await this.storeConversation(context, cleanMessage, response.response);
            return {
                ...response,
                requestId,
                processingTime: Date.now() - startTime,
            };
        }
        catch (error) {
            this.logger.error(`[${requestId}] Chat error: ${error.message}`, error.stack);
            return {
                response: `❌ حدث خطأ في معالجة الطلب. (${requestId})`,
                requestId,
                processingTime: Date.now() - startTime,
            };
        }
    }
    async handleIntent(intent, message, context) {
        if (intent.requiresClarification && intent.suggestedClarification) {
            return {
                response: `🤔 ${intent.suggestedClarification}`,
                suggestions: ['نعم', 'لا', 'تفاصيل أكثر'],
            };
        }
        switch (intent.intent) {
            case intent_classifier_service_1.IntentType.ENHANCEMENT:
                return this.handleEnhancement(message, intent.subIntent || '', context);
            case intent_classifier_service_1.IntentType.EXECUTIVE_COMMAND:
                return this.handleExecutiveCommand(message, intent.subIntent || '', context);
            case intent_classifier_service_1.IntentType.CREATION:
                return this.handleCreation(message, context);
            case intent_classifier_service_1.IntentType.SELF_HEAL:
                return this.handleSelfHeal(message, context);
            case intent_classifier_service_1.IntentType.EMPLOYEE_ACTION:
                return this.handleEmployeeAction(message, intent, context);
            case intent_classifier_service_1.IntentType.LEAVE_ACTION:
                return this.handleLeaveAction(message, intent, context);
            case intent_classifier_service_1.IntentType.QUERY:
            case intent_classifier_service_1.IntentType.REPORT:
                return this.handleQuery(message, intent, context);
            case intent_classifier_service_1.IntentType.GENERAL_CHAT:
            default:
                return this.handleGeneralChat(message, context);
        }
    }
    async handleEnhancement(message, subIntent, context) {
        this.logger.log(`[${context.requestId}] Processing enhancement: ${subIntent}`);
        const result = await this.retryService.executeWithRetry(() => this.enhancementService.executeEnhancement(message, subIntent, {
            companyId: context.companyId,
            userId: context.userId,
            userRole: context.userRole,
        }), 'enhancement-service', { maxRetries: 2 });
        return {
            response: result.message,
            suggestions: result.success
                ? ['عرض التعديلات', 'تعديل آخر', result.requiresRebuild ? 'deploy' : 'تم']
                : ['المحاولة مرة أخرى', 'صياغة مختلفة'],
        };
    }
    async handleExecutiveCommand(message, subIntent, context) {
        this.logger.log(`[${context.requestId}] Executing command: ${subIntent}`);
        let result;
        switch (subIntent) {
            case 'deploy':
                result = await this.safeExecutor.deploy();
                return {
                    response: result.success
                        ? `🚀 **Deploy ناجح!**\n\n${result.steps.join('\n')}`
                        : `❌ فشل Deploy\n\n${result.steps.join('\n')}`,
                    suggestions: ['حالة النظام', 'logs'],
                };
            case 'monitor':
            case 'status':
                const sysResult = await this.safeExecutor.execute('system_info');
                const pm2Result = await this.safeExecutor.execute('pm2_status');
                let statusMsg = '📊 **حالة النظام**\n\n';
                if (sysResult.success) {
                    try {
                        const info = JSON.parse(sysResult.stdout);
                        statusMsg += `• الذاكرة: ${Math.round(info.freemem / 1024 / 1024)}MB متاح\n`;
                        statusMsg += `• Uptime: ${Math.round(info.uptime / 3600)} ساعات\n`;
                    }
                    catch { }
                }
                if (pm2Result.success) {
                    statusMsg += `\n✅ PM2 يعمل بشكل طبيعي`;
                }
                return {
                    response: statusMsg,
                    suggestions: ['deploy', 'logs', 'git status'],
                };
            case 'logs':
                const logsResult = await this.safeExecutor.execute('pm2_logs');
                return {
                    response: logsResult.success
                        ? `📜 **آخر Logs**\n\n\`\`\`\n${logsResult.stdout.substring(0, 1000)}\n\`\`\``
                        : `❌ فشل قراءة الـ logs`,
                    suggestions: ['حالة النظام', 'deploy'],
                };
            case 'git':
                const gitResult = await this.safeExecutor.execute('git_status');
                return {
                    response: gitResult.success
                        ? `📂 **Git Status**\n\n\`\`\`\n${gitResult.stdout}\n\`\`\``
                        : `❌ فشل قراءة Git`,
                    suggestions: ['git log', 'deploy'],
                };
            default:
                return {
                    response: `الأمر "${subIntent}" غير معروف. الأوامر المتاحة: deploy, status, logs, git`,
                    suggestions: this.safeExecutor.getAvailableCommands().map(c => c.name),
                };
        }
    }
    async handleCreation(message, context) {
        return {
            response: '🏗️ طلب إنشاء نظام جديد. هذه الخاصية قيد التطوير.',
            suggestions: ['عرض الأنظمة الحالية', 'تعديل نظام'],
        };
    }
    async handleSelfHeal(message, context) {
        return {
            response: '🔧 جاري فحص النظام وإصلاح المشاكل...',
            suggestions: ['حالة النظام', 'deploy'],
        };
    }
    async handleEmployeeAction(message, intent, context) {
        return {
            response: `📝 طلب ${intent.subIntent} للموظف. جاري المعالجة...`,
            suggestions: ['عرض الموظفين', 'تعديل آخر'],
        };
    }
    async handleLeaveAction(message, intent, context) {
        return {
            response: `📝 طلب إجازة. جاري المعالجة...`,
            suggestions: ['رصيد الإجازات', 'طلبات معلقة'],
        };
    }
    async handleQuery(message, intent, context) {
        const response = await this.generateAiResponse(message, context);
        return {
            response,
            suggestions: ['تقرير آخر', 'تفاصيل أكثر'],
        };
    }
    async handleGeneralChat(message, context) {
        const response = await this.generateAiResponse(message, context);
        return {
            response,
            suggestions: this.getContextualSuggestions(context),
        };
    }
    async generateAiResponse(message, context) {
        const history = await this.conversationStorage.getHistory(context.userId, context.companyId, 10);
        const systemPrompt = `أنت مساعد ذكي لنظام الموارد البشرية. 
المستخدم: ${context.userName} (${context.userRole})
أجب بشكل مختصر ومفيد بالعربية.`;
        const prompt = this.buildPrompt(history, message);
        return this.retryService.executeWithRetry(() => this.aiService.generateContent(prompt, systemPrompt), 'ai-service', { maxRetries: 2 });
    }
    buildPrompt(history, currentMessage) {
        let prompt = '';
        for (const msg of history.slice(-5)) {
            const role = msg.role === 'user' ? 'المستخدم' : 'المساعد';
            prompt += `${role}: ${msg.content}\n`;
        }
        prompt += `المستخدم: ${currentMessage}\nالمساعد: `;
        return prompt;
    }
    async storeConversation(context, userMessage, assistantResponse) {
        await this.conversationStorage.addMessage(context.userId, context.companyId, { role: 'user', content: userMessage, timestamp: new Date() });
        await this.conversationStorage.addMessage(context.userId, context.companyId, { role: 'assistant', content: assistantResponse, timestamp: new Date() });
    }
    async getUserContext(userId, requestId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                companyId: true,
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
    getContextualSuggestions(context) {
        if (['ADMIN', 'SUPER_ADMIN', 'HR'].includes(context.userRole)) {
            return [
                'تقرير الحضور اليومي',
                'الموظفين المتأخرين',
                'إحصائيات الشهر',
                'deploy',
            ];
        }
        return [
            'رصيد إجازاتي',
            'حضوري اليوم',
            'طلب إجازة',
        ];
    }
    async clearHistory(userId, companyId) {
        await this.conversationStorage.clearHistory(userId, companyId);
    }
    async getHistory(userId, companyId) {
        return this.conversationStorage.getHistory(userId, companyId);
    }
};
exports.AiChatServiceV2 = AiChatServiceV2;
exports.AiChatServiceV2 = AiChatServiceV2 = AiChatServiceV2_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_service_1.AiService,
        intent_classifier_service_1.IntentClassifierService,
        enhancement_service_1.EnhancementService,
        safe_executor_service_1.SafeExecutorService,
        response_validator_service_1.ResponseValidatorService,
        conversation_storage_service_1.ConversationStorageService,
        retry_service_1.RetryService,
        input_sanitizer_service_1.InputSanitizerService])
], AiChatServiceV2);
//# sourceMappingURL=ai-chat-v2.service.js.map