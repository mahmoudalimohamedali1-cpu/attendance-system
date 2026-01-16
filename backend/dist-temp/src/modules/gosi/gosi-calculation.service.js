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
var GosiCalculationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GosiCalculationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
const payslip_lines_service_1 = require("../payslips/payslip-lines.service");
let GosiCalculationService = GosiCalculationService_1 = class GosiCalculationService {
    constructor(prisma, payslipLinesService) {
        this.prisma = prisma;
        this.payslipLinesService = payslipLinesService;
        this.logger = new common_1.Logger(GosiCalculationService_1.name);
    }
    normalizeMoney(amount) {
        return Math.round(amount * 100) / 100;
    }
    async getActiveConfig(companyId) {
        return this.prisma.gosiConfig.findFirst({
            where: { companyId, isActive: true },
            orderBy: { effectiveDate: 'desc' }
        });
    }
    isEmployeeEligible(employee, config) {
        if (config.isSaudiOnly) {
            return employee.isSaudi === true;
        }
        return true;
    }
    async calculateGosiBase(payslipId, baseSalary, companyId, config) {
        const lines = await this.prisma.payslipLine.findMany({
            where: { payslipId },
            include: { component: true }
        });
        let base = 0;
        const components = [];
        for (const line of lines) {
            if (line.sign === 'EARNING' && line.component.gosiEligible) {
                base += Number(line.amount);
                components.push(line.component.code);
            }
        }
        if (base === 0) {
            base = baseSalary;
            components.push('BASIC (fallback)');
        }
        const minBase = Number(config.minBaseSalary) || 0;
        const maxCap = Number(config.maxCapAmount) || 45000;
        if (base < minBase)
            base = minBase;
        if (base > maxCap)
            base = maxCap;
        return {
            base: this.normalizeMoney(base),
            components
        };
    }
    calculateShares(base, config) {
        const employeeRate = Number(config.employeeRate) / 100;
        const sanedRate = Number(config.sanedRate) / 100;
        const employeeShare = this.normalizeMoney(base * (employeeRate + sanedRate));
        const employerRate = Number(config.employerRate) / 100;
        const hazardRate = Number(config.hazardRate) / 100;
        const employerShare = this.normalizeMoney(base * (employerRate + hazardRate));
        return { employeeShare, employerShare };
    }
    async calculateForEmployee(employeeId, payslipId, baseSalary, companyId) {
        const trace = [];
        const config = await this.getActiveConfig(companyId);
        if (!config) {
            return {
                result: {
                    applies: false,
                    reason: 'لا يوجد إعدادات GOSI نشطة للشركة',
                    base: 0,
                    employeeShare: 0,
                    employerShare: 0,
                    breakdown: { employeeRate: 0, employerRate: 0, sanedRate: 0, hazardRate: 0 }
                },
                trace
            };
        }
        const employee = await this.prisma.user.findUnique({
            where: { id: employeeId },
            select: { isSaudi: true, nationality: true }
        });
        if (!employee) {
            return {
                result: {
                    applies: false,
                    reason: 'الموظف غير موجود',
                    base: 0,
                    employeeShare: 0,
                    employerShare: 0,
                    breakdown: { employeeRate: 0, employerRate: 0, sanedRate: 0, hazardRate: 0 }
                },
                trace
            };
        }
        if (!this.isEmployeeEligible(employee, config)) {
            trace.push({
                step: 'gosiEligibility',
                description: 'التحقق من الأهلية للتأمينات',
                formula: `isSaudi=${employee.isSaudi}, isSaudiOnly=${config.isSaudiOnly}`,
                result: 0
            });
            return {
                result: {
                    applies: false,
                    reason: 'الموظف غير سعودي والتأمينات للسعوديين فقط',
                    base: 0,
                    employeeShare: 0,
                    employerShare: 0,
                    breakdown: {
                        employeeRate: Number(config.employeeRate),
                        employerRate: Number(config.employerRate),
                        sanedRate: Number(config.sanedRate),
                        hazardRate: Number(config.hazardRate)
                    }
                },
                trace
            };
        }
        trace.push({
            step: 'gosiEligibility',
            description: 'التحقق من الأهلية للتأمينات',
            formula: `isSaudi=${employee.isSaudi} ✅`,
            result: 1
        });
        const { base, components } = await this.calculateGosiBase(payslipId, baseSalary, companyId, {
            minBaseSalary: Number(config.minBaseSalary),
            maxCapAmount: Number(config.maxCapAmount),
            includeAllowances: config.includeAllowances
        });
        trace.push({
            step: 'gosiBase',
            description: 'قاعدة حساب التأمينات',
            formula: `SUM(${components.join(', ')}) = ${base} (cap: ${config.maxCapAmount})`,
            result: base
        });
        const { employeeShare, employerShare } = this.calculateShares(base, {
            employeeRate: Number(config.employeeRate),
            employerRate: Number(config.employerRate),
            sanedRate: Number(config.sanedRate),
            hazardRate: Number(config.hazardRate)
        });
        trace.push({
            step: 'gosiEmployee',
            description: 'اشتراك الموظف',
            formula: `${base} × (${config.employeeRate}% + ${config.sanedRate}%) = ${employeeShare}`,
            result: employeeShare
        });
        trace.push({
            step: 'gosiEmployer',
            description: 'مساهمة صاحب العمل',
            formula: `${base} × (${config.employerRate}% + ${config.hazardRate}%) = ${employerShare}`,
            result: employerShare
        });
        return {
            result: {
                applies: true,
                base,
                employeeShare,
                employerShare,
                breakdown: {
                    employeeRate: Number(config.employeeRate),
                    employerRate: Number(config.employerRate),
                    sanedRate: Number(config.sanedRate),
                    hazardRate: Number(config.hazardRate)
                }
            },
            trace
        };
    }
    async saveGosiLines(payslipId, employeeShare, employerShare, companyId) {
        const payslip = await this.prisma.payslip.findUnique({
            where: { id: payslipId },
            include: { run: true }
        });
        if (payslip?.run?.lockedAt) {
            return { saved: false, error: 'Run is locked, cannot modify GOSI lines' };
        }
        await this.prisma.payslipLine.deleteMany({
            where: { payslipId, sourceType: client_1.PayslipLineSource.STATUTORY }
        });
        let employeeComponent = await this.prisma.salaryComponent.findFirst({
            where: { companyId, code: 'GOSI_EMPLOYEE' }
        });
        if (!employeeComponent) {
            employeeComponent = await this.prisma.salaryComponent.create({
                data: {
                    companyId,
                    code: 'GOSI_EMPLOYEE',
                    nameAr: 'خصم التأمينات (الموظف)',
                    nameEn: 'GOSI Employee Contribution',
                    type: 'DEDUCTION',
                    gosiEligible: false,
                    isActive: true
                }
            });
        }
        let employerComponent = await this.prisma.salaryComponent.findFirst({
            where: { companyId, code: 'GOSI_EMPLOYER' }
        });
        if (!employerComponent) {
            employerComponent = await this.prisma.salaryComponent.create({
                data: {
                    companyId,
                    code: 'GOSI_EMPLOYER',
                    nameAr: 'مساهمة التأمينات (صاحب العمل)',
                    nameEn: 'GOSI Employer Contribution',
                    type: 'EARNING',
                    gosiEligible: false,
                    isActive: true
                }
            });
        }
        const linesToCreate = [];
        if (employeeShare > 0) {
            linesToCreate.push({
                payslipId,
                componentId: employeeComponent.id,
                sign: 'DEDUCTION',
                amount: this.normalizeMoney(employeeShare),
                sourceType: client_1.PayslipLineSource.STATUTORY,
                sourceRef: 'GOSI',
                descriptionAr: 'خصم التأمينات الاجتماعية (الموظف)',
            });
        }
        if (employerShare > 0) {
            linesToCreate.push({
                payslipId,
                componentId: employerComponent.id,
                sign: 'EARNING',
                amount: this.normalizeMoney(employerShare),
                sourceType: client_1.PayslipLineSource.STATUTORY,
                sourceRef: 'GOSI_EMPLOYER',
                descriptionAr: 'مساهمة التأمينات الاجتماعية (صاحب العمل)',
            });
        }
        if (linesToCreate.length > 0) {
            await this.prisma.payslipLine.createMany({ data: linesToCreate });
            this.logger.log(`Saved ${linesToCreate.length} GOSI lines for payslip ${payslipId}`);
        }
        return { saved: true };
    }
    async generateReport(runId, companyId) {
        const payslips = await this.prisma.payslip.findMany({
            where: { runId, companyId },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        isSaudi: true,
                        nationality: true
                    }
                },
                lines: {
                    where: { sourceType: client_1.PayslipLineSource.STATUTORY },
                    include: { component: true }
                }
            }
        });
        const report = payslips.map(payslip => {
            const employeeLine = payslip.lines.find(l => l.component.code === 'GOSI_EMPLOYEE');
            const employerLine = payslip.lines.find(l => l.component.code === 'GOSI_EMPLOYER');
            return {
                employeeId: payslip.employee.id,
                employeeCode: payslip.employee.employeeCode || '-',
                employeeName: `${payslip.employee.firstName} ${payslip.employee.lastName}`,
                isSaudi: payslip.employee.isSaudi,
                nationality: payslip.employee.nationality,
                baseSalary: Number(payslip.baseSalary),
                employeeShare: employeeLine ? Number(employeeLine.amount) : 0,
                employerShare: employerLine ? Number(employerLine.amount) : 0,
                totalContribution: (employeeLine ? Number(employeeLine.amount) : 0) +
                    (employerLine ? Number(employerLine.amount) : 0)
            };
        });
        const totals = {
            totalEmployees: report.filter(r => r.employeeShare > 0).length,
            totalEmployeeShare: report.reduce((sum, r) => sum + r.employeeShare, 0),
            totalEmployerShare: report.reduce((sum, r) => sum + r.employerShare, 0),
            grandTotal: report.reduce((sum, r) => sum + r.totalContribution, 0)
        };
        return { report, totals };
    }
};
exports.GosiCalculationService = GosiCalculationService;
exports.GosiCalculationService = GosiCalculationService = GosiCalculationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        payslip_lines_service_1.PayslipLinesService])
], GosiCalculationService);
//# sourceMappingURL=gosi-calculation.service.js.map