import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { SchemaDiscoveryService } from '../../smart-policies/schema-discovery.service';
import { AiService } from '../../ai/ai.service';

/**
 * 🧠 Dynamic Query Engine - Schema-Aware AI
 * 
 * يفهم كل الـ Schema ويقدر يجاوب على أي سؤال!
 * 
 * المميزات:
 * 1. يقرأ الـ Schema الكامل ديناميكياً
 * 2. يحول الأسئلة الطبيعية لـ Prisma queries
 * 3. ينفذ الـ queries بأمان (read-only)
 * 4. يُنسق النتائج بشكل مفهوم
 */

export interface QueryPlan {
    model: string;
    operation: 'findMany' | 'count' | 'aggregate' | 'groupBy';
    where: Record<string, any>;
    select?: Record<string, boolean | object>;
    orderBy?: Record<string, 'asc' | 'desc'>;
    take?: number;
    include?: Record<string, boolean | object>;
}

export interface DynamicQueryResult {
    success: boolean;
    data: any;
    explanation: string;
    queryPlan?: QueryPlan;
    executionTimeMs?: number;
    suggestions?: string[];
}

// الجداول والحقول العربية
const ARABIC_SCHEMA_MAP: Record<string, { model: string; arabicName: string; fields: Record<string, string> }> = {
    'موظف': { model: 'user', arabicName: 'الموظفين', fields: { 'اسم': 'firstName', 'راتب': 'salary', 'قسم': 'department', 'فرع': 'branch', 'مسمى': 'jobTitle', 'حالة': 'status', 'تعيين': 'hireDate' } },
    'موظفين': { model: 'user', arabicName: 'الموظفين', fields: { 'اسم': 'firstName', 'راتب': 'salary', 'قسم': 'department', 'فرع': 'branch', 'مسمى': 'jobTitle', 'حالة': 'status' } },
    'حضور': { model: 'attendance', arabicName: 'الحضور', fields: { 'تاريخ': 'date', 'دخول': 'checkInTime', 'خروج': 'checkOutTime', 'تأخير': 'lateMinutes', 'حالة': 'status' } },
    'اجازة': { model: 'leaveRequest', arabicName: 'الإجازات', fields: { 'نوع': 'type', 'حالة': 'status', 'بداية': 'startDate', 'نهاية': 'endDate' } },
    'اجازات': { model: 'leaveRequest', arabicName: 'الإجازات', fields: { 'نوع': 'type', 'حالة': 'status' } },
    'قسم': { model: 'department', arabicName: 'الأقسام', fields: { 'اسم': 'name' } },
    'اقسام': { model: 'department', arabicName: 'الأقسام', fields: { 'اسم': 'name' } },
    'فرع': { model: 'branch', arabicName: 'الفروع', fields: { 'اسم': 'name', 'عنوان': 'address' } },
    'فروع': { model: 'branch', arabicName: 'الفروع', fields: { 'اسم': 'name' } },
    'مهمة': { model: 'task', arabicName: 'المهام', fields: { 'عنوان': 'title', 'حالة': 'status', 'أولوية': 'priority' } },
    'مهام': { model: 'task', arabicName: 'المهام', fields: { 'عنوان': 'title', 'حالة': 'status' } },
    'هدف': { model: 'goal', arabicName: 'الأهداف', fields: { 'عنوان': 'title', 'حالة': 'status', 'تقدم': 'progress' } },
    'اهداف': { model: 'goal', arabicName: 'الأهداف', fields: { 'عنوان': 'title', 'حالة': 'status' } },
    'تقييم': { model: 'performanceReview', arabicName: 'التقييمات', fields: { 'حالة': 'status', 'تقييم': 'finalRating' } },
    'تقييمات': { model: 'performanceReview', arabicName: 'التقييمات', fields: { 'حالة': 'status' } },
    'عهدة': { model: 'custodyAssignment', arabicName: 'العهد', fields: { 'حالة': 'status' } },
    'عهد': { model: 'custodyAssignment', arabicName: 'العهد', fields: { 'حالة': 'status' } },
    'راتب': { model: 'user', arabicName: 'الرواتب', fields: { 'قيمة': 'salary' } },
    'رواتب': { model: 'user', arabicName: 'الرواتب', fields: { 'قيمة': 'salary' } },
};

