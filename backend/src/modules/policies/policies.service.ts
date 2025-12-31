import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreatePolicyDto, PolicyScope, PolicyType } from './dto/create-policy.dto';
import { FormulaEngineService } from '../payroll-calculation/services/formula-engine.service';

// Deterministic scope rank for ordering
const SCOPE_RANK: Record<string, number> = {
    COMPANY: 1,
    BRANCH: 2,
    DEPARTMENT: 3,
    JOB_TITLE: 4,
    EMPLOYEE: 5,
};

@Injectable()
export class PoliciesService {
    private readonly logger = new Logger(PoliciesService.name);
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService,
        @Inject(forwardRef(() => FormulaEngineService))
        private formulaEngine: FormulaEngineService,
    ) { }

    async create(dto: CreatePolicyDto, companyId: string, createdById: string) {
        const { rules, ...policyData } = dto;

        // تحقق من عدم وجود سياسة بنفس الكود في هذه الشركة
        const existing = await this.prisma.policy.findFirst({
            where: { code: dto.code, companyId }
        });
        if (existing) throw new BadRequestException('يوجد سياسة بنفس الكود في هذه الشركة');

        // 🔥 Scope Target Validation
        if (dto.scope === 'BRANCH' && !dto.branchId) {
            throw new BadRequestException('branchId مطلوب عند اختيار نطاق الفرع');
        }
        if (dto.scope === 'DEPARTMENT' && !dto.departmentId) {
            throw new BadRequestException('departmentId مطلوب عند اختيار نطاق القسم');
        }
        if (dto.scope === 'JOB_TITLE' && !dto.jobTitleId) {
            throw new BadRequestException('jobTitleId مطلوب عند اختيار نطاق الدرجة الوظيفية');
        }
        if (dto.scope === 'EMPLOYEE' && !dto.employeeId) {
            throw new BadRequestException('employeeId مطلوب عند اختيار نطاق الموظف');
        }

        // Clear non-relevant target IDs
        const cleanTargets = {
            branchId: dto.scope === 'BRANCH' ? dto.branchId : null,
            departmentId: dto.scope === 'DEPARTMENT' ? dto.departmentId : null,
            jobTitleId: dto.scope === 'JOB_TITLE' ? dto.jobTitleId : null,
            employeeId: dto.scope === 'EMPLOYEE' ? dto.employeeId : null,
        };

        const policy = await this.prisma.policy.create({
            data: {
                ...policyData,
                ...cleanTargets,
                companyId,
                effectiveFrom: new Date(dto.effectiveFrom),
                effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
                settings: dto.settings || {},
                scopeRank: SCOPE_RANK[dto.scope] || 1, // 🔥 Deterministic rank
                createdById,
                rules: rules ? {
                    create: rules.map((r, i) => ({
                        ...r,
                        conditions: r.conditions || {},
                        ruleOrder: r.ruleOrder ?? i,
                    })),
                } : undefined,
            },
            include: { rules: true },
        });

        // Log audit
        await this.auditService.log(
            'CREATE',
            'Policy',
            policy.id,
            createdById,
            null,
            { code: policy.code, nameAr: policy.nameAr, type: policy.type, scope: policy.scope },
            `إنشاء سياسة جديدة: ${policy.nameAr}`,
        );

        return policy;
    }

    async findAll(companyId: string, type?: PolicyType) {
        return this.prisma.policy.findMany({
            where: {
                companyId,
                ...(type ? { type, isActive: true } : { isActive: true })
            },
            include: { rules: { where: { isActive: true }, orderBy: { ruleOrder: 'asc' } } },
            orderBy: [{ priority: 'desc' }, { effectiveFrom: 'desc' }],
        });
    }

    async findOne(id: string, companyId: string) {
        const policy = await this.prisma.policy.findFirst({
            where: { id, companyId },
            include: { rules: { orderBy: { ruleOrder: 'asc' } } },
        });
        if (!policy) throw new NotFoundException('السياسة غير موجودة');
        return policy;
    }

    async update(id: string, companyId: string, dto: Partial<CreatePolicyDto>, updatedById?: string) {
        const { rules, ...policyData } = dto;

        const oldPolicy = await this.findOne(id, companyId);

        const updatedPolicy = await this.prisma.policy.update({
            where: { id },
            data: {
                ...policyData,
                effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
                effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
            },
            include: { rules: true },
        });

        // Log audit
        await this.auditService.log(
            'UPDATE',
            'Policy',
            id,
            updatedById,
            { nameAr: oldPolicy.nameAr, settings: oldPolicy.settings },
            { nameAr: updatedPolicy.nameAr, settings: updatedPolicy.settings },
            `تعديل سياسة: ${updatedPolicy.nameAr}`,
        );

        return updatedPolicy;
    }

    async delete(id: string, companyId: string, deletedById?: string) {
        const policy = await this.findOne(id, companyId);

        await this.prisma.policy.delete({ where: { id } });

        // Log audit
        await this.auditService.log(
            'DELETE',
            'Policy',
            id,
            deletedById,
            { code: policy.code, nameAr: policy.nameAr, type: policy.type },
            null,
            `حذف سياسة: ${policy.nameAr}`,
        );

        return { success: true };
    }

    async toggleActive(id: string, companyId: string, toggledById?: string) {
        const policy = await this.findOne(id, companyId);

        const updatedPolicy = await this.prisma.policy.update({
            where: { id },
            data: { isActive: !policy.isActive },
            include: { rules: true },
        });

        // Log audit
        await this.auditService.log(
            'UPDATE',
            'Policy',
            id,
            toggledById,
            { isActive: policy.isActive },
            { isActive: updatedPolicy.isActive },
            `${updatedPolicy.isActive ? 'تفعيل' : 'إلغاء تفعيل'} سياسة: ${policy.nameAr}`,
        );

        return updatedPolicy;
    }

    /**
     * الحصول على السياسة المطبقة لموظف معين
     * يطبق سلسلة الأولوية: موظف → درجة وظيفية → قسم → فرع → شركة
     * Uses scopeRank (DB field) for deterministic ordering
     */
    async resolvePolicy(type: PolicyType, employeeId: string, companyId: string, date?: Date) {
        const effectiveDate = date || new Date();

        // 🔥 Validate employee belongs to same company
        const employee = await this.prisma.user.findFirst({
            where: { id: employeeId, companyId },
            select: { id: true, branchId: true, departmentId: true, jobTitleId: true },
        });

        if (!employee) throw new NotFoundException('الموظف غير موجود');

        // البحث عن السياسات مع الترتيب المحسوب في DB
        const policies = await this.prisma.policy.findMany({
            where: {
                companyId,
                type,
                isActive: true,
                effectiveFrom: { lte: effectiveDate },
                AND: [
                    {
                        OR: [
                            { effectiveTo: null },
                            { effectiveTo: { gte: effectiveDate } },
                        ],
                    },
                    {
                        OR: [
                            { scope: 'EMPLOYEE', employeeId: employee.id },
                            { scope: 'JOB_TITLE', jobTitleId: employee.jobTitleId },
                            { scope: 'DEPARTMENT', departmentId: employee.departmentId },
                            { scope: 'BRANCH', branchId: employee.branchId },
                            { scope: 'COMPANY' },
                        ],
                    },
                ],
            },
            include: {
                rules: {
                    where: { isActive: true },
                    orderBy: { ruleOrder: 'asc' }, // 🔥 Use ruleOrder field
                    include: { outputComponent: true }
                }
            },
            // 🔥 Deterministic ordering using scopeRank (higher = more specific)
            orderBy: [
                { scopeRank: 'desc' },
                { priority: 'desc' }
            ],
        });

        // Return highest priority (most specific) policy
        return policies[0] || null;
    }

    // إضافة قاعدة لسياسة
    async addRule(policyId: string, companyId: string, ruleData: any) {
        const policy = await this.findOne(policyId, companyId);

        // 🔥 Validate outputComponentId belongs to same company
        if (ruleData.outputComponentId) {
            const component = await this.prisma.salaryComponent.findFirst({
                where: { id: ruleData.outputComponentId, companyId }
            });
            if (!component) {
                throw new ForbiddenException('مكوّن الراتب غير موجود أو لا ينتمي لنفس الشركة');
            }
        }

        // 🔥 Validate outputSign is valid enum value
        if (ruleData.outputSign && !['EARNING', 'DEDUCTION'].includes(ruleData.outputSign)) {
            throw new BadRequestException('outputSign يجب أن يكون EARNING أو DEDUCTION');
        }

        // Get max order for new rule
        const maxOrder = await this.prisma.policyRule.aggregate({
            where: { policyId },
            _max: { ruleOrder: true }
        });

        return this.prisma.policyRule.create({
            data: {
                policyId,
                code: ruleData.code,
                nameAr: ruleData.nameAr,
                valueType: ruleData.valueType,
                value: ruleData.value,
                outputComponentId: ruleData.outputComponentId || null,
                outputSign: ruleData.outputSign || 'EARNING',
                conditions: ruleData.conditions || {},
                ruleOrder: ruleData.ruleOrder ?? (maxOrder._max.ruleOrder || 0) + 1,
                isActive: ruleData.isActive ?? true,
            },
            include: { outputComponent: true }
        });
    }

    // حذف قاعدة
    async deleteRule(ruleId: string, companyId: string) {
        const rule = await this.prisma.policyRule.findFirst({
            where: { id: ruleId, policy: { companyId } }
        });

        if (!rule) throw new NotFoundException('القاعدة غير موجودة');

        return this.prisma.policyRule.delete({ where: { id: ruleId } });
    }

    // ==================== Rule Evaluation Engine ====================

    /**
     * تقييم القواعد للحصول على القيمة المناسبة
     * @param policy السياسة
     * @param context السياق (مثل: dayType، hours، salary)
     */
    evaluateRules(policy: any, context: Record<string, any>): { rule: any; value: any } | null {
        if (!policy?.rules || policy.rules.length === 0) return null;

        for (const rule of policy.rules) {
            if (!rule.isActive) continue;

            // فحص الشروط
            const conditions = rule.conditions as Record<string, any>;
            if (this.matchesConditions(conditions, context)) {
                const computedValue = this.computeRuleValue(rule, context);
                return { rule, value: computedValue };
            }
        }

        return null;
    }

    /**
     * فحص هل الشروط تتطابق مع السياق
     */
    private matchesConditions(conditions: Record<string, any>, context: Record<string, any>): boolean {
        if (!conditions || Object.keys(conditions).length === 0) return true;

        for (const [key, condition] of Object.entries(conditions)) {
            const contextValue = context[key];

            // شرط بسيط (قيمة مباشرة)
            if (typeof condition !== 'object') {
                if (contextValue !== condition) return false;
                continue;
            }

            // شروط معقدة
            if (condition.eq !== undefined && contextValue !== condition.eq) return false;
            if (condition.ne !== undefined && contextValue === condition.ne) return false;
            if (condition.gt !== undefined && !(contextValue > condition.gt)) return false;
            if (condition.gte !== undefined && !(contextValue >= condition.gte)) return false;
            if (condition.lt !== undefined && !(contextValue < condition.lt)) return false;
            if (condition.lte !== undefined && !(contextValue <= condition.lte)) return false;
            if (condition.in !== undefined && !condition.in.includes(contextValue)) return false;
            if (condition.notIn !== undefined && condition.notIn.includes(contextValue)) return false;
        }

        return true;
    }

    /**
     * حساب قيمة القاعدة
     */
    private computeRuleValue(rule: any, context: Record<string, any>): number | string {
        const valueType = rule.valueType;
        const value = rule.value;

        switch (valueType) {
            case 'FIXED':
                return parseFloat(value) || 0;

            case 'PERCENTAGE':
                const baseValue = context.baseValue || context.salary || 0;
                return (baseValue * parseFloat(value)) / 100;

            case 'FORMULA':
                return this.evaluateFormula(value, context);

            case 'MULTIPLIER':
                const hourlyRate = context.hourlyRate || (context.salary / (context.workingHours || 240));
                return hourlyRate * parseFloat(value);

            default:
                return parseFloat(value) || value;
        }
    }

    /**
     * تقييم معادلة باستخدام محرك المعادلات المطور
     */
    private evaluateFormula(formula: string, context: Record<string, any>): number {
        const variableContext = this.formulaEngine.buildVariableContext({
            basicSalary: context.salary || 0,
            totalSalary: context.totalSalary || context.salary || 0,
            housingAllowance: context.housingAllowance || 0,
            transportAllowance: context.transportAllowance || 0,
            otherAllowances: context.otherAllowances || 0,
            overtimeHours: context.hours || context.overtimeHours || 0,
            daysWorked: context.daysWorked || 30,
            daysAbsent: context.daysAbsent || 0,
            lateMinutes: context.lateMinutes || 0,
            yearsOfService: context.yearsOfService || 0,
        });

        // دمج متغيرات إضافية من السياق (مثل hourlyRate المحسوب يدوياً)
        const combinedContext = { ...variableContext, ...context };

        const result = this.formulaEngine.evaluate(formula, combinedContext);

        if (result.error) {
            this.logger.warn(`Policy Formula Error: ${result.error} in formula: ${formula}`);
        }

        return result.value;
    }

    /**
     * الحصول على قيمة من سياسة معينة
     * يجمع resolvePolicy و evaluateRules في خطوة واحدة
     */
    async getPolicyValue(
        type: string,
        employeeId: string,
        companyId: string,
        context: Record<string, any>,
        date?: Date
    ): Promise<{ policy: any; rule: any; value: any } | null> {
        const policy = await this.resolvePolicy(type as any, employeeId, companyId, date);
        if (!policy) return null;

        const result = this.evaluateRules(policy, context);
        if (!result) return null;

        return {
            policy,
            rule: result.rule,
            value: result.value,
        };
    }

    /**
     * الحصول على إعدادات سياسة (بدون قواعد)
     */
    async getPolicySetting(
        type: string,
        employeeId: string,
        companyId: string,
        settingKey: string,
        defaultValue?: any,
        date?: Date
    ): Promise<any> {
        const policy = await this.resolvePolicy(type as any, employeeId, companyId, date);
        if (!policy) return defaultValue;

        const settings = policy.settings as Record<string, any>;
        return settings[settingKey] ?? defaultValue;
    }
}

