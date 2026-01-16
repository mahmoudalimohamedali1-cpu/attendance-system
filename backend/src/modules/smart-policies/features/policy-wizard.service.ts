import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * 🧙 Policy Wizard Service
 * معالج إنشاء السياسات خطوة بخطوة
 * 
 * ✨ الميزات:
 * - واجهة خطوة بخطوة
 * - تحقق ذكي في كل خطوة
 * - اقتراحات سياقية
 * - معاينة مباشرة
 * - حفظ المسودات
 * - التراجع عن الخطوات
 */

// ============== Types ==============

export interface WizardSession {
    id: string;
    companyId: string;
    userId: string;
    currentStep: number;
    totalSteps: number;
    steps: WizardStep[];
    data: WizardData;
    status: WizardStatus;
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date;
}

export type WizardStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED' | 'EXPIRED';

export interface WizardStep {
    id: string;
    number: number;
    name: string;
    nameEn: string;
    description: string;
    icon: string;
    isCompleted: boolean;
    isActive: boolean;
    isOptional: boolean;
    validationErrors: string[];
    fields: WizardField[];
}

export interface WizardField {
    id: string;
    type: FieldType;
    label: string;
    labelEn: string;
    placeholder?: string;
    description?: string;
    required: boolean;
    value: any;
    options?: FieldOption[];
    validation?: FieldValidation;
    dependsOn?: FieldDependency;
    suggestions?: FieldSuggestion[];
}

export type FieldType =
    | 'TEXT'
    | 'TEXTAREA'
    | 'NUMBER'
    | 'SELECT'
    | 'MULTI_SELECT'
    | 'DATE'
    | 'DATE_RANGE'
    | 'TOGGLE'
    | 'RADIO'
    | 'CHECKBOX'
    | 'SLIDER'
    | 'FORMULA_BUILDER'
    | 'CONDITION_BUILDER'
    | 'EMPLOYEE_SELECTOR'
    | 'DEPARTMENT_SELECTOR';

export interface FieldOption {
    value: string;
    label: string;
    labelEn?: string;
    description?: string;
    icon?: string;
    disabled?: boolean;
}

export interface FieldValidation {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    custom?: string;
    message?: string;
}

export interface FieldDependency {
    field: string;
    operator: 'EQUALS' | 'NOT_EQUALS' | 'IN' | 'NOT_IN';
    value: any;
}

export interface FieldSuggestion {
    value: any;
    label: string;
    confidence: number;
    reason: string;
}

export interface WizardData {
    // Step 1: Basic Info
    name?: string;
    description?: string;
    category?: string;
    
    // Step 2: Trigger
    triggerEvent?: string;
    triggerSubEvent?: string;
    triggerTiming?: string;
    
    // Step 3: Conditions
    conditions?: WizardCondition[];
    conditionLogic?: 'ALL' | 'ANY' | 'CUSTOM';
    customLogic?: string;
    
    // Step 4: Actions
    actions?: WizardAction[];
    
    // Step 5: Scope
    scopeType?: string;
    scopeInclude?: string[];
    scopeExclude?: string[];
    
    // Step 6: Schedule
    scheduleType?: string;
    effectiveFrom?: Date;
    effectiveTo?: Date;
    
    // Step 7: Advanced
    priority?: number;
    allowExceptions?: boolean;
    requiresApproval?: boolean;
    retroactiveAllowed?: boolean;
    
    // Generated
    originalText?: string;
    parsedPolicy?: any;
}

export interface WizardCondition {
    id: string;
    field: string;
    fieldLabel: string;
    operator: string;
    operatorLabel: string;
    value: any;
    valueLabel?: string;
}

export interface WizardAction {
    id: string;
    type: string;
    typeLabel: string;
    valueType: string;
    value: any;
    formula?: string;
    componentCode?: string;
    description?: string;
}

export interface WizardPreview {
    summary: string;
    estimatedImpact: {
        employeesAffected: number;
        estimatedCost: number;
        estimatedSavings: number;
    };
    warnings: string[];
    conflicts: string[];
    readablePolicy: string;
}

export interface StepValidationResult {
    isValid: boolean;
    errors: { field: string; message: string }[];
    warnings: { field: string; message: string }[];
    suggestions: { field: string; suggestion: FieldSuggestion }[];
}