// العمليات المسموحة فقط (read-only)
const ALLOWED_OPERATIONS = ['findMany', 'count', 'aggregate', 'groupBy', 'findFirst'];

@Injectable()
export class DynamicQueryEngineService {
    private readonly logger = new Logger(DynamicQueryEngineService.name);
    private schemaContext: string | null = null;

    constructor(
        private readonly prisma: PrismaService,
        private readonly schemaDiscovery: SchemaDiscoveryService,
        private readonly aiService: AiService
    ) {
        this.initializeSchemaContext();
    }

    /**
     * 🔥 تهيئة الـ Schema Context للـ AI
     */
    private async initializeSchemaContext(): Promise<void> {
        try {
            const compactSchema = await this.schemaDiscovery.getCompactSchema();
            this.schemaContext = compactSchema;
            this.logger.log('🧠 Dynamic Query Engine initialized with full schema context!');
        } catch (error) {
            this.logger.error(`Failed to initialize schema context: ${error.message}`);
        }
    }

    /**
     * 🎯 معالجة السؤال وتوليد النتيجة
     */
    async processQuestion(question: string, companyId: string): Promise<DynamicQueryResult> {
        const startTime = Date.now();

        try {
            this.logger.log(`[DQE] Processing: "${question}"`);

            // 1. تحليل السؤال محلياً أولاً
            const localPlan = this.parseQuestionLocally(question);

            if (localPlan) {
                this.logger.log(`[DQE] Local parse successful: ${localPlan.model}.${localPlan.operation}`);

                // 2. تنفيذ الـ Query
                const result = await this.executeQuery(localPlan, companyId);

                // 3. تنسيق النتيجة
                const explanation = this.formatResult(result, localPlan, question);

                return {
                    success: true,
                    data: result,
                    explanation,
                    queryPlan: localPlan,
                    executionTimeMs: Date.now() - startTime,
                    suggestions: this.generateSuggestions(localPlan.model)
                };
            }

            // 3. إذا فشل التحليل المحلي، نستخدم AI
            return this.processWithAI(question, companyId, startTime);

        } catch (error) {
            this.logger.error(`[DQE] Error: ${error.message}`);
            return {
                success: false,
                data: null,
                explanation: `❌ خطأ في معالجة السؤال: ${error.message}`,
                executionTimeMs: Date.now() - startTime
            };
        }
    }

