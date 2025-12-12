import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { LeaveQueryDto } from './dto/leave-query.dto';
import { NotificationType } from '@prisma/client';

@Injectable()
export class LeavesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async createLeaveRequest(userId: string, createLeaveDto: CreateLeaveRequestDto) {
    const { type, startDate, endDate, reason, startTime, endTime } = createLeaveDto;

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      throw new BadRequestException('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
    }

    // Check for overlapping leaves
    const existingLeave = await this.prisma.leaveRequest.findFirst({
      where: {
        userId,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } },
        ],
      },
    });

    if (existingLeave) {
      throw new BadRequestException('يوجد طلب إجازة متداخل مع هذه الفترة');
    }

    const leaveRequest = await this.prisma.leaveRequest.create({
      data: {
        userId,
        type,
        startDate: start,
        endDate: end,
        startTime,
        endTime,
        reason,
      },
      include: {
        user: {
          select: { firstName: true, lastName: true, managerId: true },
        },
      },
    });

    // Notify manager
    if (leaveRequest.user.managerId) {
      await this.notificationsService.sendNotification(
        leaveRequest.user.managerId,
        NotificationType.GENERAL,
        'طلب إجازة جديد',
        `${leaveRequest.user.firstName} ${leaveRequest.user.lastName} طلب ${this.getLeaveTypeName(type)}`,
        { leaveRequestId: leaveRequest.id },
      );
    }

    return leaveRequest;
  }

  async getMyLeaveRequests(userId: string, query: LeaveQueryDto) {
    const { status, type, page = 1, limit = 20 } = query;

    const where: any = { userId };
    if (status) where.status = status;
    if (type) where.type = type;

    const [requests, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          approver: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);

    return {
      data: requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLeaveRequestById(id: string, userId?: string) {
    const leaveRequest = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true },
        },
        approver: { select: { firstName: true, lastName: true } },
      },
    });

    if (!leaveRequest) {
      throw new NotFoundException('طلب الإجازة غير موجود');
    }

    // Check permission
    if (userId && leaveRequest.userId !== userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.role === 'EMPLOYEE') {
        throw new ForbiddenException('غير مصرح بالوصول لهذا الطلب');
      }
    }

    return leaveRequest;
  }

  async cancelLeaveRequest(id: string, userId: string) {
    const leaveRequest = await this.prisma.leaveRequest.findUnique({
      where: { id },
    });

    if (!leaveRequest) {
      throw new NotFoundException('طلب الإجازة غير موجود');
    }

    if (leaveRequest.userId !== userId) {
      throw new ForbiddenException('لا يمكنك إلغاء طلب إجازة شخص آخر');
    }

    if (leaveRequest.status !== 'PENDING') {
      throw new BadRequestException('لا يمكن إلغاء طلب تم البت فيه');
    }

    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  // ============ Manager/Admin Methods ============

  async getPendingRequests(managerId?: string, query?: LeaveQueryDto) {
    const { page = 1, limit = 20 } = query || {};

    let where: any = { status: 'PENDING' };

    // If manager, only get their team's requests
    if (managerId) {
      const manager = await this.prisma.user.findUnique({
        where: { id: managerId },
      });

      if (manager?.role === 'MANAGER') {
        where.user = { managerId };
      }
    }

    const [requests, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              jobTitle: true,
              department: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);

    return {
      data: requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async approveLeaveRequest(id: string, approverId: string, notes?: string) {
    const leaveRequest = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!leaveRequest) {
      throw new NotFoundException('طلب الإجازة غير موجود');
    }

    if (leaveRequest.status !== 'PENDING') {
      throw new BadRequestException('هذا الطلب تم البت فيه مسبقاً');
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approverId,
        approverNotes: notes,
        approvedAt: new Date(),
      },
    });

    // Create attendance records for leave days
    await this.createLeaveAttendanceRecords(leaveRequest);

    // Notify employee
    await this.notificationsService.sendNotification(
      leaveRequest.userId,
      NotificationType.LEAVE_APPROVED,
      'تمت الموافقة على طلب الإجازة',
      `تمت الموافقة على طلبك ${this.getLeaveTypeName(leaveRequest.type)}`,
      { leaveRequestId: id },
    );

    return updated;
  }

  async rejectLeaveRequest(id: string, approverId: string, notes?: string) {
    const leaveRequest = await this.prisma.leaveRequest.findUnique({
      where: { id },
    });

    if (!leaveRequest) {
      throw new NotFoundException('طلب الإجازة غير موجود');
    }

    if (leaveRequest.status !== 'PENDING') {
      throw new BadRequestException('هذا الطلب تم البت فيه مسبقاً');
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approverId,
        approverNotes: notes,
        approvedAt: new Date(),
      },
    });

    // Notify employee
    await this.notificationsService.sendNotification(
      leaveRequest.userId,
      NotificationType.LEAVE_REJECTED,
      'تم رفض طلب الإجازة',
      `تم رفض طلبك ${this.getLeaveTypeName(leaveRequest.type)}${notes ? ': ' + notes : ''}`,
      { leaveRequestId: id },
    );

    return updated;
  }

  async getAllLeaveRequests(query: LeaveQueryDto) {
    const { status, type, userId, page = 1, limit = 20 } = query;

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (userId) where.userId = userId;

    const [requests, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              department: { select: { name: true } },
            },
          },
          approver: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);

    return {
      data: requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============ Work From Home ============

  async enableWorkFromHome(userId: string, date: Date, reason?: string, approverId?: string) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const existingWfh = await this.prisma.workFromHome.findUnique({
      where: {
        userId_date: {
          userId,
          date: targetDate,
        },
      },
    });

    if (existingWfh) {
      throw new BadRequestException('العمل من المنزل مفعل مسبقاً لهذا اليوم');
    }

    return this.prisma.workFromHome.create({
      data: {
        userId,
        date: targetDate,
        reason,
        approvedBy: approverId,
      },
    });
  }

  async disableWorkFromHome(userId: string, date: Date) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    await this.prisma.workFromHome.delete({
      where: {
        userId_date: {
          userId,
          date: targetDate,
        },
      },
    });

    return { message: 'تم إلغاء العمل من المنزل' };
  }

  // ============ Helper Methods ============

  private getLeaveTypeName(type: string): string {
    const types: Record<string, string> = {
      ANNUAL: 'إجازة سنوية',
      SICK: 'إجازة مرضية',
      PERSONAL: 'إجازة شخصية',
      EMERGENCY: 'إجازة طارئة',
      WORK_FROM_HOME: 'عمل من المنزل',
      EARLY_LEAVE: 'خروج مبكر',
      OTHER: 'أخرى',
    };
    return types[type] || type;
  }

  private async createLeaveAttendanceRecords(leaveRequest: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: leaveRequest.userId },
    });

    if (!user?.branchId) return;

    const start = new Date(leaveRequest.startDate);
    const end = new Date(leaveRequest.endDate);

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);

      await this.prisma.attendance.upsert({
        where: {
          userId_date: {
            userId: leaveRequest.userId,
            date: targetDate,
          },
        },
        create: {
          userId: leaveRequest.userId,
          branchId: user.branchId,
          date: targetDate,
          status: 'ON_LEAVE',
          notes: `${this.getLeaveTypeName(leaveRequest.type)}: ${leaveRequest.reason}`,
        },
        update: {
          status: 'ON_LEAVE',
          notes: `${this.getLeaveTypeName(leaveRequest.type)}: ${leaveRequest.reason}`,
        },
      });
    }
  }
}

