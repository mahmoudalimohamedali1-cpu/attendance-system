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
var AiChatService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiChatService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const ai_service_1 = require("../ai/ai.service");
const ai_agent_tools_service_1 = require("./ai-agent-tools.service");
let AiChatService = AiChatService_1 = class AiChatService {
    constructor(prisma, aiService, agentTools) {
        this.prisma = prisma;
        this.aiService = aiService;
        this.agentTools = agentTools;
        this.logger = new common_1.Logger(AiChatService_1.name);
        this.conversationHistory = new Map();
    }
    async chat(userId, message) {
        try {
            const context = await this.getUserContext(userId);
            const isEnhancement = this.agentTools.isEnhancementRequest(message);
            this.logger.log(`🧠 SMART ENHANCEMENT CHECK: "${message.substring(0, 50)}..." => ${isEnhancement}`);
            this.logger.log(`🧠 User Role: ${context.userRole}`);
            if (isEnhancement && (context.userRole === 'ADMIN' || context.userRole === 'SUPER_ADMIN')) {
                this.logger.log('🧠 Executing aiSmartEnhance...');
                try {
                    const enhanceResult = await this.agentTools.aiSmartEnhance(message, context);
                    this.logger.log(`🧠 Enhancement Result: ${enhanceResult?.success}`);
                    return {
                        response: enhanceResult.message,
                        suggestions: ['عرض التعديلات', 'تعديل آخر', 'deploy'],
                    };
                }
                catch (enhanceError) {
                    this.logger.error('🧠 Smart Enhancement ERROR:', enhanceError);
                    throw enhanceError;
                }
            }
            const actionData = await this.detectAndExecuteAction(message, context);
            if (actionData && actionData.trim().length > 0) {
                return {
                    response: actionData,
                    suggestions: this.extractSuggestions(context),
                };
            }
            const isComplexRequest = message.match(/(نظام.*كامل|مع.*علاقات|متعدد|متكامل|complex|complete)/i);
            const isSelfHeal = message.match(/(اصلح|صلح|fix|heal)/i);
            if (isSelfHeal && (context.userRole === 'ADMIN' || context.userRole === 'SUPER_ADMIN')) {
                const moduleMatch = message.match(/موديول\s*(\w+)/) || message.match(/module\s*(\w+)/i);
                const moduleName = moduleMatch ? moduleMatch[1] : 'generated';
                const result = await this.agentTools.aiSelfHeal(moduleName);
                return { response: result.message, suggestions: ['اعمل نظام جديد', 'عرض الموديولات'] };
            }
            const isExecutiveCommand = message.match(/(deploy|نشر|انشر|backup|باك اب|monitor|مراقبة|حالة النظام|git|logs|لوج|سجلات|migration|ميجريشن)/i);
            if (isExecutiveCommand && (context.userRole === 'ADMIN' || context.userRole === 'SUPER_ADMIN')) {
                const result = await this.agentTools.aiMasterCommand(message, context);
                return {
                    response: result.message,
                    suggestions: ['deploy', 'backup', 'حالة النظام', 'logs', 'git status'],
                };
            }
            if (this.agentTools.isOpenCreationRequest(message) &&
                (context.userRole === 'ADMIN' || context.userRole === 'SUPER_ADMIN')) {
                const aiResult = isComplexRequest
                    ? await this.agentTools.aiGeniusBuilder(message, context)
                    : await this.agentTools.aiFullAutoGenerate(message, context);
                return {
                    response: aiResult.message,
                    suggestions: ['عرض الموديولات', 'اعمل نظام آخر', 'deploy'],
                };
            }
            const history = this.conversationHistory.get(userId) || [];
            history.push({
                role: 'user',
                content: message,
                timestamp: new Date(),
            });
            const prompt = this.buildPrompt(context, history, message, actionData);
            const aiResponse = await this.aiService.generateContent(prompt);
            history.push({
                role: 'assistant',
                content: aiResponse,
                timestamp: new Date(),
            });
            if (history.length > 20) {
                history.splice(0, history.length - 20);
            }
            this.conversationHistory.set(userId, history);
            const suggestions = this.extractSuggestions(context);
            return {
                response: aiResponse,
                suggestions,
            };
        }
        catch (error) {
            console.error('💥 CHAT ERROR:', error);
            this.logger.error(`Chat error: ${error.message}`, error.stack);
            return {
                response: '❌ عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.',
            };
        }
    }
    parseArabicNumber(text) {
        let cleaned = text.trim().toLowerCase();
        const directNumber = cleaned.replace(/[^\d]/g, '');
        if (directNumber && !cleaned.includes('الف') && !cleaned.includes('ألف') && !cleaned.includes('مليون')) {
            return parseInt(directNumber) || 0;
        }
        let result = 0;
        const numMatch = cleaned.match(/(\d+)/);
        const baseNum = numMatch ? parseInt(numMatch[1]) : 1;
        if (/الف|ألف|الاف|آلاف/.test(cleaned)) {
            result = baseNum * 1000;
        }
        else if (/مليون/.test(cleaned)) {
            result = baseNum * 1000000;
        }
        else {
            result = baseNum;
        }
        return result;
    }
    extractEmployeeAndValue(message, keyword) {
        this.logger.log(`[EXTRACT] Original message: "${message}"`);
        const keywordIndex = message.indexOf(keyword);
        if (keywordIndex === -1) {
            return { employeeName: '', value: 0 };
        }
        const afterKeyword = message.substring(keywordIndex + keyword.length).trim();
        this.logger.log(`[EXTRACT] After keyword: "${afterKeyword}"`);
        let cleaned = afterKeyword.replace(/^الموظف\s+/, '').trim();
        this.logger.log(`[EXTRACT] Cleaned: "${cleaned}"`);
        let separatorIndex = -1;
        const separators = ['الي', 'إلى', 'الى', ' ل ', '='];
        for (const sep of separators) {
            const idx = cleaned.indexOf(sep);
            if (idx !== -1 && (separatorIndex === -1 || idx < separatorIndex)) {
                separatorIndex = idx;
            }
        }
        if (separatorIndex === -1) {
            return { employeeName: '', value: 0 };
        }
        const employeeName = cleaned.substring(0, separatorIndex).trim();
        const valueText = cleaned.substring(separatorIndex).replace(/الي|إلى|الى|ل|=|ريال/g, '').trim();
        const value = this.parseArabicNumber(valueText);
        this.logger.log(`[EXTRACT] Employee: "${employeeName}", ValueText: "${valueText}", Value: ${value}`);
        return { employeeName, value };
    }
    extractEmployeeAndText(message, keyword) {
        const keywordIndex = message.indexOf(keyword);
        if (keywordIndex === -1) {
            return { employeeName: '', text: '' };
        }
        const afterKeyword = message.substring(keywordIndex + keyword.length).trim();
        let cleaned = afterKeyword.replace(/^الموظف\s+/, '').trim();
        let separatorIndex = -1;
        const separators = ['الي', 'إلى', 'الى', ' ل '];
        for (const sep of separators) {
            const idx = cleaned.indexOf(sep);
            if (idx !== -1 && (separatorIndex === -1 || idx < separatorIndex)) {
                separatorIndex = idx;
            }
        }
        if (separatorIndex === -1) {
            return { employeeName: '', text: '' };
        }
        const employeeName = cleaned.substring(0, separatorIndex).trim();
        const text = cleaned.substring(separatorIndex).replace(/الي|إلى|الى|ل/g, '').trim();
        return { employeeName, text };
    }
    extractEmployeeAndNumber(message) {
        const numMatch = message.match(/(\d+)\s*(?:يوم|أيام)?/);
        if (!numMatch) {
            return { employeeName: '', number: 0 };
        }
        const number = parseInt(numMatch[1]) || 0;
        const leaveIndex = message.search(/إجازة|اجازة/);
        if (leaveIndex === -1) {
            return { employeeName: '', number: 0 };
        }
        const afterLeave = message.substring(leaveIndex + 5).trim();
        const cleaned = afterLeave.replace(/^(?:ل|لـ)?(?:الموظف\s+)?/, '').trim();
        const nameEndIndex = cleaned.search(/\d/);
        const employeeName = nameEndIndex !== -1 ? cleaned.substring(0, nameEndIndex).trim() : '';
        return { employeeName, number };
    }
    async detectAndExecuteAction(message, context) {
        try {
            this.logger.log(`[AI-CHAT] Detecting action for: "${message}"`);
            if (context.userRole === 'ADMIN' || context.userRole === 'HR' || context.userRole === 'SUPER_ADMIN') {
                if (message.includes('أضف') && message.includes('موظف')) {
                    const parsed = this.parseAddEmployeeCommand(message);
                    if (parsed.firstName) {
                        const result = await this.agentTools.executeTool('create_employee', parsed, {
                            companyId: context.companyId,
                            userId: context.userId,
                            userRole: context.userRole,
                        });
                        return result.message;
                    }
                }
                if ((message.includes('احذف') || message.includes('امسح')) && message.includes('موظف')) {
                    const name = this.extractNameFromMessage(message);
                    if (name) {
                        const result = await this.agentTools.executeTool('delete_employee', { employeeName: name }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                        return result.message;
                    }
                }
                if ((message.includes('اعرض') || message.includes('قائمة') || message.includes('كل')) && message.includes('موظف')) {
                    const result = await this.agentTools.executeTool('list_employees', { limit: 15 }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if ((message.includes('أضف') || message.includes('انشئ')) && message.includes('مهمة')) {
                    const parsed = this.parseTaskCommand(message);
                    if (parsed.title && parsed.assigneeName) {
                        const result = await this.agentTools.executeTool('create_task', parsed, {
                            companyId: context.companyId,
                            userId: context.userId,
                            userRole: context.userRole,
                        });
                        return result.message;
                    }
                }
                if ((message.includes('وافق') || message.includes('اقبل')) && message.includes('إجازة')) {
                    const name = this.extractNameFromMessage(message);
                    if (name) {
                        const result = await this.agentTools.executeTool('approve_leave', { employeeName: name }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                        return result.message;
                    }
                }
                if (message.includes('كم') && (message.includes('موظف') || message.includes('مهمة') || message.includes('إجازة'))) {
                    let entity = 'employees';
                    if (message.includes('مهمة'))
                        entity = 'tasks';
                    if (message.includes('إجازة'))
                        entity = 'leaves';
                    const result = await this.agentTools.executeTool('query_count', { entity }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if ((message.includes('عدل') || message.includes('غير')) && message.includes('راتب')) {
                    const parsed = this.parseUpdateCommand(message);
                    if (parsed.employeeName && parsed.value) {
                        const numValue = this.parseArabicNumber(parsed.value);
                        if (numValue > 0) {
                            return await this.updateEmployeeField(parsed.employeeName, 'salary', numValue.toString(), context.companyId);
                        }
                    }
                }
                if ((message.includes('عدل') || message.includes('غير') || message.includes('انقل')) &&
                    (message.includes('قسم') || message.includes('إدارة'))) {
                    const parsed = this.parseUpdateCommand(message);
                    if (parsed.employeeName && parsed.value) {
                        return await this.updateEmployeeField(parsed.employeeName, 'department', parsed.value, context.companyId);
                    }
                }
                if (message.includes('بيانات') || message.includes('معلومات')) {
                    const name = this.extractNameFromMessage(message);
                    if (name) {
                        return await this.getEmployeeFullData(name, context.companyId);
                    }
                }
                if (message.includes('دوران') || message.includes('استقالة')) {
                    const name = this.extractNameFromMessage(message);
                    if (name) {
                        return await this.analyzeEmployeeTurnover(name, context.companyId);
                    }
                }
                if (message.includes('تقرير') && message.includes('حضور')) {
                    let period = 'today';
                    if (message.includes('اسبوع') || message.includes('أسبوع'))
                        period = 'week';
                    if (message.includes('شهر'))
                        period = 'month';
                    const result = await this.agentTools.executeTool('attendance_report', { period }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('متأخر') || message.includes('تأخر')) {
                    const numMatch = message.match(/(\d+)/);
                    const minLate = numMatch ? parseInt(numMatch[1]) : 1;
                    const result = await this.agentTools.executeTool('late_employees', { minLateCount: minLate }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if ((message.includes('أعلى') || message.includes('اعلى') || message.includes('أقل')) && message.includes('راتب')) {
                    const numMatch = message.match(/(\d+)/);
                    const count = numMatch ? parseInt(numMatch[1]) : 5;
                    const order = (message.includes('أقل') || message.includes('اقل')) ? 'lowest' : 'highest';
                    const result = await this.agentTools.executeTool('top_salaries', { count, order }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if ((message.includes('إحصائيات') || message.includes('احصائيات') || message.includes('ملخص')) && message.includes('إجاز')) {
                    const result = await this.agentTools.executeTool('leave_statistics', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if ((message.includes('ملخص') || message.includes('إحصائيات')) && message.includes('حضور')) {
                    const result = await this.agentTools.executeTool('attendance_summary', { period: 'today' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (context.userRole === 'SUPER_ADMIN') {
                    if ((message.includes('اعرض') || message.includes('اقرأ')) && message.includes('ملف')) {
                        const fileMatch = message.match(/ملف\s+([^\s]+)/);
                        if (fileMatch) {
                            const result = await this.agentTools.executeTool('read_file', { filePath: fileMatch[1] }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                            return result.message;
                        }
                    }
                    if ((message.includes('الملفات') || message.includes('مجلد')) && (message.includes('في') || message.includes('modules'))) {
                        let dirPath = '';
                        if (message.includes('ai-chat'))
                            dirPath = 'modules/ai-chat';
                        else if (message.includes('modules'))
                            dirPath = 'modules';
                        else {
                            const dirMatch = message.match(/في\s+([^\s]+)/);
                            dirPath = dirMatch ? dirMatch[1] : '';
                        }
                        const result = await this.agentTools.executeTool('list_directory', { dirPath }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                        return result.message;
                    }
                    if (message.includes('ابحث') && message.includes('عن')) {
                        const searchMatch = message.match(/عن\s+([^\s]+)/);
                        if (searchMatch) {
                            const result = await this.agentTools.executeTool('search_code', { query: searchMatch[1] }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                            return result.message;
                        }
                    }
                    if ((message.includes('هيكل') || message.includes('functions')) && message.includes('ملف')) {
                        const fileMatch = message.match(/ملف\s+([^\s]+)/);
                        if (fileMatch) {
                            const result = await this.agentTools.executeTool('get_file_outline', { filePath: fileMatch[1] }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                            return result.message;
                        }
                    }
                    if (message.includes('أنشئ') && message.includes('ملف')) {
                        const fileMatch = message.match(/ملف\s+([^\s]+)/);
                        if (fileMatch) {
                            const result = await this.agentTools.executeTool('write_file', { filePath: fileMatch[1], content: '// Auto-generated file\n' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                            return result.message;
                        }
                    }
                    if (message.includes('أنشئ') && message.includes('module')) {
                        const moduleMatch = message.match(/module\s+([^\s]+)/);
                        if (moduleMatch) {
                            const result = await this.agentTools.executeTool('create_module', { moduleName: moduleMatch[1] }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                            return result.message;
                        }
                    }
                    if (message.includes('ريستارت') || message.includes('restart') || message.includes('أعد تشغيل')) {
                        const result = await this.agentTools.executeTool('restart_backend', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                        return result.message;
                    }
                    if (message.includes('حالة') && message.includes('git') || message.includes('git status')) {
                        const result = await this.agentTools.executeTool('git_status', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                        return result.message;
                    }
                    if (message.includes('معلومات') && message.includes('سيستم') || message.includes('system info')) {
                        const result = await this.agentTools.executeTool('system_info', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                        return result.message;
                    }
                }
                if (message.includes('توقع') && (message.includes('استقال') || message.includes('دوران'))) {
                    const result = await this.agentTools.executeTool('predict_turnover', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('حلل') && message.includes('راتب') || message.includes('تحليل الرواتب')) {
                    const result = await this.agentTools.executeTool('salary_analysis', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('شذوذ') || message.includes('غير طبيعي') || message.includes('anomaly')) {
                    const result = await this.agentTools.executeTool('anomaly_detection', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('توزيع') && message.includes('مهام') || message.includes('workload')) {
                    const result = await this.agentTools.executeTool('workload_analysis', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('أرسل') && message.includes('إشعار') && message.includes('لـ')) {
                    const match = message.match(/لـ\s*(\S+)/);
                    const msgMatch = message.match(/إشعار[:\s]+(.+?)(?:\s+لـ|$)/);
                    if (match) {
                        const result = await this.agentTools.executeTool('send_notification', { employeeName: match[1], message: msgMatch?.[1] || 'تنبيه' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                        return result.message;
                    }
                }
                if (message.includes('رسالة جماعية') || message.includes('broadcast')) {
                    const msgMatch = message.match(/جماعية[:\s]+(.+)/);
                    const result = await this.agentTools.executeTool('broadcast_message', { message: msgMatch?.[1] || message }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('تذكير') || message.includes('reminder')) {
                    const titleMatch = message.match(/تذكير[:\s]+(.+)/);
                    const result = await this.agentTools.executeTool('create_reminder', { title: titleMatch?.[1] || 'تذكير', date: new Date().toISOString().split('T')[0] }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('تقرير ملخص') || message.includes('summary report')) {
                    const result = await this.agentTools.executeTool('send_summary_report', { type: 'daily' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('صدر') && (message.includes('موظفين') || message.includes('حضور') || message.includes('إجازات'))) {
                    let dataType = 'employees';
                    if (message.includes('حضور'))
                        dataType = 'attendance';
                    if (message.includes('إجازات'))
                        dataType = 'leaves';
                    const result = await this.agentTools.executeTool('export_data', { dataType: dataType, format: 'json' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('إحصائيات') && (message.includes('قاعدة') || message.includes('بيانات'))) {
                    const result = await this.agentTools.executeTool('database_stats', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('نسخ') && message.includes('احتياطي') || message.includes('backup')) {
                    const result = await this.agentTools.executeTool('backup_status', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('صحة') && message.includes('api') || message.includes('health check')) {
                    const result = await this.agentTools.executeTool('api_health', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('إجراءات سريعة') || message.includes('quick actions')) {
                    const result = await this.agentTools.executeTool('quick_actions', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('اقتراحات') || message.includes('suggestions')) {
                    const result = await this.agentTools.executeTool('smart_suggestions', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('مساعدة') || message.includes('help') || message.includes('الأوامر')) {
                    const result = await this.agentTools.executeTool('help_commands', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('وافق') && message.includes('كل') && message.includes('إجاز')) {
                    const result = await this.agentTools.executeTool('batch_approve_leaves', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('ملخص يومي') || message.includes('daily digest')) {
                    const result = await this.agentTools.executeTool('daily_digest', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('تذكيرات تلقائية') || message.includes('auto reminder')) {
                    const result = await this.agentTools.executeTool('auto_reminder', { type: 'tasks' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('تقرير حضور') && message.includes('تفصيلي')) {
                    const nameMatch = message.match(/لـ?\s*(\S+)/);
                    const result = await this.agentTools.executeTool('attendance_detailed_report', { employeeName: nameMatch?.[1] || '' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('تفاصيل راتب') || message.includes('راتب') && message.includes('تفصيل')) {
                    const nameMatch = message.match(/راتب\s+(\S+)/);
                    const result = await this.agentTools.executeTool('salary_breakdown', { employeeName: nameMatch?.[1] || '' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('تقرير قسم') || message.includes('قسم') && message.includes('تقرير')) {
                    const deptMatch = message.match(/قسم\s+(\S+)/);
                    const result = await this.agentTools.executeTool('department_report', { departmentName: deptMatch?.[1] || '' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('مقارنة شهرية') || message.includes('قارن') && message.includes('شهر')) {
                    const result = await this.agentTools.executeTool('monthly_comparison', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('مكافأة') || message.includes('bonus')) {
                    const nameMatch = message.match(/مكافأة\s+(\S+)\s+(\d+)/);
                    if (nameMatch) {
                        const result = await this.agentTools.executeTool('add_bonus', { employeeName: nameMatch[1], amount: parseInt(nameMatch[2]), reason: 'مكافأة' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                        return result.message;
                    }
                }
                if (message.includes('اخصم') || message.includes('خصم')) {
                    const nameMatch = message.match(/(?:اخصم|خصم)\s+(\d+)\s+من\s+(\S+)/);
                    if (nameMatch) {
                        const result = await this.agentTools.executeTool('add_deduction', { employeeName: nameMatch[2], amount: parseInt(nameMatch[1]), reason: 'خصم' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                        return result.message;
                    }
                }
                if (message.includes('حالة الرواتب') || message.includes('payroll status')) {
                    const result = await this.agentTools.executeTool('payroll_status', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('أوفرتايم') || message.includes('overtime')) {
                    const nameMatch = message.match(/أوفرتايم\s+(\S+)/);
                    const result = await this.agentTools.executeTool('calculate_overtime', { employeeName: nameMatch?.[1] || '' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('أنشئ وردية') || message.includes('وردية جديدة')) {
                    const match = message.match(/وردية\s+(\S+)\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})/);
                    if (match) {
                        const result = await this.agentTools.executeTool('create_shift', { name: match[1], startTime: match[2], endTime: match[3] }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                        return result.message;
                    }
                }
                if (message.includes('اعرض الورديات') || message.includes('الورديات')) {
                    const result = await this.agentTools.executeTool('list_shifts', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('عيّن وردية') || message.includes('وردية') && message.includes('لـ')) {
                    const match = message.match(/وردية\s+(\S+)\s+لـ?\s*(\S+)/);
                    if (match) {
                        const result = await this.agentTools.executeTool('assign_shift', { shiftName: match[1], employeeName: match[2] }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                        return result.message;
                    }
                }
                if (message.includes('ورديات اليوم')) {
                    const result = await this.agentTools.executeTool('today_shifts', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('العطلات') || message.includes('الإجازات الرسمية')) {
                    const result = await this.agentTools.executeTool('company_holidays', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('الأحداث القادمة') || message.includes('events')) {
                    const result = await this.agentTools.executeTool('upcoming_events', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('أعياد الميلاد') || message.includes('عيد ميلاد')) {
                    const result = await this.agentTools.executeTool('birthdays_this_month', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('ذكرى التعيين') || message.includes('anniversary')) {
                    const result = await this.agentTools.executeTool('work_anniversaries', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('طلب سلفة') || message.includes('سلفة')) {
                    const match = message.match(/سلفة\s+(\d+)/);
                    const result = await this.agentTools.executeTool('request_advance', { amount: match?.[1] ? parseInt(match[1]) : 1000 }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('السلف المعلقة')) {
                    const result = await this.agentTools.executeTool('pending_advances', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('القروض') || message.includes('قروض')) {
                    const result = await this.agentTools.executeTool('employee_loans', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('ملخص القروض')) {
                    const result = await this.agentTools.executeTool('loan_summary', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('مؤشرات أداء') || message.includes('kpi')) {
                    const nameMatch = message.match(/أداء\s+(\S+)/);
                    const result = await this.agentTools.executeTool('employee_kpis', { employeeName: nameMatch?.[1] || '' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('أداء القسم')) {
                    const deptMatch = message.match(/قسم\s+(\S+)/);
                    const result = await this.agentTools.executeTool('department_performance', { departmentName: deptMatch?.[1] || '' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('أفضل الموظفين') || message.includes('top performers')) {
                    const result = await this.agentTools.executeTool('top_performers', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('مقارنة الأداء')) {
                    const result = await this.agentTools.executeTool('performance_comparison', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('عقد عمل') || message.includes('contract')) {
                    const nameMatch = message.match(/عقد\s+(\S+)/);
                    const result = await this.agentTools.executeTool('generate_contract', { employeeName: nameMatch?.[1] || '' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('شهادة خبرة') || message.includes('certificate')) {
                    const nameMatch = message.match(/شهادة\s+(\S+)/);
                    const result = await this.agentTools.executeTool('generate_certificate', { employeeName: nameMatch?.[1] || '' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('كشف راتب') || message.includes('salary slip')) {
                    const nameMatch = message.match(/كشف\s+(\S+)/);
                    const result = await this.agentTools.executeTool('generate_salary_slip', { employeeName: nameMatch?.[1] || '' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('إنذار') || message.includes('warning')) {
                    const nameMatch = message.match(/إنذار\s+(\S+)/);
                    const result = await this.agentTools.executeTool('generate_warning_letter', { employeeName: nameMatch?.[1] || '', reason: 'مخالفة' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('صلاحيات')) {
                    const nameMatch = message.match(/صلاحيات\s+(\S+)/);
                    const result = await this.agentTools.executeTool('user_permissions', { employeeName: nameMatch?.[1] || '' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('الجلسات النشطة') || message.includes('sessions')) {
                    const result = await this.agentTools.executeTool('active_sessions', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('سجل الدخول') || message.includes('login history')) {
                    const result = await this.agentTools.executeTool('login_history', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('سجل التدقيق') || message.includes('audit')) {
                    const result = await this.agentTools.executeTool('system_audit', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('توقع الحضور')) {
                    const result = await this.agentTools.executeTool('attendance_forecast', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('توقع الميزانية') || message.includes('budget')) {
                    const result = await this.agentTools.executeTool('budget_forecast', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('احتياجات التوظيف') || message.includes('hiring')) {
                    const result = await this.agentTools.executeTool('hiring_needs', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('دوران الموظفين') || message.includes('turnover')) {
                    const result = await this.agentTools.executeTool('turnover_prediction', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('زيادة الرواتب') || message.includes('bulk salaries')) {
                    const match = message.match(/(\d+)%/);
                    const result = await this.agentTools.executeTool('bulk_update_salaries', { percentage: match?.[1] ? parseInt(match[1]) : 10 }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('نقل موظفين')) {
                    const result = await this.agentTools.executeTool('bulk_assign_department', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('أرشفة') || message.includes('archive')) {
                    const result = await this.agentTools.executeTool('archive_old_records', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('تنظيف التكرارات') || message.includes('cleanup')) {
                    const result = await this.agentTools.executeTool('cleanup_duplicates', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('إيميل ترحيب') || message.includes('welcome email')) {
                    const result = await this.agentTools.executeTool('send_welcome_email', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('قوالب الإيميل')) {
                    const result = await this.agentTools.executeTool('email_templates', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('سجل الإيميلات')) {
                    const result = await this.agentTools.executeTool('email_history', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('رصيد sms') || message.includes('رصيد الرسائل')) {
                    const result = await this.agentTools.executeTool('sms_balance', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('سجل sms') || message.includes('سجل الرسائل')) {
                    const result = await this.agentTools.executeTool('sms_history', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('التنبيهات النشطة')) {
                    const result = await this.agentTools.executeTool('active_alerts', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('سجل التنبيهات')) {
                    const result = await this.agentTools.executeTool('alert_history', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('ملخص') || message.includes('dashboard')) {
                    const result = await this.agentTools.executeTool('dashboard_summary', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('إحصائيات سريعة') || message.includes('quick stats')) {
                    const result = await this.agentTools.executeTool('quick_stats', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('نظرة عامة')) {
                    const result = await this.agentTools.executeTool('today_overview', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('تقرير أسبوعي')) {
                    const result = await this.agentTools.executeTool('weekly_report', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('تصدير الموظفين') || message.includes('export employees')) {
                    const result = await this.agentTools.executeTool('export_employees', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('تصدير الحضور')) {
                    const result = await this.agentTools.executeTool('export_attendance', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('workflows') || message.includes('عرض workflows')) {
                    const result = await this.agentTools.executeTool('list_workflows', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('سجل workflows')) {
                    const result = await this.agentTools.executeTool('workflow_history', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('النماذج') || message.includes('forms')) {
                    const result = await this.agentTools.executeTool('list_forms', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('تحليلات النماذج')) {
                    const result = await this.agentTools.executeTool('form_analytics', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('أهداف الفريق') || message.includes('team goals')) {
                    const result = await this.agentTools.executeTool('team_goals', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('okr') || message.includes('ملخص الأهداف')) {
                    const result = await this.agentTools.executeTool('okr_summary', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('إعلانات الفريق') || message.includes('announcements')) {
                    const result = await this.agentTools.executeTool('team_announcements', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('سجل المحادثات')) {
                    const result = await this.agentTools.executeTool('chat_history', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('توصيات') || message.includes('recommendations')) {
                    const result = await this.agentTools.executeTool('ai_recommendations', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('تحليل الأنماط') || message.includes('patterns')) {
                    const result = await this.agentTools.executeTool('pattern_analysis', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('تقييم المخاطر') || message.includes('risk')) {
                    const result = await this.agentTools.executeTool('risk_assessment', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('اقتراحات التحسين') || message.includes('suggestions')) {
                    const result = await this.agentTools.executeTool('improvement_suggestions', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('أضف قسم') || message.includes('إضافة قسم') || /قسم\s+جديد/.test(message)) {
                    const nameMatch = message.match(/قسم\s+(?:جديد\s+)?(\S+)/);
                    const result = await this.agentTools.executeTool('add_department', { name: nameMatch?.[1] || '' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('أضف فرع') || message.includes('إضافة فرع') || /فرع\s+جديد/.test(message)) {
                    const nameMatch = message.match(/فرع\s+(?:جديد\s+)?(\S+)/);
                    const result = await this.agentTools.executeTool('add_branch', { name: nameMatch?.[1] || '' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('أضف وظيفة') || message.includes('إضافة وظيفة') || /وظيفة\s+جديدة/.test(message)) {
                    const nameMatch = message.match(/وظيفة\s+(?:جديدة\s+)?(\S+)/);
                    const result = await this.agentTools.executeTool('add_position', { title: nameMatch?.[1] || '' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('أضف نوع إجازة') || message.includes('إضافة نوع إجازة')) {
                    const nameMatch = message.match(/إجازة\s+(\S+)/);
                    const result = await this.agentTools.executeTool('add_leave_type', { name: nameMatch?.[1] || '' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('أضف عطلة') || message.includes('إضافة عطلة')) {
                    const nameMatch = message.match(/عطلة\s+(\S+)/);
                    const dateMatch = message.match(/(\d{4}-\d{2}-\d{2})/);
                    const result = await this.agentTools.executeTool('add_holiday', { name: nameMatch?.[1] || '', date: dateMatch?.[1] || '' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('أضف سياسة') || message.includes('إضافة سياسة')) {
                    const nameMatch = message.match(/سياسة\s+(\S+)/);
                    const result = await this.agentTools.executeTool('add_policy', { name: nameMatch?.[1] || '' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('أضف حضور') || message.includes('سجل حضور') || message.includes('حضور يدوي')) {
                    const empMatch = message.match(/حضور\s+(\S+)/);
                    const dateMatch = message.match(/(\d{4}-\d{2}-\d{2})/);
                    const result = await this.agentTools.executeTool('add_attendance_manual', { employeeName: empMatch?.[1] || '', date: dateMatch?.[1] || new Date().toISOString().split('T')[0] }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('أضف overtime') || message.includes('عمل إضافي')) {
                    const empMatch = message.match(/(?:لـ|ل)\s*(\S+)/);
                    const hoursMatch = message.match(/(\d+)\s*ساع/);
                    const result = await this.agentTools.executeTool('add_overtime_request', { employeeName: empMatch?.[1] || '', hours: hoursMatch?.[1] ? parseInt(hoursMatch[1]) : 2 }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('أضف مهمة') || message.includes('إضافة مهمة') || /مهمة\s+جديدة/.test(message)) {
                    const titleMatch = message.match(/مهمة\s+(?:جديدة\s+)?(\S+)/);
                    const result = await this.agentTools.executeTool('add_task', { title: titleMatch?.[1] || '' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('أضف إعلان') || message.includes('إضافة إعلان')) {
                    const titleMatch = message.match(/إعلان\s+(\S+)/);
                    const result = await this.agentTools.executeTool('add_announcement', { title: titleMatch?.[1] || 'إعلان جديد', content: message }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('أضف ملاحظة') || message.includes('ملاحظة لـ')) {
                    const empMatch = message.match(/(?:لـ|ل)\s*(\S+)/);
                    const result = await this.agentTools.executeTool('add_note', { employeeName: empMatch?.[1] || '', note: message }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('أضف تدريب') || message.includes('إضافة تدريب')) {
                    const titleMatch = message.match(/تدريب\s+(\S+)/);
                    const result = await this.agentTools.executeTool('add_training', { title: titleMatch?.[1] || '' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('أنشئ موديول') || message.includes('إنشاء موديول') || message.includes('generate module')) {
                    const nameMatch = message.match(/موديول\s+(\S+)/);
                    const result = await this.agentTools.executeTool('generate_module', { moduleName: nameMatch?.[1] || '' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('أنشئ model') || message.includes('إنشاء model') || message.includes('prisma model')) {
                    const nameMatch = message.match(/model\s+(\S+)/);
                    const result = await this.agentTools.executeTool('generate_prisma_model', { modelName: nameMatch?.[1] || '' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('أنشئ api') || message.includes('إنشاء api') || message.includes('generate api')) {
                    const nameMatch = message.match(/api\s+(\S+)/);
                    const result = await this.agentTools.executeTool('generate_api_endpoint', { name: nameMatch?.[1] || '' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('أنشئ صفحة') || message.includes('إنشاء صفحة') || message.includes('generate page')) {
                    const nameMatch = message.match(/صفحة\s+(\S+)/);
                    const result = await this.agentTools.executeTool('generate_frontend_page', { pageName: nameMatch?.[1] || '' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('أنشئ نظام') || message.includes('إنشاء نظام') || message.includes('نظام كامل') || message.includes('crud system')) {
                    const nameMatch = message.match(/نظام\s+(\S+)/);
                    const result = await this.agentTools.executeTool('generate_crud_system', { systemName: nameMatch?.[1] || '' }, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('الموديولات') || message.includes('list modules') || message.includes('عرض الموديولات')) {
                    const result = await this.agentTools.executeTool('list_generated_modules', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('prisma migrate') || message.includes('migration') || message.includes('ترحيل')) {
                    const result = await this.agentTools.executeTool('run_prisma_migrate', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
                if (message.includes('deploy') || message.includes('نشر') || message.includes('رفع التغييرات')) {
                    const result = await this.agentTools.executeTool('deploy_changes', {}, { companyId: context.companyId, userId: context.userId, userRole: context.userRole });
                    return result.message;
                }
            }
            if (/رصيد.*إجاز|إجازات.*رصيد|كم.*إجاز/.test(message)) {
                return await this.getLeaveBalance(context.userId);
            }
            if (/حضور.*اليوم|اليوم.*حضور/.test(message)) {
                return await this.getTodayAttendance(context.userId);
            }
            if (/راتب|معاش/.test(message) && !/عدل|غير/.test(message)) {
                return await this.getSalaryInfo(context.userId);
            }
            return '';
        }
        catch (error) {
            this.logger.error(`[AI-CHAT] Action error: ${error.message}`);
            return '';
        }
    }
    parseUpdateCommand(message) {
        const separators = ['الي', 'إلى', 'الى', ' ل '];
        let separatorIndex = -1;
        let usedSeparator = '';
        for (const sep of separators) {
            const idx = message.indexOf(sep);
            if (idx !== -1 && (separatorIndex === -1 || idx < separatorIndex)) {
                separatorIndex = idx;
                usedSeparator = sep;
            }
        }
        if (separatorIndex === -1) {
            return { employeeName: '', value: '' };
        }
        const beforeSeparator = message.substring(0, separatorIndex);
        const afterSeparator = message.substring(separatorIndex + usedSeparator.length);
        let name = beforeSeparator
            .replace(/عدل|غير|حدث|انقل/g, '')
            .replace(/راتب|معاش|قسم|إدارة|مسمى/g, '')
            .replace(/الموظف/g, '')
            .trim();
        let value = afterSeparator.replace(/ريال/g, '').trim();
        this.logger.log(`[PARSE] Name: "${name}", Value: "${value}"`);
        return { employeeName: name, value };
    }
    extractNameFromMessage(message) {
        const cleaned = message
            .replace(/بيانات|معلومات|تفاصيل|ملف|سجل/g, '')
            .replace(/توقع|معدل|احتمال|مخاطر/g, '')
            .replace(/دوران|استقالة|ترك/g, '')
            .replace(/احذف|امسح|أضف|انشئ/g, '')
            .replace(/وافق|اقبل|ارفض/g, '')
            .replace(/إجازة|اجازة|مهمة/g, '')
            .replace(/على|عن|من|ل|لـ/g, '')
            .replace(/الموظف|موظف/g, '')
            .trim();
        this.logger.log(`[EXTRACT NAME] Result: "${cleaned}"`);
        return cleaned;
    }
    parseAddEmployeeCommand(message) {
        const result = {};
        const nameMatch = message.match(/اسمه?\s+([^\s]+(?:\s+[^\s]+)?)/);
        if (nameMatch) {
            const nameParts = nameMatch[1].split(' ');
            result.firstName = nameParts[0];
            result.lastName = nameParts[1] || '';
        }
        const deptMatch = message.match(/(?:قسم|إدارة)\s+([^\s]+)/);
        if (deptMatch) {
            result.department = deptMatch[1];
        }
        const salaryMatch = message.match(/(?:راتب|براتب)\s+(\d+)/);
        if (salaryMatch) {
            result.salary = parseInt(salaryMatch[1]);
        }
        if (result.firstName) {
            result.email = `${result.firstName.toLowerCase()}@company.com`;
        }
        this.logger.log(`[PARSE ADD] Result: ${JSON.stringify(result)}`);
        return result;
    }
    parseTaskCommand(message) {
        const result = {};
        const titleMatch = message.match(/مهمة\s+["""]?([^"""]+)["""]?/);
        if (titleMatch) {
            result.title = titleMatch[1].replace(/للموظف.*/, '').trim();
        }
        else {
            result.title = 'مهمة جديدة';
        }
        const assigneeMatch = message.match(/(?:للموظف|لـ|ل)\s*([^\s]+(?:\s+[^\s]+)?)/);
        if (assigneeMatch) {
            result.assigneeName = assigneeMatch[1].trim();
        }
        this.logger.log(`[PARSE TASK] Result: ${JSON.stringify(result)}`);
        return result;
    }
    async findEmployeeByName(name, companyId) {
        const nameParts = name.split(' ').filter(p => p.length > 1);
        this.logger.log(`[FIND] Searching for employee: "${name}", parts: ${JSON.stringify(nameParts)}`);
        if (nameParts.length === 0) {
            return [];
        }
        const allEmployees = await this.prisma.user.findMany({
            where: { companyId },
            select: { id: true, firstName: true, lastName: true, salary: true, hireDate: true },
        });
        const scored = allEmployees.map(emp => {
            let score = 0;
            const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
            for (const part of nameParts) {
                if (emp.firstName?.toLowerCase().includes(part.toLowerCase())) {
                    score += 2;
                }
                if (emp.lastName?.toLowerCase().includes(part.toLowerCase())) {
                    score += 2;
                }
            }
            if (fullName.includes(name.toLowerCase())) {
                score += 5;
            }
            return { ...emp, score };
        });
        const matches = scored.filter(e => e.score > 0).sort((a, b) => b.score - a.score);
        this.logger.log(`[FIND] Found ${matches.length} matches. Top: ${matches.slice(0, 3).map(e => `${e.firstName} ${e.lastName} (score:${e.score})`).join(', ')}`);
        if (matches.length > 0 && matches[0].score < 2) {
            this.logger.log(`[FIND] Low confidence match, returning empty`);
            return [];
        }
        return matches.slice(0, 5);
    }
    async getEmployeeFullData(name, companyId) {
        const employees = await this.findEmployeeByName(name, companyId);
        if (employees.length === 0) {
            return `❌ لم يتم العثور على موظف باسم "${name}"`;
        }
        const emp = employees[0];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const [attendance, leaves, tasks] = await Promise.all([
            this.prisma.attendance.findMany({
                where: { userId: emp.id, date: { gte: thirtyDaysAgo } },
            }),
            this.prisma.leaveRequest.count({
                where: { userId: emp.id, status: 'APPROVED', createdAt: { gte: thirtyDaysAgo } },
            }),
            this.prisma.task.count({
                where: { assigneeId: emp.id, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
            }),
        ]);
        const presentDays = attendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
        const lateDays = attendance.filter((a) => a.status === 'LATE').length;
        const absentDays = attendance.filter((a) => a.status === 'ABSENT').length;
        return `
👤 بيانات الموظف: ${emp.firstName} ${emp.lastName}
━━━━━━━━━━━━━━━━━━━━
📋 المسمى: ${emp.jobTitle || 'غير محدد'}
🏢 القسم: ${emp.department || 'غير محدد'}
💰 الراتب: ${emp.salary ? `${Number(emp.salary).toLocaleString('ar-SA')} ريال` : 'غير محدد'}
📅 تاريخ التعيين: ${emp.hireDate?.toLocaleDateString('ar-SA') || 'غير محدد'}

📊 إحصائيات آخر 30 يوم:
- أيام الحضور: ${presentDays} ✅
- أيام التأخير: ${lateDays} ⏰
- أيام الغياب: ${absentDays} 🚫
- الإجازات المعتمدة: ${leaves} 🏖️
- المهام النشطة: ${tasks} 📋

🎯 معرف الموظف: ${emp.id}
        `.trim();
    }
    async analyzeEmployeeTurnover(name, companyId) {
        const employees = await this.findEmployeeByName(name, companyId);
        if (employees.length === 0) {
            return `❌ لم يتم العثور على موظف باسم "${name}"`;
        }
        const emp = employees[0];
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const riskFactors = [];
        let riskScore = 0;
        if (emp.hireDate) {
            const monthsOfService = Math.floor((Date.now() - new Date(emp.hireDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
            if (monthsOfService < 6) {
                riskScore += 25;
                riskFactors.push(`📅 موظف جديد (${monthsOfService} شهور)`);
            }
            else if (monthsOfService > 36) {
                riskScore -= 10;
            }
        }
        const absentCount = await this.prisma.attendance.count({
            where: { userId: emp.id, date: { gte: sixMonthsAgo }, status: 'ABSENT' },
        });
        if (absentCount >= 10) {
            riskScore += 30;
            riskFactors.push(`🚫 غياب متكرر (${absentCount} يوم)`);
        }
        else if (absentCount >= 5) {
            riskScore += 15;
            riskFactors.push(`⚠️ غياب ملحوظ (${absentCount} يوم)`);
        }
        const lateCount = await this.prisma.attendance.count({
            where: { userId: emp.id, date: { gte: sixMonthsAgo }, status: 'LATE' },
        });
        if (lateCount >= 15) {
            riskScore += 20;
            riskFactors.push(`⏰ تأخير متكرر (${lateCount} مرة)`);
        }
        const leaveCount = await this.prisma.leaveRequest.count({
            where: { userId: emp.id, status: 'APPROVED', createdAt: { gte: sixMonthsAgo } },
        });
        if (leaveCount === 0) {
            riskScore += 15;
            riskFactors.push('🏖️ لم يأخذ إجازة منذ 6 أشهر');
        }
        const activeTasks = await this.prisma.task.count({
            where: { assigneeId: emp.id, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        });
        if (activeTasks > 10) {
            riskScore += 20;
            riskFactors.push(`📋 عبء عمل مرتفع (${activeTasks} مهمة)`);
        }
        riskScore = Math.max(0, Math.min(100, riskScore));
        let riskLevel;
        let riskEmoji;
        let recommendation;
        if (riskScore >= 60) {
            riskLevel = 'مرتفع';
            riskEmoji = '🔴';
            recommendation = 'يُنصح بإجراء محادثة فردية عاجلة وفهم التحديات';
        }
        else if (riskScore >= 30) {
            riskLevel = 'متوسط';
            riskEmoji = '🟡';
            recommendation = 'متابعة دورية والاهتمام بالتوازن بين العمل والحياة';
        }
        else {
            riskLevel = 'منخفض';
            riskEmoji = '🟢';
            recommendation = 'الموظف مستقر - استمر في المتابعة المعتادة';
        }
        return `
🚪 تحليل معدل الدوران: ${emp.firstName} ${emp.lastName}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${riskEmoji} مستوى المخاطر: ${riskLevel} (${riskScore}%)

📊 عوامل المخاطر:
${riskFactors.length > 0 ? riskFactors.map(f => `• ${f}`).join('\n') : '• ✅ لا توجد عوامل خطر واضحة'}

💡 التوصية:
${recommendation}

📌 يمكنك تعديل بيانات الموظف عبر الشات، مثال: "عدل راتب ${emp.firstName} إلى 8000"
        `.trim();
    }
    async updateEmployeeField(name, field, value, companyId) {
        const employees = await this.findEmployeeByName(name, companyId);
        if (employees.length === 0) {
            return `❌ لم يتم العثور على موظف باسم "${name}"`;
        }
        const emp = employees[0];
        const fieldNames = {
            salary: 'الراتب',
            department: 'القسم',
            jobTitle: 'المسمى الوظيفي',
            phone: 'رقم الجوال',
        };
        try {
            const updateData = {};
            if (field === 'salary') {
                updateData.salary = parseFloat(value);
            }
            else {
                updateData[field] = value;
            }
            await this.prisma.user.update({
                where: { id: emp.id },
                data: updateData,
            });
            this.logger.log(`Updated ${field} for ${emp.firstName} ${emp.lastName} to ${value}`);
            return `
✅ تم التعديل بنجاح!
━━━━━━━━━━━━━━━━━
👤 الموظف: ${emp.firstName} ${emp.lastName}
📝 الحقل: ${fieldNames[field] || field}
🔄 القيمة الجديدة: ${field === 'salary' ? `${Number(value).toLocaleString('ar-SA')} ريال` : value}

✨ تم حفظ التغييرات في قاعدة البيانات.
            `.trim();
        }
        catch (error) {
            this.logger.error(`Update error: ${error.message}`);
            return `❌ فشل التعديل: ${error.message}`;
        }
    }
    async addLeaveDays(name, days, companyId) {
        const employees = await this.findEmployeeByName(name, companyId);
        if (employees.length === 0) {
            return `❌ لم يتم العثور على موظف باسم "${name}"`;
        }
        const emp = employees[0];
        try {
            const currentDays = emp.annualLeaveDays || 21;
            const newDays = currentDays + days;
            await this.prisma.user.update({
                where: { id: emp.id },
                data: { annualLeaveDays: newDays },
            });
            this.logger.log(`Added ${days} leave days for ${emp.firstName} ${emp.lastName}`);
            return `
✅ تمت إضافة الإجازة بنجاح!
━━━━━━━━━━━━━━━━━━━━━
👤 الموظف: ${emp.firstName} ${emp.lastName}
🏖️ الأيام المضافة: ${days} يوم
📊 الرصيد الجديد: ${newDays} يوم

✨ تم حفظ التغييرات.
            `.trim();
        }
        catch (error) {
            this.logger.error(`Add leave error: ${error.message}`);
            return `❌ فشل إضافة الإجازة: ${error.message}`;
        }
    }
    async getLeaveBalance(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                annualLeaveDays: true,
                usedLeaveDays: true,
                remainingLeaveDays: true,
            },
        });
        if (!user)
            return 'لم يتم العثور على بيانات الإجازات';
        const annual = user.annualLeaveDays ?? 21;
        const used = user.usedLeaveDays ?? 0;
        const remaining = user.remainingLeaveDays ?? (annual - used);
        return `
📊 رصيد الإجازات:
- الرصيد السنوي: ${annual} يوم
- المستخدم: ${used} يوم
- المتبقي: ${remaining} يوم
        `.trim();
    }
    async getTodayAttendance(userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const attendance = await this.prisma.attendance.findFirst({
            where: {
                userId,
                date: {
                    gte: today,
                    lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
                },
            },
        });
        if (!attendance)
            return '📅 لم يتم تسجيل حضور اليوم بعد';
        const att = attendance;
        return `
📅 سجل حضور اليوم:
- وقت الحضور: ${att.checkIn ? new Date(att.checkIn).toLocaleTimeString('ar-SA') : 'لم يسجل'}
- وقت الانصراف: ${att.checkOut ? new Date(att.checkOut).toLocaleTimeString('ar-SA') : 'لم يسجل'}
- الحالة: ${this.translateStatus(att.status)}
- التأخير: ${att.lateMinutes || 0} دقيقة
        `.trim();
    }
    async getSalaryInfo(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                salary: true,
                hireDate: true,
            },
        });
        if (!user)
            return 'لم يتم العثور على بيانات الراتب';
        const baseSalary = Number(user.salary) || 0;
        const housingAllowance = baseSalary * 0.25;
        const transportAllowance = baseSalary * 0.10;
        const total = baseSalary + housingAllowance + transportAllowance;
        return `
💰 معلومات الراتب:
- الراتب الأساسي: ${baseSalary.toLocaleString('ar-SA')} ريال
- بدل السكن (25%): ${housingAllowance.toLocaleString('ar-SA')} ريال
- بدل المواصلات (10%): ${transportAllowance.toLocaleString('ar-SA')} ريال
- الإجمالي التقريبي: ${total.toLocaleString('ar-SA')} ريال

📌 ملاحظة: هذه الأرقام تقريبية. للتفاصيل الدقيقة راجع كشف الراتب.
        `.trim();
    }
    async getTeamStatus(companyId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [totalEmployees, presentToday, lateToday] = await Promise.all([
            this.prisma.user.count({
                where: { companyId, status: 'ACTIVE', role: 'EMPLOYEE' },
            }),
            this.prisma.attendance.count({
                where: {
                    user: { companyId },
                    date: { gte: today },
                    status: { in: ['PRESENT', 'LATE'] },
                },
            }),
            this.prisma.attendance.count({
                where: {
                    user: { companyId },
                    date: { gte: today },
                    status: 'LATE',
                },
            }),
        ]);
        const attendanceRate = totalEmployees > 0
            ? ((presentToday / totalEmployees) * 100).toFixed(1)
            : '0';
        return `
👥 حالة الفريق اليوم:
- إجمالي الموظفين: ${totalEmployees}
- الحاضرين: ${presentToday} ✅
- المتأخرين: ${lateToday} ⏰
- نسبة الحضور: ${attendanceRate}%
        `.trim();
    }
    async getLateEmployees(companyId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lateAttendances = await this.prisma.attendance.findMany({
            where: {
                user: { companyId },
                date: { gte: today },
                status: 'LATE',
            },
            include: {
                user: { select: { firstName: true, lastName: true } },
            },
            take: 10,
        });
        if (lateAttendances.length === 0) {
            return '✅ لا يوجد موظفين متأخرين اليوم! 🎉';
        }
        const list = lateAttendances.map(a => {
            const att = a;
            return `- ${a.user.firstName} ${a.user.lastName}: تأخر ${att.lateMinutes || 0} دقيقة`;
        }).join('\n');
        return `
⏰ الموظفين المتأخرين اليوم (${lateAttendances.length}):
${list}
        `.trim();
    }
    translateStatus(status) {
        const statusMap = {
            'PRESENT': 'حاضر ✅',
            'LATE': 'متأخر ⏰',
            'ABSENT': 'غائب 🚫',
            'ON_LEAVE': 'في إجازة 🏖️',
            'REMOTE': 'عمل عن بعد 🏠',
        };
        return statusMap[status] || status;
    }
    async getUserContext(userId) {
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
        return {
            userId: user?.id || userId,
            userName: user ? `${user.firstName} ${user.lastName}` : 'موظف',
            userRole: user?.role || 'EMPLOYEE',
            companyId: user?.companyId || '',
        };
    }
    buildPrompt(context, history, currentMessage, actionData) {
        const historyText = history
            .slice(-6)
            .map(m => `${m.role === 'user' ? '👤 المستخدم' : '🤖 المساعد'}: ${m.content}`)
            .join('\n');
        const dataSection = actionData ? `\n\n📊 البيانات الفعلية من النظام:\n${actionData}` : '';
        return `أنت مساعد ذكي لنظام الحضور والانصراف. اسمك "مساعد الموظفين".

📌 معلومات المستخدم:
- الاسم: ${context.userName}
- الدور: ${context.userRole === 'ADMIN' ? 'مدير' : context.userRole === 'HR' ? 'موارد بشرية' : 'موظف'}
${dataSection}

📝 تاريخ المحادثة:
${historyText}

👤 الرسالة الحالية: ${currentMessage}

🎯 تعليمات:
- ${actionData ? 'استخدم البيانات الفعلية أعلاه للرد بدقة' : 'أجب بشكل عام ومفيد'}
- أجب بالعربية بشكل مختصر ومفيد
- استخدم الإيموجي لجعل الردود ودية
- إذا كانت هناك بيانات فعلية، قدمها بشكل واضح

🤖 ردك:`;
    }
    extractSuggestions(context) {
        if (context.userRole === 'ADMIN' || context.userRole === 'HR') {
            return [
                'أعرض حالة الفريق اليوم',
                'مين الموظفين المتأخرين؟',
                'كم رصيد إجازاتي؟',
                'كم راتبي؟',
            ];
        }
        return [
            'كم رصيد إجازاتي؟',
            'أعرض حضوري اليوم',
            'كم راتبي؟',
            'ما هي ساعات العمل؟',
        ];
    }
    clearHistory(userId) {
        this.conversationHistory.delete(userId);
    }
    getHistory(userId) {
        return this.conversationHistory.get(userId) || [];
    }
};
exports.AiChatService = AiChatService;
exports.AiChatService = AiChatService = AiChatService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_service_1.AiService,
        ai_agent_tools_service_1.AiAgentToolsService])
], AiChatService);
//# sourceMappingURL=ai-chat.service.js.map