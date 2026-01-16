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
exports.LoanPaymentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let LoanPaymentsService = class LoanPaymentsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, createdById) {
        const advance = await this.prisma.advanceRequest.findUnique({
            where: { id: dto.advanceId },
            include: { payments: true },
        });
        if (!advance)
            throw new common_1.NotFoundException('السلفة غير موجودة');
        if (advance.status !== 'APPROVED')
            throw new common_1.BadRequestException('السلفة غير معتمدة');
        const totalPaid = advance.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const approvedAmount = advance.approvedAmount ? Number(advance.approvedAmount) : Number(advance.amount);
        const remaining = approvedAmount - totalPaid;
        if (dto.amount > remaining) {
            throw new common_1.BadRequestException(`المبلغ المدفوع أكبر من المتبقي (${remaining.toFixed(2)})`);
        }
        const payment = await this.prisma.loanPayment.create({
            data: {
                advanceId: dto.advanceId,
                amount: dto.amount,
                paymentDate: new Date(dto.paymentDate),
                paymentType: dto.paymentType || 'SALARY_DEDUCTION',
                payrollRunId: dto.payrollRunId,
                payslipId: dto.payslipId,
                notes: dto.notes,
                createdById,
            },
        });
        const newTotalPaid = totalPaid + dto.amount;
        if (newTotalPaid >= approvedAmount) {
            await this.prisma.advanceRequest.update({
                where: { id: dto.advanceId },
                data: { status: 'PAID' },
            });
        }
        return payment;
    }
    async findByAdvance(advanceId) {
        return this.prisma.loanPayment.findMany({
            where: { advanceId },
            orderBy: { paymentDate: 'desc' },
        });
    }
    async getAdvanceSummary(advanceId) {
        const advance = await this.prisma.advanceRequest.findUnique({
            where: { id: advanceId },
            include: {
                payments: { orderBy: { paymentDate: 'asc' } },
                user: { select: { firstName: true, lastName: true, employeeCode: true } },
            },
        });
        if (!advance)
            throw new common_1.NotFoundException('السلفة غير موجودة');
        const approvedAmount = advance.approvedAmount ? Number(advance.approvedAmount) : Number(advance.amount);
        const totalPaid = advance.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const remaining = approvedAmount - totalPaid;
        const monthlyDeduction = advance.approvedMonthlyDeduction
            ? Number(advance.approvedMonthlyDeduction)
            : Number(advance.monthlyDeduction);
        return {
            advance: {
                id: advance.id,
                employee: advance.user,
                amount: approvedAmount,
                monthlyDeduction,
                status: advance.status,
                startDate: advance.startDate,
                endDate: advance.endDate,
            },
            payments: advance.payments.map(p => ({
                id: p.id,
                amount: Number(p.amount),
                date: p.paymentDate,
                type: p.paymentType,
            })),
            summary: {
                totalAmount: approvedAmount,
                totalPaid,
                remaining,
                paidPercentage: Math.round((totalPaid / approvedAmount) * 100),
                paymentsCount: advance.payments.length,
            },
        };
    }
    async getActiveLoansWithBalance() {
        const advances = await this.prisma.advanceRequest.findMany({
            where: {
                status: { in: ['APPROVED', 'PAID'] },
            },
            include: {
                payments: true,
                user: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return advances.map(adv => {
            const approved = adv.approvedAmount ? Number(adv.approvedAmount) : Number(adv.amount);
            const paid = adv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
            return {
                id: adv.id,
                employee: adv.user,
                amount: approved,
                paid,
                remaining: approved - paid,
                status: adv.status,
                monthlyDeduction: adv.approvedMonthlyDeduction
                    ? Number(adv.approvedMonthlyDeduction)
                    : Number(adv.monthlyDeduction),
            };
        });
    }
    async remove(id) {
        const payment = await this.prisma.loanPayment.findUnique({
            where: { id },
            include: { advance: true },
        });
        if (!payment)
            throw new common_1.NotFoundException('الدفعة غير موجودة');
        if (payment.advance.status === 'PAID') {
            await this.prisma.advanceRequest.update({
                where: { id: payment.advanceId },
                data: { status: 'APPROVED' },
            });
        }
        return this.prisma.loanPayment.delete({ where: { id } });
    }
};
exports.LoanPaymentsService = LoanPaymentsService;
exports.LoanPaymentsService = LoanPaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LoanPaymentsService);
//# sourceMappingURL=loan-payments.service.js.map