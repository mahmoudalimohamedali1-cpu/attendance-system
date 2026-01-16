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
exports.WpsGeneratorService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const ExcelJS = require("exceljs");
const library_1 = require("@prisma/client/runtime/library");
let WpsGeneratorService = class WpsGeneratorService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateWpsExcel(runId, companyId) {
        const run = await this.prisma.payrollRun.findFirst({
            where: { id: runId, companyId },
            include: {
                period: true,
                payslips: {
                    include: {
                        employee: {
                            include: {
                                bankAccounts: { where: { isPrimary: true } }
                            }
                        },
                        lines: { include: { component: true } }
                    }
                }
            }
        });
        if (!run)
            throw new Error('تشغيل الرواتب غير موجود');
        const companyBank = await this.prisma.companyBankAccount.findFirst({
            where: { companyId, isPrimary: true }
        });
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('WPS SIF File');
        const headers = [
            'Employee ID / Iqama',
            'Employee Name',
            'Bank ID',
            'IBAN',
            'Net Salary',
            'Basic Salary',
            'Housing Allowance',
            'Other Allowances',
            'Deductions',
            'Record Type',
            'MOL ID',
        ];
        const headerRow = sheet.addRow(headers);
        headerRow.font = { bold: true };
        for (const payslip of run.payslips) {
            const emp = payslip.employee;
            const bankAccount = emp.bankAccounts[0];
            let housingAllowance = new library_1.Decimal(0);
            let otherAllowances = new library_1.Decimal(0);
            for (const line of payslip.lines) {
                if (line.component.type === 'EARNING') {
                    if (line.component.code === 'HRA' || line.component.nameAr.includes('سكن')) {
                        housingAllowance = housingAllowance.add(line.amount);
                    }
                    else if (line.component.code !== 'BASIC') {
                        otherAllowances = otherAllowances.add(line.amount);
                    }
                }
            }
            sheet.addRow([
                emp.nationalId || emp.employeeCode || '-',
                `${emp.firstName} ${emp.lastName}`,
                bankAccount?.bankName || companyBank?.bankName || '-',
                bankAccount?.iban || '-',
                Number(payslip.netSalary),
                Number(payslip.baseSalary),
                Number(housingAllowance),
                Number(otherAllowances),
                Number(payslip.totalDeductions),
                'Salary',
                companyBank?.molId || '-',
            ]);
        }
        sheet.columns = [
            { width: 20 },
            { width: 30 },
            { width: 15 },
            { width: 30 },
            { width: 15 },
            { width: 15 },
            { width: 15 },
            { width: 15 },
            { width: 15 },
        ];
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
    async generateWpsCsv(runId, companyId) {
        const run = await this.prisma.payrollRun.findFirst({
            where: { id: runId, companyId },
            include: {
                payslips: {
                    include: {
                        employee: {
                            include: {
                                bankAccounts: { where: { isPrimary: true } }
                            }
                        },
                        lines: { include: { component: true } }
                    }
                }
            }
        });
        if (!run)
            throw new Error('تشغيل الرواتب غير موجود');
        let csv = 'EmployeeID,Name,IBAN,NetSalary,BasicSalary,Housing,Other,Deductions\n';
        for (const payslip of run.payslips) {
            const emp = payslip.employee;
            const bankAccount = emp.bankAccounts[0];
            let housing = 0;
            let other = 0;
            payslip.lines.forEach(l => {
                if (l.component.type === 'EARNING') {
                    if (l.component.code === 'HRA')
                        housing += Number(l.amount);
                    else if (l.component.code !== 'BASIC')
                        other += Number(l.amount);
                }
            });
            csv += `${emp.nationalId || '-'},${emp.firstName} ${emp.lastName},${bankAccount?.iban || '-'},${payslip.netSalary},${payslip.baseSalary},${housing},${other},${payslip.totalDeductions}\n`;
        }
        return csv;
    }
};
exports.WpsGeneratorService = WpsGeneratorService;
exports.WpsGeneratorService = WpsGeneratorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WpsGeneratorService);
//# sourceMappingURL=wps-generator.service.js.map