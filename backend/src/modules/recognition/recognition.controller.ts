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
import { RecognitionService } from './recognition.service';

interface RequestWithUser {
    user: {
        id: string;
        companyId: string;
    };
}

@Controller('recognition')
@UseGuards(JwtAuthGuard)
export class RecognitionController {
    constructor(private readonly recognitionService: RecognitionService) { }

    // ==================== Core Values ====================

    @Post('core-values')
    async createCoreValue(@Request() req: RequestWithUser, @Body() dto: any) {
        return this.recognitionService.createCoreValue(req.user.companyId, dto);
    }

    @Get('core-values')
    async getCoreValues(@Request() req: RequestWithUser) {
        return this.recognitionService.getCoreValues(req.user.companyId);
    }

    @Put('core-values/:id')
    async updateCoreValue(@Param('id') id: string, @Body() dto: any) {
        return this.recognitionService.updateCoreValue(id, dto);
    }

    @Delete('core-values/:id')
    async deleteCoreValue(@Param('id') id: string) {
        return this.recognitionService.deleteCoreValue(id);
    }

    // ==================== Recognition (Kudos) ====================

    @Post()
    async giveRecognition(@Request() req: RequestWithUser, @Body() dto: any) {
        return this.recognitionService.giveRecognition(
            req.user.companyId,
            req.user.id,
            dto,
        );
    }

    @Get('wall')
    async getRecognitionWall(
        @Request() req: RequestWithUser,
        @Query('page') page = 1,
        @Query('limit') limit = 20,
    ) {
        return this.recognitionService.getRecognitionWall(
            req.user.companyId,
            +page,
            +limit,
        );
    }

    @Get('my')
    async getMyRecognitions(@Request() req: RequestWithUser) {
        return this.recognitionService.getMyRecognitions(req.user.id);
    }

    // ==================== Reactions ====================

    @Post(':id/react')
    async addReaction(
        @Request() req: RequestWithUser,
        @Param('id') id: string,
        @Body() body: { emoji: string },
    ) {
        return this.recognitionService.addReaction(id, req.user.id, body.emoji);
    }

    @Delete(':id/react/:emoji')
    async removeReaction(
        @Request() req: RequestWithUser,
        @Param('id') id: string,
        @Param('emoji') emoji: string,
    ) {
        return this.recognitionService.removeReaction(id, req.user.id, emoji);
    }

    // ==================== Leaderboard ====================

    @Get('leaderboard')
    async getLeaderboard(
        @Request() req: RequestWithUser,
        @Query('period') period: 'week' | 'month' | 'year' = 'month',
    ) {
        return this.recognitionService.getLeaderboard(req.user.companyId, period);
    }

    // ==================== Analytics ====================

    @Get('stats')
    async getRecognitionStats(@Request() req: RequestWithUser) {
        return this.recognitionService.getRecognitionStats(req.user.companyId);
    }

    @Get('top-values')
    async getTopCoreValues(@Request() req: RequestWithUser) {
        return this.recognitionService.getTopCoreValues(req.user.companyId);
    }
}