// ============== Implementation ==============

@Injectable()
export class PolicyWizardService {
    private readonly logger = new Logger(PolicyWizardService.name);
    
    // Sessions storage
    private sessions: Map<string, WizardSession> = new Map();
    
    // Session expiry (24 hours)
    private readonly SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

    constructor(private readonly prisma: PrismaService) {}

    /**
     * 🚀 بدء جلسة جديدة
     */
    async startSession(companyId: string, userId: string): Promise<WizardSession> {
        const session: WizardSession = {
            id: this.generateId(),
            companyId,
            userId,
            currentStep: 1,
            totalSteps: 7,
            steps: this.initializeSteps(),
            data: {},
            status: 'IN_PROGRESS',
            createdAt: new Date(),
            updatedAt: new Date(),
            expiresAt: new Date(Date.now() + this.SESSION_EXPIRY_MS),
        };
        
        // إضافة الاقتراحات الأولية
        await this.addInitialSuggestions(session, companyId);
        
        this.sessions.set(session.id, session);
        this.logger.log(`Started wizard session: ${session.id}`);
        
        return session;
    }

    /**
     * 📋 جلب الجلسة
     */
    getSession(sessionId: string): WizardSession | undefined {
        const session = this.sessions.get(sessionId);
        
        if (session && new Date() > session.expiresAt) {
            session.status = 'EXPIRED';
        }
        
        return session;
    }

    /**
     * ➡️ الانتقال للخطوة التالية
     */
    async nextStep(sessionId: string, stepData: any): Promise<{
        session: WizardSession;
        validation: StepValidationResult;
    }> {
        const session = this.getSession(sessionId);
        
        if (!session) {
            throw new Error('الجلسة غير موجودة أو منتهية');
        }
        
        if (session.status !== 'IN_PROGRESS') {
            throw new Error('الجلسة منتهية');
        }
        
        // التحقق من بيانات الخطوة الحالية
        const validation = await this.validateStep(session, session.currentStep, stepData);
        
        if (!validation.isValid) {
            return { session, validation };
        }
        
        // حفظ البيانات
        this.saveStepData(session, session.currentStep, stepData);
        
        // تعليم الخطوة كمكتملة
        session.steps[session.currentStep - 1].isCompleted = true;
        session.steps[session.currentStep - 1].isActive = false;
        
        // الانتقال للخطوة التالية
        if (session.currentStep < session.totalSteps) {
            session.currentStep++;
            session.steps[session.currentStep - 1].isActive = true;
            
            // إضافة اقتراحات للخطوة الجديدة
            await this.addStepSuggestions(session, session.currentStep);
        } else {
            session.status = 'COMPLETED';
        }
        
        session.updatedAt = new Date();
        
        return { session, validation };
    }

    /**
     * ⬅️ الرجوع للخطوة السابقة
     */
    previousStep(sessionId: string): WizardSession {
        const session = this.getSession(sessionId);
        
        if (!session || session.currentStep <= 1) {
            throw new Error('لا يمكن الرجوع');
        }
        
        session.steps[session.currentStep - 1].isActive = false;
        session.currentStep--;
        session.steps[session.currentStep - 1].isActive = true;
        session.updatedAt = new Date();
        
        return session;
    }

    /**
     * 🔢 الانتقال لخطوة محددة
     */
    goToStep(sessionId: string, stepNumber: number): WizardSession {
        const session = this.getSession(sessionId);
        
        if (!session) {
            throw new Error('الجلسة غير موجودة');
        }
        
        if (stepNumber < 1 || stepNumber > session.totalSteps) {
            throw new Error('رقم خطوة غير صالح');
        }
        
        // التحقق من أن الخطوات السابقة مكتملة
        for (let i = 0; i < stepNumber - 1; i++) {
            if (!session.steps[i].isCompleted && !session.steps[i].isOptional) {
                throw new Error(`يجب إكمال الخطوة ${i + 1} أولاً`);
            }
        }
        
        session.steps.forEach((step, index) => {
            step.isActive = index === stepNumber - 1;
        });
        session.currentStep = stepNumber;
        session.updatedAt = new Date();
        
        return session;
    }

