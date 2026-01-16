"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AutomationRulesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationRulesService = void 0;
const common_1 = require("@nestjs/common");
let AutomationRulesService = AutomationRulesService_1 = class AutomationRulesService {
    constructor() {
        this.logger = new common_1.Logger(AutomationRulesService_1.name);
        this.rules = new Map();
        this.logs = [];
        this.templates = [
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
    }
    createRule(name, nameAr, trigger, conditions, actions, createdBy) {
        const id = `RULE-${Date.now().toString(36).toUpperCase()}`;
        const rule = {
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
    createFromTemplate(templateId, createdBy) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template)
            return null;
        return this.createRule(template.name, template.nameAr, template.trigger, template.conditions, template.actions, createdBy);
    }
    toggleRule(ruleId) {
        const rule = this.rules.get(ruleId);
        if (!rule) {
            return { success: false, active: false };
        }
        rule.active = !rule.active;
        return { success: true, active: rule.active };
    }
    executeRule(ruleId, context) {
        const rule = this.rules.get(ruleId);
        const log = {
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
    getRules(activeOnly = false) {
        const rules = Array.from(this.rules.values());
        return activeOnly ? rules.filter(r => r.active) : rules;
    }
    getTemplates(category) {
        if (category) {
            return this.templates.filter(t => t.category === category);
        }
        return this.templates;
    }
    formatRule(rule) {
        const statusEmoji = rule.active ? '🟢' : '⚫';
        let message = `${statusEmoji} **${rule.nameAr}**\n\n`;
        const triggerTypes = {
            event: 'حدث',
            schedule: 'جدول زمني',
            condition: 'شرط',
        };
        message += `🎯 المشغل: ${triggerTypes[rule.trigger.type]}\n`;
        if (rule.conditions.length > 0) {
            message += `📋 الشروط: ${rule.conditions.length}\n`;
        }
        message += `⚡ الإجراءات: ${rule.actions.length}\n`;
        message += `\n📊 عدد التنفيذات: ${rule.triggerCount}`;
        if (rule.lastTriggered) {
            message += `\n⏰ آخر تنفيذ: ${rule.lastTriggered.toLocaleDateString('ar-SA')}`;
        }
        return message;
    }
    formatTemplates() {
        let message = `⚙️ **قوالب الأتمتة الجاهزة:**\n\n`;
        const categories = {
            attendance: 'الحضور',
            leaves: 'الإجازات',
            expenses: 'المصروفات',
            social: 'الاجتماعي',
            hr: 'الموارد البشرية',
        };
        const grouped = this.templates.reduce((acc, t) => {
            if (!acc[t.category])
                acc[t.category] = [];
            acc[t.category].push(t);
            return acc;
        }, {});
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
};
exports.AutomationRulesService = AutomationRulesService;
exports.AutomationRulesService = AutomationRulesService = AutomationRulesService_1 = __decorate([
    (0, common_1.Injectable)()
], AutomationRulesService);
//# sourceMappingURL=automation-rules.service.js.map