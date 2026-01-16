import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AiService } from '../../ai/ai.service';
import { GeniusContextService, SystemContext } from './genius-context.service';
import { GeniusQueryService } from './genius-query.service';
import { GeniusActionsService, ActionResult } from './genius-actions.service';

/**
 * 🧠 GENIUS AI Chat Service
 * 
 * The ultimate AI assistant for HR management with:
 * - Full system context awareness
 * - Natural language queries
 * - Proactive insights
 * - Action execution
 * - Learning from interactions
 */

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: {
        queryType?: string;
        executionTime?: number;
        hasData?: boolean;
        visualization?: string;
    };
}

export interface ChatResponse {
    message: string;
    suggestions?: string[];
    data?: any;
    visualization?: 'text' | 'table' | 'chart' | 'card' | 'list';
    chartType?: 'bar' | 'pie' | 'line' | 'area';
    actions?: QuickAction[];
    insights?: Insight[];
    processingTime?: number;
}

export interface QuickAction {
    label: string;
    command: string;
    icon?: string;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

export interface Insight {
    type: 'info' | 'warning' | 'success' | 'error';
    title: string;
    message: string;
    action?: string;
}

export interface ConversationContext {
    userId: string;
    userName: string;
    userRole: string;
    companyId: string;
    sessionId: string;
}

@Injectable()
export class GeniusAiService {
    private readonly logger = new Logger(GeniusAiService.name);
    private conversationHistory: Map<string, ChatMessage[]> = new Map();
    private userPreferences: Map<string, Record<string, any>> = new Map();
    private readonly MAX_HISTORY = 30;

    constructor(
        private readonly prisma: PrismaService,
        private readonly aiService: AiService,
        private readonly contextService: GeniusContextService,
        private readonly queryService: GeniusQueryService,
        private readonly actionsService: GeniusActionsService
    ) { }

    /**
     * 🎯 Main chat entry point
     */
    async chat(userId: string, message: string): Promise<ChatResponse> {
        const startTime = Date.now();

        try {
            // 1. Get user context
            const context = await this.getUserContext(userId);
            this.logger.log(`[GENIUS] Processing: "${message.substring(0, 50)}..." for ${context.userName} (${context.userRole})`);

            // 2. Add user message to history
            this.addToHistory(userId, { role: 'user', content: message, timestamp: new Date() });

            // 3. Analyze message intent
            const intent = this.analyzeIntent(message);
            this.logger.log(`[GENIUS] Intent: ${intent.type} - ${intent.subType}`);

            // 4. Get system context if needed
            let systemContext: SystemContext | null = null;
            if (intent.needsContext) {
                systemContext = await this.contextService.getFullContext(context.companyId);
            }

            // 5. Process based on intent
            let response: ChatResponse;

            switch (intent.type) {
                case 'query':
                    response = await this.handleQuery(message, context, systemContext);
                    break;
                case 'action':
                    response = await this.handleAction(message, intent.subType, context);
                    break;
                case 'analysis':
                    response = await this.handleAnalysis(message, context, systemContext);
                    break;
                case 'insight':
                    response = await this.handleInsightRequest(context, systemContext);
                    break;
                case 'help':
                    response = this.handleHelp(context.userRole);
                    break;
                case 'greeting':
                    response = await this.handleGreeting(context, systemContext);
                    break;
                default:
                    response = await this.handleGeneral(message, context, systemContext);
            }

            // 6. Add AI response to history
            this.addToHistory(userId, {
                role: 'assistant',
                content: response.message,
                timestamp: new Date(),
                metadata: {
                    queryType: intent.type,
                    executionTime: Date.now() - startTime,
                    hasData: !!response.data,
                    visualization: response.visualization
                }
            });

            // 7. Add processing time
            response.processingTime = Date.now() - startTime;

            return response;

        } catch (error) {
            this.logger.error(`[GENIUS] Error: ${error.message}`, error.stack);
            return {
                message: `❌ عذراً، حدث خطأ في معالجة طلبك. يرجى المحاولة مرة أخرى.\n\n_${error.message}_`,
                suggestions: ['مساعدة', 'ملخص اليوم', 'تقرير الحضور'],
                processingTime: Date.now() - startTime
            };
        }
    }