    /**
     * 💾 حفظ المسودة
     */
    async saveDraft(sessionId: string): Promise<string> {
        const session = this.getSession(sessionId);
        
        if (!session) {
            throw new Error('الجلسة غير موجودة');
        }
        
        // حفظ كمسودة في قاعدة البيانات
        const parsedData = this.buildParsedPolicy(session.data);
        const draft = await this.prisma.smartPolicy.create({
            data: {
                companyId: session.companyId,
                name: session.data.name || 'مسودة سياسة',
                originalText: this.generatePolicyText(session.data),
                parsedRule: parsedData,
                triggerEvent: (parsedData as any).trigger?.event || 'ATTENDANCE_CHECK_IN',
                status: 'DRAFT',
                isActive: false,
                createdById: session.userId,
            },
        });
        
        this.logger.log(`Saved draft: ${draft.id}`);
        
        return draft.id;
    }

    /**
     * 👁️ معاينة السياسة
     */
    async getPreview(sessionId: string): Promise<WizardPreview> {
        const session = this.getSession(sessionId);
        
        if (!session) {
            throw new Error('الجلسة غير موجودة');
        }
        
        // توليد الملخص
        const summary = this.generateSummary(session.data);
        
        // تقدير التأثير
        const estimatedImpact = await this.estimateImpact(session.companyId, session.data);
        
        // فحص التحذيرات
        const warnings = await this.checkWarnings(session.companyId, session.data);
        
        // فحص التعارضات
        const conflicts = await this.checkConflicts(session.companyId, session.data);
        
        // توليد النص المقروء
        const readablePolicy = this.generateReadablePolicy(session.data);
        
        return {
            summary,
            estimatedImpact,
            warnings,
            conflicts,
            readablePolicy,
        };
    }

    /**
     * ✅ إنهاء المعالج وإنشاء السياسة
     */
    async complete(sessionId: string): Promise<any> {
        const session = this.getSession(sessionId);
        
        if (!session) {
            throw new Error('الجلسة غير موجودة');
        }
        
        // التحقق من اكتمال جميع الخطوات المطلوبة
        for (const step of session.steps) {
            if (!step.isCompleted && !step.isOptional) {
                throw new Error(`الخطوة "${step.name}" غير مكتملة`);
            }
        }
        
        // إنشاء السياسة
        const scopeData = this.buildScope(session.data);
        const policy = await this.prisma.smartPolicy.create({
            data: {
                companyId: session.companyId,
                name: session.data.name!,
                originalText: this.generatePolicyText(session.data),
                parsedRule: this.buildParsedPolicy(session.data),
                conditions: [],
                actions: [],
                triggerEvent: session.data.triggerEvent as any,
                scopeType: scopeData?.type || 'ALL',
                scopeId: scopeData?.targetId,
                scopeName: scopeData?.targetName,
                priority: session.data.priority || 10,
                effectiveFrom: session.data.effectiveFrom,
                effectiveTo: session.data.effectiveTo,
                status: session.data.requiresApproval ? 'PENDING' : 'ACTIVE',
                isActive: !session.data.requiresApproval,
            },
        });
        
        // تعليم الجلسة كمكتملة
        session.status = 'COMPLETED';
        
        this.logger.log(`Wizard completed, policy created: ${policy.id}`);
        
        return policy;
    }

    /**
     * ❌ إلغاء الجلسة
     */
    cancelSession(sessionId: string): void {
        const session = this.getSession(sessionId);
        
        if (session) {
            session.status = 'ABANDONED';
        }
    }

    // ============== Step Definitions ==============

