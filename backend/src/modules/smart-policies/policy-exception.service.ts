// @ts-nocheck
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * DTO لإنشاء استثناء للسياسة
 */
export interface CreatePolicyExceptionDto {
    policyId: string;
    exceptionType: 'EMPLOYEE' | 'DEPARTMENT' | 'JOB_TITLE' | 'BRANCH';
    targetId: string;
    targetName: string;
    reason?: string;
    exceptionFrom?: Date;
    exceptionTo?: Date;
}

/**
 * DTO لتحديث استثناء
 */
export interface UpdatePolicyExceptionDto {
    reason?: string;
    exceptionFrom?: Date;
    exceptionTo?: Date;
    isActive?: boolean;
}

/**
 * نتيجة فحص الاستثناء
 */
export interface ExceptionCheckResult {
    isExcluded: boolean;
    exclusionReason?: string;
    exceptionId?: string;
    exceptionType?: string;
}

/**
 * خدمة إدارة استثناءات السياسات الذكية
 * Priority 3: Exception/Exclusion Lists
 * 
 * تتيح هذه الخدمة:
 * - استثناء موظفين/أقسام/فروع من سياسة معينة
 * - تحديد فترة الاستثناء (مؤقت أو دائم)
 * - التحقق السريع من الاستثناءات أثناء تنفيذ السياسة
 */