    /**
     * 🔍 Analyze message intent
     */
    private analyzeIntent(message: string): { type: string; subType: string; needsContext: boolean } {
        const m = message.toLowerCase().trim();

        // Greetings
        if (/^(مرحبا|اهلا|السلام|هلا|صباح|مساء|عامل|ازيك|أخبارك|اخبارك|هاي|hi|hello)/.test(m)) {
            return { type: 'greeting', subType: '', needsContext: true };
        }

        // Help
        if (/^(مساعدة|help|الأوامر|شو اقدر|كيف)/.test(m)) {
            return { type: 'help', subType: '', needsContext: false };
        }

        // Insights
        if (/اقتراحات|insights|نصائح|توصيات|ملاحظات مهمة/.test(m)) {
            return { type: 'insight', subType: '', needsContext: true };
        }

        // Actions - More comprehensive detection
        if (/^(أضف|اضف|انشئ|أنشئ|سجل|عدل|غير|حدث|احذف|امسح|الغي|وافق|اقبل|ارفض|أرسل|ارسل|سلم|استلم|انقل|نقل|فصل|أنهي|انهي|اخصم|خصم|برر|اعذر|كلف|سند|اسند)/.test(m)) {
            return { type: 'action', subType: 'execute', needsContext: false };
        }

        // More action patterns
        if (/مهمة.*ل[ـ]?\s|عهدة.*ل[ـ]?\s|إجازة.*ل[ـ]?\s|مكافأة.*ل[ـ]?\s|راتب.*الي|راتب.*إلى/.test(m)) {
            return { type: 'action', subType: 'execute', needsContext: false };
        }

        // Analysis
        if (/حلل|تحليل|قارن|مقارنة|توقع|predict|trend|اتجاه|نمط/.test(m)) {
            return { type: 'analysis', subType: this.detectAnalysisType(m), needsContext: true };
        }

        // Specific Queries (Explicitly asking for data)
        if (/كم|أين|من|متى|ماذا|عرض|إحصائيات|تقرير|سجل|أرني|ارني|وريني/.test(m)) {
            return { type: 'query', subType: '', needsContext: true };
        }

        // Default to general (Conversational) unless it strictly looks like a data question
        if (/\?|؟/.test(m)) {
            return { type: 'query', subType: '', needsContext: true };
        }

        return { type: 'general', subType: '', needsContext: true };
    }

    private detectActionSubType(message: string): string {
        if (/موظف/.test(message)) return 'employee';
        if (/إجازة|اجازة/.test(message)) return 'leave';
        if (/مهمة/.test(message)) return 'task';
        if (/راتب/.test(message)) return 'salary';
        if (/إشعار|اشعار/.test(message)) return 'notification';
        return 'general';
    }

    private detectAnalysisType(message: string): string {
        if (/حضور/.test(message)) return 'attendance';
        if (/راتب|رواتب/.test(message)) return 'salary';
        if (/أداء|اداء/.test(message)) return 'performance';
        if (/دوران|استقالة/.test(message)) return 'turnover';
        return 'general';
    }

    /**
     * 📊 Handle query requests
     */
    private async handleQuery(message: string, context: ConversationContext, systemContext: SystemContext | null): Promise<ChatResponse> {
        const result = await this.queryService.processQuery(message, context.companyId);

        // If no structured query match, fallback to natural language LLM response
        if (!result.success || result.explanation === 'NOT_A_STRUCTURED_QUERY') {
            this.logger.log(`[GENIUS] Pivot to General LLM for: "${message}"`);
            return this.handleGeneral(message, context, systemContext);
        }

        return {
            message: result.explanation,
            data: result.data,
            visualization: result.visualization === 'number' ? 'card' : (result.visualization || undefined),
            chartType: result.chartType,
            suggestions: this.getQueryFollowups(result.explanation)
        };
    }

    /**
     * ⚡ Handle action requests
     */
    private async handleAction(message: string, subType: string, context: ConversationContext): Promise<ChatResponse> {
        // Execute action using the actions service
        const result = await this.actionsService.executeAction(message, {
            userId: context.userId,
            companyId: context.companyId,
            userRole: context.userRole
        });

        return {
            message: result.message,
            data: result.data,
            suggestions: result.suggestions || this.getContextualSuggestions(context.userRole),
            insights: result.errors ? result.errors.map(e => ({
                type: 'error' as const,
                title: 'خطأ',
                message: e
            })) : undefined
        };
    }

