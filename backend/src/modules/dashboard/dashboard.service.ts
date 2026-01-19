import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DashboardSummaryDto, DashboardHealthDto, DashboardExceptionsDto, DashboardTrendsDto, DashboardMudadMetricsDto } from './dto/dashboard.dto';
import Redis from 'ioredis';

const CACHE_TTL = {
    SUMMARY: 60,      // 1 minute
    HEALTH: 60,       // 1 minute
    EXCEPTIONS: 120,  // 2 minutes
    TRENDS: 300,      // 5 minutes
    MUDAD_METRICS: 120, // 2 minutes
};

@Injectable()
export class DashboardService {
    private readonly logger = new Logger(DashboardService.name);

    constructor(
        private readonly prisma: PrismaService,
        @Inject('REDIS_CLIENT') private readonly redis: Redis,
    ) { }

    /**
     * Cache helper - get or set
     */
    private async cached<T>(key: string, ttl: number, factory: () => Promise<T>): Promise<T> {
        try {
            const cached = await this.redis.get(key);
            if (cached) {
                this.logger.debug(`Cache HIT: ${key}`);
                return JSON.parse(cached);
            }
        } catch (e) {
            this.logger.warn(`Cache read error: ${e}`);
        }

        const data = await factory();

        try {
            await this.redis.setex(key, ttl, JSON.stringify(data));
            this.logger.debug(`Cache SET: ${key} (TTL: ${ttl}s)`);
        } catch (e) {
            this.logger.warn(`Cache write error: ${e}`);
        }

        return data;
    }


    /**
     * Executive Summary - Main Dashboard Cards (CACHED)
     */
    async getSummary(companyId: string, year: number, month: number): Promise<DashboardSummaryDto> {
        const cacheKey = `dashboard:summary:${companyId}:${year}:${month}`;
        return this.cached(cacheKey, CACHE_TTL.SUMMARY, () => this._getSummaryImpl(companyId, year, month));
    }

