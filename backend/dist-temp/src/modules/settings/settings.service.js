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
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let SettingsService = class SettingsService {
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    async getAllSettings(companyId) {
        return this.prisma.systemSetting.findMany({
            where: { companyId },
        });
    }
    async getSetting(key, companyId) {
        return this.prisma.systemSetting.findFirst({
            where: { key, companyId },
        });
    }
    async setSetting(key, value, companyId, description, userId) {
        const oldSetting = await this.getSetting(key, companyId);
        const setting = await this.prisma.systemSetting.upsert({
            where: {
                key_companyId: { key, companyId }
            },
            create: { key, value, companyId, description },
            update: { value, description },
        });
        await this.auditService.log(oldSetting ? 'UPDATE' : 'CREATE', 'Settings', key, userId, oldSetting ? { value: oldSetting.value } : null, { value }, `تعديل إعداد: ${key}`);
        return setting;
    }
    async deleteSetting(key, companyId, userId) {
        const oldSetting = await this.getSetting(key, companyId);
        const result = await this.prisma.systemSetting.delete({
            where: {
                key_companyId: { key, companyId }
            },
        });
        await this.auditService.log('DELETE', 'Settings', key, userId, oldSetting ? { value: oldSetting.value } : null, null, `حذف إعداد: ${key}`);
        return result;
    }
    async setMultipleSettings(settings, companyId) {
        const results = [];
        for (const setting of settings) {
            const result = await this.setSetting(setting.key, setting.value, companyId, setting.description);
            results.push(result);
        }
        return results;
    }
    async getHolidays(companyId, year) {
        const where = { companyId };
        if (year) {
            const startOfYear = new Date(year, 0, 1);
            const endOfYear = new Date(year, 11, 31);
            where.date = {
                gte: startOfYear,
                lte: endOfYear,
            };
        }
        return this.prisma.holiday.findMany({
            where,
            orderBy: { date: 'asc' },
        });
    }
    async createHoliday(data, companyId) {
        return this.prisma.holiday.create({
            data: { ...data, companyId },
        });
    }
    async updateHoliday(id, companyId, data) {
        return this.prisma.holiday.update({
            where: { id, companyId },
            data,
        });
    }
    async deleteHoliday(id, companyId) {
        return this.prisma.holiday.delete({
            where: { id, companyId },
        });
    }
    async isHoliday(date, companyId) {
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        const targetMonth = targetDate.getMonth() + 1;
        const targetDay = targetDate.getDate();
        const whereClause = {};
        if (companyId) {
            whereClause.companyId = companyId;
        }
        const exactMatch = await this.prisma.holiday.findFirst({
            where: {
                ...whereClause,
                date: targetDate,
            },
        });
        if (exactMatch)
            return true;
        const recurringHolidays = await this.prisma.holiday.findMany({
            where: {
                ...whereClause,
                isRecurring: true,
            },
        });
        for (const holiday of recurringHolidays) {
            const holidayDate = new Date(holiday.date);
            if (holidayDate.getMonth() + 1 === targetMonth && holidayDate.getDate() === targetDay) {
                return true;
            }
        }
        return false;
    }
    async isLeaveCarryoverDisabled(companyId) {
        const setting = await this.getSetting('disableLeaveCarryover', companyId);
        return setting?.value === 'true';
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], SettingsService);
//# sourceMappingURL=settings.service.js.map