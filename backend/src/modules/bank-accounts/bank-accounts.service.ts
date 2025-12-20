import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';

@Injectable()
export class BankAccountsService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateBankAccountDto) {
        // التحقق من تكرار الـ IBAN
        const existingIban = await this.prisma.employeeBankAccount.findUnique({
            where: { iban: dto.iban }
        });
        if (existingIban) throw new ConflictException('رقم الـ IBAN مسجل مسبقاً لموظف آخر');

        return this.prisma.$transaction(async (tx) => {
            // إذا كان هذا الحساب رئيسي، نلغي صفة "رئيسي" عن الحسابات الأخرى لهذا الموظف
            if (dto.isPrimary !== false) {
                await tx.employeeBankAccount.updateMany({
                    where: { userId: dto.userId, isPrimary: true },
                    data: { isPrimary: false }
                });
            }

            return tx.employeeBankAccount.create({
                data: {
                    userId: dto.userId,
                    iban: dto.iban,
                    bankName: dto.bankName,
                    bankCode: dto.bankCode,
                    isPrimary: dto.isPrimary !== false,
                }
            });
        });
    }

    async findByUser(userId: string) {
        return this.prisma.employeeBankAccount.findMany({
            where: { userId },
            orderBy: { isPrimary: 'desc' }
        });
    }

    async remove(id: string) {
        return this.prisma.employeeBankAccount.delete({ where: { id } });
    }

    async setPrimary(id: string) {
        const account = await this.prisma.employeeBankAccount.findUnique({ where: { id } });
        if (!account) throw new NotFoundException('الحساب غير موجود');

        return this.prisma.$transaction(async (tx) => {
            await tx.employeeBankAccount.updateMany({
                where: { userId: account.userId, isPrimary: true },
                data: { isPrimary: false }
            });

            return tx.employeeBankAccount.update({
                where: { id },
                data: { isPrimary: true }
            });
        });
    }
}
