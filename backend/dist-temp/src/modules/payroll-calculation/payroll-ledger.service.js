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
var PayrollLedgerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollLedgerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const library_1 = require("@prisma/client/runtime/library");
let PayrollLedgerService = PayrollLedgerService_1 = class PayrollLedgerService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(PayrollLedgerService_1.name);
    }
    async generateLedger(runId, companyId) {
        this.logger.log(`Generating financial ledger for payroll run: ${runId}`);
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
        let totalGross = new library_1.Decimal(0);
        let totalDeduction = new library_1.Decimal(0);
        let totalNet = new library_1.Decimal(0);
        let totalEmployerGosi = new library_1.Decimal(0);
        const accountBalances = {
            '5101': { name: 'رواتب أساسية', debit: new library_1.Decimal(0), credit: new library_1.Decimal(0) },
            '5102': { name: 'بدلات ومزايا', debit: new library_1.Decimal(0), credit: new library_1.Decimal(0) },
            '2201': { name: 'تأمينات اجتماعية - حصة الشركة', debit: new library_1.Decimal(0), credit: new library_1.Decimal(0) },
            '1301': { name: 'سلف وقروض موظفين', debit: new library_1.Decimal(0), credit: new library_1.Decimal(0) },
            '2101': { name: 'رواتب مستحقة (صافي)', debit: new library_1.Decimal(0), credit: new library_1.Decimal(0) },
        };
        for (const payslip of payslips) {
            totalGross = totalGross.plus(payslip.grossSalary);
            totalDeduction = totalDeduction.plus(payslip.totalDeductions);
            totalNet = totalNet.plus(payslip.netSalary);
            for (const line of payslip.lines) {
                const amount = new library_1.Decimal(line.amount);
                if (line.component?.code === 'BASIC') {
                    accountBalances['5101'].debit = accountBalances['5101'].debit.plus(amount);
                }
                else if (line.sign === 'EARNING') {
                    accountBalances['5102'].debit = accountBalances['5102'].debit.plus(amount);
                }
                else if (line.component?.code === 'LOAN' || line.component?.code === 'ADVANCE') {
                    accountBalances['1301'].credit = accountBalances['1301'].credit.plus(amount);
                }
                else if (line.component?.code === 'GOSI_CO') {
                    totalEmployerGosi = totalEmployerGosi.plus(amount);
                }
            }
        }
        accountBalances['2201'].debit = totalEmployerGosi;
        accountBalances['2101'].credit = totalNet;
        return this.prisma.$transaction(async (tx) => {
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
};
exports.PayrollLedgerService = PayrollLedgerService;
exports.PayrollLedgerService = PayrollLedgerService = PayrollLedgerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PayrollLedgerService);
//# sourceMappingURL=payroll-ledger.service.js.map