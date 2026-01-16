"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RaisesModule = void 0;
const common_1 = require("@nestjs/common");
const raises_controller_1 = require("./raises.controller");
const raises_service_1 = require("./raises.service");
const prisma_module_1 = require("../../common/prisma/prisma.module");
const upload_module_1 = require("../../common/upload/upload.module");
const permissions_module_1 = require("../permissions/permissions.module");
const notifications_module_1 = require("../notifications/notifications.module");
const approval_workflow_service_1 = require("../../common/services/approval-workflow.service");
let RaisesModule = class RaisesModule {
};
exports.RaisesModule = RaisesModule;
exports.RaisesModule = RaisesModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, upload_module_1.UploadModule, permissions_module_1.PermissionsModule, notifications_module_1.NotificationsModule],
        controllers: [raises_controller_1.RaisesController],
        providers: [raises_service_1.RaisesService, approval_workflow_service_1.ApprovalWorkflowService],
        exports: [raises_service_1.RaisesService],
    })
], RaisesModule);
//# sourceMappingURL=raises.module.js.map