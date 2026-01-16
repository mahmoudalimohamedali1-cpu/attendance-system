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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollRunsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const library_1 = require("@prisma/client/runtime/library");
const client_1 = require("@prisma/client");
const payroll_calculation_service_1 = require("../payroll-calculation/payroll-calculation.service");
const payroll_ledger_service_1 = require("../payroll-calculation/payroll-ledger.service");
const audit_service_1 = require("../audit/audit.service");
let PayrollRunsService = class PayrollRunsService {
    constructor(prisma, calculationService, auditService, ledgerService) {
        this.prisma = prisma;
        this.calculationService = calculationService;
        this.auditService = auditService;
        this.ledgerService = ledgerService;
    }
    async create(dto, companyId, userId) {
        const period = await this.prisma.payrollPeriod.findFirst({ where: { id: dto.periodId, companyId } });
        if (!period)
            throw new common_1.NotFoundException('فترة الرواتب غير موجودة');
        if (period.status === 'PAID')
            throw new common_1.BadRequestException('لا يمكن تشغيل الرواتب لفترة مدفوعة بالفعل');
        const existingRun = await this.prisma.payrollRun.findFirst({
            where: {
                periodId: dto.periodId,
                companyId,
                status: { notIn: ['CANCELLED', 'ARCHIVED'] }
            }
        });
        if (existingRun) {
            throw new common_1.BadRequestException(`يوجد تشغيل رواتب سابق لهذه الفترة (ID: ${existingRun.id}). ` +
                `الحالة: ${existingRun.status}. ` +
                `يرجى إلغاء التشغيل السابق أو استخدام فترة جديدة.`);
        }
        let loanComp = await this.prisma.salaryComponent.findFirst({ where: { code: 'LOAN_DED', companyId } });
        if (!loanComp) {
            loanComp = await this.prisma.salaryComponent.create({
                data: { code: 'LOAN_DED', nameAr: 'خصم سلفة', type: 'DEDUCTION', nature: 'VARIABLE', companyId }
            });
        }
        const employees = await this.prisma.user.findMany({
            where: {
                companyId,
                id: dto.employeeIds ? { in: dto.employeeIds } : undefined,
                branchId: dto.branchId || undefined,
                status: 'ACTIVE',
                salaryAssignments: { some: { isActive: true } }
            },
            include: {
                salaryAssignments: {
                    where: { isActive: true },
                    include: {
                        structure: true
                    }
                },
                advanceRequests: {
                    where: {
                        status: 'APPROVED',
                        startDate: { lte: period.endDate },
                        endDate: { gte: period.startDate }
                    }
                },
                costCenterAllocations: {
                    where: {
                        isActive: true,
                        OR: [
                            { effectiveTo: null },
                            { effectiveTo: { gte: new Date() } }
                        ]
                    },
                    select: {
                        costCenterId: true,
                        percentage: true
                    }
                }
            }
        });
        if (employees.length === 0)
            throw new common_1.BadRequestException('لا يوجد موظفين نشطين لديهم تعيينات رواتب للفلتر المختار');
        const result = await this.prisma.$transaction(async (tx) => {
            const run = await tx.payrollRun.create({
                data: {
                    companyId,
                    periodId: dto.periodId,
                    processedBy: userId,
                    status: 'DRAFT'
                }
            });
            for (const employee of employees) {
                const calculation = await this.calculationService.calculateForEmployee(employee.id, companyId, period.year, period.month);
                const assignment = employee.salaryAssignments[0];
                const baseSalary = assignment.baseSalary;
                const payslipLines = [];
                const employeeCostCenterId = employee.costCenterId;
                const allocations = employee.costCenterAllocations || [];
                const getPrimaryCostCenterId = () => {
                    if (allocations.length > 0) {
                        const primary = allocations.reduce((max, curr) => Number(curr.percentage) > Number(max.percentage) ? curr : max);
                        return primary.costCenterId;
                    }
                    return employeeCostCenterId || null;
                };
                const primaryCostCenterId = getPrimaryCostCenterId();
                if (calculation.policyLines) {
                    for (const pl of calculation.policyLines) {
                        let sourceType = client_1.PayslipLineSource.STRUCTURE;
                        if (pl.componentId === 'GOSI-STATUTORY') {
                            sourceType = client_1.PayslipLineSource.STATUTORY || 'STATUTORY';
                        }
                        else if (pl.componentCode === 'SMART' || pl.componentId?.startsWith('SMART-')) {
                            sourceType = client_1.PayslipLineSource.SMART || 'SMART';
                        }
                        payslipLines.push({
                            componentId: pl.componentId,
                            amount: new library_1.Decimal(pl.amount.toFixed(2)),
                            sourceType,
                            sign: pl.sign,
                            descriptionAr: pl.descriptionAr || undefined,
                            sourceRef: pl.source ? `${pl.source.policyId}:${pl.source.ruleId}` : undefined,
                            costCenterId: primaryCostCenterId,
                        });
                    }
                }
                const finalGross = new library_1.Decimal(calculation.grossSalary.toFixed(2));
                const finalDeductions = new library_1.Decimal(calculation.totalDeductions.toFixed(2));
                let finalNet = finalGross.sub(finalDeductions);
                let hasNegativeBalance = false;
                if (finalNet.isNegative()) {
                    hasNegativeBalance = true;
                    console.warn(`⚠️ Negative salary detected for employee ${employee.id}: ${finalNet.toNumber()}`);
                }
                await tx.payslip.create({
                    data: {
                        employeeId: employee.id,
                        companyId,
                        periodId: dto.periodId,
                        runId: run.id,
                        baseSalary: baseSalary,
                        grossSalary: finalGross,
                        totalDeductions: finalDeductions,
                        netSalary: finalNet,
                        status: (hasNegativeBalance ? 'REQUIRES_REVIEW' : 'DRAFT'),
                        calculationTrace: calculation.calculationTrace,
                        lines: {
                            create: payslipLines
                        }
                    }
                });
            }
            const runWithPayslips = await tx.payrollRun.findUnique({
                where: { id: run.id },
                include: {
                    payslips: { select: { id: true } },
                    period: true
                }
            });
            return {
                ...runWithPayslips,
                payslipsCount: runWithPayslips?.payslips?.length || employees.length
            };
        });
        await this.auditService.logPayrollChange(userId, result.id, client_1.AuditAction.CREATE, null, { runId: result.id, periodId: dto.periodId, employeeCount: result.payslipsCount }, `إنشاء دورة رواتب جديدة لـ ${result.payslipsCount} موظف`);
        return result;
    }
    async preview(dto, companyId) {
        const period = await this.prisma.payrollPeriod.findFirst({ where: { id: dto.periodId, companyId } });
        if (!period)
            throw new common_1.NotFoundException('فترة الرواتب غير موجودة');
        const gosiConfig = await this.prisma.gosiConfig.findFirst({
            where: { isActive: true, companyId },
            orderBy: { createdAt: 'desc' }
        });
        const employees = await this.prisma.user.findMany({
            where: {
                companyId,
                branchId: dto.branchId || undefined,
                status: 'ACTIVE',
                salaryAssignments: { some: { isActive: true } }
            },
            include: {
                branch: true,
                department: true,
                jobTitle: true,
                salaryAssignments: {
                    where: { isActive: true },
                    include: { structure: true }
                },
                advanceRequests: {
                    where: {
                        status: 'APPROVED',
                        startDate: { lte: period.endDate },
                        endDate: { gte: period.startDate }
                    }
                }
            }
        });
        let totalGross = new library_1.Decimal(0);
        let totalDeductions = new library_1.Decimal(0);
        let totalNet = new library_1.Decimal(0);
        let totalGosi = new library_1.Decimal(0);
        let totalAdvances = new library_1.Decimal(0);
        let totalBaseSalary = new library_1.Decimal(0);
        const byBranch = {};
        const byDepartment = {};
        const employeePreviews = [];
        for (const employee of employees) {
            const assignment = employee.salaryAssignments?.[0];
            if (!assignment)
                continue;
            totalBaseSalary = totalBaseSalary.add(Number(assignment.baseSalary));
            const calculation = await this.calculationService.calculateForEmployee(employee.id, companyId, period.year, period.month);
            const earnings = (calculation.policyLines || [])
                .filter(pl => pl.sign === 'EARNING')
                .map(pl => ({ name: pl.componentName, code: pl.componentCode, amount: pl.amount }));
            const deductionItems = (calculation.policyLines || [])
                .filter(pl => pl.sign === 'DEDUCTION')
                .map(pl => ({ name: pl.componentName, code: pl.componentCode, amount: pl.amount }));
            let employeeAdvanceAmount = 0;
            const advanceDetails = [];
            for (const adv of employee.advanceRequests || []) {
                const amount = Number(adv.approvedMonthlyDeduction || adv.monthlyDeduction);
                employeeAdvanceAmount += amount;
                advanceDetails.push({ id: adv.id, amount });
                deductionItems.push({ name: 'خصم سلفة', code: 'ADVANCE', amount });
            }
            const finalGross = calculation.grossSalary;
            const finalDeductions = calculation.totalDeductions + employeeAdvanceAmount;
            const finalNet = finalGross - finalDeductions;
            totalGross = totalGross.add(finalGross);
            totalDeductions = totalDeductions.add(finalDeductions);
            totalNet = totalNet.add(finalNet);
            totalAdvances = totalAdvances.add(employeeAdvanceAmount);
            const gosiLine = (calculation.policyLines || []).find(pl => pl.componentCode === 'GOSI');
            const gosiAmount = gosiLine?.amount || 0;
            totalGosi = totalGosi.add(gosiAmount);
            const branchName = employee.branch?.name || 'غير محدد';
            const deptName = employee.department?.name || 'غير محدد';
            if (!byBranch[branchName])
                byBranch[branchName] = { count: 0, gross: 0, net: 0 };
            byBranch[branchName].count++;
            byBranch[branchName].gross += finalGross;
            byBranch[branchName].net += finalNet;
            if (!byDepartment[deptName])
                byDepartment[deptName] = { count: 0, gross: 0, net: 0 };
            byDepartment[deptName].count++;
            byDepartment[deptName].gross += finalGross;
            byDepartment[deptName].net += finalNet;
            employeePreviews.push({
                id: employee.id,
                employeeCode: employee.employeeCode,
                name: `${employee.firstName} ${employee.lastName}`,
                firstName: employee.firstName,
                lastName: employee.lastName,
                branch: branchName,
                department: deptName,
                jobTitle: employee.jobTitle?.titleAr || 'غير محدد',
                isSaudi: employee.isSaudi || false,
                baseSalary: Number(assignment.baseSalary),
                gross: finalGross,
                deductions: finalDeductions,
                gosi: gosiAmount,
                advances: employeeAdvanceAmount,
                net: finalNet,
                earnings,
                deductionItems,
                advanceDetails,
                adjustments: [],
                excluded: false,
            });
        }
        let previousMonth = null;
        try {
            const prevPeriod = await this.prisma.payrollPeriod.findFirst({
                where: {
                    companyId,
                    year: period.month === 1 ? period.year - 1 : period.year,
                    month: period.month === 1 ? 12 : period.month - 1,
                },
            });
            if (prevPeriod) {
                const prevRun = await this.prisma.payrollRun.findFirst({
                    where: { periodId: prevPeriod.id, companyId },
                    include: { payslips: true, _count: { select: { payslips: true } } },
                });
                if (prevRun) {
                    const prevTotals = prevRun.payslips.reduce((acc, p) => ({
                        gross: acc.gross + Number(p.grossSalary),
                        net: acc.net + Number(p.netSalary),
                        deductions: acc.deductions + Number(p.totalDeductions),
                    }), { gross: 0, net: 0, deductions: 0 });
                    previousMonth = {
                        headcount: prevRun._count.payslips,
                        gross: prevTotals.gross,
                        net: prevTotals.net,
                        deductions: prevTotals.deductions,
                    };
                }
            }
        }
        catch { }
        return {
            period: {
                id: period.id,
                month: period.month,
                year: period.year,
                name: `${period.month}/${period.year}`,
            },
            summary: {
                totalEmployees: employees.length,
                totalBaseSalary: Number(totalBaseSalary),
                totalGross: Number(totalGross),
                totalDeductions: Number(totalDeductions),
                totalNet: Number(totalNet),
                totalGosi: Number(totalGosi),
                totalAdvances: Number(totalAdvances),
            },
            comparison: previousMonth ? {
                previousMonth,
                grossChange: Number(totalGross) - previousMonth.gross,
                grossChangePercent: previousMonth.gross > 0 ? ((Number(totalGross) - previousMonth.gross) / previousMonth.gross * 100) : 0,
                netChange: Number(totalNet) - previousMonth.net,
                netChangePercent: previousMonth.net > 0 ? ((Number(totalNet) - previousMonth.net) / previousMonth.net * 100) : 0,
                headcountChange: employees.length - previousMonth.headcount,
            } : null,
            byBranch: Object.entries(byBranch).map(([name, data]) => ({ name, ...data })),
            byDepartment: Object.entries(byDepartment).map(([name, data]) => ({ name, ...data })),
            employees: employeePreviews,
            gosiEnabled: !!gosiConfig,
        };
    }
    async findAll(companyId) {
        return this.prisma.payrollRun.findMany({
            where: { companyId },
            include: {
                period: true,
                _count: { select: { payslips: true } }
            },
            orderBy: { runDate: 'desc' }
        });
    }
    async findOne(id, companyId) {
        return this.prisma.payrollRun.findFirst({
            where: { id, companyId },
            include: {
                period: true,
                payslips: {
                    include: {
                        employee: true,
                        lines: { include: { component: true } }
                    }
                }
            }
        });
    }
    async approve(id, companyId) {
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.payrollRun.update({
                where: { id, companyId },
                data: { status: 'FINANCE_APPROVED' },
            });
            await tx.payslip.updateMany({
                where: { runId: id, companyId },
                data: { status: 'FINANCE_APPROVED' }
            });
            await this.ledgerService.generateLedger(id, companyId);
            return updated;
        });
    }
    async pay(id, companyId) {
        return this.prisma.$transaction(async (tx) => {
            const run = await tx.payrollRun.findFirst({
                where: { id, companyId }
            });
            if (!run)
                throw new common_1.NotFoundException('تشغيل الرواتب غير موجود');
            await tx.payrollRun.update({
                where: { id },
                data: { status: 'PAID' }
            });
            await tx.payslip.updateMany({
                where: { runId: id, companyId },
                data: { status: 'PAID' }
            });
            await tx.payrollPeriod.updateMany({
                where: { id: run.periodId, companyId },
                data: { status: 'PAID' }
            });
            await tx.payrollLedger.update({
                where: { runId: id },
                data: { status: 'POSTED' }
            });
            return run;
        });
    }
};
exports.PayrollRunsService = PayrollRunsService;
exports.PayrollRunsService = PayrollRunsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        payroll_calculation_service_1.PayrollCalculationService,
        audit_service_1.AuditService,
        payroll_ledger_service_1.PayrollLedgerService])
], PayrollRunsService);
//# sourceMappingURL=payroll-runs.service.js.map