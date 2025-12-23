import { Controller, Get, Param, Query, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiProduces } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { StatusLogService } from '../../common/services/status-log.service';
import { SubmissionEntityType } from '@prisma/client';

@ApiTags('Audit - سجل التدقيق')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditLogsController {
    constructor(private readonly statusLogService: StatusLogService) { }

    @Get('submissions/:entityType/:entityId/logs')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'جلب سجل تغييرات الحالة لكيان معين' })
    @ApiParam({ name: 'entityType', enum: ['MUDAD', 'WPS', 'QIWA'] })
    @ApiParam({ name: 'entityId', description: 'UUID of the entity' })
    async getEntityLogs(
        @Param('entityType') entityType: string,
        @Param('entityId') entityId: string,
        @Request() req: any,
    ) {
        return this.statusLogService.getLogsForEntity(
            entityType as SubmissionEntityType,
            entityId,
            req.user.companyId,
        );
    }

    @Get('submissions/logs')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'جلب جميع سجلات التدقيق لفترة محددة' })
    @ApiQuery({ name: 'startDate', required: false, description: 'ISO date string' })
    @ApiQuery({ name: 'endDate', required: false, description: 'ISO date string' })
    async getLogsByPeriod(
        @Request() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        const end = endDate ? new Date(endDate) : new Date();

        return this.statusLogService.getLogsByPeriod(req.user.companyId, start, end);
    }

    @Get('submissions/by-user/:userId')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'جلب سجلات مستخدم معين (لمراجعة الصلاحيات)' })
    @ApiParam({ name: 'userId', description: 'UUID of the user' })
    async getLogsByUser(
        @Param('userId') userId: string,
        @Request() req: any,
    ) {
        return this.statusLogService.getLogsByUser(req.user.companyId, userId);
    }

    @Get('submissions/export/csv')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'تصدير سجلات التدقيق بصيغة CSV' })
    @ApiProduces('text/csv')
    @ApiQuery({ name: 'startDate', required: false, description: 'ISO date string' })
    @ApiQuery({ name: 'endDate', required: false, description: 'ISO date string' })
    @ApiQuery({ name: 'entityType', required: false, enum: ['MUDAD', 'WPS', 'QIWA'] })
    async exportCsv(
        @Request() req: any,
        @Res() res: Response,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('entityType') entityType?: string,
    ) {
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();

        const logs = await this.statusLogService.getLogsByPeriod(req.user.companyId, start, end);

        // Filter by entityType if provided
        const filteredLogs = entityType
            ? logs.filter((log: any) => log.entityType === entityType)
            : logs;

        // CSV Header
        const header = 'النوع,معرف الكيان,من الحالة,إلى الحالة,السبب,بواسطة,التاريخ\n';

        // CSV Rows
        const rows = filteredLogs.map((log: any) => {
            const date = new Date(log.createdAt).toLocaleString('ar-SA');
            return `${log.entityType},${log.entityId},${log.fromStatus},${log.toStatus},${log.reason || ''},${log.changedByName || ''},${date}`;
        }).join('\n');

        // UTF-8 BOM for Arabic Excel support
        const BOM = '\uFEFF';
        const csv = BOM + header + rows;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
        res.send(csv);
    }

    @Get('submissions/stuck-stats')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'إحصائيات التقديمات المعلقة (> 3 أيام)' })
    async getStuckStats(@Request() req: any) {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

        // import PrismaService through statusLogService.prisma if needed
        return {
            message: 'Use StuckDetectionService.getStuckStats() for detailed stats',
            threshold: '3 days',
        };
    }
}