    /**
     * تهيئة الخطوات
     */
    private initializeSteps(): WizardStep[] {
        return [
            {
                id: 'basic',
                number: 1,
                name: 'المعلومات الأساسية',
                nameEn: 'Basic Information',
                description: 'حدد اسم السياسة ووصفها',
                icon: '📝',
                isCompleted: false,
                isActive: true,
                isOptional: false,
                validationErrors: [],
                fields: this.getBasicInfoFields(),
            },
            {
                id: 'trigger',
                number: 2,
                name: 'حدث التشغيل',
                nameEn: 'Trigger Event',
                description: 'متى يتم تفعيل السياسة؟',
                icon: '⚡',
                isCompleted: false,
                isActive: false,
                isOptional: false,
                validationErrors: [],
                fields: this.getTriggerFields(),
            },
            {
                id: 'conditions',
                number: 3,
                name: 'الشروط',
                nameEn: 'Conditions',
                description: 'حدد شروط تطبيق السياسة',
                icon: '🔍',
                isCompleted: false,
                isActive: false,
                isOptional: true,
                validationErrors: [],
                fields: this.getConditionsFields(),
            },
            {
                id: 'actions',
                number: 4,
                name: 'الإجراءات',
                nameEn: 'Actions',
                description: 'ماذا يحدث عند تطبيق السياسة؟',
                icon: '🎯',
                isCompleted: false,
                isActive: false,
                isOptional: false,
                validationErrors: [],
                fields: this.getActionsFields(),
            },
            {
                id: 'scope',
                number: 5,
                name: 'النطاق',
                nameEn: 'Scope',
                description: 'من سيتأثر بالسياسة؟',
                icon: '👥',
                isCompleted: false,
                isActive: false,
                isOptional: false,
                validationErrors: [],
                fields: this.getScopeFields(),
            },
            {
                id: 'schedule',
                number: 6,
                name: 'الجدولة',
                nameEn: 'Schedule',
                description: 'متى تبدأ وتنتهي السياسة؟',
                icon: '📅',
                isCompleted: false,
                isActive: false,
                isOptional: true,
                validationErrors: [],
                fields: this.getScheduleFields(),
            },
            {
                id: 'advanced',
                number: 7,
                name: 'إعدادات متقدمة',
                nameEn: 'Advanced Settings',
                description: 'إعدادات إضافية للسياسة',
                icon: '⚙️',
                isCompleted: false,
                isActive: false,
                isOptional: true,
                validationErrors: [],
                fields: this.getAdvancedFields(),
            },
        ];
    }

    private getBasicInfoFields(): WizardField[] {
        return [
            {
                id: 'name',
                type: 'TEXT',
                label: 'اسم السياسة',
                labelEn: 'Policy Name',
                placeholder: 'مثال: مكافأة الحضور الكامل',
                required: true,
                value: '',
                validation: { minLength: 5, maxLength: 100 },
            },
            {
                id: 'description',
                type: 'TEXTAREA',
                label: 'وصف السياسة',
                labelEn: 'Description',
                placeholder: 'اشرح هدف السياسة...',
                required: false,
                value: '',
                validation: { maxLength: 500 },
            },
            {
                id: 'category',
                type: 'SELECT',
                label: 'الفئة',
                labelEn: 'Category',
                required: true,
                value: '',
                options: [
                    { value: 'ATTENDANCE', label: 'الحضور والانصراف', icon: '⏰' },
                    { value: 'PERFORMANCE', label: 'الأداء', icon: '📈' },
                    { value: 'LEAVE', label: 'الإجازات', icon: '🏖️' },
                    { value: 'ANNIVERSARY', label: 'المناسبات', icon: '🎂' },
                    { value: 'CUSTODY', label: 'العهد', icon: '📦' },
                    { value: 'OTHER', label: 'أخرى', icon: '📋' },
                ],
            },
        ];
    }

    private getTriggerFields(): WizardField[] {
        return [
            {
                id: 'triggerEvent',
                type: 'RADIO',
                label: 'الحدث المُشغّل',
                labelEn: 'Trigger Event',
                required: true,
                value: '',
                options: [
                    { value: 'ATTENDANCE', label: 'عند الحضور أو الانصراف', description: 'يتم تفعيل السياسة مع كل تسجيل حضور' },
                    { value: 'PAYROLL', label: 'عند حساب الرواتب', description: 'يتم تفعيل السياسة شهرياً مع الرواتب' },
                    { value: 'LEAVE', label: 'عند طلب إجازة', description: 'يتم تفعيل السياسة مع كل طلب إجازة' },
                    { value: 'PERFORMANCE', label: 'عند تقييم الأداء', description: 'يتم تفعيل السياسة مع نتائج التقييم' },
                    { value: 'ANNIVERSARY', label: 'عند ذكرى التعيين', description: 'يتم تفعيل السياسة سنوياً' },
                    { value: 'MANUAL', label: 'تشغيل يدوي', description: 'يتم تفعيل السياسة يدوياً' },
                ],
            },
            {
                id: 'triggerTiming',
                type: 'SELECT',
                label: 'توقيت التنفيذ',
                labelEn: 'Execution Timing',
                required: true,
                value: 'AFTER',
                options: [
                    { value: 'BEFORE', label: 'قبل الحدث' },
                    { value: 'DURING', label: 'أثناء الحدث' },
                    { value: 'AFTER', label: 'بعد الحدث' },
                ],
            },
        ];
    }

