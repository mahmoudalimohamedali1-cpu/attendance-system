import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * نتيجة اكتشاف التعارض
 */
export interface ConflictResult {
    hasConflicts: boolean;
    conflictingPolicies: Array<{
        id: string;
        name: string;
        triggerEvent: string;
        conflictType: 'SAME_TRIGGER' | 'OVERLAPPING_CONDITIONS' | 'CONTRADICTING_ACTIONS';
        severity: 'LOW' | 'MEDIUM' | 'HIGH';
        description: string;
    }>;
    warnings: string[];
}

/**
 * Policy Conflict Detection Service
 * يكتشف التعارضات بين السياسات قبل التفعيل
 */
@Injectable()
export class PolicyConflictService {
    private readonly logger = new Logger(PolicyConflictService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * اكتشاف التعارضات لسياسة معينة
     */
    async detectConflicts(policyId: string): Promise<ConflictResult> {
        const policy = await this.prisma.smartPolicy.findUnique({
            where: { id: policyId },
        });

        if (!policy) {
            throw new BadRequestException(`السياسة غير موجودة: ${policyId}`);
        }

        // جلب جميع السياسات النشطة في نفس الشركة (ما عدا السياسة الحالية)
        const activePolicies = await this.prisma.smartPolicy.findMany({
            where: {
                companyId: policy.companyId,
                id: { not: policyId },
                status: { in: ['ACTIVE', 'PENDING'] },
            },
        });

        const conflictingPolicies: ConflictResult['conflictingPolicies'] = [];
        const warnings: string[] = [];

        for (const otherPolicy of activePolicies) {
            // 1. فحص تعارض الـ Trigger Event
            if (policy.triggerEvent === otherPolicy.triggerEvent) {
                const conditionOverlap = this.checkConditionOverlap(
                    policy.conditions as any[],
                    otherPolicy.conditions as any[],
                );

                if (conditionOverlap.overlaps) {
                    // 2. فحص تعارض الإجراءات
                    const actionConflict = this.checkActionConflict(
                        policy.actions as any[],
                        otherPolicy.actions as any[],
                    );

                    if (actionConflict.conflicts) {
                        conflictingPolicies.push({
                            id: otherPolicy.id,
                            name: otherPolicy.name || 'سياسة بدون اسم',
                            triggerEvent: otherPolicy.triggerEvent,
                            conflictType: 'CONTRADICTING_ACTIONS',
                            severity: 'HIGH',
                            description: `تعارض في الإجراءات: ${actionConflict.reason}`,
                        });
                    } else if (conditionOverlap.overlaps) {
                        conflictingPolicies.push({
                            id: otherPolicy.id,
                            name: otherPolicy.name || 'سياسة بدون اسم',
                            triggerEvent: otherPolicy.triggerEvent,
                            conflictType: 'OVERLAPPING_CONDITIONS',
                            severity: 'MEDIUM',
                            description: `شروط متداخلة: ${conditionOverlap.reason}`,
                        });
                    }
                } else {
                    // نفس الـ trigger لكن شروط مختلفة
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

        // إضافة تحذيرات عامة
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

    /**
     * الحصول على مصفوفة التعارضات لجميع السياسات
     */
    async getConflictMatrix(companyId: string): Promise<{
        policies: Array<{ id: string; name: string; triggerEvent: string }>;
        conflicts: Array<{
            policy1Id: string;
            policy2Id: string;
            conflictType: string;
            severity: string;
        }>;
    }> {
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

        const conflicts: Array<{
            policy1Id: string;
            policy2Id: string;
            conflictType: string;
            severity: string;
        }> = [];

        // فحص كل زوج من السياسات
        for (let i = 0; i < policies.length; i++) {
            for (let j = i + 1; j < policies.length; j++) {
                const p1 = policies[i];
                const p2 = policies[j];

                if (p1.triggerEvent === p2.triggerEvent) {
                    const conditionOverlap = this.checkConditionOverlap(
                        p1.conditions as any[],
                        p2.conditions as any[],
                    );

                    if (conditionOverlap.overlaps) {
                        const actionConflict = this.checkActionConflict(
                            p1.actions as any[],
                            p2.actions as any[],
                        );

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

    /**
     * التحقق من وجود تداخل في الشروط
     */
    private checkConditionOverlap(
        conditions1: any[],
        conditions2: any[],
    ): { overlaps: boolean; reason: string } {
        if (!conditions1?.length || !conditions2?.length) {
            // إذا أحدهما بدون شروط، يُطبق على الجميع = تداخل محتمل
            return {
                overlaps: true,
                reason: 'أحد السياسات بدون شروط (تنطبق على الجميع)',
            };
        }

        // فحص الحقول المشتركة
        const fields1 = new Set(conditions1.map(c => c.field));
        const fields2 = new Set(conditions2.map(c => c.field));

        const commonFields = [...fields1].filter(f => fields2.has(f));

        if (commonFields.length > 0) {
            // نفس الحقول = تداخل محتمل
            for (const field of commonFields) {
                const c1 = conditions1.find(c => c.field === field);
                const c2 = conditions2.find(c => c.field === field);

                // فحص التداخل في القيم
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

    /**
     * التحقق من تداخل القيم بين شرطين
     */
    private valuesOverlap(c1: any, c2: any): boolean {
        const v1 = Number(c1?.value);
        const v2 = Number(c2?.value);
        const op1 = c1?.operator;
        const op2 = c2?.operator;

        // مثال: c1: lateDays > 3, c2: lateDays > 5 = تداخل (كل من > 5 يحقق > 3)
        if (op1 === '>' && op2 === '>') {
            return true; // دائماً تداخل
        }
        if (op1 === '<' && op2 === '<') {
            return true;
        }
        if (op1 === '==' && op2 === '==') {
            return v1 === v2;
        }

        // فحص معقد للتداخلات الأخرى
        return true; // نعتبر تداخل بشكل افتراضي للأمان
    }

    /**
     * التحقق من تعارض الإجراءات
     */
    private checkActionConflict(
        actions1: any[],
        actions2: any[],
    ): { conflicts: boolean; reason: string } {
        if (!actions1?.length || !actions2?.length) {
            return { conflicts: false, reason: '' };
        }

        // فحص إجراءات متناقضة
        for (const a1 of actions1) {
            for (const a2 of actions2) {
                // خصم وإضافة على نفس المكون = تعارض
                if (
                    a1.type === 'DEDUCT_FROM_PAYROLL' &&
                    a2.type === 'ADD_TO_PAYROLL'
                ) {
                    if (a1.componentCode === a2.componentCode) {
                        return {
                            conflicts: true,
                            reason: `خصم وإضافة على نفس المكون: ${a1.componentCode || 'الراتب'}`,
                        };
                    }
                }

                // نفس الإجراء بقيم مختلفة = تعارض محتمل
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

    /**
     * فحص السياسة قبل التفعيل
     */
    async validateBeforeActivation(policyId: string): Promise<{
        canActivate: boolean;
        warnings: string[];
        blockingConflicts: string[];
    }> {
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
}
