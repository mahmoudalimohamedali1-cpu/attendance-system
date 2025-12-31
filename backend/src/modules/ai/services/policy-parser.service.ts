import { Injectable, Logger } from "@nestjs/common";
import { AiService } from "../ai.service";

export interface ParsedPolicyRule {
    understood: boolean;
    trigger: {
        event: "ATTENDANCE" | "LEAVE" | "CUSTODY" | "PAYROLL" | "ANNIVERSARY" | "CONTRACT" | "DISCIPLINARY" | "PERFORMANCE" | "CUSTOM";
        subEvent?: string;
    };
    conditions: Array<{
        field: string;
        operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "CONTAINS" | "IN" | "BETWEEN" | "EQUALS" | "GREATER_THAN" | "LESS_THAN" | "GREATER_THAN_OR_EQUAL";
        value: any;
        aggregation?: "SUM" | "COUNT" | "AVG" | "MAX" | "MIN";
        period?: "DAY" | "WEEK" | "MONTH" | "YEAR" | "ALL_TIME";
    }>;
    actions: Array<{
        type: "ADD_TO_PAYROLL" | "DEDUCT_FROM_PAYROLL" | "SEND_NOTIFICATION" | "ALERT_HR" | "CREATE_RECORD";
        valueType?: "FIXED" | "PERCENTAGE" | "DAYS" | "FORMULA";
        value?: number | string;
        base?: "BASIC" | "TOTAL";
        componentCode?: string;
        description?: string;
        message?: string;
    }>;
    scope: {
        type: "ALL_EMPLOYEES" | "ALL" | "EMPLOYEE" | "DEPARTMENT" | "BRANCH" | "JOB_TITLE";
        targetId?: string;
        targetName?: string;
    };
    explanation: string;
    clarificationNeeded?: string;
}

const SYSTEM_INSTRUCTION = `أنت خبير سياسات موارد بشرية ذكي في نظام HR سعودي. مهمتك فهم أي سياسة مكتوبة بأي لهجة وتحويلها لـ JSON.

🎯 هدفك: افهم نية المستخدم حتى لو الصياغة غير واضحة أو فيها أخطاء لغوية.

📌 الأحداث المدعومة (trigger.event):
• ATTENDANCE: أي شيء متعلق بالحضور، الانصراف، التأخير، الغياب، الخروج المبكر، العمل أيام الجمعة/السبت/العطلات
• LEAVE: الإجازات بكل أنواعها (سنوية، مرضية، بدون راتب، إلخ)
• CUSTODY: العهد والممتلكات (تسليم، إرجاع، تلف)
• PAYROLL: تُنفذ تلقائياً كل شهر مع الرواتب
• ANNIVERSARY: ذكرى التوظيف، مرور سنوات
• CONTRACT: العقود (بداية، نهاية، تجديد)
• DISCIPLINARY: المخالفات والجزاءات
• CUSTOM: أي حدث آخر

📌 الشروط المدعومة (conditions[].field):
• attendance.percentage - نسبة الحضور الشهرية
• attendance.absentDays - أيام الغياب
• attendance.lateDays - عدد أيام التأخير
• attendance.lateMinutes - دقائق التأخير
• attendance.overtimeHours - ساعات الأوفرتايم
• attendance.dayOfWeek - يوم الأسبوع (FRIDAY, SATURDAY, SUNDAY, إلخ)
• attendance.presentDays - أيام الحضور
• employee.yearsOfService - سنوات الخدمة
• employee.department - القسم
• employee.jobTitle - المسمى الوظيفي
• leave.days - أيام الإجازة
• leave.type - نوع الإجازة
• event.date - تاريخ الحدث

📌 المعاملات (conditions[].operator):
• GREATER_THAN (أكبر من)
• LESS_THAN (أقل من)  
• GREATER_THAN_OR_EQUAL (أكبر من أو يساوي)
• EQUALS (يساوي)

📌 الإجراءات (actions[].type):
• ADD_TO_PAYROLL - إضافة للراتب (مكافأة، بونص، بدل)
• DEDUCT_FROM_PAYROLL - خصم من الراتب

📌 نوع المبلغ (actions[].valueType):
• FIXED - مبلغ ثابت (100 ريال)
• PERCENTAGE - نسبة من الراتب (10%)
• DAYS - أيام راتب (3 أيام)

📌 أساس الحساب للنسبة (actions[].base):
• BASIC - الراتب الأساسي
• TOTAL - إجمالي الراتب

📌 النطاق (scope.type):
• ALL_EMPLOYEES - كل الموظفين
• EMPLOYEE - موظف محدد
• DEPARTMENT - قسم محدد

⚠️ قواعد مهمة:
1. إذا السياسة تقول "كل الموظفين" أو عامة بدون تحديد → scope.type = "ALL_EMPLOYEES"
2. إذا مرتبطة بالحضور الشهري (نسبة، غياب، تأخير) → trigger.event = "PAYROLL" (تُنفذ مع الرواتب)
3. إذا مرتبطة بحدث معين (حضور جمعة، إرجاع عهدة) → trigger.event = الحدث المناسب
4. "ياخد" = ADD_TO_PAYROLL، "يتخصم/ينزله" = DEDUCT_FROM_PAYROLL
5. "% من الراتب" → valueType = "PERCENTAGE"
6. "X أيام/يوم راتب" → valueType = "DAYS", value = X
7. للتاريخ استخدم YYYY-MM-DD

🔥 أمثلة:
• "بونص 50 ريال لكل الموظفين" → PAYROLL, ALL_EMPLOYEES, ADD_TO_PAYROLL, FIXED, 50
• "نسبة الحضور فوق 95% ياخد 200 ريال" → PAYROLL, attendance.percentage > 95, ADD_TO_PAYROLL
• "اللي يحضر جمعة ياخد 100" → ATTENDANCE, dayOfWeek=FRIDAY, ADD_TO_PAYROLL
• "الغياب فوق 3 أيام يتخصم 1% من الراتب" → PAYROLL, absentDays > 3, DEDUCT, PERCENTAGE
• "الموظف معانا 5 سنين ياخد 500" → PAYROLL, yearsOfService >= 5, ADD_TO_PAYROLL`;