@Injectable()
export class PolicyExceptionService {
    private readonly logger = new Logger(PolicyExceptionService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * إنشاء استثناء جديد
     */
    async create(
        companyId: string,
        dto: CreatePolicyExceptionDto,
        createdBy: string,
        createdByName: string,
    ) {
        // التحقق من وجود السياسة
        const policy = await this.prisma.smartPolicy.findFirst({
            where: { id: dto.policyId, companyId },
        });

        if (!policy) {
            throw new NotFoundException('السياسة غير موجودة');
        }

        // التحقق من وجود الهدف (موظف/قسم/فرع)
        await this.validateTarget(dto.exceptionType, dto.targetId, companyId);

        // التحقق من عدم وجود استثناء مكرر
        const existing = await this.prisma.smartPolicyException.findUnique({
            where: {
                policyId_targetType_targetId: {
                    policyId: dto.policyId,
                    targetType: dto.exceptionType,
                    targetId: dto.targetId,
                },
            },
        });

        if (existing) {
            throw new BadRequestException('يوجد استثناء مسجل بالفعل لهذا الهدف');
        }

        const exception = await this.prisma.smartPolicyException.create({
            data: {
                policyId: dto.policyId,
                companyId,
                targetType: dto.exceptionType,
                targetId: dto.targetId,
                targetName: dto.targetName,
                reason: dto.reason,
                exceptionFrom: dto.exceptionFrom,
                exceptionTo: dto.exceptionTo,
                createdBy,
            },
        });

        this.logger.log(`Exception created: ${exception.id} for policy ${dto.policyId}`);
        return exception;
    }

    /**
     * تحديث استثناء
     */
    async update(exceptionId: string, dto: UpdatePolicyExceptionDto) {
        const existing = await this.prisma.smartPolicyException.findUnique({
            where: { id: exceptionId },
        });

        if (!existing) {
            throw new NotFoundException('الاستثناء غير موجود');
        }

        return this.prisma.smartPolicyException.update({
            where: { id: exceptionId },
            data: dto,
        });
    }

    /**
     * حذف استثناء
     */
    async delete(exceptionId: string) {
        const existing = await this.prisma.smartPolicyException.findUnique({
            where: { id: exceptionId },
        });

        if (!existing) {
            throw new NotFoundException('الاستثناء غير موجود');
        }

        await this.prisma.smartPolicyException.delete({
            where: { id: exceptionId },
        });

        this.logger.log(`Exception deleted: ${exceptionId}`);
        return { success: true };
    }

    /**
     * جلب جميع استثناءات سياسة معينة
     */
    async findByPolicy(policyId: string) {
        return this.prisma.smartPolicyException.findMany({
            where: { policyId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * جلب جميع استثناءات الشركة
     */
    async findByCompany(companyId: string, options?: { isActive?: boolean }) {
        return this.prisma.smartPolicyException.findMany({
            where: {
                companyId,
                ...(options?.isActive !== undefined && { isActive: options.isActive }),
            },
            include: {
                smartPolicy: {
                    select: { id: true, name: true, originalText: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * 🔥 التحقق السريع: هل الموظف مستثنى من السياسة؟
     * هذه الدالة هي الأهم - تُستخدم أثناء تنفيذ السياسة
     */
    async isEmployeeExcluded(
        policyId: string,
        employeeId: string,
        employeeData?: {
            departmentId?: string;
            branchId?: string;
            jobTitleId?: string;
        },
    ): Promise<ExceptionCheckResult> {
        const now = new Date();

        // جلب جميع الاستثناءات النشطة للسياسة
        const exceptions = await this.prisma.smartPolicyException.findMany({
            where: {
                policyId,
                isActive: true,
                OR: [
                    { exceptionFrom: null }, // بدون تاريخ بداية = دائم
                    { exceptionFrom: { lte: now } },
                ],
            },
        });

        // فلترة الاستثناءات المنتهية
        const activeExceptions = exceptions.filter(ex => {
            if (!ex.exceptionTo) return true; // بدون تاريخ نهاية = دائم
            return ex.exceptionTo >= now;
        });

        // التحقق من كل نوع استثناء بالترتيب
        for (const exception of activeExceptions) {
            let isMatch = false;

            switch (exception.targetType) {
                case 'EMPLOYEE':
                    isMatch = exception.targetId === employeeId;
                    break;

                case 'DEPARTMENT':
                    isMatch = employeeData?.departmentId === exception.targetId;
                    break;

                case 'BRANCH':
                    isMatch = employeeData?.branchId === exception.targetId;
                    break;

                case 'JOB_TITLE':
                    isMatch = employeeData?.jobTitleId === exception.targetId;
                    break;
            }

            if (isMatch) {
                return {
                    isExcluded: true,
                    exclusionReason: exception.reason || `مستثنى بسبب ${exception.targetType}: ${exception.targetName}`,
                    exceptionId: exception.id,
                    exceptionType: exception.targetType ?? undefined,
                };
            }
        }

        return { isExcluded: false };
    }

    /**
     * جلب الموظفين المستثنين من سياسة معينة
     */
    async getExcludedEmployees(policyId: string): Promise<string[]> {
        const exceptions = await this.prisma.smartPolicyException.findMany({
            where: {
                policyId,
                isActive: true,
                targetType: 'EMPLOYEE',
            },
            select: { targetId: true },
        });

        return exceptions.map(ex => ex.targetId);
    }

    /**
     * تفعيل/إلغاء تفعيل استثناء
     */
    async toggleActive(exceptionId: string, isActive: boolean) {
        return this.prisma.smartPolicyException.update({
            where: { id: exceptionId },
            data: { isActive },
        });
    }

    /**
     * نسخ استثناءات من سياسة لأخرى
     */
    async copyExceptions(
        sourcePolicyId: string,
        targetPolicyId: string,
        copiedBy: string,
        copiedByName: string,
    ) {
        const sourceExceptions = await this.findByPolicy(sourcePolicyId);

        const createdExceptions = [];
        for (const ex of sourceExceptions) {
            try {
                const newException = await this.prisma.smartPolicyException.create({
                    data: {
                        policyId: targetPolicyId,
                        companyId: ex.companyId,
                        targetType: ex.targetType,
                        targetId: ex.targetId,
                        targetName: ex.targetName,
                        reason: ex.reason ? `(منسوخ) ${ex.reason}` : '(منسوخ من سياسة أخرى)',
                        exceptionFrom: ex.exceptionFrom,
                        exceptionTo: ex.exceptionTo,
                        createdBy: copiedBy,
                        createdByName: copiedByName,
                    } as any,
                });
                createdExceptions.push(newException);
            } catch (error) {
                this.logger.warn(`Failed to copy exception ${ex.id}: ${error.message}`);
            }
        }

        return {
            copied: createdExceptions.length,
            total: sourceExceptions.length,
            exceptions: createdExceptions,
        };
    }

    /**
     * التحقق من صحة الهدف (موظف/قسم/فرع/درجة وظيفية)
     */
    private async validateTarget(
        exceptionType: string,
        targetId: string,
        companyId: string,
    ): Promise<void> {
        let exists = false;

        switch (exceptionType) {
            case 'EMPLOYEE':
                const employee = await this.prisma.user.findFirst({
                    where: { id: targetId, companyId },
                });
                exists = !!employee;
                break;

            case 'DEPARTMENT':
                const department = await this.prisma.department.findFirst({
                    where: { id: targetId, companyId },
                });
                exists = !!department;
                break;

            case 'BRANCH':
                const branch = await this.prisma.branch.findFirst({
                    where: { id: targetId, companyId },
                });
                exists = !!branch;
                break;

            case 'JOB_TITLE':
                const jobTitle = await this.prisma.jobTitle.findFirst({
                    where: { id: targetId, companyId },
                });
                exists = !!jobTitle;
                break;

            default:
                throw new BadRequestException(`نوع الاستثناء غير صالح: ${exceptionType}`);
        }

        if (!exists) {
            throw new NotFoundException(`الهدف غير موجود: ${exceptionType} - ${targetId}`);
        }
    }

    /**
     * إحصائيات الاستثناءات لسياسة معينة
     */
    async getExceptionStats(policyId: string) {
        const exceptions = await this.prisma.smartPolicyException.findMany({
            where: { policyId },
        });

        const stats = {
            total: exceptions.length,
            active: exceptions.filter(e => e.isActive).length,
            inactive: exceptions.filter(e => !e.isActive).length,
            byType: {
                EMPLOYEE: 0,
                DEPARTMENT: 0,
                BRANCH: 0,
                JOB_TITLE: 0,
            },
            permanent: 0,
            temporary: 0,
        };

        for (const ex of exceptions) {
            if (ex.isActive) {
                const exType = ex.targetType as keyof typeof stats.byType;
                stats.byType[exType] = (stats.byType[exType] || 0) + 1;

                if (ex.exceptionTo) {
                    stats.temporary++;
                } else {
                    stats.permanent++;
                }
            }
        }

        return stats;
    }
}
