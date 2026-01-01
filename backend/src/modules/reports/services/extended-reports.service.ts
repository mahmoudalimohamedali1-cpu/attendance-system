import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
    ExtendedReportQueryDto,
    AttendanceDetailedQueryDto,
    LateReportQueryDto,
    OvertimeReportQueryDto,
    PayrollReportQueryDto,
    LeaveReportQueryDto,
    EmployeeReportQueryDto,
    ContractExpiryQueryDto,
    CustodyReportQueryDto,
    DisciplinaryReportQueryDto,
    PaginatedReportResponse,
    ExecutiveDashboardData,
    KPIData,
    AlertItem,
    ChartDataPoint,
    REPORTS_CATALOG,
} from '../dto/extended-report.dto';

@Injectable()
export class ExtendedReportsService {
    private readonly logger = new Logger(ExtendedReportsService.name);

    constructor(private prisma: PrismaService) { }

    // ===================== HELPER METHODS =====================

    private getDateRange(query: ExtendedReportQueryDto) {
        const startDate = query.startDate ? new Date(query.startDate) : new Date(new Date().setDate(1));
        const endDate = query.endDate ? new Date(query.endDate) : new Date();
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        return { startDate, endDate };
    }

    private getPagination(query: ExtendedReportQueryDto) {
        const page = query.page || 1;
        const limit = query.limit || 50;
        const skip = (page - 1) * limit;
        return { page, limit, skip };
    }

    // ===================== REPORTS CATALOG =====================

    getReportsCatalog() {
        return REPORTS_CATALOG;
    }

    // ===================== ATTENDANCE REPORTS =====================

    /** 1. تقرير الحضور اليومي */
    async getDailyAttendance(companyId: string, query: AttendanceDetailedQueryDto) {
        const { startDate, endDate } = this.getDateRange(query);
        const { page, limit, skip } = this.getPagination(query);

        const where: any = {
            companyId,
            date: { gte: startDate, lte: endDate },
        };
        if (query.branchId) where.branchId = query.branchId;
        if (query.departmentId) where.user = { departmentId: query.departmentId };
        if (query.userId) where.userId = query.userId;
        if (query.status) where.status = query.status;
        if (query.isWorkFromHome !== undefined) where.isWorkFromHome = query.isWorkFromHome;

        const [data, total] = await Promise.all([
            this.prisma.attendance.findMany({
                where,
                include: {
                    user: { select: { id: true, firstName: true, lastName: true, employeeCode: true, jobTitle: true, department: { select: { name: true } }, branch: { select: { name: true } } } },
                    branch: { select: { name: true } },
                },
                orderBy: [{ date: 'desc' }, { user: { firstName: 'asc' } }],
                skip,
                take: limit,
            }),
            this.prisma.attendance.count({ where }),
        ]);

        const summary = {
            present: data.filter(a => a.checkInTime).length,
            late: data.filter(a => a.status === 'LATE').length,
            absent: data.filter(a => a.status === 'ABSENT').length,
            onLeave: data.filter(a => a.status === 'ON_LEAVE').length,
            workFromHome: data.filter(a => a.isWorkFromHome).length,
            totalLateMinutes: data.reduce((sum: number, a: any) => sum + a.lateMinutes, 0),
            totalOvertimeMinutes: data.reduce((sum: number, a: any) => sum + a.overtimeMinutes, 0),
        };

        return {
            metadata: { reportName: 'تقرير الحضور اليومي', reportNameEn: 'Daily Attendance Report', generatedAt: new Date(), filters: query, totalCount: total, page, limit, totalPages: Math.ceil(total / limit) },
            data,
            summary,
        };
    }

