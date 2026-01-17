// @ts-nocheck
/**
 * Employee Debt Ledger Service
 *
 * خدمة دفتر ديون الموظفين
 * لإدارة وتتبع الأرصدة السالبة عندما تتجاوز الخصومات الراتب
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DebtStatus, DebtSourceType, DebtTransactionType } from '@prisma/client';
import {
    Decimal,
    toDecimal,
    toNumber,
    add,
    sub,
    isPositive,
    isZero,
    ZERO,
    min,
} from '../../common/utils/decimal.util';

export interface CreateDebtInput {
    companyId: string;
    employeeId: string;
    amount: number | string | Decimal;
    sourceType: DebtSourceType;
    sourceId?: string;
    periodId?: string;
    reason?: string;
    notes?: string;
}

export interface DeductFromSalaryInput {
    employeeId: string;
    companyId: string;
    availableAmount: number | string | Decimal;
    maxDeductionPercent?: number;
    sourceId?: string;
    processedBy?: string;
}

export interface DeductFromSalaryResult {
    totalDeducted: Decimal;
    remainingDebts: Decimal;
    transactions: Array<{
        debtId: string;
        amount: Decimal;
        remainingBalance: Decimal;
    }>;
}

export interface ManualPaymentInput {
    debtId: string;
    amount: number | string | Decimal;
    description?: string;
    processedBy?: string;
}

export interface WriteOffInput {
    debtId: string;
    reason: string;
    processedBy?: string;
}

@Injectable()
export class EmployeeDebtService {
    private readonly logger = new Logger(EmployeeDebtService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * إنشاء دين جديد للموظف
     * يتم استدعاؤها عندما يكون الراتب الصافي سالباً
     */
    async createDebt(input: CreateDebtInput) {
        const amount = toDecimal(input.amount);

        if (!isPositive(amount)) {
            throw new BadRequestException('Debt amount must be positive');
        }

        this.logger.log(`Creating debt for employee ${input.employeeId}: ${toNumber(amount)}`);

        return this.prisma.$transaction(async (tx) => {
            // إنشاء سجل الدين
            const debt = await tx.employeeDebtLedger.create({
                data: {
                    companyId: input.companyId,
                    employeeId: input.employeeId,
                    originalAmount: amount,
                    remainingBalance: amount,
                    sourceType: input.sourceType,
                    sourceId: input.sourceId,
                    periodId: input.periodId,
                    reason: input.reason,
                    notes: input.notes,
                    status: DebtStatus.ACTIVE,
                },
            });

            // إنشاء حركة تسجيل الدين الأولي
            await tx.debtTransaction.create({
                data: {
                    debtId: debt.id,
                    amount: amount,
                    balanceBefore: ZERO,
                    balanceAfter: amount,
                    transactionType: DebtTransactionType.INITIAL_DEBT,
                    sourceType: input.sourceType,
                    sourceId: input.sourceId,
                    description: input.reason || 'Initial debt registration',
                },
            });

            return debt;
        });
    }

    /**
     * خصم من الراتب لسداد الديون
     * يتم استدعاؤها خلال حساب الرواتب
     */
    async deductFromSalary(input: DeductFromSalaryInput): Promise<DeductFromSalaryResult> {
        const availableAmount = toDecimal(input.availableAmount);
        const maxDeductPercent = input.maxDeductionPercent ?? 100; // 100% of available

        // حساب الحد الأقصى للخصم
        const maxDeduction = availableAmount.mul(toDecimal(maxDeductPercent)).div(toDecimal(100));

        // جلب الديون النشطة مرتبة حسب الأقدم
        const activeDebts = await this.prisma.employeeDebtLedger.findMany({
            where: {
                employeeId: input.employeeId,
                companyId: input.companyId,
                status: { in: [DebtStatus.ACTIVE, DebtStatus.PARTIALLY_PAID] },
            },
            orderBy: { createdAt: 'asc' },
        });

        if (activeDebts.length === 0) {
            return {
                totalDeducted: ZERO,
                remainingDebts: ZERO,
                transactions: [],
            };
        }

        let remainingToDeduct = maxDeduction;
        const transactions: DeductFromSalaryResult['transactions'] = [];

        await this.prisma.$transaction(async (tx) => {
            for (const debt of activeDebts) {
                if (isZero(remainingToDeduct) || !isPositive(remainingToDeduct)) {
                    break;
                }

                const debtBalance = toDecimal(debt.remainingBalance);
                const deductAmount = min(remainingToDeduct, debtBalance);

                if (!isPositive(deductAmount)) {
                    continue;
                }

                const newBalance = sub(debtBalance, deductAmount);
                const newStatus = isZero(newBalance) ? DebtStatus.SETTLED : DebtStatus.PARTIALLY_PAID;

                // تحديث الدين
                await tx.employeeDebtLedger.update({
                    where: { id: debt.id },
                    data: {
                        remainingBalance: newBalance,
                        status: newStatus,
                        settledAt: newStatus === DebtStatus.SETTLED ? new Date() : null,
                    },
                });

                // إنشاء حركة الخصم
                await tx.debtTransaction.create({
                    data: {
                        debtId: debt.id,
                        amount: deductAmount,
                        balanceBefore: debtBalance,
                        balanceAfter: newBalance,
                        transactionType: DebtTransactionType.PAYROLL_DEDUCTION,
                        sourceType: 'PAYROLL',
                        sourceId: input.sourceId,
                        description: 'Automatic payroll deduction',
                        processedBy: input.processedBy,
                    },
                });

                transactions.push({
                    debtId: debt.id,
                    amount: deductAmount,
                    remainingBalance: newBalance,
                });

                remainingToDeduct = sub(remainingToDeduct, deductAmount);
            }
        });

        // حساب إجمالي الديون المتبقية
        const totalDeducted = transactions.reduce(
            (sum, t) => add(sum, t.amount),
            ZERO
        );

        const remainingDebts = await this.getTotalActiveDebts(input.employeeId, input.companyId);

        this.logger.log(
            `Deducted ${toNumber(totalDeducted)} from employee ${input.employeeId}. Remaining debts: ${toNumber(remainingDebts)}`
        );

        return {
            totalDeducted,
            remainingDebts,
            transactions,
        };
    }

    /**
     * سداد يدوي لدين معين
     */
    async makeManualPayment(input: ManualPaymentInput) {
        const amount = toDecimal(input.amount);

        if (!isPositive(amount)) {
            throw new BadRequestException('Payment amount must be positive');
        }

        const debt = await this.prisma.employeeDebtLedger.findUnique({
            where: { id: input.debtId },
        });

        if (!debt) {
            throw new NotFoundException('Debt not found');
        }

        if (debt.status === DebtStatus.SETTLED || debt.status === DebtStatus.WRITTEN_OFF) {
            throw new BadRequestException('Cannot make payment on settled or written-off debt');
        }

        const currentBalance = toDecimal(debt.remainingBalance);
        const paymentAmount = min(amount, currentBalance);
        const newBalance = sub(currentBalance, paymentAmount);
        const newStatus = isZero(newBalance) ? DebtStatus.SETTLED : DebtStatus.PARTIALLY_PAID;

        return this.prisma.$transaction(async (tx) => {
            const updatedDebt = await tx.employeeDebtLedger.update({
                where: { id: input.debtId },
                data: {
                    remainingBalance: newBalance,
                    status: newStatus,
                    settledAt: newStatus === DebtStatus.SETTLED ? new Date() : null,
                },
            });

            await tx.debtTransaction.create({
                data: {
                    debtId: input.debtId,
                    amount: paymentAmount,
                    balanceBefore: currentBalance,
                    balanceAfter: newBalance,
                    transactionType: DebtTransactionType.MANUAL_PAYMENT,
                    sourceType: 'MANUAL',
                    description: input.description || 'Manual payment',
                    processedBy: input.processedBy,
                },
            });

            return {
                debt: updatedDebt,
                paymentAmount: toNumber(paymentAmount),
                newBalance: toNumber(newBalance),
                isSettled: newStatus === DebtStatus.SETTLED,
            };
        });
    }

    /**
     * شطب دين
     */
    async writeOffDebt(input: WriteOffInput) {
        const debt = await this.prisma.employeeDebtLedger.findUnique({
            where: { id: input.debtId },
        });

        if (!debt) {
            throw new NotFoundException('Debt not found');
        }

        if (debt.status === DebtStatus.SETTLED || debt.status === DebtStatus.WRITTEN_OFF) {
            throw new BadRequestException('Debt is already settled or written off');
        }

        const currentBalance = toDecimal(debt.remainingBalance);

        return this.prisma.$transaction(async (tx) => {
            const updatedDebt = await tx.employeeDebtLedger.update({
                where: { id: input.debtId },
                data: {
                    remainingBalance: ZERO,
                    status: DebtStatus.WRITTEN_OFF,
                    settledAt: new Date(),
                    notes: debt.notes
                        ? `${debt.notes}\nWrite-off reason: ${input.reason}`
                        : `Write-off reason: ${input.reason}`,
                },
            });

            await tx.debtTransaction.create({
                data: {
                    debtId: input.debtId,
                    amount: currentBalance,
                    balanceBefore: currentBalance,
                    balanceAfter: ZERO,
                    transactionType: DebtTransactionType.WRITE_OFF,
                    sourceType: 'WRITE_OFF',
                    description: input.reason,
                    processedBy: input.processedBy,
                },
            });

            return updatedDebt;
        });
    }

    /**
     * إيقاف/استئناف دين مؤقتاً
     */
    async suspendDebt(debtId: string, suspend: boolean = true) {
        const debt = await this.prisma.employeeDebtLedger.findUnique({
            where: { id: debtId },
        });

        if (!debt) {
            throw new NotFoundException('Debt not found');
        }

        if (debt.status === DebtStatus.SETTLED || debt.status === DebtStatus.WRITTEN_OFF) {
            throw new BadRequestException('Cannot suspend settled or written-off debt');
        }

        const newStatus = suspend
            ? DebtStatus.SUSPENDED
            : isZero(toDecimal(debt.remainingBalance).sub(toDecimal(debt.originalAmount)))
                ? DebtStatus.ACTIVE
                : DebtStatus.PARTIALLY_PAID;

        return this.prisma.employeeDebtLedger.update({
            where: { id: debtId },
            data: { status: newStatus },
        });
    }

    /**
     * جلب إجمالي الديون النشطة لموظف
     */
    async getTotalActiveDebts(employeeId: string, companyId: string): Promise<Decimal> {
        const result = await this.prisma.employeeDebtLedger.aggregate({
            where: {
                employeeId,
                companyId,
                status: { in: [DebtStatus.ACTIVE, DebtStatus.PARTIALLY_PAID] },
            },
            _sum: { remainingBalance: true },
        });

        return toDecimal(result._sum.remainingBalance);
    }

    /**
     * جلب جميع ديون الشركة مع Pagination
     */
    async getAllDebts(
        companyId: string,
        options?: {
            status?: DebtStatus;
            page?: number;
            limit?: number;
        }
    ) {
        const page = options?.page ?? 1;
        const limit = options?.limit ?? 10;
        const skip = (page - 1) * limit;

        const where: any = { companyId };
        if (options?.status) {
            where.status = options.status;
        }

        const [data, total] = await Promise.all([
            this.prisma.employeeDebtLedger.findMany({
                where,
                include: {
                    employee: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            employeeCode: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.employeeDebtLedger.count({ where }),
        ]);

        return {
            data: data.map((d: any) => ({
                id: d.id,
                employeeId: d.employeeId,
                companyId: d.companyId,
                type: d.sourceType,
                description: d.reason || '',
                originalAmount: toNumber(toDecimal(d.originalAmount)),
                remainingAmount: toNumber(toDecimal(d.remainingBalance)),
                monthlyDeduction: 0,
                startDate: d.createdAt,
                status: d.status === 'SETTLED' ? 'PAID' : d.status,
                notes: d.notes,
                createdAt: d.createdAt,
                updatedAt: d.updatedAt,
                employee: d.employee,
            })),
            total,
            page,
            limit,
        };
    }

    /**
     * جلب حركات دين معين
     */
    async getDebtTransactions(debtId: string) {
        return this.prisma.debtTransaction.findMany({
            where: { debtId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * جلب ديون موظف معين
     */
    async getEmployeeDebts(
        employeeId: string,
        companyId: string,
        options?: {
            status?: DebtStatus[];
            includeTransactions?: boolean;
        }
    ) {
        return this.prisma.employeeDebtLedger.findMany({
            where: {
                employeeId,
                companyId,
                ...(options?.status && { status: { in: options.status } }),
            },
            include: {
                transactions: options?.includeTransactions ?? false,
                period: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * جلب دين معين مع التفاصيل
     */
    async getDebtById(debtId: string) {
        const debt = await this.prisma.employeeDebtLedger.findUnique({
            where: { id: debtId },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                    },
                },
                period: true,
                transactions: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!debt) {
            throw new NotFoundException('Debt not found');
        }

        return debt;
    }

    /**
     * جلب ملخص ديون الشركة
     */
    async getCompanyDebtSummary(companyId: string) {
        const [active, partiallyPaid, settled, writtenOff, total] = await Promise.all([
            this.prisma.employeeDebtLedger.aggregate({
                where: { companyId, status: DebtStatus.ACTIVE },
                _sum: { remainingBalance: true },
                _count: true,
            }),
            this.prisma.employeeDebtLedger.aggregate({
                where: { companyId, status: DebtStatus.PARTIALLY_PAID },
                _sum: { remainingBalance: true },
                _count: true,
            }),
            this.prisma.employeeDebtLedger.aggregate({
                where: { companyId, status: DebtStatus.SETTLED },
                _sum: { originalAmount: true },
                _count: true,
            }),
            this.prisma.employeeDebtLedger.aggregate({
                where: { companyId, status: DebtStatus.WRITTEN_OFF },
                _sum: { originalAmount: true },
                _count: true,
            }),
            this.prisma.employeeDebtLedger.aggregate({
                where: { companyId },
                _sum: { originalAmount: true, remainingBalance: true },
                _count: true,
            }),
        ]);

        return {
            active: {
                count: active._count,
                amount: toNumber(toDecimal(active._sum.remainingBalance)),
            },
            partiallyPaid: {
                count: partiallyPaid._count,
                amount: toNumber(toDecimal(partiallyPaid._sum.remainingBalance)),
            },
            settled: {
                count: settled._count,
                totalSettled: toNumber(toDecimal(settled._sum.originalAmount)),
            },
            writtenOff: {
                count: writtenOff._count,
                totalWrittenOff: toNumber(toDecimal(writtenOff._sum.originalAmount)),
            },
            total: {
                count: total._count,
                originalAmount: toNumber(toDecimal(total._sum.originalAmount)),
                remainingBalance: toNumber(toDecimal(total._sum.remainingBalance)),
            },
        };
    }

    /**
     * جلب الموظفين الذين لديهم ديون نشطة
     */
    async getEmployeesWithActiveDebts(companyId: string, options?: { limit?: number; offset?: number }) {
        const employees = await this.prisma.employeeDebtLedger.groupBy({
            by: ['employeeId'],
            where: {
                companyId,
                status: { in: [DebtStatus.ACTIVE, DebtStatus.PARTIALLY_PAID] },
            },
            _sum: { remainingBalance: true },
            _count: true,
            orderBy: { _sum: { remainingBalance: 'desc' } },
            take: options?.limit ?? 50,
            skip: options?.offset ?? 0,
        });

        // جلب معلومات الموظفين
        const employeeIds = employees.map((e) => e.employeeId);
        const employeeDetails = await this.prisma.user.findMany({
            where: { id: { in: employeeIds } },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
            },
        });

        const employeeMap = new Map(employeeDetails.map((e) => [e.id, e]));

        return employees.map((e: any) => ({
            employee: employeeMap.get(e.employeeId),
            debtCount: e._count,
            totalDebt: toNumber(toDecimal(e._sum.remainingBalance)),
        }));
    }
}
