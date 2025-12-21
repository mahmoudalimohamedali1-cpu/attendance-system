import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DashboardSummaryDto, DashboardHealthDto, DashboardExceptionsDto, DashboardTrendsDto } from './dto/dashboard.dto';

@Injectable()
export class DashboardService {
    private readonly logger = new Logger(DashboardService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Executive Summary - Main Dashboard Cards
     */
    async getSummary(companyId: string, year: number, month: number): Promise<DashboardSummaryDto> {
        // Get period
        const period = await this.prisma.payrollPeriod.findFirst({
            where: { companyId, year, month }
        });

        if (!period) {
            return {
                period: `${year}-${String(month).padStart(2, '0')}`,
                headcount: 0,
                grossTotal: 0,
                deductionsTotal: 0,
                gosiTotal: 0,
                netTotal: 0,
                wpsStatus: 'NOT_STARTED',
                isLocked: false,
            };
        }

        // Get payroll run
        const run = await this.prisma.payrollRun.findFirst({
            where: { companyId, periodId: period.id, isAdjustment: false },
            include: {
                payslips: {
                    include: {
                        lines: {
                            where: { component: { code: 'GOSI_DED' } },
                            select: { amount: true }
                        }
                    }
                }
            }
        });

        if (!run) {
            return {
                period: `${year}-${String(month).padStart(2, '0')}`,
                headcount: 0,
                grossTotal: 0,
                deductionsTotal: 0,
                gosiTotal: 0,
                netTotal: 0,
                wpsStatus: 'NOT_STARTED',
                isLocked: false,
            };
        }

        // Aggregate
        const headcount = run.payslips.length;
        const grossTotal = run.payslips.reduce((sum, p) => sum + Number(p.grossSalary), 0);
        const deductionsTotal = run.payslips.reduce((sum, p) => sum + Number(p.totalDeductions), 0);
        const netTotal = run.payslips.reduce((sum, p) => sum + Number(p.netSalary), 0);
        const gosiTotal = run.payslips.reduce((sum, p) =>
            sum + p.lines.reduce((s, l) => s + Number(l.amount), 0), 0);

        // WPS status
        let wpsStatus: 'NOT_STARTED' | 'READY' | 'EXPORTED' = 'NOT_STARTED';
        if (run.lockedAt) wpsStatus = 'READY';
        if (run.status === 'PAID') wpsStatus = 'EXPORTED';

        return {
            period: `${year}-${String(month).padStart(2, '0')}`,
            headcount,
            grossTotal,
            deductionsTotal,
            gosiTotal,
            netTotal,
            wpsStatus,
            isLocked: !!run.lockedAt,
        };
    }

    /**
     * Payroll Health Status - Can we lock?
     */
    async getHealth(companyId: string, year: number, month: number): Promise<DashboardHealthDto> {
        const period = await this.prisma.payrollPeriod.findFirst({
            where: { companyId, year, month }
        });

        // Check GOSI Config
        const gosiConfig = await this.prisma.gosiConfig.findFirst({
            where: { companyId, isActive: true }
        });

        // Check Policies
        const policies = await this.prisma.policy.count({
            where: { companyId, isActive: true }
        });

        // Check Payroll Run with payslip count
        const run = period ? await this.prisma.payrollRun.findFirst({
            where: { companyId, periodId: period.id, isAdjustment: false },
            include: { _count: { select: { payslips: true } } }
        }) : null;

        // Check pending leaves
        const pendingLeaves = await this.prisma.leaveRequest.count({
            where: {
                companyId,
                status: 'PENDING'
            }
        });

        // Check pending advances
        const pendingAdvances = await this.prisma.advanceRequest.count({
            where: {
                companyId,
                status: 'PENDING'
            }
        });

        // Attendance check (simplified - check if any records exist for period)
        let attendanceStatus: 'COMPLETE' | 'PARTIAL' | 'MISSING' = 'MISSING';
        if (period) {
            const attendanceCount = await this.prisma.attendance.count({
                where: {
                    companyId,
                    date: { gte: period.startDate, lte: period.endDate }
                }
            });
            if (attendanceCount > 0) attendanceStatus = 'COMPLETE';
        }

        return {
            attendance: attendanceStatus,
            leaves: pendingLeaves > 0 ? 'PENDING' : 'OK',
            advances: pendingAdvances > 0 ? 'PENDING' : 'OK',
            policies: policies > 0 ? 'OK' : 'MISSING',
            gosiConfig: gosiConfig ? 'OK' : 'MISSING',
            payrollCalculated: !!run && (run._count?.payslips ?? 0) > 0,
            payrollLocked: !!run?.lockedAt,
        };
    }

    /**
     * Exceptions & Alerts
     */
    async getExceptions(companyId: string, year: number, month: number): Promise<DashboardExceptionsDto> {
        const period = await this.prisma.payrollPeriod.findFirst({
            where: { companyId, year, month }
        });

        if (!period) {
            return {
                lateEmployees: 0,
                earlyDepartureCases: 0,
                absentWithoutLeave: 0,
                adjustedPayslips: 0,
                highVarianceEmployees: 0,
            };
        }

        // Late employees (simplified - count distinct employees with late records)
        const lateEmployees = await this.prisma.attendance.groupBy({
            by: ['userId'],
            where: {
                companyId,
                date: { gte: period.startDate, lte: period.endDate },
                lateMinutes: { gt: 0 }
            },
            _count: true
        });

        // Early departure cases
        const earlyDepartureCases = await this.prisma.attendance.count({
            where: {
                companyId,
                date: { gte: period.startDate, lte: period.endDate },
                earlyLeaveMinutes: { gt: 0 }
            }
        });

        // Absent without leave (attendance records with status ABSENT and no approved leave)
        const absentWithoutLeave = await this.prisma.attendance.count({
            where: {
                companyId,
                date: { gte: period.startDate, lte: period.endDate },
                status: 'ABSENT'
            }
        });

        // Adjusted payslips
        const adjustedPayslips = await this.prisma.payslip.count({
            where: {
                run: { companyId, periodId: period.id, isAdjustment: true }
            }
        });

        return {
            lateEmployees: lateEmployees.length,
            earlyDepartureCases,
            absentWithoutLeave,
            adjustedPayslips,
            highVarianceEmployees: 0, // TODO: Calculate variance from previous month
        };
    }

    /**
     * Payroll Trends (Last N months)
     */
    async getTrends(companyId: string, months: number = 4): Promise<DashboardTrendsDto> {
        const now = new Date();
        const periods: string[] = [];
        const gross: number[] = [];
        const net: number[] = [];
        const gosi: number[] = [];
        const otHours: number[] = [];

        for (let i = months - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;

            periods.push(`${year}-${String(month).padStart(2, '0')}`);

            const period = await this.prisma.payrollPeriod.findFirst({
                where: { companyId, year, month }
            });

            if (!period) {
                gross.push(0);
                net.push(0);
                gosi.push(0);
                otHours.push(0);
                continue;
            }

            const run = await this.prisma.payrollRun.findFirst({
                where: { companyId, periodId: period.id, isAdjustment: false },
                include: {
                    payslips: {
                        include: {
                            lines: {
                                where: { component: { code: { in: ['GOSI_DED', 'OVERTIME_EARN'] } } },
                                include: { component: true }
                            }
                        }
                    }
                }
            });

            if (!run) {
                gross.push(0);
                net.push(0);
                gosi.push(0);
                otHours.push(0);
                continue;
            }

            gross.push(run.payslips.reduce((sum, p) => sum + Number(p.grossSalary), 0));
            net.push(run.payslips.reduce((sum, p) => sum + Number(p.netSalary), 0));

            let monthGosi = 0;
            let monthOt = 0;
            for (const payslip of run.payslips) {
                for (const line of payslip.lines) {
                    if (line.component.code === 'GOSI_DED') monthGosi += Number(line.amount);
                    if (line.component.code === 'OVERTIME_EARN') monthOt += Number(line.amount);
                }
            }
            gosi.push(monthGosi);
            otHours.push(monthOt);
        }

        return { periods, gross, net, gosi, otHours };
    }
}