    private async _getSummaryImpl(companyId: string, year: number, month: number): Promise<DashboardSummaryDto> {
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
                employerGosiTotal: 0,
                ledgerDraftAmount: 0,
                ledgerPostedAmount: 0,
                eosSettlementTotal: 0,
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
                            include: { component: true }
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
                employerGosiTotal: 0,
                ledgerDraftAmount: 0,
                ledgerPostedAmount: 0,
                eosSettlementTotal: 0,
                wpsStatus: 'NOT_STARTED',
                isLocked: false,
            };
        }

        // Aggregate
        const headcount = run.payslips.length;
        const grossTotal = run.payslips.reduce((sum, p) => sum + Number(p.grossSalary), 0);
        const deductionsTotal = run.payslips.reduce((sum, p) => sum + Number(p.totalDeductions), 0);
        const netTotal = run.payslips.reduce((sum, p) => sum + Number(p.netSalary), 0);

        // GOSI Calculation
        const gosiTotal = run.payslips.reduce((sum, p) =>
            sum + p.lines.reduce((s, l) => (l.component.code === 'GOSI_DED' ? s + Number(l.amount) : s), 0), 0);

        const employerGosiTotal = run.payslips.reduce((sum, p) =>
            sum + p.lines.reduce((s, l) => (l.component.code.startsWith('GOSI_') && l.component.code !== 'GOSI_DED' ? s + Number(l.amount) : s), 0), 0);

        // EOS Total
        const eosSettlementTotal = run.payslips.reduce((sum, p) =>
            sum + p.lines.reduce((s, l) => (l.component.code === 'EOS_SETTLEMENT' ? s + Number(l.amount) : s), 0), 0);

        // Ledger Summary
        const ledger = await this.prisma.payrollLedger.findFirst({
            where: { runId: run.id }
        });

        const ledgerDraftAmount = ledger?.status === 'DRAFT' ? Number(ledger.totalNet) : 0;
        const ledgerPostedAmount = ledger?.status === 'POSTED' ? Number(ledger.totalNet) : 0;

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
            employerGosiTotal,
            ledgerDraftAmount,
            ledgerPostedAmount,
            eosSettlementTotal,
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

        // Attendance check
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

        // 1. Get Mudad Status (Latest log for MUDAD)
        const latestMudadLog = await this.prisma.submissionStatusLog.findFirst({
            where: { companyId, entityType: 'MUDAD' },
            orderBy: { changedAt: 'desc' }
        });

        // 2. WPS Ready check (all active employees have IBAN)
        const activeUsersCount = await this.prisma.user.count({
            where: { companyId, status: 'ACTIVE', role: 'EMPLOYEE' }
        });
        const usersWithIban = await this.prisma.user.count({
            where: {
                companyId,
                status: 'ACTIVE',
                role: 'EMPLOYEE',
                bankAccounts: { some: {} }
            }
        });

        return {
            attendance: attendanceStatus,
            leaves: pendingLeaves > 0 ? 'PENDING' : 'OK',
            advances: pendingAdvances > 0 ? 'PENDING' : 'OK',
            policies: policies > 0 ? 'OK' : 'MISSING',
            gosiConfig: gosiConfig ? 'OK' : 'MISSING',
            payrollCalculated: !!run && (run._count?.payslips ?? 0) > 0,
            payrollLocked: !!run?.lockedAt,
            mudadStatus: latestMudadLog?.toStatus || 'NOT_STARTED',
            wpsReady: activeUsersCount > 0 && activeUsersCount === usersWithIban,
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
                noBankAccountCount: 0,
                gosiSkippedCount: 0,
                stuckSubmissionsCount: 0,
            };
        }

        // 1. Basic attendance exceptions
        const lateEmployees = await this.prisma.attendance.groupBy({
            by: ['userId'],
            where: {
                companyId,
                date: { gte: period.startDate, lte: period.endDate },
                lateMinutes: { gt: 0 }
            },
            _count: true
        });

        const earlyDepartureCases = await this.prisma.attendance.count({
            where: {
                companyId,
                date: { gte: period.startDate, lte: period.endDate },
                earlyLeaveMinutes: { gt: 0 }
            }
        });

        const absentWithoutLeave = await this.prisma.attendance.count({
            where: {
                companyId,
                date: { gte: period.startDate, lte: period.endDate },
                status: 'ABSENT'
            }
        });

        // 2. Payroll exceptions
        const adjustedPayslips = await this.prisma.payslip.count({
            where: {
                run: { companyId, periodId: period.id, isAdjustment: true }
            }
        });

        // 3. New compliance exceptions
        const noBankAccountCount = await this.prisma.user.count({
            where: {
                companyId,
                status: 'ACTIVE',
                role: 'EMPLOYEE',
                bankAccounts: { none: {} }
            }
        });

        const gosiSkippedCount = await this.prisma.user.count({
            where: {
                companyId,
                status: 'ACTIVE',
                isSaudi: false, // For example, non-Saudis if config is Saudi only
            }
        });

        const stuckSubmissionsCount = await this.prisma.submissionStatusLog.count({
            where: {
                companyId,
                toStatus: { in: ['FAILED', 'RESUBMIT_REQUIRED'] },
                changedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
            }
        });

        return {
            lateEmployees: lateEmployees.length,
            earlyDepartureCases,
            absentWithoutLeave,
            adjustedPayslips,
            highVarianceEmployees: 0,
            noBankAccountCount,
            gosiSkippedCount,
            stuckSubmissionsCount,
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

    /**
     * Quick Stats for Users Page
     */
    async getUsersQuickStats(companyId: string): Promise<{
        totalActive: number;
        newThisMonth: number;
        onLeaveToday: number;
        pendingApprovals: number;
    }> {
        const cacheKey = `dashboard:users-stats:${companyId}`;
        return this.cached(cacheKey, 60, () => this._getUsersQuickStatsImpl(companyId));
    }

    private async _getUsersQuickStatsImpl(companyId: string) {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // Total active employees
        const totalActive = await this.prisma.user.count({
            where: {
                companyId,
                status: 'ACTIVE',
                role: { in: ['EMPLOYEE', 'MANAGER'] }
            }
        });

        // New hires this month
        const newThisMonth = await this.prisma.user.count({
            where: {
                companyId,
                status: 'ACTIVE',
                hireDate: { gte: startOfMonth }
            }
        });

        // Employees on leave today
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);

        const onLeaveToday = await this.prisma.leaveRequest.count({
            where: {
                companyId,
                status: 'APPROVED',
                startDate: { lte: today },
                endDate: { gte: today }
            }
        });

        // Pending approvals (leaves + advances)
        const [pendingLeaves, pendingAdvances] = await Promise.all([
            this.prisma.leaveRequest.count({
                where: { companyId, status: 'PENDING' }
            }),
            this.prisma.advanceRequest.count({
                where: { companyId, status: 'PENDING' }
            }),
        ]);

        return {
            totalActive,
            newThisMonth,
            onLeaveToday,
            pendingApprovals: pendingLeaves + pendingAdvances
        };
    }

    /**
     * MUDAD Compliance Metrics (CACHED)
     */
    async getMudadMetrics(companyId: string, year?: number): Promise<DashboardMudadMetricsDto> {
        const currentYear = year || new Date().getFullYear();
        const cacheKey = `dashboard:mudad-metrics:${companyId}:${currentYear}`;
        return this.cached(cacheKey, CACHE_TTL.MUDAD_METRICS, () => this._getMudadMetricsImpl(companyId, currentYear));
    }

    private async _getMudadMetricsImpl(companyId: string, year: number): Promise<DashboardMudadMetricsDto> {
        // Get all MUDAD submissions for the specified year
        const submissions = await this.prisma.mudadSubmission.findMany({
            where: {
                companyId,
                period: { startsWith: String(year) },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Calculate metrics
        const totalSubmissions = submissions.length;
        const pendingCount = submissions.filter(s => s.status === 'PENDING').length;
        const preparedCount = submissions.filter(s => s.status === 'PREPARED').length;
        const submittedCount = submissions.filter(s => s.status === 'SUBMITTED').length;
        const acceptedCount = submissions.filter(s => s.status === 'ACCEPTED').length;
        const rejectedCount = submissions.filter(s => s.status === 'REJECTED').length;
        const resubmitRequiredCount = submissions.filter(s => s.status === 'RESUBMIT_REQUIRED').length;

        const totalAmount = submissions.reduce((sum, s) => sum + Number(s.totalAmount), 0);

        // Calculate compliance rate (accepted / total submitted)
        const totalProcessed = acceptedCount + rejectedCount;
        const complianceRate = totalProcessed > 0 ? (acceptedCount / totalProcessed) * 100 : 0;

        // Get last submission date
        const lastSubmission = submissions.find(s => s.submittedAt);
        const lastSubmissionDate = lastSubmission?.submittedAt;

        // Calculate next due date (end of current month)
        const now = new Date();
        const nextDueDate = new Date(now.getFullYear(), now.getMonth() + 1, 5); // 5th of next month

        return {
            totalSubmissions,
            pendingCount,
            preparedCount,
            submittedCount,
            acceptedCount,
            rejectedCount,
            resubmitRequiredCount,
            totalAmount,
            complianceRate,
            lastSubmissionDate,
            nextDueDate,
        };
    }
}