    /**
     * 📈 Handle analysis requests
     */
    private async handleAnalysis(message: string, context: ConversationContext, systemContext: SystemContext | null): Promise<ChatResponse> {
        if (!systemContext) {
            systemContext = await this.contextService.getFullContext(context.companyId);
        }

        const analyses: string[] = [];
        const insights: Insight[] = [];

        // Attendance analysis
        if (/حضور/.test(message.toLowerCase())) {
            const rate = systemContext.attendance.today.rate;
            analyses.push(`📊 **تحليل الحضور**`);
            analyses.push(`- نسبة الحضور اليوم: ${rate}%`);
            analyses.push(`- متوسط الأسبوع: ${systemContext.attendance.thisWeek.avgAttendanceRate}%`);
            analyses.push(`- متوسط الشهر: ${systemContext.attendance.thisMonth.avgAttendanceRate}%`);

            if (rate < 80) {
                insights.push({
                    type: 'warning',
                    title: 'نسبة حضور منخفضة',
                    message: `نسبة الحضور اليوم ${rate}% أقل من المعتاد`,
                    action: 'تحقق من الغائبين'
                });
            }

            if (systemContext.attendance.thisMonth.chronicAbsentees.length > 0) {
                insights.push({
                    type: 'error',
                    title: 'غياب متكرر',
                    message: `${systemContext.attendance.thisMonth.chronicAbsentees.length} موظفين لديهم غياب متكرر هذا الشهر`,
                    action: 'عرض التفاصيل'
                });
            }
        }

        // Salary analysis
        if (/راتب|رواتب/.test(message.toLowerCase())) {
            analyses.push(`💰 **تحليل الرواتب**`);
            analyses.push(`- متوسط الراتب: ${systemContext.payroll.avgSalary.toLocaleString('ar-SA')} ريال`);
            analyses.push(`- إجمالي الرواتب: ${systemContext.payroll.totalPayroll.toLocaleString('ar-SA')} ريال`);

            const ranges = systemContext.payroll.salaryRanges;
            analyses.push(`\n📈 **توزيع الرواتب**:`);
            ranges.forEach(r => {
                analyses.push(`  - ${r.range}: ${r.count} موظف`);
            });
        }

        // Turnover analysis
        if (/دوران|استقالة/.test(message.toLowerCase())) {
            analyses.push(`🚪 **تحليل مخاطر الدوران**`);
            analyses.push(`- موظفين عرضة للخطر: ${systemContext.employees.atRisk.length}`);

            if (systemContext.employees.atRisk.length > 0) {
                analyses.push(`\n⚠️ **أعلى المخاطر**:`);
                systemContext.employees.atRisk.slice(0, 5).forEach((e, i) => {
                    analyses.push(`  ${i + 1}. ${e.name} (${e.riskScore}%): ${e.reasons.join(', ')}`);
                });

                insights.push({
                    type: 'warning',
                    title: 'موظفين في خطر',
                    message: `${systemContext.employees.atRisk.length} موظف قد يحتاج اهتمام خاص`,
                    action: 'عرض التفاصيل'
                });
            }
        }

        // Performance analysis
        if (/أداء|اداء/.test(message.toLowerCase())) {
            analyses.push(`📊 **تحليل الأداء**`);
            analyses.push(`- بيانات الأداء: جاري التحميل...`);
        }

        return {
            message: analyses.join('\n'),
            visualization: 'text',
            insights,
            suggestions: ['تقرير تفصيلي', 'مقارنة شهرية', 'تصدير البيانات']
        };
    }

    /**
     * 💡 Handle insight requests
     */
    private async handleInsightRequest(context: ConversationContext, systemContext: SystemContext | null): Promise<ChatResponse> {
        if (!systemContext) {
            systemContext = await this.contextService.getFullContext(context.companyId);
        }

        const insights: Insight[] = [];

        // Analyze alerts
        systemContext.alerts.critical.forEach(alert => {
            insights.push({
                type: 'error',
                title: alert.type,
                message: alert.message,
                action: alert.action
            });
        });

        systemContext.alerts.warnings.forEach(alert => {
            insights.push({
                type: 'warning',
                title: alert.type,
                message: alert.message,
                action: alert.action
            });
        });

        // Add proactive insights
        if (systemContext.attendance.today.rate < 80) {
            insights.push({
                type: 'warning',
                title: 'نسبة حضور منخفضة',
                message: `نسبة الحضور اليوم ${systemContext.attendance.today.rate}% فقط`,
                action: 'تحقق من الغائبين'
            });
        }

        if (systemContext.employees.atRisk.length > 5) {
            insights.push({
                type: 'error',
                title: 'موظفين في خطر',
                message: `${systemContext.employees.atRisk.length} موظف قد يغادر الشركة`,
                action: 'عرض التفاصيل'
            });
        }

        if (systemContext.leaves.pending > 5) {
            insights.push({
                type: 'info',
                title: 'طلبات معلقة',
                message: `${systemContext.leaves.pending} طلب إجازة بانتظار المراجعة`,
                action: 'راجع الطلبات'
            });
        }

        const message = insights.length > 0
            ? `💡 **رؤى وتوصيات ذكية**\n\nوجدت ${insights.length} ملاحظة مهمة:`
            : '✅ لا توجد ملاحظات عاجلة حالياً. النظام يعمل بشكل طبيعي.';

        return {
            message,
            insights,
            suggestions: ['تفاصيل أكثر', 'تقرير شامل', 'إحصائيات']
        };
    }

