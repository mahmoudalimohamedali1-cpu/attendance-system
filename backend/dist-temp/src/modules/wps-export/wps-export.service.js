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
exports.WpsExportService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let WpsExportService = class WpsExportService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateWpsFile(payrollRunId, companyId) {
        const errors = [];
        const payrollRun = await this.prisma.payrollRun.findFirst({
            where: { id: payrollRunId, companyId },
            include: {
                period: true,
                payslips: {
                    include: {
                        employee: {
                            include: {
                                bankAccounts: {
                                    where: { isPrimary: true },
                                    take: 1,
                                },
                            },
                        },
                        lines: {
                            include: {
                                component: true,
                            },
                        },
                    },
                },
            },
        });
        if (!payrollRun) {
            throw new common_1.NotFoundException('تشغيل الرواتب غير موجود');
        }
        if (!['FINANCE_APPROVED', 'LOCKED', 'PAID'].includes(payrollRun.status)) {
            throw new common_1.BadRequestException('يجب اعتماد الرواتب من المالية قبل التصدير');
        }
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
        });
        if (!company) {
            throw new common_1.NotFoundException('الشركة غير موجودة');
        }
        const companyBankAccount = await this.prisma.companyBankAccount.findFirst({
            where: { companyId, isPrimary: true, isActive: true },
        });
        if (!companyBankAccount) {
            throw new common_1.BadRequestException('لا يوجد حساب بنكي رئيسي للشركة. الرجاء إضافة حساب بنكي من إدارة الحسابات البنكية.');
        }
        const wpsRecords = [];
        const period = payrollRun.period;
        for (const payslip of payrollRun.payslips) {
            const employee = payslip.employee;
            const bankAccount = employee.bankAccounts[0];
            if (!employee.nationalId) {
                errors.push(`الموظف ${employee.firstName} ${employee.lastName} (${employee.employeeCode}) ليس لديه رقم هوية/إقامة`);
                continue;
            }
            if (!bankAccount) {
                errors.push(`الموظف ${employee.firstName} ${employee.lastName} (${employee.employeeCode}) ليس لديه حساب بنكي رئيسي`);
                continue;
            }
            if (!this.validateIBAN(bankAccount.iban)) {
                errors.push(`IBAN غير صحيح للموظف ${employee.employeeCode}: ${bankAccount.iban}`);
                continue;
            }
            const netSalary = Number(payslip.netSalary);
            if (netSalary <= 0) {
                errors.push(`الصافي سالب أو صفر للموظف ${employee.employeeCode}: ${netSalary}`);
                continue;
            }
            let housingAllowance = 0;
            let transportAllowance = 0;
            let otherAllowances = 0;
            const basicSalary = Number(payslip.baseSalary || 0);
            for (const line of payslip.lines) {
                const componentCode = line.component?.code?.toUpperCase() || '';
                const amount = Number(line.amount);
                if (line.sign === 'EARNING') {
                    if (componentCode.includes('HOUSING') || componentCode.includes('HRA') || componentCode === 'سكن') {
                        housingAllowance += amount;
                    }
                    else if (componentCode.includes('TRANSPORT') || componentCode.includes('TRA') || componentCode === 'مواصلات') {
                        transportAllowance += amount;
                    }
                    else if (componentCode !== 'BASIC' && !componentCode.includes('BASIC')) {
                        otherAllowances += amount;
                    }
                }
            }
            const startDate = new Date(period.startDate);
            const endDate = new Date(period.endDate);
            const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            wpsRecords.push({
                employeeCode: employee.employeeCode || '',
                nationalId: employee.nationalId,
                employeeName: `${employee.firstName} ${employee.lastName}`,
                iban: bankAccount.iban,
                bankCode: bankAccount.bankCode || this.extractBankCode(bankAccount.iban),
                basicSalary: basicSalary,
                housingAllowance: housingAllowance,
                transportAllowance: transportAllowance,
                otherAllowances: otherAllowances,
                totalEarnings: Number(payslip.grossSalary || 0),
                deductions: Number(payslip.totalDeductions || 0),
                netSalary: netSalary,
                payPeriodStart: this.formatDate(startDate),
                payPeriodEnd: this.formatDate(endDate),
                daysWorked: daysInPeriod,
                currency: 'SAR',
            });
        }
        const totalAmount = wpsRecords.reduce((sum, r) => sum + r.netSalary, 0);
        const fileDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const fileTime = new Date().toISOString().slice(11, 16).replace(':', '');
        const headerRecord = [
            'H',
            company.crNumber || '',
            `"${company.name}"`,
            companyBankAccount?.iban || '',
            fileDate,
            fileTime,
            wpsRecords.length,
            totalAmount.toFixed(2),
            'SAR',
        ].join(',');
        const columnHeaders = [
            'Record_Type',
            'National_ID',
            'Employee_Code',
            'Employee_Name',
            'IBAN',
            'Bank_Code',
            'Basic_Salary',
            'Housing_Allowance',
            'Other_Allowances',
            'Total_Earnings',
            'Deductions',
            'Net_Salary',
            'Pay_Start_Date',
            'Pay_End_Date',
            'Days_Worked',
            'Currency',
        ].join(',');
        const rows = wpsRecords.map(r => [
            'D',
            r.nationalId.padStart(10, '0'),
            r.employeeCode,
            `"${r.employeeName}"`,
            r.iban,
            r.bankCode,
            r.basicSalary.toFixed(2),
            r.housingAllowance.toFixed(2),
            (r.transportAllowance + r.otherAllowances).toFixed(2),
            r.totalEarnings.toFixed(2),
            r.deductions.toFixed(2),
            r.netSalary.toFixed(2),
            r.payPeriodStart,
            r.payPeriodEnd,
            r.daysWorked,
            r.currency,
        ].join(','));
        const trailerRecord = [
            'T',
            wpsRecords.length,
            totalAmount.toFixed(2),
            'SAR',
        ].join(',');
        const content = [headerRecord, columnHeaders, ...rows, trailerRecord].join('\n');
        const filename = `WPS_MUDAD_${company.crNumber || 'COMPANY'}_${period.year}${String(period.month).padStart(2, '0')}_${fileDate}.csv`;
        return {
            filename,
            content,
            recordCount: wpsRecords.length,
            totalAmount,
            errors,
        };
    }
    async generateSarieFile(payrollRunId, companyId) {
        const errors = [];
        const payrollRun = await this.prisma.payrollRun.findFirst({
            where: { id: payrollRunId, companyId },
            include: {
                period: true,
                payslips: {
                    include: {
                        employee: {
                            include: {
                                bankAccounts: {
                                    where: { isPrimary: true },
                                    take: 1,
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!payrollRun) {
            throw new common_1.NotFoundException('تشغيل الرواتب غير موجود');
        }
        const company = await this.prisma.company.findUnique({ where: { id: companyId } });
        if (!company) {
            throw new common_1.NotFoundException('الشركة غير موجودة');
        }
        const companyBankAccount = await this.prisma.companyBankAccount.findFirst({
            where: { companyId, isPrimary: true, isActive: true },
        });
        if (!companyBankAccount) {
            throw new common_1.BadRequestException('لا يوجد حساب بنكي رئيسي للشركة');
        }
        const lines = [];
        let recordCount = 0;
        let totalAmount = 0;
        for (const payslip of payrollRun.payslips) {
            const employee = payslip.employee;
            const bankAccount = employee.bankAccounts[0];
            const netSalary = Number(payslip.netSalary);
            if (!bankAccount) {
                errors.push(`الموظف ${employee.firstName} ${employee.lastName} (${employee.employeeCode}) ليس لديه حساب بنكي`);
                continue;
            }
            if (!this.validateIBAN(bankAccount.iban)) {
                errors.push(`IBAN غير صحيح للموظف ${employee.employeeCode}`);
                continue;
            }
            if (netSalary <= 0) {
                continue;
            }
            recordCount++;
            totalAmount += netSalary;
        }
        const fileDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const header = [
            'HDR',
            companyBankAccount.iban.padEnd(24, ' '),
            (company.name || 'COMPANY').substring(0, 35).padEnd(35, ' '),
            fileDate,
            String(recordCount).padStart(6, '0'),
            String(Math.round(totalAmount * 100)).padStart(17, '0'),
            'SAR',
        ].join('|');
        lines.push(header);
        for (const payslip of payrollRun.payslips) {
            const employee = payslip.employee;
            const bankAccount = employee.bankAccounts[0];
            const netSalary = Number(payslip.netSalary);
            if (!bankAccount || !this.validateIBAN(bankAccount.iban) || netSalary <= 0) {
                continue;
            }
            const detail = [
                'DTL',
                bankAccount.iban.padEnd(24, ' '),
                `${employee.firstName} ${employee.lastName}`.substring(0, 35).padEnd(35, ' '),
                (employee.nationalId || '').padEnd(15, ' '),
                String(Math.round(netSalary * 100)).padStart(17, '0'),
                `SAL${payrollRun.period.year}${String(payrollRun.period.month).padStart(2, '0')}`,
            ].join('|');
            lines.push(detail);
        }
        const trailer = [
            'TRL',
            String(recordCount).padStart(6, '0'),
            String(Math.round(totalAmount * 100)).padStart(17, '0'),
        ].join('|');
        lines.push(trailer);
        const period = payrollRun.period;
        const sarieFilename = `SARIE_${company.name?.replace(/\s/g, '_')}_${period.year}_${String(period.month).padStart(2, '0')}.txt`;
        return {
            filename: sarieFilename,
            content: lines.join('\r\n'),
            recordCount,
            totalAmount,
            errors,
        };
    }
    async getEmployeesWithoutBank(companyId) {
        return this.prisma.user.findMany({
            where: {
                companyId,
                status: 'ACTIVE',
                bankAccounts: { none: {} },
            },
            select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
                email: true,
                nationalId: true,
            },
        });
    }
    async getEmployeesWithoutNationalId(companyId) {
        return this.prisma.user.findMany({
            where: {
                companyId,
                status: 'ACTIVE',
                OR: [
                    { nationalId: null },
                    { nationalId: '' },
                ],
            },
            select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
                email: true,
            },
        });
    }
    async validateExportReadiness(payrollRunId, companyId) {
        const issues = [];
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
            return { isReady: false, issues: [{ type: 'NOT_FOUND', message: 'تشغيل الرواتب غير موجود' }] };
        }
        const companyBank = await this.prisma.companyBankAccount.findFirst({
            where: { companyId, isPrimary: true, isActive: true },
        });
        if (!companyBank) {
            issues.push({
                type: 'NO_COMPANY_BANK',
                message: 'لا يوجد حساب بنكي رئيسي للشركة',
            });
        }
        for (const payslip of payrollRun.payslips) {
            const employee = payslip.employee;
            const bank = employee.bankAccounts[0];
            if (!employee.nationalId) {
                issues.push({
                    type: 'MISSING_ID',
                    message: `لا يوجد رقم هوية/إقامة: ${employee.firstName} ${employee.lastName}`,
                    employeeId: employee.id,
                });
            }
            if (!bank) {
                issues.push({
                    type: 'MISSING_BANK',
                    message: `لا يوجد حساب بنكي: ${employee.firstName} ${employee.lastName}`,
                    employeeId: employee.id,
                });
            }
            else if (!this.validateIBAN(bank.iban)) {
                issues.push({
                    type: 'INVALID_IBAN',
                    message: `IBAN غير صحيح: ${employee.employeeCode}`,
                    employeeId: employee.id,
                });
            }
            if (Number(payslip.netSalary) <= 0) {
                issues.push({
                    type: 'NEGATIVE_NET',
                    message: `صافي سالب: ${employee.employeeCode} = ${payslip.netSalary}`,
                    employeeId: employee.id,
                });
            }
        }
        return {
            isReady: issues.length === 0,
            issues,
        };
    }
    validateIBAN(iban) {
        if (!iban)
            return false;
        const clean = iban.replace(/\s/g, '').toUpperCase();
        if (!/^SA[0-9]{22}$/.test(clean)) {
            return false;
        }
        const rearranged = clean.substring(4) + clean.substring(0, 4);
        let numericString = '';
        for (const char of rearranged) {
            if (char >= 'A' && char <= 'Z') {
                numericString += (char.charCodeAt(0) - 55).toString();
            }
            else {
                numericString += char;
            }
        }
        let remainder = 0;
        for (let i = 0; i < numericString.length; i++) {
            const digit = parseInt(numericString[i], 10);
            remainder = (remainder * 10 + digit) % 97;
        }
        return remainder === 1;
    }
    extractBankCode(iban) {
        if (iban && iban.length >= 6) {
            return iban.substring(4, 6);
        }
        return '';
    }
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
};
exports.WpsExportService = WpsExportService;
exports.WpsExportService = WpsExportService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WpsExportService);
//# sourceMappingURL=wps-export.service.js.map