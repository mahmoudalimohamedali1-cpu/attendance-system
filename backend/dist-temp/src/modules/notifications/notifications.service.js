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
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let NotificationsService = class NotificationsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        return this.prisma.notification.create({
            data: {
                companyId: dto.companyId,
                userId: dto.userId,
                type: dto.type,
                title: dto.title,
                titleEn: dto.titleEn,
                body: dto.body,
                bodyEn: dto.bodyEn,
                entityType: dto.entityType,
                entityId: dto.entityId,
                data: dto.data,
            },
        });
    }
    async createMany(companyId, userIds, type, title, body, entityType, entityId, data) {
        return this.prisma.notification.createMany({
            data: userIds.map((userId) => ({
                companyId,
                userId,
                type,
                title,
                body,
                entityType,
                entityId,
                data,
            })),
        });
    }
    async getForUser(userId, companyId, options) {
        const where = {
            userId,
            companyId,
        };
        if (options?.unreadOnly) {
            where.isRead = false;
        }
        const [items, total] = await Promise.all([
            this.prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: options?.limit || 20,
                skip: options?.offset || 0,
            }),
            this.prisma.notification.count({ where }),
        ]);
        return { items, total };
    }
    async getUnreadCount(userId, companyId) {
        const cid = companyId || (await this.prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } }))?.companyId;
        return this.prisma.notification.count({
            where: {
                userId,
                companyId: cid || undefined,
                isRead: false,
            },
        });
    }
    async markAsRead(id, userId) {
        return this.prisma.notification.updateMany({
            where: { id, userId },
            data: { isRead: true, readAt: new Date() },
        });
    }
    async markAllAsRead(userId, companyId) {
        const cid = companyId || (await this.prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } }))?.companyId;
        return this.prisma.notification.updateMany({
            where: { userId, companyId: cid || undefined, isRead: false },
            data: { isRead: true, readAt: new Date() },
        });
    }
    async getNotifications(userId, page = 1, limit = 20) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { companyId: true }
        });
        return this.getForUser(userId, user?.companyId || '', {
            limit,
            offset: (page - 1) * limit
        });
    }
    async deleteNotification(id, userId) {
        return this.prisma.notification.deleteMany({
            where: { id, userId }
        });
    }
    async broadcastNotification(type, title, body, userIds, data) {
        if (!userIds || userIds.length === 0)
            return;
        const user = await this.prisma.user.findFirst({
            where: { id: userIds[0] },
            select: { companyId: true }
        });
        return this.createMany(user?.companyId || '', userIds, type, title, body, undefined, undefined, data);
    }
    async sendNotification(userId, type, titleOrMessage, body, data, titleEn, bodyEn) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { companyId: true }
        });
        if (!user)
            return;
        const finalTitle = body ? titleOrMessage : 'System Notification';
        const finalBody = body ? body : titleOrMessage;
        return this.create({
            companyId: user.companyId || '',
            userId,
            type,
            title: finalTitle,
            titleEn,
            body: finalBody,
            bodyEn,
            data,
        });
    }
    async notifyHRCaseSubmitted(companyId, caseId, caseCode, employeeName) {
        const hrUsers = await this.prisma.user.findMany({
            where: { companyId, role: 'ADMIN', status: 'ACTIVE' },
            select: { id: true },
        });
        if (hrUsers.length === 0)
            return;
        return this.createMany(companyId, hrUsers.map((u) => u.id), 'DISC_CASE_SUBMITTED', 'طلب تحقيق جديد', `تم رفع طلب تحقيق جديد ${caseCode} بخصوص ${employeeName}`, 'DISCIPLINARY_CASE', caseId, { caseCode, employeeName });
    }
    async notifyEmployeeDecisionIssued(companyId, employeeId, caseId, caseCode, objectionDeadlineDays) {
        return this.create({
            companyId,
            userId: employeeId,
            type: 'DISC_DECISION_ISSUED',
            title: 'صدر قرار بخصوص قضيتك',
            body: `صدر قرار بشأن القضية ${caseCode}. لديك ${objectionDeadlineDays} يوم للرد أو الاعتراض.`,
            entityType: 'DISCIPLINARY_CASE',
            entityId: caseId,
            data: { caseCode, objectionDeadlineDays },
        });
    }
    async notifyHREmployeeObjected(companyId, caseId, caseCode, employeeName) {
        const hrUsers = await this.prisma.user.findMany({
            where: { companyId, role: 'ADMIN', status: 'ACTIVE' },
            select: { id: true },
        });
        if (hrUsers.length === 0)
            return;
        return this.createMany(companyId, hrUsers.map((u) => u.id), 'DISC_EMP_OBJECTED', 'اعتراض موظف على قرار', `اعترض ${employeeName} على القرار الصادر في القضية ${caseCode}`, 'DISCIPLINARY_CASE', caseId, { caseCode, employeeName });
    }
    async notifyEmployeeHearingScheduled(companyId, employeeId, caseId, caseCode, hearingDatetime, hearingLocation) {
        return this.create({
            companyId,
            userId: employeeId,
            type: 'DISC_HEARING_SCHEDULED',
            title: 'تم تحديد موعد جلسة',
            body: `تم تحديد جلسة تحقيق للقضية ${caseCode} في ${hearingLocation}`,
            entityType: 'DISCIPLINARY_CASE',
            entityId: caseId,
            data: { caseCode, hearingDatetime, hearingLocation },
        });
    }
    async notifyCaseFinalized(companyId, employeeId, managerId, caseId, caseCode, outcome) {
        return this.createMany(companyId, [employeeId, managerId], 'DISC_FINALIZED', 'انتهت القضية التأديبية', `انتهت القضية ${caseCode} بنتيجة: ${outcome}`, 'DISCIPLINARY_CASE', caseId, { caseCode, outcome });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map