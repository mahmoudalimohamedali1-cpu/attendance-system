import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateLetterRequestDto } from './dto/create-letter-request.dto';
import { LetterQueryDto } from './dto/letter-query.dto';
import { LetterStatus, LetterType, User } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { UploadService } from '../../common/upload/upload.service';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class LettersService {
  private readonly logger = new Logger(LettersService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private uploadService: UploadService,
    private permissionsService: PermissionsService,
  ) { }

  async createLetterRequest(userId: string, createLetterDto: CreateLetterRequestDto) {
    const { type, notes, attachments } = createLetterDto;

    // جلب بيانات المستخدم لمعرفة مديره المباشر
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, managerId: true, firstName: true, lastName: true },
    });

    const letterRequest = await this.prisma.letterRequest.create({
      data: {
        userId,
        type,
        notes: notes || undefined,
        attachments: attachments && attachments.length > 0
          ? attachments as unknown as any
          : undefined,
        status: LetterStatus.PENDING,
        // ========== Workflow ==========
        currentStep: 'MANAGER',
        managerApproverId: user?.managerId || undefined,
        managerDecision: 'PENDING',
        hrDecision: 'PENDING',
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
    // Support comma-separated status values (e.g., 'PENDING,MGR_APPROVED')
    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
    }
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

  async getPendingRequests(userId: string, companyId: string, query?: LetterQueryDto) {
    const { page = 1, limit = 20, status = 'PENDING' } = query || {};

    // Get accessible employee IDs based on LETTERS_VIEW OR LETTERS_APPROVE_MANAGER permission
    // Combine both permissions to get all employees the user can access
    const [viewAccessible, approveAccessible] = await Promise.all([
      this.permissionsService.getAccessibleEmployeeIds(userId, companyId, 'LETTERS_VIEW'),
      this.permissionsService.getAccessibleEmployeeIds(userId, companyId, 'LETTERS_APPROVE_MANAGER'),
    ]);

    // Combine unique employee IDs from both permissions
    const accessibleEmployeeIds = [...new Set([...viewAccessible, ...approveAccessible])];

    // If no accessible employees, return empty
    if (accessibleEmployeeIds.length === 0) {
      return {
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }

    const where: any = {
      status,
      userId: { in: accessibleEmployeeIds },
    };

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

  async approveLetterRequest(id: string, approverId: string, notes?: string, attachments?: any[]) {
    const letterRequest = await this.prisma.letterRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!letterRequest) {
      throw new NotFoundException('طلب الخطاب غير موجود');
    }

    // Route through workflow based on currentStep
    const currentStep = (letterRequest as any).currentStep || 'MANAGER';

    if (currentStep === 'MANAGER') {
      // Check if this user is the assigned manager approver
      if ((letterRequest as any).managerApproverId === approverId) {
        return this.managerDecision(id, approverId, 'APPROVED', notes, attachments);
      }

      // Or check if they have general LETTERS_APPROVE_MANAGER permission
      const canApprove = await this.permissionsService.canAccessEmployee(
        approverId,
        letterRequest.companyId || '',
        'LETTERS_APPROVE_MANAGER',
        letterRequest.userId
      );
      if (canApprove.hasAccess) {
        return this.managerDecision(id, approverId, 'APPROVED', notes, attachments);
      }

      throw new ForbiddenException('ليس لديك صلاحية الموافقة على طلبات هذا الموظف');
    } else if (currentStep === 'HR') {
      // Route to HR decision
      return this.hrDecision(id, approverId, 'APPROVED', notes, attachments);
    } else {
      throw new BadRequestException('هذا الطلب تم البت فيه مسبقاً');
    }
  }

  async rejectLetterRequest(id: string, approverId: string, notes?: string, attachments?: any[]) {
    const letterRequest = await this.prisma.letterRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!letterRequest) {
      throw new NotFoundException('طلب الخطاب غير موجود');
    }

    // Route through workflow based on currentStep
    const currentStep = (letterRequest as any).currentStep || 'MANAGER';

    if (currentStep === 'MANAGER') {
      // Check if this user is the assigned manager approver
      if ((letterRequest as any).managerApproverId === approverId) {
        return this.managerDecision(id, approverId, 'REJECTED', notes, attachments);
      }

      // Or check if they have general LETTERS_APPROVE_MANAGER permission
      const canApprove = await this.permissionsService.canAccessEmployee(
        approverId,
        letterRequest.companyId || '',
        'LETTERS_APPROVE_MANAGER',
        letterRequest.userId
      );
      if (canApprove.hasAccess) {
        return this.managerDecision(id, approverId, 'REJECTED', notes, attachments);
      }

      throw new ForbiddenException('ليس لديك صلاحية رفض طلبات هذا الموظف');
    } else if (currentStep === 'HR') {
      // Route to HR decision
      return this.hrDecision(id, approverId, 'REJECTED', notes, attachments);
    } else {
      throw new BadRequestException('هذا الطلب تم البت فيه مسبقاً');
    }
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

  // ==================== Workflow: Manager Inbox ====================

  async getManagerInbox(managerId: string, companyId: string) {
    // استخدام نظام الصلاحيات للحصول على الموظفين المتاحين
    // يشمل: المرؤوسين المباشرين + أي موظفين ضمن نطاق صلاحية LETTERS_APPROVE_MANAGER
    const accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(
      managerId,
      companyId,
      'LETTERS_APPROVE_MANAGER',
    );

    if (accessibleEmployeeIds.length === 0) {
      return [];
    }

    return this.prisma.letterRequest.findMany({
      where: {
        userId: { in: accessibleEmployeeIds },
        currentStep: 'MANAGER',
        status: 'PENDING',
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, employeeCode: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==================== Workflow: HR Inbox ====================

  async getHRInbox(hrUserId: string, companyId: string) {
    // جلب الموظفين المتاحين لـ HR بناءً على صلاحياته
    const accessibleIds = await this.permissionsService.getAccessibleEmployeeIds(
      hrUserId,
      companyId,
      'LETTERS_APPROVE_HR'
    );

    return this.prisma.letterRequest.findMany({
      where: {
        currentStep: 'HR',
        status: 'MGR_APPROVED',
        userId: accessibleIds.length > 0 ? { in: accessibleIds } : undefined,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, employeeCode: true },
        },
        managerApprover: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==================== Workflow: Manager Decision ====================

  async managerDecision(
    id: string,
    managerId: string,
    decision: 'APPROVED' | 'REJECTED',
    notes?: string,
    attachments?: any[]
  ) {
    const letterRequest = await this.prisma.letterRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!letterRequest) {
      throw new NotFoundException('طلب الخطاب غير موجود');
    }

    // التحقق من أن المدير هو المسؤول عن هذا الطلب
    if (letterRequest.managerApproverId !== managerId) {
      throw new ForbiddenException('ليس لديك صلاحية الموافقة على هذا الطلب');
    }

    if (letterRequest.currentStep !== 'MANAGER') {
      throw new BadRequestException('هذا الطلب ليس في مرحلة موافقة المدير');
    }

    const updateData: any = {
      managerDecision: decision,
      managerDecisionAt: new Date(),
      managerNotes: notes,
      managerAttachments: attachments,
    };

    if (decision === 'APPROVED') {
      updateData.status = 'MGR_APPROVED';
      updateData.currentStep = 'HR';
    } else {
      updateData.status = 'MGR_REJECTED';
      updateData.currentStep = 'COMPLETED';
    }

    const updated = await this.prisma.letterRequest.update({
      where: { id },
      data: updateData,
      include: {
        user: true,
        managerApprover: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Create audit log
    await this.prisma.approvalLog.create({
      data: {
        requestType: 'LETTER',
        requestId: id,
        step: 'MANAGER',
        decision,
        notes,
        byUserId: managerId,
      },
    });

    // Notify employee
    await this.notificationsService.sendNotification(
      letterRequest.userId,
      decision === 'APPROVED' ? 'GENERAL' as any : 'GENERAL' as any,
      decision === 'APPROVED' ? 'موافقة المدير على طلب الخطاب' : 'رفض المدير لطلب الخطاب',
      decision === 'APPROVED'
        ? `وافق مديرك على طلب الخطاب (${this.getLetterTypeName(letterRequest.type)}) - في انتظار موافقة HR`
        : `رفض مديرك طلب الخطاب (${this.getLetterTypeName(letterRequest.type)})${notes ? ': ' + notes : ''}`,
      { letterRequestId: id },
    );

    return updated;
  }

  // ==================== Workflow: HR Decision ====================

  async hrDecision(
    id: string,
    hrUserId: string,
    decision: 'APPROVED' | 'REJECTED' | 'DELAYED',
    notes?: string,
    attachments?: any[]
  ) {
    const letterRequest = await this.prisma.letterRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!letterRequest) {
      throw new NotFoundException('طلب الخطاب غير موجود');
    }

    if (letterRequest.currentStep !== 'HR') {
      throw new BadRequestException('هذا الطلب ليس في مرحلة موافقة HR');
    }

    // التحقق من صلاحية HR
    const accessibleIds = await this.permissionsService.getAccessibleEmployeeIds(
      hrUserId,
      letterRequest.companyId || '',
      'LETTERS_APPROVE_HR'
    );
    if (!accessibleIds.includes(letterRequest.userId)) {
      throw new ForbiddenException('ليس لديك صلاحية الموافقة على طلبات هذا الموظف');
    }

    const updateData: any = {
      hrApproverId: hrUserId,
      hrDecision: decision,
      hrDecisionAt: new Date(),
      hrDecisionNotes: notes,
      hrAttachments: attachments,
    };

    if (decision === 'APPROVED') {
      updateData.status = 'APPROVED';
      updateData.currentStep = 'COMPLETED';
    } else if (decision === 'REJECTED') {
      updateData.status = 'REJECTED';
      updateData.currentStep = 'COMPLETED';
    } else {
      updateData.status = 'DELAYED';
    }

    const updated = await this.prisma.letterRequest.update({
      where: { id },
      data: updateData,
      include: {
        user: true,
        managerApprover: {
          select: { id: true, firstName: true, lastName: true },
        },
        hrApprover: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Create audit log
    await this.prisma.approvalLog.create({
      data: {
        requestType: 'LETTER',
        requestId: id,
        step: 'HR',
        decision,
        notes,
        byUserId: hrUserId,
      },
    });

    // Notify employee
    let message = '';
    if (decision === 'APPROVED') {
      message = `تمت الموافقة النهائية على طلب الخطاب (${this.getLetterTypeName(letterRequest.type)})`;
    } else if (decision === 'REJECTED') {
      message = `تم رفض طلب الخطاب من HR (${this.getLetterTypeName(letterRequest.type)})${notes ? ': ' + notes : ''}`;
    } else {
      message = `تم تأجيل طلب الخطاب (${this.getLetterTypeName(letterRequest.type)})${notes ? ': ' + notes : ''}`;
    }

    await this.notificationsService.sendNotification(
      letterRequest.userId,
      'GENERAL' as any,
      decision === 'APPROVED' ? 'الموافقة النهائية على الخطاب' : decision === 'REJECTED' ? 'رفض طلب الخطاب' : 'تأجيل طلب الخطاب',
      message,
      { letterRequestId: id },
    );

    return updated;
  }

  private getLetterTypeName(type: LetterType): string {
    const names: Record<string, string> = {
      // New letter types
      SALARY_DEFINITION: 'خطاب تعريف راتب',
      SERVICE_CONFIRMATION: 'خطاب تأكيد خدمة',
      SALARY_ADJUSTMENT: 'خطاب تعديل راتب',
      PROMOTION: 'خطاب ترقية',
      TRANSFER_ASSIGNMENT: 'خطاب نقل / تكليف',
      RESIGNATION: 'خطاب استقالة',
      TERMINATION: 'خطاب إنهاء خدمة',
      CLEARANCE: 'خطاب إخلاء طرف',
      EXPERIENCE: 'خطاب خبرة',
      SALARY_DEFINITION_DIRECTED: 'خطاب تعريف راتب (موجّه)',
      NOC: 'خطاب عدم ممانعة',
      DELEGATION: 'خطاب تفويض',
      // Old types for backward compatibility
      REQUEST: 'طلب',
      COMPLAINT: 'شكوى',
      CERTIFICATION: 'تصديق',
    };
    return names[type] || type;
  }
}

