import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateRetroPayDto } from './dto/create-retro-pay.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class RetroPayService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateRetroPayDto, createdById: string) {
        const employee = await this.prisma.user.findUnique({ where: { id: dto.employeeId } });
        if (!employee) throw new NotFoundException('الموظف غير موجود');

        const effectiveFrom = new Date(dto.effectiveFrom);
        const effectiveTo = new Date(dto.effectiveTo);

        if (effectiveFrom > effectiveTo) {
            throw new BadRequestException('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
        }

        // حساب عدد الأشهر
        const monthsCount = this.calculateMonthsDifference(effectiveFrom, effectiveTo);

        // حساب الفرق
        const difference = dto.newAmount - dto.oldAmount;
        const totalAmount = difference * monthsCount;

        return this.prisma.retroPay.create({
            data: {
                employeeId: dto.employeeId,
                reason: dto.reason,
                effectiveFrom,
                effectiveTo,
                oldAmount: dto.oldAmount,
                newAmount: dto.newAmount,
                difference,
                monthsCount,
                totalAmount,
                notes: dto.notes,
                createdById,
                status: 'PENDING',
            },
            include: { employee: true },
        });
    }

    private calculateMonthsDifference(from: Date, to: Date): number {
        const yearDiff = to.getFullYear() - from.getFullYear();
        const monthDiff = to.getMonth() - from.getMonth();
        return yearDiff * 12 + monthDiff + 1; // +1 لأن الشهرين مشمولين
    }

    async findAll() {
        return this.prisma.retroPay.findMany({
            include: { employee: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findByEmployee(employeeId: string) {
        return this.prisma.retroPay.findMany({
            where: { employeeId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async approve(id: string, approvedById: string) {
        const retroPay = await this.prisma.retroPay.findUnique({ where: { id } });
        if (!retroPay) throw new NotFoundException('طلب الفرق غير موجود');
        if (retroPay.status !== 'PENDING') throw new BadRequestException('لا يمكن اعتماد طلب غير منتظر');

        return this.prisma.retroPay.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approvedById,
                approvedAt: new Date(),
            },
            include: { employee: true },
        });
    }

    async markAsPaid(id: string) {
        const retroPay = await this.prisma.retroPay.findUnique({ where: { id } });
        if (!retroPay) throw new NotFoundException('طلب الفرق غير موجود');
        if (retroPay.status !== 'APPROVED') throw new BadRequestException('يجب اعتماد الطلب أولاً');

        return this.prisma.retroPay.update({
            where: { id },
            data: {
                status: 'PAID',
                paidAt: new Date(),
            },
            include: { employee: true },
        });
    }

    async cancel(id: string) {
        return this.prisma.retroPay.update({
            where: { id },
            data: { status: 'CANCELLED' },
            include: { employee: true },
        });
    }

    // إحصائيات للداشبورد
    async getStats() {
        const [pending, approved, totalPaid] = await Promise.all([
            this.prisma.retroPay.count({ where: { status: 'PENDING' } }),
            this.prisma.retroPay.count({ where: { status: 'APPROVED' } }),
            this.prisma.retroPay.aggregate({
                where: { status: 'PAID' },
                _sum: { totalAmount: true },
            }),
        ]);

        return {
            pendingCount: pending,
            approvedCount: approved,
            totalPaidAmount: totalPaid._sum.totalAmount || 0,
        };
    }
}