    /**
     * 🤝 Handle greeting - NOW LLM DRIVEN
     */
    private async handleGreeting(context: ConversationContext, systemContext: SystemContext | null): Promise<ChatResponse> {
        if (!systemContext) {
            systemContext = await this.contextService.getFullContext(context.companyId);
        }

        const history = this.getHistory(context.userId);
        const contextText = this.contextService.formatContextForAI(systemContext);

        const systemPrompt = `أنت "جينيس" 🧠 - المساعد الذكي الودود.
المستخدم لسه بيبدأ الكلام معاك، رد عليه بترحيب حار وودود جداً كأنك زميله في المكتب.

🏢 الشركة: ${systemContext.company.name}
👤 الشخص: ${context.userName}

${contextText}

قواعد الرد في السلام:
1. ارحب بالمستخدم باسمه
2. اسأله عن حاله بشكل طبيعي (مثلاً: "منور يا ${context.userName}! اخبارك ايه؟")
3. اذكر معلومة واحدة بس "مهمة" من البيانات (مثلاً: "النهاردة الحضور ممتاز 90%")
4. متدلقش كل البيانات (الجدول) مرة واحدة، خليها للوقت المناسب
5. اسأله إزاي تقدر تساعده النهاردة
6. استخدم إيموجي ودودة 👋😊`;

        const prompt = `المستخدم سلم عليك وقالك: "مرحبا" أو ما يشبه ذلك.\nالمساعد:`;

        try {
            const aiResponse = await this.aiService.generateContent(prompt, systemPrompt);
            return {
                message: aiResponse,
                suggestions: this.getContextualSuggestions(context.userRole),
                actions: [
                    { label: 'ملخص اليوم', command: 'ملخص اليوم', icon: 'today', color: 'primary' },
                    { label: 'تقرير الحضور', command: 'تقرير الحضور', icon: 'schedule', color: 'secondary' },
                    { label: 'طلبات الإجازات', command: 'طلبات الإجازات المعلقة', icon: 'beach', color: 'success' }
                ]
            };
        } catch (error) {
            // Fallback for Greeting
            return {
                message: `أهلاً بك يا ${context.userName}! 👋 كيف يمكنني مساعدتك اليوم؟`,
                suggestions: this.getContextualSuggestions(context.userRole)
            };
        }
    }

    /**
     * 📚 Handle help request
     */
    private handleHelp(userRole: string): ChatResponse {
        let commands = `
🤖 **المساعد الذكي - الأوامر المتاحة**

📊 **الاستعلامات:**
- كم عدد الموظفين؟
- اعرض حضور اليوم
- من المتأخرين اليوم؟
- قائمة الغائبين
- طلبات الإجازات المعلقة
- أعلى 10 رواتب
- إحصائيات الأقسام

📈 **التحليلات:**
- حلل الحضور
- حلل الرواتب
- توقع الدوران
- مقارنة شهرية

💡 **الرؤى:**
- اقتراحات
- تنبيهات مهمة
- ملخص اليوم
        `.trim();

        if (['ADMIN', 'HR', 'SUPER_ADMIN'].includes(userRole)) {
            commands += `

⚡ **الإجراءات (للمسؤولين):**
- أضف موظف جديد
- عدل راتب [اسم] إلى [قيمة]
- وافق على إجازة [اسم]
- أرسل إشعار لـ [اسم]
            `.trim();
        }

        return {
            message: commands,
            suggestions: ['كم عدد الموظفين؟', 'حضور اليوم', 'اقتراحات']
        };
    }

