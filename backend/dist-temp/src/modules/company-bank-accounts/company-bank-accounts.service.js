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
exports.CompanyBankAccountsService = exports.SAUDI_BANKS = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
exports.SAUDI_BANKS = [
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
let CompanyBankAccountsService = class CompanyBankAccountsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(companyId, dto) {
        const cleanIBAN = dto.iban.replace(/\s/g, '').toUpperCase();
        const existing = await this.prisma.companyBankAccount.findFirst({
            where: { companyId, iban: cleanIBAN }
        });
        if (existing) {
            throw new common_1.ConflictException('رقم IBAN مسجل مسبقاً');
        }
        return this.prisma.$transaction(async (tx) => {
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
    async findAll(companyId) {
        return this.prisma.companyBankAccount.findMany({
            where: { companyId },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }]
        });
    }
    async findActive(companyId) {
        return this.prisma.companyBankAccount.findMany({
            where: { companyId, isActive: true },
            orderBy: { isPrimary: 'desc' }
        });
    }
    async findPrimary(companyId) {
        return this.prisma.companyBankAccount.findFirst({
            where: { companyId, isPrimary: true, isActive: true }
        });
    }
    async findOne(id, companyId) {
        const account = await this.prisma.companyBankAccount.findFirst({
            where: { id, companyId }
        });
        if (!account) {
            throw new common_1.NotFoundException('الحساب البنكي غير موجود');
        }
        return account;
    }
    async update(id, companyId, dto) {
        await this.findOne(id, companyId);
        return this.prisma.$transaction(async (tx) => {
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
    async setPrimary(id, companyId) {
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
    async toggleActive(id, companyId) {
        const account = await this.findOne(id, companyId);
        return this.prisma.companyBankAccount.update({
            where: { id },
            data: { isActive: !account.isActive }
        });
    }
    async remove(id, companyId) {
        await this.findOne(id, companyId);
        return this.prisma.companyBankAccount.delete({ where: { id } });
    }
    getSaudiBanks() {
        return exports.SAUDI_BANKS;
    }
};
exports.CompanyBankAccountsService = CompanyBankAccountsService;
exports.CompanyBankAccountsService = CompanyBankAccountsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CompanyBankAccountsService);
//# sourceMappingURL=company-bank-accounts.service.js.map