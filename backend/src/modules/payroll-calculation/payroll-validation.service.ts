import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface ValidationIssue {
    employeeId: string;
    employeeName: string;
    employeeCode: string;
    type: 'ERROR' | 'WARNING';
    module: 'BANK' | 'CONTRACT' | 'ATTENDANCE' | 'SALARY';
    messageAr: string;
    messageEn: string;
}

export interface PayrollValidationResult {
    periodId: string;
    isValid: boolean;
    errorsCount: number;
    warningsCount: number;
    issues: ValidationIssue[];
}

@Injectable()
export class PayrollValidationService {
    constructor(private prisma: PrismaService) { }

    async validatePeriod(periodId: string, companyId: string, employeeIds?: string[]): Promise<PayrollValidationResult> {
        const period = await this.prisma.payrollPeriod.findFirst({
            where: { id: periodId, companyId }
        });

        if (!period) {
            throw new Error('فترة الرواتب غير موجودة');
        }

        const issues: ValidationIssue[] = [];

        // Fetch employees to validate
        const employees = await this.prisma.user.findMany({
            where: {
                id: employeeIds ? { in: employeeIds } : undefined,
                companyId,
                status: 'ACTIVE',
            },
            include: {
                bankAccounts: { where: { isPrimary: true }, take: 1 },
                contracts: {
                    where: {
                        status: 'ACTIVE',
                    },
                    orderBy: { startDate: 'desc' },
                    take: 1
                },
                salaryAssignments: { where: { isActive: true }, take: 1 },
            }
        });

        for (const emp of employees) {
            const name = `${emp.firstName} ${emp.lastName}`;
            const code = emp.employeeCode || emp.id;

            // 1. Bank Account Validation
            if (emp.bankAccounts.length === 0) {
                issues.push({
                    employeeId: emp.id,
                    employeeName: name,
                    employeeCode: code,
                    type: 'ERROR',
                    module: 'BANK',
                    messageAr: 'الموظف ليس لديه حساب بنكي أساسي',
                    messageEn: 'Employee has no primary bank account',
                });
            } else {
                const iban = emp.bankAccounts[0].iban;
                if (!iban || iban.length < 15) {
                    issues.push({
                        employeeId: emp.id,
                        employeeName: name,
                        employeeCode: code,
                        type: 'ERROR',
                        module: 'BANK',
                        messageAr: 'رقم الـ IBAN غير مكتمل أو خاطئ',
                        messageEn: 'IBAN is incomplete or invalid',
                    });
                }
            }

            // 2. Contract Validation
            if (emp.contracts.length === 0) {
                issues.push({
                    employeeId: emp.id,
                    employeeName: name,
                    employeeCode: code,
                    type: 'WARNING',
                    module: 'CONTRACT',
                    messageAr: 'لا يوجد عقد ساري موثق للموظف',
                    messageEn: 'No active contract found for employee',
                });
            } else {
                const contract = emp.contracts[0];
                if (contract.endDate && contract.endDate < period.endDate) {
                    issues.push({
                        employeeId: emp.id,
                        employeeName: name,
                        employeeCode: code,
                        type: 'ERROR',
                        module: 'CONTRACT',
                        messageAr: 'عقد الموظف ينتهي قبل نهاية فترة الرواتب',
                        messageEn: 'Contract expires before payroll period end',
                    });
                }
            }

            // 3. Salary Assignment Validation
            if (emp.salaryAssignments.length === 0) {
                issues.push({
                    employeeId: emp.id,
                    employeeName: name,
                    employeeCode: code,
                    type: 'ERROR',
                    module: 'SALARY',
                    messageAr: 'الموظف ليس له هيكل راتب نشط',
                    messageEn: 'No active salary structure assigned',
                });
            }

            // 4. Attendance Check (Warning if 0 records)
            const attendanceCount = await this.prisma.attendance.count({
                where: {
                    userId: emp.id,
                    companyId,
                    date: {
                        gte: period.startDate,
                        lte: period.endDate,
                    }
                }
            });

            if (attendanceCount === 0) {
                issues.push({
                    employeeId: emp.id,
                    employeeName: name,
                    employeeCode: code,
                    type: 'WARNING',
                    module: 'ATTENDANCE',
                    messageAr: 'لا توجد سجلات حضور للموظف في هذه الفترة',
                    messageEn: 'No attendance records found for this period',
                });
            }
        }

        const errorsCount = issues.filter(i => i.type === 'ERROR').length;

        return {
            periodId,
            isValid: errorsCount === 0,
            errorsCount,
            warningsCount: issues.length - errorsCount,
            issues,
        };
    }
}
