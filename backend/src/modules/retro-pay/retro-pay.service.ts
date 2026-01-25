import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateRetroPayDto, DistributionMode } from './dto/create-retro-pay.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class RetroPayService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateRetroPayDto, createdById: string) {
        const employee = await this.prisma.user.findUnique({ where: { id: dto.employeeId } });
        if (!employee) throw new NotFoundException('الموظف غير موجود');
        if (!employee.companyId) throw new BadRequestException('الموظف غير مرتبط بشركة');

        const effectiveFrom = new Date(dto.effectiveFrom);
        const effectiveTo = new Date(dto.effectiveTo);

        if (effectiveFrom > effectiveTo) {
            throw new BadRequestException('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
        }

        // حساب عدد الأشهر والفرق
        const monthsCount = this.calculateMonthsDifference(effectiveFrom, effectiveTo);
        const difference = dto.newAmount - dto.oldAmount;
        const totalAmount = difference * monthsCount;

        // 🆕 تحديد طريقة التوزيع
        const distributionMode = dto.distributionMode || DistributionMode.SINGLE;
        console.error(`🔧 CREATE RETRO PAY: mode=${distributionMode}, installments=${JSON.stringify(dto.installments || [])}, total=${totalAmount}`);

        // === SINGLE: دفعة واحدة (السلوك الافتراضي) ===
        if (distributionMode === DistributionMode.SINGLE) {
            return this.prisma.retroPay.create({
                data: {
                    companyId: employee.companyId,
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
                    paymentMonth: dto.paymentMonth,
                    paymentYear: dto.paymentYear,
                },
                include: { employee: true },
            });
        }

        // === EQUAL_SPLIT: توزيع بالتساوي ===
        if (distributionMode === DistributionMode.EQUAL_SPLIT) {
            const installmentCount = dto.installmentCount || 2;
            if (installmentCount < 2) throw new BadRequestException('عدد الأقساط يجب أن يكون 2 على الأقل');

            const startMonth = dto.paymentMonth || new Date().getMonth() + 1;
            const startYear = dto.paymentYear || new Date().getFullYear();

            // توزيع المبلغ بالتساوي
            const amountPerInstallment = Math.floor((totalAmount * 100) / installmentCount) / 100;
            const remainder = Math.round((totalAmount - (amountPerInstallment * installmentCount)) * 100) / 100;

            const installments = [];
            for (let i = 0; i < installmentCount; i++) {
                const { month, year } = this.addMonths(startMonth, startYear, i);
                installments.push({
                    month,
                    year,
                    amount: i === 0 ? amountPerInstallment + remainder : amountPerInstallment, // الباقي في أول قسط
                });
            }

            return this.createMultipleEntries(dto, employee.companyId, createdById, installments, effectiveFrom, effectiveTo, difference, monthsCount);
        }

        // === CUSTOM_AMOUNTS: مبالغ مخصصة ===
        if (distributionMode === DistributionMode.CUSTOM_AMOUNTS) {
            if (!dto.installments || dto.installments.length < 2) {
                throw new BadRequestException('يجب تحديد قسطين على الأقل');
            }

            // التحقق من أن مجموع الأقساط يساوي المبلغ الإجمالي
            const installmentsTotal = dto.installments.reduce((sum, inst) => sum + inst.amount, 0);
            if (Math.abs(installmentsTotal - totalAmount) > 0.01) {
                throw new BadRequestException(`مجموع الأقساط (${installmentsTotal}) لا يساوي المبلغ الإجمالي (${totalAmount})`);
            }

            return this.createMultipleEntries(dto, employee.companyId, createdById, dto.installments, effectiveFrom, effectiveTo, difference, monthsCount);
        }

        throw new BadRequestException('طريقة توزيع غير صالحة');
    }

    // 🆕 إنشاء عدة سجلات RetroPay (للأقساط)
    private async createMultipleEntries(
        dto: CreateRetroPayDto,
        companyId: string,
        createdById: string,
        installments: { month: number; year: number; amount: number }[],
        effectiveFrom: Date,
        effectiveTo: Date,
        difference: number,
        monthsCount: number,
    ) {
        const created = [];
        const groupId = `${Date.now()}`; // معرف المجموعة لربط الأقساط ببعض

        for (const inst of installments) {
            const entry = await this.prisma.retroPay.create({
                data: {
                    companyId,
                    employeeId: dto.employeeId,
                    reason: `${dto.reason} (قسط ${inst.month}/${inst.year})`,
                    effectiveFrom,
                    effectiveTo,
                    oldAmount: dto.oldAmount,
                    newAmount: dto.newAmount,
                    difference,
                    monthsCount,
                    totalAmount: inst.amount, // مبلغ هذا القسط
                    notes: dto.notes ? `${dto.notes} | مجموعة: ${groupId}` : `مجموعة: ${groupId}`,
                    createdById,
                    status: 'PENDING',
                    paymentMonth: inst.month,
                    paymentYear: inst.year,
                },
                include: { employee: true },
            });
            created.push(entry);
        }

        return created;
    }

    // 🆕 إضافة شهور لتاريخ معين
    private addMonths(startMonth: number, startYear: number, monthsToAdd: number): { month: number; year: number } {
        let month = startMonth + monthsToAdd;
        let year = startYear;

        while (month > 12) {
            month -= 12;
            year++;
        }

        return { month, year };
    }

    private calculateMonthsDifference(from: Date, to: Date): number {
        const yearDiff = to.getFullYear() - from.getFullYear();
        const monthDiff = to.getMonth() - from.getMonth();
        return yearDiff * 12 + monthDiff + 1;
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

    // 🆕 اعتماد جميع أقساط مجموعة معينة
    async approveGroup(groupId: string, approvedById: string) {
        const retroPays = await this.prisma.retroPay.findMany({
            where: {
                notes: { contains: `مجموعة: ${groupId}` },
                status: 'PENDING'
            }
        });

        if (retroPays.length === 0) throw new NotFoundException('لم يتم العثور على أقساط للمجموعة');

        const updated = await this.prisma.retroPay.updateMany({
            where: {
                notes: { contains: `مجموعة: ${groupId}` },
                status: 'PENDING'
            },
            data: {
                status: 'APPROVED',
                approvedById,
                approvedAt: new Date(),
            }
        });

        return { updatedCount: updated.count };
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
