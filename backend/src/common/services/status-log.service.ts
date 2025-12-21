import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SubmissionEntityType } from '@prisma/client';

interface LogStatusChangeDto {
    entityType: SubmissionEntityType;
    entityId: string;
    fromStatus: string | null;
    toStatus: string;
    reason?: string;
    externalRef?: string;
    meta?: any;
}

@Injectable()
export class StatusLogService {
    constructor(private prisma: PrismaService) { }

    /**
     * تسجيل تغيير الحالة في سجل التدقيق
     */
    async logStatusChange(dto: LogStatusChangeDto, companyId: string, userId: string) {
        return this.prisma.submissionStatusLog.create({
            data: {
                companyId,
                entityType: dto.entityType,
                entityId: dto.entityId,
                fromStatus: dto.fromStatus,
                toStatus: dto.toStatus,
                changedByUserId: userId,
                reason: dto.reason,
                externalRef: dto.externalRef,
                meta: dto.meta,
            },
        });
    }

    /**
     * جلب سجل تغييرات الحالة لكيان معين
     */
    async getLogsForEntity(entityType: SubmissionEntityType, entityId: string, companyId: string) {
        return this.prisma.submissionStatusLog.findMany({
            where: {
                companyId,
                entityType,
                entityId,
            },
            orderBy: { changedAt: 'desc' },
        });
    }

    /**
     * جلب آخر تغيير لكيان معين
     */
    async getLatestLog(entityType: SubmissionEntityType, entityId: string, companyId: string) {
        return this.prisma.submissionStatusLog.findFirst({
            where: {
                companyId,
                entityType,
                entityId,
            },
            orderBy: { changedAt: 'desc' },
        });
    }

    /**
     * جلب جميع التغييرات لفترة معينة (للتدقيق)
     */
    async getLogsByPeriod(companyId: string, startDate: Date, endDate: Date) {
        return this.prisma.submissionStatusLog.findMany({
            where: {
                companyId,
                changedAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: { changedAt: 'desc' },
        });
    }

    /**
     * جلب تغييرات مستخدم معين (لمراجعة الصلاحيات)
     */
    async getLogsByUser(companyId: string, userId: string) {
        return this.prisma.submissionStatusLog.findMany({
            where: {
                companyId,
                changedByUserId: userId,
            },
            orderBy: { changedAt: 'desc' },
        });
    }
}
