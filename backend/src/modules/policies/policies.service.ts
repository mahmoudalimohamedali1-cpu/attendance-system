import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePolicyDto, PolicyScope, PolicyType } from './dto/create-policy.dto';

@Injectable()
export class PoliciesService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreatePolicyDto, companyId: string, createdById: string) {
        const { rules, ...policyData } = dto;

        // تحقق من عدم وجود سياسة بنفس الكود في هذه الشركة
        const existing = await this.prisma.policy.findFirst({
            where: { code: dto.code, companyId }
        });
        if (existing) throw new BadRequestException('يوجد سياسة بنفس الكود في هذه الشركة');

        return this.prisma.policy.create({
            data: {
                ...policyData,
                companyId,
                effectiveFrom: new Date(dto.effectiveFrom),
                effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
                settings: dto.settings || {},
                createdById,
                rules: rules ? {
                    create: rules.map((r, i) => ({
                        ...r,
                        conditions: r.conditions || {},
                        order: r.order ?? i,
                    })),
                } : undefined,
            },
            include: { rules: true },
        });
    }

    async findAll(companyId: string, type?: PolicyType) {
        return this.prisma.policy.findMany({
            where: {
                companyId,
                ...(type ? { type, isActive: true } : { isActive: true })
            },
            include: { rules: { where: { isActive: true }, orderBy: { order: 'asc' } } },
            orderBy: [{ priority: 'desc' }, { effectiveFrom: 'desc' }],
        });
    }

    async findOne(id: string, companyId: string) {
        const policy = await this.prisma.policy.findFirst({
            where: { id, companyId },
            include: { rules: { orderBy: { order: 'asc' } } },
        });
        if (!policy) throw new NotFoundException('السياسة غير موجودة');
        return policy;
    }

    async update(id: string, companyId: string, dto: Partial<CreatePolicyDto>) {
        const { rules, ...policyData } = dto;

        await this.findOne(id, companyId);

        return this.prisma.policy.update({
            where: { id },
            data: {
                ...policyData,
                effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
                effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
            },
            include: { rules: true },
        });
    }

    async delete(id: string, companyId: string) {
        await this.findOne(id, companyId);
        return this.prisma.policy.delete({ where: { id } });
    }

    async toggleActive(id: string, companyId: string) {
        const policy = await this.findOne(id, companyId);

        return this.prisma.policy.update({
            where: { id },
            data: { isActive: !policy.isActive },
            include: { rules: true },
        });
    }

    /**
     * الحصول على السياسة المطبقة لموظف معين
     * يطبق سلسلة الأولوية: موظف → درجة وظيفية → قسم → فرع → شركة
     */
    async resolvePolicy(type: PolicyType, employeeId: string, companyId: string, date?: Date) {
        const effectiveDate = date || new Date();

        const employee = await this.prisma.user.findFirst({
            where: { id: employeeId, companyId },
            select: { id: true, branchId: true, departmentId: true, jobTitleId: true },
        });

        if (!employee) throw new NotFoundException('الموظف غير موجود');

        // البحث عن السياسات حسب الأولوية
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
            include: { rules: { where: { isActive: true }, orderBy: { order: 'asc' } } },
            orderBy: [{ priority: 'desc' }],
        });

        // ترتيب حسب النطاق (الأضيق أولاً)
        const scopePriority: Record<string, number> = {
            EMPLOYEE: 5,
            JOB_TITLE: 4,
            DEPARTMENT: 3,
            BRANCH: 2,
            COMPANY: 1,
        };

        const sorted = [...policies].sort((a: any, b: any) => {
            const aPriority = scopePriority[a.scope] + (a.priority * 10);
            const bPriority = scopePriority[b.scope] + (b.priority * 10);
            return bPriority - aPriority;
        });

        return sorted[0] || null;
    }

    // إضافة قاعدة لسياسة
    async addRule(policyId: string, companyId: string, ruleData: any) {
        await this.findOne(policyId, companyId);

        return this.prisma.policyRule.create({
            data: {
                policyId,
                ...ruleData,
                conditions: ruleData.conditions || {},
            },
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
     * تقييم معادلة بسيطة
     * مثال: "hourlyRate * hours * 1.5"
     */
    private evaluateFormula(formula: string, context: Record<string, any>): number {
        try {
            // استبدال المتغيرات بقيمها
            let expression = formula;
            for (const [key, value] of Object.entries(context)) {
                const regex = new RegExp(`\\b${key}\\b`, 'g');
                expression = expression.replace(regex, String(value));
            }

            // تقييم التعبير الرياضي البسيط (آمن)
            // فقط أرقام وعمليات حسابية أساسية
            if (!/^[\d\s+\-*/().]+$/.test(expression)) {
                console.warn('Formula contains invalid characters:', formula);
                return 0;
            }

            return eval(expression) || 0;
        } catch (e) {
            console.error('Error evaluating formula:', formula, e);
            return 0;
        }
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

