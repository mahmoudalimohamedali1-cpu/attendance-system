import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import Redis from 'ioredis';

const CACHE_TTL = {
    RATIO: 300,        // 5 minutes
    BY_BRANCH: 300,    // 5 minutes
    BY_DEPARTMENT: 300, // 5 minutes
};

export interface SaudizationRatioDto {
    totalEmployees: number;
    saudiEmployees: number;
    nonSaudiEmployees: number;
    saudizationRatio: number; // percentage
    targetRatio: number; // percentage - Saudi law requirement
    isCompliant: boolean;
    deficitCount: number; // how many more Saudis needed to reach target
}

export interface SaudizationByBranchDto {
    branchId: string;
    branchName: string;
    totalEmployees: number;
    saudiEmployees: number;
    saudizationRatio: number;
    isCompliant: boolean;
}

export interface SaudizationByDepartmentDto {
    departmentId: string;
    departmentName: string;
    branchId: string;
    branchName: string;
    totalEmployees: number;
    saudiEmployees: number;
    saudizationRatio: number;
    isCompliant: boolean;
}

@Injectable()
export class SaudizationService {
    private readonly logger = new Logger(SaudizationService.name);

    // Saudi Labor Law requirement - can be made configurable per company
    private readonly DEFAULT_TARGET_RATIO = 75; // 75% Saudization for most sectors

