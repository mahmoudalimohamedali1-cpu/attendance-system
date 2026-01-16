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
exports.PayrollSettingsService = exports.UpdatePayrollSettingsDto = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
class UpdatePayrollSettingsDto {
}
exports.UpdatePayrollSettingsDto = UpdatePayrollSettingsDto;
let PayrollSettingsService = class PayrollSettingsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSettings(companyId) {
        const payrollSettings = this.prisma.payrollSettings;
        let settings = await payrollSettings.findUnique({
            where: { companyId },
        });
        if (!settings) {
            settings = await payrollSettings.create({
                data: { companyId },
            });
        }
        return settings;
    }
    async updateSettings(companyId, data) {
        if (data.payrollClosingDay !== undefined) {
            if (data.payrollClosingDay < 0 || data.payrollClosingDay > 28) {
                throw new Error('يجب أن يكون تاريخ إغلاق الرواتب بين 0 و 28');
            }
        }
        const payrollSettings = this.prisma.payrollSettings;
        const existing = await payrollSettings.findUnique({
            where: { companyId },
        });
        if (!existing) {
            return payrollSettings.create({
                data: {
                    companyId,
                    ...data,
                },
            });
        }
        return payrollSettings.update({
            where: { companyId },
            data,
        });
    }
    async resetToDefaults(companyId) {
        const payrollSettings = this.prisma.payrollSettings;
        const existing = await payrollSettings.findUnique({
            where: { companyId },
        });
        if (existing) {
            await payrollSettings.delete({
                where: { companyId },
            });
        }
        return payrollSettings.create({
            data: { companyId },
        });
    }
};
exports.PayrollSettingsService = PayrollSettingsService;
exports.PayrollSettingsService = PayrollSettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PayrollSettingsService);
//# sourceMappingURL=payroll-settings.service.js.map