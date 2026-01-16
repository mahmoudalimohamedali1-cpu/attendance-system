import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NitaqatCalculatorService } from './services/nitaqat-calculator.service';

@Injectable()
export class SaudizationService {
    private readonly logger = new Logger(SaudizationService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly nitaqatCalculator: NitaqatCalculatorService,
    ) { }

    /**
     * Get saudization statistics for a company
     */
    async getStatistics(companyId: string) {
        try {
            const employees = await this.prisma.user.findMany({
                where: {
                    companyId,
                    status: 'ACTIVE',
                    role: 'EMPLOYEE',
                },
                select: {
                    id: true,
                    isSaudi: true,
                    departmentId: true,
                },
            });

            const totalEmployees = employees.length;
            const saudiEmployees = employees.filter(e => e.isSaudi).length;
            const nonSaudiEmployees = totalEmployees - saudiEmployees;
            const saudizationRate = totalEmployees > 0 ? (saudiEmployees / totalEmployees) * 100 : 0;

            // Calculate Nitaqat band
            const nitaqatResult = await this.nitaqatCalculator.calculateNitaqatBand(
                companyId,
                totalEmployees,
                saudiEmployees,
            );

            // Calculate by department
            const departmentStats = await this.getDepartmentStatistics(companyId, employees);

            return {
                totalEmployees,
                saudiEmployees,
                nonSaudiEmployees,
                saudizationRate: Math.round(saudizationRate * 100) / 100,
                nitaqatBand: nitaqatResult.band,
                nitaqatColor: nitaqatResult.color,
                targetRate: nitaqatResult.targetRate,
                gapToTarget: nitaqatResult.gapToTarget,
                departmentStats,
            };
        } catch (error) {
            this.logger.error(`Error getting saudization statistics: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get department-level statistics
     */
    private async getDepartmentStatistics(companyId: string, employees: any[]) {
        const departments = await this.prisma.department.findMany({
            where: { companyId },
            select: { id: true, name: true },
        });

        return departments.map(dept => {
            const deptEmployees = employees.filter(e => e.departmentId === dept.id);
            const total = deptEmployees.length;
            const saudi = deptEmployees.filter(e => e.isSaudi).length;

            return {
                departmentId: dept.id,
                departmentName: dept.name,
                totalEmployees: total,
                saudiEmployees: saudi,
                nonSaudiEmployees: total - saudi,
                saudizationRate: total > 0 ? Math.round((saudi / total) * 10000) / 100 : 0,
            };
        });
    }

    /**
     * Get saudization trend over time
     */
    async getTrend(companyId: string, months: number = 12) {
        const trend: any[] = [];
        const now = new Date();

        for (let i = months - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

            // Get employee count at that point
            const employees = await this.prisma.user.count({
                where: {
                    companyId,
                    role: 'EMPLOYEE',
                    createdAt: { lte: endDate },
                    OR: [
                        { status: 'ACTIVE' },
                        { updatedAt: { gte: endDate } },
                    ],
                },
            });

            const saudiEmployees = await this.prisma.user.count({
                where: {
                    companyId,
                    role: 'EMPLOYEE',
                    isSaudi: true,
                    createdAt: { lte: endDate },
                    OR: [
                        { status: 'ACTIVE' },
                        { updatedAt: { gte: endDate } },
                    ],
                },
            });

            trend.push({
                month: date.toISOString().substring(0, 7),
                totalEmployees: employees,
                saudiEmployees,
                saudizationRate: employees > 0 ? Math.round((saudiEmployees / employees) * 10000) / 100 : 0,
            });
        }

        return trend;
    }

    /**
     * Get compliance status
     */
    async getComplianceStatus(companyId: string) {
        const stats = await this.getStatistics(companyId);

        return {
            isCompliant: stats.nitaqatColor !== 'RED',
            currentBand: stats.nitaqatBand,
            currentColor: stats.nitaqatColor,
            currentRate: stats.saudizationRate,
            requiredRate: stats.targetRate,
            gap: stats.gapToTarget,
            recommendations: await this.getRecommendations(companyId, stats),
        };
    }

    /**
     * Get recommendations for improving saudization
     */
    private async getRecommendations(companyId: string, stats: any) {
        const recommendations: string[] = [];

        if (stats.gapToTarget > 0) {
            const neededSaudis = Math.ceil(
                (stats.targetRate * stats.totalEmployees / 100) - stats.saudiEmployees
            );
            recommendations.push(`توظيف ${neededSaudis} موظف سعودي إضافي للوصول للمستوى المطلوب`);
        }

        if (stats.nitaqatColor === 'RED') {
            recommendations.push('تحسين معدل السعودة بشكل عاجل لتجنب العقوبات');
            recommendations.push('مراجعة خطة التوظيف وإعطاء الأولوية للمرشحين السعوديين');
        }

        if (stats.saudizationRate < 20) {
            recommendations.push('النظر في برامج تأهيل وتدريب للكوادر السعودية');
        }

        return recommendations;
    }
}
