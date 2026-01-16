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
exports.ExceptionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let ExceptionsService = class ExceptionsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async validateEmployeesForPayroll(companyId) {
        const exceptions = [];
        const employees = await this.prisma.user.findMany({
            where: { companyId, status: 'ACTIVE' },
            include: {
                bankAccounts: { where: { isPrimary: true }, take: 1 },
                salaryAssignments: { where: { isActive: true }, take: 1 },
                contracts: { where: { status: 'ACTIVE' }, take: 1 },
            },
        });
        for (const emp of employees) {
            const empName = `${emp.firstName} ${emp.lastName}`;
            if (emp.bankAccounts.length === 0) {
                exceptions.push({
                    type: 'MISSING_BANK',
                    severity: 'ERROR',
                    employeeId: emp.id,
                    employeeCode: emp.employeeCode || '',
                    employeeName: empName,
                    message: 'لا يوجد حساب بنكي رئيسي',
                });
            }
            else {
                const iban = emp.bankAccounts[0].iban;
                if (!iban || !/^SA[0-9A-Z]{22}$/i.test(iban.replace(/\s/g, ''))) {
                    exceptions.push({
                        type: 'INVALID_IBAN',
                        severity: 'ERROR',
                        employeeId: emp.id,
                        employeeCode: emp.employeeCode || '',
                        employeeName: empName,
                        message: `IBAN غير صحيح: ${iban || 'فارغ'}`,
                        details: { iban },
                    });
                }
            }
            if (emp.salaryAssignments.length === 0) {
                exceptions.push({
                    type: 'MISSING_SALARY',
                    severity: 'ERROR',
                    employeeId: emp.id,
                    employeeCode: emp.employeeCode || '',
                    employeeName: empName,
                    message: 'لا يوجد هيكل راتب معين',
                });
            }
            if (emp.contracts.length === 0) {
                exceptions.push({
                    type: 'MISSING_CONTRACT',
                    severity: 'WARNING',
                    employeeId: emp.id,
                    employeeCode: emp.employeeCode || '',
                    employeeName: empName,
                    message: 'لا يوجد عقد نشط',
                });
            }
        }
        const nearExpiry = new Date();
        nearExpiry.setDate(nearExpiry.getDate() + 30);
        const expiringContracts = await this.prisma.contract.findMany({
            where: {
                user: { companyId, status: 'ACTIVE' },
                status: 'ACTIVE',
                endDate: { lte: nearExpiry },
            },
            include: { user: true },
        });
        for (const contract of expiringContracts) {
            exceptions.push({
                type: 'EXPIRED_CONTRACT',
                severity: 'WARNING',
                employeeId: contract.userId,
                employeeCode: contract.user.employeeCode || '',
                employeeName: `${contract.user.firstName} ${contract.user.lastName}`,
                message: `العقد ينتهي في ${contract.endDate?.toISOString().slice(0, 10)}`,
                details: { endDate: contract.endDate },
            });
        }
        exceptions.sort((a, b) => {
            if (a.severity !== b.severity)
                return a.severity === 'ERROR' ? -1 : 1;
            return a.type.localeCompare(b.type);
        });
        const errorCount = exceptions.filter(e => e.severity === 'ERROR').length;
        const warningCount = exceptions.filter(e => e.severity === 'WARNING').length;
        const employeesWithIssues = new Set(exceptions.map(e => e.employeeId)).size;
        const byType = Object.entries(exceptions.reduce((acc, e) => {
            acc[e.type] = (acc[e.type] || 0) + 1;
            return acc;
        }, {})).map(([type, count]) => ({ type, count }));
        return {
            totalEmployees: employees.length,
            employeesWithIssues,
            errorCount,
            warningCount,
            exceptions,
            byType,
        };
    }
    async validatePayrollRun(payrollRunId, companyId) {
        const exceptions = [];
        const payrollRun = await this.prisma.payrollRun.findFirst({
            where: { id: payrollRunId, companyId },
            include: {
                payslips: {
                    include: {
                        employee: {
                            include: {
                                bankAccounts: { where: { isPrimary: true }, take: 1 },
                            },
                        },
                    },
                },
            },
        });
        if (!payrollRun) {
            return {
                totalEmployees: 0,
                employeesWithIssues: 0,
                errorCount: 1,
                warningCount: 0,
                exceptions: [{
                        type: 'MISSING_SALARY',
                        severity: 'ERROR',
                        employeeId: '',
                        employeeCode: '',
                        employeeName: '',
                        message: 'مسير الرواتب غير موجود',
                    }],
                byType: [],
            };
        }
        for (const payslip of payrollRun.payslips) {
            const emp = payslip.employee;
            const empName = `${emp.firstName} ${emp.lastName}`;
            if (Number(payslip.netSalary) <= 0) {
                exceptions.push({
                    type: 'NEGATIVE_NET',
                    severity: 'ERROR',
                    employeeId: emp.id,
                    employeeCode: emp.employeeCode || '',
                    employeeName: empName,
                    message: `الصافي سالب أو صفر: ${payslip.netSalary}`,
                    details: {
                        grossSalary: payslip.grossSalary,
                        totalDeductions: payslip.totalDeductions,
                        netSalary: payslip.netSalary,
                    },
                });
            }
            if (emp.bankAccounts.length === 0) {
                exceptions.push({
                    type: 'MISSING_BANK',
                    severity: 'ERROR',
                    employeeId: emp.id,
                    employeeCode: emp.employeeCode || '',
                    employeeName: empName,
                    message: 'لا يوجد حساب بنكي رئيسي',
                });
            }
        }
        exceptions.sort((a, b) => a.severity === 'ERROR' ? -1 : 1);
        const errorCount = exceptions.filter(e => e.severity === 'ERROR').length;
        const warningCount = exceptions.filter(e => e.severity === 'WARNING').length;
        const employeesWithIssues = new Set(exceptions.map(e => e.employeeId)).size;
        const byType = Object.entries(exceptions.reduce((acc, e) => {
            acc[e.type] = (acc[e.type] || 0) + 1;
            return acc;
        }, {})).map(([type, count]) => ({ type, count }));
        return {
            totalEmployees: payrollRun.payslips.length,
            employeesWithIssues,
            errorCount,
            warningCount,
            exceptions,
            byType,
        };
    }
    async getQuickStats(companyId) {
        const [missingBank, missingSalary, expiringContracts] = await Promise.all([
            this.prisma.user.count({
                where: {
                    companyId,
                    status: 'ACTIVE',
                    bankAccounts: { none: {} },
                },
            }),
            this.prisma.user.count({
                where: {
                    companyId,
                    status: 'ACTIVE',
                    salaryAssignments: { none: { isActive: true } },
                },
            }),
            this.prisma.contract.count({
                where: {
                    user: { companyId, status: 'ACTIVE' },
                    status: 'ACTIVE',
                    endDate: {
                        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        gte: new Date(),
                    },
                },
            }),
        ]);
        return {
            missingBank,
            missingSalary,
            expiringContracts,
            totalIssues: missingBank + missingSalary + expiringContracts,
        };
    }
};
exports.ExceptionsService = ExceptionsService;
exports.ExceptionsService = ExceptionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExceptionsService);
//# sourceMappingURL=exceptions.service.js.map