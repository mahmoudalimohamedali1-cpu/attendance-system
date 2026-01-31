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

    // ===================== ADDITIONAL PAYROLL REPORTS =====================

    /** تقرير قسائم الرواتب التفصيلي */
    async getPayslipDetails(companyId: string, query: PayrollReportQueryDto) {
        const year = query.year || new Date().getFullYear();
        const month = query.month || new Date().getMonth() + 1;

        const period = await this.prisma.payrollPeriod.findFirst({ where: { companyId, year, month } });
        if (!period) return { metadata: { reportName: 'قسائم الرواتب', reportNameEn: 'Payslip Details', generatedAt: new Date(), filters: query, totalCount: 0 }, data: [], summary: {} };

        const run = await this.prisma.payrollRun.findFirst({
            where: { companyId, periodId: period.id, isAdjustment: false },
            include: { payslips: { include: { user: { select: { firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } } }, lines: { include: { component: true } } } } } as any,
        });

        if (!run) return { metadata: { reportName: 'قسائم الرواتب', reportNameEn: 'Payslip Details', generatedAt: new Date(), filters: query, totalCount: 0 }, data: [], summary: {} };

        const data = ((run as any).payslips || []).map((p: any) => ({
            employeeId: p.userId,
            employeeName: `${p.user.firstName} ${p.user.lastName}`,
            employeeCode: p.user.employeeCode,
            department: p.user.department?.name,
            basicSalary: Number(p.basicSalary),
            earnings: p.lines.filter((l: any) => l.isEarning).reduce((s: number, l: any) => s + Number(l.amount), 0),
            deductions: p.lines.filter((l: any) => !l.isEarning).reduce((s: number, l: any) => s + Number(l.amount), 0),
            netSalary: Number(p.netSalary),
            status: p.status,
            components: p.lines.map((l: any) => ({ name: l.component.name, amount: Number(l.amount), isEarning: l.isEarning })),
        }));

        return {
            metadata: { reportName: 'تفاصيل قسائم الرواتب', reportNameEn: 'Payslip Details Report', generatedAt: new Date(), filters: { year, month }, totalCount: data.length },
            data,
        };
    }

    /** تقرير خصومات التأخير */
    async getLateDeductionsReport(companyId: string, query: PayrollReportQueryDto) {
        const year = query.year || new Date().getFullYear();
        const month = query.month || new Date().getMonth() + 1;

        const period = await this.prisma.payrollPeriod.findFirst({ where: { companyId, year, month } });
        if (!period) return { metadata: { reportName: 'خصومات التأخير', reportNameEn: 'Late Deductions', generatedAt: new Date(), filters: query, totalCount: 0 }, data: [], summary: {} };

        const run = await this.prisma.payrollRun.findFirst({
            where: { companyId, periodId: period.id },
            include: { payslips: { include: { user: { select: { firstName: true, lastName: true, employeeCode: true } }, lines: { where: { component: { code: 'LATE_DED' } } as any, include: { component: true } } } } } as any,
        });

        if (!run) return { metadata: { reportName: 'خصومات التأخير', reportNameEn: 'Late Deductions', generatedAt: new Date(), filters: query, totalCount: 0 }, data: [], summary: {} };

        const data = ((run as any).payslips || []).filter((p: any) => p.lines.length > 0).map((p: any) => ({
            employeeId: p.userId,
            employeeName: `${p.user.firstName} ${p.user.lastName}`,
            employeeCode: p.user.employeeCode,
            deductionAmount: p.lines.reduce((s: number, l: any) => s + Number(l.amount), 0),
        }));

        return {
            metadata: { reportName: 'خصومات التأخير', reportNameEn: 'Late Deductions Report', generatedAt: new Date(), filters: { year, month }, totalCount: data.length },
            data,
            summary: { totalDeductions: data.reduce((s: number, d: any) => s + d.deductionAmount, 0) },
        };
    }

    /** تقرير خصومات الغياب */
    async getAbsenceDeductionsReport(companyId: string, query: PayrollReportQueryDto) {
        const year = query.year || new Date().getFullYear();
        const month = query.month || new Date().getMonth() + 1;

        const period = await this.prisma.payrollPeriod.findFirst({ where: { companyId, year, month } });
        if (!period) return { metadata: { reportName: 'خصومات الغياب', reportNameEn: 'Absence Deductions', generatedAt: new Date(), filters: query, totalCount: 0 }, data: [], summary: {} };

        const run = await this.prisma.payrollRun.findFirst({
            where: { companyId, periodId: period.id },
            include: { payslips: { include: { user: { select: { firstName: true, lastName: true, employeeCode: true } }, lines: { where: { component: { code: 'ABSENCE_DED' } } as any, include: { component: true } } } } } as any,
        });

        if (!run) return { metadata: { reportName: 'خصومات الغياب', reportNameEn: 'Absence Deductions', generatedAt: new Date(), filters: query, totalCount: 0 }, data: [], summary: {} };

        const data = ((run as any).payslips || []).filter((p: any) => p.lines.length > 0).map((p: any) => ({
            employeeId: p.userId,
            employeeName: `${p.user.firstName} ${p.user.lastName}`,
            employeeCode: p.user.employeeCode,
            deductionAmount: p.lines.reduce((s: number, l: any) => s + Number(l.amount), 0),
        }));

        return {
            metadata: { reportName: 'خصومات الغياب', reportNameEn: 'Absence Deductions Report', generatedAt: new Date(), filters: { year, month }, totalCount: data.length },
            data,
            summary: { totalDeductions: data.reduce((s: number, d: any) => s + d.deductionAmount, 0) },
        };
    }

    /** تقرير بدلات العمل الإضافي */
    async getOvertimeAllowancesReport(companyId: string, query: PayrollReportQueryDto) {
        const year = query.year || new Date().getFullYear();
        const month = query.month || new Date().getMonth() + 1;

        const period = await this.prisma.payrollPeriod.findFirst({ where: { companyId, year, month } });
        if (!period) return { metadata: { reportName: 'بدلات الأوفرتايم', reportNameEn: 'Overtime Allowances', generatedAt: new Date(), filters: query, totalCount: 0 }, data: [], summary: {} };

        const run = await this.prisma.payrollRun.findFirst({
            where: { companyId, periodId: period.id },
            include: { payslips: { include: { user: { select: { firstName: true, lastName: true, employeeCode: true } }, lines: { where: { component: { code: { startsWith: 'OT_' } } } as any, include: { component: true } } } } } as any,
        });

        if (!run) return { metadata: { reportName: 'بدلات الأوفرتايم', reportNameEn: 'Overtime Allowances', generatedAt: new Date(), filters: query, totalCount: 0 }, data: [], summary: {} };

        const data = ((run as any).payslips || []).filter((p: any) => p.lines.length > 0).map((p: any) => ({
            employeeId: p.userId,
            employeeName: `${p.user.firstName} ${p.user.lastName}`,
            employeeCode: p.user.employeeCode,
            overtimeAmount: p.lines.reduce((s: number, l: any) => s + Number(l.amount), 0),
        }));

        return {
            metadata: { reportName: 'بدلات العمل الإضافي', reportNameEn: 'Overtime Allowances Report', generatedAt: new Date(), filters: { year, month }, totalCount: data.length },
            data,
            summary: { totalOvertimeAllowances: data.reduce((s: number, d: any) => s + d.overtimeAmount, 0) },
        };
    }

    // ===================== ADDITIONAL LEAVE REPORTS =====================

    /** تقرير الإجازات المرضية */
    async getSickLeavesReport(companyId: string, query: LeaveReportQueryDto) {
        const { startDate, endDate } = this.getDateRange(query);
        const { page, limit, skip } = this.getPagination(query);

        const [data, total] = await Promise.all([
            this.prisma.leaveRequest.findMany({
                where: { companyId, type: 'SICK', createdAt: { gte: startDate, lte: endDate } },
                include: { user: { select: { firstName: true, lastName: true, employeeCode: true } } },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.leaveRequest.count({ where: { companyId, type: 'SICK', createdAt: { gte: startDate, lte: endDate } } }),
        ]);

        return {
            metadata: { reportName: 'الإجازات المرضية', reportNameEn: 'Sick Leaves Report', generatedAt: new Date(), filters: query, totalCount: total, page, limit, totalPages: Math.ceil(total / limit) },
            data: data.map(l => ({ ...l, days: this.calculateDays(l.startDate, l.endDate) })),
            summary: { totalSickDays: data.reduce((s: number, l: any) => s + this.calculateDays(l.startDate, l.endDate), 0) },
        };
    }

    private calculateDays(startDate: Date, endDate: Date): number {
        const msPerDay = 24 * 60 * 60 * 1000;
        return Math.ceil((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;
    }

    /** تقرير الإجازات حسب النوع */
    async getLeavesByTypeReport(companyId: string, query: LeaveReportQueryDto) {
        const { startDate, endDate } = this.getDateRange(query);

        const requests = await this.prisma.leaveRequest.findMany({
            where: { companyId, status: 'APPROVED', startDate: { gte: startDate }, endDate: { lte: endDate } },
            select: { type: true, startDate: true, endDate: true },
        });

        const byType = requests.reduce((acc, r) => {
            const days = this.calculateDays(r.startDate, r.endDate);
            acc[r.type] = (acc[r.type] || 0) + days;
            return acc;
        }, {} as Record<string, number>);

        const grandTotal = requests.reduce((s, r) => s + this.calculateDays(r.startDate, r.endDate), 0);

        return {
            metadata: { reportName: 'الإجازات حسب النوع', reportNameEn: 'Leaves by Type', generatedAt: new Date(), filters: query, totalCount: Object.keys(byType).length },
            data: Object.entries(byType).map(([type, days]) => ({ type, totalDays: days })),
            summary: { grandTotal },
        };
    }

    // ===================== ADDITIONAL HR REPORTS =====================

    /** تقرير الموظفين الجدد */
    async getNewHiresReport(companyId: string, query: EmployeeReportQueryDto) {
        const { startDate, endDate } = this.getDateRange(query);
        const { page, limit, skip } = this.getPagination(query);

        const where: any = { companyId, role: 'EMPLOYEE', hireDate: { gte: startDate, lte: endDate } };
        if (query.branchId) where.branchId = query.branchId;
        if (query.departmentId) where.departmentId = query.departmentId;

        const [data, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                select: { id: true, firstName: true, lastName: true, employeeCode: true, hireDate: true, salary: true, department: { select: { name: true } }, branch: { select: { name: true } } },
                orderBy: { hireDate: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.user.count({ where }),
        ]);

        return {
            metadata: { reportName: 'التوظيف الجديد', reportNameEn: 'New Hires Report', generatedAt: new Date(), filters: query, totalCount: total, page, limit, totalPages: Math.ceil(total / limit) },
            data,
        };
    }

    /** تقرير توزيع الموظفين */
    async getEmployeeDistribution(companyId: string) {
        const departments = await this.prisma.department.findMany({
            where: { companyId },
            include: { _count: { select: { users: { where: { role: 'EMPLOYEE', status: 'ACTIVE' } } } } },
        });

        const branches = await this.prisma.branch.findMany({
            where: { companyId },
            include: { _count: { select: { users: { where: { role: 'EMPLOYEE', status: 'ACTIVE' } } } } },
        });

        return {
            metadata: { reportName: 'توزيع الموظفين', reportNameEn: 'Employee Distribution', generatedAt: new Date(), filters: {}, totalCount: departments.length + branches.length },
            data: {
                byDepartment: departments.map(d => ({ name: d.name, count: d._count.users })),
                byBranch: branches.map(b => ({ name: b.name, count: b._count.users })),
            },
        };
    }

    /** تقرير معدل دوران الموظفين */
    async getTurnoverReport(companyId: string, query: ExtendedReportQueryDto) {
        const { startDate, endDate } = this.getDateRange(query);

        const [newHires, terminations, totalActive] = await Promise.all([
            this.prisma.user.count({ where: { companyId, role: 'EMPLOYEE', hireDate: { gte: startDate, lte: endDate } } }),
            this.prisma.employeeTermination.count({ where: { companyId, terminationDate: { gte: startDate, lte: endDate } } }),
            this.prisma.user.count({ where: { companyId, role: 'EMPLOYEE', status: 'ACTIVE' } }),
        ]);

        const turnoverRate = totalActive > 0 ? Math.round((terminations / totalActive) * 100 * 100) / 100 : 0;

        return {
            metadata: { reportName: 'معدل دوران الموظفين', reportNameEn: 'Turnover Rate', generatedAt: new Date(), filters: query, totalCount: 1 },
            data: { newHires, terminations, totalActive, turnoverRate },
        };
    }

    // ===================== CUSTODY REPORTS =====================

    /** تقرير العهد حسب الموظف */
    async getCustodyByEmployee(companyId: string, query: CustodyReportQueryDto) {
        const { page, limit, skip } = this.getPagination(query);

        const employees = await this.prisma.user.findMany({
            where: { companyId, role: 'EMPLOYEE', status: 'ACTIVE' },
            include: {
                custodyAssignments: {
                    where: { status: 'ASSIGNED' } as any,
                    include: { item: { select: { name: true, serialNumber: true, purchasePrice: true } } },
                },
            },
            skip,
            take: limit,
        });

        const data = employees.filter(e => (e as any).custodyAssignments.length > 0).map(e => ({
            employeeId: e.id,
            employeeName: `${e.firstName} ${e.lastName}`,
            employeeCode: e.employeeCode,
            itemCount: (e as any).custodyAssignments.length,
            totalValue: (e as any).custodyAssignments.reduce((s: number, a: any) => s + Number(a.item.purchasePrice || 0), 0),
            items: (e as any).custodyAssignments.map((a: any) => ({ name: a.item.name, serialNumber: a.item.serialNumber })),
        }));

        return {
            metadata: { reportName: 'عهد الموظفين', reportNameEn: 'Custody by Employee', generatedAt: new Date(), filters: query, totalCount: data.length },
            data,
        };
    }

    /** تقرير إرجاع العهد */
    async getCustodyReturns(companyId: string, query: CustodyReportQueryDto) {
        const { startDate, endDate } = this.getDateRange(query);
        const { page, limit, skip } = this.getPagination(query);

        const [data, total] = await Promise.all([
            this.prisma.custodyAssignment.findMany({
                where: { companyId, status: 'RETURNED' as any, returnedAt: { gte: startDate, lte: endDate } } as any,
                include: { employee: { select: { firstName: true, lastName: true } }, item: { select: { name: true, serialNumber: true } } },
                orderBy: { returnedAt: 'desc' } as any,
                skip,
                take: limit,
            }),
            this.prisma.custodyAssignment.count({ where: { companyId, status: 'RETURNED' as any, returnedAt: { gte: startDate, lte: endDate } } as any }),
        ]);

        return {
            metadata: { reportName: 'إرجاع العهد', reportNameEn: 'Custody Returns', generatedAt: new Date(), filters: query, totalCount: total, page, limit, totalPages: Math.ceil(total / limit) },
            data,
        };
    }

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

    // ===================== ADDITIONAL PAYROLL REPORTS =====================

    /** تقرير WPS (ملف البنك) */
    async getWpsReport(companyId: string, query: PayrollReportQueryDto) {
        const year = query.year || new Date().getFullYear();
        const month = query.month || new Date().getMonth() + 1;

        const period = await this.prisma.payrollPeriod.findFirst({ where: { companyId, year, month } });
        if (!period) return { metadata: { reportName: 'تقرير WPS', reportNameEn: 'WPS Report', generatedAt: new Date(), filters: query, totalCount: 0 }, data: [], summary: {} };

        const run = await this.prisma.payrollRun.findFirst({
            where: { companyId, periodId: period.id, isAdjustment: false },
            include: { payslips: { include: { user: { select: { firstName: true, lastName: true, employeeCode: true, bankName: true, bankAccountNumber: true, iban: true } } } } } as any,
        });

        if (!run) return { metadata: { reportName: 'تقرير WPS', reportNameEn: 'WPS Report', generatedAt: new Date(), filters: query, totalCount: 0 }, data: [], summary: {} };

        const data = ((run as any).payslips || []).map((p: any) => ({
            employeeName: `${p.user.firstName} ${p.user.lastName}`,
            employeeCode: p.user.employeeCode,
            bankName: p.user.bankName,
            accountNumber: p.user.bankAccountNumber,
            iban: p.user.iban,
            netSalary: Number(p.netSalary),
        }));

        return {
            metadata: { reportName: 'تقرير WPS', reportNameEn: 'WPS Bank File Report', generatedAt: new Date(), filters: { year, month }, totalCount: data.length },
            data,
            summary: { totalAmount: data.reduce((s: number, d: any) => s + d.netSalary, 0) },
        };
    }

    /** تقرير الزيادات */
    async getRaisesReport(companyId: string, query: ExtendedReportQueryDto) {
        const { startDate, endDate } = this.getDateRange(query);
        const { page, limit, skip } = this.getPagination(query);

        const [data, total] = await Promise.all([
            this.prisma.salaryAdjustment.findMany({
                where: { companyId, effectiveDate: { gte: startDate, lte: endDate }, type: 'INCREASE' as any } as any,
                include: { user: { select: { firstName: true, lastName: true, employeeCode: true } } },
                orderBy: { effectiveDate: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.salaryAdjustment.count({ where: { companyId, effectiveDate: { gte: startDate, lte: endDate }, type: 'INCREASE' as any } as any }),
        ]);

        return {
            metadata: { reportName: 'تقرير الزيادات', reportNameEn: 'Raises Report', generatedAt: new Date(), filters: query, totalCount: total, page, limit, totalPages: Math.ceil(total / limit) },
            data,
            summary: { totalRaises: total },
        };
    }

    /** تقرير مقارنة الرواتب */
    async getPayrollComparison(companyId: string, query: PayrollReportQueryDto) {
        const currentYear = query.year || new Date().getFullYear();
        const currentMonth = query.month || new Date().getMonth() + 1;
        const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

        const [currentPeriod, prevPeriod] = await Promise.all([
            this.prisma.payrollPeriod.findFirst({ where: { companyId, year: currentYear, month: currentMonth }, include: { payrollRuns: { include: { payslips: true } } } } as any),
            this.prisma.payrollPeriod.findFirst({ where: { companyId, year: prevYear, month: prevMonth }, include: { payrollRuns: { include: { payslips: true } } } } as any),
        ]);

        const currentTotal = (currentPeriod as any)?.payrollRuns?.[0]?.payslips?.reduce((s: number, p: any) => s + Number(p.netSalary), 0) || 0;
        const prevTotal = (prevPeriod as any)?.payrollRuns?.[0]?.payslips?.reduce((s: number, p: any) => s + Number(p.netSalary), 0) || 0;
        const difference = currentTotal - prevTotal;
        const changePercent = prevTotal > 0 ? Math.round((difference / prevTotal) * 100 * 100) / 100 : 0;

        return {
            metadata: { reportName: 'مقارنة الرواتب', reportNameEn: 'Payroll Comparison', generatedAt: new Date(), filters: query, totalCount: 2 },
            data: { currentPeriod: { year: currentYear, month: currentMonth, total: currentTotal }, previousPeriod: { year: prevYear, month: prevMonth, total: prevTotal }, difference, changePercent },
        };
    }

    /** تقرير تكلفة الموظف */
    async getEmployeeCostReport(companyId: string, query: PayrollReportQueryDto) {
        const year = query.year || new Date().getFullYear();
        const month = query.month || new Date().getMonth() + 1;

        const period = await this.prisma.payrollPeriod.findFirst({ where: { companyId, year, month } });
        if (!period) return { metadata: { reportName: 'تكلفة الموظف', reportNameEn: 'Employee Cost', generatedAt: new Date(), filters: query, totalCount: 0 }, data: [], summary: {} };

        const run = await this.prisma.payrollRun.findFirst({
            where: { companyId, periodId: period.id },
            include: { payslips: { include: { user: { select: { firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } } }, lines: { include: { component: true } } } } } as any,
        });

        if (!run) return { metadata: { reportName: 'تكلفة الموظف', reportNameEn: 'Employee Cost', generatedAt: new Date(), filters: query, totalCount: 0 }, data: [], summary: {} };

        const data = ((run as any).payslips || []).map((p: any) => {
            const employerCost = p.lines.filter((l: any) => l.component?.code?.startsWith('GOSI_EMPLOYER') || l.component?.isEmployerCost).reduce((s: number, l: any) => s + Number(l.amount), 0);
            return {
                employeeName: `${p.user.firstName} ${p.user.lastName}`,
                employeeCode: p.user.employeeCode,
                department: p.user.department?.name,
                grossSalary: Number(p.grossSalary),
                employerContributions: employerCost,
                totalCost: Number(p.grossSalary) + employerCost,
            };
        });

        return {
            metadata: { reportName: 'تكلفة الموظف', reportNameEn: 'Employee Cost Report', generatedAt: new Date(), filters: { year, month }, totalCount: data.length },
            data,
            summary: { totalGross: data.reduce((s: number, d: any) => s + d.grossSalary, 0), totalCost: data.reduce((s: number, d: any) => s + d.totalCost, 0) },
        };
    }

    /** تقرير التسويات بأثر رجعي */
    async getRetroPayReport(companyId: string, query: PayrollReportQueryDto) {
        const { startDate, endDate } = this.getDateRange(query);
        const { page, limit, skip } = this.getPagination(query);

        const runs = await this.prisma.payrollRun.findMany({
            where: { companyId, isAdjustment: true, createdAt: { gte: startDate, lte: endDate } },
            include: { payslips: { include: { user: { select: { firstName: true, lastName: true, employeeCode: true } } } } } as any,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        });

        const periodIds = runs.map(r => r.periodId);
        const periods = await this.prisma.payrollPeriod.findMany({ where: { id: { in: periodIds } } });
        const periodMap = new Map(periods.map(p => [p.id, p]));

        const data = runs.flatMap(r => (r as any).payslips.map((p: any) => {
            const period = periodMap.get(r.periodId);
            return {
                employeeName: `${p.user.firstName} ${p.user.lastName}`,
                employeeCode: p.user.employeeCode,
                adjustmentDate: r.createdAt,
                period: period ? `${period.month}/${period.year}` : 'N/A',
                amount: Number(p.netSalary),
            };
        }));

        return {
            metadata: { reportName: 'التسويات بأثر رجعي', reportNameEn: 'Retro Payments', generatedAt: new Date(), filters: query, totalCount: data.length, page, limit, totalPages: Math.ceil(data.length / limit) },
            data,
            summary: { totalAmount: data.reduce((s: number, d: any) => s + d.amount, 0) },
        };
    }

    // ===================== ADDITIONAL LEAVE REPORTS =====================

    /** تقرير استهلاك الإجازات */
    async getLeaveConsumptionReport(companyId: string, query: LeaveReportQueryDto) {
        const year = new Date().getFullYear();

        const users = await this.prisma.user.findMany({
            where: { companyId, role: 'EMPLOYEE', status: 'ACTIVE', ...(query.branchId && { branchId: query.branchId }) },
            select: { id: true, firstName: true, lastName: true, employeeCode: true, annualLeaveDays: true, usedLeaveDays: true, remainingLeaveDays: true, department: { select: { name: true } } },
        });

        const data = users.map(u => ({
            employeeName: `${u.firstName} ${u.lastName}`,
            employeeCode: u.employeeCode,
            department: u.department?.name,
            entitled: u.annualLeaveDays,
            used: u.usedLeaveDays,
            remaining: u.remainingLeaveDays,
            consumptionRate: u.annualLeaveDays > 0 ? Math.round((u.usedLeaveDays / u.annualLeaveDays) * 100) : 0,
        }));

        return {
            metadata: { reportName: 'استهلاك الإجازات', reportNameEn: 'Leave Consumption', generatedAt: new Date(), filters: { year }, totalCount: data.length },
            data,
            summary: { avgConsumption: Math.round(data.reduce((s, d) => s + d.consumptionRate, 0) / data.length) || 0 },
        };
    }

    /** تقرير الغياب غير المبرر */
    async getUnjustifiedAbsenceReport(companyId: string, query: LeaveReportQueryDto) {
        const { startDate, endDate } = this.getDateRange(query);
        const { page, limit, skip } = this.getPagination(query);

        const [data, total] = await Promise.all([
            this.prisma.attendance.findMany({
                where: { companyId, date: { gte: startDate, lte: endDate }, status: 'ABSENT' },
                include: { user: { select: { firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } } } },
                orderBy: { date: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.attendance.count({ where: { companyId, date: { gte: startDate, lte: endDate }, status: 'ABSENT' } }),
        ]);

        return {
            metadata: { reportName: 'الغياب غير المبرر', reportNameEn: 'Unjustified Absence', generatedAt: new Date(), filters: query, totalCount: total, page, limit, totalPages: Math.ceil(total / limit) },
            data: data.map(d => ({ ...d, employeeName: `${(d as any).user.firstName} ${(d as any).user.lastName}` })),
            summary: { totalAbsences: total },
        };
    }

    /** تقرير الإجازات المتراكمة */
    async getCarriedForwardReport(companyId: string, query: LeaveReportQueryDto) {
        const year = new Date().getFullYear();

        const balances = await this.prisma.leaveBalance.findMany({
            where: { companyId, year, carriedForward: { gt: 0 } } as any,
            include: { user: { select: { firstName: true, lastName: true, employeeCode: true } } },
        });

        const data = balances.map(b => ({
            employeeName: `${(b as any).user.firstName} ${(b as any).user.lastName}`,
            employeeCode: (b as any).user.employeeCode,
            leaveType: b.leaveType,
            carriedForward: (b as any).carriedForward || 0,
            year: b.year,
        }));

        return {
            metadata: { reportName: 'الإجازات المتراكمة', reportNameEn: 'Carried Forward Leaves', generatedAt: new Date(), filters: { year }, totalCount: data.length },
            data,
            summary: { totalCarried: data.reduce((s, d) => s + d.carriedForward, 0) },
        };
    }

    /** تقرير توقعات الإجازات */
    async getLeaveForecastReport(companyId: string, query: LeaveReportQueryDto) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 3);

        const requests = await this.prisma.leaveRequest.findMany({
            where: { companyId, status: 'APPROVED', startDate: { gte: startDate, lte: endDate } },
            include: { user: { select: { firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } } } },
            orderBy: { startDate: 'asc' },
        });

        const data = requests.map(r => ({
            employeeName: `${(r as any).user.firstName} ${(r as any).user.lastName}`,
            employeeCode: (r as any).user.employeeCode,
            department: (r as any).user.department?.name,
            startDate: r.startDate,
            endDate: r.endDate,
            days: this.calculateDays(r.startDate, r.endDate),
            type: r.type,
        }));

        return {
            metadata: { reportName: 'توقعات الإجازات', reportNameEn: 'Leave Forecast', generatedAt: new Date(), filters: { months: 3 }, totalCount: data.length },
            data,
            summary: { totalUpcoming: data.length, totalDays: data.reduce((s, d) => s + d.days, 0) },
        };
    }

    // ===================== ADDITIONAL HR REPORTS =====================

    /** تقرير انتهاء الجوازات */
    async getPassportExpiryReport(companyId: string, query: ContractExpiryQueryDto) {
        const daysAhead = query.daysBeforeExpiry || 90;
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);

        const data = await this.prisma.user.findMany({
            where: { companyId, role: 'EMPLOYEE', status: 'ACTIVE', passportExpiryDate: { lte: futureDate, gte: new Date() } },
            select: { id: true, firstName: true, lastName: true, employeeCode: true, passportNumber: true, passportExpiryDate: true, nationality: true },
            orderBy: { passportExpiryDate: 'asc' },
        });

        return {
            metadata: { reportName: 'انتهاء الجوازات', reportNameEn: 'Passport Expiry Report', generatedAt: new Date(), filters: { daysBeforeExpiry: daysAhead }, totalCount: data.length },
            data: data.map(u => ({ ...u, employeeName: `${u.firstName} ${u.lastName}`, daysRemaining: u.passportExpiryDate ? Math.ceil((u.passportExpiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null })),
        };
    }

    /** تقرير الترقيات */
    async getPromotionsReport(companyId: string, query: ExtendedReportQueryDto) {
        const { startDate, endDate } = this.getDateRange(query);
        const { page, limit, skip } = this.getPagination(query);

        const [data, total] = await Promise.all([
            this.prisma.promotion.findMany({
                where: { companyId, effectiveDate: { gte: startDate, lte: endDate } } as any,
                include: { user: { select: { firstName: true, lastName: true, employeeCode: true } } },
                orderBy: { effectiveDate: 'desc' } as any,
                skip,
                take: limit,
            }),
            this.prisma.promotion.count({ where: { companyId, effectiveDate: { gte: startDate, lte: endDate } } as any }),
        ]);

        return {
            metadata: { reportName: 'تقرير الترقيات', reportNameEn: 'Promotions Report', generatedAt: new Date(), filters: query, totalCount: total, page, limit, totalPages: Math.ceil(total / limit) },
            data: data.map(p => ({ ...p, employeeName: `${(p as any).user.firstName} ${(p as any).user.lastName}` })),
        };
    }

    /** التحليل الديموغرافي */
    async getDemographicsReport(companyId: string) {
        const employees = await this.prisma.user.findMany({
            where: { companyId, role: 'EMPLOYEE', status: 'ACTIVE' },
            select: { dateOfBirth: true, hireDate: true, gender: true, maritalStatus: true },
        });

        const now = new Date();
        const ageGroups = { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '55+': 0 };
        const tenureGroups = { '<1 year': 0, '1-3 years': 0, '3-5 years': 0, '5-10 years': 0, '10+ years': 0 };
        const genderDist: Record<string, number> = {};

        employees.forEach(e => {
            if (e.dateOfBirth) {
                const age = Math.floor((now.getTime() - e.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                if (age <= 25) ageGroups['18-25']++;
                else if (age <= 35) ageGroups['26-35']++;
                else if (age <= 45) ageGroups['36-45']++;
                else if (age <= 55) ageGroups['46-55']++;
                else ageGroups['55+']++;
            }
            if (e.hireDate) {
                const years = Math.floor((now.getTime() - e.hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                if (years < 1) tenureGroups['<1 year']++;
                else if (years < 3) tenureGroups['1-3 years']++;
                else if (years < 5) tenureGroups['3-5 years']++;
                else if (years < 10) tenureGroups['5-10 years']++;
                else tenureGroups['10+ years']++;
            }
            const g = e.gender || 'غير محدد';
            genderDist[g] = (genderDist[g] || 0) + 1;
        });

        return {
            metadata: { reportName: 'التحليل الديموغرافي', reportNameEn: 'Demographics Analysis', generatedAt: new Date(), filters: {}, totalCount: employees.length },
            data: { ageGroups, tenureGroups, genderDistribution: genderDist },
        };
    }

    // ===================== CUSTODY REPORTS =====================

    /** تقرير العهد بحاجة للصيانة */
    async getCustodyMaintenanceReport(companyId: string, query: CustodyReportQueryDto) {
        const { page, limit, skip } = this.getPagination(query);

        const [data, total] = await Promise.all([
            this.prisma.custodyItem.findMany({
                where: { companyId, status: 'NEEDS_MAINTENANCE' as any } as any,
                include: { category: { select: { name: true } }, assignments: { take: 1, orderBy: { createdAt: 'desc' }, include: { employee: { select: { firstName: true, lastName: true } } } } },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.custodyItem.count({ where: { companyId, status: 'NEEDS_MAINTENANCE' as any } as any }),
        ]);

        return {
            metadata: { reportName: 'العهد بحاجة للصيانة', reportNameEn: 'Custody Maintenance', generatedAt: new Date(), filters: query, totalCount: total, page, limit, totalPages: Math.ceil(total / limit) },
            data: data.map(d => ({ ...d, currentHolder: (d as any).assignments?.[0]?.employee ? `${(d as any).assignments[0].employee.firstName} ${(d as any).assignments[0].employee.lastName}` : null })),
        };
    }

    /** تقرير قيمة الأصول */
    async getAssetValueReport(companyId: string, query: CustodyReportQueryDto) {
        const items = await this.prisma.custodyItem.findMany({
            where: { companyId },
            include: { category: { select: { name: true } } },
        });

        const byCategory = items.reduce((acc, i) => {
            const cat = (i as any).category?.name || 'غير مصنف';
            if (!acc[cat]) acc[cat] = { count: 0, value: 0 };
            acc[cat].count++;
            acc[cat].value += Number((i as any).purchasePrice || 0);
            return acc;
        }, {} as Record<string, { count: number; value: number }>);

        const totalValue = items.reduce((s, i) => s + Number((i as any).purchasePrice || 0), 0);

        return {
            metadata: { reportName: 'قيمة الأصول', reportNameEn: 'Asset Value Report', generatedAt: new Date(), filters: query, totalCount: items.length },
            data: { byCategory: Object.entries(byCategory).map(([category, data]) => ({ category, ...data })), totalItems: items.length, totalValue },
        };
    }

    // ===================== DISCIPLINARY REPORTS =====================

    /** تقرير القضايا التأديبية */
    async getDisciplinaryCases(companyId: string, query: DisciplinaryReportQueryDto) {
        const { startDate, endDate } = this.getDateRange(query);
        const { page, limit, skip } = this.getPagination(query);

        const where: any = { companyId, createdAt: { gte: startDate, lte: endDate } };
        if (query.caseStatus) where.status = query.caseStatus;

        const [data, total] = await Promise.all([
            this.prisma.disciplinaryCase.findMany({
                where,
                include: { user: { select: { firstName: true, lastName: true, employeeCode: true } } },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.disciplinaryCase.count({ where }),
        ]);

        return {
            metadata: { reportName: 'القضايا التأديبية', reportNameEn: 'Disciplinary Cases', generatedAt: new Date(), filters: query, totalCount: total, page, limit, totalPages: Math.ceil(total / limit) },
            data: data.map(d => ({ ...d, employeeName: `${(d as any).user.firstName} ${(d as any).user.lastName}` })),
        };
    }

    /** تقرير المخالفات حسب النوع */
    async getViolationsByType(companyId: string, query: DisciplinaryReportQueryDto) {
        const { startDate, endDate } = this.getDateRange(query);

        const cases = await this.prisma.disciplinaryCase.findMany({
            where: { companyId, createdAt: { gte: startDate, lte: endDate } },
            select: { violationType: true },
        });

        const byType = cases.reduce((acc, c) => {
            const t = (c as any).violationType || 'غير محدد';
            acc[t] = (acc[t] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            metadata: { reportName: 'المخالفات حسب النوع', reportNameEn: 'Violations by Type', generatedAt: new Date(), filters: query, totalCount: cases.length },
            data: Object.entries(byType).map(([type, count]) => ({ type, count })),
        };
    }

    /** تقرير العقوبات المطبقة */
    async getPenaltiesReport(companyId: string, query: DisciplinaryReportQueryDto) {
        const { startDate, endDate } = this.getDateRange(query);
        const { page, limit, skip } = this.getPagination(query);

        const [data, total] = await Promise.all([
            this.prisma.disciplinaryAction.findMany({
                where: { companyId, appliedAt: { gte: startDate, lte: endDate } } as any,
                include: { user: { select: { firstName: true, lastName: true, employeeCode: true } }, disciplinaryCase: true },
                orderBy: { appliedAt: 'desc' } as any,
                skip,
                take: limit,
            }),
            this.prisma.disciplinaryAction.count({ where: { companyId, appliedAt: { gte: startDate, lte: endDate } } as any }),
        ]);

        return {
            metadata: { reportName: 'العقوبات المطبقة', reportNameEn: 'Applied Penalties', generatedAt: new Date(), filters: query, totalCount: total, page, limit, totalPages: Math.ceil(total / limit) },
            data: data.map(d => ({ ...d, employeeName: `${(d as any).user.firstName} ${(d as any).user.lastName}` })),
        };
    }

    /** تقرير التحقيقات */
    async getInvestigationsReport(companyId: string, query: DisciplinaryReportQueryDto) {
        const { startDate, endDate } = this.getDateRange(query);
        const { page, limit, skip } = this.getPagination(query);

        const [data, total] = await Promise.all([
            this.prisma.investigation.findMany({
                where: { companyId, createdAt: { gte: startDate, lte: endDate } },
                include: { accusedEmployees: { select: { firstName: true, lastName: true } } },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.investigation.count({ where: { companyId, createdAt: { gte: startDate, lte: endDate } } }),
        ]);

        return {
            metadata: { reportName: 'تقرير التحقيقات', reportNameEn: 'Investigations Report', generatedAt: new Date(), filters: query, totalCount: total, page, limit, totalPages: Math.ceil(total / limit) },
            data,
        };
    }

    /** السجل التأديبي للموظف */
    async getEmployeeDisciplinaryRecord(companyId: string, query: DisciplinaryReportQueryDto) {
        const { page, limit, skip } = this.getPagination(query);

        const employees = await this.prisma.user.findMany({
            where: { companyId, role: 'EMPLOYEE' },
            include: {
                disciplinaryCases: { orderBy: { createdAt: 'desc' } },
                disciplinaryActions: { orderBy: { createdAt: 'desc' } } as any,
            },
            skip,
            take: limit,
        });

        const data = employees.filter(e => (e as any).disciplinaryCases?.length > 0 || (e as any).disciplinaryActions?.length > 0).map(e => ({
            employeeName: `${e.firstName} ${e.lastName}`,
            employeeCode: e.employeeCode,
            totalCases: (e as any).disciplinaryCases?.length || 0,
            totalActions: (e as any).disciplinaryActions?.length || 0,
            cases: (e as any).disciplinaryCases,
            actions: (e as any).disciplinaryActions,
        }));

        return {
            metadata: { reportName: 'السجل التأديبي للموظف', reportNameEn: 'Employee Disciplinary Record', generatedAt: new Date(), filters: query, totalCount: data.length },
            data,
        };
    }

    /** تقرير الإنذارات */
    async getWarningsReport(companyId: string, query: DisciplinaryReportQueryDto) {
        const { startDate, endDate } = this.getDateRange(query);
        const { page, limit, skip } = this.getPagination(query);

        const [data, total] = await Promise.all([
            this.prisma.disciplinaryAction.findMany({
                where: { companyId, actionType: 'WARNING' as any, createdAt: { gte: startDate, lte: endDate } } as any,
                include: { user: { select: { firstName: true, lastName: true, employeeCode: true } } },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.disciplinaryAction.count({ where: { companyId, actionType: 'WARNING' as any, createdAt: { gte: startDate, lte: endDate } } as any }),
        ]);

        return {
            metadata: { reportName: 'تقرير الإنذارات', reportNameEn: 'Warnings Report', generatedAt: new Date(), filters: query, totalCount: total, page, limit, totalPages: Math.ceil(total / limit) },
            data: data.map(d => ({ ...d, employeeName: `${(d as any).user.firstName} ${(d as any).user.lastName}` })),
        };
    }

    // ===================== ADDITIONAL EXECUTIVE REPORTS =====================

    /** تنبيهات المخاطر */
    async getRiskAlerts(companyId: string): Promise<{ metadata: any; data: AlertItem[] }> {
        const alerts: AlertItem[] = [];
        const now = new Date();
        const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const [expiringIqamas, expiringPassports, pendingLeaves, highAbsence] = await Promise.all([
            this.prisma.user.count({ where: { companyId, isSaudi: false, iqamaExpiryDate: { lte: thirtyDaysLater, gte: now } } }),
            this.prisma.user.count({ where: { companyId, passportExpiryDate: { lte: thirtyDaysLater, gte: now } } }),
            this.prisma.leaveRequest.count({ where: { companyId, status: 'PENDING' } }),
            this.prisma.attendance.count({ where: { companyId, status: 'ABSENT', date: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } } }),
        ]);

        if (expiringIqamas > 0) alerts.push({ id: '1', type: 'WARNING', title: 'إقامات تنتهي قريباً', titleEn: 'Expiring Iqamas', message: `${expiringIqamas} إقامة تنتهي خلال 30 يوم`, messageEn: `${expiringIqamas} iqamas expiring`, createdAt: now });
        if (expiringPassports > 0) alerts.push({ id: '2', type: 'WARNING', title: 'جوازات تنتهي قريباً', titleEn: 'Expiring Passports', message: `${expiringPassports} جواز ينتهي قريباً`, messageEn: `${expiringPassports} passports expiring`, createdAt: now });
        if (pendingLeaves > 5) alerts.push({ id: '3', type: 'INFO', title: 'طلبات معلقة كثيرة', titleEn: 'Many Pending Requests', message: `${pendingLeaves} طلب إجازة بانتظار المراجعة`, messageEn: `${pendingLeaves} leave requests pending`, createdAt: now });
        if (highAbsence > 10) alerts.push({ id: '4', type: 'DANGER', title: 'معدل غياب مرتفع', titleEn: 'High Absence Rate', message: `${highAbsence} حالة غياب هذا الشهر`, messageEn: `${highAbsence} absences this month`, createdAt: now });

        return {
            metadata: { reportName: 'تنبيهات المخاطر', reportNameEn: 'Risk Alerts', generatedAt: now, filters: {}, totalCount: alerts.length },
            data: alerts,
        };
    }

    /** مؤشرات الأداء */
    async getKpisReport(companyId: string): Promise<{ metadata: any; data: KPIData[] }> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

        const [activeEmployees, todayPresent, monthLate, monthAbsent, pendingRequests] = await Promise.all([
            this.prisma.user.count({ where: { companyId, role: 'EMPLOYEE', status: 'ACTIVE' } }),
            this.prisma.attendance.count({ where: { companyId, date: today, checkInTime: { not: null } } }),
            this.prisma.attendance.count({ where: { companyId, date: { gte: monthStart }, status: 'LATE' } }),
            this.prisma.attendance.count({ where: { companyId, date: { gte: monthStart }, status: 'ABSENT' } }),
            this.prisma.leaveRequest.count({ where: { companyId, status: 'PENDING' } }),
        ]);

        const kpis: KPIData[] = [
            { name: 'نسبة الحضور اليوم', nameEn: 'Today Attendance', value: activeEmployees > 0 ? Math.round((todayPresent / activeEmployees) * 100) : 0, target: 95, unit: '%', trend: 'stable' },
            { name: 'التأخيرات هذا الشهر', nameEn: 'Monthly Late', value: monthLate, unit: 'مرة', trend: monthLate > 20 ? 'up' : 'down' },
            { name: 'الغياب هذا الشهر', nameEn: 'Monthly Absence', value: monthAbsent, unit: 'يوم', trend: monthAbsent > 10 ? 'up' : 'stable' },
            { name: 'الطلبات المعلقة', nameEn: 'Pending Requests', value: pendingRequests, unit: 'طلب', trend: 'stable' },
        ];

        return {
            metadata: { reportName: 'مؤشرات الأداء', reportNameEn: 'KPIs', generatedAt: new Date(), filters: {}, totalCount: kpis.length },
            data: kpis,
        };
    }

    /** تقرير الامتثال التنفيذي */
    async getExecutiveComplianceReport(companyId: string) {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const [totalEmployees, totalAttendances, onTimeCount, lateCount, absentCount] = await Promise.all([
            this.prisma.user.count({ where: { companyId, role: 'EMPLOYEE', status: 'ACTIVE' } }),
            this.prisma.attendance.count({ where: { companyId, date: { gte: monthStart } } }),
            this.prisma.attendance.count({ where: { companyId, date: { gte: monthStart }, status: 'PRESENT' } }),
            this.prisma.attendance.count({ where: { companyId, date: { gte: monthStart }, status: 'LATE' } }),
            this.prisma.attendance.count({ where: { companyId, date: { gte: monthStart }, status: 'ABSENT' } }),
        ]);

        const complianceScore = totalAttendances > 0 ? Math.round((onTimeCount / totalAttendances) * 100) : 100;

        return {
            metadata: { reportName: 'تقرير الامتثال', reportNameEn: 'Compliance Score', generatedAt: new Date(), filters: {}, totalCount: 1 },
            data: {
                complianceScore,
                breakdown: { onTime: onTimeCount, late: lateCount, absent: absentCount, total: totalAttendances },
                grade: complianceScore >= 90 ? 'ممتاز' : complianceScore >= 75 ? 'جيد' : complianceScore >= 60 ? 'مقبول' : 'ضعيف',
            },
        };
    }
}