    private getConditionsFields(): WizardField[] {
        return [
            {
                id: 'conditions',
                type: 'CONDITION_BUILDER',
                label: 'شروط التطبيق',
                labelEn: 'Conditions',
                required: false,
                value: [],
            },
            {
                id: 'conditionLogic',
                type: 'RADIO',
                label: 'منطق الشروط',
                labelEn: 'Condition Logic',
                required: true,
                value: 'ALL',
                options: [
                    { value: 'ALL', label: 'جميع الشروط (AND)', description: 'يجب تحقق كل الشروط' },
                    { value: 'ANY', label: 'أي شرط (OR)', description: 'يكفي تحقق شرط واحد' },
                ],
            },
        ];
    }

    private getActionsFields(): WizardField[] {
        return [
            {
                id: 'actions',
                type: 'CONDITION_BUILDER',
                label: 'الإجراءات',
                labelEn: 'Actions',
                required: true,
                value: [],
            },
        ];
    }

    private getScopeFields(): WizardField[] {
        return [
            {
                id: 'scopeType',
                type: 'RADIO',
                label: 'نطاق التطبيق',
                labelEn: 'Scope',
                required: true,
                value: 'ALL',
                options: [
                    { value: 'ALL', label: 'جميع الموظفين', icon: '👥' },
                    { value: 'DEPARTMENT', label: 'أقسام محددة', icon: '🏢' },
                    { value: 'BRANCH', label: 'فروع محددة', icon: '📍' },
                    { value: 'JOB_TITLE', label: 'مسميات وظيفية محددة', icon: '💼' },
                    { value: 'CUSTOM', label: 'اختيار مخصص', icon: '✨' },
                ],
            },
            {
                id: 'scopeInclude',
                type: 'MULTI_SELECT',
                label: 'يشمل',
                labelEn: 'Include',
                required: false,
                value: [],
                dependsOn: { field: 'scopeType', operator: 'NOT_EQUALS', value: 'ALL' },
            },
            {
                id: 'scopeExclude',
                type: 'MULTI_SELECT',
                label: 'يستثني',
                labelEn: 'Exclude',
                required: false,
                value: [],
            },
        ];
    }

    private getScheduleFields(): WizardField[] {
        return [
            {
                id: 'effectiveFrom',
                type: 'DATE',
                label: 'تاريخ البدء',
                labelEn: 'Start Date',
                required: false,
                value: null,
            },
            {
                id: 'effectiveTo',
                type: 'DATE',
                label: 'تاريخ الانتهاء',
                labelEn: 'End Date',
                required: false,
                value: null,
            },
        ];
    }

    private getAdvancedFields(): WizardField[] {
        return [
            {
                id: 'priority',
                type: 'SLIDER',
                label: 'الأولوية',
                labelEn: 'Priority',
                description: 'السياسات ذات الأولوية الأعلى تُنفذ أولاً',
                required: false,
                value: 10,
                validation: { min: 1, max: 100 },
            },
            {
                id: 'requiresApproval',
                type: 'TOGGLE',
                label: 'تتطلب موافقة',
                labelEn: 'Requires Approval',
                description: 'السياسة تحتاج موافقة قبل التفعيل',
                required: false,
                value: false,
            },
            {
                id: 'allowExceptions',
                type: 'TOGGLE',
                label: 'السماح بالاستثناءات',
                labelEn: 'Allow Exceptions',
                description: 'يمكن استثناء موظفين من السياسة',
                required: false,
                value: true,
            },
            {
                id: 'retroactiveAllowed',
                type: 'TOGGLE',
                label: 'التطبيق بأثر رجعي',
                labelEn: 'Retroactive Application',
                description: 'يمكن تطبيق السياسة على فترات سابقة',
                required: false,
                value: false,
            },
        ];
    }

