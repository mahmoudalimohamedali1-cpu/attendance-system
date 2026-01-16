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
var LeaveResetService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveResetService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const settings_service_1 = require("./settings.service");
let LeaveResetService = LeaveResetService_1 = class LeaveResetService {
    constructor(prisma, settingsService) {
        this.prisma = prisma;
        this.settingsService = settingsService;
        this.logger = new common_1.Logger(LeaveResetService_1.name);
    }
    calculateAnnualLeaveDays(hireDate) {
        if (!hireDate) {
            return 21;
        }
        const now = new Date();
        const yearsOfService = Math.floor((now.getTime() - new Date(hireDate).getTime()) / (1000 * 60 * 60 * 24 * 365));
        return yearsOfService >= 5 ? 30 : 21;
    }
    async resetAnnualLeaveBalances() {
        this.logger.log('🔄 بدء إعادة ضبط رصيد الإجازات السنوية لجميع الشركات...');
        try {
            const companies = await this.prisma.company.findMany({
                select: { id: true, name: true }
            });
            let totalResetCount = 0;
            for (const company of companies) {
                const disableCarryover = await this.settingsService.isLeaveCarryoverDisabled(company.id);
                if (!disableCarryover) {
                    this.logger.log(`✅ سياسة ترحيل الإجازات مفعلة لشركة ${company.name} - لا حاجة لإعادة الضبط`);
                    continue;
                }
                const users = await this.prisma.user.findMany({
                    where: { status: 'ACTIVE', companyId: company.id },
                    select: {
                        id: true,
                        hireDate: true,
                    },
                });
                let companyResetCount = 0;
                for (const user of users) {
                    const newAnnualDays = this.calculateAnnualLeaveDays(user.hireDate);
                    await this.prisma.user.update({
                        where: { id: user.id },
                        data: {
                            annualLeaveDays: newAnnualDays,
                            usedLeaveDays: 0,
                            remainingLeaveDays: newAnnualDays,
                        },
                    });
                    companyResetCount++;
                }
                totalResetCount += companyResetCount;
                this.logger.log(`✅ شركة ${company.name}: تم إعادة ضبط رصيد الإجازات لـ ${companyResetCount} موظف`);
                await this.prisma.auditLog.create({
                    data: {
                        companyId: company.id,
                        action: 'SETTINGS_CHANGE',
                        entity: 'LeaveBalance',
                        description: `إعادة ضبط رصيد الإجازات السنوية لـ ${companyResetCount} موظف`,
                        newValue: { resetCount: companyResetCount, year: new Date().getFullYear() },
                    },
                });
            }
            this.logger.log(`✅ الانتهاء من إعادة ضبط رصيد الإجازات لجميع الشركات. الإجمالي: ${totalResetCount}`);
            return { message: 'تم إعادة ضبط رصيد الإجازات لجميع الشركات', totalResetCount };
        }
        catch (error) {
            this.logger.error('❌ خطأ في إعادة ضبط رصيد الإجازات:', error);
            throw error;
        }
    }
    async manualResetLeaveBalances() {
        return this.resetAnnualLeaveBalances();
    }
    async updateUserLeaveDays(userId, companyId) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
            select: { hireDate: true },
        });
        if (!user) {
            throw new Error('المستخدم غير موجود');
        }
        const newAnnualDays = this.calculateAnnualLeaveDays(user.hireDate);
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                annualLeaveDays: newAnnualDays,
            },
        });
    }
    async getLeaveStatistics(companyId) {
        const disableCarryover = await this.settingsService.isLeaveCarryoverDisabled(companyId);
        const users = await this.prisma.user.findMany({
            where: { status: 'ACTIVE', companyId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                hireDate: true,
                annualLeaveDays: true,
                usedLeaveDays: true,
                remainingLeaveDays: true,
            },
        });
        const stats = users.map(user => ({
            ...user,
            yearsOfService: user.hireDate
                ? Math.floor((Date.now() - new Date(user.hireDate).getTime()) / (1000 * 60 * 60 * 24 * 365))
                : 0,
            expectedAnnualDays: this.calculateAnnualLeaveDays(user.hireDate),
        }));
        return {
            carryoverDisabled: disableCarryover,
            totalUsers: users.length,
            statistics: stats,
        };
    }
};
exports.LeaveResetService = LeaveResetService;
__decorate([
    (0, schedule_1.Cron)('1 0 1 1 *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LeaveResetService.prototype, "resetAnnualLeaveBalances", null);
exports.LeaveResetService = LeaveResetService = LeaveResetService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        settings_service_1.SettingsService])
], LeaveResetService);
//# sourceMappingURL=leave-reset.service.js.map