    /**
     * 🔍 تحليل السؤال محلياً (بدون AI)
     */
    private parseQuestionLocally(question: string): QueryPlan | null {
        const q = question.toLowerCase().trim();

        // كشف نوع العملية
        let operation: QueryPlan['operation'] = 'findMany';
        if (/كم|عدد|احصي|count/.test(q)) {
            operation = 'count';
        } else if (/اعرض|قائمة|كل|اظهر|show|list/.test(q)) {
            operation = 'findMany';
        }

        // كشف الجدول المطلوب
        let model: string | null = null;
        let arabicName = '';

        for (const [arabicKey, info] of Object.entries(ARABIC_SCHEMA_MAP)) {
            if (q.includes(arabicKey)) {
                model = info.model;
                arabicName = info.arabicName;
                break;
            }
        }

        if (!model) return null;

        // بناء الـ where conditions
        const where: Record<string, any> = {};

        // فلترة بالقسم
        const deptMatch = q.match(/(?:في|فى)\s*قسم\s*([\u0600-\u06FF\w]+)/);
        if (deptMatch && model === 'user') {
            where.department = { name: { contains: deptMatch[1], mode: 'insensitive' } };
        }

        // فلترة بالفرع
        const branchMatch = q.match(/(?:في|فى)\s*فرع\s*([\u0600-\u06FF\w]+)/);
        if (branchMatch && model === 'user') {
            where.branch = { name: { contains: branchMatch[1], mode: 'insensitive' } };
        }

        // فلترة بالراتب
        const salaryMatch = q.match(/راتب.*?([<>]|أكثر|اكثر|أقل|اقل).*?(\d+)/);
        if (salaryMatch && model === 'user') {
            const operator = salaryMatch[1];
            const amount = parseInt(salaryMatch[2]);
            if (operator === '>' || operator.includes('أكثر') || operator.includes('اكثر')) {
                where.salary = { gte: amount };
            } else if (operator === '<' || operator.includes('أقل') || operator.includes('اقل')) {
                where.salary = { lte: amount };
            }
        }

        // 🔍 البحث بالاسم (راتب محمد طارق، بيانات أحمد، الموظف محمد)
        const namePatterns = [
            /(?:راتب|بيانات|معلومات|الموظف|موظف)\s+([^\s,،]+)(?:\s+([^\s,،]+))?/,
            /([^\s,،]+)\s+([^\s,،]+)?\s*(?:راتبه|بياناته|حضوره)/
        ];

        for (const pattern of namePatterns) {
            const nameMatch = question.match(pattern);
            if (nameMatch && model === 'user') {
                const name1 = nameMatch[1]?.trim();
                const name2 = nameMatch[2]?.trim();

                if (name1 && name1.length > 1) {
                    const nameConditions: any[] = [
                        { firstName: { contains: name1, mode: 'insensitive' } },
                        { lastName: { contains: name1, mode: 'insensitive' } }
                    ];

                    if (name2 && name2.length > 1) {
                        nameConditions.push(
                            { firstName: { contains: name2, mode: 'insensitive' } },
                            { lastName: { contains: name2, mode: 'insensitive' } }
                        );
                        // البحث بالترتيب الصحيح
                        nameConditions.push({
                            AND: [
                                { firstName: { contains: name1, mode: 'insensitive' } },
                                { lastName: { contains: name2, mode: 'insensitive' } }
                            ]
                        });
                    }

                    where.OR = nameConditions;
                    this.logger.log(`[DQE] Name search: ${name1} ${name2 || ''}`);
                }
                break;
            }
        }

        // فلترة بالحالة
        if (/نشط|active/.test(q) && model === 'user') {
            where.status = 'ACTIVE';
        }
        if (/متأخر|تأخير|late/.test(q) && model === 'attendance') {
            where.lateMinutes = { gt: 0 };
        }
        if (/غائب|absent/.test(q) && model === 'attendance') {
            where.status = 'ABSENT';
        }

        // فلترة "معلق/pending" - تختلف حسب النموذج
        if (/معلق|pending/.test(q)) {
            if (model === 'leaveRequest') {
                where.status = 'PENDING';
            } else if (model === 'task') {
                where.status = 'TODO'; // TaskStatus لا يوجد PENDING
            } else if (model === 'goal') {
                where.status = 'PENDING_APPROVAL'; // GoalStatus
            } else if (model === 'custodyAssignment') {
                where.status = 'PENDING';
            } else {
                where.status = 'PENDING';
            }
        }

        // فلترة "مكتمل/completed"
        if (/مكتمل|completed/.test(q)) {
            where.status = 'COMPLETED';
        }

        // فلترة بالتاريخ (اليوم)
        if (/اليوم|today|النهاردة/.test(q) && model === 'attendance') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            where.date = { gte: today };
        }

        // فلترة بالشهر الحالي
        if (/هذا الشهر|الشهر الحالي/.test(q)) {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            if (model === 'attendance') {
                where.date = { gte: startOfMonth };
            } else if ('createdAt' in (where || {})) {
                where.createdAt = { gte: startOfMonth };
            }
        }

