import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PermissionsService } from '../permissions/permissions.service';
import { TimezoneService } from '../../common/services/timezone.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { LeaveQueryDto } from './dto/leave-query.dto';
import { NotificationType } from '@prisma/client';
import { SmartPolicyTrigger } from "@prisma/client";
import { SmartPolicyTriggerService } from "../smart-policies/smart-policy-trigger.service";

@Injectable()
export class LeavesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private permissionsService: PermissionsService,
    private smartPolicyTrigger: SmartPolicyTriggerService,
    private timezoneService: TimezoneService,
  ) { }

  /**
   * الحصول على أرصدة جميع أنواع الإجازات للموظف
   * يعرض تفاصيل كل نوع إجازة مع الاستحقاق والمستخدم والمتبقي
   */
  async getEmployeeLeaveBalances(userId: string, year?: number) {
    const targetYear = year || new Date().getFullYear();

    // Get user data
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyId: true,
        hireDate: true,
        annualLeaveDays: true,
        remainingLeaveDays: true,
      },
    });

    if (!user || !user.companyId) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    // Get all leave types for the company
    const leaveTypes = await this.prisma.leaveTypeConfig.findMany({
      where: {
        companyId: user.companyId,
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Get leave balances for the user
    const balances = await this.prisma.leaveBalance.findMany({
      where: {
        userId,
        year: targetYear,
      },
      include: {
        leaveType: true,
      },
    });

    // Get pending and approved leave requests for current year
    const leaveRequests = await this.prisma.leaveRequest.findMany({
      where: {
        userId,
        startDate: {
          gte: new Date(targetYear, 0, 1),
          lte: new Date(targetYear, 11, 31),
        },
      },
      select: {
        id: true,
        type: true,
        leaveTypeConfigId: true,
        status: true,
        requestedDays: true,
        approvedDays: true,
      },
    });

    // Build response with all types
    const balanceDetails = leaveTypes.map((leaveType) => {
      const balance = balances.find(b => b.leaveTypeId === leaveType.id);
      const typeRequests = leaveRequests.filter(r =>
        r.leaveTypeConfigId === leaveType.id || r.type === leaveType.code
      );

      const pendingDays = typeRequests
        .filter(r => ['PENDING', 'MGR_APPROVED'].includes(r.status))
        .reduce((sum, r) => sum + (r.requestedDays || 0), 0);

      const usedDays = typeRequests
        .filter(r => r.status === 'APPROVED')
        .reduce((sum, r) => sum + (r.approvedDays || r.requestedDays || 0), 0);

      const entitled = balance ? Number(balance.entitled) : leaveType.defaultEntitlement;
      const carriedForward = balance ? Number(balance.carriedForward) : 0;
      const totalAvailable = entitled + carriedForward;
      const remaining = totalAvailable - usedDays - pendingDays;

      // Calculate percentage for progress bar
      const usagePercentage = totalAvailable > 0
        ? Math.round(((usedDays + pendingDays) / totalAvailable) * 100)
        : 0;

      return {
        id: leaveType.id,
        code: leaveType.code,
        nameAr: leaveType.nameAr,
        nameEn: leaveType.nameEn,
        category: leaveType.category,
        isPaid: leaveType.isPaid,
        color: this.getLeaveTypeColor(leaveType.category),
        icon: this.getLeaveTypeIcon(leaveType.category),

        // Balances
        entitled,
        carriedForward,
        totalAvailable,
        used: usedDays,
        pending: pendingDays,
        remaining: Math.max(0, remaining),

        // Progress
        usagePercentage: Math.min(100, usagePercentage),
        isLowBalance: remaining <= 3 && totalAvailable > 0,
        allowNegativeBalance: leaveType.allowNegativeBalance,

        // Details
        maxCarryForward: leaveType.maxCarryForwardDays,
        maxBalanceCap: leaveType.maxBalanceCap,
      };
    });

    // Calculate totals
    const totals = {
      totalEntitled: balanceDetails.reduce((sum, b) => sum + b.entitled, 0),
      totalUsed: balanceDetails.reduce((sum, b) => sum + b.used, 0),
      totalPending: balanceDetails.reduce((sum, b) => sum + b.pending, 0),
      totalRemaining: balanceDetails.reduce((sum, b) => sum + b.remaining, 0),
    };

    return {
      year: targetYear,
      employee: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        hireDate: user.hireDate,
      },
      balances: balanceDetails,
      totals,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get color for leave type category
   */
  private getLeaveTypeColor(category: string): string {
    const colors: Record<string, string> = {
      ANNUAL: '#4CAF50',
      SICK: '#FF9800',
      EMERGENCY: '#F44336',
      UNPAID: '#9E9E9E',
      MATERNITY: '#E91E63',
      PATERNITY: '#2196F3',
      HAJJ: '#795548',
      MARRIAGE: '#9C27B0',
      DEATH: '#607D8B',
      OFFICIAL: '#3F51B5',
    };
    return colors[category] || '#757575';
  }

  /**
   * Get icon for leave type category
   */
  private getLeaveTypeIcon(category: string): string {
    const icons: Record<string, string> = {
      ANNUAL: 'beach_access',
      SICK: 'local_hospital',
      EMERGENCY: 'warning',
      UNPAID: 'money_off',
      MATERNITY: 'child_care',
      PATERNITY: 'face',
      HAJJ: 'mosque',
      MARRIAGE: 'favorite',
      DEATH: 'sentiment_very_dissatisfied',
      OFFICIAL: 'business',
    };
    return icons[category] || 'event';
  }

  /**
   * تصحيح استحقاقات أنواع الإجازات حسب نظام العمل السعودي
   */
  async fixLeaveEntitlements(companyId: string) {
    const updates = [
      { code: 'ANNUAL', defaultEntitlement: 21 },
      { code: 'SICK', defaultEntitlement: 30 },
      { code: 'MARRIAGE', defaultEntitlement: 5 },
      { code: 'BEREAVEMENT', defaultEntitlement: 5 },
      { code: 'NEW_BABY', defaultEntitlement: 3 },
      { code: 'HAJJ', defaultEntitlement: 15 },
      { code: 'EXAM', defaultEntitlement: 0 },
      { code: 'BUSINESS_TRIP', defaultEntitlement: 0 },
      { code: 'UNPAID', defaultEntitlement: 0 },
    ];

    const results = [];

    for (const update of updates) {
      const result = await this.prisma.leaveTypeConfig.updateMany({
        where: { companyId, code: update.code },
        data: { defaultEntitlement: update.defaultEntitlement },
      });
      results.push({ code: update.code, updated: result.count });
    }

    // تحديث أرصدة الموظفين
    const currentYear = new Date().getFullYear();
    const leaveTypes = await this.prisma.leaveTypeConfig.findMany({
      where: { companyId },
    });

    for (const leaveType of leaveTypes) {
      await this.prisma.leaveBalance.updateMany({
        where: {
          leaveTypeId: leaveType.id,
          year: currentYear,
        },
        data: {
          entitled: leaveType.defaultEntitlement,
        },
      });
    }

    return {
      message: 'تم تحديث استحقاقات الإجازات بنجاح حسب نظام العمل السعودي',
      updates: results,
    };
  }

  async createLeaveRequest(userId: string, companyId: string, createLeaveDto: CreateLeaveRequestDto) {
    const { type, startDate, endDate, reason, notes, attachments } = createLeaveDto;
    const leaveNotes = reason || notes || '';

    // Attachments are already parsed by the time they arrive here

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      throw new BadRequestException('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
    }

    // Calculate requested days
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const requestedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Check user's remaining leave balance
    const user = await this.prisma.user.findFirst({ where: { id: userId, companyId } });
    if (user && user.remainingLeaveDays < requestedDays) {
      throw new BadRequestException(`رصيد الإجازات غير كافي. المتبقي: ${user.remainingLeaveDays} يوم`);
    }

    // Check for overlapping leaves - Issue #46: Include all active statuses
    const existingLeave = await this.prisma.leaveRequest.findFirst({
      where: {
        userId,
        companyId,
        status: { in: ['PENDING', 'APPROVED', 'MGR_APPROVED', 'DELAYED'] }, // All active statuses
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } },
        ],
      },
    });

    if (existingLeave) {
      throw new BadRequestException('يوجد طلب إجازة متداخل مع هذه الفترة');
    }

    // Get user's manager to save as approver at submission time
    const userWithManager = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { managerId: true },
    });

    const leaveRequest = await this.prisma.leaveRequest.create({
      data: {
        userId,
        companyId,
        type,
        startDate: start,
        endDate: end,
        requestedDays,
        notes: leaveNotes,
        reason: leaveNotes,
        attachments: attachments && attachments.length > 0
          ? attachments as unknown as any
          : undefined,
        // Workflow fields
        currentStep: 'MANAGER',
        managerApproverId: userWithManager?.managerId || null,
        managerDecision: 'PENDING',
        hrDecision: 'PENDING',
      },
      include: {
        user: {
          select: { firstName: true, lastName: true, managerId: true },
        },
      },
    });

    // Issue #40: Notify direct manager, department manager, AND HR users
    const leaveWithUser = leaveRequest as typeof leaveRequest & { user: { firstName: string; lastName: string; managerId: string | null; departmentId?: string | null } };
    const notificationPromises: Promise<any>[] = [];
    const notificationMessage = `${leaveWithUser.user.firstName} ${leaveWithUser.user.lastName} طلب ${this.getLeaveTypeName(type)}`;

    // 1. Notify direct manager
    if (leaveWithUser.user?.managerId) {
      notificationPromises.push(
        this.notificationsService.sendNotification(
          leaveWithUser.user.managerId,
          NotificationType.GENERAL,
          'طلب إجازة جديد',
          notificationMessage,
          { leaveRequestId: leaveRequest.id },
        )
      );
    }

    // 2. Notify department manager - REMOVED: managerId doesn't exist in Department model
    // Department notifications handled via HR users below

    // 3. Notify HR users
    const hrUsers = await this.prisma.user.findMany({
      where: { companyId, role: 'HR', status: 'ACTIVE' },
      select: { id: true },
      take: 5, // Limit to 5 HR users to avoid spam
    });
    for (const hr of hrUsers) {
      notificationPromises.push(
        this.notificationsService.sendNotification(
          hr.id,
          NotificationType.GENERAL,
          'طلب إجازة جديد للمراجعة',
          notificationMessage,
          { leaveRequestId: leaveRequest.id },
        )
      );
    }

    // Execute all notifications in parallel
    await Promise.allSettled(notificationPromises);

    return leaveRequest;
  }

  async getMyLeaveRequests(userId: string, companyId: string, query: LeaveQueryDto) {
    const { status, type, page = 1, limit = 20 } = query;

    const where: any = { userId, companyId };
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

  async getLeaveRequestById(id: string, companyId: string, userId?: string) {
    const leaveRequest = await this.prisma.leaveRequest.findFirst({
      where: { id, companyId },
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

  /**
   * جلب تفاصيل طلب الإجازة مع معلومات الموظف الكاملة (للمدير/HR)
   * تشمل: أيام الإجازة المتبقية، تاريخ التوظيف، الفرع، القسم، طلبات السنة الحالية
   */
  async getLeaveRequestWithEmployeeContext(id: string, companyId: string, requesterId: string) {
    const leaveRequest = await this.prisma.leaveRequest.findFirst({
      where: { id, companyId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            jobTitle: true,
            hireDate: true,
            annualLeaveDays: true,
            usedLeaveDays: true,
            remainingLeaveDays: true,
            branch: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
          },
        },
        approver: { select: { firstName: true, lastName: true } },
        managerApprover: { select: { firstName: true, lastName: true } },
        hrApprover: { select: { firstName: true, lastName: true } },
      },
    });

    if (!leaveRequest) {
      throw new NotFoundException('طلب الإجازة غير موجود');
    }

    // Check requester permissions
    const requester = await this.prisma.user.findUnique({ where: { id: requesterId } });
    if (!requester) {
      throw new ForbiddenException('مستخدم غير موجود');
    }

    // Only managers, HR, and admins can access this
    if (requester.role === 'EMPLOYEE' && leaveRequest.userId !== requesterId) {
      throw new ForbiddenException('غير مصرح بالوصول لهذا الطلب');
    }

    // Get current year leave requests for this employee
    const currentYear = new Date().getFullYear();
    const { startOfYear, endOfYear } = this.timezoneService.getYearRange(currentYear);

    const currentYearLeaveRequests = await this.prisma.leaveRequest.findMany({
      where: {
        userId: leaveRequest.userId,
        createdAt: {
          gte: startOfYear,
          lte: endOfYear,
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        startDate: true,
        endDate: true,
        requestedDays: true,
        approvedDays: true,
        status: true,
        createdAt: true,
      },
    });

    // Calculate leave summary
    const leaveSummary = {
      totalRequests: currentYearLeaveRequests.length,
      approvedDays: currentYearLeaveRequests
        .filter(r => r.status === 'APPROVED')
        .reduce((sum, r) => sum + (r.approvedDays || r.requestedDays), 0),
      pendingDays: currentYearLeaveRequests
        .filter(r => r.status === 'PENDING')
        .reduce((sum, r) => sum + r.requestedDays, 0),
      rejectedRequests: currentYearLeaveRequests.filter(r => r.status === 'REJECTED').length,
    };

    // Cast for type safety with included relations
    const leaveData = leaveRequest as any;

    return {
      ...leaveData,
      employeeContext: {
        hireDate: leaveData.user?.hireDate,
        annualLeaveDays: leaveData.user?.annualLeaveDays,
        usedLeaveDays: leaveData.user?.usedLeaveDays,
        remainingLeaveDays: leaveData.user?.remainingLeaveDays,
        branch: leaveData.user?.branch,
        department: leaveData.user?.department,
      },
      currentYearLeaveRequests,
      leaveSummary,
    };
  }

  async cancelLeaveRequest(id: string, companyId: string, userId: string) {
    const leaveRequest = await this.prisma.leaveRequest.findFirst({
      where: { id, companyId },
    });

    if (!leaveRequest) {
      throw new NotFoundException('طلب الإجازة غير موجود');
    }

    if (leaveRequest.userId !== userId) {
      throw new ForbiddenException('لا يمكنك إلغاء طلب إجازة شخص آخر');
    }

    // Issue #37: Allow cancellation of PENDING and MGR_APPROVED (before HR approval)
    if (!['PENDING', 'MGR_APPROVED'].includes(leaveRequest.status)) {
      throw new BadRequestException('لا يمكن إلغاء طلب تمت الموافقة عليه بالكامل');
    }

    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  // ============ Manager/Admin Methods ============

  async getPendingRequests(userId: string, companyId: string, query?: LeaveQueryDto) {
    const { page = 1, limit = 20, status = 'PENDING' } = query || {};

    // Get accessible employee IDs based on LEAVES_VIEW OR LEAVES_APPROVE_MANAGER permission
    // Combine both permissions to get all employees the user can access
    const [viewAccessible, approveAccessible] = await Promise.all([
      this.permissionsService.getAccessibleEmployeeIds(userId, companyId, 'LEAVES_VIEW'),
      this.permissionsService.getAccessibleEmployeeIds(userId, companyId, 'LEAVES_APPROVE_MANAGER'),
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
      companyId,
      userId: { in: accessibleEmployeeIds },
    };

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

  async approveLeaveRequest(id: string, companyId: string, approverId: string, notes?: string) {
    const leaveRequest = await this.prisma.leaveRequest.findFirst({
      where: { id, companyId },
      include: { user: true },
    });

    if (!leaveRequest) {
      throw new NotFoundException('طلب الإجازة غير موجود');
    }

    // Route through workflow based on currentStep
    const currentStep = leaveRequest.currentStep || 'MANAGER';

    if (currentStep === 'MANAGER') {
      // Check if this user is the assigned manager approver
      if (leaveRequest.managerApproverId === approverId) {
        return this.managerDecision(id, companyId, approverId, 'APPROVED', notes);
      }

      // Or check if they have general LEAVES_APPROVE_MANAGER permission
      const canApprove = await this.permissionsService.canAccessEmployee(
        approverId,
        companyId,
        'LEAVES_APPROVE_MANAGER',
        leaveRequest.userId
      );
      if (canApprove.hasAccess) {
        return this.managerDecision(id, companyId, approverId, 'APPROVED', notes);
      }

      throw new ForbiddenException('ليس لديك صلاحية الموافقة على طلبات هذا الموظف');
    } else if (currentStep === 'HR') {
      // Route to HR decision
      return this.hrDecision(id, companyId, approverId, 'APPROVED', notes);
    } else {
      throw new BadRequestException('هذا الطلب تم البت فيه مسبقاً');
    }
  }

  async rejectLeaveRequest(id: string, companyId: string, approverId: string, notes?: string) {
    const leaveRequest = await this.prisma.leaveRequest.findFirst({
      where: { id, companyId },
    });

    if (!leaveRequest) {
      throw new NotFoundException('طلب الإجازة غير موجود');
    }

    // Route through workflow based on currentStep
    const currentStep = leaveRequest.currentStep || 'MANAGER';

    if (currentStep === 'MANAGER') {
      // Check if this user is the assigned manager approver
      if (leaveRequest.managerApproverId === approverId) {
        return this.managerDecision(id, companyId, approverId, 'REJECTED', notes);
      }

      // Or check if they have general LEAVES_APPROVE_MANAGER permission
      const canApprove = await this.permissionsService.canAccessEmployee(
        approverId,
        companyId,
        'LEAVES_APPROVE_MANAGER',
        leaveRequest.userId
      );
      if (canApprove.hasAccess) {
        return this.managerDecision(id, companyId, approverId, 'REJECTED', notes);
      }

      throw new ForbiddenException('ليس لديك صلاحية رفض طلبات هذا الموظف');
    } else if (currentStep === 'HR') {
      // Route to HR decision
      return this.hrDecision(id, companyId, approverId, 'REJECTED', notes);
    } else {
      throw new BadRequestException('هذا الطلب تم البت فيه مسبقاً');
    }
  }

  async getAllLeaveRequests(companyId: string, query: LeaveQueryDto) {
    const { status, type, userId, page = 1, limit = 20 } = query;

    const where: any = { companyId };
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

  async enableWorkFromHome(userId: string, companyId: string, date: Date, reason?: string, approverId?: string) {
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

    // Issue #50: Check consecutive WFH days limit (max 7 days)
    const MAX_CONSECUTIVE_WFH_DAYS = 7;
    const recentWfhCount = await this.prisma.workFromHome.count({
      where: {
        userId,
        date: {
          gte: new Date(targetDate.getTime() - (MAX_CONSECUTIVE_WFH_DAYS - 1) * 24 * 60 * 60 * 1000),
          lt: targetDate,
        },
      },
    });

    if (recentWfhCount >= MAX_CONSECUTIVE_WFH_DAYS - 1) {
      throw new BadRequestException(`لا يمكن العمل من المنزل أكثر من ${MAX_CONSECUTIVE_WFH_DAYS} أيام متتالية`);
    }

    return this.prisma.workFromHome.create({
      data: {
        userId,
        companyId,
        date: targetDate,
        reason,
        approvedBy: approverId,
      },
    });
  }

  async disableWorkFromHome(userId: string, companyId: string, date: Date) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // Issue #35: Verify WFH record exists before attempting delete
    const existingWfh = await this.prisma.workFromHome.findUnique({
      where: {
        userId_date: {
          userId,
          date: targetDate,
        },
      },
    });

    if (!existingWfh) {
      throw new NotFoundException('لا يوجد سجل عمل من المنزل لهذا اليوم');
    }

    // Verify company match for security
    if (existingWfh.companyId !== companyId) {
      throw new ForbiddenException('لا يمكنك إلغاء سجل عمل من شركة أخرى');
    }

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
      NEW_BABY: 'مولود جديد',
      MARRIAGE: 'إجازة زواج',
      BEREAVEMENT: 'إجازة وفاة',
      HAJJ: 'إجازة حج',
      EXAM: 'إجازة اختبارات',
      WORK_MISSION: 'مهمة عمل',
      UNPAID: 'إجازة بدون راتب',
    };
    return types[type] || type;
  }

  private async createLeaveAttendanceRecords(leaveRequest: any) {
    const user = await this.prisma.user.findFirst({
      where: { id: leaveRequest.userId, companyId: leaveRequest.companyId },
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
          companyId: leaveRequest.companyId,
          branchId: user.branchId,
          date: targetDate,
          status: 'ON_LEAVE',
          notes: `${this.getLeaveTypeName(leaveRequest.type)}${leaveRequest.notes ? ': ' + leaveRequest.notes : ''}`,
        },
        update: {
          status: 'ON_LEAVE',
          notes: `${this.getLeaveTypeName(leaveRequest.type)}${leaveRequest.notes ? ': ' + leaveRequest.notes : ''}`,
        },
      });
    }
  }

  // Issue #31: Updated to use User table for leave balance
  private async deductLeaveBalance(userId: string, companyId: string, days: number, leaveTypeId?: string) {
    // Note: LeaveBalanceService integration removed due to missing injection
    // TODO: Add LeaveBalanceService to constructor if needed

    // ✅ Also update User table for backward compatibility
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
      select: { remainingLeaveDays: true, annualLeaveDays: true },
    });

    if (user) {
      const remaining = Number(user.remainingLeaveDays) || 0;
      if (remaining < days) {
        console.warn(`⚠️ Insufficient leave balance for user ${userId}: remaining=${remaining}, deducting=${days}`);
      }
    }

    await this.prisma.user.updateMany({
      where: { id: userId, companyId },
      data: {
        usedLeaveDays: { increment: days },
        remainingLeaveDays: { decrement: days },
      },
    });
  }

  // ==================== Workflow: Manager Inbox ====================

  async getManagerInbox(managerId: string, companyId: string) {
    // استخدام نظام الصلاحيات للحصول على الموظفين المتاحين
    // يشمل: المرؤوسين المباشرين + أي موظفين ضمن نطاق صلاحية LEAVES_APPROVE_MANAGER
    const accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(
      managerId,
      companyId,
      'LEAVES_APPROVE_MANAGER',
    );

    if (accessibleEmployeeIds.length === 0) {
      return [];
    }

    return this.prisma.leaveRequest.findMany({
      where: {
        companyId,
        userId: { in: accessibleEmployeeIds },
        currentStep: 'MANAGER',
        status: 'PENDING',
      },
      orderBy: { createdAt: 'asc' },
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
    });
  }

  // ==================== Workflow: HR Inbox ====================

  async getHRInbox(hrUserId: string, companyId: string) {
    // HR sees requests that have manager approval and are in HR step
    // Filter by scope using permissions service
    const accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(
      hrUserId,
      companyId,
      'LEAVES_APPROVE_HR',
    );

    if (accessibleEmployeeIds.length === 0) {
      return [];
    }

    return this.prisma.leaveRequest.findMany({
      where: {
        companyId,
        userId: { in: accessibleEmployeeIds },
        currentStep: 'HR',
        status: 'MGR_APPROVED',
      },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            jobTitle: true,
            department: { select: { name: true } },
            branch: { select: { name: true } },
          },
        },
        managerApprover: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }

  // ==================== Workflow: Manager Decision ====================

  async managerDecision(
    requestId: string,
    companyId: string,
    managerId: string,
    decision: 'APPROVED' | 'REJECTED',
    notes?: string,
  ) {
    const request = await this.prisma.leaveRequest.findFirst({
      where: { id: requestId, companyId },
      include: { user: true },
    });

    if (!request) {
      throw new NotFoundException('طلب الإجازة غير موجود');
    }

    // Verify this manager has permission (either assigned approver OR general permission)
    if (request.managerApproverId !== managerId) {
      // Check if they have general LEAVES_APPROVE_MANAGER permission
      const canApprove = await this.permissionsService.canAccessEmployee(
        managerId,
        companyId,
        'LEAVES_APPROVE_MANAGER',
        request.userId
      );
      if (!canApprove.hasAccess) {
        throw new ForbiddenException('ليس لديك صلاحية للموافقة على هذا الطلب');
      }
    }

    // Verify request is in correct step
    if (request.currentStep !== 'MANAGER') {
      throw new BadRequestException('هذا الطلب ليس في مرحلة موافقة المدير');
    }

    if (decision === 'APPROVED') {
      // Move to HR step
      await this.prisma.leaveRequest.update({
        where: { id: requestId },
        data: {
          managerDecision: 'APPROVED',
          managerDecisionAt: new Date(),
          managerNotes: notes,
          currentStep: 'HR',
          status: 'MGR_APPROVED',
        },
      });

      // Issue #26: Notify HR users about pending approval
      const hrUsers = await this.prisma.user.findMany({
        where: {
          companyId,
          role: { in: ['HR', 'ADMIN'] },
        },
        select: { id: true },
      });

      for (const hrUser of hrUsers) {
        await this.notificationsService.sendNotification(
          hrUser.id,
          NotificationType.GENERAL, // Use NotificationType enum
          'طلب إجازة يحتاج موافقتك',
          `${request.user.firstName} ${request.user.lastName} - طلب ${this.getLeaveTypeName(request.type)} يحتاج موافقة HR`,
          { leaveRequestId: requestId, employeeId: request.userId },
        );
      }
    } else {
      // Rejected - request is done
      await this.prisma.leaveRequest.update({
        where: { id: requestId },
        data: {
          managerDecision: 'REJECTED',
          managerDecisionAt: new Date(),
          managerNotes: notes,
          currentStep: 'COMPLETED',
          status: 'MGR_REJECTED',
        },
      });

      // Notify employee
      await this.notificationsService.sendNotification(
        request.userId,
        'LEAVE_REJECTED',
        'تم رفض طلب الإجازة',
        `تم رفض طلب إجازتك من قبل المدير${notes ? ': ' + notes : ''}`,
        { leaveRequestId: requestId },
      );
    }

    // Log the decision
    await this.prisma.approvalLog.create({
      data: {
        companyId,
        requestType: 'LEAVE',
        requestId,
        step: 'MANAGER',
        decision,
        notes,
        byUserId: managerId,
      },
    });

    return this.prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: { user: true, managerApprover: true },
    });
  }

  // ==================== Workflow: HR Decision ====================

  async hrDecision(
    requestId: string,
    companyId: string,
    hrUserId: string,
    decision: 'APPROVED' | 'REJECTED' | 'DELAYED',
    notes?: string,
  ) {
    const request = await this.prisma.leaveRequest.findFirst({
      where: { id: requestId, companyId },
      include: { user: true },
    });

    if (!request) {
      throw new NotFoundException('طلب الإجازة غير موجود');
    }

    // Verify request is in HR step
    if (request.currentStep !== 'HR') {
      throw new BadRequestException('هذا الطلب ليس في مرحلة موافقة HR');
    }

    // Verify HR has permission for this employee
    const accessibleIds = await this.permissionsService.getAccessibleEmployeeIds(
      hrUserId,
      companyId,
      'LEAVES_APPROVE_HR',
    );
    if (!accessibleIds.includes(request.userId)) {
      throw new ForbiddenException('ليس لديك صلاحية للموافقة على طلب هذا الموظف');
    }

    if (decision === 'APPROVED') {
      await this.prisma.leaveRequest.update({
        where: { id: requestId },
        data: {
          hrDecision: 'APPROVED',
          hrDecisionAt: new Date(),
          hrDecisionNotes: notes,
          hrApproverId: hrUserId,
          currentStep: 'COMPLETED',
          status: 'APPROVED',
          approvedDays: request.requestedDays,
          approvedAt: new Date(),
        },
      });

      // Deduct leave balance
      await this.deductLeaveBalance(request.userId, companyId, request.requestedDays);

      // Create attendance records for leave days
      await this.createLeaveAttendanceRecords(request);

      // Notify employee
      await this.notificationsService.sendNotification(
        request.userId,
        'LEAVE_APPROVED',
        'تمت الموافقة على طلب الإجازة',
        `تمت الموافقة النهائية على طلب إجازتك`,
        { leaveRequestId: requestId },
      );
    } else if (decision === 'REJECTED') {
      await this.prisma.leaveRequest.update({
        where: { id: requestId },
        data: {
          hrDecision: 'REJECTED',
          hrDecisionAt: new Date(),
          hrDecisionNotes: notes,
          hrApproverId: hrUserId,
          currentStep: 'COMPLETED',
          status: 'REJECTED',
        },
      });

      await this.notificationsService.sendNotification(
        request.userId,
        'LEAVE_REJECTED',
        'تم رفض طلب الإجازة',
        `تم رفض طلب إجازتك من قبل HR${notes ? ': ' + notes : ''}`,
        { leaveRequestId: requestId },
      );
    } else if (decision === 'DELAYED') {
      await this.prisma.leaveRequest.update({
        where: { id: requestId },
        data: {
          hrDecision: 'DELAYED',
          hrDecisionAt: new Date(),
          hrDecisionNotes: notes,
          hrApproverId: hrUserId,
          status: 'DELAYED',
        },
      });

      await this.notificationsService.sendNotification(
        request.userId,
        NotificationType.GENERAL,
        'تم تأجيل طلب الإجازة',
        `تم تأجيل طلب إجازتك${notes ? ': ' + notes : ''}`,
        { leaveRequestId: requestId },
      );
    }

    // Log the decision
    await this.prisma.approvalLog.create({
      data: {
        companyId, // Security fix: Add missing companyId
        requestType: 'LEAVE',
        requestId,
        step: 'HR',
        decision,
        notes,
        byUserId: hrUserId,
      },
    });

    return this.prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: { user: true, managerApprover: true, hrApprover: true },
    });
  }
}
