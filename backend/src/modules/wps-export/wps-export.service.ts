import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

interface WpsRecord {
    employeeCode: string;
    employeeName: string;
    iban: string;
    bankCode: string;
    amount: number;
    currency: string;
}

interface WpsExportResult {
    filename: string;
    content: string;
    recordCount: number;
    totalAmount: number;
    errors: string[];
}

@Injectable()
export class WpsExportService {
    constructor(private prisma: PrismaService) { }

    /**
     * تصدير ملف WPS للفترة المحددة
     * WPS = Wage Protection System - نظام حماية الأجور السعودي
     */
    async generateWpsFile(payrollRunId: string, companyId: string): Promise<WpsExportResult> {
        const errors: string[] = [];

        // 1. جلب بيانات تشغيل الرواتب
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
            throw new NotFoundException('تشغيل الرواتب غير موجود');
        }

        if (!['FINANCE_APPROVED', 'LOCKED', 'PAID'].includes(payrollRun.status)) {
            throw new BadRequestException('يجب اعتماد الرواتب من المالية قبل التصدير');
        }

        // 2. جلب بيانات الشركة
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
        });

        if (!company) {
            throw new NotFoundException('الشركة غير موجودة');
        }

        // 3. بناء سجلات WPS
        const wpsRecords: WpsRecord[] = [];

        for (const payslip of payrollRun.payslips) {
            const employee = payslip.employee;
            const bankAccount = employee.bankAccounts[0];

            // التحقق من وجود حساب بنكي
            if (!bankAccount) {
                errors.push(`الموظف ${employee.firstName} ${employee.lastName} (${employee.employeeCode}) ليس لديه حساب بنكي رئيسي`);
                continue;
            }

            // التحقق من صحة IBAN
            if (!this.validateIBAN(bankAccount.iban)) {
                errors.push(`IBAN غير صحيح للموظف ${employee.employeeCode}: ${bankAccount.iban}`);
                continue;
            }

            // التحقق من الصافي موجب
            const netSalary = Number(payslip.netSalary);
            if (netSalary <= 0) {
                errors.push(`الصافي سالب أو صفر للموظف ${employee.employeeCode}: ${netSalary}`);
                continue;
            }

            wpsRecords.push({
                employeeCode: employee.employeeCode || '',
                employeeName: `${employee.firstName} ${employee.lastName}`,
                iban: bankAccount.iban,
                bankCode: bankAccount.bankCode || this.extractBankCode(bankAccount.iban),
                amount: netSalary,
                currency: 'SAR',
            });
        }

        // 4. حساب الإجمالي
        const totalAmount = wpsRecords.reduce((sum, r) => sum + r.amount, 0);

        // 5. بناء محتوى الملف (CSV format)
        const header = 'Employee Code,Employee Name,IBAN,Bank Code,Amount,Currency';
        const rows = wpsRecords.map(r =>
            `${r.employeeCode},"${r.employeeName}",${r.iban},${r.bankCode},${r.amount.toFixed(2)},${r.currency}`
        );
        const content = [header, ...rows].join('\n');

        // 6. اسم الملف
        const period = payrollRun.period;
        const filename = `WPS_${company.name?.replace(/\s/g, '_')}_${period.year}_${String(period.month).padStart(2, '0')}.csv`;

        return {
            filename,
            content,
            recordCount: wpsRecords.length,
            totalAmount,
            errors,
        };
    }

    /**
     * تصدير ملف WPS بصيغة SARIE (البنك المركزي السعودي)
     */
    async generateSarieFile(payrollRunId: string, companyId: string): Promise<WpsExportResult> {
        const basicResult = await this.generateWpsFile(payrollRunId, companyId);

        const payrollRun = await this.prisma.payrollRun.findFirst({
            where: { id: payrollRunId },
            include: { period: true },
        });

        const company = await this.prisma.company.findUnique({ where: { id: companyId } });

        // SARIE Format (Fixed-width text file)
        // Header: HSARIE + Company Info
        // Detail: D + Employee Details
        // Footer: T + Total

        const lines: string[] = [];

        // Header
        const header = [
            'H',                                    // Record Type
            'SARIE',                                // File Type
            String(company?.crNumber || '').padEnd(10, '0'),  // Company CR
            new Date().toISOString().slice(0, 10).replace(/-/g, ''),  // Date YYYYMMDD
            String(basicResult.recordCount).padStart(6, '0'),         // Record Count
            String(Math.round(basicResult.totalAmount * 100)).padStart(15, '0'),  // Total in Halalas
        ].join('');
        lines.push(header);

        // Parse CSV to get records
        const csvLines = basicResult.content.split('\n').slice(1);  // Skip header
        for (const csvLine of csvLines) {
            const parts = csvLine.split(',');
            if (parts.length < 6) continue;

            const detail = [
                'D',                                    // Record Type
                parts[2],                               // IBAN (24 chars)
                parts[0].padEnd(10, ' '),              // Employee Code
                String(Math.round(parseFloat(parts[4]) * 100)).padStart(15, '0'),  // Amount in Halalas
                'SAR',                                  // Currency
            ].join('');
            lines.push(detail);
        }

        // Footer
        const footer = [
            'T',                                        // Record Type
            String(basicResult.recordCount).padStart(6, '0'),
            String(Math.round(basicResult.totalAmount * 100)).padStart(15, '0'),
        ].join('');
        lines.push(footer);

        const period = payrollRun?.period;
        const sarieFilename = `SARIE_${company?.name?.replace(/\s/g, '_')}_${period?.year}_${String(period?.month).padStart(2, '0')}.txt`;

        return {
            ...basicResult,
            filename: sarieFilename,
            content: lines.join('\n'),
        };
    }

    /**
     * الحصول على قائمة الموظفين بدون حساب بنكي
     */
    async getEmployeesWithoutBank(companyId: string): Promise<any[]> {
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
            },
        });
    }

    /**
     * التحقق من جاهزية التصدير
     */
    async validateExportReadiness(payrollRunId: string, companyId: string): Promise<{
        isReady: boolean;
        issues: { type: string; message: string; employeeId?: string }[];
    }> {
        const issues: { type: string; message: string; employeeId?: string }[] = [];

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

        for (const payslip of payrollRun.payslips) {
            const employee = payslip.employee;
            const bank = employee.bankAccounts[0];

            if (!bank) {
                issues.push({
                    type: 'MISSING_BANK',
                    message: `لا يوجد حساب بنكي: ${employee.firstName} ${employee.lastName}`,
                    employeeId: employee.id,
                });
            } else if (!this.validateIBAN(bank.iban)) {
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

    // === Helper Methods ===

    private validateIBAN(iban: string): boolean {
        if (!iban) return false;
        const clean = iban.replace(/\s/g, '').toUpperCase();
        return /^SA[0-9A-Z]{22}$/.test(clean);
    }

    private extractBankCode(iban: string): string {
        // Saudi IBAN format: SA + 2 check digits + 2 bank code + 18 account
        if (iban.length >= 6) {
            return iban.substring(4, 6);
        }
        return '';
    }
}
