import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PayrollLedgerService {
    private readonly logger = new Logger(PayrollLedgerService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * إنشاء سجلات مراجعة مالية (Ledger) لدورة رواتب معينة
     * يتم استدعاء هذه الدالة عند اعتماد الرواتب نهائياً
     */
    async generateLedger(runId: string, companyId: string) {
        this.logger.log(`Generating financial ledger for payroll run: ${runId}`);

        // 1. جلب كافة قسائم الرواتب المرتبطة بالدورة
        const payslips = await this.prisma.payslip.findMany({
            where: { runId, companyId },
            include: {
                lines: {
                    include: {
                        component: true,
                    },
                },
            },
        });

        if (payslips.length === 0) {
            this.logger.warn(`No payslips found for run ${runId}. Skipping ledger generation.`);
            return;
        }

        // 2. تجميع البيانات المالية
        let totalGross = new Decimal(0);
        let totalDeduction = new Decimal(0);
        let totalNet = new Decimal(0);
        let totalEmployerGosi = new Decimal(0);

        // تجميع حسب كود الحساب (افتراضي حالياً)
        const accountBalances: Record<string, { name: string; debit: Decimal; credit: Decimal }> = {
            '5101': { name: 'رواتب أساسية', debit: new Decimal(0), credit: new Decimal(0) },
            '5102': { name: 'بدلات ومزايا', debit: new Decimal(0), credit: new Decimal(0) },
            '2201': { name: 'تأمينات اجتماعية - حصة الشركة', debit: new Decimal(0), credit: new Decimal(0) },
            '1301': { name: 'سلف وقروض موظفين', debit: new Decimal(0), credit: new Decimal(0) },
            '2101': { name: 'رواتب مستحقة (صافي)', debit: new Decimal(0), credit: new Decimal(0) },
        };

        for (const payslip of payslips) {
            totalGross = totalGross.plus(payslip.grossSalary);
            totalDeduction = totalDeduction.plus(payslip.totalDeductions);
            totalNet = totalNet.plus(payslip.netSalary);

            for (const line of payslip.lines) {
                const amount = new Decimal(line.amount);

                // تصنيف الحركات المحاسبية
                if (line.component?.code === 'BASIC') {
                    accountBalances['5101'].debit = accountBalances['5101'].debit.plus(amount);
                } else if (line.sign === 'EARNING') {
                    accountBalances['5102'].debit = accountBalances['5102'].debit.plus(amount);
                } else if (line.component?.code === 'LOAN' || line.component?.code === 'ADVANCE') {
                    accountBalances['1301'].credit = accountBalances['1301'].credit.plus(amount);
                } else if (line.component?.code === 'GOSI_CO') {
                    totalEmployerGosi = totalEmployerGosi.plus(amount);
                }
            }
        }

        // حصة الشركة في التأمينات كحركة منفرة
        accountBalances['2201'].debit = totalEmployerGosi;

        // الصافي يضاف كالتزام (Credit) في حساب الرواتب المستحقة
        accountBalances['2101'].credit = totalNet;

        // 3. حفظ السجل المالي
        return this.prisma.$transaction(async (tx) => {
            // حذف السجل القديم لو وجد (Re-generation)
            await tx.payrollLedger.deleteMany({ where: { runId, companyId } });

            const ledger = await tx.payrollLedger.create({
                data: {
                    runId,
                    companyId,
                    totalGross,
                    totalDeduction,
                    totalNet,
                    totalEmployerContribution: totalEmployerGosi,
                    status: 'DRAFT',
                    entries: {
                        create: Object.entries(accountBalances)
                            .filter(([_, bal]) => bal.debit.gt(0) || bal.credit.gt(0))
                            .map(([code, bal]) => ({
                                accountCode: code,
                                accountName: bal.name,
                                debit: bal.debit,
                                credit: bal.credit,
                            })),
                    },
                },
            });

            return ledger;
        });
    }
}
