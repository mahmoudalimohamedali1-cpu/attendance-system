/**
 * Unified Performance Controller
 * REST API endpoints for unified performance scoring
 */

import {
    Controller,
    Get,
    Post,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UnifiedPerformanceService } from './unified-performance.service';

@Controller('unified-performance')
@UseGuards(JwtAuthGuard)
export class UnifiedPerformanceController {
    constructor(private readonly unifiedPerformanceService: UnifiedPerformanceService) { }

    /**
     * GET /unified-performance/score/:employeeId/:cycleId
     * Calculate and get unified performance score for an employee
     */
    @Get('score/:employeeId/:cycleId')
    async getUnifiedScore(
        @Param('employeeId') employeeId: string,
        @Param('cycleId') cycleId: string,
    ) {
        return this.unifiedPerformanceService.calculateUnifiedScore(employeeId, cycleId);
    }

    /**
     * GET /unified-performance/summary/:employeeId/:cycleId
     * Get detailed unified performance summary with breakdown
     */
    @Get('summary/:employeeId/:cycleId')
    async getUnifiedSummary(
        @Param('employeeId') employeeId: string,
        @Param('cycleId') cycleId: string,
    ) {
        return this.unifiedPerformanceService.getUnifiedSummary(employeeId, cycleId);
    }

    /**
     * POST /unified-performance/sync/:cycleId
     * Sync all unified scores for a performance review cycle
     */
    @Post('sync/:cycleId')
    async syncAllScores(@Param('cycleId') cycleId: string) {
        return this.unifiedPerformanceService.syncAllScores(cycleId);
    }

    /**
     * GET /unified-performance/rankings/:companyId/:cycleId
     * Get department rankings by unified score
     */
    @Get('rankings/:companyId/:cycleId')
    async getDepartmentRankings(
        @Param('companyId') companyId: string,
        @Param('cycleId') cycleId: string,
    ) {
        return this.unifiedPerformanceService.getDepartmentRankings(companyId, cycleId);
    }

    /**
     * GET /unified-performance/top-performers/:companyId/:cycleId
     * Get top performers by unified score
     */
    @Get('top-performers/:companyId/:cycleId')
    async getTopPerformers(
        @Param('companyId') companyId: string,
        @Param('cycleId') cycleId: string,
        @Query('limit') limit?: string,
    ) {
        return this.unifiedPerformanceService.getTopPerformers(
            companyId,
            cycleId,
            limit ? parseInt(limit, 10) : 10
        );
    }

    /**
     * GET /unified-performance/underperformers/:companyId/:cycleId
     * Get employees below performance threshold
     */
    @Get('underperformers/:companyId/:cycleId')
    async getUnderperformers(
        @Param('companyId') companyId: string,
        @Param('cycleId') cycleId: string,
        @Query('threshold') threshold?: string,
    ) {
        return this.unifiedPerformanceService.getUnderperformers(
            companyId,
            cycleId,
            threshold ? parseInt(threshold, 10) : 60
        );
    }

    /**
     * GET /unified-performance/dashboard/:companyId/:cycleId
     * Get full dashboard data including all metrics
     */
    @Get('dashboard/:companyId/:cycleId')
    async getDashboard(
        @Param('companyId') companyId: string,
        @Param('cycleId') cycleId: string,
    ) {
        return this.unifiedPerformanceService.getDashboardData(companyId, cycleId);
    }
}
