"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceModule = void 0;
const common_1 = require("@nestjs/common");
const attendance_controller_1 = require("./attendance.controller");
const attendance_service_1 = require("./attendance.service");
const geofence_service_1 = require("./services/geofence.service");
const notifications_module_1 = require("../notifications/notifications.module");
const permissions_module_1 = require("../permissions/permissions.module");
const smart_policies_module_1 = require("../smart-policies/smart-policies.module");
const settings_module_1 = require("../settings/settings.module");
const timezone_service_1 = require("../../common/services/timezone.service");
let AttendanceModule = class AttendanceModule {
};
exports.AttendanceModule = AttendanceModule;
exports.AttendanceModule = AttendanceModule = __decorate([
    (0, common_1.Module)({
        imports: [notifications_module_1.NotificationsModule, permissions_module_1.PermissionsModule, (0, common_1.forwardRef)(() => smart_policies_module_1.SmartPoliciesModule), settings_module_1.SettingsModule],
        controllers: [attendance_controller_1.AttendanceController],
        providers: [attendance_service_1.AttendanceService, geofence_service_1.GeofenceService, timezone_service_1.TimezoneService],
        exports: [attendance_service_1.AttendanceService, geofence_service_1.GeofenceService],
    })
], AttendanceModule);
//# sourceMappingURL=attendance.module.js.map