export interface AutomationRule {
    id: string;
    name: string;
    nameAr: string;
    trigger: {
        type: 'event' | 'schedule' | 'condition';
        event?: string;
        schedule?: string;
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
export declare class AutomationRulesService {
    private readonly logger;
    private rules;
    private logs;
    private readonly templates;
    createRule(name: string, nameAr: string, trigger: AutomationRule['trigger'], conditions: AutomationRule['conditions'], actions: AutomationRule['actions'], createdBy: string): AutomationRule;
    createFromTemplate(templateId: string, createdBy: string): AutomationRule | null;
    toggleRule(ruleId: string): {
        success: boolean;
        active: boolean;
    };
    executeRule(ruleId: string, context: Record<string, any>): AutomationLog;
    getRules(activeOnly?: boolean): AutomationRule[];
    getTemplates(category?: string): RuleTemplate[];
    formatRule(rule: AutomationRule): string;
    formatTemplates(): string;
}
