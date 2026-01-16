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
import { GoalsService } from './goals.service';
import { GoalType, GoalStatus } from '@prisma/client';

interface RequestWithUser {
    user: {
        id: string;
        companyId: string;
    };
}

@Controller('goals')
@UseGuards(JwtAuthGuard)
export class GoalsController {
    constructor(private readonly goalsService: GoalsService) { }

    // ==================== Goals CRUD ====================

    @Post()
    async create(@Request() req: RequestWithUser, @Body() dto: any) {
        return this.goalsService.create(req.user.companyId, req.user.id, dto);
    }

    @Get()
    async findAll(
        @Request() req: RequestWithUser,
        @Query('ownerId') ownerId?: string,
        @Query('type') type?: GoalType,
        @Query('status') status?: GoalStatus,
    ) {
        return this.goalsService.findAll(req.user.companyId, { ownerId, type, status });
    }

    @Get('my')
    async getMyGoals(@Request() req: RequestWithUser) {
        return this.goalsService.getMyGoals(req.user.companyId, req.user.id);
    }

    @Get('team')
    async getTeamGoals(@Request() req: RequestWithUser) {
        return this.goalsService.getTeamGoals(req.user.companyId, req.user.id);
    }

    @Get('company')
    async getCompanyGoals(@Request() req: RequestWithUser) {
        return this.goalsService.getCompanyGoals(req.user.companyId);
    }

    // ==================== Data Sources (Smart Goals @ Mentions) ====================

    @Get('data-sources/available')
    async getAvailableDataSources() {
        return this.goalsService.getAvailableDataSources();
    }

    @Post('sync-all')
    async syncAllAutoCalculatedGoals(@Request() req: RequestWithUser) {
        return this.goalsService.syncAllAutoCalculatedGoals(req.user.companyId);
    }

    @Get(':id')
    async findById(@Request() req: RequestWithUser, @Param('id') id: string) {
        return this.goalsService.findById(req.user.companyId, id);
    }

    @Put(':id')
    async update(@Request() req: RequestWithUser, @Param('id') id: string, @Body() dto: any) {
        return this.goalsService.update(req.user.companyId, id, dto);
    }

    @Delete(':id')
    async delete(@Request() req: RequestWithUser, @Param('id') id: string) {
        return this.goalsService.delete(req.user.companyId, id);
    }

    // ==================== Approval ====================

    @Post(':id/submit')
    async submitForApproval(@Request() req: RequestWithUser, @Param('id') id: string) {
        return this.goalsService.submitForApproval(req.user.companyId, id);
    }

    @Post(':id/approve')
    async approveGoal(@Request() req: RequestWithUser, @Param('id') id: string) {
        return this.goalsService.approveGoal(req.user.companyId, id, req.user.id);
    }

    @Post(':id/reject')
    async rejectGoal(
        @Request() req: RequestWithUser,
        @Param('id') id: string,
        @Body() body: { reason: string },
    ) {
        return this.goalsService.rejectGoal(req.user.companyId, id, body.reason);
    }

    // ==================== Check-ins ====================

    @Post(':id/check-in')
    async createCheckIn(
        @Request() req: RequestWithUser,
        @Param('id') id: string,
        @Body() dto: any,
    ) {
        return this.goalsService.createCheckIn(req.user.companyId, id, req.user.id, dto);
    }

    @Get(':id/check-ins')
    async getCheckIns(@Request() req: RequestWithUser, @Param('id') id: string) {
        return this.goalsService.getCheckIns(req.user.companyId, id);
    }

    // ==================== Key Results ====================

    @Post(':id/key-results')
    async addKeyResult(
        @Request() req: RequestWithUser,
        @Param('id') goalId: string,
        @Body() dto: any,
    ) {
        return this.goalsService.addKeyResult(req.user.companyId, goalId, dto);
    }

    @Put('key-results/:id')
    async updateKeyResult(@Param('id') id: string, @Body() dto: any) {
        return this.goalsService.updateKeyResult(id, dto);
    }

    @Delete('key-results/:id')
    async deleteKeyResult(@Param('id') id: string) {
        return this.goalsService.deleteKeyResult(id);
    }

    @Post('key-results/:id/check-in')
    async checkInKeyResult(
        @Request() req: RequestWithUser,
        @Param('id') id: string,
        @Body() dto: any,
    ) {
        return this.goalsService.checkInKeyResult(id, req.user.id, dto);
    }

    @Post(':id/sync')
    async syncGoalFromDataSource(
        @Request() req: RequestWithUser,
        @Param('id') id: string,
    ) {
        return this.goalsService.syncGoalFromDataSource(req.user.companyId, id);
    }
}
