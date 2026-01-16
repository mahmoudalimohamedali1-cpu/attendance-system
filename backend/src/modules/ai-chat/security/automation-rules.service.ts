import { Injectable, Logger } from '@nestjs/common';

/**
 * ⚙️ Automation Rules Service
 * Implements remaining ideas: Workflow automation
 * 
 * Features:
 * - Custom automation rules
 * - Trigger-action workflows
 * - Scheduled tasks
 * - Event-based automation
 */

export interface AutomationRule {
    id: string;
    name: string;
    nameAr: string;
    trigger: {
        type: 'event' | 'schedule' | 'condition';
        event?: string;
        schedule?: string; // cron expression
        condition?: string;
    };
    conditions: {
        field: string;
        operator: 'equals' | 'not_equals' | 'greater' | 'less' | 'contains';
        value: any;
    }[];
    actions: {
        type: 'notify' | 'assign' | 'update' | 'create' | 'escalate' | 'webhook';
        target: string;
        params: Record<string, any>;
    }[];
    active: boolean;
    createdBy: string;
    createdAt: Date;
    lastTriggered?: Date;
    triggerCount: number;
}

export interface AutomationLog {
    id: string;
    ruleId: string;
    ruleName: string;
    triggeredAt: Date;
    triggerReason: string;
    actionsExecuted: number;
    success: boolean;
    error?: string;
}

export interface RuleTemplate {
    id: string;
    name: string;
    nameAr: string;
    description: string;
    category: string;
    trigger: AutomationRule['trigger'];
    conditions: AutomationRule['conditions'];
    actions: AutomationRule['actions'];
}

@Injectable()
export class AutomationRulesService {
    private readonly logger = new Logger(AutomationRulesService.name);

    // Rules storage
    private rules: Map<string, AutomationRule> = new Map();
    private logs: AutomationLog[] = [];

    // Pre-built templates
    private readonly templates: RuleTemplate[] = [
        {
            id: '1',
            name: 'Late Arrival Alert',
            nameAr: 'تنبيه التأخير',
            description: 'إرسال تنبيه عند تأخر الموظف',
            category: 'attendance',
            trigger: { type: 'event', event: 'check_in' },
            conditions: [{ field: 'minutes_late', operator: 'greater', value: 15 }],
            actions: [{ type: 'notify', target: 'manager', params: { template: 'late_alert' } }],
        },
        {
            id: '2',
            name: 'Leave Auto-Approval',
            nameAr: 'الموافقة التلقائية على الإجازات',
            description: 'موافقة تلقائية على الإجازات القصيرة',
            category: 'leaves',
            trigger: { type: 'event', event: 'leave_request' },
            conditions: [
                { field: 'days', operator: 'less', value: 3 },
                { field: 'balance', operator: 'greater', value: 5 },
            ],
            actions: [{ type: 'update', target: 'leave_request', params: { status: 'approved' } }],
        },
        {
            id: '3',
            name: 'Birthday Reminder',
            nameAr: 'تذكير عيد الميلاد',
            description: 'تذكير بأعياد ميلاد الزملاء',
            category: 'social',
            trigger: { type: 'schedule', schedule: '0 9 * * *' },
            conditions: [{ field: 'birthday_today', operator: 'equals', value: true }],
            actions: [{ type: 'notify', target: 'team', params: { template: 'birthday_wish' } }],
        },
        {
            id: '4',
            name: 'Expense Escalation',
            nameAr: 'تصعيد المصروفات',
            description: 'تصعيد المصروفات المعلقة',
            category: 'expenses',
            trigger: { type: 'schedule', schedule: '0 10 * * 1' },
            conditions: [{ field: 'pending_days', operator: 'greater', value: 7 }],
            actions: [{ type: 'escalate', target: 'finance_manager', params: {} }],
        },
        {
            id: '5',
            name: 'Probation End Reminder',
            nameAr: 'تذكير انتهاء فترة التجربة',
            description: 'تنبيه قبل انتهاء فترة التجربة',
            category: 'hr',
            trigger: { type: 'schedule', schedule: '0 9 * * *' },
            conditions: [{ field: 'probation_ends_in', operator: 'less', value: 7 }],
            actions: [{ type: 'notify', target: 'hr', params: { template: 'probation_reminder' } }],
        },
    ];

