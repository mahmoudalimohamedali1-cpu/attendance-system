import {
    Controller,
    Get,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TaskPlanningService } from './task-planning.service';

/**
 * Task Planning Controller
 * التخطيط والتحليل للمهام
 */
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TaskPlanningController {
    constructor(private readonly taskPlanningService: TaskPlanningService) { }

    /**
     * Get timeline view
     * GET /tasks/timeline
     */
    @Get('timeline')
    getTimelineView(
        @Request() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('groupBy') groupBy?: 'assignee' | 'category' | 'priority' | 'status',
        @Query('zoom') zoom?: 'day' | 'week' | 'month',
    ) {
        return this.taskPlanningService.getTimelineView(req.user.companyId, {
            startDate,
            endDate,
            groupBy,
            zoom,
        });
    }

    /**
     * Get buffer/slack time analysis
     * GET /tasks/buffer-time
     */
    @Get('buffer-time')
    getBufferTime(
        @Request() req: any,
        @Query('taskId') taskId?: string,
    ) {
        return this.taskPlanningService.getBufferTime(req.user.companyId, taskId);
    }

    /**
     * Get critical path analysis
     * GET /tasks/critical-path
     */
    @Get('critical-path')
    getCriticalPath(
        @Request() req: any,
        @Query('projectId') projectId?: string,
    ) {
        return this.taskPlanningService.getCriticalPath(req.user.companyId, projectId);
    }
}
