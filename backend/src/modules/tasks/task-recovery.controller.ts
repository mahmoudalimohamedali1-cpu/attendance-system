import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    Body,
    UseGuards,
    Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TaskRecoveryService } from './task-recovery.service';

/**
 * Task Recovery Controller
 * يتعامل مع سلة المهملات واستعادة المهام المحذوفة
 */
@Controller('tasks/trash')
@UseGuards(JwtAuthGuard)
export class TaskRecoveryController {
    constructor(private readonly taskRecoveryService: TaskRecoveryService) { }

    /**
     * Get all deleted tasks (trash bin)
     * GET /tasks/trash
     */
    @Get()
    getDeletedTasks(@Request() req: any) {
        return this.taskRecoveryService.getDeletedTasks(req.user.companyId);
    }

    /**
     * Get trash statistics
     * GET /tasks/trash/stats
     */
    @Get('stats')
    getTrashStats(@Request() req: any) {
        return this.taskRecoveryService.getTrashStats(req.user.companyId);
    }

    /**
     * Soft delete a single task
     * POST /tasks/trash/:id
     */
    @Post(':id')
    softDeleteTask(@Request() req: any, @Param('id') id: string) {
        return this.taskRecoveryService.softDeleteTask(id, req.user.companyId, req.user.id);
    }

    /**
     * Restore a single deleted task
     * POST /tasks/trash/:id/restore
     */
    @Post(':id/restore')
    restoreDeletedTask(@Request() req: any, @Param('id') id: string) {
        return this.taskRecoveryService.restoreDeletedTask(id, req.user.companyId, req.user.id);
    }

    /**
     * Permanently delete a task (hard delete)
     * DELETE /tasks/trash/:id
     */
    @Delete(':id')
    hardDeleteTask(@Request() req: any, @Param('id') id: string) {
        return this.taskRecoveryService.hardDeleteTask(id, req.user.companyId, req.user.id);
    }

    /**
     * Bulk soft delete tasks
     * POST /tasks/trash/bulk-delete
     */
    @Post('bulk-delete')
    bulkSoftDeleteTasks(
        @Request() req: any,
        @Body() body: { taskIds: string[] },
    ) {
        return this.taskRecoveryService.bulkSoftDeleteTasks(
            req.user.companyId,
            req.user.id,
            body.taskIds,
        );
    }

    /**
     * Bulk restore deleted tasks
     * POST /tasks/trash/bulk-restore
     */
    @Post('bulk-restore')
    bulkRestoreDeletedTasks(
        @Request() req: any,
        @Body() body: { taskIds: string[] },
    ) {
        return this.taskRecoveryService.bulkRestoreDeletedTasks(
            req.user.companyId,
            req.user.id,
            body.taskIds,
        );
    }

    /**
     * Empty all trash (permanently delete all soft-deleted tasks)
     * DELETE /tasks/trash/empty
     */
    @Delete('empty')
    emptyTrash(@Request() req: any) {
        return this.taskRecoveryService.emptyTrash(req.user.companyId, req.user.id);
    }
}
