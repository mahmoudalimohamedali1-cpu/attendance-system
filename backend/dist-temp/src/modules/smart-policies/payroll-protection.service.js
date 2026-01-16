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
var PayrollProtectionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollProtectionService = exports.SAUDI_LABOR_LAW_LIMITS = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
exports.SAUDI_LABOR_LAW_LIMITS = {
    MAX_MONTHLY_DEDUCTION_PERCENTAGE: 50,
    MAX_SINGLE_PENALTY_DAYS: 5,
    MAX_SUSPENSION_WITHOUT_PAY_DAYS: 5,
    TERMINATION_REQUIRES_INVESTIGATION: true,
};
let PayrollProtectionService = PayrollProtectionService_1 = class PayrollProtectionService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(PayrollProtectionService_1.name);
    }
    async isPayrollPeriodLocked(companyId, year, month) {
        const now = new Date();
        const targetYear = year || now.getFullYear();
        const targetMonth = month || (now.getMonth() + 1);
        const period = await this.prisma.payrollPeriod.findFirst({
            where: {
                companyId,
                year: targetYear,
                month: targetMonth,
            },
        });
        if (!period) {
            return {
                isLocked: false,
                message: 'لا توجد فترة رواتب لهذا الشهر',
            };
        }
        const lockedStatuses = ['LOCKED', 'APPROVED', 'PAID'];
        if (lockedStatuses.includes(period.status)) {
            return {
                isLocked: true,
                lockedPeriod: `${targetYear}-${targetMonth.toString().padStart(2, '0')}`,
                lockedAt: period.lockedAt || undefined,
                lockedBy: period.lockedBy || undefined,
                message: `فترة الرواتب ${targetMonth}/${targetYear} مقفلة ولا يمكن تعديل السياسات`,
            };
        }
        return {
            isLocked: false,
            lockedPeriod: `${targetYear}-${targetMonth.toString().padStart(2, '0')}`,
        };
    }
    async validatePolicyModification(companyId, policyId) {
        const lockCheck = await this.isPayrollPeriodLocked(companyId);
        if (lockCheck.isLocked) {
            throw new common_1.BadRequestException(`لا يمكن تعديل السياسة أثناء فترة الرواتب المقفلة (${lockCheck.lockedPeriod}). ` +
                'يرجى الانتظار حتى فتح الفترة الجديدة أو التواصل مع مدير الرواتب.');
        }
        const activeRun = await this.prisma.payrollRun.findFirst({
            where: {
                companyId,
                status: { in: ['PROCESSING', 'CALCULATING'] },
            },
        });
        if (activeRun) {
            throw new common_1.BadRequestException('لا يمكن تعديل السياسة أثناء معالجة الرواتب. يرجى الانتظار حتى اكتمال العملية.');
        }
    }
    validateLaborLawLimits(baseSalary, totalDeductions, penaltyDays) {
        const violations = [];
        let adjustedDeductions = totalDeductions;
        const maxAllowedDeduction = baseSalary * (exports.SAUDI_LABOR_LAW_LIMITS.MAX_MONTHLY_DEDUCTION_PERCENTAGE / 100);
        if (totalDeductions > maxAllowedDeduction) {
            violations.push(`الخصم الإجمالي (${totalDeductions.toFixed(2)} ريال) يتجاوز الحد القانوني ` +
                `(${exports.SAUDI_LABOR_LAW_LIMITS.MAX_MONTHLY_DEDUCTION_PERCENTAGE}% = ${maxAllowedDeduction.toFixed(2)} ريال) - المادة 95`);
            adjustedDeductions = maxAllowedDeduction;
        }
        if (penaltyDays && penaltyDays > exports.SAUDI_LABOR_LAW_LIMITS.MAX_SINGLE_PENALTY_DAYS) {
            violations.push(`عدد أيام العقوبة (${penaltyDays}) يتجاوز الحد القانوني ` +
                `(${exports.SAUDI_LABOR_LAW_LIMITS.MAX_SINGLE_PENALTY_DAYS} أيام) - المادة 95`);
        }
        return {
            isValid: violations.length === 0,
            violations,
            adjustedDeductions: violations.length > 0 ? adjustedDeductions : undefined,
        };
    }
    async applyLaborLawCaps(employeeId, companyId, year, month, proposedDeductions) {
        const employee = await this.prisma.user.findUnique({
            where: { id: employeeId },
            select: { salary: true },
        });
        if (!employee || !employee.salary) {
            this.logger.warn(`Employee ${employeeId} has no salary defined`);
            return {
                original: 0,
                capped: 0,
                wasCapped: false,
                details: [],
            };
        }
        const baseSalary = Number(employee.salary);
        const maxDeduction = baseSalary * (exports.SAUDI_LABOR_LAW_LIMITS.MAX_MONTHLY_DEDUCTION_PERCENTAGE / 100);
        const totalOriginal = proposedDeductions.reduce((sum, d) => sum + d.amount, 0);
        if (totalOriginal <= maxDeduction) {
            return {
                original: totalOriginal,
                capped: totalOriginal,
                wasCapped: false,
                details: proposedDeductions.map(d => ({
                    code: d.code,
                    originalAmount: d.amount,
                    cappedAmount: d.amount,
                })),
            };
        }
        const ratio = maxDeduction / totalOriginal;
        const cappedDetails = proposedDeductions.map(d => ({
            code: d.code,
            originalAmount: d.amount,
            cappedAmount: Math.round(d.amount * ratio * 100) / 100,
        }));
        this.logger.warn(`Deductions capped for employee ${employeeId}: ${totalOriginal} -> ${maxDeduction}`);
        return {
            original: totalOriginal,
            capped: maxDeduction,
            wasCapped: true,
            details: cappedDetails,
        };
    }
    async getRecentPeriodsLockStatus(companyId, monthsBack = 6) {
        const now = new Date();
        const periods = [];
        for (let i = 0; i < monthsBack; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const period = await this.prisma.payrollPeriod.findFirst({
                where: { companyId, year, month },
                select: {
                    id: true,
                    year: true,
                    month: true,
                    status: true,
                    lockedAt: true,
                    lockedBy: true,
                },
            });
            periods.push({
                period: `${year}-${month.toString().padStart(2, '0')}`,
                exists: !!period,
                status: period?.status || 'NOT_CREATED',
                isLocked: period ? ['LOCKED', 'APPROVED', 'PAID'].includes(period.status) : false,
                lockedAt: period?.lockedAt,
            });
        }
        return periods;
    }
    async canApplyRetroactively(companyId, startPeriod, endPeriod) {
        const [startYear, startMonth] = startPeriod.split('-').map(Number);
        const [endYear, endMonth] = endPeriod.split('-').map(Number);
        const blockedPeriods = [];
        let currentYear = startYear;
        let currentMonth = startMonth;
        while (currentYear < endYear ||
            (currentYear === endYear && currentMonth <= endMonth)) {
            const period = await this.prisma.payrollPeriod.findFirst({
                where: {
                    companyId,
                    year: currentYear,
                    month: currentMonth,
                    status: 'PAID',
                },
            });
            if (period) {
                blockedPeriods.push(`${currentYear}-${currentMonth.toString().padStart(2, '0')}`);
            }
            currentMonth++;
            if (currentMonth > 12) {
                currentMonth = 1;
                currentYear++;
            }
        }
        return {
            canApply: blockedPeriods.length === 0,
            blockedPeriods,
            message: blockedPeriods.length > 0
                ? `الفترات التالية تم صرف رواتبها ولا يمكن تعديلها: ${blockedPeriods.join(', ')}`
                : undefined,
        };
    }
};
exports.PayrollProtectionService = PayrollProtectionService;
exports.PayrollProtectionService = PayrollProtectionService = PayrollProtectionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PayrollProtectionService);
//# sourceMappingURL=payroll-protection.service.js.map