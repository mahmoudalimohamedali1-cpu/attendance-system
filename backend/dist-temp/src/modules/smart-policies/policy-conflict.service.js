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
var PolicyConflictService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyConflictService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let PolicyConflictService = PolicyConflictService_1 = class PolicyConflictService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(PolicyConflictService_1.name);
    }
    async detectConflicts(policyId) {
        const policy = await this.prisma.smartPolicy.findUnique({
            where: { id: policyId },
        });
        if (!policy) {
            throw new common_1.BadRequestException(`السياسة غير موجودة: ${policyId}`);
        }
        const activePolicies = await this.prisma.smartPolicy.findMany({
            where: {
                companyId: policy.companyId,
                id: { not: policyId },
                status: { in: ['ACTIVE', 'PENDING'] },
            },
        });
        const conflictingPolicies = [];
        const warnings = [];
        for (const otherPolicy of activePolicies) {
            if (policy.triggerEvent === otherPolicy.triggerEvent) {
                const conditionOverlap = this.checkConditionOverlap(policy.conditions, otherPolicy.conditions);
                if (conditionOverlap.overlaps) {
                    const actionConflict = this.checkActionConflict(policy.actions, otherPolicy.actions);
                    if (actionConflict.conflicts) {
                        conflictingPolicies.push({
                            id: otherPolicy.id,
                            name: otherPolicy.name || 'سياسة بدون اسم',
                            triggerEvent: otherPolicy.triggerEvent,
                            conflictType: 'CONTRADICTING_ACTIONS',
                            severity: 'HIGH',
                            description: `تعارض في الإجراءات: ${actionConflict.reason}`,
                        });
                    }
                    else if (conditionOverlap.overlaps) {
                        conflictingPolicies.push({
                            id: otherPolicy.id,
                            name: otherPolicy.name || 'سياسة بدون اسم',
                            triggerEvent: otherPolicy.triggerEvent,
                            conflictType: 'OVERLAPPING_CONDITIONS',
                            severity: 'MEDIUM',
                            description: `شروط متداخلة: ${conditionOverlap.reason}`,
                        });
                    }
                }
                else {
                    conflictingPolicies.push({
                        id: otherPolicy.id,
                        name: otherPolicy.name || 'سياسة بدون اسم',
                        triggerEvent: otherPolicy.triggerEvent,
                        conflictType: 'SAME_TRIGGER',
                        severity: 'LOW',
                        description: 'نفس الحدث المُفعِّل (قد لا يكون تعارضاً حقيقياً)',
                    });
                }
            }
        }
        if (conflictingPolicies.filter(c => c.severity === 'HIGH').length > 0) {
            warnings.push('⚠️ يوجد تعارض خطير! قد تُلغي هذه السياسة تأثير سياسات أخرى.');
        }
        if (conflictingPolicies.filter(c => c.severity === 'MEDIUM').length > 0) {
            warnings.push('⚡ يوجد تداخل في الشروط. تأكد من ترتيب الأولويات.');
        }
        return {
            hasConflicts: conflictingPolicies.length > 0,
            conflictingPolicies,
            warnings,
        };
    }
    async getConflictMatrix(companyId) {
        const policies = await this.prisma.smartPolicy.findMany({
            where: {
                companyId,
                status: { in: ['ACTIVE', 'PENDING', 'DRAFT'] },
            },
            select: {
                id: true,
                name: true,
                triggerEvent: true,
                conditions: true,
                actions: true,
            },
        });
        const conflicts = [];
        for (let i = 0; i < policies.length; i++) {
            for (let j = i + 1; j < policies.length; j++) {
                const p1 = policies[i];
                const p2 = policies[j];
                if (p1.triggerEvent === p2.triggerEvent) {
                    const conditionOverlap = this.checkConditionOverlap(p1.conditions, p2.conditions);
                    if (conditionOverlap.overlaps) {
                        const actionConflict = this.checkActionConflict(p1.actions, p2.actions);
                        conflicts.push({
                            policy1Id: p1.id,
                            policy2Id: p2.id,
                            conflictType: actionConflict.conflicts ? 'CONTRADICTING_ACTIONS' : 'OVERLAPPING_CONDITIONS',
                            severity: actionConflict.conflicts ? 'HIGH' : 'MEDIUM',
                        });
                    }
                }
            }
        }
        return {
            policies: policies.map(p => ({
                id: p.id,
                name: p.name || 'سياسة بدون اسم',
                triggerEvent: p.triggerEvent,
            })),
            conflicts,
        };
    }
    checkConditionOverlap(conditions1, conditions2) {
        if (!conditions1?.length || !conditions2?.length) {
            return {
                overlaps: true,
                reason: 'أحد السياسات بدون شروط (تنطبق على الجميع)',
            };
        }
        const fields1 = new Set(conditions1.map(c => c.field));
        const fields2 = new Set(conditions2.map(c => c.field));
        const commonFields = [...fields1].filter(f => fields2.has(f));
        if (commonFields.length > 0) {
            for (const field of commonFields) {
                const c1 = conditions1.find(c => c.field === field);
                const c2 = conditions2.find(c => c.field === field);
                if (this.valuesOverlap(c1, c2)) {
                    return {
                        overlaps: true,
                        reason: `تداخل في الحقل "${field}"`,
                    };
                }
            }
        }
        return { overlaps: false, reason: '' };
    }
    valuesOverlap(c1, c2) {
        const v1 = Number(c1?.value);
        const v2 = Number(c2?.value);
        const op1 = c1?.operator;
        const op2 = c2?.operator;
        if (op1 === '>' && op2 === '>') {
            return true;
        }
        if (op1 === '<' && op2 === '<') {
            return true;
        }
        if (op1 === '==' && op2 === '==') {
            return v1 === v2;
        }
        return true;
    }
    checkActionConflict(actions1, actions2) {
        if (!actions1?.length || !actions2?.length) {
            return { conflicts: false, reason: '' };
        }
        for (const a1 of actions1) {
            for (const a2 of actions2) {
                if (a1.type === 'DEDUCT_FROM_PAYROLL' &&
                    a2.type === 'ADD_TO_PAYROLL') {
                    if (a1.componentCode === a2.componentCode) {
                        return {
                            conflicts: true,
                            reason: `خصم وإضافة على نفس المكون: ${a1.componentCode || 'الراتب'}`,
                        };
                    }
                }
                if (a1.type === a2.type && a1.value !== a2.value) {
                    return {
                        conflicts: true,
                        reason: `نفس نوع الإجراء بقيم مختلفة: ${a1.value} vs ${a2.value}`,
                    };
                }
            }
        }
        return { conflicts: false, reason: '' };
    }
    async validateBeforeActivation(policyId) {
        const conflicts = await this.detectConflicts(policyId);
        const blockingConflicts = conflicts.conflictingPolicies
            .filter(c => c.severity === 'HIGH')
            .map(c => `${c.name}: ${c.description}`);
        return {
            canActivate: blockingConflicts.length === 0,
            warnings: conflicts.warnings,
            blockingConflicts,
        };
    }
};
exports.PolicyConflictService = PolicyConflictService;
exports.PolicyConflictService = PolicyConflictService = PolicyConflictService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PolicyConflictService);
//# sourceMappingURL=policy-conflict.service.js.map