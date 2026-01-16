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
exports.BankAccountsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let BankAccountsService = class BankAccountsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    validateSaudiIBAN(iban) {
        const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();
        if (cleanIBAN.length !== 24) {
            return { isValid: false, error: 'طول IBAN يجب أن يكون 24 حرف' };
        }
        if (!cleanIBAN.startsWith('SA')) {
            return { isValid: false, error: 'IBAN السعودي يجب أن يبدأ بـ SA' };
        }
        if (!/^SA[0-9A-Z]{22}$/.test(cleanIBAN)) {
            return { isValid: false, error: 'IBAN يحتوي على أحرف غير صالحة' };
        }
        return { isValid: true };
    }
    async create(dto) {
        const cleanIBAN = dto.iban.replace(/\s/g, '').toUpperCase();
        const validation = this.validateSaudiIBAN(cleanIBAN);
        if (!validation.isValid) {
            throw new common_1.BadRequestException(validation.error);
        }
        const existingUserIban = await this.prisma.employeeBankAccount.findFirst({
            where: { userId: dto.userId, iban: cleanIBAN }
        });
        if (existingUserIban)
            throw new common_1.ConflictException('رقم الـ IBAN مسجل مسبقاً لهذا الموظف');
        return this.prisma.$transaction(async (tx) => {
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
    async findAll(companyId) {
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
    async findByUser(userId) {
        return this.prisma.employeeBankAccount.findMany({
            where: { userId },
            orderBy: { isPrimary: 'desc' }
        });
    }
    async findPrimaryByUser(userId) {
        return this.prisma.employeeBankAccount.findFirst({
            where: { userId, isPrimary: true }
        });
    }
    async remove(id) {
        return this.prisma.employeeBankAccount.delete({ where: { id } });
    }
    async setPrimary(id) {
        const account = await this.prisma.employeeBankAccount.findUnique({ where: { id } });
        if (!account)
            throw new common_1.NotFoundException('الحساب غير موجود');
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
    async verify(id, verifiedBy) {
        const account = await this.prisma.employeeBankAccount.findUnique({ where: { id } });
        if (!account)
            throw new common_1.NotFoundException('الحساب غير موجود');
        return this.prisma.employeeBankAccount.update({
            where: { id },
            data: {
                isVerified: true,
                verifiedAt: new Date(),
                verifiedBy
            }
        });
    }
    async unverify(id) {
        return this.prisma.employeeBankAccount.update({
            where: { id },
            data: {
                isVerified: false,
                verifiedAt: null,
                verifiedBy: null
            }
        });
    }
};
exports.BankAccountsService = BankAccountsService;
exports.BankAccountsService = BankAccountsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BankAccountsService);
//# sourceMappingURL=bank-accounts.service.js.map