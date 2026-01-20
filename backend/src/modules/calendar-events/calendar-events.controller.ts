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
  ApiQuery,
} from '@nestjs/swagger';
import { CalendarEventsService } from './calendar-events.service';
import { CreateEventDto, UpdateEventDto, RSVPEventDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { EventStatus } from '@prisma/client';

@ApiTags('calendar-events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('calendar-events')
export class CalendarEventsController {
  constructor(private readonly calendarEventsService: CalendarEventsService) {}

  // ==================== قراءة الأحداث ====================

  @Get()
  @ApiOperation({ summary: 'جلب الأحداث ضمن نطاق زمني' })
  @ApiResponse({ status: 200, description: 'قائمة الأحداث' })
  @ApiQuery({ name: 'startDate', required: false, description: 'تاريخ البداية (ISO)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'تاريخ النهاية (ISO)' })
  @ApiQuery({ name: 'eventType', required: false, description: 'نوع الحدث' })
  @ApiQuery({ name: 'status', required: false, description: 'حالة الحدث' })
  @ApiQuery({ name: 'limit', required: false, description: 'عدد النتائج' })
  @ApiQuery({ name: 'offset', required: false, description: 'بداية النتائج' })
  async getEvents(
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('eventType') eventType?: string,
    @Query('status') status?: EventStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.calendarEventsService.getEvents(userId, companyId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      eventType,
      status,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'جلب الأحداث القادمة (للويدجت)' })
  @ApiResponse({ status: 200, description: 'قائمة الأحداث القادمة' })
  @ApiQuery({ name: 'days', required: false, description: 'عدد الأيام القادمة (افتراضي: 7)' })
  async getUpcomingEvents(
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Query('days') days?: string,
  ) {
    return this.calendarEventsService.getUpcomingEvents(
      userId,
      companyId,
      days ? parseInt(days) : 7,
    );
  }

  @Get('my')
  @ApiOperation({ summary: 'جلب أحداث المستخدم (التي أنشأها أو مدعو إليها)' })
  @ApiResponse({ status: 200, description: 'قائمة أحداث المستخدم' })
  @ApiQuery({ name: 'startDate', required: false, description: 'تاريخ البداية (ISO)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'تاريخ النهاية (ISO)' })
  @ApiQuery({ name: 'limit', required: false, description: 'عدد النتائج' })
  @ApiQuery({ name: 'offset', required: false, description: 'بداية النتائج' })
  async getMyEvents(
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.calendarEventsService.getMyEvents(userId, companyId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : 20,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  @Get('search')
  @ApiOperation({ summary: 'البحث في الأحداث' })
  @ApiResponse({ status: 200, description: 'نتائج البحث' })
  @ApiQuery({ name: 'q', required: true, description: 'كلمة البحث' })
  @ApiQuery({ name: 'limit', required: false, description: 'عدد النتائج' })
  @ApiQuery({ name: 'offset', required: false, description: 'بداية النتائج' })
  async searchEvents(
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Query('q') query: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.calendarEventsService.searchEvents(userId, companyId, query, {
      limit: limit ? parseInt(limit) : 20,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  @Get('stats')
  @Roles('ADMIN', 'HR')
  @ApiOperation({ summary: 'جلب إحصائيات الأحداث (للإدارة)' })
  @ApiResponse({ status: 200, description: 'إحصائيات الأحداث' })
  @ApiQuery({ name: 'startDate', required: true, description: 'تاريخ البداية (ISO)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'تاريخ النهاية (ISO)' })
  async getEventsStats(
    @CurrentUser('companyId') companyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.calendarEventsService.getEventsStats(
      companyId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'جلب تفاصيل حدث معين' })
  @ApiResponse({ status: 200, description: 'تفاصيل الحدث' })
  @ApiResponse({ status: 404, description: 'الحدث غير موجود' })
  async getEvent(
    @Param('id') eventId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.calendarEventsService.getEvent(eventId, userId, companyId);
  }

  @Get(':id/attendees')
  @ApiOperation({ summary: 'جلب قائمة الحضور لحدث معين' })
  @ApiResponse({ status: 200, description: 'قائمة الحضور' })
  @ApiResponse({ status: 404, description: 'الحدث غير موجود' })
  @ApiQuery({ name: 'status', required: false, description: 'فلترة بحالة RSVP' })
  @ApiQuery({ name: 'limit', required: false, description: 'عدد النتائج' })
  @ApiQuery({ name: 'offset', required: false, description: 'بداية النتائج' })
  async getEventAttendees(
    @Param('id') eventId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.calendarEventsService.getEventAttendees(eventId, userId, companyId, {
      status: status as any,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  // ==================== إنشاء وتعديل الأحداث ====================

  @Post()
  @ApiOperation({ summary: 'إنشاء حدث جديد' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الحدث بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صالحة' })
  async createEvent(
    @Body() dto: CreateEventDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.calendarEventsService.createEvent(dto, userId, companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تحديث حدث موجود' })
  @ApiResponse({ status: 200, description: 'تم تحديث الحدث بنجاح' })
  @ApiResponse({ status: 404, description: 'الحدث غير موجود' })
  @ApiResponse({ status: 403, description: 'غير مصرح بالتعديل' })
  async updateEvent(
    @Param('id') eventId: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.calendarEventsService.updateEvent(eventId, dto, userId, companyId);
  }

  // ==================== إلغاء وحذف الأحداث ====================

  @Post(':id/cancel')
  @ApiOperation({ summary: 'إلغاء حدث' })
  @ApiResponse({ status: 200, description: 'تم إلغاء الحدث بنجاح' })
  @ApiResponse({ status: 404, description: 'الحدث غير موجود' })
  @ApiResponse({ status: 403, description: 'غير مصرح بالإلغاء' })
  @ApiQuery({ name: 'reason', required: false, description: 'سبب الإلغاء' })
  async cancelEvent(
    @Param('id') eventId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Query('reason') reason?: string,
  ) {
    return this.calendarEventsService.cancelEvent(eventId, userId, companyId, reason);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'حذف حدث نهائياً (للمسؤولين فقط)' })
  @ApiResponse({ status: 200, description: 'تم حذف الحدث بنجاح' })
  @ApiResponse({ status: 404, description: 'الحدث غير موجود' })
  @ApiResponse({ status: 403, description: 'غير مصرح بالحذف' })
  async deleteEvent(
    @Param('id') eventId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    await this.calendarEventsService.deleteEvent(eventId, userId, companyId);
    return { message: 'تم حذف الحدث بنجاح' };
  }

  @Post(':id/mark-done')
  @ApiOperation({ summary: 'تمييز الحدث كمنتهي' })
  @ApiResponse({ status: 200, description: 'تم تحديث حالة الحدث' })
  @ApiResponse({ status: 404, description: 'الحدث غير موجود' })
  @ApiResponse({ status: 403, description: 'غير مصرح بالتحديث' })
  async markEventAsDone(
    @Param('id') eventId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.calendarEventsService.markEventAsDone(eventId, userId, companyId);
  }

  // ==================== RSVP (الرد على الدعوة) ====================

  @Post(':id/rsvp')
  @ApiOperation({ summary: 'الرد على دعوة الحدث (RSVP)' })
  @ApiResponse({ status: 200, description: 'تم تحديث حالة الحضور' })
  @ApiResponse({ status: 404, description: 'الحدث غير موجود' })
  @ApiResponse({ status: 400, description: 'لا يمكن الرد على هذا الحدث' })
  async rsvpToEvent(
    @Param('id') eventId: string,
    @Body() dto: RSVPEventDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.calendarEventsService.rsvpToEvent(eventId, dto, userId, companyId);
  }

  @Delete(':id/attendees/:attendeeUserId')
  @ApiOperation({ summary: 'إزالة حضور من الحدث' })
  @ApiResponse({ status: 200, description: 'تم إزالة الحضور بنجاح' })
  @ApiResponse({ status: 404, description: 'الحدث أو الحضور غير موجود' })
  @ApiResponse({ status: 403, description: 'غير مصرح بإزالة الحضور' })
  async removeAttendee(
    @Param('id') eventId: string,
    @Param('attendeeUserId') attendeeUserId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    await this.calendarEventsService.removeAttendee(eventId, attendeeUserId, userId, companyId);
    return { message: 'تم إزالة الحضور بنجاح' };
  }
}
