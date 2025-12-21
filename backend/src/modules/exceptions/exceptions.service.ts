import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface PayrollException {
    type: 'MISSING_BANK' | 'INVALID_IBAN' | 'MISSING_SALARY' | 'NEGATIVE_NET' | 'MISSING_CONTRACT' | 'EXPIRED_CONTRACT';
    severity: 'ERROR' | 'WARNING';
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    message: string;
    details?: any;
}

export interface ExceptionsSummary {
    totalEmployees: number;
    employeesWithIssues: number;
    errorCount: number;
    warningCount: number;
    exceptions: PayrollException[];
    byType: { type: string; count: number }[];
}

@Injectable()
export class ExceptionsService {
    constructor(private prisma: PrismaService) { }

    /**
     * فحص شامل للموظفين قبل تشغيل الرواتب
     */
    async validateEmployeesForPayroll(companyId: string): Promise<ExceptionsSummary> {
        const exceptions: PayrollException[] = [];

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

            // 1. فحص الحساب البنكي
            if (emp.bankAccounts.length === 0) {
                exceptions.push({
                    type: 'MISSING_BANK',
                    severity: 'ERROR',
                    employeeId: emp.id,
                    employeeCode: emp.employeeCode || '',
                    employeeName: empName,
                    message: 'لا يوجد حساب بنكي رئيسي',
                });
            } else {
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

            // 2. فحص تعيين الراتب
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

            // 3. فحص العقد
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

        // 4. فحص العقود المنتهية قريباً
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

        // ترتيب حسب الخطورة ثم النوع
        exceptions.sort((a, b) => {
            if (a.severity !== b.severity) return a.severity === 'ERROR' ? -1 : 1;
            return a.type.localeCompare(b.type);
        });

        // إحصائيات
        const errorCount = exceptions.filter(e => e.severity === 'ERROR').length;
        const warningCount = exceptions.filter(e => e.severity === 'WARNING').length;
        const employeesWithIssues = new Set(exceptions.map(e => e.employeeId)).size;

        // تجميع حسب النوع
        const byType = Object.entries(
            exceptions.reduce((acc, e) => {
                acc[e.type] = (acc[e.type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>)
        ).map(([type, count]) => ({ type, count }));

        return {
            totalEmployees: employees.length,
            employeesWithIssues,
            errorCount,
            warningCount,
            exceptions,
            byType,
        };
    }

    /**
     * فحص مسير رواتب معين
     */
    async validatePayrollRun(payrollRunId: string, companyId: string): Promise<ExceptionsSummary> {
        const exceptions: PayrollException[] = [];

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
                    type: 'MISSING_SALARY' as const,
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

            // فحص الصافي السالب
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

            // فحص الحساب البنكي
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

        const byType = Object.entries(
            exceptions.reduce((acc, e) => {
                acc[e.type] = (acc[e.type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>)
        ).map(([type, count]) => ({ type, count }));

        return {
            totalEmployees: payrollRun.payslips.length,
            employeesWithIssues,
            errorCount,
            warningCount,
            exceptions,
            byType,
        };
    }

    /**
     * إحصائيات سريعة للوحة القيادة
     */
    async getQuickStats(companyId: string): Promise<{
        missingBank: number;
        missingSalary: number;
        expiringContracts: number;
        totalIssues: number;
    }> {
        const [missingBank, missingSalary, expiringContracts] = await Promise.all([
            // موظفين بدون حساب بنكي
            this.prisma.user.count({
                where: {
                    companyId,
                    status: 'ACTIVE',
                    bankAccounts: { none: {} },
                },
            }),

            // موظفين بدون هيكل راتب
            this.prisma.user.count({
                where: {
                    companyId,
                    status: 'ACTIVE',
                    salaryAssignments: { none: { isActive: true } },
                },
            }),

            // عقود تنتهي خلال 30 يوم
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
}
