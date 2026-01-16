import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks & Integrations')
@Controller('webhooks')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WebhooksController {
    constructor(private readonly webhooksService: WebhooksService) { }

    @Get()
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '📋 قائمة الـ Webhooks' })
    getWebhooks(@Request() req: any) {
        return this.webhooksService.getWebhooks(req.user.companyId);
    }

    @Post()
    @Roles('ADMIN')
    @ApiOperation({ summary: '➕ إنشاء Webhook جديد' })
    createWebhook(
        @Request() req: any,
        @Body() body: { name: string; url: string; events: string[]; secret?: string },
    ) {
        return this.webhooksService.createWebhook(req.user.companyId, req.user.id, body);
    }

    @Get('events')
    @ApiOperation({ summary: '📚 الأحداث المتاحة' })
    getAvailableEvents() {
        return this.webhooksService.getAvailableEvents();
    }

    @Get(':id')
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '🔍 تفاصيل Webhook' })
    getWebhook(@Request() req: any, @Param('id') id: string) {
        return this.webhooksService.getWebhook(id, req.user.companyId);
    }

    @Patch(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: '✏️ تحديث Webhook' })
    updateWebhook(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { name?: string; url?: string; events?: string[]; isActive?: boolean },
    ) {
        return this.webhooksService.updateWebhook(id, req.user.companyId, body);
    }

    @Delete(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: '🗑️ حذف Webhook' })
    deleteWebhook(@Request() req: any, @Param('id') id: string) {
        return this.webhooksService.deleteWebhook(id, req.user.companyId);
    }

    @Post(':id/test')
    @Roles('ADMIN')
    @ApiOperation({ summary: '🧪 اختبار Webhook' })
    testWebhook(@Request() req: any, @Param('id') id: string) {
        return this.webhooksService.testWebhook(id, req.user.companyId);
    }

    @Get(':id/logs')
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '📊 سجلات Webhook' })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'offset', required: false })
    getWebhookLogs(
        @Request() req: any,
        @Param('id') id: string,
        @Query('limit') limit?: number,
        @Query('offset') offset?: number,
    ) {
        return this.webhooksService.getWebhookLogs(id, req.user.companyId, {
            limit: limit ? +limit : 50,
            offset: offset ? +offset : 0,
        });
    }
}
