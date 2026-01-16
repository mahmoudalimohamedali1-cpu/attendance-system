"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsModule = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const notifications_service_1 = require("./notifications.service");
const smart_notification_service_1 = require("./smart-notification.service");
const notifications_controller_1 = require("./notifications.controller");
const prisma_module_1 = require("../../common/prisma/prisma.module");
const permissions_module_1 = require("../permissions/permissions.module");
let NotificationsModule = class NotificationsModule {
};
exports.NotificationsModule = NotificationsModule;
exports.NotificationsModule = NotificationsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, permissions_module_1.PermissionsModule, schedule_1.ScheduleModule.forRoot()],
        controllers: [notifications_controller_1.NotificationsController],
        providers: [notifications_service_1.NotificationsService, smart_notification_service_1.SmartNotificationService],
        exports: [notifications_service_1.NotificationsService, smart_notification_service_1.SmartNotificationService],
    })
], NotificationsModule);
//# sourceMappingURL=notifications.module.js.map