import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

// =====================================================
// أنواع الاستثناءات حسب قانون العمل السعودي
// =====================================================

export type ExceptionCategory = 'WPS' | 'CONTRACT' | 'IDENTITY' | 'SALARY' | 'GOSI' | 'NITAQAT';

export type ExceptionType =
    // WPS / نظام حماية الأجور
    | 'MISSING_BANK'
    | 'INVALID_IBAN'
    | 'UNVERIFIED_BANK'
    | 'BANK_NAME_MISMATCH'
    // العقود
    | 'MISSING_CONTRACT'
    | 'EXPIRED_CONTRACT'
    | 'EXPIRING_CONTRACT_30'
    | 'EXPIRING_CONTRACT_60'
    | 'MISSING_CONTRACT_DATES'
    // الهوية والإقامة
    | 'MISSING_NATIONAL_ID'
    | 'EXPIRED_IQAMA'
    | 'EXPIRING_IQAMA_60'
    | 'EXPIRING_IQAMA_30'
    // الراتب
    | 'MISSING_SALARY'
    | 'NEGATIVE_NET'
    | 'BELOW_MINIMUM_SAUDI'
    | 'SALARY_MISMATCH'
    // GOSI
    | 'MISSING_GOSI_NUMBER'
    // نطاقات
    | 'HALF_COUNTED_SAUDI';

export type ExceptionSeverity = 'ERROR' | 'WARNING' | 'INFO';

export interface PayrollException {
    type: ExceptionType;
    category: ExceptionCategory;
    severity: ExceptionSeverity;
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    message: string;
    details?: any;
    actionUrl?: string;
}

export interface CategoryStats {
    category: ExceptionCategory;
    categoryLabel: string;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    total: number;
}

export interface ExceptionsSummary {
    totalEmployees: number;
    employeesWithIssues: number;
    complianceRate: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    exceptions: PayrollException[];
    byType: { type: string; count: number }[];
    byCategory: CategoryStats[];
    lastChecked: string;
}

// =====================================================
// تسميات عربية
// =====================================================

export const categoryLabels: Record<ExceptionCategory, string> = {
    WPS: 'حماية الأجور (WPS)',
    CONTRACT: 'العقود',
    IDENTITY: 'الهوية والإقامة',
    SALARY: 'الراتب',
    GOSI: 'التأمينات (GOSI)',
    NITAQAT: 'نطاقات',
};

export const typeLabels: Record<ExceptionType, string> = {
    MISSING_BANK: 'لا يوجد حساب بنكي',
    INVALID_IBAN: 'IBAN غير صحيح',
    UNVERIFIED_BANK: 'حساب غير موثق',
    BANK_NAME_MISMATCH: 'اسم الحساب لا يطابق الموظف',
    MISSING_CONTRACT: 'لا يوجد عقد',
    EXPIRED_CONTRACT: 'عقد منتهي',
    EXPIRING_CONTRACT_30: 'عقد ينتهي خلال 30 يوم',
    EXPIRING_CONTRACT_60: 'عقد ينتهي خلال 60 يوم',
    MISSING_CONTRACT_DATES: 'تواريخ العقد ناقصة',
    MISSING_NATIONAL_ID: 'لا يوجد رقم هوية/إقامة',
    EXPIRED_IQAMA: 'إقامة منتهية',
    EXPIRING_IQAMA_60: 'إقامة تنتهي خلال 60 يوم',
    EXPIRING_IQAMA_30: 'إقامة تنتهي خلال 30 يوم',
    MISSING_SALARY: 'لا يوجد هيكل راتب',
    NEGATIVE_NET: 'صافي راتب سالب',
    BELOW_MINIMUM_SAUDI: 'راتب أقل من الحد الأدنى',
    SALARY_MISMATCH: 'راتب لا يطابق العقد',
    MISSING_GOSI_NUMBER: 'غير مسجل في GOSI',
    HALF_COUNTED_SAUDI: 'يحتسب نصف في نطاقات',
};