    constructor(
        private readonly prisma: PrismaService,
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
     * Calculate overall company Saudization ratio (CACHED)
     */
    async getCompanySaudizationRatio(companyId: string, targetRatio?: number): Promise<SaudizationRatioDto> {
        const cacheKey = `saudization:company:${companyId}`;
        return this.cached(cacheKey, CACHE_TTL.RATIO, () =>
            this._getCompanySaudizationRatioImpl(companyId, targetRatio)
        );
    }

    private async _getCompanySaudizationRatioImpl(
        companyId: string,
        targetRatio?: number
    ): Promise<SaudizationRatioDto> {
        const target = targetRatio || this.DEFAULT_TARGET_RATIO;

        // Get all active employees with active contracts
        const employees = await this.prisma.user.findMany({
            where: {
                companyId,
                status: 'ACTIVE',
                contracts: {
                    some: {
                        status: 'ACTIVE'
                    }
                }
            },
            select: {
                isSaudi: true
            }
        });

        const totalEmployees = employees.length;
        const saudiEmployees = employees.filter(e => e.isSaudi).length;
        const nonSaudiEmployees = totalEmployees - saudiEmployees;

        const saudizationRatio = totalEmployees > 0
            ? (saudiEmployees / totalEmployees) * 100
            : 0;

        const isCompliant = saudizationRatio >= target;

        // Calculate how many more Saudis needed to reach target
        let deficitCount = 0;
        if (!isCompliant && totalEmployees > 0) {
            const requiredSaudis = Math.ceil((target / 100) * totalEmployees);
            deficitCount = Math.max(0, requiredSaudis - saudiEmployees);
        }

        return {
            totalEmployees,
            saudiEmployees,
            nonSaudiEmployees,
            saudizationRatio: Math.round(saudizationRatio * 100) / 100, // 2 decimal places
            targetRatio: target,
            isCompliant,
            deficitCount,
        };
    }

    /**
     * Calculate Saudization ratio by branch (CACHED)
     */
    async getSaudizationByBranch(companyId: string, targetRatio?: number): Promise<SaudizationByBranchDto[]> {
        const cacheKey = `saudization:by_branch:${companyId}`;
        return this.cached(cacheKey, CACHE_TTL.BY_BRANCH, () =>
            this._getSaudizationByBranchImpl(companyId, targetRatio)
        );
    }

    private async _getSaudizationByBranchImpl(
        companyId: string,
        targetRatio?: number
    ): Promise<SaudizationByBranchDto[]> {
        const target = targetRatio || this.DEFAULT_TARGET_RATIO;

        // Get all active branches
        const branches = await this.prisma.branch.findMany({
            where: {
                companyId,
                isActive: true
            },
            include: {
                users: {
                    where: {
                        status: 'ACTIVE',
                        contracts: {
                            some: {
                                status: 'ACTIVE'
                            }
                        }
                    },
                    select: {
                        isSaudi: true
                    }
                }
            }
        });

        return branches.map(branch => {
            const totalEmployees = branch.users.length;
            const saudiEmployees = branch.users.filter(u => u.isSaudi).length;
            const saudizationRatio = totalEmployees > 0
                ? (saudiEmployees / totalEmployees) * 100
                : 0;

            return {
                branchId: branch.id,
                branchName: branch.name,
                totalEmployees,
                saudiEmployees,
                saudizationRatio: Math.round(saudizationRatio * 100) / 100,
                isCompliant: saudizationRatio >= target,
            };
        });
    }

    /**
     * Calculate Saudization ratio by department (CACHED)
     */
    async getSaudizationByDepartment(
        companyId: string,
        branchId?: string,
        targetRatio?: number
    ): Promise<SaudizationByDepartmentDto[]> {
        const cacheKey = `saudization:by_department:${companyId}:${branchId || 'all'}`;
        return this.cached(cacheKey, CACHE_TTL.BY_DEPARTMENT, () =>
            this._getSaudizationByDepartmentImpl(companyId, branchId, targetRatio)
        );
    }

    private async _getSaudizationByDepartmentImpl(
        companyId: string,
        branchId?: string,
        targetRatio?: number
    ): Promise<SaudizationByDepartmentDto[]> {
        const target = targetRatio || this.DEFAULT_TARGET_RATIO;

        // Build where clause
        const where: any = {
            companyId,
        };

        if (branchId) {
            where.branchId = branchId;
        }

        // Get all departments
        const departments = await this.prisma.department.findMany({
            where,
            include: {
                branch: {
                    select: {
                        name: true
                    }
                },
                users: {
                    where: {
                        status: 'ACTIVE',
                        contracts: {
                            some: {
                                status: 'ACTIVE'
                            }
                        }
                    },
                    select: {
                        isSaudi: true
                    }
                }
            }
        });

        return departments.map(dept => {
            const totalEmployees = dept.users.length;
            const saudiEmployees = dept.users.filter(u => u.isSaudi).length;
            const saudizationRatio = totalEmployees > 0
                ? (saudiEmployees / totalEmployees) * 100
                : 0;

            return {
                departmentId: dept.id,
                departmentName: dept.name,
                branchId: dept.branchId,
                branchName: dept.branch.name,
                totalEmployees,
                saudiEmployees,
                saudizationRatio: Math.round(saudizationRatio * 100) / 100,
                isCompliant: saudizationRatio >= target,
            };
        });
    }

    /**
     * Get Saudization ratio for a specific branch (CACHED)
     */
    async getBranchSaudizationRatio(
        companyId: string,
        branchId: string,
        targetRatio?: number
    ): Promise<SaudizationRatioDto> {
        const cacheKey = `saudization:branch:${companyId}:${branchId}`;
        return this.cached(cacheKey, CACHE_TTL.RATIO, () =>
            this._getBranchSaudizationRatioImpl(companyId, branchId, targetRatio)
        );
    }

    private async _getBranchSaudizationRatioImpl(
        companyId: string,
        branchId: string,
        targetRatio?: number
    ): Promise<SaudizationRatioDto> {
        const target = targetRatio || this.DEFAULT_TARGET_RATIO;

        // Get all active employees in the branch with active contracts
        const employees = await this.prisma.user.findMany({
            where: {
                companyId,
                branchId,
                status: 'ACTIVE',
                contracts: {
                    some: {
                        status: 'ACTIVE'
                    }
                }
            },
            select: {
                isSaudi: true
            }
        });

        const totalEmployees = employees.length;
        const saudiEmployees = employees.filter(e => e.isSaudi).length;
        const nonSaudiEmployees = totalEmployees - saudiEmployees;

        const saudizationRatio = totalEmployees > 0
            ? (saudiEmployees / totalEmployees) * 100
            : 0;

        const isCompliant = saudizationRatio >= target;

        // Calculate how many more Saudis needed to reach target
        let deficitCount = 0;
        if (!isCompliant && totalEmployees > 0) {
            const requiredSaudis = Math.ceil((target / 100) * totalEmployees);
            deficitCount = Math.max(0, requiredSaudis - saudiEmployees);
        }

        return {
            totalEmployees,
            saudiEmployees,
            nonSaudiEmployees,
            saudizationRatio: Math.round(saudizationRatio * 100) / 100,
            targetRatio: target,
            isCompliant,
            deficitCount,
        };
    }

    /**
     * Get Saudization ratio for a specific department (CACHED)
     */
    async getDepartmentSaudizationRatio(
        companyId: string,
        departmentId: string,
        targetRatio?: number
    ): Promise<SaudizationRatioDto> {
        const cacheKey = `saudization:department:${companyId}:${departmentId}`;
        return this.cached(cacheKey, CACHE_TTL.RATIO, () =>
            this._getDepartmentSaudizationRatioImpl(companyId, departmentId, targetRatio)
        );
    }

    private async _getDepartmentSaudizationRatioImpl(
        companyId: string,
        departmentId: string,
        targetRatio?: number
    ): Promise<SaudizationRatioDto> {
        const target = targetRatio || this.DEFAULT_TARGET_RATIO;

        // Get all active employees in the department with active contracts
        const employees = await this.prisma.user.findMany({
            where: {
                companyId,
                departmentId,
                status: 'ACTIVE',
                contracts: {
                    some: {
                        status: 'ACTIVE'
                    }
                }
            },
            select: {
                isSaudi: true
            }
        });

        const totalEmployees = employees.length;
        const saudiEmployees = employees.filter(e => e.isSaudi).length;
        const nonSaudiEmployees = totalEmployees - saudiEmployees;

        const saudizationRatio = totalEmployees > 0
            ? (saudiEmployees / totalEmployees) * 100
            : 0;

        const isCompliant = saudizationRatio >= target;

        // Calculate how many more Saudis needed to reach target
        let deficitCount = 0;
        if (!isCompliant && totalEmployees > 0) {
            const requiredSaudis = Math.ceil((target / 100) * totalEmployees);
            deficitCount = Math.max(0, requiredSaudis - saudiEmployees);
        }

        return {
            totalEmployees,
            saudiEmployees,
            nonSaudiEmployees,
            saudizationRatio: Math.round(saudizationRatio * 100) / 100,
            targetRatio: target,
            isCompliant,
            deficitCount,
        };
    }

    /**
     * Invalidate all Saudization caches for a company
     * Useful when employee data changes
     */
    async invalidateCache(companyId: string): Promise<void> {
        try {
            const patterns = [
                `saudization:company:${companyId}`,
                `saudization:by_branch:${companyId}`,
                `saudization:by_department:${companyId}:*`,
                `saudization:branch:${companyId}:*`,
                `saudization:department:${companyId}:*`,
            ];

            for (const pattern of patterns) {
                if (pattern.includes('*')) {
                    // Use scan for wildcard patterns
                    const keys = await this.redis.keys(pattern);
                    if (keys.length > 0) {
                        await this.redis.del(...keys);
                        this.logger.debug(`Cache INVALIDATE: ${pattern} (${keys.length} keys)`);
                    }
                } else {
                    await this.redis.del(pattern);
                    this.logger.debug(`Cache INVALIDATE: ${pattern}`);
                }
            }
        } catch (e) {
            this.logger.warn(`Cache invalidation error: ${e}`);
        }
    }
}
