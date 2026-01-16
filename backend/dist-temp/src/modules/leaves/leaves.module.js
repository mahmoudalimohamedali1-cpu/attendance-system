"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeavesModule = void 0;
const common_1 = require("@nestjs/common");
const leaves_controller_1 = require("./leaves.controller");
const leaves_service_1 = require("./leaves.service");
const leave_calculation_service_1 = require("./leave-calculation.service");
const leave_type_config_service_1 = require("./leave-type-config.service");
const leave_balance_service_1 = require("./leave-balance.service");
const notifications_module_1 = require("../notifications/notifications.module");
const upload_module_1 = require("../../common/upload/upload.module");
const permissions_module_1 = require("../permissions/permissions.module");
const smart_policies_module_1 = require("../smart-policies/smart-policies.module");
const timezone_service_1 = require("../../common/services/timezone.service");
let LeavesModule = class LeavesModule {
};
exports.LeavesModule = LeavesModule;
exports.LeavesModule = LeavesModule = __decorate([
    (0, common_1.Module)({
        imports: [notifications_module_1.NotificationsModule, upload_module_1.UploadModule, permissions_module_1.PermissionsModule, (0, common_1.forwardRef)(() => smart_policies_module_1.SmartPoliciesModule)],
        controllers: [leaves_controller_1.LeavesController],
        providers: [
            leaves_service_1.LeavesService,
            leave_calculation_service_1.LeaveCalculationService,
            leave_type_config_service_1.LeaveTypeConfigService,
            leave_balance_service_1.LeaveBalanceService,
            timezone_service_1.TimezoneService,
        ],
        exports: [
            leaves_service_1.LeavesService,
            leave_calculation_service_1.LeaveCalculationService,
            leave_type_config_service_1.LeaveTypeConfigService,
            leave_balance_service_1.LeaveBalanceService,
        ],
    })
], LeavesModule);
//# sourceMappingURL=leaves.module.js.map