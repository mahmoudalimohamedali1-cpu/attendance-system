import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Policy Versioning Service
 * يقوم بإنشاء نسخ (snapshots) من السياسات عند كل تعديل
 * ويتيح عرض تاريخ التغييرات والرجوع لنسخة سابقة
 */
@Injectable()
export class PolicyVersioningService {
    private readonly logger = new Logger(PolicyVersioningService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * إنشاء نسخة جديدة من السياسة
     * يتم استدعاؤها قبل أي تعديل على السياسة
     */
    async createVersion(
        policyId: string,
        userId: string,
        userName: string,
        changeReason?: string,
    ) {
        // 1. جلب السياسة الحالية
        const policy = await this.prisma.smartPolicy.findUnique({
            where: { id: policyId },
        });

        if (!policy) {
            throw new NotFoundException(`السياسة غير موجودة: ${policyId}`);
        }

        // 2. حساب رقم الإصدار الجديد
        const latestVersion = await this.prisma.smartPolicyVersion.findFirst({
            where: { policyId },
            orderBy: { version: 'desc' },
        });

        const newVersion = (latestVersion?.version || 0) + 1;

        // 3. إنشاء نسخة من الحالة الحالية
        const versionRecord = await this.prisma.smartPolicyVersion.create({
            data: {
                policyId,
                version: newVersion,
                originalText: policy.originalText,
                parsedRule: policy.parsedRule as any,
                conditions: policy.conditions as any,
                actions: policy.actions as any,
                changeReason,
                changedBy: userId,
                changedByName: userName,
            },
        });

        // 4. تحديث رقم الإصدار الحالي في السياسة
        await this.prisma.smartPolicy.update({
            where: { id: policyId },
            data: { currentVersion: newVersion },
        });

        this.logger.log(`تم إنشاء الإصدار ${newVersion} للسياسة ${policyId}`);

        return versionRecord;
    }

    /**
     * جلب تاريخ جميع الإصدارات لسياسة معينة
     */
    async getVersionHistory(policyId: string, options?: { page?: number; limit?: number }) {
        const page = options?.page || 1;
        const limit = options?.limit || 20;
        const skip = (page - 1) * limit;

        const [versions, total] = await Promise.all([
            this.prisma.smartPolicyVersion.findMany({
                where: { policyId },
                orderBy: { version: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.smartPolicyVersion.count({ where: { policyId } }),
        ]);

        return {
            data: versions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * جلب تفاصيل إصدار معين
     */
    async getVersion(policyId: string, version: number) {
        const versionRecord = await this.prisma.smartPolicyVersion.findUnique({
            where: {
                policyId_version: { policyId, version },
            },
        });

        if (!versionRecord) {
            throw new NotFoundException(`الإصدار ${version} غير موجود للسياسة ${policyId}`);
        }

        return versionRecord;
    }

    /**
     * الرجوع لإصدار سابق
     * يقوم بإنشاء نسخة جديدة من الإصدار المطلوب
     */
    async revertToVersion(
        policyId: string,
        version: number,
        userId: string,
        userName: string,
    ) {
        // 1. جلب الإصدار المطلوب
        const targetVersion = await this.getVersion(policyId, version);

        // 2. إنشاء نسخة من الحالة الحالية أولاً (للحفاظ على التاريخ)
        await this.createVersion(
            policyId,
            userId,
            userName,
            `استعادة الإصدار ${version}`,
        );

        // 3. تحديث السياسة بالبيانات القديمة
        const updatedPolicy = await this.prisma.smartPolicy.update({
            where: { id: policyId },
            data: {
                originalText: targetVersion.originalText,
                parsedRule: targetVersion.parsedRule as any,
                conditions: targetVersion.conditions as any,
                actions: targetVersion.actions as any,
            },
        });

        this.logger.log(`تم استعادة السياسة ${policyId} للإصدار ${version}`);

        return updatedPolicy;
    }

    /**
     * مقارنة إصدارين
     * يرجع الفروقات بين الإصدارين
     */
    async compareVersions(policyId: string, v1: number, v2: number) {
        const [version1, version2] = await Promise.all([
            this.getVersion(policyId, v1),
            this.getVersion(policyId, v2),
        ]);

        return {
            version1: {
                version: v1,
                originalText: version1.originalText,
                conditions: version1.conditions,
                actions: version1.actions,
                changedBy: version1.changedByName,
                createdAt: version1.createdAt,
            },
            version2: {
                version: v2,
                originalText: version2.originalText,
                conditions: version2.conditions,
                actions: version2.actions,
                changedBy: version2.changedByName,
                createdAt: version2.createdAt,
            },
            differences: {
                textChanged: version1.originalText !== version2.originalText,
                conditionsChanged: JSON.stringify(version1.conditions) !== JSON.stringify(version2.conditions),
                actionsChanged: JSON.stringify(version1.actions) !== JSON.stringify(version2.actions),
            },
        };
    }

    /**
     * حذف إصدارات قديمة (للتنظيف)
     * يحتفظ بآخر N إصدار فقط
     */
    async pruneOldVersions(policyId: string, keepCount: number = 10) {
        const versions = await this.prisma.smartPolicyVersion.findMany({
            where: { policyId },
            orderBy: { version: 'desc' },
            skip: keepCount,
            select: { id: true },
        });

        if (versions.length > 0) {
            await this.prisma.smartPolicyVersion.deleteMany({
                where: {
                    id: { in: versions.map(v => v.id) },
                },
            });

            this.logger.log(`تم حذف ${versions.length} إصدار قديم للسياسة ${policyId}`);
        }

        return { deleted: versions.length };
    }
}
