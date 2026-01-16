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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const notifications_service_1 = require("./notifications.service");
const smart_notification_service_1 = require("./smart-notification.service");
const broadcast_notification_dto_1 = require("./dto/broadcast-notification.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let NotificationsController = class NotificationsController {
    constructor(notificationsService, smartNotificationService) {
        this.notificationsService = notificationsService;
        this.smartNotificationService = smartNotificationService;
    }
    async getNotifications(userId, companyId, unreadOnly, page, limit) {
        if (unreadOnly === 'true' || unreadOnly === '1') {
            return this.notificationsService.getForUser(userId, companyId, {
                unreadOnly: true,
                limit: limit ? parseInt(limit) : 20,
                offset: page ? (parseInt(page) - 1) * (limit ? parseInt(limit) : 20) : 0,
            });
        }
        return this.notificationsService.getNotifications(userId, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
    }
    async getUnreadCount(userId, companyId) {
        const count = await this.notificationsService.getUnreadCount(userId, companyId);
        return { count };
    }
    async markAsRead(id, userId) {
        return this.notificationsService.markAsRead(id, userId);
    }
    async markAllAsRead(userId, companyId) {
        return this.notificationsService.markAllAsRead(userId, companyId);
    }
    async deleteNotification(id, userId) {
        return this.notificationsService.deleteNotification(id, userId);
    }
    async broadcastNotification(dto) {
        return this.notificationsService.broadcastNotification(dto.type, dto.title, dto.body, dto.userIds, dto.data);
    }
    async triggerReminders() {
        return this.smartNotificationService.triggerReminderManually();
    }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'قائمة الإشعارات' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة الإشعارات' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, common_1.Query)('unreadOnly')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "getNotifications", null);
__decorate([
    (0, common_1.Get)('unread-count'),
    (0, swagger_1.ApiOperation)({ summary: 'عدد الإشعارات غير المقروءة' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'عدد الإشعارات' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "getUnreadCount", null);
__decorate([
    (0, common_1.Patch)(':id/read'),
    (0, swagger_1.ApiOperation)({ summary: 'تعليم إشعار كمقروء' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم التعليم' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Patch)('read-all'),
    (0, swagger_1.ApiOperation)({ summary: 'تعليم جميع الإشعارات كمقروءة' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم التعليم' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "markAllAsRead", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف إشعار' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم الحذف' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "deleteNotification", null);
__decorate([
    (0, common_1.Post)('broadcast'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'إرسال إشعار جماعي' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'تم الإرسال' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [broadcast_notification_dto_1.BroadcastNotificationDto]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "broadcastNotification", null);
__decorate([
    (0, common_1.Get)('trigger-reminders'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'تشغيل التذكيرات يدوياً (للاختبار)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم تشغيل التذكيرات' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "triggerReminders", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, swagger_1.ApiTags)('notifications'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('notifications'),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService,
        smart_notification_service_1.SmartNotificationService])
], NotificationsController);
//# sourceMappingURL=notifications.controller.js.map