        return {
            model,
            operation,
            where,
            take: operation === 'findMany' ? 20 : undefined
        };
    }

    /**
     * ⚡ تنفيذ الـ Query بأمان
     */
    private async executeQuery(plan: QueryPlan, companyId: string): Promise<any> {
        // التحقق من الأمان
        if (!ALLOWED_OPERATIONS.includes(plan.operation)) {
            throw new Error(`عملية غير مسموحة: ${plan.operation}`);
        }

        // إضافة companyId للأمان
        const secureWhere = this.addCompanyScope(plan.where, plan.model, companyId);

        const prismaModel = (this.prisma as any)[plan.model];
        if (!prismaModel) {
            throw new Error(`جدول غير موجود: ${plan.model}`);
        }

        this.logger.log(`[DQE] Executing: ${plan.model}.${plan.operation}`);

        switch (plan.operation) {
            case 'count':
                return prismaModel.count({ where: secureWhere });

            case 'findMany':
                return prismaModel.findMany({
                    where: secureWhere,
                    take: plan.take || 20,
                    orderBy: plan.orderBy || { createdAt: 'desc' },
                    select: this.getDefaultSelect(plan.model)
                });

            case 'aggregate':
                return prismaModel.aggregate({
                    where: secureWhere,
                    _count: true,
                    _avg: this.getNumericFields(plan.model),
                    _sum: this.getNumericFields(plan.model)
                });

            case 'groupBy':
                return prismaModel.groupBy({
                    by: ['status'],
                    where: secureWhere,
                    _count: true
                });

            default:
                throw new Error(`عملية غير مدعومة: ${plan.operation}`);
        }
    }

    /**
     * 🔒 إضافة companyId للأمان
     */
    private addCompanyScope(where: Record<string, any>, model: string, companyId: string): Record<string, any> {
        const secureWhere = { ...where };

        // جميع الجداول في النظام لها companyId مباشرة
        // User, Department, Branch, Goal, Task, CustodyAssignment, PerformanceReview, Attendance, LeaveRequest
        secureWhere.companyId = companyId;

        return secureWhere;
    }

    /**
     * 📋 الحقول الافتراضية للعرض
     */
    private getDefaultSelect(model: string): Record<string, boolean | object> {
        const selectMaps: Record<string, Record<string, boolean | object>> = {
            user: { id: true, firstName: true, lastName: true, jobTitle: true, salary: true, status: true, department: { select: { name: true } } },
            attendance: { id: true, date: true, checkInTime: true, checkOutTime: true, status: true, lateMinutes: true, user: { select: { firstName: true, lastName: true } } },
            leaveRequest: { id: true, type: true, status: true, startDate: true, endDate: true, user: { select: { firstName: true, lastName: true } } },
            department: { id: true, name: true, _count: { select: { users: true } } },
            branch: { id: true, name: true, address: true },
            goal: { id: true, title: true, status: true, progress: true, dueDate: true },
            task: { id: true, title: true, status: true, priority: true, dueDate: true },
            performanceReview: { id: true, status: true, finalRating: true, createdAt: true, employee: { select: { firstName: true, lastName: true } } },
            custodyAssignment: { id: true, status: true, assignedAt: true, employee: { select: { firstName: true, lastName: true } }, custodyItem: { select: { name: true } } }
        };

        return selectMaps[model] || { id: true };
    }

    /**
     * 🔢 الحقول الرقمية للـ aggregate
     */
    private getNumericFields(model: string): Record<string, boolean> | undefined {
        const numericMaps: Record<string, Record<string, boolean>> = {
            user: { salary: true },
            attendance: { lateMinutes: true, overtimeMinutes: true },
            goal: { progress: true }
        };

        return numericMaps[model];
    }

    /**
     * 📝 تنسيق النتيجة للعرض
     */
    private formatResult(data: any, plan: QueryPlan, question: string): string {
        const modelNames: Record<string, string> = {
            user: 'موظف',
            attendance: 'سجل حضور',
            leaveRequest: 'طلب إجازة',
            department: 'قسم',
            branch: 'فرع',
            goal: 'هدف',
            task: 'مهمة',
            performanceReview: 'تقييم'
        };

        const modelName = modelNames[plan.model] || plan.model;

        if (plan.operation === 'count') {
            return `📊 **العدد:** ${data} ${modelName}`;
        }

        if (Array.isArray(data)) {
            if (data.length === 0) {
                return `❌ لا توجد نتائج تطابق البحث`;
            }

            let result = `📋 **النتائج:** (${data.length} ${modelName})\n\n`;

            // عرض أول 10 نتائج
            data.slice(0, 10).forEach((item, index) => {
                result += this.formatItem(item, plan.model, index + 1);
            });

            if (data.length > 10) {
                result += `\n... و ${data.length - 10} نتيجة أخرى`;
            }

            return result;
        }

        return `✅ النتيجة: ${JSON.stringify(data)}`;
    }

    /**
     * 📝 تنسيق عنصر واحد
     */
    private formatItem(item: any, model: string, index: number): string {
        if (!item) return `${index}. بيانات غير متوفرة\n`;

        switch (model) {
            case 'user':
                const userName = `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'غير محدد';
                const userJob = item.jobTitle || item.department?.name || 'غير محدد';
                const userSalary = item.salary ? Number(item.salary).toLocaleString('ar-SA') + ' ريال' : '-';
                return `${index}. **${userName}** - ${userJob} | ${userSalary}\n`;

            case 'attendance':
                const checkIn = item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '-';
                const checkOut = item.checkOutTime ? new Date(item.checkOutTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '-';
                const attendeeName = `${item.user?.firstName || ''} ${item.user?.lastName || ''}`.trim() || 'موظف';
                const lateStatus = (item.lateMinutes && item.lateMinutes > 0) ? `⏰ متأخر ${item.lateMinutes} دقيقة` : '✅';
                return `${index}. **${attendeeName}** - ${checkIn} → ${checkOut} | ${lateStatus}\n`;

            case 'leaveRequest':
                const requesterName = `${item.user?.firstName || ''} ${item.user?.lastName || ''}`.trim() || 'موظف';
                return `${index}. **${requesterName}** - ${item.type || '-'} | ${item.status || '-'}\n`;

            case 'department':
                const deptName = item.name || 'قسم غير محدد';
                const empCount = item._count?.users ?? 0;
                return `${index}. **${deptName}** - ${empCount} موظف\n`;

            case 'branch':
                return `${index}. **${item.name || 'فرع غير محدد'}** - ${item.address || '-'}\n`;

            case 'goal':
                const goalProgress = item.progress != null ? `${item.progress}%` : '-';
                return `${index}. **${item.title || 'هدف غير محدد'}** - ${item.status || '-'} | التقدم: ${goalProgress}\n`;

            case 'task':
                return `${index}. **${item.title || 'مهمة غير محددة'}** - ${item.status || '-'} | الأولوية: ${item.priority || '-'}\n`;

            case 'performanceReview':
                const revieweeName = `${item.employee?.firstName || ''} ${item.employee?.lastName || ''}`.trim() || 'موظف';
                const rating = item.finalRating ? Number(item.finalRating).toFixed(1) : '-';
                return `${index}. **${revieweeName}** - ${item.status || '-'} | التقييم: ${rating}\n`;

            case 'custodyAssignment':
                const custodyEmployee = `${item.employee?.firstName || ''} ${item.employee?.lastName || ''}`.trim() || '-';
                const custodyItem = item.custodyItem?.name || '-';
                return `${index}. الموظف: ${custodyEmployee} | العهدة: ${custodyItem} | الحالة: ${item.status || '-'}\n`;

            default:
                try {
                    return `${index}. ${JSON.stringify(item)}\n`;
                } catch {
                    return `${index}. بيانات غير قابلة للعرض\n`;
                }
        }
    }

    /**
     * 💡 اقتراحات متابعة
     */
    private generateSuggestions(model: string): string[] {
        const suggestions: Record<string, string[]> = {
            user: ['كم موظف نشط', 'قائمة الموظفين في قسم IT', 'الموظفين براتب أكثر من 5000'],
            attendance: ['حضور اليوم', 'المتأخرين اليوم', 'الغائبين'],
            leaveRequest: ['الإجازات المعلقة', 'إجازات هذا الشهر'],
            goal: ['الأهداف المكتملة', 'أهداف قيد التنفيذ'],
            task: ['المهام المعلقة', 'مهام عالية الأولوية']
        };

        return suggestions[model] || ['مساعدة', 'كم موظف', 'حضور اليوم'];
    }

    /**
     * 🤖 معالجة بالـ AI (fallback)
     */
    private async processWithAI(question: string, companyId: string, startTime: number): Promise<DynamicQueryResult> {
        // إذا لم يتوفر AI، نعود برسالة مساعدة
        if (!this.aiService.isAvailable()) {
            return {
                success: false,
                data: null,
                explanation: `🤔 لم أفهم السؤال. جرب أحد هذه الأمثلة:

📊 **استعلامات:**
• "كم موظف" - عدد الموظفين
• "كم موظف في قسم IT" - موظفين قسم معين
• "الموظفين براتب أكثر من 5000" - فلتر بالراتب
• "حضور اليوم" - سجلات الحضور
• "المتأخرين اليوم" - الموظفين المتأخرين
• "الإجازات المعلقة" - طلبات الإجازة`,
                suggestions: ['كم موظف', 'حضور اليوم', 'الإجازات المعلقة']
            };
        }

        // استخدام AI لفهم السؤال
        try {
            const schemaContext = this.schemaContext || await this.schemaDiscovery.getCompactSchema();

            const prompt = `أنت محلل استعلامات ذكي. لديك قاعدة بيانات HR بها:

${schemaContext}

السؤال: "${question}"

حلل السؤال وأعطني JSON:
{
  "model": "اسم الجدول بالإنجليزية (user, attendance, leaveRequest, goal, task, department)",
  "operation": "count أو findMany",
  "filters": { "field": "value" }
}

أعط JSON فقط بدون شرح.`;

            const aiResponse = await this.aiService.generateContent(prompt);

            // Extract JSON from AI response
            const jsonMatch = aiResponse.match(/\{[\s\S]*?\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in AI response');
            }

            const parsed = JSON.parse(jsonMatch[0]);

            if (parsed.model) {
                const plan: QueryPlan = {
                    model: parsed.model,
                    operation: parsed.operation || 'count',
                    where: parsed.filters || {},
                    take: parsed.operation === 'findMany' ? 20 : undefined
                };

                const result = await this.executeQuery(plan, companyId);
                const explanation = this.formatResult(result, plan, question);

                return {
                    success: true,
                    data: result,
                    explanation,
                    queryPlan: plan,
                    executionTimeMs: Date.now() - startTime,
                    suggestions: this.generateSuggestions(plan.model)
                };
            }
        } catch (error) {
            this.logger.warn(`AI parsing failed: ${error.message}`);
        }

        return {
            success: false,
            data: null,
            explanation: '❌ لم أستطع فهم السؤال. جرب صياغة مختلفة.',
            executionTimeMs: Date.now() - startTime
        };
    }

    /**
     * 🎯 هل يمكن معالجة هذا السؤال؟
     */
    canHandle(question: string): boolean {
        const q = question.toLowerCase();

        // كلمات مفتاحية للاستعلامات
        const queryKeywords = ['كم', 'عدد', 'اعرض', 'قائمة', 'كل', 'اظهر', 'من', 'ما'];
        const hasQueryKeyword = queryKeywords.some(k => q.includes(k));

        // كلمات مفتاحية للجداول
        const hasTableKeyword = Object.keys(ARABIC_SCHEMA_MAP).some(k => q.includes(k));

        return hasQueryKeyword || hasTableKeyword;
    }

    /**
     * 🔍 @ Autocomplete - اقتراحات تلقائية
     * 
     * عند كتابة "الموظف @" أو "قسم @" يُرجع قائمة بالخيارات المتاحة
     */
    async getAutocomplete(
        context: string,
        searchTerm: string,
        companyId: string,
        limit: number = 10
    ): Promise<{ type: string; items: any[] }> {
        const ctx = context.toLowerCase().trim();

        this.logger.log(`[DQE] Autocomplete: context="${ctx}", search="${searchTerm}"`);

        try {
            // 🧑‍💼 الموظفين
            if (/موظف|الموظف|موظفين|employee/.test(ctx)) {
                const employees = await this.prisma.user.findMany({
                    where: {
                        companyId,
                        // استثناء الـ Super Admin فقط باستخدام الـ boolean field
                        isSuperAdmin: false,
                        OR: searchTerm ? [
                            { firstName: { contains: searchTerm, mode: 'insensitive' } },
                            { lastName: { contains: searchTerm, mode: 'insensitive' } },
                            { email: { contains: searchTerm, mode: 'insensitive' } }
                        ] : undefined
                    },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        jobTitle: true,
                        status: true,
                        department: { select: { name: true } }
                    },
                    take: limit,
                    orderBy: { firstName: 'asc' }
                });

                this.logger.log(`[DQE] Found ${employees.length} employees for autocomplete`);

                return {
                    type: 'employee',
                    items: employees.map(e => ({
                        id: e.id,
                        label: `${e.firstName} ${e.lastName}`,
                        sublabel: e.jobTitle || e.department?.name || e.status || '',
                        value: `${e.firstName} ${e.lastName}`
                    }))
                };
            }

            // 🏢 الأقسام
            if (/قسم|القسم|اقسام|department/.test(ctx)) {
                const departments = await this.prisma.department.findMany({
                    where: {
                        companyId,
                        name: searchTerm ? { contains: searchTerm, mode: 'insensitive' } : undefined
                    },
                    select: {
                        id: true,
                        name: true,
                        _count: { select: { users: true } }
                    },
                    take: limit,
                    orderBy: { name: 'asc' }
                });

                return {
                    type: 'department',
                    items: departments.map(d => ({
                        id: d.id,
                        label: d.name,
                        sublabel: `${d._count.users} موظف`,
                        value: d.name
                    }))
                };
            }

            // 🏪 الفروع
            if (/فرع|الفرع|فروع|branch/.test(ctx)) {
                const branches = await this.prisma.branch.findMany({
                    where: {
                        companyId,
                        name: searchTerm ? { contains: searchTerm, mode: 'insensitive' } : undefined
                    },
                    select: {
                        id: true,
                        name: true,
                        address: true
                    },
                    take: limit,
                    orderBy: { name: 'asc' }
                });

                return {
                    type: 'branch',
                    items: branches.map(b => ({
                        id: b.id,
                        label: b.name,
                        sublabel: b.address || '',
                        value: b.name
                    }))
                };
            }

            // ✅ المهام
            if (/مهمة|المهمة|مهام|task/.test(ctx)) {
                const tasks = await this.prisma.task.findMany({
                    where: {
                        companyId,
                        title: searchTerm ? { contains: searchTerm, mode: 'insensitive' } : undefined
                    },
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        priority: true
                    },
                    take: limit,
                    orderBy: { createdAt: 'desc' }
                });

                return {
                    type: 'task',
                    items: tasks.map(t => ({
                        id: t.id,
                        label: t.title,
                        sublabel: `${t.status} | ${t.priority}`,
                        value: t.title
                    }))
                };
            }

            // 🎯 الأهداف
            if (/هدف|الهدف|اهداف|goal/.test(ctx)) {
                const goals = await this.prisma.goal.findMany({
                    where: {
                        companyId,
                        title: searchTerm ? { contains: searchTerm, mode: 'insensitive' } : undefined
                    },
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        progress: true
                    },
                    take: limit,
                    orderBy: { createdAt: 'desc' }
                });

                return {
                    type: 'goal',
                    items: goals.map(g => ({
                        id: g.id,
                        label: g.title,
                        sublabel: `${g.status} | ${g.progress}%`,
                        value: g.title
                    }))
                };
            }

            // ❓ لم يتم التعرف على السياق
            return {
                type: 'unknown',
                items: []
            };

        } catch (error) {
            this.logger.error(`[DQE] Autocomplete error: ${error.message}`);
            return {
                type: 'error',
                items: []
            };
        }
    }
}
