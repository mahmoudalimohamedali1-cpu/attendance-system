import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'سجل التدقيق' })
  @ApiResponse({ status: 200, description: 'سجلات التدقيق' })
  async getAuditLogs(
    @Query('userId') userId?: string,
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.getAuditLogs({
      userId,
      entity,
      entityId,
      action,
      startDate,
      endDate,
      page,
      limit,
    });
  }

  @Get('suspicious')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'محاولات مشبوهة' })
  @ApiResponse({ status: 200, description: 'المحاولات المشبوهة' })
  async getSuspiciousAttempts(
    @Query('userId') userId?: string,
    @Query('attemptType') attemptType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.getSuspiciousAttempts({
      userId,
      attemptType,
      startDate,
      endDate,
      page,
      limit,
    });
  }
}

