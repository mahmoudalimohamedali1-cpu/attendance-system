import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';

@Injectable()
export class BankAccountsService {
    constructor(private prisma: PrismaService) { }

    /**
     * التحقق من صحة صيغة IBAN السعودي
     * الصيغة: SA + 22 رقم/حرف = 24 حرف إجمالي
     */
    private validateSaudiIBAN(iban: string): { isValid: boolean; error?: string } {
        // إزالة المسافات وتحويل للأحرف الكبيرة
        const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();

        // فحص الطول
        if (cleanIBAN.length !== 24) {
            return { isValid: false, error: 'طول IBAN يجب أن يكون 24 حرف' };
        }

        // فحص بداية SA
        if (!cleanIBAN.startsWith('SA')) {
            return { isValid: false, error: 'IBAN السعودي يجب أن يبدأ بـ SA' };
        }

        // فحص أن باقي الأحرف أرقام أو حروف فقط
        if (!/^SA[0-9A-Z]{22}$/.test(cleanIBAN)) {
            return { isValid: false, error: 'IBAN يحتوي على أحرف غير صالحة' };
        }

        return { isValid: true };
    }

    async create(dto: CreateBankAccountDto) {
        // التحقق من صحة IBAN
        const cleanIBAN = dto.iban.replace(/\s/g, '').toUpperCase();
        const validation = this.validateSaudiIBAN(cleanIBAN);
        if (!validation.isValid) {
            throw new BadRequestException(validation.error);
        }

        // التحقق من تكرار الـ IBAN لنفس الموظف
        const existingUserIban = await this.prisma.employeeBankAccount.findFirst({
            where: { userId: dto.userId, iban: cleanIBAN }
        });
        if (existingUserIban) throw new ConflictException('رقم الـ IBAN مسجل مسبقاً لهذا الموظف');

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
                    iban: cleanIBAN,
                    accountHolderName: dto.accountHolderName,
                    bankName: dto.bankName,
                    bankCode: dto.bankCode,
                    swiftCode: dto.swiftCode,
                    isPrimary: dto.isPrimary !== false,
                }
            });
        });
    }

    async findAll(companyId: string) {
        return this.prisma.employeeBankAccount.findMany({
            where: {
                user: { companyId }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                    }
                }
            },
            orderBy: [
                { isPrimary: 'desc' },
                { createdAt: 'desc' }
            ]
        });
    }

    async findByUser(userId: string) {
        return this.prisma.employeeBankAccount.findMany({
            where: { userId },
            orderBy: { isPrimary: 'desc' }
        });
    }

    async findPrimaryByUser(userId: string) {
        return this.prisma.employeeBankAccount.findFirst({
            where: { userId, isPrimary: true }
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

    async verify(id: string, verifiedBy: string) {
        const account = await this.prisma.employeeBankAccount.findUnique({ where: { id } });
        if (!account) throw new NotFoundException('الحساب غير موجود');

        return this.prisma.employeeBankAccount.update({
            where: { id },
            data: {
                isVerified: true,
                verifiedAt: new Date(),
                verifiedBy
            }
        });
    }

    async unverify(id: string) {
        return this.prisma.employeeBankAccount.update({
            where: { id },
            data: {
                isVerified: false,
                verifiedAt: null,
                verifiedBy: null
            }
        });
    }
}
