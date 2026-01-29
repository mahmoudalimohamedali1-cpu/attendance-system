import { Injectable, Logger } from '@nestjs/common';

/**
 * 🧠 Local AI Engine - Self-Hosted Intelligence
 * 
 * محرك ذكاء اصطناعي محلي يعمل بدون أي APIs خارجية
 * يستخدم Pattern Matching + Entity Extraction + Response Templates
 */

export interface LocalAIResult {
    intent: string;
    subIntent?: string;
    entities: Record<string, any>;
    response: string;
    confidence: number;
    suggestions: string[];
    visualization?: 'text' | 'table' | 'chart' | 'card' | 'list';
}

interface IntentPattern {
    intent: string;
    subIntent?: string;
    patterns: RegExp[];
    priority: number;
    entityExtractors?: Record<string, RegExp>;
    responseTemplate: string | ((entities: Record<string, any>, context?: any) => string);
    suggestions?: string[];
    visualization?: 'text' | 'table' | 'chart' | 'card' | 'list';
}

@Injectable()
export class LocalAiEngineService {
    private readonly logger = new Logger(LocalAiEngineService.name);
    private readonly intentPatterns: IntentPattern[] = [];

    constructor() {
        this.initializePatterns();
        this.logger.log('🧠 Local AI Engine initialized - No external APIs needed!');
    }

    /**
     * 🎯 Process a message and generate response locally
     */
    async processMessage(message: string, context?: any): Promise<LocalAIResult> {
        const normalizedMessage = this.normalizeArabic(message.toLowerCase().trim());

        // Find best matching intent
        let bestMatch: IntentPattern | null = null;
        let bestConfidence = 0;
        let matchedEntities: Record<string, any> = {};

        for (const pattern of this.intentPatterns) {
            for (const regex of pattern.patterns) {
                const match = normalizedMessage.match(regex) || message.match(regex);
                if (match) {
                    const confidence = this.calculateConfidence(match, normalizedMessage, pattern);
                    if (confidence > bestConfidence) {
                        bestConfidence = confidence;
                        bestMatch = pattern;
                        matchedEntities = this.extractEntities(message, pattern, match);
                    }
                }
            }
        }

        // Generate response
        if (bestMatch && bestConfidence > 0.3) {
            const response = typeof bestMatch.responseTemplate === 'function'
                ? bestMatch.responseTemplate(matchedEntities, context)
                : this.fillTemplate(bestMatch.responseTemplate, matchedEntities);

            return {
                intent: bestMatch.intent,
                subIntent: bestMatch.subIntent,
                entities: matchedEntities,
                response,
                confidence: bestConfidence,
                suggestions: bestMatch.suggestions || this.getDefaultSuggestions(),
                visualization: bestMatch.visualization || 'text'
            };
        }

        // Fallback response
        return this.generateFallbackResponse(message);
    }

