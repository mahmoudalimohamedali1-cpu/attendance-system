import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { SaudizationService } from './saudization.service';
import Redis from 'ioredis';

const CACHE_TTL = {
    WARNINGS: 300, // 5 minutes
};

// Warning severity levels
export enum WarningLevel {
    INFO = 'INFO',
    WARNING = 'WARNING',
    ERROR = 'ERROR',
    CRITICAL = 'CRITICAL',
}

// Warning types
export enum WarningType {
    CONTRACT_EXPIRING_SOON = 'CONTRACT_EXPIRING_SOON',
    CONTRACT_NOT_REGISTERED = 'CONTRACT_NOT_REGISTERED',
    CONTRACT_PENDING_TOO_LONG = 'CONTRACT_PENDING_TOO_LONG',
    SAUDIZATION_BELOW_THRESHOLD = 'SAUDIZATION_BELOW_THRESHOLD',
    CONTRACT_REJECTED = 'CONTRACT_REJECTED',
}

export interface ComplianceWarningDto {
    id: string;
    type: WarningType;
    severity: WarningLevel;
    title: string; // Arabic title
    message: string; // Arabic message
    affectedCount: number;
    affectedContracts?: string[]; // contract IDs
    actionRequired: string; // Arabic - what user should do
    metadata?: Record<string, any>; // additional context
    createdAt: Date;
}

@Injectable()
export class ComplianceWarningsService {
    private readonly logger = new Logger(ComplianceWarningsService.name);

    // Compliance thresholds (configurable)
    private readonly THRESHOLDS = {
        CONTRACT_EXPIRY_DAYS: 30, // warn 30 days before contract expires
        PENDING_AUTH_DAYS: 7, // warn if contract pending QIWA auth for more than 7 days
        SAUDIZATION_TARGET: 75, // 75% Saudization target
    };

    constructor(
        private readonly prisma: PrismaService,
        private readonly saudizationService: SaudizationService,
        @Inject('REDIS_CLIENT') private readonly redis: Redis,
    ) { }

    /**
     * Cache helper - get or set
     */
    private async cached<T>(key: string, ttl: number, factory: () => Promise<T>): Promise<T> {
        try {
            const cached = await this.redis.get(key);
            if (cached) {
                this.logger.debug(`Cache HIT: ${key}`);
                return JSON.parse(cached);
            }
        } catch (e) {
            this.logger.warn(`Cache read error: ${e}`);
        }

        const data = await factory();

        try {
            await this.redis.setex(key, ttl, JSON.stringify(data));
            this.logger.debug(`Cache SET: ${key} (TTL: ${ttl}s)`);
        } catch (e) {
            this.logger.warn(`Cache write error: ${e}`);
        }

        return data;
    }

    /**
     * Get all compliance warnings for a company (CACHED)
     */
    async getComplianceWarnings(companyId: string): Promise<ComplianceWarningDto[]> {
        const cacheKey = `compliance:warnings:${companyId}`;
        return this.cached(cacheKey, CACHE_TTL.WARNINGS, () =>
            this._getComplianceWarningsImpl(companyId)
        );
    }

    private async _getComplianceWarningsImpl(companyId: string): Promise<ComplianceWarningDto[]> {
        const warnings: ComplianceWarningDto[] = [];

        // 1. Check for contracts expiring soon without QIWA registration
        const expiringWarnings = await this.checkExpiringContractsWithoutQiwa(companyId);
        warnings.push(...expiringWarnings);

        // 2. Check for contracts not registered in QIWA
        const notRegisteredWarnings = await this.checkContractsNotRegistered(companyId);
        warnings.push(...notRegisteredWarnings);

        // 3. Check for contracts pending QIWA authentication for too long
        const pendingWarnings = await this.checkContractsPendingTooLong(companyId);
        warnings.push(...pendingWarnings);

        // 4. Check for rejected contracts
        const rejectedWarnings = await this.checkRejectedContracts(companyId);
        warnings.push(...rejectedWarnings);

        // 5. Check Saudization ratio below threshold
        const saudizationWarnings = await this.checkSaudizationCompliance(companyId);
        warnings.push(...saudizationWarnings);

        // Sort by severity (CRITICAL -> ERROR -> WARNING -> INFO)
        const severityOrder = {
            [WarningLevel.CRITICAL]: 0,
            [WarningLevel.ERROR]: 1,
            [WarningLevel.WARNING]: 2,
            [WarningLevel.INFO]: 3,
        };

        warnings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

        return warnings;
    }

    /**
     * Check for active contracts expiring soon without QIWA registration
     */
    private async checkExpiringContractsWithoutQiwa(companyId: string): Promise<ComplianceWarningDto[]> {
        const warnings: ComplianceWarningDto[] = [];

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + this.THRESHOLDS.CONTRACT_EXPIRY_DAYS);

