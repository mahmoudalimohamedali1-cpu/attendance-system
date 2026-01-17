// @ts-nocheck
/**
 * Unified Performance Service
 * Integrates Goals/OKRs (70%) with KPIs (30%) for unified performance scoring
 * Following global best practices (Google, Microsoft model)
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface UnifiedScoreResult {
    employeeId: string;
    cycleId: string;
    goalsScore: number;
    goalsWeight: number;
    goalsContribution: number;
    kpiScore: number;
    kpiWeight: number;
    kpiContribution: number;
    unifiedScore: number;
    ratingBand: string;
    calculatedAt: Date;
}

export interface UnifiedSummary extends UnifiedScoreResult {
    employee: {
        id: string;
        firstName: string;
        lastName: string;
        employeeCode: string;
        department?: string;
    };
    goalsDetails: {
        totalGoals: number;
        completedGoals: number;
        inProgressGoals: number;
        averageProgress: number;
        keyResults: number;
    };
    kpiDetails: {
        totalAssignments: number;
        averageScore: number;
        exceeding: number;
        meeting: number;
        belowTarget: number;
    };
}

@Injectable()
export class UnifiedPerformanceService {
    private readonly logger = new Logger(UnifiedPerformanceService.name);

    // Weights for unified scoring (can be made configurable per company)
    private readonly GOALS_WEIGHT = 0.70; // 70%
    private readonly KPI_WEIGHT = 0.30;   // 30%

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Calculate unified performance score for an employee
     */
    async calculateUnifiedScore(employeeId: string, cycleId: string): Promise<UnifiedScoreResult> {
        const [goalsScore, kpiScore] = await Promise.all([
            this.getGoalsScore(employeeId, cycleId),
            this.getKPIScore(employeeId, cycleId),
        ]);

        const goalsContribution = goalsScore * this.GOALS_WEIGHT;
        const kpiContribution = kpiScore * this.KPI_WEIGHT;
        const unifiedScore = goalsContribution + kpiContribution;
        const ratingBand = this.getRatingBand(unifiedScore);

        // Log the calculated score (no direct update to PerformanceReview table)
        this.logger.log(`Unified Score for ${employeeId}: ${unifiedScore.toFixed(2)} (${ratingBand})`);

        return {
            employeeId,
            cycleId,
            goalsScore,
            goalsWeight: this.GOALS_WEIGHT,
            goalsContribution,
            kpiScore,
            kpiWeight: this.KPI_WEIGHT,
            kpiContribution,
            unifiedScore,
            ratingBand,
            calculatedAt: new Date(),
        };
    }

    /**
     * Get goals/OKR score for an employee (0-100)
     */
    async getGoalsScore(employeeId: string, cycleId: string): Promise<number> {
        // Get cycle date range
        const cycle = await this.prisma.performanceReviewCycle.findUnique({
            where: { id: cycleId },
            select: { companyId: true },
        });

        if (!cycle) return 0;

        // Get employee's goals
        const goals = await this.prisma.goal.findMany({
            where: {
                ownerId: employeeId,
                companyId: cycle.companyId,
            },
            select: {
                id: true,
                progress: true,
                weight: true,
                status: true,
            },
        });

        if (goals.length === 0) return 0;

        // Calculate weighted average progress
        let totalWeight = 0;
        let weightedProgress = 0;

        for (const goal of goals) {
            const weight = goal.weight || 1;
            const progress = goal.progress || 0;

            // Bonus for completed goals
            const completionBonus = goal.status === 'COMPLETED' ? 1.0 :
                goal.status === 'ON_TRACK' ? 0.9 : 0.8;

            weightedProgress += (progress * completionBonus * weight);
            totalWeight += weight;
        }

        return totalWeight > 0 ? Math.min(100, (weightedProgress / totalWeight)) : 0;
    }

    /**
     * Get KPI score for an employee (0-100)
     */
    async getKPIScore(employeeId: string, cycleId: string): Promise<number> {
        // Get cycle info
        const cycle = await this.prisma.performanceReviewCycle.findUnique({
            where: { id: cycleId },
            select: { id: true, companyId: true },
        });

        if (!cycle) return 0;

        // Get KPI assignments for this employee in this cycle
        const assignments = await this.prisma.kPIAssignment.findMany({
            where: {
                employeeId,
                cycleId,
            },
            select: {
                id: true,
                score: true,
                weight: true,
            },
        });

        if (assignments.length === 0) return 0;

        // Calculate weighted average KPI score
        let totalWeight = 0;
        let weightedScore = 0;

        for (const assignment of assignments) {
            const weight = Number(assignment.weight || 1);
            const score = Number(assignment.score || 0);

            weightedScore += (score * weight);
            totalWeight += weight;
        }

        return totalWeight > 0 ? Math.min(100, (weightedScore / totalWeight)) : 0;
    }

    /**
     * Get detailed unified performance summary
     */
    async getUnifiedSummary(employeeId: string, cycleId: string): Promise<UnifiedSummary> {
        const score = await this.calculateUnifiedScore(employeeId, cycleId);

        const cycle = await this.prisma.performanceReviewCycle.findUnique({
            where: { id: cycleId },
            select: { companyId: true },
        });

        if (!cycle) {
            throw new Error('Cycle not found');
        }

        // Get employee details
        const employee = await this.prisma.user.findUnique({
            where: { id: employeeId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
                department: { select: { name: true } },
            },
        });

        // Get goals details
        const goals = await this.prisma.goal.findMany({
            where: {
                ownerId: employeeId,
                companyId: cycle.companyId,
            },
            include: { keyResults: true },
        });

        const goalsDetails = {
            totalGoals: goals.length,
            completedGoals: goals.filter(g => g.status === 'COMPLETED').length,
            inProgressGoals: goals.filter(g => g.status === 'IN_PROGRESS').length,
            averageProgress: goals.length > 0
                ? goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goals.length
                : 0,
            keyResults: goals.reduce((sum, g) => sum + g.keyResults.length, 0),
        };

        // Get KPI details
        const kpiAssignments = await this.prisma.kPIAssignment.findMany({
            where: { employeeId, cycleId },
        });

        const kpiDetails = {
            totalAssignments: kpiAssignments.length,
            averageScore: kpiAssignments.length > 0
                ? kpiAssignments.reduce((sum, k) => sum + Number(k.score || 0), 0) / kpiAssignments.length
                : 0,
            exceeding: kpiAssignments.filter(k => Number(k.score || 0) >= 100).length,
            meeting: kpiAssignments.filter(k => Number(k.score || 0) >= 80 && Number(k.score || 0) < 100).length,
            belowTarget: kpiAssignments.filter(k => Number(k.score || 0) < 80).length,
        };

        return {
            ...score,
            employee: {
                id: employee?.id || employeeId,
                firstName: employee?.firstName || '',
                lastName: employee?.lastName || '',
                employeeCode: employee?.employeeCode || '',
                department: employee?.department?.name,
            },
            goalsDetails,
            kpiDetails,
        };
    }

    /**
     * Sync all unified scores for a cycle
     */
    async syncAllScores(cycleId: string): Promise<{ synced: number; errors: number }> {
        const reviews = await this.prisma.performanceReview.findMany({
            where: { cycleId },
            select: { employeeId: true },
        });

        let synced = 0;
        let errors = 0;

        for (const review of reviews) {
            try {
                await this.calculateUnifiedScore(review.employeeId, cycleId);
                synced++;
            } catch (error) {
                this.logger.error(`Failed to sync score for employee ${review.employeeId}:`, error);
                errors++;
            }
        }

        this.logger.log(`Synced ${synced} unified scores for cycle ${cycleId}, ${errors} errors`);
        return { synced, errors };
    }

    /**
     * Get department rankings for a cycle
     */
    async getDepartmentRankings(companyId: string, cycleId: string): Promise<any[]> {
        const reviews = await this.prisma.performanceReview.findMany({
            where: { cycleId },
            select: { employeeId: true },
        });

        // Group by department
        const deptScores: Record<string, { total: number; count: number; employees: any[] }> = {};

        for (const review of reviews) {
            // Get employee with department
            const employee = await this.prisma.user.findUnique({
                where: { id: review.employeeId },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    department: { select: { name: true } },
                },
            });

            const deptName = employee?.department?.name || 'غير محدد';

            if (!deptScores[deptName]) {
                deptScores[deptName] = { total: 0, count: 0, employees: [] };
            }

            // Calculate unified score for each employee
            const score = await this.calculateUnifiedScore(review.employeeId, cycleId);

            deptScores[deptName].total += score.unifiedScore;
            deptScores[deptName].count++;
            deptScores[deptName].employees.push({
                id: review.employeeId,
                name: `${employee?.firstName || ''} ${employee?.lastName || ''}`,
                score: score.unifiedScore,
            });
        }

        // Calculate averages and sort
        return Object.entries(deptScores)
            .map(([department, data]) => ({
                department,
                averageScore: data.count > 0 ? data.total / data.count : 0,
                employeeCount: data.count,
                topPerformer: data.employees.sort((a, b) => b.score - a.score)[0],
            }))
            .sort((a, b) => b.averageScore - a.averageScore);
    }

    /**
     * Get top performers for a cycle
     */
    async getTopPerformers(companyId: string, cycleId: string, limit: number = 10): Promise<UnifiedSummary[]> {
        const reviews = await this.prisma.performanceReview.findMany({
            where: { cycleId },
            select: { employeeId: true },
        });

        const summaries: UnifiedSummary[] = [];

        for (const review of reviews) {
            try {
                const summary = await this.getUnifiedSummary(review.employeeId, cycleId);
                summaries.push(summary);
            } catch (error) {
                // Skip employees with errors
            }
        }

        return summaries
            .sort((a, b) => b.unifiedScore - a.unifiedScore)
            .slice(0, limit);
    }

    /**
     * Get underperformers below threshold
     */
    async getUnderperformers(companyId: string, cycleId: string, threshold: number = 60): Promise<UnifiedSummary[]> {
        const reviews = await this.prisma.performanceReview.findMany({
            where: { cycleId },
            select: { employeeId: true },
        });

        const underperformers: UnifiedSummary[] = [];

        for (const review of reviews) {
            try {
                const summary = await this.getUnifiedSummary(review.employeeId, cycleId);
                if (summary.unifiedScore < threshold) {
                    underperformers.push(summary);
                }
            } catch (error) {
                // Skip
            }
        }

        return underperformers.sort((a, b) => a.unifiedScore - b.unifiedScore);
    }

    /**
     * Get full dashboard data for a cycle
     */
    async getDashboardData(companyId: string, cycleId: string) {
        const [rankings, topPerformers, underperformers, cycle] = await Promise.all([
            this.getDepartmentRankings(companyId, cycleId),
            this.getTopPerformers(companyId, cycleId, 5),
            this.getUnderperformers(companyId, cycleId, 60),
            this.prisma.performanceReviewCycle.findUnique({
                where: { id: cycleId },
                include: { _count: { select: { reviews: true } } },
            }),
        ]);

        // Calculate overall statistics
        const allReviews = await this.prisma.performanceReview.findMany({
            where: { cycleId },
            select: { employeeId: true },
        });

        let totalScore = 0;
        let scoredCount = 0;

        for (const review of allReviews) {
            try {
                const result = await this.calculateUnifiedScore(review.employeeId, cycleId);
                totalScore += result.unifiedScore;
                scoredCount++;
            } catch { }
        }

        return {
            cycle: {
                id: cycle?.id,
                name: cycle?.name,
                totalEmployees: cycle?._count?.reviews || 0,
            },
            statistics: {
                averageScore: scoredCount > 0 ? totalScore / scoredCount : 0,
                scoredEmployees: scoredCount,
                goalsWeight: this.GOALS_WEIGHT * 100,
                kpiWeight: this.KPI_WEIGHT * 100,
            },
            departmentRankings: rankings,
            topPerformers,
            underperformers,
        };
    }

    // ==================== Helper Methods ====================

    private getRatingBand(score: number): string {
        if (score >= 90) return 'ممتاز';
        if (score >= 80) return 'جيد جداً';
        if (score >= 70) return 'جيد';
        if (score >= 60) return 'مقبول';
        return 'يحتاج تحسين';
    }
}
