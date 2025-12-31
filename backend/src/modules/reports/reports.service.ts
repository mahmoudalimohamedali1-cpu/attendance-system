import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ExportService } from './services/export.service';
import { ReportQueryDto } from './dto/report-query.dto';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private exportService: ExportService,
    private permissionsService: PermissionsService,
  ) { }

  /**
   * Get payroll metrics for the current month or latest available
   */
  private async getPayrollSummaryMetrics(companyId: string) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // 1. Try to get current month period
    let period = await this.prisma.payrollPeriod.findFirst({
      where: { companyId, year, month }
    });

    // 2. Try to get run for current period
    let run = null;
    if (period) {
      run = await this.prisma.payrollRun.findFirst({
        where: { companyId, periodId: period.id, isAdjustment: false },
        include: {
          payslips: {
            include: {
              lines: { include: { component: true } }
            }
          }
        }
      });
    }

    // 3. Fallback: Get most recent run with payslips
    if (!run || run.payslips.length === 0) {
      run = await this.prisma.payrollRun.findFirst({
        where: {
          companyId,
          isAdjustment: false,
          payslips: { some: {} } // Has at least one payslip
        },
        orderBy: { createdAt: 'desc' },
        include: {
          period: true,
          payslips: {
            include: {
              lines: { include: { component: true } }
            }
          }
        }
      });
      if (run) period = run.period as any;
    }

    if (!run || run.payslips.length === 0) {
      return {
        employerGosiTotal: 0,
        eosSettlementTotal: 0,
        ledgerDraftAmount: 0,
        ledgerPostedAmount: 0,
        periodName: 'لا يوجد بيانات رواتب'
      };
    }

    const employerGosiTotal = run.payslips.reduce((sum, p) =>
      sum + p.lines.reduce((s, l) => (l.component.code.startsWith('GOSI_') && l.component.code !== 'GOSI_DED' ? s + Number(l.amount) : s), 0), 0);

    const eosSettlementTotal = run.payslips.reduce((sum, p) =>
      sum + p.lines.reduce((s, l) => (l.component.code === 'EOS_SETTLEMENT' ? s + Number(l.amount) : s), 0), 0);

    const ledger = await this.prisma.payrollLedger.findFirst({
      where: { runId: run.id }
    });

    return {
      employerGosiTotal,
      eosSettlementTotal,
      ledgerDraftAmount: ledger?.status === 'DRAFT' ? Number(ledger.totalNet) : 0,
      ledgerPostedAmount: ledger?.status === 'POSTED' ? Number(ledger.totalNet) : 0,
      periodName: period ? `${period.month}/${period.year}` : 'فترة غير محددة'
    };
  }

  async getDashboardStats(companyId: string, userId?: string, userRole?: string) {
    const logger = new Logger('ReportsService');
    logger.debug(`Fetching dashboard stats for role: ${userRole}, company: ${companyId}`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get accessible employees based on permissions
    let accessibleEmployeeIds: string[] = [];
    if (userId) {
      accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(userId, companyId, 'REPORTS_VIEW');
    }

    // ADMIN, HR, FINANCE, MANAGER see aggregated dashboard
    if (userRole === 'ADMIN' || userRole === 'HR' || userRole === 'FINANCE' || userRole === 'MANAGER' || accessibleEmployeeIds.length > 0) {
      const isAdminOrHrOrManager = userRole === 'ADMIN' || userRole === 'HR' || userRole === 'MANAGER';

      const employeeFilter = isAdminOrHrOrManager
        ? {}
        : { id: { in: accessibleEmployeeIds } };

      const attendanceFilter = isAdminOrHrOrManager
        ? { date: today }
        : { date: today, userId: { in: accessibleEmployeeIds } };

      const leaveFilter = isAdminOrHrOrManager
        ? { status: 'PENDING' as const }
        : { status: 'PENDING' as const, userId: { in: accessibleEmployeeIds } };

      const letterFilter = isAdminOrHrOrManager
        ? { status: 'PENDING' as const }
        : { status: 'PENDING' as const, userId: { in: accessibleEmployeeIds } };

      const [
        totalEmployees,
        activeEmployees,
        todayAttendance,
        pendingLeaves,
        pendingLetters,
        pendingRaises,
        pendingAdvances,
        pendingDataUpdates,
        missingFaceRegistration,
        suspiciousAttemptsToday,
      ] = await Promise.all([
        this.prisma.user.count({ where: { role: 'EMPLOYEE', ...employeeFilter } }),
        this.prisma.user.count({ where: { role: 'EMPLOYEE', status: 'ACTIVE', ...employeeFilter } }),
        this.prisma.attendance.findMany({
          where: attendanceFilter,
        }),
        this.prisma.leaveRequest.count({ where: leaveFilter }),
        this.prisma.letterRequest.count({ where: letterFilter }),
        this.prisma.raiseRequest.count({ where: { status: 'PENDING' } }),
        this.prisma.advanceRequest.count({ where: { status: 'PENDING' } }),
        this.prisma.dataUpdateRequest.count({ where: { status: 'PENDING' } }),
        this.prisma.user.count({ where: { role: 'EMPLOYEE', status: 'ACTIVE', faceRegistered: false, ...employeeFilter } }),
        this.prisma.suspiciousAttempt.count({
          where: {
            createdAt: { gte: today },
            ...(!isAdminOrHrOrManager ? { userId: { in: accessibleEmployeeIds } } : {})
          }
        }),
      ]);

      const presentToday = todayAttendance.filter((a) => a.checkInTime).length;
      const lateToday = todayAttendance.filter((a) => a.status === 'LATE').length;
      const earlyLeaveToday = todayAttendance.filter((a) => a.status === 'EARLY_LEAVE').length;
      const workFromHomeToday = todayAttendance.filter((a) => a.isWorkFromHome).length;

      const payrollMetrics = await this.getPayrollSummaryMetrics(companyId);
      logger.debug(`Found payroll metrics: ${JSON.stringify(payrollMetrics)}`);

      return {
        employees: {
          total: totalEmployees,
          active: activeEmployees,
        },
        today: {
          present: presentToday,
          late: lateToday,
          earlyLeave: earlyLeaveToday,
          absent: activeEmployees - presentToday,
          workFromHome: workFromHomeToday,
        },
        pendingLeaves,
        pendingLetters,
        pendingRaises,
        pendingAdvances,
        pendingDataUpdates,
        compliance: {
          missingFace: missingFaceRegistration,
          suspiciousToday: suspiciousAttemptsToday,
        },
        financials: payrollMetrics,
      };
    }

    // For EMPLOYEE (or users with no accessible employees): show personal dashboard
    const [
      myAttendanceToday,
      myPendingLeaves,
      myPendingLetters,
      myApprovedLeaves,
      myPendingRaises,
      myPendingAdvances,
      myPendingDataUpdates,
      myUserData,
    ] = await Promise.all([
      this.prisma.attendance.findFirst({
        where: { userId, date: today },
      }),
      this.prisma.leaveRequest.count({ where: { userId, status: 'PENDING' } }),
      this.prisma.letterRequest.count({ where: { userId, status: 'PENDING' } }),
      this.prisma.leaveRequest.count({ where: { userId, status: 'APPROVED' } }),
      this.prisma.raiseRequest.count({ where: { userId, status: 'PENDING' } }),
      this.prisma.advanceRequest.count({ where: { userId, status: 'PENDING' } }),
      this.prisma.dataUpdateRequest.count({ where: { userId, status: 'PENDING' } }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          annualLeaveDays: true,
          usedLeaveDays: true,
          remainingLeaveDays: true,
        },
      }),
    ]);

    return {
      isEmployeeDashboard: true,
      myAttendance: myAttendanceToday ? {
        checkedIn: !!myAttendanceToday.checkInTime,
        checkInTime: myAttendanceToday.checkInTime,
        checkOutTime: myAttendanceToday.checkOutTime,
        status: myAttendanceToday.status,
        workingMinutes: myAttendanceToday.workingMinutes,
      } : null,
      myPendingLeaves,
      myPendingLetters,
      myPendingRaises,
      myPendingAdvances,
      myPendingDataUpdates,
      myApprovedLeaves,
      remainingLeaveDays: myUserData?.remainingLeaveDays ?? 0,
      annualLeaveDays: myUserData?.annualLeaveDays ?? 0,
      usedLeaveDays: myUserData?.usedLeaveDays ?? 0,
      financials: { employerGosiTotal: 0, eosSettlementTotal: 0, ledgerDraftAmount: 0, ledgerPostedAmount: 0 },
    };
  }

  async getWeeklySummary(userId?: string, userRole?: string) {
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 6);
    weekAgo.setHours(0, 0, 0, 0);

    const attendances = await this.prisma.attendance.findMany({
      where: {
        date: {
          gte: weekAgo,
          lte: today,
        },
      },
    });

    // Group by date
    const dailyStats: Record<string, { date: string; present: number; late: number; absent: number }> = {};

    // Initialize all 7 days
    for (let i = 0; i <= 6; i++) {
      const date = new Date(weekAgo);
      date.setDate(weekAgo.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dailyStats[dateStr] = {
        date: dateStr,
        present: 0,
        late: 0,
        absent: 0,
      };
    }

    // Count attendance for each day
    for (const attendance of attendances) {
      const dateStr = attendance.date.toISOString().split('T')[0];
      if (dailyStats[dateStr]) {
        if (attendance.status === 'LATE') {
          dailyStats[dateStr].late++;
          dailyStats[dateStr].present++;
        } else if (attendance.checkInTime) {
          dailyStats[dateStr].present++;
        } else if (attendance.status === 'ABSENT') {
          dailyStats[dateStr].absent++;
        }
      }
    }

    return {
      data: Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  async getAttendanceReport(query: ReportQueryDto, companyId: string, requesterId?: string) {
    const { startDate, endDate, branchId, departmentId, userId } = query;

    // Get accessible employee IDs based on permissions
    let accessibleEmployeeIds: string[] = [];
    if (requesterId) {
      accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(requesterId, companyId, 'REPORTS_VIEW');
      // If no accessible employees, user can only see their own report
      if (accessibleEmployeeIds.length === 0) {
        accessibleEmployeeIds = [requesterId];
      }
    }

    const where: any = {};

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      where.date = { gte: start };
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.date = { ...where.date, lte: end };
    }
    if (branchId) {
      where.branchId = branchId;
    }
    if (departmentId) {
      where.user = { departmentId };
    }

    // Filter by accessible employees or specific userId
    if (userId) {
      // Check if user has access to view this employee
      if (requesterId && !accessibleEmployeeIds.includes(userId)) {
        throw new ForbiddenException('ليس لديك صلاحية لعرض تقرير هذا الموظف');
      }
      where.userId = userId;
    } else if (requesterId) {
      // Only show accessible employees
      where.userId = { in: accessibleEmployeeIds };
    }

    const attendances = await this.prisma.attendance.findMany({
      where,
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
      },
      orderBy: [{ date: 'desc' }, { user: { firstName: 'asc' } }],
    });

    // Aggregate statistics
    const stats = this.calculateAttendanceStats(attendances);

    return {
      data: attendances,
      stats,
      filters: {
        startDate,
        endDate,
        branchId,
        departmentId,
        userId,
      },
    };
  }

  async getEmployeeReport(userId: string, query: ReportQueryDto, companyId: string, requesterId?: string) {
    const { startDate, endDate } = query;

    // Check if requester has access to view this employee's report
    if (requesterId && requesterId !== userId) {
      const accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(requesterId, companyId, 'REPORTS_VIEW');
      if (!accessibleEmployeeIds.includes(userId)) {
        throw new ForbiddenException('ليس لديك صلاحية لعرض تقرير هذا الموظف');
      }
    }

    const where: any = { userId };
    if (startDate) {
      where.date = { gte: new Date(startDate) };
    }
    if (endDate) {
      where.date = { ...where.date, lte: new Date(endDate) };
    }

    const [user, attendances, leaves] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          branch: true,
          department: true,
        },
      }),
      this.prisma.attendance.findMany({
        where,
        orderBy: { date: 'desc' },
      }),
      this.prisma.leaveRequest.findMany({
        where: {
          userId,
          status: 'APPROVED',
          startDate: startDate ? { gte: new Date(startDate) } : undefined,
          endDate: endDate ? { lte: new Date(endDate) } : undefined,
        },
      }),
    ]);

    const stats = this.calculateAttendanceStats(attendances);

    return {
      employee: user,
      attendances,
      leaves,
      stats,
    };
  }

  async getBranchReport(branchId: string, query: ReportQueryDto) {
    const { startDate, endDate } = query;

    const where: any = { branchId };
    if (startDate) {
      where.date = { gte: new Date(startDate) };
    }
    if (endDate) {
      where.date = { ...where.date, lte: new Date(endDate) };
    }

    const [branch, attendances, employeeCount] = await Promise.all([
      this.prisma.branch.findUnique({
        where: { id: branchId },
        include: { departments: true },
      }),
      this.prisma.attendance.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
            },
          },
        },
      }),
      this.prisma.user.count({
        where: { branchId, status: 'ACTIVE', role: 'EMPLOYEE' },
      }),
    ]);

    const stats = this.calculateAttendanceStats(attendances);

    return {
      branch,
      employeeCount,
      attendances,
      stats,
    };
  }

  async getLateReport(query: ReportQueryDto, companyId: string, requesterId?: string) {
    const { startDate, endDate, branchId, departmentId } = query;

    // Get accessible employee IDs based on permissions
    let accessibleEmployeeIds: string[] = [];
    if (requesterId) {
      accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(requesterId, companyId, 'REPORTS_VIEW');
      // If no accessible employees, user can only see their own report
      if (accessibleEmployeeIds.length === 0) {
        accessibleEmployeeIds = [requesterId];
      }
    }

    const where: any = { status: 'LATE' };

    if (startDate) {
      where.date = { gte: new Date(startDate) };
    }
    if (endDate) {
      where.date = { ...where.date, lte: new Date(endDate) };
    }
    if (branchId) {
      where.branchId = branchId;
    }
    if (departmentId) {
      where.user = { departmentId };
    }

    // Filter by accessible employees
    if (requesterId) {
      where.userId = { in: accessibleEmployeeIds };
    }

    const lateRecords = await this.prisma.attendance.findMany({
      where,
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
      },
      orderBy: { date: 'desc' },
    });

    // Group by employee
    const byEmployee = this.groupLateByEmployee(lateRecords);

    return {
      data: lateRecords,
      byEmployee,
      totalLateMinutes: lateRecords.reduce((sum, r) => sum + r.lateMinutes, 0),
      totalLateCount: lateRecords.length,
    };
  }

  async getPayrollSummary(query: ReportQueryDto, companyId: string) {
    const { startDate, endDate, branchId, departmentId } = query;

    const where: any = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      where.date = { gte: start };
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.date = { ...where.date, lte: end };
    }
    if (branchId) {
      where.branchId = branchId;
    }
    if (departmentId) {
      where.user = { departmentId };
    }

    const employees = await this.prisma.user.findMany({
      where: {
        companyId,
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        ...(branchId && { branchId }),
        ...(departmentId && { departmentId }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeCode: true,
        salary: true,
        attendances: {
          where,
        },
      },
    });

    const payrollData = employees.map((emp) => {
      const totalWorkingMinutes = emp.attendances.reduce(
        (sum, a) => sum + a.workingMinutes,
        0,
      );
      const totalLateMinutes = emp.attendances.reduce(
        (sum, a) => sum + a.lateMinutes,
        0,
      );
      const totalEarlyLeaveMinutes = emp.attendances.reduce(
        (sum, a) => sum + a.earlyLeaveMinutes,
        0,
      );
      const totalOvertimeMinutes = emp.attendances.reduce(
        (sum, a) => sum + a.overtimeMinutes,
        0,
      );
      const absentDays = emp.attendances.filter(
        (a) => a.status === 'ABSENT',
      ).length;

      return {
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        baseSalary: emp.salary,
        workingDays: emp.attendances.filter((a) => a.checkInTime).length,
        totalWorkingHours: Math.round(totalWorkingMinutes / 60 * 100) / 100,
        totalLateMinutes,
        totalEarlyLeaveMinutes,
        totalOvertimeMinutes,
        absentDays,
        // Deduction/Bonus calculations (to be customized)
        lateDeduction: this.calculateLateDeduction(totalLateMinutes, emp.salary),
        absentDeduction: this.calculateAbsentDeduction(absentDays, emp.salary),
        overtimeBonus: this.calculateOvertimeBonus(totalOvertimeMinutes, emp.salary),
      };
    });

    return payrollData;
  }

  async exportToExcel(reportType: string, query: ReportQueryDto, companyId: string, requesterId?: string): Promise<Buffer> {
    let data: any;

    switch (reportType) {
      case 'attendance':
        data = await this.getAttendanceReport(query, companyId, requesterId);
        return this.exportService.exportAttendanceToExcel(data.data);
      case 'late':
        data = await this.getLateReport(query, companyId, requesterId);
        return this.exportService.exportLateReportToExcel(data.data);
      case 'payroll':
        data = await this.getPayrollSummary(query, companyId);
        return this.exportService.exportPayrollToExcel(data);
      default:
        throw new Error('نوع التقرير غير معروف');
    }
  }

  async exportToPdf(reportType: string, query: ReportQueryDto, companyId: string, requesterId?: string): Promise<Buffer> {
    let data: any;

    switch (reportType) {
      case 'attendance':
        data = await this.getAttendanceReport(query, companyId, requesterId);
        return this.exportService.exportAttendanceToPdf(data.data);
      case 'employee':
        if (!query.userId) throw new Error('معرف الموظف مطلوب');
        data = await this.getEmployeeReport(query.userId, query, companyId, requesterId);
        return this.exportService.exportEmployeeReportToPdf(data);
      default:
        throw new Error('نوع التقرير غير معروف');
    }
  }

  // Helper methods
  private calculateAttendanceStats(attendances: any[]) {
    return {
      totalDays: attendances.length,
      presentDays: attendances.filter((a) => a.checkInTime).length,
      lateDays: attendances.filter((a) => a.status === 'LATE').length,
      earlyLeaveDays: attendances.filter((a) => a.status === 'EARLY_LEAVE').length,
      absentDays: attendances.filter((a) => a.status === 'ABSENT').length,
      onLeaveDays: attendances.filter((a) => a.status === 'ON_LEAVE').length,
      workFromHomeDays: attendances.filter((a) => a.isWorkFromHome).length,
      totalWorkingMinutes: attendances.reduce((sum, a) => sum + a.workingMinutes, 0),
      totalLateMinutes: attendances.reduce((sum, a) => sum + a.lateMinutes, 0),
      totalOvertimeMinutes: attendances.reduce((sum, a) => sum + a.overtimeMinutes, 0),
    };
  }

  private groupLateByEmployee(records: any[]) {
    const grouped: Record<string, any> = {};

    for (const record of records) {
      const empId = record.user.id;
      if (!grouped[empId]) {
        grouped[empId] = {
          employee: record.user,
          count: 0,
          totalMinutes: 0,
          records: [],
        };
      }
      grouped[empId].count++;
      grouped[empId].totalMinutes += record.lateMinutes;
      grouped[empId].records.push(record);
    }

    return Object.values(grouped).sort((a: any, b: any) => b.count - a.count);
  }

  private calculateLateDeduction(lateMinutes: number, salary: any): number {
    // Example: 1% deduction for every 60 minutes late
    if (!salary) return 0;
    const salaryNum = Number(salary);
    return Math.round((lateMinutes / 60) * (salaryNum * 0.01) * 100) / 100;
  }

  private calculateAbsentDeduction(absentDays: number, salary: any): number {
    // Example: Daily salary deduction for each absent day
    if (!salary) return 0;
    const salaryNum = Number(salary);
    const dailySalary = salaryNum / 30;
    return Math.round(absentDays * dailySalary * 100) / 100;
  }

  private calculateOvertimeBonus(overtimeMinutes: number, salary: any): number {
    // Example: 1.5x hourly rate for overtime
    if (!salary) return 0;
    const salaryNum = Number(salary);
    const hourlyRate = salaryNum / (30 * 8);
    return Math.round((overtimeMinutes / 60) * hourlyRate * 1.5 * 100) / 100;
  }
}