export const typeCategories: Record<ExceptionType, ExceptionCategory> = {
    MISSING_BANK: 'WPS',
    INVALID_IBAN: 'WPS',
    UNVERIFIED_BANK: 'WPS',
    BANK_NAME_MISMATCH: 'WPS',
    MISSING_CONTRACT: 'CONTRACT',
    EXPIRED_CONTRACT: 'CONTRACT',
    EXPIRING_CONTRACT_30: 'CONTRACT',
    EXPIRING_CONTRACT_60: 'CONTRACT',
    MISSING_CONTRACT_DATES: 'CONTRACT',
    MISSING_NATIONAL_ID: 'IDENTITY',
    EXPIRED_IQAMA: 'IDENTITY',
    EXPIRING_IQAMA_60: 'IDENTITY',
    EXPIRING_IQAMA_30: 'IDENTITY',
    MISSING_SALARY: 'SALARY',
    NEGATIVE_NET: 'SALARY',
    BELOW_MINIMUM_SAUDI: 'SALARY',
    SALARY_MISMATCH: 'SALARY',
    MISSING_GOSI_NUMBER: 'GOSI',
    HALF_COUNTED_SAUDI: 'NITAQAT',
};

// الحد الأدنى للراتب حسب نطاقات (4000 ريال للاحتساب الكامل)
const NITAQAT_MIN_SALARY = 4000;
const NITAQAT_HALF_MIN = 3000;

@Injectable()
export class ExceptionsService {
    constructor(private prisma: PrismaService) { }

    /**
     * التحقق من صحة IBAN السعودي (MOD-97)
     */
    private validateIBAN(iban: string): boolean {
        if (!iban) return false;
        const clean = iban.replace(/\s/g, '').toUpperCase();
        if (!/^SA[0-9]{22}$/.test(clean)) return false;

        // MOD-97 validation
        const rearranged = clean.substring(4) + clean.substring(0, 4);
        let numericString = '';
        for (const char of rearranged) {
            if (char >= 'A' && char <= 'Z') {
                numericString += (char.charCodeAt(0) - 55).toString();
            } else {
                numericString += char;
            }
        }
        let remainder = 0;
        for (let i = 0; i < numericString.length; i++) {
            remainder = (remainder * 10 + parseInt(numericString[i], 10)) % 97;
        }
        return remainder === 1;
    }

