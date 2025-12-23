import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCompanyBankAccountDto, UpdateCompanyBankAccountDto } from './dto/company-bank-account.dto';

// قائمة البنوك السعودية المعتمدة
export const SAUDI_BANKS = [
    { code: 'NCB', name: 'البنك الأهلي السعودي', swift: 'NCBKSAJE' },
    { code: 'RJHI', name: 'مصرف الراجحي', swift: 'RJHISARI' },
    { code: 'SABB', name: 'البنك السعودي البريطاني', swift: 'SABBSARI' },
    { code: 'RIBL', name: 'بنك الرياض', swift: 'RIBLSARI' },
    { code: 'ARNB', name: 'البنك العربي الوطني', swift: 'ARNBSARI' },
    { code: 'BSFR', name: 'بنك الفرنسي', swift: 'BSFRSARI' },
    { code: 'BJAZ', name: 'بنك الجزيرة', swift: 'BJAZSAJE' },
    { code: 'SIBC', name: 'البنك السعودي للاستثمار', swift: 'SIBCSARI' },
    { code: 'ALBI', name: 'بنك البلاد', swift: 'ALBISARI' },
    { code: 'ALIN', name: 'بنك الإنماء', swift: 'ALINSARI' },
    { code: 'GULF', name: 'بنك الخليج الدولي', swift: 'GULFSARI' },
];

@Injectable()
export class CompanyBankAccountsService {
    constructor(private prisma: PrismaService) { }

    /**
     * إنشاء حساب بنكي جديد للشركة
     */
    async create(companyId: string, dto: CreateCompanyBankAccountDto) {
        // تنظيف IBAN
        const cleanIBAN = dto.iban.replace(/\s/g, '').toUpperCase();

        // التحقق من عدم وجود نفس IBAN
        const existing = await this.prisma.companyBankAccount.findFirst({
            where: { companyId, iban: cleanIBAN }
        });
        if (existing) {
            throw new ConflictException('رقم IBAN مسجل مسبقاً');
        }

        return this.prisma.$transaction(async (tx) => {
            // إذا كان رئيسي، نلغي صفة رئيسي من الحسابات الأخرى
            if (dto.isPrimary) {
                await tx.companyBankAccount.updateMany({
                    where: { companyId, isPrimary: true },
                    data: { isPrimary: false }
                });
            }

            return tx.companyBankAccount.create({
                data: {
                    companyId,
                    bankName: dto.bankName,
                    bankCode: dto.bankCode.toUpperCase(),
                    iban: cleanIBAN,
                    accountName: dto.accountName,
                    swiftCode: dto.swiftCode,
                    isPrimary: dto.isPrimary ?? false,
                    molId: dto.molId,
                    wpsParticipant: dto.wpsParticipant,
                    accountType: dto.accountType ?? 'CURRENT',
                    currency: dto.currency ?? 'SAR',
                    notes: dto.notes,
                }
            });
        });
    }

    /**
     * جلب كل الحسابات البنكية للشركة
     */
    async findAll(companyId: string) {
        return this.prisma.companyBankAccount.findMany({
            where: { companyId },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }]
        });
    }

    /**
     * جلب الحسابات النشطة فقط
     */
    async findActive(companyId: string) {
        return this.prisma.companyBankAccount.findMany({
            where: { companyId, isActive: true },
            orderBy: { isPrimary: 'desc' }
        });
    }

    /**
     * جلب الحساب الرئيسي للشركة
     */
    async findPrimary(companyId: string) {
        return this.prisma.companyBankAccount.findFirst({
            where: { companyId, isPrimary: true, isActive: true }
        });
    }

    /**
     * جلب حساب واحد
     */
    async findOne(id: string, companyId: string) {
        const account = await this.prisma.companyBankAccount.findFirst({
            where: { id, companyId }
        });
        if (!account) {
            throw new NotFoundException('الحساب البنكي غير موجود');
        }
        return account;
    }

    /**
     * تحديث حساب بنكي
     */
    async update(id: string, companyId: string, dto: UpdateCompanyBankAccountDto) {
        await this.findOne(id, companyId);

        return this.prisma.$transaction(async (tx) => {
            // إذا تم تعيينه كرئيسي، نلغي من الآخرين
            if (dto.isPrimary) {
                await tx.companyBankAccount.updateMany({
                    where: { companyId, isPrimary: true, id: { not: id } },
                    data: { isPrimary: false }
                });
            }

            return tx.companyBankAccount.update({
                where: { id },
                data: dto
            });
        });
    }

    /**
     * تعيين حساب كرئيسي
     */
    async setPrimary(id: string, companyId: string) {
        await this.findOne(id, companyId);

        return this.prisma.$transaction(async (tx) => {
            await tx.companyBankAccount.updateMany({
                where: { companyId, isPrimary: true },
                data: { isPrimary: false }
            });

            return tx.companyBankAccount.update({
                where: { id },
                data: { isPrimary: true }
            });
        });
    }

    /**
     * تفعيل/تعطيل حساب
     */
    async toggleActive(id: string, companyId: string) {
        const account = await this.findOne(id, companyId);

        return this.prisma.companyBankAccount.update({
            where: { id },
            data: { isActive: !account.isActive }
        });
    }

    /**
     * حذف حساب بنكي
     */
    async remove(id: string, companyId: string) {
        await this.findOne(id, companyId);
        return this.prisma.companyBankAccount.delete({ where: { id } });
    }

    /**
     * جلب قائمة البنوك السعودية
     */
    getSaudiBanks() {
        return SAUDI_BANKS;
    }
}
