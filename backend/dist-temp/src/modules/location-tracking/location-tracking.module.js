"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationTrackingModule = void 0;
const common_1 = require("@nestjs/common");
const location_tracking_controller_1 = require("./location-tracking.controller");
const location_tracking_service_1 = require("./location-tracking.service");
const location_tracking_gateway_1 = require("./location-tracking.gateway");
const location_reports_service_1 = require("./location-reports.service");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const attendance_module_1 = require("../attendance/attendance.module");
const notifications_module_1 = require("../notifications/notifications.module");
const permissions_module_1 = require("../permissions/permissions.module");
const geofence_service_1 = require("../attendance/services/geofence.service");
let LocationTrackingModule = class LocationTrackingModule {
};
exports.LocationTrackingModule = LocationTrackingModule;
exports.LocationTrackingModule = LocationTrackingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            (0, common_1.forwardRef)(() => attendance_module_1.AttendanceModule),
            notifications_module_1.NotificationsModule,
            permissions_module_1.PermissionsModule,
        ],
        controllers: [location_tracking_controller_1.LocationTrackingController],
        providers: [
            location_tracking_service_1.LocationTrackingService,
            location_tracking_gateway_1.LocationTrackingGateway,
            location_reports_service_1.LocationReportsService,
            prisma_service_1.PrismaService,
            geofence_service_1.GeofenceService,
        ],
        exports: [location_tracking_service_1.LocationTrackingService, location_tracking_gateway_1.LocationTrackingGateway, location_reports_service_1.LocationReportsService],
    })
], LocationTrackingModule);
//# sourceMappingURL=location-tracking.module.js.map