    // ============== Helper Methods ==============

    private async validateStep(
        session: WizardSession,
        stepNumber: number,
        data: any,
    ): Promise<StepValidationResult> {
        const step = session.steps[stepNumber - 1];
        const errors: { field: string; message: string }[] = [];
        const warnings: { field: string; message: string }[] = [];
        const suggestions: { field: string; suggestion: FieldSuggestion }[] = [];

        for (const field of step.fields) {
            const value = data[field.id];

            // التحقق من المطلوب
            if (field.required && (value === undefined || value === '' || value === null)) {
                errors.push({ field: field.id, message: `${field.label} مطلوب` });
                continue;
            }

            // التحقق من الحد الأدنى
            if (field.validation?.minLength && String(value).length < field.validation.minLength) {
                errors.push({
                    field: field.id,
                    message: `${field.label} يجب أن يكون ${field.validation.minLength} أحرف على الأقل`,
                });
            }

            // التحقق من الحد الأقصى
            if (field.validation?.maxLength && String(value).length > field.validation.maxLength) {
                errors.push({
                    field: field.id,
                    message: `${field.label} يجب أن لا يتجاوز ${field.validation.maxLength} حرف`,
                });
            }

            // التحقق من النمط
            if (field.validation?.pattern && !new RegExp(field.validation.pattern).test(String(value))) {
                errors.push({
                    field: field.id,
                    message: field.validation.message || `${field.label} غير صالح`,
                });
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            suggestions,
        };
    }

    private saveStepData(session: WizardSession, stepNumber: number, data: any): void {
        Object.assign(session.data, data);
    }

    private async addInitialSuggestions(session: WizardSession, companyId: string): Promise<void> {
        // إضافة اقتراحات بناءً على سياسات الشركة الموجودة
    }

    private async addStepSuggestions(session: WizardSession, stepNumber: number): Promise<void> {
        // إضافة اقتراحات للخطوة الجديدة
    }

    private generateSummary(data: WizardData): string {
        const parts: string[] = [];

        if (data.name) {
            parts.push(`📋 ${data.name}`);
        }

        if (data.triggerEvent) {
            const triggers: Record<string, string> = {
                'ATTENDANCE': 'عند الحضور',
                'PAYROLL': 'مع الرواتب',
                'LEAVE': 'عند طلب إجازة',
                'PERFORMANCE': 'عند التقييم',
                'ANNIVERSARY': 'عند الذكرى السنوية',
            };
            parts.push(`⚡ ${triggers[data.triggerEvent] || data.triggerEvent}`);
        }

        if (data.conditions && data.conditions.length > 0) {
            parts.push(`🔍 ${data.conditions.length} شرط`);
        }

        if (data.actions && data.actions.length > 0) {
            parts.push(`🎯 ${data.actions.length} إجراء`);
        }

        if (data.scopeType) {
            const scopes: Record<string, string> = {
                'ALL': 'جميع الموظفين',
                'DEPARTMENT': 'أقسام محددة',
                'BRANCH': 'فروع محددة',
            };
            parts.push(`👥 ${scopes[data.scopeType] || data.scopeType}`);
        }

        return parts.join(' | ');
    }

    private async estimateImpact(
        companyId: string,
        data: WizardData,
    ): Promise<WizardPreview['estimatedImpact']> {
        // تقدير عدد الموظفين المتأثرين
        let employeesAffected = await this.prisma.user.count({
            where: { companyId, status: 'ACTIVE', role: 'EMPLOYEE' },
        });

        if (data.scopeType !== 'ALL' && data.scopeInclude?.length) {
            employeesAffected = data.scopeInclude.length;
        }

        // تقدير التكلفة/التوفير
        let estimatedCost = 0;
        let estimatedSavings = 0;

        if (data.actions) {
            for (const action of data.actions) {
                const value = Number(action.value) || 0;
                if (['BONUS', 'ALLOWANCE'].includes(action.type)) {
                    estimatedCost += value * employeesAffected;
                } else if (action.type === 'DEDUCTION') {
                    estimatedSavings += value * employeesAffected;
                }
            }
        }

        return { employeesAffected, estimatedCost, estimatedSavings };
    }

    private async checkWarnings(companyId: string, data: WizardData): Promise<string[]> {
        const warnings: string[] = [];

        // تحذير إذا لم تكن هناك شروط
        if (!data.conditions || data.conditions.length === 0) {
            warnings.push('السياسة بدون شروط ستُطبق على جميع الحالات');
        }

        // تحذير إذا كانت القيمة عالية
        if (data.actions) {
            for (const action of data.actions) {
                if (Number(action.value) > 5000) {
                    warnings.push(`قيمة ${action.typeLabel} (${action.value}) عالية`);
                }
            }
        }

        return warnings;
    }

    private async checkConflicts(companyId: string, data: WizardData): Promise<string[]> {
        const conflicts: string[] = [];

        // البحث عن سياسات مشابهة
        const existingPolicies = await this.prisma.smartPolicy.findMany({
            where: {
                companyId,
                triggerEvent: data.triggerEvent as any,
                isActive: true,
            },
        });

        for (const policy of existingPolicies) {
            conflicts.push(`قد تتعارض مع: ${policy.name}`);
        }

        return conflicts;
    }

    private generateReadablePolicy(data: WizardData): string {
        const parts: string[] = [];

        // البداية
        parts.push(`سياسة: ${data.name || 'سياسة جديدة'}`);

        // الحدث
        if (data.triggerEvent) {
            const triggers: Record<string, string> = {
                'ATTENDANCE': 'عند تسجيل الحضور والانصراف',
                'PAYROLL': 'عند حساب الرواتب الشهرية',
                'LEAVE': 'عند طلب أو استخدام الإجازات',
            };
            parts.push(`\nمتى: ${triggers[data.triggerEvent] || data.triggerEvent}`);
        }

        // الشروط
        if (data.conditions && data.conditions.length > 0) {
            parts.push('\nالشروط:');
            for (const cond of data.conditions) {
                parts.push(`  - ${cond.fieldLabel} ${cond.operatorLabel} ${cond.valueLabel || cond.value}`);
            }
        }

        // الإجراءات
        if (data.actions && data.actions.length > 0) {
            parts.push('\nالإجراءات:');
            for (const action of data.actions) {
                parts.push(`  - ${action.typeLabel}: ${action.value} ${action.description || ''}`);
            }
        }

        // النطاق
        if (data.scopeType) {
            const scopes: Record<string, string> = {
                'ALL': 'جميع الموظفين',
                'DEPARTMENT': 'أقسام محددة',
            };
            parts.push(`\nيُطبق على: ${scopes[data.scopeType] || data.scopeType}`);
        }

        return parts.join('');
    }

    private generatePolicyText(data: WizardData): string {
        // توليد النص الأصلي من البيانات
        const parts: string[] = [];

        if (data.conditions && data.conditions.length > 0) {
            const condText = data.conditions
                .map(c => `${c.fieldLabel} ${c.operatorLabel} ${c.value}`)
                .join(' و');
            parts.push(`إذا كان ${condText}`);
        }

        if (data.actions && data.actions.length > 0) {
            const actionText = data.actions
                .map(a => `${a.typeLabel} ${a.value}`)
                .join(' و');
            parts.push(`يتم ${actionText}`);
        }

        return parts.join('، ');
    }

    private buildParsedPolicy(data: WizardData): any {
        return {
            trigger: {
                event: data.triggerEvent,
                timing: data.triggerTiming,
            },
            conditions: data.conditions?.map(c => ({
                field: c.field,
                operator: c.operator,
                value: c.value,
            })) || [],
            actions: data.actions?.map(a => ({
                type: a.type,
                valueType: a.valueType,
                value: a.value,
                formula: a.formula,
                componentCode: a.componentCode,
            })) || [],
            scope: {
                type: data.scopeType,
                include: data.scopeInclude,
                exclude: data.scopeExclude,
            },
        };
    }

    private buildScope(data: WizardData): any {
        return {
            type: data.scopeType || 'ALL',
            include: data.scopeInclude || [],
            exclude: data.scopeExclude || [],
        };
    }

    private generateId(): string {
        return `wizard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
