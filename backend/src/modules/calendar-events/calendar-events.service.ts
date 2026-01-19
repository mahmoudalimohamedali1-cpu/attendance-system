import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  EventStatus,
  RSVPStatus,
  VisibilityType,
  TargetType,
  Prisma,
  Role,
} from '@prisma/client';
import { CreateEventDto, EventTargetDto, EventAttendeeDto } from './dto';
import { UpdateEventDto } from './dto';
import { RSVPEventDto } from './dto';

// ==================== الواجهات (Interfaces) ====================

/**
 * خيارات جلب الأحداث
 */
interface GetEventsOptions {
  startDate?: Date;
  endDate?: Date;
  eventType?: string;
  status?: EventStatus;
  limit?: number;
  offset?: number;
  includeTargeted?: boolean;
}

/**
 * نتيجة جلب الأحداث مع الباجنيشن
 */
interface PaginatedEventsResult {
  items: any[];
  total: number;
  page?: number;
  limit?: number;
}

/**
 * معلومات الحضور للحدث
 */
interface AttendeeInfo {
  id: string;
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string | null;
    jobTitle?: string | null;
    department?: { id: string; name: string } | null;
  };
  rsvpStatus: RSVPStatus;
  respondedAt?: Date | null;
  note?: string | null;
}

/**
 * بيانات المستخدم للتحقق من الاستهداف
 */
interface UserTargetingData {
  id: string;
  role: Role;
  branchId?: string | null;
  departmentId?: string | null;
  jobTitleId?: string | null;
  managerId?: string | null;
}

@Injectable()
export class CalendarEventsService {
  private readonly logger = new Logger(CalendarEventsService.name);

  constructor(private prisma: PrismaService) {}

  // ==================== جلب الأحداث (Get Events) ====================

