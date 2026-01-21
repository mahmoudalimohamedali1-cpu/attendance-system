import { Controller, Get, Post, Delete, Body, UseGuards, Request, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { OdooService } from './odoo.service';
import { ConnectOdooDto, TestOdooConnectionDto } from './dto/connect-odoo.dto';
import { SyncEmployeesDto, OdooEmployeeMappingDto } from './dto/odoo-employee.dto';
import { SyncAttendanceDto } from './dto/sync-attendance.dto';
import { OdooSyncLogService } from './logs/sync-log.service';
import { OdooRetryQueueService } from './queue/retry-queue.service';
import { OdooConflictResolverService } from './conflict/conflict-resolver.service';
import { OdooWebhookService } from './webhooks/odoo-webhook.service';
import { OdooFieldMappingService } from './mapping/field-mapping.service';

@ApiTags('Odoo Integration')
@Controller('integrations/odoo')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OdooController {
    constructor(
        private readonly odooService: OdooService,
        private readonly syncLogService: OdooSyncLogService,
        private readonly retryQueueService: OdooRetryQueueService,
        private readonly conflictResolver: OdooConflictResolverService,
        private readonly webhookService: OdooWebhookService,
        private readonly fieldMappingService: OdooFieldMappingService,
    ) { }


    // ============= CONNECTION =============

    @Get('status')
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '📊 حالة اتصال Odoo' })
    @ApiResponse({ status: 200, description: 'حالة الاتصال' })
    async getStatus(@Request() req: any) {
        return this.odooService.getStatus(req.user.companyId);
    }

    @Post('test')
    @Roles('ADMIN')
    @ApiOperation({ summary: '🧪 اختبار الاتصال بـ Odoo' })
    @ApiResponse({ status: 200, description: 'نتيجة الاختبار' })
    async testConnection(@Body() dto: TestOdooConnectionDto) {
        return this.odooService.testConnection(dto);
    }

    @Post('connect')
    @Roles('ADMIN')
    @ApiOperation({ summary: '🔗 ربط Odoo ERP' })
    @ApiResponse({ status: 200, description: 'تم الربط بنجاح' })
    async connect(@Request() req: any, @Body() dto: ConnectOdooDto) {
        return this.odooService.connect(req.user.companyId, req.user.id, dto);
    }

    @Delete('disconnect')
    @Roles('ADMIN')
    @ApiOperation({ summary: '🔌 فصل Odoo' })
    @ApiResponse({ status: 200, description: 'تم الفصل' })
    async disconnect(@Request() req: any) {
        return this.odooService.disconnect(req.user.companyId);
    }

    // ============= EMPLOYEES =============

    @Get('employees')
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '👥 جلب الموظفين من Odoo' })
    @ApiResponse({ status: 200, description: 'قائمة الموظفين' })
    async fetchEmployees(@Request() req: any, @Query() dto: SyncEmployeesDto) {
        return this.odooService.fetchEmployees(req.user.companyId, dto);
    }

    @Post('employees/sync')
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '🔄 مزامنة الموظفين من Odoo' })
    @ApiResponse({ status: 200, description: 'نتيجة المزامنة' })
    async syncEmployees(@Request() req: any, @Body() dto: SyncEmployeesDto) {
        return this.odooService.syncEmployees(req.user.companyId, dto);
    }

    @Post('employees/map')
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '🔗 ربط موظف محلي بموظف Odoo' })
    @ApiResponse({ status: 200, description: 'تم الربط' })
    async mapEmployee(@Request() req: any, @Body() dto: OdooEmployeeMappingDto) {
        return this.odooService.mapEmployee(req.user.companyId, dto.userId, dto.odooEmployeeId);
    }

    // ============= ATTENDANCE =============

    @Post('attendance/sync')
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '📤 مزامنة الحضور إلى Odoo' })
    @ApiResponse({ status: 200, description: 'نتيجة المزامنة' })
    async syncAttendance(@Request() req: any, @Body() dto: SyncAttendanceDto) {
        return this.odooService.syncAttendance(req.user.companyId, dto);
    }

    // ============= LEAVES =============

    @Get('leaves/types')
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '📋 أنواع الإجازات من Odoo' })
    @ApiResponse({ status: 200, description: 'قائمة أنواع الإجازات' })
    async fetchLeaveTypes(@Request() req: any) {
        return this.odooService.fetchLeaveTypes(req.user.companyId);
    }

    @Get('leaves')
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '📋 جلب الإجازات من Odoo' })
    @ApiResponse({ status: 200, description: 'قائمة الإجازات' })
    async fetchLeaves(
        @Request() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('state') state?: string,
    ) {
        return this.odooService.fetchLeaves(req.user.companyId, { startDate, endDate, state });
    }

    @Post('leaves/push')
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '📤 إرسال إجازة إلى Odoo' })
    @ApiResponse({ status: 200, description: 'تم الإرسال' })
    async pushLeave(@Request() req: any, @Body() dto: {
        odooEmployeeId: number;
        leaveTypeId: number;
        dateFrom: string;
        dateTo: string;
        notes?: string;
    }) {
        return this.odooService.pushLeave(req.user.companyId, dto);
    }

    // ============= PAYROLL =============

    @Post('payroll/export')
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '💰 تصدير بيانات الرواتب' })
    @ApiResponse({ status: 200, description: 'بيانات الرواتب' })
    async exportPayroll(@Request() req: any, @Body() dto: {
        periodStart: string;
        periodEnd: string;
        userIds?: string[];
    }) {
        return this.odooService.generatePayrollExport(
            req.user.companyId,
            new Date(dto.periodStart),
            new Date(dto.periodEnd),
            dto.userIds,
        );
    }

    @Post('payroll/push')
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '📤 إرسال بيانات الرواتب لـ Odoo' })
    @ApiResponse({ status: 200, description: 'تم الإرسال' })
    async pushPayroll(@Request() req: any, @Body() dto: { data: any[] }) {
        return this.odooService.pushPayrollToOdoo(req.user.companyId, dto.data);
    }

    // ============= SYNC LOGS =============

    @Get('logs')
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '📜 سجل المزامنة' })
    @ApiResponse({ status: 200, description: 'سجلات المزامنة' })
    async getSyncLogs(
        @Request() req: any,
        @Query('operation') operation?: string,
        @Query('status') status?: string,
        @Query('limit') limit?: number,
        @Query('offset') offset?: number,
    ) {
        return this.syncLogService.getLogs(req.user.companyId, {
            operation,
            status,
            limit: limit ? Number(limit) : 50,
            offset: offset ? Number(offset) : 0,
        });
    }

    @Get('logs/stats')
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '📊 إحصائيات المزامنة' })
    @ApiResponse({ status: 200, description: 'إحصائيات' })
    async getSyncStats(@Request() req: any, @Query('days') days?: number) {
        return this.syncLogService.getStats(req.user.companyId, days ? Number(days) : 7);
    }

    // ============= CONFLICTS =============

    @Get('conflicts')
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '⚠️ التعارضات غير المحلولة' })
    @ApiResponse({ status: 200, description: 'قائمة التعارضات' })
    async getConflicts(
        @Request() req: any,
        @Query('entityType') entityType?: string,
        @Query('limit') limit?: number,
    ) {
        return this.conflictResolver.getUnresolved(req.user.companyId, {
            entityType,
            limit: limit ? Number(limit) : 50,
        });
    }

    @Get('conflicts/stats')
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '📊 إحصائيات التعارضات' })
    @ApiResponse({ status: 200, description: 'إحصائيات' })
    async getConflictStats(@Request() req: any) {
        return this.conflictResolver.getStats(req.user.companyId);
    }

    @Post('conflicts/:id/resolve')
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '✅ حل تعارض' })
    @ApiResponse({ status: 200, description: 'تم الحل' })
    async resolveConflict(
        @Request() req: any,
        @Body() dto: { conflictId: string; resolution: string; notes?: string },
    ) {
        await this.conflictResolver.resolveManually(
            dto.conflictId,
            dto.resolution as any,
            req.user.id,
            dto.notes,
        );
        return { success: true, message: 'تم حل التعارض' };
    }

    // ============= WEBHOOKS =============

    @Get('webhooks')
    @Roles('ADMIN')
    @ApiOperation({ summary: '🔔 أحداث الويب هوك' })
    @ApiResponse({ status: 200, description: 'قائمة الأحداث' })
    async getWebhookEvents(
        @Request() req: any,
        @Query('direction') direction?: string,
        @Query('status') status?: string,
        @Query('limit') limit?: number,
    ) {
        return this.webhookService.getEvents(req.user.companyId, {
            direction,
            status,
            limit: limit ? Number(limit) : 50,
        });
    }

    @Post('webhooks/incoming')
    @ApiOperation({ summary: '📥 استقبال ويب هوك من Odoo' })
    async receiveWebhook(
        @Request() req: any,
        @Body() body: { companyId: string; eventType: string; payload: any },
    ) {
        const signature = req.headers['x-webhook-signature'] || '';
        return this.webhookService.processIncoming(
            body.companyId,
            body.eventType,
            body.payload,
            signature,
        );
    }

    @Post('webhooks/retry')
    @Roles('ADMIN')
    @ApiOperation({ summary: '🔄 إعادة إرسال الويب هوك الفاشلة' })
    async retryWebhooks(@Request() req: any) {
        const retried = await this.webhookService.retryFailed(req.user.companyId);
        return { success: true, retried };
    }

    // ============= FIELD MAPPINGS =============

    @Get('mappings')
    @Roles('ADMIN')
    @ApiOperation({ summary: '🔗 ربط الحقول' })
    @ApiResponse({ status: 200, description: 'قائمة الربط' })
    async getFieldMappings(@Request() req: any) {
        return this.fieldMappingService.getAllMappings(req.user.companyId);
    }

    @Post('mappings/initialize')
    @Roles('ADMIN')
    @ApiOperation({ summary: '🔧 تهيئة الربط الافتراضي' })
    async initializeMappings(@Request() req: any) {
        const created = await this.fieldMappingService.initializeDefaults(req.user.companyId);
        return { success: true, created };
    }

    @Post('mappings')
    @Roles('ADMIN')
    @ApiOperation({ summary: '➕ إضافة ربط جديد' })
    async createMapping(@Request() req: any, @Body() dto: any) {
        return this.fieldMappingService.createMapping(req.user.companyId, dto);
    }

    // ============= RETRY QUEUE =============

    @Get('queue/stats')
    @Roles('ADMIN')
    @ApiOperation({ summary: '📊 إحصائيات الطابور' })
    async getQueueStats(@Request() req: any) {
        return this.retryQueueService.getStats(req.user.companyId);
    }
}
