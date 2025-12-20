import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateLoanPaymentDto, PaymentType } from './dto/create-loan-payment.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class LoanPaymentsService {
    constructor(private prisma: PrismaService) { }

    /**
     * تسجيل دفعة سداد جديدة
     */
    async create(dto: CreateLoanPaymentDto, createdById: string) {
        const advance = await this.prisma.advanceRequest.findUnique({
            where: { id: dto.advanceId },
            include: { payments: true },
        });

        if (!advance) throw new NotFoundException('السلفة غير موجودة');
        if (advance.status !== 'APPROVED') throw new BadRequestException('السلفة غير معتمدة');

        // حساب المبلغ المتبقي
        const totalPaid = advance.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const approvedAmount = advance.approvedAmount ? Number(advance.approvedAmount) : Number(advance.amount);
        const remaining = approvedAmount - totalPaid;

        if (dto.amount > remaining) {
            throw new BadRequestException(`المبلغ المدفوع أكبر من المتبقي (${remaining.toFixed(2)})`);
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

        // تحقق إذا تم السداد الكامل
        const newTotalPaid = totalPaid + dto.amount;
        if (newTotalPaid >= approvedAmount) {
            await this.prisma.advanceRequest.update({
                where: { id: dto.advanceId },
                data: { status: 'PAID' },
            });
        }

        return payment;
    }

    /**
     * الحصول على مدفوعات سلفة معينة
     */
    async findByAdvance(advanceId: string) {
        return this.prisma.loanPayment.findMany({
            where: { advanceId },
            orderBy: { paymentDate: 'desc' },
        });
    }

    /**
     * ملخص السلفة مع المدفوعات
     */
    async getAdvanceSummary(advanceId: string) {
        const advance = await this.prisma.advanceRequest.findUnique({
            where: { id: advanceId },
            include: {
                payments: { orderBy: { paymentDate: 'asc' } },
                user: { select: { firstName: true, lastName: true, employeeCode: true } },
            },
        });

        if (!advance) throw new NotFoundException('السلفة غير موجودة');

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

    /**
     * جميع السلف النشطة مع المتبقي
     */
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

    /**
     * حذف دفعة (في حالة الخطأ)
     */
    async remove(id: string) {
        const payment = await this.prisma.loanPayment.findUnique({
            where: { id },
            include: { advance: true },
        });

        if (!payment) throw new NotFoundException('الدفعة غير موجودة');

        // إذا كانت السلفة مغلقة، نعيد فتحها
        if (payment.advance.status === 'PAID') {
            await this.prisma.advanceRequest.update({
                where: { id: payment.advanceId },
                data: { status: 'APPROVED' },
            });
        }

        return this.prisma.loanPayment.delete({ where: { id } });
    }
}
