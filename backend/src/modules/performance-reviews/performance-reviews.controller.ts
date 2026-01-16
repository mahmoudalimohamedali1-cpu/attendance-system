import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PerformanceReviewsService } from './performance-reviews.service';
import { AiGoalAssistantService } from './ai-goal-assistant.service';
import {
    CreateReviewCycleDto,
    UpdateReviewCycleDto,
    SubmitSelfReviewDto,
    SubmitManagerReviewDto,
    CalibrateReviewDto,
} from './dto';

interface RequestWithUser {
    user: {
        id: string;
        companyId: string;
    };
}

@Controller('performance-reviews')
@UseGuards(JwtAuthGuard)
export class PerformanceReviewsController {
    constructor(
        private readonly performanceReviewsService: PerformanceReviewsService,
        private readonly aiGoalAssistantService: AiGoalAssistantService,
    ) { }

    // ==================== Review Cycles ====================

    @Post('cycles')
    async createCycle(@Request() req: RequestWithUser, @Body() dto: CreateReviewCycleDto) {
        return this.performanceReviewsService.createCycle(req.user.companyId, dto);
    }

    @Get('cycles')
    async findAllCycles(@Request() req: RequestWithUser) {
        return this.performanceReviewsService.findAllCycles(req.user.companyId);
    }

    @Get('cycles/:id')
    async findCycleById(@Request() req: RequestWithUser, @Param('id') id: string) {
        return this.performanceReviewsService.findCycleById(req.user.companyId, id);
    }

    @Put('cycles/:id')
    async updateCycle(
        @Request() req: RequestWithUser,
        @Param('id') id: string,
        @Body() dto: UpdateReviewCycleDto,
    ) {
        return this.performanceReviewsService.updateCycle(req.user.companyId, id, dto);
    }

    @Post('cycles/:id/start')
    async startCycle(@Request() req: RequestWithUser, @Param('id') id: string) {
        return this.performanceReviewsService.startCycle(req.user.companyId, id);
    }

    @Delete('cycles/:id')
    async deleteCycle(@Request() req: RequestWithUser, @Param('id') id: string) {
        return this.performanceReviewsService.deleteCycle(req.user.companyId, id);
    }

    // ==================== Individual Reviews ====================

    @Get('reviews')
    async findAllReviews(@Request() req: RequestWithUser, @Query('cycleId') cycleId?: string) {
        return this.performanceReviewsService.findAllReviews(req.user.companyId, cycleId);
    }

    @Get('reviews/:id')
    async findReviewById(@Request() req: RequestWithUser, @Param('id') id: string) {
        return this.performanceReviewsService.findReviewById(req.user.companyId, id);
    }

    @Get('my-review/:cycleId')
    async getMyReview(@Request() req: RequestWithUser, @Param('cycleId') cycleId: string) {
        return this.performanceReviewsService.getMyReview(req.user.id, cycleId);
    }

    @Post('reviews/:id/self-review')
    async submitSelfReview(
        @Request() req: RequestWithUser,
        @Param('id') id: string,
        @Body() dto: SubmitSelfReviewDto,
    ) {
        return this.performanceReviewsService.submitSelfReview(id, req.user.id, dto);
    }

    @Post('reviews/:id/manager-review')
    async submitManagerReview(
        @Request() req: RequestWithUser,
        @Param('id') id: string,
        @Body() dto: SubmitManagerReviewDto,
    ) {
        return this.performanceReviewsService.submitManagerReview(id, req.user.id, dto);
    }

    @Post('reviews/:id/calibrate')
    async calibrateReview(
        @Request() req: RequestWithUser,
        @Param('id') id: string,
        @Body() dto: CalibrateReviewDto,
    ) {
        return this.performanceReviewsService.calibrateReview(id, req.user.id, dto);
    }

    @Post('reviews/:id/acknowledge')
    async acknowledgeReview(
        @Request() req: RequestWithUser,
        @Param('id') id: string,
        @Body() body: { disagree: boolean; reason?: string },
    ) {
        return this.performanceReviewsService.acknowledgeReview(
            id,
            req.user.id,
            body.disagree,
            body.reason,
        );
    }

    // ==================== 9-Box Grid ====================

    @Get('cycles/:id/nine-box-grid')
    async getNineBoxGrid(@Request() req: RequestWithUser, @Param('id') cycleId: string) {
        return this.performanceReviewsService.getNineBoxGrid(req.user.companyId, cycleId);
    }

    // ==================== Analytics ====================

    @Get('cycles/:id/analytics')
    async getCycleAnalytics(@Request() req: RequestWithUser, @Param('id') cycleId: string) {
        return this.performanceReviewsService.getCycleAnalytics(req.user.companyId, cycleId);
    }

    // ==================== AI Goal Assistant ====================

    @Post('ai/generate-goal')
    async generateGoal(@Request() req: RequestWithUser, @Body() body: { prompt: string; context?: string }) {
        return this.aiGoalAssistantService.generateGoal(body.prompt, body.context);
    }

    @Post('ai/generate-okr')
    async generateOKR(@Request() req: RequestWithUser, @Body() body: { objective: string; context?: string }) {
        return this.aiGoalAssistantService.generateOKR(body.objective, body.context);
    }
}