        const expiringContracts = await this.prisma.contract.findMany({
            where: {
                user: { companyId },
                status: 'ACTIVE',
                endDate: {
                    lte: expiryDate,
                    gte: new Date(), // not yet expired
                },
                OR: [
                    { qiwaStatus: 'NOT_SUBMITTED' },
                    { qiwaStatus: { equals: null as any } },
                ],
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        if (expiringContracts.length > 0) {
            warnings.push({
                id: `warning-expiring-${Date.now()}`,
                type: WarningType.CONTRACT_EXPIRING_SOON,
                severity: WarningLevel.WARNING,
                title: 'عقود تنتهي قريباً بدون توثيق في قوى',
                message: `يوجد ${expiringContracts.length} عقد سينتهي خلال ${this.THRESHOLDS.CONTRACT_EXPIRY_DAYS} يوم ولم يتم توثيقه في منصة قوى`,
                affectedCount: expiringContracts.length,
                affectedContracts: expiringContracts.map(c => c.id),
                actionRequired: 'يجب توثيق العقود في منصة قوى قبل انتهائها',
                metadata: {
                    contracts: expiringContracts.map(c => ({
                        id: c.id,
                        contractNumber: c.contractNumber,
                        employeeName: `${c.user.firstName} ${c.user.lastName}`,
                        endDate: c.endDate,
                    })),
                },
                createdAt: new Date(),
            });
        }

        return warnings;
    }

    /**
     * Check for active contracts not registered in QIWA
     */
    private async checkContractsNotRegistered(companyId: string): Promise<ComplianceWarningDto[]> {
        const warnings: ComplianceWarningDto[] = [];

        const notRegisteredContracts = await this.prisma.contract.findMany({
            where: {
                user: { companyId },
                status: 'ACTIVE',
                OR: [
                    { qiwaStatus: 'NOT_SUBMITTED' },
                    { qiwaStatus: { equals: null as any } },
                ],
            },
            select: {
                id: true,
                contractNumber: true,
                startDate: true,
            },
        });

        if (notRegisteredContracts.length > 0) {
            warnings.push({
                id: `warning-not-registered-${Date.now()}`,
                type: WarningType.CONTRACT_NOT_REGISTERED,
                severity: WarningLevel.INFO,
                title: 'عقود لم يتم توثيقها في قوى',
                message: `يوجد ${notRegisteredContracts.length} عقد نشط لم يتم توثيقه في منصة قوى`,
                affectedCount: notRegisteredContracts.length,
                affectedContracts: notRegisteredContracts.map(c => c.id),
                actionRequired: 'قم بتوثيق العقود النشطة في منصة قوى',
                createdAt: new Date(),
            });
        }

        return warnings;
    }

    /**
     * Check for contracts pending QIWA authentication for too long
     */
    private async checkContractsPendingTooLong(companyId: string): Promise<ComplianceWarningDto[]> {
        const warnings: ComplianceWarningDto[] = [];

        const pendingDeadline = new Date();
        pendingDeadline.setDate(pendingDeadline.getDate() - this.THRESHOLDS.PENDING_AUTH_DAYS);

        const pendingContracts = await this.prisma.contract.findMany({
            where: {
                user: { companyId },
                status: 'ACTIVE',
                qiwaStatus: 'PENDING',
                updatedAt: {
                    lte: pendingDeadline,
                },
            },
            select: {
                id: true,
                contractNumber: true,
                updatedAt: true,
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        if (pendingContracts.length > 0) {
            warnings.push({
                id: `warning-pending-${Date.now()}`,
                type: WarningType.CONTRACT_PENDING_TOO_LONG,
                severity: WarningLevel.WARNING,
                title: 'عقود معلقة في قوى لفترة طويلة',
                message: `يوجد ${pendingContracts.length} عقد معلق في منصة قوى لأكثر من ${this.THRESHOLDS.PENDING_AUTH_DAYS} أيام`,
                affectedCount: pendingContracts.length,
                affectedContracts: pendingContracts.map(c => c.id),
                actionRequired: 'تحقق من حالة العقود في منصة قوى أو قم بإعادة التوثيق',
                metadata: {
                    contracts: pendingContracts.map(c => ({
                        id: c.id,
                        contractNumber: c.contractNumber,
                        employeeName: `${c.user.firstName} ${c.user.lastName}`,
                        daysPending: Math.floor((Date.now() - c.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
                    })),
                },
                createdAt: new Date(),
            });
        }

        return warnings;
    }

    /**
     * Check for rejected contracts
     */
    private async checkRejectedContracts(companyId: string): Promise<ComplianceWarningDto[]> {
        const warnings: ComplianceWarningDto[] = [];

        const rejectedContracts = await this.prisma.contract.findMany({
            where: {
                user: { companyId },
                qiwaStatus: 'REJECTED',
            },
            select: {
                id: true,
                contractNumber: true,
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        if (rejectedContracts.length > 0) {
            warnings.push({
                id: `warning-rejected-${Date.now()}`,
                type: WarningType.CONTRACT_REJECTED,
                severity: WarningLevel.ERROR,
                title: 'عقود مرفوضة من قوى',
                message: `يوجد ${rejectedContracts.length} عقد مرفوض من منصة قوى`,
                affectedCount: rejectedContracts.length,
                affectedContracts: rejectedContracts.map(c => c.id),
                actionRequired: 'راجع أسباب الرفض وقم بتصحيح البيانات وإعادة التوثيق',
                metadata: {
                    contracts: rejectedContracts.map(c => ({
                        id: c.id,
                        contractNumber: c.contractNumber,
                        employeeName: `${c.user.firstName} ${c.user.lastName}`,
                    })),
                },
                createdAt: new Date(),
            });
        }

        return warnings;
    }

    /**
     * Check Saudization ratio compliance
     */
    private async checkSaudizationCompliance(companyId: string): Promise<ComplianceWarningDto[]> {
        const warnings: ComplianceWarningDto[] = [];

        try {
            const saudizationRatio = await this.saudizationService.getCompanySaudizationRatio(
                companyId,
                this.THRESHOLDS.SAUDIZATION_TARGET
            );

            if (!saudizationRatio.isCompliant && saudizationRatio.totalEmployees > 0) {
                const deficitPercentage = this.THRESHOLDS.SAUDIZATION_TARGET - saudizationRatio.saudizationRatio;

                let severity: WarningLevel;
                if (deficitPercentage >= 20) {
                    severity = WarningLevel.CRITICAL;
                } else if (deficitPercentage >= 10) {
                    severity = WarningLevel.ERROR;
                } else {
                    severity = WarningLevel.WARNING;
                }

                warnings.push({
                    id: `warning-saudization-${Date.now()}`,
                    type: WarningType.SAUDIZATION_BELOW_THRESHOLD,
                    severity,
                    title: 'نسبة التوطين أقل من المطلوب',
                    message: `نسبة التوطين الحالية ${saudizationRatio.saudizationRatio.toFixed(2)}% أقل من النسبة المستهدفة ${this.THRESHOLDS.SAUDIZATION_TARGET}%. يجب توظيف ${saudizationRatio.deficitCount} موظف سعودي إضافي`,
                    affectedCount: saudizationRatio.deficitCount,
                    actionRequired: `قم بتوظيف ${saudizationRatio.deficitCount} موظف سعودي للوصول إلى النسبة المطلوبة`,
                    metadata: {
                        currentRatio: saudizationRatio.saudizationRatio,
                        targetRatio: this.THRESHOLDS.SAUDIZATION_TARGET,
                        totalEmployees: saudizationRatio.totalEmployees,
                        saudiEmployees: saudizationRatio.saudiEmployees,
                        deficitCount: saudizationRatio.deficitCount,
                    },
                    createdAt: new Date(),
                });
            }
        } catch (error) {
            this.logger.error(`Error checking Saudization compliance: ${error.message}`);
        }

        return warnings;
    }

    /**
     * Get warnings count by severity
     */
    async getWarningsCountBySeverity(companyId: string): Promise<Record<WarningLevel, number>> {
        const warnings = await this.getComplianceWarnings(companyId);

        const counts: Record<WarningLevel, number> = {
            [WarningLevel.CRITICAL]: 0,
            [WarningLevel.ERROR]: 0,
            [WarningLevel.WARNING]: 0,
            [WarningLevel.INFO]: 0,
        };

        warnings.forEach(warning => {
            counts[warning.severity]++;
        });

        return counts;
    }

    /**
     * Get warnings by type
     */
    async getWarningsByType(companyId: string, type: WarningType): Promise<ComplianceWarningDto[]> {
        const allWarnings = await this.getComplianceWarnings(companyId);
        return allWarnings.filter(w => w.type === type);
    }

    /**
     * Invalidate compliance warnings cache for a company
     */
    async invalidateCache(companyId: string): Promise<void> {
        try {
            const cacheKey = `compliance:warnings:${companyId}`;
            await this.redis.del(cacheKey);
            this.logger.debug(`Cache INVALIDATE: ${cacheKey}`);
        } catch (e) {
            this.logger.warn(`Cache invalidation error: ${e}`);
        }
    }
}