    /**
     * فحص شامل للموظفين حسب قانون العمل السعودي
     */
    async validateEmployeesForPayroll(companyId: string): Promise<ExceptionsSummary> {
        const exceptions: PayrollException[] = [];
        const now = new Date();
        const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

        const employees = await this.prisma.user.findMany({
            where: { companyId, status: 'ACTIVE' },
            include: {
                bankAccounts: { where: { isPrimary: true }, take: 1 },
                salaryAssignments: {
                    where: { isActive: true },
                    take: 1
                },
                contracts: {
                    where: { status: 'ACTIVE' },
                    orderBy: { startDate: 'desc' },
                    take: 1
                },
            },
        });

        for (const emp of employees) {
            const empName = `${emp.firstName} ${emp.lastName}`;
            const baseInfo = {
                employeeId: emp.id,
                employeeCode: emp.employeeCode || '',
                employeeName: empName,
            };

            // =====================================================
            // 1. فحوصات WPS / نظام حماية الأجور
            // =====================================================

            if (emp.bankAccounts.length === 0) {
                exceptions.push({
                    ...baseInfo,
                    type: 'MISSING_BANK',
                    category: 'WPS',
                    severity: 'ERROR',
                    message: 'لا يوجد حساب بنكي - مطلوب لـ WPS',
                    actionUrl: `/employee-profile/${emp.id}?tab=bank`,
                });
            } else {
                const bank = emp.bankAccounts[0];
                const cleanIban = bank.iban?.replace(/\s/g, '').toUpperCase();

                if (!this.validateIBAN(cleanIban || '')) {
                    exceptions.push({
                        ...baseInfo,
                        type: 'INVALID_IBAN',
                        category: 'WPS',
                        severity: 'ERROR',
                        message: `IBAN غير صحيح: ${bank.iban || 'فارغ'}`,
                        details: { iban: bank.iban },
                        actionUrl: `/employee-profile/${emp.id}?tab=bank`,
                    });
                }

                if (!bank.isVerified) {
                    exceptions.push({
                        ...baseInfo,
                        type: 'UNVERIFIED_BANK',
                        category: 'WPS',
                        severity: 'WARNING',
                        message: 'الحساب البنكي غير موثق من HR',
                        actionUrl: `/bank-accounts`,
                    });
                }

                // فحص تطابق الاسم
                if (bank.accountHolderName) {
                    const bankName = bank.accountHolderName.toLowerCase().trim();
                    const empFullName = empName.toLowerCase().trim();
                    if (!bankName.includes(emp.firstName.toLowerCase()) &&
                        !bankName.includes(emp.lastName.toLowerCase())) {
                        exceptions.push({
                            ...baseInfo,
                            type: 'BANK_NAME_MISMATCH',
                            category: 'WPS',
                            severity: 'WARNING',
                            message: `اسم الحساب "${bank.accountHolderName}" لا يطابق "${empName}"`,
                            details: { bankName: bank.accountHolderName, employeeName: empName },
                        });
                    }
                }
            }

            // =====================================================
            // 2. فحوصات العقود
            // =====================================================

            if (emp.contracts.length === 0) {
                exceptions.push({
                    ...baseInfo,
                    type: 'MISSING_CONTRACT',
                    category: 'CONTRACT',
                    severity: 'ERROR',
                    message: 'لا يوجد عقد نشط',
                    actionUrl: `/employee-profile/${emp.id}?tab=contract`,
                });
            } else {
                const contract = emp.contracts[0];

                if (!contract.startDate || !contract.endDate) {
                    exceptions.push({
                        ...baseInfo,
                        type: 'MISSING_CONTRACT_DATES',
                        category: 'CONTRACT',
                        severity: 'WARNING',
                        message: 'تواريخ العقد غير مكتملة',
                        actionUrl: `/employee-profile/${emp.id}?tab=contract`,
                    });
                } else if (contract.endDate < now) {
                    exceptions.push({
                        ...baseInfo,
                        type: 'EXPIRED_CONTRACT',
                        category: 'CONTRACT',
                        severity: 'ERROR',
                        message: `العقد انتهى في ${contract.endDate.toISOString().slice(0, 10)}`,
                        details: { endDate: contract.endDate },
                        actionUrl: `/employee-profile/${emp.id}?tab=contract`,
                    });
                } else if (contract.endDate <= in30Days) {
                    exceptions.push({
                        ...baseInfo,
                        type: 'EXPIRING_CONTRACT_30',
                        category: 'CONTRACT',
                        severity: 'WARNING',
                        message: `العقد ينتهي في ${contract.endDate.toISOString().slice(0, 10)}`,
                        details: { endDate: contract.endDate },
                        actionUrl: `/employee-profile/${emp.id}?tab=contract`,
                    });
                } else if (contract.endDate <= in60Days) {
                    exceptions.push({
                        ...baseInfo,
                        type: 'EXPIRING_CONTRACT_60',
                        category: 'CONTRACT',
                        severity: 'INFO',
                        message: `العقد ينتهي في ${contract.endDate.toISOString().slice(0, 10)}`,
                        details: { endDate: contract.endDate },
                    });
                }
            }

            // =====================================================
            // 3. فحوصات الهوية والإقامة
            // =====================================================

            if (!emp.nationalId) {
                exceptions.push({
                    ...baseInfo,
                    type: 'MISSING_NATIONAL_ID',
                    category: 'IDENTITY',
                    severity: 'ERROR',
                    message: 'لا يوجد رقم هوية/إقامة - مطلوب لـ WPS و GOSI',
                    actionUrl: `/employee-profile/${emp.id}`,
                });
            }

            // فحص صلاحية الإقامة للوافدين (حقل اختياري)
            const empAny = emp as any;
            if (emp.nationality && emp.nationality !== 'SA' && emp.nationality !== 'Saudi') {
                if (empAny.iqamaExpiry) {
                    const iqamaDate = new Date(empAny.iqamaExpiry);
                    if (iqamaDate < now) {
                        exceptions.push({
                            ...baseInfo,
                            type: 'EXPIRED_IQAMA',
                            category: 'IDENTITY',
                            severity: 'ERROR',
                            message: `الإقامة منتهية منذ ${iqamaDate.toISOString().slice(0, 10)}`,
                            details: { iqamaExpiry: iqamaDate },
                            actionUrl: `/employee-profile/${emp.id}`,
                        });
                    } else if (iqamaDate <= in30Days) {
                        exceptions.push({
                            ...baseInfo,
                            type: 'EXPIRING_IQAMA_30',
                            category: 'IDENTITY',
                            severity: 'WARNING',
                            message: `الإقامة تنتهي في ${iqamaDate.toISOString().slice(0, 10)}`,
                            details: { iqamaExpiry: iqamaDate },
                            actionUrl: `/employee-profile/${emp.id}`,
                        });
                    } else if (iqamaDate <= in60Days) {
                        exceptions.push({
                            ...baseInfo,
                            type: 'EXPIRING_IQAMA_60',
                            category: 'IDENTITY',
                            severity: 'INFO',
                            message: `الإقامة تنتهي في ${iqamaDate.toISOString().slice(0, 10)}`,
                            details: { iqamaExpiry: iqamaDate },
                        });
                    }
                }
            }

            // =====================================================
            // 4. فحوصات الراتب
            // =====================================================

            if (emp.salaryAssignments.length === 0) {
                exceptions.push({
                    ...baseInfo,
                    type: 'MISSING_SALARY',
                    category: 'SALARY',
                    severity: 'ERROR',
                    message: 'لا يوجد هيكل راتب معين',
                    actionUrl: `/employee-profile/${emp.id}?tab=salary`,
                });
            } else {
                const assignment = emp.salaryAssignments[0] as any;
                const basicSalary = Number(assignment.baseSalary || 0);

                // فحص الحد الأدنى للسعوديين (نطاقات)
                const isSaudi = emp.nationality === 'SA' || emp.nationality === 'Saudi' || !emp.nationality;
                if (isSaudi && basicSalary > 0) {
                    if (basicSalary < NITAQAT_HALF_MIN) {
                        exceptions.push({
                            ...baseInfo,
                            type: 'BELOW_MINIMUM_SAUDI',
                            category: 'SALARY',
                            severity: 'WARNING',
                            message: `الراتب ${basicSalary} أقل من 3000 - لا يحتسب في نطاقات`,
                            details: { salary: basicSalary, minimum: NITAQAT_HALF_MIN },
                        });
                    } else if (basicSalary < NITAQAT_MIN_SALARY) {
                        exceptions.push({
                            ...baseInfo,
                            type: 'HALF_COUNTED_SAUDI',
                            category: 'NITAQAT',
                            severity: 'INFO',
                            message: `الراتب ${basicSalary} يحتسب نصف في نطاقات (الحد 4000)`,
                            details: { salary: basicSalary, fullCountMinimum: NITAQAT_MIN_SALARY },
                        });
                    }
                }
            }

            // =====================================================
            // 5. فحوصات GOSI (حقل اختياري)
            // =====================================================

            if (!empAny.gosiNumber) {
                exceptions.push({
                    ...baseInfo,
                    type: 'MISSING_GOSI_NUMBER',
                    category: 'GOSI',
                    severity: 'WARNING',
                    message: 'رقم التأمينات (GOSI) غير مسجل',
                    actionUrl: `/employee-profile/${emp.id}`,
                });
            }
        }

        // ترتيب الاستثناءات
        const severityOrder = { ERROR: 0, WARNING: 1, INFO: 2 };
        exceptions.sort((a, b) => {
            if (severityOrder[a.severity] !== severityOrder[b.severity]) {
                return severityOrder[a.severity] - severityOrder[b.severity];
            }
            return a.type.localeCompare(b.type);
        });

        // حساب الإحصائيات
        const errorCount = exceptions.filter(e => e.severity === 'ERROR').length;
        const warningCount = exceptions.filter(e => e.severity === 'WARNING').length;
        const infoCount = exceptions.filter(e => e.severity === 'INFO').length;
        const employeesWithIssues = new Set(exceptions.map(e => e.employeeId)).size;
        const complianceRate = employees.length > 0
            ? Math.round(((employees.length - employeesWithIssues) / employees.length) * 100)
            : 100;

        // تجميع حسب النوع
        const byType = Object.entries(
            exceptions.reduce((acc, e) => {
                acc[e.type] = (acc[e.type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>)
        ).map(([type, count]) => ({ type, count }));

        // تجميع حسب الفئة
        const categoryGroups = exceptions.reduce((acc, e) => {
            if (!acc[e.category]) {
                acc[e.category] = { error: 0, warning: 0, info: 0 };
            }
            if (e.severity === 'ERROR') acc[e.category].error++;
            else if (e.severity === 'WARNING') acc[e.category].warning++;
            else acc[e.category].info++;
            return acc;
        }, {} as Record<ExceptionCategory, { error: number; warning: number; info: number }>);

        const allCategories: ExceptionCategory[] = ['WPS', 'CONTRACT', 'IDENTITY', 'SALARY', 'GOSI', 'NITAQAT'];
        const byCategory: CategoryStats[] = allCategories.map(cat => ({
            category: cat,
            categoryLabel: categoryLabels[cat],
            errorCount: categoryGroups[cat]?.error || 0,
            warningCount: categoryGroups[cat]?.warning || 0,
            infoCount: categoryGroups[cat]?.info || 0,
            total: (categoryGroups[cat]?.error || 0) + (categoryGroups[cat]?.warning || 0) + (categoryGroups[cat]?.info || 0),
        }));

        return {
            totalEmployees: employees.length,
            employeesWithIssues,
            complianceRate,
            errorCount,
            warningCount,
            infoCount,
            exceptions,
            byType,
            byCategory,
            lastChecked: new Date().toISOString(),
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
                complianceRate: 0,
                errorCount: 1,
                warningCount: 0,
                infoCount: 0,
                exceptions: [{
                    type: 'MISSING_SALARY',
                    category: 'SALARY',
                    severity: 'ERROR',
                    employeeId: '',
                    employeeCode: '',
                    employeeName: '',
                    message: 'مسير الرواتب غير موجود',
                }],
                byType: [],
                byCategory: [],
                lastChecked: new Date().toISOString(),
            };
        }

        for (const payslip of payrollRun.payslips) {
            const emp = payslip.employee;
            const empName = `${emp.firstName} ${emp.lastName}`;
            const baseInfo = {
                employeeId: emp.id,
                employeeCode: emp.employeeCode || '',
                employeeName: empName,
            };

            if (Number(payslip.netSalary) <= 0) {
                exceptions.push({
                    ...baseInfo,
                    type: 'NEGATIVE_NET',
                    category: 'SALARY',
                    severity: 'ERROR',
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
                    ...baseInfo,
                    type: 'MISSING_BANK',
                    category: 'WPS',
                    severity: 'ERROR',
                    message: 'لا يوجد حساب بنكي رئيسي',
                });
            }
        }

        const severityOrder = { ERROR: 0, WARNING: 1, INFO: 2 };
        exceptions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

        const errorCount = exceptions.filter(e => e.severity === 'ERROR').length;
        const warningCount = exceptions.filter(e => e.severity === 'WARNING').length;
        const infoCount = exceptions.filter(e => e.severity === 'INFO').length;
        const employeesWithIssues = new Set(exceptions.map(e => e.employeeId)).size;
        const complianceRate = payrollRun.payslips.length > 0
            ? Math.round(((payrollRun.payslips.length - employeesWithIssues) / payrollRun.payslips.length) * 100)
            : 100;

        const byType = Object.entries(
            exceptions.reduce((acc, e) => {
                acc[e.type] = (acc[e.type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>)
        ).map(([type, count]) => ({ type, count }));

        return {
            totalEmployees: payrollRun.payslips.length,
            employeesWithIssues,
            complianceRate,
            errorCount,
            warningCount,
            infoCount,
            exceptions,
            byType,
            byCategory: [],
            lastChecked: new Date().toISOString(),
        };
    }

    /**
     * إحصائيات سريعة للوحة القيادة
     */
    async getQuickStats(companyId: string): Promise<{
        missingBank: number;
        missingSalary: number;
        missingContract: number;
        missingNationalId: number;
        expiringContracts: number;
        expiringIqama: number;
        totalErrors: number;
        totalWarnings: number;
        complianceRate: number;
    }> {
        const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const in60Days = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

        const [
            totalActive,
            missingBank,
            missingSalary,
            missingContract,
            missingNationalId,
            expiringContracts,
            expiringIqama,
        ] = await Promise.all([
            this.prisma.user.count({ where: { companyId, status: 'ACTIVE' } }),

            this.prisma.user.count({
                where: { companyId, status: 'ACTIVE', bankAccounts: { none: {} } },
            }),

            this.prisma.user.count({
                where: { companyId, status: 'ACTIVE', salaryAssignments: { none: { isActive: true } } },
            }),

            this.prisma.user.count({
                where: { companyId, status: 'ACTIVE', contracts: { none: { status: 'ACTIVE' } } },
            }),

            this.prisma.user.count({
                where: { companyId, status: 'ACTIVE', OR: [{ nationalId: null }, { nationalId: '' }] },
            }),

            this.prisma.contract.count({
                where: {
                    user: { companyId, status: 'ACTIVE' },
                    status: 'ACTIVE',
                    endDate: { lte: in30Days, gte: new Date() },
                },
            }),

            // iqamaExpiry field may not exist - skip this count
            Promise.resolve(0),
        ]);

        // الأخطاء = بدون بنك + بدون راتب + بدون هوية
        const totalErrors = missingBank + missingSalary + missingNationalId;
        // التحذيرات = بدون عقد + عقود تنتهي + إقامات تنتهي
        const totalWarnings = missingContract + expiringContracts + expiringIqama;

        const employeesWithErrors = missingBank + missingSalary + missingNationalId + missingContract;
        const complianceRate = totalActive > 0
            ? Math.round(((totalActive - Math.min(employeesWithErrors, totalActive)) / totalActive) * 100)
            : 100;

        return {
            missingBank,
            missingSalary,
            missingContract,
            missingNationalId,
            expiringContracts,
            expiringIqama,
            totalErrors,
            totalWarnings,
            complianceRate,
        };
    }
}