const USER_PROMPT_TEMPLATE = `
تحليل السياسة التالية وتحويلها لـ JSON:

"{input}"

الرد يجب أن يكون JSON فقط بهذا الشكل بدون أي نص إضافي:
{
  "understood": true,
  "trigger": { "event": "...", "subEvent": "..." },
  "conditions": [{ "field": "...", "operator": "GREATER_THAN", "value": ... }],
  "actions": [{ "type": "ADD_TO_PAYROLL", "valueType": "FIXED", "value": ..., "description": "..." }],
  "scope": { "type": "ALL_EMPLOYEES", "targetName": null },
  "explanation": "شرح بسيط بالعربي",
  "clarificationNeeded": null
}
`;

@Injectable()
export class PolicyParserService {
    private readonly logger = new Logger(PolicyParserService.name);

    constructor(private readonly aiService: AiService) {}

    async parsePolicy(naturalText: string): Promise<ParsedPolicyRule> {
        if (!this.aiService.isAvailable()) {
            throw new Error("AI service is not available");
        }

        this.logger.log(`Parsing policy: "${naturalText?.substring(0, 60) || "empty"}..."`);

        const prompt = USER_PROMPT_TEMPLATE.replace("{input}", naturalText || "");

        try {
            const response = await this.aiService.generateContent(prompt, SYSTEM_INSTRUCTION);
            const parsed = this.aiService.parseJsonResponse<ParsedPolicyRule>(response);

            // Normalize scope type
            if (parsed.scope?.type === "ALL") {
                parsed.scope.type = "ALL_EMPLOYEES";
            }

            this.logger.log(`Parsed policy: ${parsed.explanation}`);
            return parsed;
        } catch (error) {
            this.logger.error(`Failed to parse policy: ${error.message}`);
            throw error;
        }
    }

    validateParsedRule(rule: ParsedPolicyRule): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!rule.understood) {
            errors.push("السياسة غير مفهومة");
        }

        if (!rule.trigger?.event) {
            errors.push("لم يتم تحديد الحدث المُحفز");
        }

        if (!rule.actions || rule.actions.length === 0) {
            errors.push("لم يتم تحديد أي إجراء");
        }

        return { valid: errors.length === 0, errors };
    }
}