    /**
     * ➕ Create automation rule
     */
    createRule(
        name: string,
        nameAr: string,
        trigger: AutomationRule['trigger'],
        conditions: AutomationRule['conditions'],
        actions: AutomationRule['actions'],
        createdBy: string
    ): AutomationRule {
        const id = `RULE-${Date.now().toString(36).toUpperCase()}`;

        const rule: AutomationRule = {
            id,
            name,
            nameAr,
            trigger,
            conditions,
            actions,
            active: true,
            createdBy,
            createdAt: new Date(),
            triggerCount: 0,
        };

        this.rules.set(id, rule);
        return rule;
    }

    /**
     * 📋 Create from template
     */
    createFromTemplate(templateId: string, createdBy: string): AutomationRule | null {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return null;

        return this.createRule(
            template.name,
            template.nameAr,
            template.trigger,
            template.conditions,
            template.actions,
            createdBy
        );
    }

    /**
     * ▶️ Toggle rule
     */
    toggleRule(ruleId: string): { success: boolean; active: boolean } {
        const rule = this.rules.get(ruleId);
        if (!rule) {
            return { success: false, active: false };
        }

        rule.active = !rule.active;
        return { success: true, active: rule.active };
    }

    /**
     * 🔄 Simulate rule execution
     */
    executeRule(ruleId: string, context: Record<string, any>): AutomationLog {
        const rule = this.rules.get(ruleId);

        const log: AutomationLog = {
            id: `LOG-${Date.now().toString(36)}`,
            ruleId,
            ruleName: rule?.nameAr || 'Unknown',
            triggeredAt: new Date(),
            triggerReason: 'Manual trigger',
            actionsExecuted: rule?.actions.length || 0,
            success: true,
        };

        if (rule) {
            rule.lastTriggered = new Date();
            rule.triggerCount++;
        }

        this.logs.push(log);
        return log;
    }

    /**
     * 📊 Get rules
     */
    getRules(activeOnly: boolean = false): AutomationRule[] {
        const rules = Array.from(this.rules.values());
        return activeOnly ? rules.filter(r => r.active) : rules;
    }

    /**
     * 📊 Get templates
     */
    getTemplates(category?: string): RuleTemplate[] {
        if (category) {
            return this.templates.filter(t => t.category === category);
        }
        return this.templates;
    }

    /**
     * 📊 Format rule
     */
    formatRule(rule: AutomationRule): string {
        const statusEmoji = rule.active ? '🟢' : '⚫';

        let message = `${statusEmoji} **${rule.nameAr}**\n\n`;

        // Trigger
        const triggerTypes: Record<string, string> = {
            event: 'حدث',
            schedule: 'جدول زمني',
            condition: 'شرط',
        };
        message += `🎯 المشغل: ${triggerTypes[rule.trigger.type]}\n`;

        // Conditions
        if (rule.conditions.length > 0) {
            message += `📋 الشروط: ${rule.conditions.length}\n`;
        }

        // Actions
        message += `⚡ الإجراءات: ${rule.actions.length}\n`;

        // Stats
        message += `\n📊 عدد التنفيذات: ${rule.triggerCount}`;
        if (rule.lastTriggered) {
            message += `\n⏰ آخر تنفيذ: ${rule.lastTriggered.toLocaleDateString('ar-SA')}`;
        }

        return message;
    }

    /**
     * 📊 Format templates
     */
    formatTemplates(): string {
        let message = `⚙️ **قوالب الأتمتة الجاهزة:**\n\n`;

        const categories: Record<string, string> = {
            attendance: 'الحضور',
            leaves: 'الإجازات',
            expenses: 'المصروفات',
            social: 'الاجتماعي',
            hr: 'الموارد البشرية',
        };

        const grouped = this.templates.reduce((acc, t) => {
            if (!acc[t.category]) acc[t.category] = [];
            acc[t.category].push(t);
            return acc;
        }, {} as Record<string, RuleTemplate[]>);

        for (const [category, templates] of Object.entries(grouped)) {
            message += `**${categories[category] || category}:**\n`;
            for (const t of templates) {
                message += `• ${t.nameAr}\n`;
            }
            message += '\n';
        }

        message += `💡 قل "أنشئ قاعدة [اسم القالب]"`;
        return message;
    }
}
