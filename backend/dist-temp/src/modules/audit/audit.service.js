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
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let AuditService = class AuditService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async log(action, entity, entityId, userId, oldValue, newValue, description, ipAddress, userAgent) {
        return this.prisma.auditLog.create({
            data: {
                action,
                entity,
                entityId,
                userId,
                oldValue,
                newValue,
                description,
                ipAddress,
                userAgent,
            },
        });
    }
    async getAuditLogs(query) {
        const { userId, entity, entityId, action, startDate, endDate, page = 1, limit = 50, } = query;
        const where = {};
        if (userId)
            where.userId = userId;
        if (entity)
            where.entity = { equals: entity, mode: 'insensitive' };
        if (entityId)
            where.entityId = entityId;
        if (action)
            where.action = action;
        if (startDate) {
            where.createdAt = { gte: new Date(startDate) };
        }
        if (endDate) {
            where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
        }
        const [logs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                include: {
                    user: {
                        select: { firstName: true, lastName: true, email: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.auditLog.count({ where }),
        ]);
        return {
            data: logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getSuspiciousAttempts(query) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 50;
        const { userId, attemptType, startDate, endDate } = query;
        const where = {};
        if (userId)
            where.userId = userId;
        if (attemptType)
            where.attemptType = attemptType;
        if (startDate) {
            where.createdAt = { gte: new Date(startDate) };
        }
        if (endDate) {
            where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
        }
        const skipValue = Math.max(0, (page - 1) * limit);
        const takeValue = Math.max(1, limit);
        try {
            const [attempts, total] = await Promise.all([
                this.prisma.suspiciousAttempt.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    skip: skipValue,
                    take: takeValue,
                }),
                this.prisma.suspiciousAttempt.count({ where }),
            ]);
            return {
                data: attempts,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            };
        }
        catch (error) {
            console.error('Error in getSuspiciousAttempts:', error);
            console.error('Values:', { page, limit, skipValue, takeValue });
            throw error;
        }
    }
    async logLogin(userId, ipAddress, userAgent) {
        return this.log('LOGIN', 'AUTH', undefined, userId, null, null, 'تسجيل دخول ناجح', ipAddress, userAgent);
    }
    async logPayrollChange(userId, payrollId, action, oldValue, newValue, description) {
        return this.log(action, 'PAYROLL', payrollId, userId, oldValue, newValue, description);
    }
    async logBankAccountChange(userId, accountId, action, oldValue, newValue) {
        const sanitizeBank = (data) => {
            if (!data)
                return null;
            return {
                ...data,
                iban: data.iban ? '****' + data.iban.slice(-4) : undefined,
                accountNumber: data.accountNumber ? '****' + data.accountNumber.slice(-4) : undefined,
            };
        };
        return this.log(action, 'BANK_ACCOUNT', accountId, userId, sanitizeBank(oldValue), sanitizeBank(newValue), 'تغيير في بيانات الحساب البنكي');
    }
    async logExport(userId, entity, description) {
        return this.log('EXPORT', entity, undefined, userId, null, null, description);
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditService);
//# sourceMappingURL=audit.service.js.map