    /** 2. تقرير التأخيرات التفصيلي */
    async getLateDetailsReport(companyId: string, query: LateReportQueryDto) {
        const { startDate, endDate } = this.getDateRange(query);
        const { page, limit, skip } = this.getPagination(query);

        const where: any = {
            companyId,
            date: { gte: startDate, lte: endDate },
            status: 'LATE',
            lateMinutes: { gt: query.minLateMinutes || 0 },
        };
        if (query.maxLateMinutes) where.lateMinutes.lt = query.maxLateMinutes;
        if (query.branchId) where.branchId = query.branchId;
        if (query.departmentId) where.user = { departmentId: query.departmentId };

        const [data, total] = await Promise.all([
            this.prisma.attendance.findMany({
                where,
                include: { user: { select: { id: true, firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } } } },
                orderBy: [{ lateMinutes: 'desc' }, { date: 'desc' }],
                skip,
                take: limit,
            }),
            this.prisma.attendance.count({ where }),
        ]);

        // Group by employee
        const byEmployee = data.reduce((acc, record) => {
            const empId = record.userId;
            if (!acc[empId]) acc[empId] = { employee: (record as any).user, totalLateMinutes: 0, count: 0 };
            acc[empId].totalLateMinutes += record.lateMinutes;
            acc[empId].count++;
            return acc;
        }, {} as Record<string, any>);

