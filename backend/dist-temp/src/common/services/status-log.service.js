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
exports.StatusLogService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let StatusLogService = class StatusLogService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async logStatusChange(dto, companyId, userId) {
        return this.prisma.submissionStatusLog.create({
            data: {
                companyId,
                entityType: dto.entityType,
                entityId: dto.entityId,
                fromStatus: dto.fromStatus,
                toStatus: dto.toStatus,
                changedByUserId: userId,
                reason: dto.reason,
                externalRef: dto.externalRef,
                meta: dto.meta,
            },
        });
    }
    async getLogsForEntity(entityType, entityId, companyId) {
        return this.prisma.submissionStatusLog.findMany({
            where: {
                companyId,
                entityType,
                entityId,
            },
            orderBy: { changedAt: 'desc' },
        });
    }
    async getLatestLog(entityType, entityId, companyId) {
        return this.prisma.submissionStatusLog.findFirst({
            where: {
                companyId,
                entityType,
                entityId,
            },
            orderBy: { changedAt: 'desc' },
        });
    }
    async getLogsByPeriod(companyId, startDate, endDate) {
        return this.prisma.submissionStatusLog.findMany({
            where: {
                companyId,
                changedAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: { changedAt: 'desc' },
        });
    }
    async getLogsByUser(companyId, userId) {
        return this.prisma.submissionStatusLog.findMany({
            where: {
                companyId,
                changedByUserId: userId,
            },
            orderBy: { changedAt: 'desc' },
        });
    }
};
exports.StatusLogService = StatusLogService;
exports.StatusLogService = StatusLogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StatusLogService);
//# sourceMappingURL=status-log.service.js.map