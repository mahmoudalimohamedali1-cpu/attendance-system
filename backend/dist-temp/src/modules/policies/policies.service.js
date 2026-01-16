"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PoliciesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoliciesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const formula_engine_service_1 = require("../payroll-calculation/services/formula-engine.service");
const SCOPE_RANK = {
    COMPANY: 1,
    BRANCH: 2,
    DEPARTMENT: 3,
    JOB_TITLE: 4,
    EMPLOYEE: 5,
};
let PoliciesService = PoliciesService_1 = class PoliciesService {
    constructor(prisma, auditService, formulaEngine) {
        this.prisma = prisma;
        this.auditService = auditService;
        this.formulaEngine = formulaEngine;
        this.logger = new common_1.Logger(PoliciesService_1.name);
    }
    async create(dto, companyId, createdById) {
        const { rules, ...policyData } = dto;
        const existing = await this.prisma.policy.findFirst({
            where: { code: dto.code, companyId }
        });
        if (existing)
            throw new common_1.BadRequestException('يوجد سياسة بنفس الكود في هذه الشركة');
        if (dto.scope === 'BRANCH' && !dto.branchId) {
            throw new common_1.BadRequestException('branchId مطلوب عند اختيار نطاق الفرع');
        }
        if (dto.scope === 'DEPARTMENT' && !dto.departmentId) {
            throw new common_1.BadRequestException('departmentId مطلوب عند اختيار نطاق القسم');
        }
        if (dto.scope === 'JOB_TITLE' && !dto.jobTitleId) {
            throw new common_1.BadRequestException('jobTitleId مطلوب عند اختيار نطاق الدرجة الوظيفية');
        }
        if (dto.scope === 'EMPLOYEE' && !dto.employeeId) {
            throw new common_1.BadRequestException('employeeId مطلوب عند اختيار نطاق الموظف');
        }
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
                scopeRank: SCOPE_RANK[dto.scope] || 1,
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
        await this.auditService.log('CREATE', 'Policy', policy.id, createdById, null, { code: policy.code, nameAr: policy.nameAr, type: policy.type, scope: policy.scope }, `إنشاء سياسة جديدة: ${policy.nameAr}`);
        return policy;
    }
    async findAll(companyId, type) {
        return this.prisma.policy.findMany({
            where: {
                companyId,
                ...(type ? { type, isActive: true } : { isActive: true })
            },
            include: { rules: { where: { isActive: true }, orderBy: { ruleOrder: 'asc' } } },
            orderBy: [{ priority: 'desc' }, { effectiveFrom: 'desc' }],
        });
    }
    async findOne(id, companyId) {
        const policy = await this.prisma.policy.findFirst({
            where: { id, companyId },
            include: { rules: { orderBy: { ruleOrder: 'asc' } } },
        });
        if (!policy)
            throw new common_1.NotFoundException('السياسة غير موجودة');
        return policy;
    }
    async update(id, companyId, dto, updatedById) {
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
        await this.auditService.log('UPDATE', 'Policy', id, updatedById, { nameAr: oldPolicy.nameAr, settings: oldPolicy.settings }, { nameAr: updatedPolicy.nameAr, settings: updatedPolicy.settings }, `تعديل سياسة: ${updatedPolicy.nameAr}`);
        return updatedPolicy;
    }
    async delete(id, companyId, deletedById) {
        const policy = await this.findOne(id, companyId);
        await this.prisma.policy.delete({ where: { id } });
        await this.auditService.log('DELETE', 'Policy', id, deletedById, { code: policy.code, nameAr: policy.nameAr, type: policy.type }, null, `حذف سياسة: ${policy.nameAr}`);
        return { success: true };
    }
    async toggleActive(id, companyId, toggledById) {
        const policy = await this.findOne(id, companyId);
        const updatedPolicy = await this.prisma.policy.update({
            where: { id },
            data: { isActive: !policy.isActive },
            include: { rules: true },
        });
        await this.auditService.log('UPDATE', 'Policy', id, toggledById, { isActive: policy.isActive }, { isActive: updatedPolicy.isActive }, `${updatedPolicy.isActive ? 'تفعيل' : 'إلغاء تفعيل'} سياسة: ${policy.nameAr}`);
        return updatedPolicy;
    }
    async resolvePolicy(type, employeeId, companyId, date) {
        const effectiveDate = date || new Date();
        const employee = await this.prisma.user.findFirst({
            where: { id: employeeId, companyId },
            select: { id: true, branchId: true, departmentId: true, jobTitleId: true },
        });
        if (!employee)
            throw new common_1.NotFoundException('الموظف غير موجود');
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
                    orderBy: { ruleOrder: 'asc' },
                    include: { outputComponent: true }
                }
            },
            orderBy: [
                { scopeRank: 'desc' },
                { priority: 'desc' }
            ],
        });
        return policies[0] || null;
    }
    async addRule(policyId, companyId, ruleData) {
        const policy = await this.findOne(policyId, companyId);
        if (ruleData.outputComponentId) {
            const component = await this.prisma.salaryComponent.findFirst({
                where: { id: ruleData.outputComponentId, companyId }
            });
            if (!component) {
                throw new common_1.ForbiddenException('مكوّن الراتب غير موجود أو لا ينتمي لنفس الشركة');
            }
        }
        if (ruleData.outputSign && !['EARNING', 'DEDUCTION'].includes(ruleData.outputSign)) {
            throw new common_1.BadRequestException('outputSign يجب أن يكون EARNING أو DEDUCTION');
        }
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
    async deleteRule(ruleId, companyId) {
        const rule = await this.prisma.policyRule.findFirst({
            where: { id: ruleId, policy: { companyId } }
        });
        if (!rule)
            throw new common_1.NotFoundException('القاعدة غير موجودة');
        return this.prisma.policyRule.delete({ where: { id: ruleId } });
    }
    evaluateRules(policy, context) {
        if (!policy?.rules || policy.rules.length === 0)
            return null;
        for (const rule of policy.rules) {
            if (!rule.isActive)
                continue;
            const conditions = rule.conditions;
            if (this.matchesConditions(conditions, context)) {
                const computedValue = this.computeRuleValue(rule, context);
                return { rule, value: computedValue };
            }
        }
        return null;
    }
    matchesConditions(conditions, context) {
        if (!conditions || Object.keys(conditions).length === 0)
            return true;
        for (const [key, condition] of Object.entries(conditions)) {
            const contextValue = context[key];
            if (typeof condition !== 'object') {
                if (contextValue !== condition)
                    return false;
                continue;
            }
            if (condition.eq !== undefined && contextValue !== condition.eq)
                return false;
            if (condition.ne !== undefined && contextValue === condition.ne)
                return false;
            if (condition.gt !== undefined && !(contextValue > condition.gt))
                return false;
            if (condition.gte !== undefined && !(contextValue >= condition.gte))
                return false;
            if (condition.lt !== undefined && !(contextValue < condition.lt))
                return false;
            if (condition.lte !== undefined && !(contextValue <= condition.lte))
                return false;
            if (condition.in !== undefined && !condition.in.includes(contextValue))
                return false;
            if (condition.notIn !== undefined && condition.notIn.includes(contextValue))
                return false;
        }
        return true;
    }
    computeRuleValue(rule, context) {
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
    evaluateFormula(formula, context) {
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
        const combinedContext = { ...variableContext, ...context };
        const result = this.formulaEngine.evaluate(formula, combinedContext);
        if (result.error) {
            this.logger.warn(`Policy Formula Error: ${result.error} in formula: ${formula}`);
        }
        return result.value;
    }
    async getPolicyValue(type, employeeId, companyId, context, date) {
        const policy = await this.resolvePolicy(type, employeeId, companyId, date);
        if (!policy)
            return null;
        const result = this.evaluateRules(policy, context);
        if (!result)
            return null;
        return {
            policy,
            rule: result.rule,
            value: result.value,
        };
    }
    async getPolicySetting(type, employeeId, companyId, settingKey, defaultValue, date) {
        const policy = await this.resolvePolicy(type, employeeId, companyId, date);
        if (!policy)
            return defaultValue;
        const settings = policy.settings;
        return settings[settingKey] ?? defaultValue;
    }
};
exports.PoliciesService = PoliciesService;
exports.PoliciesService = PoliciesService = PoliciesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => formula_engine_service_1.FormulaEngineService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        formula_engine_service_1.FormulaEngineService])
], PoliciesService);
//# sourceMappingURL=policies.service.js.map