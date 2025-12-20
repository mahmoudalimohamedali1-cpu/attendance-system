import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { SmartNotificationService } from './smart-notification.service';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly smartNotificationService: SmartNotificationService,
  ) { }

  @Get()
  @ApiOperation({ summary: 'قائمة الإشعارات' })
  @ApiResponse({ status: 200, description: 'قائمة الإشعارات' })
  async getNotifications(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.getNotifications(
      userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'عدد الإشعارات غير المقروءة' })
  @ApiResponse({ status: 200, description: 'عدد الإشعارات' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'تعليم إشعار كمقروء' })
  @ApiResponse({ status: 200, description: 'تم التعليم' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'تعليم جميع الإشعارات كمقروءة' })
  @ApiResponse({ status: 200, description: 'تم التعليم' })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف إشعار' })
  @ApiResponse({ status: 200, description: 'تم الحذف' })
  async deleteNotification(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notificationsService.deleteNotification(id, userId);
  }

  // Admin endpoints
  @Post('broadcast')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'إرسال إشعار جماعي' })
  @ApiResponse({ status: 201, description: 'تم الإرسال' })
  async broadcastNotification(@Body() dto: BroadcastNotificationDto) {
    return this.notificationsService.broadcastNotification(
      dto.type,
      dto.title,
      dto.body,
      dto.userIds,
      dto.data,
    );
  }

  @Get('trigger-reminders')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'تشغيل التذكيرات يدوياً (للاختبار)' })
  @ApiResponse({ status: 200, description: 'تم تشغيل التذكيرات' })
  async triggerReminders() {
    return this.smartNotificationService.triggerReminderManually();
  }
}


