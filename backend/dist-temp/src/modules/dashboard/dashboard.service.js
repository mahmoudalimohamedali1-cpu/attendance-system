"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DashboardService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const ioredis_1 = require("ioredis");
const CACHE_TTL = {
    SUMMARY: 60,
    HEALTH: 60,
    EXCEPTIONS: 120,
    TRENDS: 300,
};
let DashboardService = DashboardService_1 = class DashboardService {
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
        this.logger = new common_1.Logger(DashboardService_1.name);
    }
    async cached(key, ttl, factory) {
        try {
            const cached = await this.redis.get(key);
            if (cached) {
                this.logger.debug(`Cache HIT: ${key}`);
                return JSON.parse(cached);
            }
        }
        catch (e) {
            this.logger.warn(`Cache read error: ${e}`);
        }
        const data = await factory();
        try {
            await this.redis.setex(key, ttl, JSON.stringify(data));
            this.logger.debug(`Cache SET: ${key} (TTL: ${ttl}s)`);
        }
        catch (e) {
            this.logger.warn(`Cache write error: ${e}`);
        }
        return data;
    }
    async getSummary(companyId, year, month) {
        const cacheKey = `dashboard:summary:${companyId}:${year}:${month}`;
        return this.cached(cacheKey, CACHE_TTL.SUMMARY, () => this._getSummaryImpl(companyId, year, month));
    }
    async _getSummaryImpl(companyId, year, month) {
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
        const headcount = run.payslips.length;
        const grossTotal = run.payslips.reduce((sum, p) => sum + Number(p.grossSalary), 0);
        const deductionsTotal = run.payslips.reduce((sum, p) => sum + Number(p.totalDeductions), 0);
        const netTotal = run.payslips.reduce((sum, p) => sum + Number(p.netSalary), 0);
        const gosiTotal = run.payslips.reduce((sum, p) => sum + p.lines.reduce((s, l) => (l.component.code === 'GOSI_DED' ? s + Number(l.amount) : s), 0), 0);
        const employerGosiTotal = run.payslips.reduce((sum, p) => sum + p.lines.reduce((s, l) => (l.component.code.startsWith('GOSI_') && l.component.code !== 'GOSI_DED' ? s + Number(l.amount) : s), 0), 0);
        const eosSettlementTotal = run.payslips.reduce((sum, p) => sum + p.lines.reduce((s, l) => (l.component.code === 'EOS_SETTLEMENT' ? s + Number(l.amount) : s), 0), 0);
        const ledger = await this.prisma.payrollLedger.findFirst({
            where: { runId: run.id }
        });
        const ledgerDraftAmount = ledger?.status === 'DRAFT' ? Number(ledger.totalNet) : 0;
        const ledgerPostedAmount = ledger?.status === 'POSTED' ? Number(ledger.totalNet) : 0;
        let wpsStatus = 'NOT_STARTED';
        if (run.lockedAt)
            wpsStatus = 'READY';
        if (run.status === 'PAID')
            wpsStatus = 'EXPORTED';
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
    async getHealth(companyId, year, month) {
        const period = await this.prisma.payrollPeriod.findFirst({
            where: { companyId, year, month }
        });
        const gosiConfig = await this.prisma.gosiConfig.findFirst({
            where: { companyId, isActive: true }
        });
        const policies = await this.prisma.policy.count({
            where: { companyId, isActive: true }
        });
        const run = period ? await this.prisma.payrollRun.findFirst({
            where: { companyId, periodId: period.id, isAdjustment: false },
            include: { _count: { select: { payslips: true } } }
        }) : null;
        const pendingLeaves = await this.prisma.leaveRequest.count({
            where: {
                companyId,
                status: 'PENDING'
            }
        });
        const pendingAdvances = await this.prisma.advanceRequest.count({
            where: {
                companyId,
                status: 'PENDING'
            }
        });
        let attendanceStatus = 'MISSING';
        if (period) {
            const attendanceCount = await this.prisma.attendance.count({
                where: {
                    companyId,
                    date: { gte: period.startDate, lte: period.endDate }
                }
            });
            if (attendanceCount > 0)
                attendanceStatus = 'COMPLETE';
        }
        const latestMudadLog = await this.prisma.submissionStatusLog.findFirst({
            where: { companyId, entityType: 'MUDAD' },
            orderBy: { changedAt: 'desc' }
        });
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
    async getExceptions(companyId, year, month) {
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
        const adjustedPayslips = await this.prisma.payslip.count({
            where: {
                run: { companyId, periodId: period.id, isAdjustment: true }
            }
        });
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
                isSaudi: false,
            }
        });
        const stuckSubmissionsCount = await this.prisma.submissionStatusLog.count({
            where: {
                companyId,
                toStatus: { in: ['FAILED', 'RESUBMIT_REQUIRED'] },
                changedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
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
    async getTrends(companyId, months = 4) {
        const now = new Date();
        const periods = [];
        const gross = [];
        const net = [];
        const gosi = [];
        const otHours = [];
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
                    if (line.component.code === 'GOSI_DED')
                        monthGosi += Number(line.amount);
                    if (line.component.code === 'OVERTIME_EARN')
                        monthOt += Number(line.amount);
                }
            }
            gosi.push(monthGosi);
            otHours.push(monthOt);
        }
        return { periods, gross, net, gosi, otHours };
    }
    async getUsersQuickStats(companyId) {
        const cacheKey = `dashboard:users-stats:${companyId}`;
        return this.cached(cacheKey, 60, () => this._getUsersQuickStatsImpl(companyId));
    }
    async _getUsersQuickStatsImpl(companyId) {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const totalActive = await this.prisma.user.count({
            where: {
                companyId,
                status: 'ACTIVE',
                role: { in: ['EMPLOYEE', 'MANAGER'] }
            }
        });
        const newThisMonth = await this.prisma.user.count({
            where: {
                companyId,
                status: 'ACTIVE',
                hireDate: { gte: startOfMonth }
            }
        });
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
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = DashboardService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)('REDIS_CLIENT')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ioredis_1.default])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map