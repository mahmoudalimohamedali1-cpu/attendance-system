import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ExportService } from './services/export.service';
import { ReportQueryDto } from './dto/report-query.dto';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private exportService: ExportService,
  ) {}

  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalEmployees,
      activeEmployees,
      todayAttendance,
      pendingLeaves,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'EMPLOYEE' } }),
      this.prisma.user.count({ where: { role: 'EMPLOYEE', status: 'ACTIVE' } }),
      this.prisma.attendance.findMany({
        where: { date: today },
      }),
      this.prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
    ]);

    const presentToday = todayAttendance.filter((a) => a.checkInTime).length;
    const lateToday = todayAttendance.filter((a) => a.status === 'LATE').length;
    const earlyLeaveToday = todayAttendance.filter((a) => a.status === 'EARLY_LEAVE').length;
    const workFromHomeToday = todayAttendance.filter((a) => a.isWorkFromHome).length;

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
    };
  }

  async getWeeklySummary() {
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

  async getAttendanceReport(query: ReportQueryDto) {
    const { startDate, endDate, branchId, departmentId, userId } = query;

    const where: any = {};

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
    if (userId) {
      where.userId = userId;
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

  async getEmployeeReport(userId: string, query: ReportQueryDto) {
    const { startDate, endDate } = query;

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

  async getLateReport(query: ReportQueryDto) {
    const { startDate, endDate, branchId, departmentId } = query;

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

  async getPayrollSummary(query: ReportQueryDto) {
    const { startDate, endDate, branchId, departmentId } = query;

    const where: any = {};
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

    const employees = await this.prisma.user.findMany({
      where: {
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

  async exportToExcel(reportType: string, query: ReportQueryDto): Promise<Buffer> {
    let data: any;

    switch (reportType) {
      case 'attendance':
        data = await this.getAttendanceReport(query);
        return this.exportService.exportAttendanceToExcel(data.data);
      case 'late':
        data = await this.getLateReport(query);
        return this.exportService.exportLateReportToExcel(data.data);
      case 'payroll':
        data = await this.getPayrollSummary(query);
        return this.exportService.exportPayrollToExcel(data);
      default:
        throw new Error('نوع التقرير غير معروف');
    }
  }

  async exportToPdf(reportType: string, query: ReportQueryDto): Promise<Buffer> {
    let data: any;

    switch (reportType) {
      case 'attendance':
        data = await this.getAttendanceReport(query);
        return this.exportService.exportAttendanceToPdf(data.data);
      case 'employee':
        if (!query.userId) throw new Error('معرف الموظف مطلوب');
        data = await this.getEmployeeReport(query.userId, query);
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

