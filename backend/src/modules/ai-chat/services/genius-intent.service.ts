import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../../ai/ai.service';

/**
 * 🧠 GENIUS Intent Service
 * Uses Claude AI to understand natural language commands
 */

export interface ParsedIntent {
    action: string;
    entity: string;
    params: Record<string, any>;
    confidence: number;
    originalMessage: string;
}

@Injectable()
export class GeniusIntentService {
    private readonly logger = new Logger(GeniusIntentService.name);

    constructor(private readonly aiService: AiService) { }

    /**
     * 🎯 Parse user intent using Claude AI
     */
    async parseIntent(message: string): Promise<ParsedIntent> {
        const prompt = `أنت مساعد ذكي لنظام إدارة الموارد البشرية. حلل الرسالة التالية واستخرج المعلومات.

الرسالة: "${message}"

استخرج المعلومات بصيغة JSON فقط (بدون أي نص إضافي):
{
    "action": "create|update|delete|list|approve|reject|transfer|assign|send|calculate",
    "entity": "employee|department|branch|task|custody|leave|bonus|deduction|notification|goal|review|recognition|payroll",
    "params": {
        // المعاملات المستخرجة حسب نوع الكيان
        // للموظف: firstName, lastName, department, branch, salary, jobTitle, email
        // للقسم: name, branchName
        // للفرع: name, location
        // للمهمة: title, assignee, priority, dueDate
        // للعهدة: name, serialNumber, assignee, value
        // للإجازة: employeeName, days, type, startDate
        // للمكافأة/الخصم: employeeName, amount, reason
        // للهدف: title, employeeName, targetValue, dueDate, progress
        // للتقييم: employeeName, cycleName
        // للتقدير: employeeName, message, points
        // للرواتب: month, year
    },
    "confidence": 0.0-1.0
}

أمثلة:
- "أضف قسم HR في فرع الرياض" → {"action":"create","entity":"department","params":{"name":"HR","branchName":"الرياض"},"confidence":0.95}
- "أضف هدف زيادة المبيعات لـ أحمد" → {"action":"create","entity":"goal","params":{"title":"زيادة المبيعات","employeeName":"أحمد"},"confidence":0.95}
- "أرسل تقدير لـ سارة بسبب عملها المميز" → {"action":"send","entity":"recognition","params":{"employeeName":"سارة","message":"عملها المميز"},"confidence":0.9}
- "انشئ تقييم أداء لـ محمد" → {"action":"create","entity":"review","params":{"employeeName":"محمد"},"confidence":0.95}
- "احسب رواتب يناير" → {"action":"calculate","entity":"payroll","params":{"month":1},"confidence":0.9}
- "وافق على الرواتب" → {"action":"approve","entity":"payroll","params":{},"confidence":0.85}
- "عدل هدف زيادة المبيعات إلى 50%" → {"action":"update","entity":"goal","params":{"title":"زيادة المبيعات","progress":50},"confidence":0.9}

الرد يجب أن يكون JSON فقط، بدون أي شرح أو نص إضافي.`;

        try {
            const response = await this.aiService.generateContent(prompt);

            // Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                this.logger.warn('Could not parse AI response as JSON');
                return this.fallbackParse(message);
            }

            const parsed = JSON.parse(jsonMatch[0]);

            return {
                action: parsed.action || 'unknown',
                entity: parsed.entity || 'unknown',
                params: parsed.params || {},
                confidence: parsed.confidence || 0.5,
                originalMessage: message
            };
        } catch (error: any) {
            this.logger.error(`Intent parsing error: ${error.message}`);
            return this.fallbackParse(message);
        }
    }

    /**
     * Fallback regex-based parsing
     */
    private fallbackParse(message: string): ParsedIntent {
        const m = message.toLowerCase();
        let action = 'unknown';
        let entity = 'unknown';
        const params: Record<string, any> = {};

        // Detect action
        if (/^(أضف|انشئ|اضف|سجل)/.test(m)) action = 'create';
        else if (/^(عدل|حدث|غير)/.test(m)) action = 'update';
        else if (/^(احذف|امسح)/.test(m)) action = 'delete';
        else if (/^(اعرض|عرض|كم)/.test(m)) action = 'list';
        else if (/^(وافق|اقبل)/.test(m)) action = 'approve';
        else if (/^(ارفض)/.test(m)) action = 'reject';
        else if (/^(انقل|نقل)/.test(m)) action = 'transfer';
        else if (/^(سلم|اسند|كلف)/.test(m)) action = 'assign';

        // Detect entity
        if (/موظف/.test(m)) entity = 'employee';
        else if (/قسم|إدارة/.test(m)) entity = 'department';
        else if (/فرع/.test(m)) entity = 'branch';
        else if (/مهمة|مهمه/.test(m)) entity = 'task';
        else if (/عهدة|عهده/.test(m)) entity = 'custody';
        else if (/إجازة|اجازة/.test(m)) entity = 'leave';
        else if (/مكافأة|مكافاة|بونص/.test(m)) entity = 'bonus';
        else if (/خصم/.test(m)) entity = 'deduction';
        else if (/إشعار|اشعار|رسالة|تنبيه/.test(m)) entity = 'notification';
        else if (/هدف|أهداف/.test(m)) entity = 'goal';
        else if (/تقييم|أداء/.test(m)) entity = 'review';
        else if (/تقدير|شكر/.test(m)) entity = 'recognition';
        else if (/رواتب|مسير/.test(m)) entity = 'payroll';

        return {
            action,
            entity,
            params,
            confidence: 0.3,
            originalMessage: message
        };
    }

    /**
     * 🔍 Extract specific entity details using AI
     */
    async extractEntityDetails(message: string, entity: string): Promise<Record<string, any>> {
        const schemas: Record<string, string> = {
            employee: `{
                "firstName": "الاسم الأول",
                "lastName": "اسم العائلة",
                "department": "اسم القسم",
                "branch": "اسم الفرع",
                "salary": "الراتب (رقم)",
                "jobTitle": "المسمى الوظيفي",
                "email": "البريد الإلكتروني"
            }`,
            department: `{
                "name": "اسم القسم",
                "branchName": "اسم الفرع"
            }`,
            branch: `{
                "name": "اسم الفرع",
                "location": "الموقع/المدينة"
            }`,
            task: `{
                "title": "عنوان المهمة",
                "assignee": "اسم الموظف المكلف",
                "priority": "الأولوية (HIGH/MEDIUM/LOW)",
                "dueDate": "تاريخ الاستحقاق",
                "description": "وصف المهمة"
            }`,
            custody: `{
                "name": "اسم العهدة",
                "serialNumber": "الرقم التسلسلي",
                "assignee": "اسم الموظف",
                "value": "القيمة (رقم)",
                "category": "التصنيف"
            }`,
            leave: `{
                "employeeName": "اسم الموظف",
                "type": "نوع الإجازة (ANNUAL/SICK/EMERGENCY)",
                "days": "عدد الأيام",
                "startDate": "تاريخ البداية",
                "reason": "السبب"
            }`,
            bonus: `{
                "employeeName": "اسم الموظف",
                "amount": "المبلغ (رقم)",
                "reason": "السبب"
            }`,
            deduction: `{
                "employeeName": "اسم الموظف",
                "amount": "المبلغ (رقم)",
                "reason": "السبب"
            }`,
            goal: `{
                "title": "عنوان الهدف",
                "employeeName": "اسم الموظف",
                "targetValue": "القيمة المستهدفة (رقم)",
                "dueDate": "تاريخ الاستحقاق",
                "progress": "نسبة التقدم (رقم 0-100)",
                "description": "وصف الهدف"
            }`,
            review: `{
                "employeeName": "اسم الموظف",
                "cycleName": "اسم الدورة"
            }`,
            recognition: `{
                "employeeName": "اسم الموظف",
                "message": "نص التقدير",
                "points": "النقاط (رقم)"
            }`,
            payroll: `{
                "month": "الشهر (رقم 1-12)",
                "year": "السنة"
            }`
        };

        const schema = schemas[entity] || '{}';

        const prompt = `استخرج البيانات من الرسالة التالية وأرجعها كـ JSON فقط.

الرسالة: "${message}"

البنية المطلوبة:
${schema}

ملاحظات:
- استخرج فقط البيانات الموجودة في الرسالة
- لا تخترع بيانات غير موجودة
- أرجع null للحقول غير الموجودة
- الأرقام يجب أن تكون numbers وليس strings

أرجع JSON فقط بدون أي نص إضافي.`;

        try {
            const response = await this.aiService.generateContent(prompt);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            this.logger.error(`Entity extraction error: ${error}`);
        }

        return {};
    }
}
