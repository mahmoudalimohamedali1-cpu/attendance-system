import {
    Controller,
    Post,
    Get,
    Delete,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { BreaksService } from './breaks.service';
import { StartBreakDto, EndBreakDto } from '../dto/break.dto';

@Controller('breaks')
@UseGuards(JwtAuthGuard)
export class BreaksController {
    constructor(private readonly breaksService: BreaksService) { }

    /**
     * بدء استراحة جديدة
     * POST /breaks/start
     */
    @Post('start')
    async startBreak(
        @CurrentUser() user: any,
        @Body() dto: StartBreakDto,
    ) {
        return this.breaksService.startBreak(user.sub, user.companyId, dto);
    }

    /**
     * إنهاء استراحة نشطة
     * POST /breaks/:id/end
     */
    @Post(':id/end')
    async endBreak(
        @CurrentUser() user: any,
        @Param('id') breakId: string,
        @Body() dto?: EndBreakDto,
    ) {
        return this.breaksService.endBreak(user.sub, breakId, dto);
    }

    /**
     * الحصول على الاستراحة النشطة
     * GET /breaks/active
     */
    @Get('active')
    async getActiveBreak(@CurrentUser() user: any) {
        const activeBreak = await this.breaksService.getActiveBreak(user.sub);
        return {
            hasActiveBreak: !!activeBreak,
            break: activeBreak,
        };
    }

    /**
     * الحصول على استراحات سجل حضور معين
     * GET /breaks/attendance/:attendanceId
     */
    @Get('attendance/:attendanceId')
    async getBreaksByAttendance(
        @CurrentUser() user: any,
        @Param('attendanceId') attendanceId: string,
    ) {
        return this.breaksService.getBreaksByAttendance(attendanceId, user.sub);
    }

    /**
     * إلغاء استراحة نشطة
     * DELETE /breaks/:id
     */
    @Delete(':id')
    async cancelBreak(
        @CurrentUser() user: any,
        @Param('id') breakId: string,
    ) {
        return this.breaksService.cancelBreak(user.sub, breakId);
    }
}