        return {
            metadata: { reportName: 'تقرير التأخيرات التفصيلي', reportNameEn: 'Late Arrivals Detailed Report', generatedAt: new Date(), filters: query, totalCount: total, page, limit, totalPages: Math.ceil(total / limit) },
            data,
            summary: { totalRecords: total, totalLateMinutes: data.reduce((s: number, a: any) => s + a.lateMinutes, 0), byEmployee: Object.values(byEmployee) },
        };
    }

    /** 3. تقرير الغياب */
    async getAbsenceReport(companyId: string, query: ExtendedReportQueryDto) {
        const { startDate, endDate } = this.getDateRange(query);
        const { page, limit, skip } = this.getPagination(query);

        const where: any = { companyId, date: { gte: startDate, lte: endDate }, status: 'ABSENT' };
        if (query.branchId) where.branchId = query.branchId;
        if (query.departmentId) where.user = { departmentId: query.departmentId };

        const [data, total] = await Promise.all([
            this.prisma.attendance.findMany({
                where,
                include: { user: { select: { id: true, firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } }, branch: { select: { name: true } } } } },
                orderBy: { date: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.attendance.count({ where }),
        ]);

        return {
            metadata: { reportName: 'تقرير الغياب', reportNameEn: 'Absence Report', generatedAt: new Date(), filters: query, totalCount: total, page, limit, totalPages: Math.ceil(total / limit) },
            data,
            summary: { totalAbsences: total },
        };
    }

    /** 4. تقرير الانصراف المبكر */
    async getEarlyLeaveReport(companyId: string, query: ExtendedReportQueryDto) {
        const { startDate, endDate } = this.getDateRange(query);
        const { page, limit, skip } = this.getPagination(query);

        const where: any = { companyId, date: { gte: startDate, lte: endDate }, status: 'EARLY_LEAVE' };
        if (query.branchId) where.branchId = query.branchId;

        const [data, total] = await Promise.all([
            this.prisma.attendance.findMany({
                where,
                include: { user: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
                orderBy: { earlyLeaveMinutes: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.attendance.count({ where }),
        ]);

        return {
            metadata: { reportName: 'تقرير الانصراف المبكر', reportNameEn: 'Early Leave Report', generatedAt: new Date(), filters: query, totalCount: total, page, limit, totalPages: Math.ceil(total / limit) },
            data,
            summary: { totalEarlyLeaves: total, totalMinutes: data.reduce((s: number, a: any) => s + a.earlyLeaveMinutes, 0) },
        };
    }

    /** 5. تقرير العمل الإضافي */
    async getOvertimeReport(companyId: string, query: OvertimeReportQueryDto) {
        const { startDate, endDate } = this.getDateRange(query);
        const { page, limit, skip } = this.getPagination(query);

        const where: any = { companyId, date: { gte: startDate, lte: endDate }, overtimeMinutes: { gt: (query.minOvertimeHours || 0) * 60 } };
        if (query.branchId) where.branchId = query.branchId;

        const [data, total] = await Promise.all([
            this.prisma.attendance.findMany({
                where,
                include: { user: { select: { id: true, firstName: true, lastName: true, employeeCode: true, salary: true } } },
                orderBy: { overtimeMinutes: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.attendance.count({ where }),
        ]);

        const totalOvertimeMinutes = data.reduce((s: number, a: any) => s + a.overtimeMinutes, 0);

        return {
            metadata: { reportName: 'تقرير العمل الإضافي', reportNameEn: 'Overtime Report', generatedAt: new Date(), filters: query, totalCount: total, page, limit, totalPages: Math.ceil(total / limit) },
            data,
            summary: { totalOvertimeMinutes, totalOvertimeHours: Math.round(totalOvertimeMinutes / 60 * 100) / 100 },
        };
    }

    /** 6. تقرير العمل من المنزل */
    async getWorkFromHomeReport(companyId: string, query: ExtendedReportQueryDto) {
        const { startDate, endDate } = this.getDateRange(query);
        const { page, limit, skip } = this.getPagination(query);

        const where: any = { companyId, date: { gte: startDate, lte: endDate }, isWorkFromHome: true };
        if (query.branchId) where.branchId = query.branchId;
        if (query.userId) where.userId = query.userId;

        const [data, total] = await Promise.all([
            this.prisma.attendance.findMany({
                where,
                include: { user: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
                orderBy: { date: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.attendance.count({ where }),
        ]);

        return {
            metadata: { reportName: 'تقرير العمل من المنزل', reportNameEn: 'Work From Home Report', generatedAt: new Date(), filters: query, totalCount: total, page, limit, totalPages: Math.ceil(total / limit) },
            data,
            summary: { totalDays: total },
        };
    }

    /** 7. ملخص الحضور حسب الفرع */
    async getAttendanceByBranch(companyId: string, query: ExtendedReportQueryDto) {
        const { startDate, endDate } = this.getDateRange(query);

        const branches = await this.prisma.branch.findMany({
            where: { companyId, isActive: true },
            include: {
                attendances: { where: { date: { gte: startDate, lte: endDate } } },
                _count: { select: { users: { where: { status: 'ACTIVE', role: 'EMPLOYEE' } } } },
            },
        });

        const data = branches.map(branch => ({
            branchId: branch.id,
            branchName: branch.name,
            employeeCount: branch._count.users,
            totalAttendances: branch.attendances.length,
            present: branch.attendances.filter(a => a.checkInTime).length,
            late: branch.attendances.filter(a => a.status === 'LATE').length,
            absent: branch.attendances.filter(a => a.status === 'ABSENT').length,
            totalLateMinutes: branch.attendances.reduce((s: number, a: any) => s + a.lateMinutes, 0),
            avgAttendanceRate: branch._count.users > 0 ? Math.round((branch.attendances.filter(a => a.checkInTime).length / branch.attendances.length) * 100) || 0 : 0,
        }));

        return {
            metadata: { reportName: 'ملخص الحضور حسب الفرع', reportNameEn: 'Attendance by Branch', generatedAt: new Date(), filters: query, totalCount: data.length },
            data,
        };
    }

    /** 8. ملخص الحضور حسب القسم */
    async getAttendanceByDepartment(companyId: string, query: ExtendedReportQueryDto) {
        const { startDate, endDate } = this.getDateRange(query);

        const departments = await this.prisma.department.findMany({
            where: { companyId },
            include: {
                users: { where: { status: 'ACTIVE', role: 'EMPLOYEE' }, include: { attendances: { where: { date: { gte: startDate, lte: endDate } } } } },
            },
        });

        const data = departments.map(dept => {
            const allAttendances = dept.users.flatMap(u => u.attendances);
            return {
                departmentId: dept.id,
                departmentName: dept.name,
                employeeCount: dept.users.length,
                totalAttendances: allAttendances.length,
                present: allAttendances.filter(a => a.checkInTime).length,
                late: allAttendances.filter(a => a.status === 'LATE').length,
                absent: allAttendances.filter(a => a.status === 'ABSENT').length,
            };
        });

        return {
            metadata: { reportName: 'ملخص الحضور حسب القسم', reportNameEn: 'Attendance by Department', generatedAt: new Date(), filters: query, totalCount: data.length },
            data,
        };
    }

    /** 9. تقرير الالتزام بالدوام */
    async getComplianceReport(companyId: string, query: ExtendedReportQueryDto) {
        const { startDate, endDate } = this.getDateRange(query);

        const users = await this.prisma.user.findMany({
            where: { companyId, role: 'EMPLOYEE', status: 'ACTIVE', ...(query.branchId && { branchId: query.branchId }) },
            include: { attendances: { where: { date: { gte: startDate, lte: endDate } } }, department: { select: { name: true } }, branch: { select: { name: true } } },
        });

        const data = users.map(user => {
            const total = user.attendances.length;
            const present = user.attendances.filter(a => a.checkInTime).length;
            const onTime = user.attendances.filter(a => a.status === 'PRESENT').length;
            return {
                userId: user.id,
                employeeName: `${user.firstName} ${user.lastName}`,
                employeeCode: user.employeeCode,
                department: user.department?.name,
                branch: user.branch?.name,
                totalDays: total,
                presentDays: present,
                onTimeDays: onTime,
                lateDays: user.attendances.filter(a => a.status === 'LATE').length,
                absentDays: user.attendances.filter(a => a.status === 'ABSENT').length,
                complianceRate: total > 0 ? Math.round((onTime / total) * 100) : 0,
                attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
            };
        }).sort((a, b) => b.complianceRate - a.complianceRate);

        return {
            metadata: { reportName: 'تقرير الالتزام بالدوام', reportNameEn: 'Compliance Report', generatedAt: new Date(), filters: query, totalCount: data.length },
            data,
            summary: { avgComplianceRate: Math.round(data.reduce((s: number, d: any) => s + d.complianceRate, 0) / data.length) || 0 },
        };
    }

    /** 10. تقرير المحاولات المشبوهة */
    async getSuspiciousAttemptsReport(companyId: string, query: ExtendedReportQueryDto) {
        const { startDate, endDate } = this.getDateRange(query);
        const { page, limit, skip } = this.getPagination(query);

        const where: any = { companyId, createdAt: { gte: startDate, lte: endDate } };

        const [data, total] = await Promise.all([
            this.prisma.suspiciousAttempt.findMany({
                where,
                include: { user: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.suspiciousAttempt.count({ where }),
        ]);

        const byType = data.reduce((acc, a) => { acc[a.attemptType] = (acc[a.attemptType] || 0) + 1; return acc; }, {} as Record<string, number>);

        return {
            metadata: { reportName: 'تقرير المحاولات المشبوهة', reportNameEn: 'Suspicious Attempts Report', generatedAt: new Date(), filters: query, totalCount: total, page, limit, totalPages: Math.ceil(total / limit) },
            data,
            summary: { total, byType },
        };
    }

    // ===================== PAYROLL REPORTS =====================

    /** 11. ملخص الرواتب الشهري */
    async getPayrollSummary(companyId: string, query: PayrollReportQueryDto) {
        const year = query.year || new Date().getFullYear();
        const month = query.month || new Date().getMonth() + 1;

        const period = await this.prisma.payrollPeriod.findFirst({ where: { companyId, year, month } });
        if (!period) return { metadata: { reportName: 'ملخص الرواتب', reportNameEn: 'Payroll Summary', generatedAt: new Date(), filters: query, totalCount: 0 }, data: [], summary: {} };

        const run = await this.prisma.payrollRun.findFirst({
            where: { companyId, periodId: period.id, isAdjustment: false },
            include: { payslips: { include: { user: { select: { firstName: true, lastName: true, employeeCode: true } }, lines: { include: { component: true } } } } } as any,
        });

        if (!run) return { metadata: { reportName: 'ملخص الرواتب', reportNameEn: 'Payroll Summary', generatedAt: new Date(), filters: query, totalCount: 0 }, data: [], summary: {} };

        const data = ((run as any).payslips || []).map((p: any) => ({
            employeeId: p.userId,
            employeeName: `${p.user.firstName} ${p.user.lastName}`,
            employeeCode: p.user.employeeCode,
            basicSalary: Number(p.basicSalary),
            grossSalary: Number(p.grossSalary),
            totalDeductions: Number(p.totalDeductions),
            netSalary: Number(p.netSalary),
            status: p.status,
        }));

        const summary = {
            totalBasic: data.reduce((s: number, d: any) => s + d.basicSalary, 0),
            totalGross: data.reduce((s: number, d: any) => s + d.grossSalary, 0),
            totalDeductions: data.reduce((s: number, d: any) => s + d.totalDeductions, 0),
            totalNet: data.reduce((s: number, d: any) => s + d.netSalary, 0),
            employeeCount: data.length,
        };

        return {
            metadata: { reportName: 'ملخص الرواتب الشهري', reportNameEn: 'Monthly Payroll Summary', generatedAt: new Date(), filters: { year, month }, totalCount: data.length },
            data,
            summary,
        };
    }

    /** 17. تقرير التأمينات GOSI */
    async getGosiReport(companyId: string, query: PayrollReportQueryDto) {
        const year = query.year || new Date().getFullYear();
        const month = query.month || new Date().getMonth() + 1;

        const period = await this.prisma.payrollPeriod.findFirst({ where: { companyId, year, month } });
        if (!period) return { metadata: { reportName: 'تقرير GOSI', reportNameEn: 'GOSI Report', generatedAt: new Date(), filters: query, totalCount: 0 }, data: [], summary: {} };

        const run = await this.prisma.payrollRun.findFirst({
            where: { companyId, periodId: period.id },
            include: { payslips: { include: { user: { select: { firstName: true, lastName: true, employeeCode: true, gosiNumber: true, isSaudi: true } }, lines: { where: { component: { code: { startsWith: 'GOSI' } } } as any, include: { component: true } } } } } as any,
        });

        if (!run) return { metadata: { reportName: 'تقرير GOSI', reportNameEn: 'GOSI Report', generatedAt: new Date(), filters: query, totalCount: 0 }, data: [], summary: {} };

        const data = ((run as any).payslips || []).map((p: any) => {
            const employeeShare = p.lines.filter((l: any) => l.component.code === 'GOSI_DED').reduce((s: number, l: any) => s + Number(l.amount), 0);
            const employerShare = p.lines.filter((l: any) => l.component.code.startsWith('GOSI_') && l.component.code !== 'GOSI_DED').reduce((s: number, l: any) => s + Number(l.amount), 0);
            return { employeeId: p.userId, employeeName: `${p.user.firstName} ${p.user.lastName}`, gosiNumber: p.user.gosiNumber, isSaudi: p.user.isSaudi, employeeShare, employerShare, total: employeeShare + employerShare };
        });

        return {
            metadata: { reportName: 'تقرير التأمينات GOSI', reportNameEn: 'GOSI Report', generatedAt: new Date(), filters: { year, month }, totalCount: data.length },
            data,
            summary: { totalEmployeeShare: data.reduce((s: number, d: any) => s + d.employeeShare, 0), totalEmployerShare: data.reduce((s: number, d: any) => s + d.employerShare, 0), grandTotal: data.reduce((s: number, d: any) => s + d.total, 0) },
        };
    }

    /** 18. تقرير السلف */
    async getAdvancesReport(companyId: string, query: ExtendedReportQueryDto) {
        const { page, limit, skip } = this.getPagination(query);

        const where: any = { companyId };

        const [data, total] = await Promise.all([
            this.prisma.advanceRequest.findMany({
                where,
                include: { user: { select: { firstName: true, lastName: true, employeeCode: true } }, payments: true },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.advanceRequest.count({ where }),
        ]);

        const formatted = data.map(a => {
            const paid = a.payments.reduce((s, p) => s + Number(p.amount), 0);
            return { ...a, amount: Number(a.amount), approvedAmount: a.approvedAmount ? Number(a.approvedAmount) : null, paidAmount: paid, remaining: Number(a.approvedAmount || a.amount) - paid };
        });

        return {
            metadata: { reportName: 'تقرير السلف والقروض', reportNameEn: 'Advances Report', generatedAt: new Date(), filters: query, totalCount: total, page, limit, totalPages: Math.ceil(total / limit) },
            data: formatted,
            summary: { totalAdvances: total, totalAmount: formatted.reduce((s: number, a: any) => s + (a.approvedAmount || a.amount), 0), totalPaid: formatted.reduce((s: number, a: any) => s + a.paidAmount, 0) },
        };
    }

    // ===================== HR REPORTS =====================

    /** 31. سجل الموظفين */
    async getEmployeeList(companyId: string, query: EmployeeReportQueryDto) {
        const { page, limit, skip } = this.getPagination(query);

        const where: any = { companyId, role: 'EMPLOYEE' };
        if (query.status) where.status = query.status;
        if (query.branchId) where.branchId = query.branchId;
        if (query.departmentId) where.departmentId = query.departmentId;
        if (query.nationality) where.nationality = query.nationality;
        if (query.isSaudi !== undefined) where.isSaudi = query.isSaudi;

        const [data, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                select: { id: true, firstName: true, lastName: true, employeeCode: true, email: true, phone: true, status: true, hireDate: true, salary: true, isSaudi: true, nationality: true, department: { select: { name: true } }, branch: { select: { name: true } }, jobTitleRef: { select: { name: true } } },
                orderBy: { firstName: 'asc' },
                skip,
                take: limit,
            }),
            this.prisma.user.count({ where }),
        ]);

        return {
            metadata: { reportName: 'سجل الموظفين', reportNameEn: 'Employee List', generatedAt: new Date(), filters: query, totalCount: total, page, limit, totalPages: Math.ceil(total / limit) },
            data,
        };
    }

    /** 33. انتهاء العقود - يستخدم hireDate + سنة كتقدير لانتهاء العقد */
    async getContractExpiryReport(companyId: string, query: ContractExpiryQueryDto) {
        const daysAhead = query.daysBeforeExpiry || 30;
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);

        // نستخدم الموظفين الذين مر عليهم سنة تقريباً كتقدير لانتهاء العقد
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const oneYearAgoPlusDays = new Date(oneYearAgo);
        oneYearAgoPlusDays.setDate(oneYearAgoPlusDays.getDate() + daysAhead);

        const data = await this.prisma.user.findMany({
            where: { companyId, role: 'EMPLOYEE', status: 'ACTIVE', hireDate: { gte: oneYearAgo, lte: oneYearAgoPlusDays } },
            select: { id: true, firstName: true, lastName: true, employeeCode: true, hireDate: true },
            orderBy: { hireDate: 'asc' },
        });

        return {
            metadata: { reportName: 'انتهاء العقود (تقديري)', reportNameEn: 'Contract Expiry Report (Estimated)', generatedAt: new Date(), filters: { daysBeforeExpiry: daysAhead }, totalCount: data.length },
            data: data.map(u => ({ ...u, estimatedContractEnd: u.hireDate ? new Date(new Date(u.hireDate).setFullYear(new Date(u.hireDate).getFullYear() + 1)) : null })),
        };
    }

    /** 36. انتهاء الإقامات */
    async getIqamaExpiryReport(companyId: string, query: ContractExpiryQueryDto) {
        const daysAhead = query.daysBeforeExpiry || 30;
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);

        const data = await this.prisma.user.findMany({
            where: { companyId, role: 'EMPLOYEE', status: 'ACTIVE', isSaudi: false, iqamaExpiryDate: { lte: futureDate, gte: new Date() } },
            select: { id: true, firstName: true, lastName: true, employeeCode: true, iqamaNumber: true, iqamaExpiryDate: true, nationality: true },
            orderBy: { iqamaExpiryDate: 'asc' },
        });

        return {
            metadata: { reportName: 'انتهاء الإقامات', reportNameEn: 'Iqama Expiry Report', generatedAt: new Date(), filters: { daysBeforeExpiry: daysAhead }, totalCount: data.length },
            data: data.map(u => ({ ...u, daysRemaining: u.iqamaExpiryDate ? Math.ceil((u.iqamaExpiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null })),
        };
    }

    /** 35. تحليل الجنسيات (السعودة) */
    async getNationalityAnalysis(companyId: string) {
        const employees = await this.prisma.user.findMany({ where: { companyId, role: 'EMPLOYEE', status: 'ACTIVE' }, select: { isSaudi: true, nationality: true } });

        const saudiCount = employees.filter(e => e.isSaudi).length;
        const nonSaudiCount = employees.filter(e => !e.isSaudi).length;
        const saudizationRate = employees.length > 0 ? Math.round((saudiCount / employees.length) * 100) : 0;

        const byNationality = employees.reduce((acc, e) => { const n = e.nationality || 'غير محدد'; acc[n] = (acc[n] || 0) + 1; return acc; }, {} as Record<string, number>);

        return {
            metadata: { reportName: 'تحليل الجنسيات', reportNameEn: 'Nationality Analysis', generatedAt: new Date(), filters: {}, totalCount: employees.length },
            data: { saudiCount, nonSaudiCount, saudizationRate, byNationality: Object.entries(byNationality).map(([nationality, count]) => ({ nationality, count })) },
        };
    }

    // ===================== LEAVE REPORTS =====================

    /** 23. رصيد الإجازات */
    async getLeaveBalanceReport(companyId: string, query: LeaveReportQueryDto) {
        const year = new Date().getFullYear();

        const users = await this.prisma.user.findMany({
            where: { companyId, role: 'EMPLOYEE', status: 'ACTIVE', ...(query.branchId && { branchId: query.branchId }) },
            select: { id: true, firstName: true, lastName: true, employeeCode: true, annualLeaveDays: true, usedLeaveDays: true, remainingLeaveDays: true, leaveBalances: { where: { year } } },
        });

        const data = users.map(u => ({ userId: u.id, employeeName: `${u.firstName} ${u.lastName}`, employeeCode: u.employeeCode, annualEntitlement: u.annualLeaveDays, used: u.usedLeaveDays, remaining: u.remainingLeaveDays, detailedBalances: u.leaveBalances }));

        return {
            metadata: { reportName: 'رصيد الإجازات', reportNameEn: 'Leave Balance Report', generatedAt: new Date(), filters: { year }, totalCount: data.length },
            data,
        };
    }

    /** 24. طلبات الإجازات */
    async getLeaveRequestsReport(companyId: string, query: LeaveReportQueryDto) {
        const { startDate, endDate } = this.getDateRange(query);
        const { page, limit, skip } = this.getPagination(query);

        const where: any = { companyId, createdAt: { gte: startDate, lte: endDate } };
        if (query.status) where.status = query.status;
        if (query.leaveType) where.type = query.leaveType;

        const [data, total] = await Promise.all([
            this.prisma.leaveRequest.findMany({
                where,
                include: { user: { select: { firstName: true, lastName: true, employeeCode: true } } },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.leaveRequest.count({ where }),
        ]);

        const byStatus = data.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {} as Record<string, number>);

        return {
            metadata: { reportName: 'طلبات الإجازات', reportNameEn: 'Leave Requests Report', generatedAt: new Date(), filters: query, totalCount: total, page, limit, totalPages: Math.ceil(total / limit) },
            data,
            summary: { byStatus },
        };
    }

    // ===================== CUSTODY REPORTS =====================

    /** 47. جرد العهد */
    async getCustodyInventory(companyId: string, query: CustodyReportQueryDto) {
        const { page, limit, skip } = this.getPagination(query);

        const where: any = { companyId };
        if (query.categoryId) where.categoryId = query.categoryId;
        if (query.status) where.status = query.status;

        const [data, total] = await Promise.all([
            this.prisma.custodyItem.findMany({
                where,
                include: { category: { select: { name: true } }, assignments: { where: { status: 'ASSIGNED' } as any, include: { employee: { select: { firstName: true, lastName: true } } } } },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.custodyItem.count({ where }),
        ]);

        const totalValue = data.reduce((s: number, i: any) => s + Number(i.purchasePrice || 0), 0);

        return {
            metadata: { reportName: 'جرد العهد', reportNameEn: 'Custody Inventory', generatedAt: new Date(), filters: query, totalCount: total, page, limit, totalPages: Math.ceil(total / limit) },
            data,
            summary: { totalItems: total, totalValue },
        };
    }

    // ===================== EXECUTIVE REPORTS =====================

    /** 52. لوحة التحكم التنفيذية */
    async getExecutiveDashboard(companyId: string): Promise<ExecutiveDashboardData> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

        const [
            totalEmployees,
            activeEmployees,
            todayAttendance,
            pendingLeaves,
            pendingAdvances,
            expiringIqamas,
            expiringContracts,
            monthlyAttendance,
        ] = await Promise.all([
            this.prisma.user.count({ where: { companyId, role: 'EMPLOYEE' } }),
            this.prisma.user.count({ where: { companyId, role: 'EMPLOYEE', status: 'ACTIVE' } }),
            this.prisma.attendance.findMany({ where: { companyId, date: today } }),
            this.prisma.leaveRequest.count({ where: { companyId, status: 'PENDING' } }),
            this.prisma.advanceRequest.count({ where: { companyId, status: 'PENDING' } }),
            this.prisma.user.count({ where: { companyId, isSaudi: false, iqamaExpiryDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } } }),
            Promise.resolve(0), // العقود - لا يوجد Contract model حالياً
            this.prisma.attendance.findMany({ where: { companyId, date: { gte: monthStart } } }),
        ]);

        const presentToday = todayAttendance.filter(a => a.checkInTime).length;
        const onLeaveToday = todayAttendance.filter(a => a.status === 'ON_LEAVE').length;
        const lateToday = todayAttendance.filter(a => a.status === 'LATE').length;

        const kpis: KPIData[] = [
            { name: 'نسبة الحضور اليوم', nameEn: 'Today Attendance Rate', value: activeEmployees > 0 ? Math.round((presentToday / activeEmployees) * 100) : 0, target: 95, unit: '%', trend: 'stable' },
            { name: 'نسبة التأخير', nameEn: 'Late Rate', value: presentToday > 0 ? Math.round((lateToday / presentToday) * 100) : 0, target: 5, unit: '%', trend: 'down' },
            { name: 'الطلبات المعلقة', nameEn: 'Pending Requests', value: pendingLeaves + pendingAdvances, unit: 'طلب', trend: 'stable' },
            { name: 'وثائق تنتهي قريباً', nameEn: 'Expiring Documents', value: expiringIqamas + expiringContracts, unit: 'وثيقة', trend: 'up' },
        ];

        const alerts: AlertItem[] = [];
        if (expiringIqamas > 0) alerts.push({ id: '1', type: 'WARNING', title: 'إقامات تنتهي قريباً', titleEn: 'Expiring Iqamas', message: `${expiringIqamas} إقامة تنتهي خلال 30 يوم`, messageEn: `${expiringIqamas} iqamas expiring in 30 days`, createdAt: new Date() });
        if (expiringContracts > 0) alerts.push({ id: '2', type: 'WARNING', title: 'عقود تنتهي قريباً', titleEn: 'Expiring Contracts', message: `${expiringContracts} عقد ينتهي قريباً`, messageEn: `${expiringContracts} contracts expiring soon`, createdAt: new Date() });

        // Weekly trend for chart
        const weeklyData: ChartDataPoint[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayAtt = monthlyAttendance.filter(a => a.date.toDateString() === d.toDateString());
            weeklyData.push({ label: d.toLocaleDateString('ar-SA', { weekday: 'short' }), value: dayAtt.filter(a => a.checkInTime).length });
        }

        return {
            kpis,
            alerts,
            charts: { attendanceTrend: weeklyData, payrollDistribution: [], leaveDistribution: [], employeesByDepartment: [] },
            quickStats: { totalEmployees, activeEmployees, presentToday, onLeaveToday, pendingRequests: pendingLeaves + pendingAdvances, upcomingExpiries: expiringIqamas + expiringContracts },
        };
    }
}