    /**
     * 💬 Handle general conversation
     */
    private async handleGeneral(message: string, context: ConversationContext, systemContext: SystemContext | null): Promise<ChatResponse> {
        if (!systemContext) {
            systemContext = await this.contextService.getFullContext(context.companyId);
        }

        // Build AI prompt with context
        const history = this.getHistory(context.userId);
        const contextText = this.contextService.formatContextForAI(systemContext);

        const systemPrompt = `أنت "جينيس" 🧠 - المساعد الذكي الودود لنظام الموارد البشرية.
شخصيتك: ودود، متعاون، ذكي، وتحب المساعدة. تتكلم بالعربية بشكل طبيعي وغير رسمي.

🏢 الشركة: ${systemContext.company.name}
👤 تتكلم مع: ${context.userName} (${context.userRole === 'ADMIN' ? 'مدير' : context.userRole === 'HR' ? 'موارد بشرية' : 'موظف'})

${contextText}

💬 أسلوب المحادثة:
1. رد بشكل طبيعي مثل صديق مساعد، مش روبوت
2. افتكر اللي قاله المستخدم قبل كدا واستخدمه في الرد
3. اسأل أسئلة متابعة لو الموضوع محتاج توضيح
4. لو قالك "كويس" أو "الحمد لله" رد عليه بشكل ودود
5. استخدم الإيموجي بذكاء 😊
6. لو متعرفش حاجة، اعترف وحاول تساعد بطريقة تانية
7. كن proactive واقترح حاجات مفيدة
8. لو في مشكلة، حاول تحلها أو تقترح حل
9. تفاعل مع المشاعر - لو حد مضايق، اظهر تعاطف
10. خلي الردود قصيرة ومفيدة، مش طويلة ومملة

أمثلة على الردود الطبيعية:
- "الحمد لله" → "جميل! 😊 عايز أساعدك في حاجة؟"
- "عامل ايه" → "تمام الحمد لله! جاهز أساعدك. تحب تشوف ملخص اليوم؟"
- "شكراً" → "العفو! ده شغلي 💪 محتاج حاجة تانية؟"
- "طيب" → "تمام! نكمل؟ عايز اعمل ايه دلوقتي؟"

تذكر: أنت مش بس أداة - أنت زميل ذكي بيساعد في الشغل!`;

        const conversationContext = history.slice(-5).map(m =>
            `${m.role === 'user' ? 'المستخدم' : 'المساعد'}: ${m.content}`
        ).join('\n');

        const prompt = `${conversationContext}\nالمستخدم: ${message}\nالمساعد:`;

        try {
            const aiResponse = await this.aiService.generateContent(prompt, systemPrompt);

            return {
                message: aiResponse,
                suggestions: this.getContextualSuggestions(context.userRole)
            };
        } catch (error) {
            this.logger.error(`AI generation failed: ${error.message}`);

            // Fallback response
            return {
                message: `لم أفهم طلبك بوضوح. هل تريد:\n- استعلام عن بيانات معينة؟\n- تنفيذ إجراء؟\n- تحليل أو تقرير?`,
                suggestions: ['مساعدة', 'ملخص اليوم', 'تقرير الحضور']
            };
        }
    }

    /**
     * 📋 Get user context
     */
    private async getUserContext(userId: string): Promise<ConversationContext> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, firstName: true, lastName: true, role: true, companyId: true }
        });

        if (!user || !user.companyId) {
            throw new Error('User not found or has no company');
        }

        return {
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            userRole: user.role,
            companyId: user.companyId,
            sessionId: `${userId}-${Date.now()}`
        };
    }

    /**
     * 💬 Conversation history management
     */
    private addToHistory(userId: string, message: ChatMessage): void {
        const history = this.conversationHistory.get(userId) || [];
        history.push(message);

        // Keep only recent messages
        if (history.length > this.MAX_HISTORY) {
            history.splice(0, history.length - this.MAX_HISTORY);
        }

        this.conversationHistory.set(userId, history);
    }

    private getHistory(userId: string): ChatMessage[] {
        return this.conversationHistory.get(userId) || [];
    }

    clearHistory(userId: string): void {
        this.conversationHistory.delete(userId);
    }

    /**
     * 💡 Get contextual suggestions
     */
    private getContextualSuggestions(userRole: string): string[] {
        const common = ['ملخص اليوم', 'تقرير الحضور', 'اقتراحات'];

        if (['ADMIN', 'HR', 'SUPER_ADMIN'].includes(userRole)) {
            return [...common, 'طلبات الإجازات', 'حلل الأداء', 'الموظفين المتأخرين'];
        }

        return [...common, 'رصيد إجازاتي', 'حضوري اليوم'];
    }

    private getQueryFollowups(originalQuery: string): string[] {
        if (/حضور/.test(originalQuery)) {
            return ['تفاصيل المتأخرين', 'مقارنة بالأمس', 'تصدير التقرير'];
        }
        if (/موظف/.test(originalQuery)) {
            return ['بيانات تفصيلية', 'إحصائيات القسم', 'تقرير الأداء'];
        }
        if (/راتب/.test(originalQuery)) {
            return ['مقارنة بالسوق', 'توزيع الرواتب', 'إجمالي الرواتب'];
        }
        return ['تفاصيل أكثر', 'تصدير', 'رسم بياني'];
    }
}
