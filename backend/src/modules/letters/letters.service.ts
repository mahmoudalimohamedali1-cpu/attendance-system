import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateLetterRequestDto } from './dto/create-letter-request.dto';
import { LetterQueryDto } from './dto/letter-query.dto';
import { LetterStatus, LetterType, User } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { UploadService } from '../../common/upload/upload.service';

@Injectable()
export class LettersService {
  private readonly logger = new Logger(LettersService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private uploadService: UploadService,
  ) {}

  async createLetterRequest(userId: string, createLetterDto: CreateLetterRequestDto) {
    const { type, notes, attachments } = createLetterDto;

    const letterRequest = await this.prisma.letterRequest.create({
      data: {
        userId,
        type,
        notes: notes || undefined,
        attachments: attachments && attachments.length > 0
          ? attachments as unknown as any
          : undefined,
        status: LetterStatus.PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            managerId: true,
            email: true,
          },
        },
      },
    });

    // Notify manager
    const letterWithUser = letterRequest as typeof letterRequest & {
      user: { firstName: string; lastName: string; managerId: string | null };
    };
    
    if (letterWithUser.user?.managerId) {
      await this.notificationsService.sendNotification(
        letterWithUser.user.managerId,
        'GENERAL' as any,
        'طلب خطاب جديد',
        `${letterWithUser.user.firstName} ${letterWithUser.user.lastName} طلب خطاب (${this.getLetterTypeName(type)})`,
        { letterRequestId: letterRequest.id },
      );
    }

    return letterRequest;
  }

  async getMyLetterRequests(userId: string, query: LetterQueryDto) {
    const { status, type, page = 1, limit = 20 } = query;

    const where: any = { userId };
    if (status) where.status = status;
    if (type) where.type = type;

    const [requests, total] = await Promise.all([
      this.prisma.letterRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.letterRequest.count({ where }),
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

  async getPendingRequests(managerId?: string, query?: LetterQueryDto) {
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
      this.prisma.letterRequest.findMany({
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
      this.prisma.letterRequest.count({ where }),
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

  async getLetterRequestById(id: string, userId: string) {
    const letterRequest = await this.prisma.letterRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            jobTitle: true,
            email: true,
            department: { select: { name: true } },
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!letterRequest) {
      throw new NotFoundException('طلب الخطاب غير موجود');
    }

    // Check if user has access (owner or manager/admin)
    if (letterRequest.userId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, id: true },
      });

      if (user?.role !== 'ADMIN' && user?.role !== 'MANAGER') {
        throw new BadRequestException('غير مصرح لك بالوصول لهذا الطلب');
      }
    }

    return letterRequest;
  }

  async approveLetterRequest(id: string, approverId: string, notes?: string) {
    const letterRequest = await this.prisma.letterRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!letterRequest) {
      throw new NotFoundException('طلب الخطاب غير موجود');
    }

    if (letterRequest.status !== 'PENDING') {
      throw new BadRequestException('هذا الطلب تم البت فيه مسبقاً');
    }

    const updated = await this.prisma.letterRequest.update({
      where: { id },
      data: {
        status: LetterStatus.APPROVED,
        approverId,
        approverNotes: notes,
        approvedAt: new Date(),
      },
      include: {
        user: true,
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Notify user
    await this.notificationsService.sendNotification(
      letterRequest.userId,
      'LETTER_APPROVED' as any,
      'تمت الموافقة على طلب الخطاب',
      `تمت الموافقة على طلب الخطاب (${this.getLetterTypeName(letterRequest.type)})`,
      { letterRequestId: id },
    );

    return updated;
  }

  async rejectLetterRequest(id: string, approverId: string, notes?: string) {
    const letterRequest = await this.prisma.letterRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!letterRequest) {
      throw new NotFoundException('طلب الخطاب غير موجود');
    }

    if (letterRequest.status !== 'PENDING') {
      throw new BadRequestException('هذا الطلب تم البت فيه مسبقاً');
    }

    const updated = await this.prisma.letterRequest.update({
      where: { id },
      data: {
        status: LetterStatus.REJECTED,
        approverId,
        approverNotes: notes,
        approvedAt: new Date(),
      },
      include: {
        user: true,
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Notify user
    await this.notificationsService.sendNotification(
      letterRequest.userId,
      'LETTER_REJECTED' as any,
      'تم رفض طلب الخطاب',
      `تم رفض طلب الخطاب (${this.getLetterTypeName(letterRequest.type)})`,
      { letterRequestId: id },
    );

    return updated;
  }

  async cancelLetterRequest(id: string, userId: string) {
    const letterRequest = await this.prisma.letterRequest.findUnique({
      where: { id },
    });

    if (!letterRequest) {
      throw new NotFoundException('طلب الخطاب غير موجود');
    }

    if (letterRequest.userId !== userId) {
      throw new BadRequestException('لا يمكنك إلغاء طلب خطاب شخص آخر');
    }

    if (letterRequest.status !== 'PENDING') {
      throw new BadRequestException('لا يمكن إلغاء طلب تم البت فيه');
    }

    return this.prisma.letterRequest.update({
      where: { id },
      data: { status: LetterStatus.CANCELLED },
    });
  }

  private getLetterTypeName(type: LetterType): string {
    const names = {
      REQUEST: 'طلب',
      COMPLAINT: 'شكوى',
      CERTIFICATION: 'تصديق',
    };
    return names[type] || type;
  }
}

