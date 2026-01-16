import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { v4 as uuidv4 } from 'uuid';

// Import new services
import { IntentClassifierService, IntentType, IntentResult } from './services/intent-classifier.service';
import { EnhancementService } from './services/enhancement.service';
import { SafeExecutorService } from './services/safe-executor.service';
import { ResponseValidatorService } from './services/response-validator.service';
import { ConversationStorageService, ChatMessage } from './services/conversation-storage.service';
import { RetryService } from './services/retry.service';
import { InputSanitizerService } from './services/input-sanitizer.service';

/**
 * 🤖 AI Chat Service (Refactored)
 * Clean, modular AI chat with proper separation of concerns
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
    requestId?: string;
    processingTime?: number;
}

@Injectable()
export class AiChatServiceV2 {
    private readonly logger = new Logger(AiChatServiceV2.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly aiService: AiService,
        private readonly intentClassifier: IntentClassifierService,
        private readonly enhancementService: EnhancementService,
        private readonly safeExecutor: SafeExecutorService,
        private readonly responseValidator: ResponseValidatorService,
        private readonly conversationStorage: ConversationStorageService,
        private readonly retryService: RetryService,
        private readonly inputSanitizer: InputSanitizerService,
    ) { }

    /**
     * 💬 Main chat entry point
     */
    async chat(userId: string, message: string): Promise<ChatResponse> {
        const startTime = Date.now();
        const requestId = uuidv4().substring(0, 8);

        try {
            // 1. Sanitize input
            const sanitized = this.inputSanitizer.sanitize(message);
            if (!sanitized.safe) {
                this.logger.warn(`[${requestId}] Sanitized message: ${sanitized.warnings.join(', ')}`);
            }
            const cleanMessage = sanitized.sanitized;

            // 2. Validate request
            if (!this.inputSanitizer.isValidRequest(cleanMessage)) {
                return {
                    response: '❌ الرسالة غير صالحة. من فضلك أدخل طلب واضح.',
                    requestId,
                };
            }

            // 3. Get user context
            const context = await this.getUserContext(userId, requestId);
            this.logger.log(`[${requestId}] Processing: "${cleanMessage.substring(0, 50)}..." for ${context.userRole}`);

            // 4. Classify intent
            const intent = this.intentClassifier.classifyIntent(cleanMessage);
            this.logger.log(`[${requestId}] Intent: ${intent.intent} (${intent.confidence.toFixed(2)})`);

            // 5. Check permissions
            if (this.intentClassifier.requiresAdminRole(intent.intent) &&
                !['ADMIN', 'SUPER_ADMIN'].includes(context.userRole)) {
                return {
                    response: '❌ هذا الطلب يتطلب صلاحيات المسؤول.',
                    requestId,
                    processingTime: Date.now() - startTime,
                };
            }

            // 6. Handle based on intent
            const response = await this.handleIntent(intent, cleanMessage, context);

            // 7. Store conversation
            await this.storeConversation(context, cleanMessage, response.response);

            return {
                ...response,
                requestId,
                processingTime: Date.now() - startTime,
            };
        } catch (error) {
            this.logger.error(`[${requestId}] Chat error: ${error.message}`, error.stack);
            return {
                response: `❌ حدث خطأ في معالجة الطلب. (${requestId})`,
                requestId,
                processingTime: Date.now() - startTime,
            };
        }
    }

    /**
     * 🎯 Handle intent based on classification
     */
    private async handleIntent(
        intent: IntentResult,
        message: string,
        context: ChatContext
    ): Promise<ChatResponse> {
        // Ask for clarification if confidence too low
        if (intent.requiresClarification && intent.suggestedClarification) {
            return {
                response: `🤔 ${intent.suggestedClarification}`,
                suggestions: ['نعم', 'لا', 'تفاصيل أكثر'],
            };
        }

        switch (intent.intent) {
            case IntentType.ENHANCEMENT:
                return this.handleEnhancement(message, intent.subIntent || '', context);

            case IntentType.EXECUTIVE_COMMAND:
                return this.handleExecutiveCommand(message, intent.subIntent || '', context);

            case IntentType.CREATION:
                return this.handleCreation(message, context);

            case IntentType.SELF_HEAL:
                return this.handleSelfHeal(message, context);

            case IntentType.EMPLOYEE_ACTION:
                return this.handleEmployeeAction(message, intent, context);

            case IntentType.LEAVE_ACTION:
                return this.handleLeaveAction(message, intent, context);

            case IntentType.QUERY:
            case IntentType.REPORT:
                return this.handleQuery(message, intent, context);

            case IntentType.GENERAL_CHAT:
            default:
                return this.handleGeneralChat(message, context);
        }
    }

    /**
     * 🧠 Handle enhancement requests
     */
    private async handleEnhancement(
        message: string,
        subIntent: string,
        context: ChatContext
    ): Promise<ChatResponse> {
        this.logger.log(`[${context.requestId}] Processing enhancement: ${subIntent}`);

        const result = await this.retryService.executeWithRetry(
            () => this.enhancementService.executeEnhancement(message, subIntent, {
                companyId: context.companyId,
                userId: context.userId,
                userRole: context.userRole,
            }),
            'enhancement-service',
            { maxRetries: 2 }
        );

        return {
            response: result.message,
            suggestions: result.success
                ? ['عرض التعديلات', 'تعديل آخر', result.requiresRebuild ? 'deploy' : 'تم']
                : ['المحاولة مرة أخرى', 'صياغة مختلفة'],
        };
    }

    /**
     * ⚡ Handle executive commands
     */
    private async handleExecutiveCommand(
        message: string,
        subIntent: string,
        context: ChatContext
    ): Promise<ChatResponse> {
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
                    } catch { }
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

    /**
     * 🏗️ Handle creation requests
     */
    private async handleCreation(
        message: string,
        context: ChatContext
    ): Promise<ChatResponse> {
        // Placeholder - integrate with existing AI generation
        return {
            response: '🏗️ طلب إنشاء نظام جديد. هذه الخاصية قيد التطوير.',
            suggestions: ['عرض الأنظمة الحالية', 'تعديل نظام'],
        };
    }

    /**
     * 🔧 Handle self-heal requests
     */
    private async handleSelfHeal(
        message: string,
        context: ChatContext
    ): Promise<ChatResponse> {
        return {
            response: '🔧 جاري فحص النظام وإصلاح المشاكل...',
            suggestions: ['حالة النظام', 'deploy'],
        };
    }

    /**
     * 👤 Handle employee actions
     */
    private async handleEmployeeAction(
        message: string,
        intent: IntentResult,
        context: ChatContext
    ): Promise<ChatResponse> {
        // Placeholder - integrate with existing employee tools
        return {
            response: `📝 طلب ${intent.subIntent} للموظف. جاري المعالجة...`,
            suggestions: ['عرض الموظفين', 'تعديل آخر'],
        };
    }

    /**
     * 🏖️ Handle leave actions
     */
    private async handleLeaveAction(
        message: string,
        intent: IntentResult,
        context: ChatContext
    ): Promise<ChatResponse> {
        return {
            response: `📝 طلب إجازة. جاري المعالجة...`,
            suggestions: ['رصيد الإجازات', 'طلبات معلقة'],
        };
    }

    /**
     * 📊 Handle queries and reports
     */
    private async handleQuery(
        message: string,
        intent: IntentResult,
        context: ChatContext
    ): Promise<ChatResponse> {
        // Use AI to generate response with data
        const response = await this.generateAiResponse(message, context);
        return {
            response,
            suggestions: ['تقرير آخر', 'تفاصيل أكثر'],
        };
    }

    /**
     * 💬 Handle general chat
     */
    private async handleGeneralChat(
        message: string,
        context: ChatContext
    ): Promise<ChatResponse> {
        const response = await this.generateAiResponse(message, context);
        return {
            response,
            suggestions: this.getContextualSuggestions(context),
        };
    }

    /**
     * 🤖 Generate AI response
     */
    private async generateAiResponse(
        message: string,
        context: ChatContext
    ): Promise<string> {
        const history = await this.conversationStorage.getHistory(
            context.userId,
            context.companyId,
            10
        );

        const systemPrompt = `أنت مساعد ذكي لنظام الموارد البشرية. 
المستخدم: ${context.userName} (${context.userRole})
أجب بشكل مختصر ومفيد بالعربية.`;

        const prompt = this.buildPrompt(history, message);

        return this.retryService.executeWithRetry(
            () => this.aiService.generateContent(prompt, systemPrompt),
            'ai-service',
            { maxRetries: 2 }
        );
    }

    /**
     * 📝 Build prompt with history
     */
    private buildPrompt(history: ChatMessage[], currentMessage: string): string {
        let prompt = '';

        // Add recent history
        for (const msg of history.slice(-5)) {
            const role = msg.role === 'user' ? 'المستخدم' : 'المساعد';
            prompt += `${role}: ${msg.content}\n`;
        }

        prompt += `المستخدم: ${currentMessage}\nالمساعد: `;
        return prompt;
    }

    /**
     * 💾 Store conversation
     */
    private async storeConversation(
        context: ChatContext,
        userMessage: string,
        assistantResponse: string
    ): Promise<void> {
        await this.conversationStorage.addMessage(
            context.userId,
            context.companyId,
            { role: 'user', content: userMessage, timestamp: new Date() }
        );
        await this.conversationStorage.addMessage(
            context.userId,
            context.companyId,
            { role: 'assistant', content: assistantResponse, timestamp: new Date() }
        );
    }

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

    /**
     * 💡 Get contextual suggestions
     */
    private getContextualSuggestions(context: ChatContext): string[] {
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