  /**
   * جلب الأحداث ضمن نطاق زمني معين
   * مع دعم الترشيح والباجنيشن
   */
  async getEvents(
    userId: string,
    companyId: string,
    options: GetEventsOptions = {},
  ): Promise<PaginatedEventsResult> {
    const {
      startDate,
      endDate,
      eventType,
      status,
      limit = 50,
      offset = 0,
      includeTargeted = true,
    } = options;

    // بناء شروط البحث الأساسية
    const where: Prisma.EventWhereInput = {
      companyId,
      status: status || { not: EventStatus.CANCELLED },
    };

    // فلترة بنطاق التاريخ
    if (startDate || endDate) {
      where.AND = [];
      if (startDate) {
        (where.AND as Prisma.EventWhereInput[]).push({
          endAt: { gte: startDate },
        });
      }
      if (endDate) {
        (where.AND as Prisma.EventWhereInput[]).push({
          startAt: { lte: endDate },
        });
      }
    }

    // فلترة بنوع الحدث
    if (eventType) {
      where.eventType = eventType as any;
    }

    // جلب بيانات المستخدم للتحقق من الاستهداف
    const user = await this.getUserTargetingData(userId, companyId);

    // جلب الأحداث مع العلاقات
    const [allEvents, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
              jobTitle: true,
            },
          },
          attendees: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
          },
          targets: true,
          _count: {
            select: {
              attendees: true,
            },
          },
        },
        orderBy: { startAt: 'asc' },
        take: limit + offset + 100, // نأخذ أكثر للفلترة
      }),
      this.prisma.event.count({ where }),
    ]);

    // فلترة الأحداث حسب الاستهداف
    let filteredEvents = allEvents;
    if (includeTargeted && user) {
      filteredEvents = await this.filterEventsByTargeting(allEvents, user);
    }

    // تطبيق الباجنيشن على النتائج المفلترة
    const paginatedEvents = filteredEvents.slice(offset, offset + limit);

    // إضافة معلومات RSVP للمستخدم الحالي
    const eventsWithUserRsvp = paginatedEvents.map((event) => {
      const userAttendee = event.attendees.find((a) => a.userId === userId);
      return {
        ...event,
        userRsvpStatus: userAttendee?.rsvpStatus || null,
        isCreator: event.creatorId === userId,
      };
    });

    return {
      items: eventsWithUserRsvp,
      total: filteredEvents.length,
      limit,
    };
  }

  /**
   * جلب حدث واحد بالتفاصيل الكاملة
   */
  async getEvent(
    eventId: string,
    userId: string,
    companyId: string,
  ): Promise<any> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
            jobTitle: true,
            department: {
              select: { id: true, name: true },
            },
          },
        },
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatar: true,
                jobTitle: true,
                department: {
                  select: { id: true, name: true },
                },
              },
            },
          },
          orderBy: { rsvpStatus: 'asc' },
        },
        targets: true,
      },
    });

    if (!event) {
      throw new NotFoundException('الحدث غير موجود');
    }

    if (event.companyId !== companyId) {
      throw new ForbiddenException('ليس لديك صلاحية الوصول لهذا الحدث');
    }

    // التحقق من إمكانية رؤية الحدث
    const user = await this.getUserTargetingData(userId, companyId);
    if (user) {
      const canView = await this.canUserViewEvent(event, user);
      if (!canView) {
        throw new ForbiddenException('ليس لديك صلاحية الوصول لهذا الحدث');
      }
    }

    // إضافة معلومات RSVP للمستخدم الحالي
    const userAttendee = event.attendees.find((a) => a.userId === userId);

    // تجميع إحصائيات RSVP
    const rsvpStats = {
      going: event.attendees.filter((a) => a.rsvpStatus === RSVPStatus.GOING).length,
      maybe: event.attendees.filter((a) => a.rsvpStatus === RSVPStatus.MAYBE).length,
      declined: event.attendees.filter((a) => a.rsvpStatus === RSVPStatus.DECLINED).length,
      invited: event.attendees.filter((a) => a.rsvpStatus === RSVPStatus.INVITED).length,
      total: event.attendees.length,
    };

    return {
      ...event,
      userRsvpStatus: userAttendee?.rsvpStatus || null,
      isCreator: event.creatorId === userId,
      rsvpStats,
    };
  }

  /**
   * جلب الأحداث القادمة (للويدجت)
   */
  async getUpcomingEvents(
    userId: string,
    companyId: string,
    days: number = 7,
  ): Promise<any[]> {
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const result = await this.getEvents(userId, companyId, {
      startDate: now,
      endDate,
      status: EventStatus.SCHEDULED,
      limit: 10,
    });

    return result.items;
  }

  // ==================== إنشاء الأحداث (Create Events) ====================

  /**
   * إنشاء حدث جديد
   */
  async createEvent(
    dto: CreateEventDto,
    userId: string,
    companyId: string,
  ): Promise<any> {
    // التحقق من صحة التواريخ
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    if (endAt <= startAt) {
      throw new BadRequestException('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
    }

    // إنشاء الحدث
    const event = await this.prisma.event.create({
      data: {
        companyId,
        creatorId: userId,
        title: dto.title,
        titleEn: dto.titleEn,
        description: dto.description,
        descriptionEn: dto.descriptionEn,
        startAt,
        endAt,
        isAllDay: dto.isAllDay || false,
        timezone: dto.timezone || 'Asia/Riyadh',
        location: dto.location,
        meetingLink: dto.meetingLink,
        eventType: dto.eventType || 'MEETING',
        visibilityType: dto.visibilityType || VisibilityType.PUBLIC,
        isRecurring: dto.isRecurring || false,
        recurrenceRule: dto.recurrenceRule,
        color: dto.color,
        icon: dto.icon,
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // إضافة قواعد الاستهداف
    if (dto.targets && dto.targets.length > 0) {
      await this.createEventTargets(event.id, dto.targets);
    }

    // إضافة الحضور المدعوين
    if (dto.attendees && dto.attendees.length > 0) {
      await this.addEventAttendees(event.id, dto.attendees);
    }

    this.logger.log(`تم إنشاء حدث جديد: ${event.id} بواسطة المستخدم: ${userId}`);

    // جلب الحدث مع العلاقات الكاملة
    return this.getEvent(event.id, userId, companyId);
  }

  /**
   * إضافة قواعد استهداف للحدث
   */
  private async createEventTargets(
    eventId: string,
    targets: EventTargetDto[],
  ): Promise<void> {
    await this.prisma.eventTarget.createMany({
      data: targets.map((target) => ({
        eventId,
        targetType: target.targetType,
        targetValue: target.targetValue,
        isExclusion: target.isExclusion || false,
      })),
    });
  }

  /**
   * إضافة حضور للحدث
   */
  private async addEventAttendees(
    eventId: string,
    attendees: EventAttendeeDto[],
  ): Promise<void> {
    // فلترة المدعوين الموجودين مسبقاً
    const existingAttendees = await this.prisma.eventAttendee.findMany({
      where: { eventId },
      select: { userId: true },
    });
    const existingUserIds = new Set(existingAttendees.map((a) => a.userId));

    const newAttendees = attendees.filter((a) => !existingUserIds.has(a.userId));

    if (newAttendees.length > 0) {
      await this.prisma.eventAttendee.createMany({
        data: newAttendees.map((attendee) => ({
          eventId,
          userId: attendee.userId,
          rsvpStatus: RSVPStatus.INVITED,
        })),
        skipDuplicates: true,
      });
    }
  }

  // ==================== تحديث الأحداث (Update Events) ====================

  /**
   * تحديث حدث موجود
   */
  async updateEvent(
    eventId: string,
    dto: UpdateEventDto,
    userId: string,
    companyId: string,
  ): Promise<any> {
    // جلب الحدث والتحقق من الصلاحيات
    const existingEvent = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        companyId: true,
        creatorId: true,
        status: true,
      },
    });

    if (!existingEvent) {
      throw new NotFoundException('الحدث غير موجود');
    }

    if (existingEvent.companyId !== companyId) {
      throw new ForbiddenException('ليس لديك صلاحية الوصول لهذا الحدث');
    }

    // التحقق من أن المستخدم هو منشئ الحدث أو مسؤول
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (existingEvent.creatorId !== userId && user?.role !== Role.ADMIN && user?.role !== Role.HR) {
      throw new ForbiddenException('فقط منشئ الحدث أو المسؤول يمكنه تعديل الحدث');
    }

    if (existingEvent.status === EventStatus.CANCELLED) {
      throw new BadRequestException('لا يمكن تعديل حدث ملغي');
    }

    // التحقق من صحة التواريخ إذا تم تحديثها
    if (dto.startAt && dto.endAt) {
      const startAt = new Date(dto.startAt);
      const endAt = new Date(dto.endAt);
      if (endAt <= startAt) {
        throw new BadRequestException('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
      }
    }

    // تحديث الحدث
    const updateData: Prisma.EventUpdateInput = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.titleEn !== undefined) updateData.titleEn = dto.titleEn;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.descriptionEn !== undefined) updateData.descriptionEn = dto.descriptionEn;
    if (dto.startAt !== undefined) updateData.startAt = new Date(dto.startAt);
    if (dto.endAt !== undefined) updateData.endAt = new Date(dto.endAt);
    if (dto.isAllDay !== undefined) updateData.isAllDay = dto.isAllDay;
    if (dto.timezone !== undefined) updateData.timezone = dto.timezone;
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.meetingLink !== undefined) updateData.meetingLink = dto.meetingLink;
    if (dto.eventType !== undefined) updateData.eventType = dto.eventType;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.visibilityType !== undefined) updateData.visibilityType = dto.visibilityType;
    if (dto.isRecurring !== undefined) updateData.isRecurring = dto.isRecurring;
    if (dto.recurrenceRule !== undefined) updateData.recurrenceRule = dto.recurrenceRule;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.icon !== undefined) updateData.icon = dto.icon;

    await this.prisma.event.update({
      where: { id: eventId },
      data: updateData,
    });

    // تحديث قواعد الاستهداف إذا تم توفيرها
    if (dto.targets !== undefined) {
      await this.prisma.eventTarget.deleteMany({
        where: { eventId },
      });

      if (dto.targets.length > 0) {
        await this.createEventTargets(eventId, dto.targets);
      }
    }

    // تحديث الحضور إذا تم توفيرهم
    if (dto.attendees !== undefined) {
      // حذف الحضور الحاليين (الذين لم يردوا بعد)
      await this.prisma.eventAttendee.deleteMany({
        where: {
          eventId,
          rsvpStatus: RSVPStatus.INVITED,
        },
      });

      if (dto.attendees.length > 0) {
        await this.addEventAttendees(eventId, dto.attendees);
      }
    }

    this.logger.log(`تم تحديث الحدث: ${eventId} بواسطة المستخدم: ${userId}`);

    return this.getEvent(eventId, userId, companyId);
  }

  // ==================== إلغاء الأحداث (Cancel Events) ====================

  /**
   * إلغاء حدث
   */
  async cancelEvent(
    eventId: string,
    userId: string,
    companyId: string,
    reason?: string,
  ): Promise<any> {
    // جلب الحدث والتحقق من الصلاحيات
    const existingEvent = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        companyId: true,
        creatorId: true,
        status: true,
        title: true,
      },
    });

    if (!existingEvent) {
      throw new NotFoundException('الحدث غير موجود');
    }

    if (existingEvent.companyId !== companyId) {
      throw new ForbiddenException('ليس لديك صلاحية الوصول لهذا الحدث');
    }

    // التحقق من أن المستخدم هو منشئ الحدث أو مسؤول
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (existingEvent.creatorId !== userId && user?.role !== Role.ADMIN && user?.role !== Role.HR) {
      throw new ForbiddenException('فقط منشئ الحدث أو المسؤول يمكنه إلغاء الحدث');
    }

    if (existingEvent.status === EventStatus.CANCELLED) {
      throw new BadRequestException('الحدث ملغي بالفعل');
    }

    // إلغاء الحدث
    const cancelledEvent = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        status: EventStatus.CANCELLED,
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(`تم إلغاء الحدث: ${eventId} بواسطة المستخدم: ${userId}${reason ? ` - السبب: ${reason}` : ''}`);

    return cancelledEvent;
  }

  /**
   * حذف حدث نهائياً (للمسؤولين فقط)
   */
  async deleteEvent(
    eventId: string,
    userId: string,
    companyId: string,
  ): Promise<void> {
    // جلب الحدث والتحقق من الصلاحيات
    const existingEvent = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        companyId: true,
        creatorId: true,
      },
    });

    if (!existingEvent) {
      throw new NotFoundException('الحدث غير موجود');
    }

    if (existingEvent.companyId !== companyId) {
      throw new ForbiddenException('ليس لديك صلاحية الوصول لهذا الحدث');
    }

    // التحقق من أن المستخدم مسؤول
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== Role.ADMIN) {
      throw new ForbiddenException('فقط المسؤول يمكنه حذف الحدث نهائياً');
    }

    // حذف الحدث (سيتم حذف العلاقات بسبب onDelete: Cascade)
    await this.prisma.event.delete({
      where: { id: eventId },
    });

    this.logger.log(`تم حذف الحدث نهائياً: ${eventId} بواسطة المستخدم: ${userId}`);
  }

  // ==================== RSVP (الرد على الدعوة) ====================

  /**
   * تحديث حالة RSVP للمستخدم
   */
  async rsvpToEvent(
    eventId: string,
    dto: RSVPEventDto,
    userId: string,
    companyId: string,
  ): Promise<AttendeeInfo> {
    // جلب الحدث والتحقق من وجوده
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        companyId: true,
        status: true,
        title: true,
        visibilityType: true,
      },
    });

    if (!event) {
      throw new NotFoundException('الحدث غير موجود');
    }

    if (event.companyId !== companyId) {
      throw new ForbiddenException('ليس لديك صلاحية الوصول لهذا الحدث');
    }

    if (event.status === EventStatus.CANCELLED) {
      throw new BadRequestException('لا يمكن الرد على حدث ملغي');
    }

    if (event.status === EventStatus.DONE) {
      throw new BadRequestException('لا يمكن الرد على حدث منتهي');
    }

    // البحث عن سجل الحضور الحالي أو إنشاء واحد جديد
    let attendee = await this.prisma.eventAttendee.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });

    if (!attendee) {
      // إنشاء سجل حضور جديد
      attendee = await this.prisma.eventAttendee.create({
        data: {
          eventId,
          userId,
          rsvpStatus: dto.status,
          respondedAt: new Date(),
          note: dto.note,
        },
      });
    } else {
      // تحديث سجل الحضور الحالي
      attendee = await this.prisma.eventAttendee.update({
        where: {
          eventId_userId: {
            eventId,
            userId,
          },
        },
        data: {
          rsvpStatus: dto.status,
          respondedAt: new Date(),
          note: dto.note,
        },
      });
    }

    // جلب معلومات المستخدم
    const attendeeWithUser = await this.prisma.eventAttendee.findUnique({
      where: { id: attendee.id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
            jobTitle: true,
            department: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    this.logger.log(
      `تم تحديث RSVP للحدث: ${eventId} - المستخدم: ${userId} - الحالة: ${dto.status}`,
    );

    return attendeeWithUser as AttendeeInfo;
  }

  /**
   * جلب قائمة الحضور لحدث معين
   */
  async getEventAttendees(
    eventId: string,
    userId: string,
    companyId: string,
    options?: {
      status?: RSVPStatus;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ items: AttendeeInfo[]; total: number }> {
    // التحقق من وجود الحدث والصلاحيات
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, companyId: true },
    });

    if (!event) {
      throw new NotFoundException('الحدث غير موجود');
    }

    if (event.companyId !== companyId) {
      throw new ForbiddenException('ليس لديك صلاحية الوصول لهذا الحدث');
    }

    const where: Prisma.EventAttendeeWhereInput = { eventId };
    if (options?.status) {
      where.rsvpStatus = options.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.eventAttendee.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
              jobTitle: true,
              department: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: [
          { rsvpStatus: 'asc' },
          { respondedAt: 'desc' },
        ],
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      this.prisma.eventAttendee.count({ where }),
    ]);

    return { items: items as AttendeeInfo[], total };
  }

  /**
   * إزالة حضور من الحدث (لمنشئ الحدث أو المسؤول)
   */
  async removeAttendee(
    eventId: string,
    attendeeUserId: string,
    userId: string,
    companyId: string,
  ): Promise<void> {
    // جلب الحدث والتحقق من الصلاحيات
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, companyId: true, creatorId: true },
    });

    if (!event) {
      throw new NotFoundException('الحدث غير موجود');
    }

    if (event.companyId !== companyId) {
      throw new ForbiddenException('ليس لديك صلاحية الوصول لهذا الحدث');
    }

    // التحقق من الصلاحيات
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // السماح لمنشئ الحدث أو المسؤول بإزالة الحضور
    // السماح للمستخدم بإزالة نفسه
    if (
      event.creatorId !== userId &&
      user?.role !== Role.ADMIN &&
      user?.role !== Role.HR &&
      attendeeUserId !== userId
    ) {
      throw new ForbiddenException('ليس لديك صلاحية إزالة هذا الحضور');
    }

    await this.prisma.eventAttendee.deleteMany({
      where: {
        eventId,
        userId: attendeeUserId,
      },
    });

    this.logger.log(
      `تم إزالة الحضور: ${attendeeUserId} من الحدث: ${eventId} بواسطة: ${userId}`,
    );
  }

  // ==================== دوال مساعدة للاستهداف ====================

  /**
   * جلب بيانات المستخدم للتحقق من الاستهداف
   */
  private async getUserTargetingData(
    userId: string,
    companyId: string,
  ): Promise<UserTargetingData | null> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
      select: {
        id: true,
        role: true,
        branchId: true,
        departmentId: true,
        jobTitleId: true,
        managerId: true,
      },
    });

    return user;
  }

  /**
   * فلترة الأحداث حسب قواعد الاستهداف
   */
  private async filterEventsByTargeting(
    events: any[],
    user: UserTargetingData,
  ): Promise<any[]> {
    const filteredEvents: any[] = [];

    for (const event of events) {
      if (await this.canUserViewEvent(event, user)) {
        filteredEvents.push(event);
      }
    }

    return filteredEvents;
  }

  /**
   * التحقق إذا كان المستخدم يمكنه رؤية الحدث
   */
  private async canUserViewEvent(
    event: any,
    user: UserTargetingData,
  ): Promise<boolean> {
    // المنشئ يمكنه رؤية الحدث دائماً
    if (event.creatorId === user.id) {
      return true;
    }

    // المدعو يمكنه رؤية الحدث دائماً
    const isAttendee = event.attendees?.some((a: any) => a.userId === user.id);
    if (isAttendee) {
      return true;
    }

    // التحقق من نوع الظهور
    const visibilityCheck = this.checkVisibility(event.visibilityType, user);
    if (!visibilityCheck) {
      return false;
    }

    // إذا كان الحدث عام ولا توجد قواعد استهداف
    if (!event.targets || event.targets.length === 0) {
      return true;
    }

    // التحقق من قواعد الاستهداف
    return this.checkTargetingRules(event.targets, user);
  }

  /**
   * التحقق من نوع الظهور
   */
  private checkVisibility(
    visibilityType: VisibilityType,
    user: UserTargetingData,
  ): boolean {
    switch (visibilityType) {
      case VisibilityType.PUBLIC:
        return true;

      case VisibilityType.MANAGERS_ONLY:
        return user.role === Role.MANAGER || user.role === Role.ADMIN;

      case VisibilityType.HR_ONLY:
        return user.role === Role.HR || user.role === Role.ADMIN;

      case VisibilityType.PRIVATE:
        return false;

      case VisibilityType.DEPARTMENT:
      case VisibilityType.TEAM:
      case VisibilityType.TARGETED:
        return true; // سيتم التحقق من قواعد الاستهداف

      default:
        return true;
    }
  }

  /**
   * التحقق من قواعد الاستهداف
   */
  private checkTargetingRules(
    targets: any[],
    user: UserTargetingData,
  ): boolean {
    // فصل قواعد الشمول والاستثناء
    const inclusionRules = targets.filter((t) => !t.isExclusion);
    const exclusionRules = targets.filter((t) => t.isExclusion);

    // التحقق من الاستثناءات أولاً
    for (const rule of exclusionRules) {
      if (this.matchesTargetRule(rule, user)) {
        return false;
      }
    }

    // إذا لم تكن هناك قواعد شمول، المستخدم مستهدف
    if (inclusionRules.length === 0) {
      return true;
    }

    // التحقق من قواعد الشمول
    for (const rule of inclusionRules) {
      if (this.matchesTargetRule(rule, user)) {
        return true;
      }
    }

    return false;
  }

  /**
   * التحقق من مطابقة قاعدة استهداف واحدة
   */
  private matchesTargetRule(
    rule: { targetType: TargetType; targetValue: string },
    user: UserTargetingData,
  ): boolean {
    switch (rule.targetType) {
      case TargetType.USER:
        return user.id === rule.targetValue;

      case TargetType.BRANCH:
        return user.branchId === rule.targetValue;

      case TargetType.DEPARTMENT:
        return user.departmentId === rule.targetValue;

      case TargetType.ROLE:
        return user.role === rule.targetValue;

      case TargetType.JOB_TITLE:
        return user.jobTitleId === rule.targetValue;

      default:
        return false;
    }
  }

  // ==================== دوال إضافية ====================

  /**
   * البحث في الأحداث
   */
  async searchEvents(
    userId: string,
    companyId: string,
    query: string,
    options?: GetEventsOptions,
  ): Promise<PaginatedEventsResult> {
    const { limit = 20, offset = 0 } = options || {};

    const where: Prisma.EventWhereInput = {
      companyId,
      status: { not: EventStatus.CANCELLED },
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { titleEn: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { descriptionEn: { contains: query, mode: 'insensitive' } },
        { location: { contains: query, mode: 'insensitive' } },
      ],
    };

    const [items, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          _count: {
            select: { attendees: true },
          },
        },
        orderBy: { startAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.event.count({ where }),
    ]);

    return { items, total, limit };
  }

  /**
   * تمييز الحدث كمنتهي
   */
  async markEventAsDone(
    eventId: string,
    userId: string,
    companyId: string,
  ): Promise<any> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, companyId: true, creatorId: true, status: true },
    });

    if (!event) {
      throw new NotFoundException('الحدث غير موجود');
    }

    if (event.companyId !== companyId) {
      throw new ForbiddenException('ليس لديك صلاحية الوصول لهذا الحدث');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (event.creatorId !== userId && user?.role !== Role.ADMIN && user?.role !== Role.HR) {
      throw new ForbiddenException('فقط منشئ الحدث أو المسؤول يمكنه تحديث حالة الحدث');
    }

    if (event.status === EventStatus.CANCELLED) {
      throw new BadRequestException('لا يمكن تحديث حدث ملغي');
    }

    return this.prisma.event.update({
      where: { id: eventId },
      data: { status: EventStatus.DONE },
    });
  }

  /**
   * جلب أحداث المستخدم (الأحداث التي أنشأها أو مدعو إليها)
   */
  async getMyEvents(
    userId: string,
    companyId: string,
    options?: GetEventsOptions,
  ): Promise<PaginatedEventsResult> {
    const { startDate, endDate, limit = 20, offset = 0 } = options || {};

    const where: Prisma.EventWhereInput = {
      companyId,
      status: { not: EventStatus.CANCELLED },
      OR: [
        { creatorId: userId },
        {
          attendees: {
            some: { userId },
          },
        },
      ],
    };

    if (startDate || endDate) {
      where.AND = [];
      if (startDate) {
        (where.AND as Prisma.EventWhereInput[]).push({
          endAt: { gte: startDate },
        });
      }
      if (endDate) {
        (where.AND as Prisma.EventWhereInput[]).push({
          startAt: { lte: endDate },
        });
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          attendees: {
            where: { userId },
            select: { rsvpStatus: true },
          },
          _count: {
            select: { attendees: true },
          },
        },
        orderBy: { startAt: 'asc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.event.count({ where }),
    ]);

    // إضافة معلومات RSVP
    const eventsWithRsvp = items.map((event) => ({
      ...event,
      userRsvpStatus: event.attendees[0]?.rsvpStatus || null,
      isCreator: event.creatorId === userId,
    }));

    return { items: eventsWithRsvp, total, limit };
  }

  /**
   * جلب إحصائيات الأحداث لفترة معينة
   */
  async getEventsStats(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    total: number;
    byType: Array<{ type: string; count: number }>;
    byStatus: Array<{ status: string; count: number }>;
  }> {
    const where: Prisma.EventWhereInput = {
      companyId,
      startAt: { gte: startDate, lte: endDate },
    };

    const [total, byType, byStatus] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.groupBy({
        by: ['eventType'],
        where,
        _count: true,
      }),
      this.prisma.event.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
    ]);

    return {
      total,
      byType: byType.map((item) => ({ type: item.eventType, count: item._count })),
      byStatus: byStatus.map((item) => ({ status: item.status, count: item._count })),
    };
  }
}