    /**
     * ✅ Check if local engine can handle this message
     */
    canHandle(message: string): boolean {
        const normalizedMessage = this.normalizeArabic(message.toLowerCase().trim());

        for (const pattern of this.intentPatterns) {
            for (const regex of pattern.patterns) {
                if (regex.test(normalizedMessage) || regex.test(message)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * 📝 Normalize Arabic text
     */
    private normalizeArabic(text: string): string {
        return text
            .replace(/[\u064B-\u065F\u0670]/g, '') // Remove diacritics
            .replace(/[أإآ]/g, 'ا')
            .replace(/[ى]/g, 'ي')
            .replace(/[ة]/g, 'ه')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * 📊 Calculate confidence score
     */
    private calculateConfidence(match: RegExpMatchArray, message: string, pattern: IntentPattern): number {
        const matchLength = match[0].length;
        const messageLength = message.length;
        const coverageRatio = matchLength / messageLength;
        const priorityBonus = pattern.priority / 100;

        return Math.min(0.95, 0.5 + (coverageRatio * 0.3) + priorityBonus);
    }

    /**
     * 🔍 Extract entities from message
     */
    private extractEntities(message: string, pattern: IntentPattern, match: RegExpMatchArray): Record<string, any> {
        const entities: Record<string, any> = {};

        // Extract from match groups
        if (match.groups) {
            Object.assign(entities, match.groups);
        }

        // Use custom extractors
        if (pattern.entityExtractors) {
            for (const [key, regex] of Object.entries(pattern.entityExtractors)) {
                const entityMatch = message.match(regex);
                if (entityMatch) {
                    entities[key] = entityMatch[1] || entityMatch[0];
                }
            }
        }

        // Common extractions
        // Extract numbers
        const numberMatch = message.match(/(\d+(?:,\d{3})*(?:\.\d+)?)/);
        if (numberMatch && !entities.amount && !entities.number) {
            entities.number = parseFloat(numberMatch[1].replace(/,/g, ''));
        }

        // Extract names (after لـ or ل)
        const nameMatch = message.match(/(?:لـ?\s*|ل\s+)([أ-يa-zA-Z]+(?:\s+[أ-يa-zA-Z]+)?)/);
        if (nameMatch && !entities.employeeName && !entities.name) {
            entities.employeeName = nameMatch[1].trim();
        }

        // Extract quoted text
        const quotedMatch = message.match(/[""]([^""]+)[""]/);
        if (quotedMatch) {
            entities.title = entities.title || quotedMatch[1];
        }

        return entities;
    }

    /**
     * 📝 Fill template with entities
     */
    private fillTemplate(template: string, entities: Record<string, any>): string {
        let result = template;
        for (const [key, value] of Object.entries(entities)) {
            result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
        }
        return result;
    }

    /**
     * ❓ Generate fallback response
     */
    private generateFallbackResponse(message: string): LocalAIResult {
        return {
            intent: 'unknown',
            entities: {},
            response: `🤔 لم أفهم طلبك بشكل كامل. جرب أحد هذه الأوامر:

📊 **استعلامات:**
• "كم موظف" - عدد الموظفين
• "اعرض الحضور" - حضور اليوم
• "المتأخرين" - قائمة المتأخرين

⚡ **أفعال:**
• "أضف موظف [اسم]" - إضافة موظف
• "أضف مهمة [عنوان] لـ [اسم]" - إضافة مهمة
• "وافق على إجازة [اسم]" - موافقة على إجازة

💡 **مساعدة:**
• "مساعدة" - عرض كل الأوامر`,
            confidence: 0.1,
            suggestions: this.getDefaultSuggestions()
        };
    }

    /**
     * 💡 Get default suggestions
     */
    private getDefaultSuggestions(): string[] {
        return [
            'كم موظف',
            'حضور اليوم',
            'الإجازات المعلقة',
            'أضف مهمة',
            'مساعدة'
        ];
    }

    /**
     * 🔧 Initialize all intent patterns
     */
    private initializePatterns(): void {
        // ============ GREETINGS ============
        this.intentPatterns.push({
            intent: 'greeting',
            patterns: [
                /^(مرحبا|اهلا|السلام عليكم|صباح الخير|مساء الخير|هاي|هلو|hi|hello)/i,
            ],
            priority: 90,
            responseTemplate: (_, context) => {
                const userName = context?.userName || 'صديقي';
                const hour = new Date().getHours();
                const greeting = hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء الخير' : 'مساء النور';
                return `${greeting} ${userName}! 👋

أنا مساعدك الذكي لنظام الموارد البشرية. كيف أقدر أساعدك اليوم؟

💡 **اقتراحات سريعة:**
• اسألني عن حضور اليوم
• اعرض الإجازات المعلقة
• أضف مهمة جديدة`;
            },
            suggestions: ['حضور اليوم', 'كم موظف', 'الإجازات المعلقة', 'مساعدة']
        });

        // ============ HELP ============
        this.intentPatterns.push({
            intent: 'help',
            patterns: [
                /^(مساعده|مساعدة|ساعدني|help|اوامر|الاوامر)/i,
            ],
            priority: 85,
            responseTemplate: `📚 **دليل الأوامر المتاحة:**

**📊 الاستعلامات:**
• "كم موظف" / "عدد الموظفين"
• "حضور اليوم" / "من حضر"
• "المتأخرين" / "من تأخر"
• "الغائبين" / "من غاب"
• "الإجازات المعلقة"
• "إجمالي الرواتب"
• "اعرض الأقسام"
• "اعرض الفروع"

**⚡ الأفعال:**
• "أضف موظف [اسم] في قسم [قسم]"
• "أضف مهمة [عنوان] لـ [اسم]"
• "أضف عهدة [اسم] لـ [موظف]"
• "وافق على إجازة [اسم]"
• "ارفض إجازة [اسم]"
• "أضف مكافأة [مبلغ] لـ [اسم]"
• "اخصم [مبلغ] من [اسم]"

**🎯 الأهداف والتقييم:**
• "أضف هدف [عنوان] لـ [اسم]"
• "اعرض الأهداف"
• "أرسل تقدير لـ [اسم]"`,
            suggestions: ['كم موظف', 'حضور اليوم', 'أضف مهمة', 'الإجازات']
        });

        // ============ EMPLOYEE QUERIES ============
        this.intentPatterns.push({
            intent: 'query',
            subIntent: 'employee_count',
            patterns: [
                /كم\s*(عدد)?\s*(ال)?(موظف|موظفين)/,
                /عدد\s*(ال)?(موظفين|موظف)/,
                /اعرض\s*(ال)?(موظفين)/,
            ],
            priority: 80,
            responseTemplate: (entities, context) => {
                const count = context?.employeeCount || '---';
                return `👥 **إحصائيات الموظفين:**

• إجمالي الموظفين: **${count}** موظف
• الموظفين النشطين: ${context?.activeCount || count}
• الموظفين الجدد هذا الشهر: ${context?.newThisMonth || 0}

📊 استخدم "تفاصيل الموظفين" لمزيد من المعلومات`;
            },
            suggestions: ['تفاصيل الموظفين', 'توزيع الأقسام', 'حضور اليوم'],
            visualization: 'card'
        });

        // ============ ATTENDANCE QUERIES ============
        this.intentPatterns.push({
            intent: 'query',
            subIntent: 'attendance_today',
            patterns: [
                /حضور\s*(اليوم|النهارده)?/,
                /من\s*(حضر|جه|جاء)/,
                /الحاضرين/,
                /نسبه?\s*(ال)?حضور/,
            ],
            priority: 80,
            responseTemplate: (entities, context) => {
                const att = context?.attendance || {};
                return `⏰ **حضور اليوم:**

✅ حاضرين: **${att.present || 0}** موظف
⏰ متأخرين: **${att.late || 0}** موظف
❌ غائبين: **${att.absent || 0}** موظف
🏖️ في إجازة: **${att.onLeave || 0}** موظف

📊 نسبة الحضور: **${att.rate || 0}%**`;
            },
            suggestions: ['المتأخرين', 'الغائبين', 'تقرير الحضور'],
            visualization: 'card'
        });

        this.intentPatterns.push({
            intent: 'query',
            subIntent: 'late_employees',
            patterns: [
                /المتاخرين|المتأخرين/,
                /من\s*(تاخر|تأخر)/,
                /اللي\s*(اتاخر|تأخر)/,
            ],
            priority: 75,
            responseTemplate: (entities, context) => {
                return `⏰ **المتأخرين اليوم:**

${context?.lateList || 'لا يوجد متأخرين اليوم! 🎉'}`;
            },
            suggestions: ['حضور اليوم', 'الغائبين', 'تقرير التأخير'],
            visualization: 'list'
        });

        this.intentPatterns.push({
            intent: 'query',
            subIntent: 'absent_employees',
            patterns: [
                /الغائبين|الغايبين/,
                /من\s*(غاب|غايب)/,
                /اللي\s*(غاب|مجاش)/,
            ],
            priority: 75,
            responseTemplate: (entities, context) => {
                return `❌ **الغائبين اليوم:**

${context?.absentList || 'لا يوجد غائبين اليوم! 🎉'}`;
            },
            suggestions: ['حضور اليوم', 'المتأخرين'],
            visualization: 'list'
        });

        // ============ LEAVE QUERIES ============
        this.intentPatterns.push({
            intent: 'query',
            subIntent: 'pending_leaves',
            patterns: [
                /الاجازات?\s*(المعلقه?|المعلقة)?/,
                /طلبات?\s*(ال)?اجازه?/,
                /اجازات?\s*(معلقه?|معلقة)/,
            ],
            priority: 75,
            responseTemplate: (entities, context) => {
                const pending = context?.pendingLeaves || 0;
                return `🏖️ **طلبات الإجازات:**

📋 معلقة: **${pending}** طلب
✅ معتمدة هذا الشهر: ${context?.approvedThisMonth || 0}
❌ مرفوضة: ${context?.rejectedThisMonth || 0}

${pending > 0 ? '⚠️ لديك طلبات تحتاج مراجعة!' : '✅ لا توجد طلبات معلقة'}`;
            },
            suggestions: ['وافق على الإجازات', 'تفاصيل الإجازات'],
            visualization: 'card'
        });

        // ============ SALARY QUERIES ============
        this.intentPatterns.push({
            intent: 'query',
            subIntent: 'salary_summary',
            patterns: [
                /اجمالي?\s*(ال)?رواتب/,
                /مجموع\s*(ال)?رواتب/,
                /الرواتب/,
                /كم\s*(ال)?رواتب/,
            ],
            priority: 75,
            responseTemplate: (entities, context) => {
                const total = context?.totalPayroll || 0;
                const avg = context?.avgSalary || 0;
                return `💰 **ملخص الرواتب:**

📊 إجمالي الرواتب: **${total.toLocaleString('ar-SA')}** ريال
📈 متوسط الراتب: **${avg.toLocaleString('ar-SA')}** ريال
👥 عدد الموظفين: ${context?.employeeCount || 0}`;
            },
            suggestions: ['تفاصيل الرواتب', 'أعلى الرواتب'],
            visualization: 'card'
        });

        // ============ DEPARTMENT/BRANCH QUERIES ============
        this.intentPatterns.push({
            intent: 'query',
            subIntent: 'departments',
            patterns: [
                /الاقسام|الأقسام/,
                /اعرض\s*(ال)?اقسام/,
                /كم\s*قسم/,
            ],
            priority: 70,
            responseTemplate: (entities, context) => {
                return `🏢 **الأقسام:**

${context?.departmentList || 'لا توجد أقسام'}`;
            },
            suggestions: ['أضف قسم', 'الفروع'],
            visualization: 'list'
        });

        this.intentPatterns.push({
            intent: 'query',
            subIntent: 'branches',
            patterns: [
                /الفروع/,
                /اعرض\s*(ال)?فروع/,
                /كم\s*فرع/,
            ],
            priority: 70,
            responseTemplate: (entities, context) => {
                return `📍 **الفروع:**

${context?.branchList || 'لا توجد فروع'}`;
            },
            suggestions: ['أضف فرع', 'الأقسام'],
            visualization: 'list'
        });

        // ============ TASK QUERIES ============
        this.intentPatterns.push({
            intent: 'query',
            subIntent: 'tasks',
            patterns: [
                /المهام/,
                /اعرض\s*(ال)?مهام/,
                /حاله?\s*(ال)?مهام/,
            ],
            priority: 70,
            responseTemplate: (entities, context) => {
                return `📋 **ملخص المهام:**

• إجمالي: ${context?.totalTasks || 0}
• مكتملة: ${context?.completedTasks || 0}
• قيد التنفيذ: ${context?.inProgressTasks || 0}
• متأخرة: ${context?.overdueTasks || 0}`;
            },
            suggestions: ['أضف مهمة', 'المهام المتأخرة'],
            visualization: 'card'
        });

        // ============ GOAL QUERIES ============
        this.intentPatterns.push({
            intent: 'query',
            subIntent: 'goals',
            patterns: [
                /الاهداف|الأهداف/,
                /اعرض\s*(ال)?اهداف/,
                /تقدم\s*(ال)?اهداف/,
            ],
            priority: 70,
            responseTemplate: (entities, context) => {
                return `🎯 **ملخص الأهداف:**

• إجمالي: ${context?.totalGoals || 0}
• مكتملة: ${context?.completedGoals || 0}
• جارية: ${context?.inProgressGoals || 0}
• متأخرة: ${context?.overdueGoals || 0}`;
            },
            suggestions: ['أضف هدف', 'الأهداف المتأخرة'],
            visualization: 'card'
        });

        // ============ ACTIONS ============

        // Add Employee
        this.intentPatterns.push({
            intent: 'action',
            subIntent: 'add_employee',
            patterns: [
                /(اضف|أضف)\s*(موظف)/,
                /(سجل)\s*(موظف)/,
            ],
            priority: 80,
            entityExtractors: {
                firstName: /موظف\s+([أ-ي]+)/,
                department: /(?:في|فى)\s*قسم\s*([أ-يa-zA-Z]+)/,
                salary: /براتب\s*(\d+)/,
            },
            responseTemplate: (entities) => {
                if (!entities.firstName) {
                    return '❌ يرجى تحديد اسم الموظف. مثال: "أضف موظف أحمد في قسم IT"';
                }
                return `✅ تم إضافة الموظف!

👤 الاسم: **${entities.firstName}** ${entities.lastName || ''}
🏢 القسم: ${entities.department || 'غير محدد'}
💰 الراتب: ${entities.salary ? entities.salary + ' ريال' : 'غير محدد'}`;
            },
            suggestions: ['اعرض الموظفين', 'أضف موظف آخر']
        });

        // Add Task
        this.intentPatterns.push({
            intent: 'action',
            subIntent: 'add_task',
            patterns: [
                /(اضف|أضف)\s*(مهمه?|مهمة)/,
                /(انشئ)\s*(مهمه?|مهمة)/,
            ],
            priority: 80,
            entityExtractors: {
                title: /(?:مهمه?|مهمة)\s+[""]?([^""]+)[""]?(?:\s+ل|$)/,
            },
            responseTemplate: (entities) => {
                if (!entities.title && !entities.employeeName) {
                    return '❌ يرجى تحديد عنوان المهمة. مثال: "أضف مهمة مراجعة التقارير لـ أحمد"';
                }
                return `✅ تم إنشاء المهمة!

📝 العنوان: **${entities.title || 'مهمة جديدة'}**
👤 مسندة إلى: ${entities.employeeName || 'غير محددة'}
⚡ الأولوية: متوسطة`;
            },
            suggestions: ['اعرض المهام', 'أضف مهمة أخرى']
        });

        // Approve Leave
        this.intentPatterns.push({
            intent: 'action',
            subIntent: 'approve_leave',
            patterns: [
                /(وافق|اقبل)\s*(على)?\s*(اجازه?|إجازة)/,
            ],
            priority: 80,
            responseTemplate: (entities) => {
                if (!entities.employeeName) {
                    return '❌ يرجى تحديد اسم الموظف. مثال: "وافق على إجازة أحمد"';
                }
                return `✅ تم الموافقة على الإجازة!

👤 الموظف: **${entities.employeeName}**
📋 الحالة: معتمدة`;
            },
            suggestions: ['الإجازات المعلقة', 'وافق على إجازة أخرى']
        });

        // Reject Leave
        this.intentPatterns.push({
            intent: 'action',
            subIntent: 'reject_leave',
            patterns: [
                /(ارفض)\s*(اجازه?|إجازة)/,
            ],
            priority: 80,
            responseTemplate: (entities) => {
                if (!entities.employeeName) {
                    return '❌ يرجى تحديد اسم الموظف. مثال: "ارفض إجازة محمد"';
                }
                return `❌ تم رفض الإجازة!

👤 الموظف: **${entities.employeeName}**
📋 الحالة: مرفوضة`;
            },
            suggestions: ['الإجازات المعلقة']
        });

        // Add Bonus
        this.intentPatterns.push({
            intent: 'action',
            subIntent: 'add_bonus',
            patterns: [
                /(اضف|أضف|اعطي)\s*(مكافاه?|مكافأة|بونص)/,
            ],
            priority: 80,
            entityExtractors: {
                amount: /(\d+)/,
            },
            responseTemplate: (entities) => {
                if (!entities.employeeName || !entities.amount) {
                    return '❌ يرجى تحديد المبلغ والموظف. مثال: "أضف مكافأة 500 لـ أحمد"';
                }
                return `✅ تم إضافة المكافأة!

👤 الموظف: **${entities.employeeName}**
💰 المبلغ: **${entities.amount}** ريال`;
            },
            suggestions: ['اعرض المكافآت']
        });

        // Deduction
        this.intentPatterns.push({
            intent: 'action',
            subIntent: 'add_deduction',
            patterns: [
                /(اخصم|خصم)/,
            ],
            priority: 80,
            entityExtractors: {
                amount: /(\d+)/,
                employeeName: /من\s+([أ-ي]+)/,
            },
            responseTemplate: (entities) => {
                if (!entities.employeeName || !entities.amount) {
                    return '❌ يرجى تحديد المبلغ والموظف. مثال: "اخصم 200 من محمد"';
                }
                return `✅ تم الخصم!

👤 الموظف: **${entities.employeeName}**
💸 المبلغ: **${entities.amount}** ريال`;
            },
            suggestions: ['اعرض الخصومات']
        });

        // Add Goal
        this.intentPatterns.push({
            intent: 'action',
            subIntent: 'add_goal',
            patterns: [
                /(اضف|أضف|حدد)\s*(هدف)/,
            ],
            priority: 80,
            entityExtractors: {
                title: /هدف\s+[""]?([^""]+)[""]?(?:\s+ل|$)/,
            },
            responseTemplate: (entities) => {
                if (!entities.title) {
                    return '❌ يرجى تحديد عنوان الهدف. مثال: "أضف هدف زيادة المبيعات لـ أحمد"';
                }
                return `✅ تم إنشاء الهدف!

🎯 العنوان: **${entities.title}**
👤 المالك: ${entities.employeeName || 'أنت'}
📅 تاريخ الاستحقاق: بعد 90 يوم`;
            },
            suggestions: ['اعرض الأهداف', 'أضف هدف آخر']
        });

        // Send Recognition
        this.intentPatterns.push({
            intent: 'action',
            subIntent: 'send_recognition',
            patterns: [
                /(ارسل|أرسل)\s*(تقدير|شكر)/,
            ],
            priority: 80,
            responseTemplate: (entities) => {
                if (!entities.employeeName) {
                    return '❌ يرجى تحديد اسم الموظف. مثال: "أرسل تقدير لـ سارة"';
                }
                return `✅ تم إرسال التقدير!

🌟 تقدير لـ **${entities.employeeName}**
💬 شكراً على عملك المميز!
🏆 النقاط: 10`;
            },
            suggestions: ['أرسل تقدير آخر']
        });

        // Sort by priority
        this.intentPatterns.sort((a, b) => b.priority - a.priority);

        this.logger.log(`Loaded ${this.intentPatterns.length} intent patterns`);
    }
}
