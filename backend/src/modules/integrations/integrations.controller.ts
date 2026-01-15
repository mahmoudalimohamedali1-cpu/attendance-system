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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
  ) { }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'قائمة التكاملات المتاحة' })
  @ApiResponse({ status: 200, description: 'التكاملات المتاحة' })
  async getAvailableIntegrations(@CurrentUser('companyId') companyId: string) {
    return this.integrationsService.getAvailableIntegrations(companyId);
  }

  @Get('installed')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'قائمة التكاملات المثبتة' })
  @ApiResponse({ status: 200, description: 'التكاملات المثبتة' })
  async getInstalledIntegrations(@CurrentUser('companyId') companyId: string) {
    return this.integrationsService.getInstalledIntegrations(companyId);
  }

  @Get(':integrationId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'تفاصيل تكامل محدد' })
  @ApiResponse({ status: 200, description: 'تفاصيل التكامل' })
  async getIntegrationDetails(
    @Param('integrationId') integrationId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.integrationsService.getIntegrationDetails(integrationId, companyId);
  }

  @Post(':integrationId/install')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'تثبيت تكامل' })
  @ApiResponse({ status: 201, description: 'تم تثبيت التكامل' })
  async installIntegration(
    @Param('integrationId') integrationId: string,
    @Body() body: { config?: Record<string, any> },
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.integrationsService.installIntegration(
      integrationId,
      companyId,
      userId,
      body.config,
    );
  }

  @Patch(':integrationId/configure')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'تعديل إعدادات التكامل' })
  @ApiResponse({ status: 200, description: 'تم تعديل الإعدادات' })
  async configureIntegration(
    @Param('integrationId') integrationId: string,
    @Body() body: { config: Record<string, any> },
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.integrationsService.configureIntegration(
      integrationId,
      companyId,
      userId,
      body.config,
    );
  }

  @Patch(':id/toggle')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'تفعيل/تعطيل التكامل' })
  @ApiResponse({ status: 200, description: 'تم تغيير حالة التكامل' })
  async toggleIntegration(
    @Param('id') id: string,
    @Body() body: { enabled: boolean },
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.integrationsService.toggleIntegration(
      id,
      companyId,
      userId,
      body.enabled,
    );
  }

  @Delete(':integrationId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'إلغاء تثبيت التكامل' })
  @ApiResponse({ status: 200, description: 'تم إلغاء التثبيت' })
  async uninstallIntegration(
    @Param('integrationId') integrationId: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.integrationsService.uninstallIntegration(
      integrationId,
      companyId,
      userId,
    );
  }

  @Get(':integrationId/logs')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'سجل نشاط التكامل' })
  @ApiResponse({ status: 200, description: 'سجل النشاط' })
  async getIntegrationLogs(
    @Param('integrationId') integrationId: string,
    @CurrentUser('companyId') companyId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.integrationsService.getIntegrationLogs(
      integrationId,
      companyId,
      limit,
      offset,
    );
  }
}
