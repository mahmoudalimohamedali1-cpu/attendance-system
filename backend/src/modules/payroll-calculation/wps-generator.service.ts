import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class WpsGeneratorService {
    constructor(private prisma: PrismaService) { }

    /**
     * إنشاء ملف WPS (Wages Protection System) بتنسيق CSV/Excel
     * متوافق مع متطلبات البنوك السعودية
     */
    async generateWpsExcel(runId: string, companyId: string): Promise<Buffer> {
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

        if (!run) throw new Error('تشغيل الرواتب غير موجود');

        const companyBank = await this.prisma.companyBankAccount.findFirst({
            where: { companyId, isPrimary: true }
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('WPS SIF File');

        // Headers (تنسيق ملف حماية الأجور التقليدي)
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

            let housingAllowance = new Decimal(0);
            let otherAllowances = new Decimal(0);

            // تقسيم الاستحقاقات حسب النوع لمتطلبات الـ SIF
            for (const line of payslip.lines) {
                if (line.component.type === 'EARNING') {
                    if (line.component.code === 'HRA' || line.component.nameAr.includes('سكن')) {
                        housingAllowance = housingAllowance.add(line.amount);
                    } else if (line.component.code !== 'BASIC') {
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

        // Set column widths
        sheet.columns = [
            { width: 20 }, // ID
            { width: 30 }, // Name
            { width: 15 }, // Bank
            { width: 30 }, // IBAN
            { width: 15 }, // Net
            { width: 15 }, // Basic
            { width: 15 }, // Housing
            { width: 15 }, // Others
            { width: 15 }, // Deductions
        ];

        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }

    /**
     * تصدير بتنسيق CSV (المطلوب غالباً لرفع الملفات للبنك)
     */
    async generateWpsCsv(runId: string, companyId: string): Promise<string> {
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

        if (!run) throw new Error('تشغيل الرواتب غير موجود');

        let csv = 'EmployeeID,Name,IBAN,NetSalary,BasicSalary,Housing,Other,Deductions\n';

        for (const payslip of run.payslips) {
            const emp = payslip.employee;
            const bankAccount = emp.bankAccounts[0];

            let housing = 0;
            let other = 0;

            payslip.lines.forEach(l => {
                if (l.component.type === 'EARNING') {
                    if (l.component.code === 'HRA') housing += Number(l.amount);
                    else if (l.component.code !== 'BASIC') other += Number(l.amount);
                }
            });

            csv += `${emp.nationalId || '-'},${emp.firstName} ${emp.lastName},${bankAccount?.iban || '-'},${payslip.netSalary},${payslip.baseSalary},${housing},${other},${payslip.totalDeductions}\n`;
        }

        return csv;
    }
}
