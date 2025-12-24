import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

interface WpsRecord {
    // Employee Identification
    employeeCode: string;
    nationalId: string;  // هوية/إقامة - مطلوب لنظام مدد
    employeeName: string;

    // Bank Info
    iban: string;
    bankCode: string;

    // Salary Components
    basicSalary: number;
    housingAllowance: number;
    transportAllowance: number;
    otherAllowances: number;
    totalEarnings: number;
    deductions: number;
    netSalary: number;

    // Period Info
    payPeriodStart: string;
    payPeriodEnd: string;
    daysWorked: number;

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
     * تصدير ملف WPS متوافق مع نظام مدد
     * WPS = Wage Protection System - نظام حماية الأجور السعودي
     */
    async generateWpsFile(payrollRunId: string, companyId: string): Promise<WpsExportResult> {
        const errors: string[] = [];

        // 1. جلب بيانات تشغيل الرواتب مع سطور القسيمة
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

        // 2.5. جلب الحساب البنكي الرئيسي للشركة
        const companyBankAccount = await this.prisma.companyBankAccount.findFirst({
            where: { companyId, isPrimary: true, isActive: true },
        });

        if (!companyBankAccount) {
            throw new BadRequestException('لا يوجد حساب بنكي رئيسي للشركة. الرجاء إضافة حساب بنكي من إدارة الحسابات البنكية.');
        }

        // 3. بناء سجلات WPS المتوافقة مع مدد
        const wpsRecords: WpsRecord[] = [];
        const period = payrollRun.period;

        for (const payslip of payrollRun.payslips) {
            const employee = payslip.employee;
            const bankAccount = employee.bankAccounts[0];

            // التحقق من وجود الهوية/الإقامة
            if (!employee.nationalId) {
                errors.push(`الموظف ${employee.firstName} ${employee.lastName} (${employee.employeeCode}) ليس لديه رقم هوية/إقامة`);
                continue;
            }

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

            // حساب البدلات من سطور القسيمة
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
                    } else if (componentCode.includes('TRANSPORT') || componentCode.includes('TRA') || componentCode === 'مواصلات') {
                        transportAllowance += amount;
                    } else if (componentCode !== 'BASIC' && !componentCode.includes('BASIC')) {
                        otherAllowances += amount;
                    }
                }
            }

            // حساب عدد أيام العمل
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

        // 4. حساب الإجمالي
        const totalAmount = wpsRecords.reduce((sum, r) => sum + r.netSalary, 0);

        // 5. بناء محتوى الملف بصيغة مدد (CSV format)
        const header = [
            'National_ID',          // رقم الهوية/الإقامة
            'Employee_Code',        // رمز الموظف
            'Employee_Name',        // اسم الموظف
            'IBAN',                 // رقم الحساب البنكي
            'Bank_Code',            // رمز البنك
            'Basic_Salary',         // الراتب الأساسي
            'Housing_Allowance',    // بدل السكن
            'Transport_Allowance',  // بدل المواصلات
            'Other_Allowances',     // بدلات أخرى
            'Total_Earnings',       // إجمالي الاستحقاقات
            'Deductions',           // الاستقطاعات
            'Net_Salary',           // صافي الراتب
            'Pay_Start_Date',       // بداية فترة الراتب
            'Pay_End_Date',         // نهاية فترة الراتب
            'Days_Worked',          // عدد أيام العمل
            'Currency',             // العملة
        ].join(',');

        const rows = wpsRecords.map(r =>
            [
                r.nationalId,
                r.employeeCode,
                `"${r.employeeName}"`,
                r.iban,
                r.bankCode,
                r.basicSalary.toFixed(2),
                r.housingAllowance.toFixed(2),
                r.transportAllowance.toFixed(2),
                r.otherAllowances.toFixed(2),
                r.totalEarnings.toFixed(2),
                r.deductions.toFixed(2),
                r.netSalary.toFixed(2),
                r.payPeriodStart,
                r.payPeriodEnd,
                r.daysWorked,
                r.currency,
            ].join(',')
        );
        const content = [header, ...rows].join('\n');

        // 6. اسم الملف
        const filename = `WPS_MUDAD_${company.name?.replace(/\s/g, '_')}_${period.year}_${String(period.month).padStart(2, '0')}.csv`;

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
     * صيغة متوافقة مع نظام سريع للتحويلات البنكية
     */
    async generateSarieFile(payrollRunId: string, companyId: string): Promise<WpsExportResult> {
        const errors: string[] = [];

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

        const company = await this.prisma.company.findUnique({ where: { id: companyId } });
        if (!company) {
            throw new NotFoundException('الشركة غير موجودة');
        }

        // جلب الحساب البنكي الرئيسي للشركة
        const companyBankAccount = await this.prisma.companyBankAccount.findFirst({
            where: { companyId, isPrimary: true, isActive: true },
        });

        if (!companyBankAccount) {
            throw new BadRequestException('لا يوجد حساب بنكي رئيسي للشركة');
        }

        // SARIE Format (Pipe-delimited text file)
        // صيغة ملف سريع للبنك المركزي السعودي
        const lines: string[] = [];
        let recordCount = 0;
        let totalAmount = 0;

        // Process employees
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

        // Header Record (HDR)
        // Format: HDR|CompanyIBAN|CompanyName|FileDate|RecordCount|TotalAmount|Currency
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

        // Detail Records (DTL)
        for (const payslip of payrollRun.payslips) {
            const employee = payslip.employee;
            const bankAccount = employee.bankAccounts[0];
            const netSalary = Number(payslip.netSalary);

            if (!bankAccount || !this.validateIBAN(bankAccount.iban) || netSalary <= 0) {
                continue;
            }

            // Format: DTL|EmployeeIBAN|EmployeeName|NationalID|Amount|Reference
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

        // Trailer Record (TRL)
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
            content: lines.join('\r\n'), // Use Windows line endings for bank systems
            recordCount,
            totalAmount,
            errors,
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
                nationalId: true,
            },
        });
    }

    /**
     * الحصول على قائمة الموظفين بدون رقم هوية
     */
    async getEmployeesWithoutNationalId(companyId: string): Promise<any[]> {
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

        // التحقق من الحساب البنكي للشركة
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

            // التحقق من الهوية
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
        if (iban && iban.length >= 6) {
            return iban.substring(4, 6);
        }
        return '';
    }

    private formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}
