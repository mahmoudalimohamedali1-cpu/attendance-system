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
exports.LocationTrackingController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const location_tracking_service_1 = require("./location-tracking.service");
const location_reports_service_1 = require("./location-reports.service");
const location_tracking_dto_1 = require("./dto/location-tracking.dto");
let LocationTrackingController = class LocationTrackingController {
    constructor(locationTrackingService, reportsService) {
        this.locationTrackingService = locationTrackingService;
        this.reportsService = reportsService;
    }
    async updateLocation(req, dto) {
        const userId = req.user.sub || req.user.id;
        return this.locationTrackingService.updateLocation(userId, dto);
    }
    async getActiveEmployees(req) {
        const companyId = req.user.companyId;
        return this.locationTrackingService.getActiveEmployees(companyId);
    }
    async getExitSummary(req, startDate, endDate) {
        const companyId = req.user.companyId;
        return this.reportsService.getExitSummary(companyId, new Date(startDate), new Date(endDate));
    }
    async getDailyReport(req, startDate, endDate) {
        const companyId = req.user.companyId;
        return this.reportsService.getDailyExitReport(companyId, new Date(startDate), new Date(endDate));
    }
    async getAllEmployeesStats(req, startDate, endDate) {
        const companyId = req.user.companyId;
        return this.reportsService.getAllEmployeesExitStats(companyId, new Date(startDate), new Date(endDate));
    }
    async getEmployeeReport(req, userId, startDate, endDate) {
        const companyId = req.user.companyId;
        return this.reportsService.getEmployeeExitDetail(companyId, userId, new Date(startDate), new Date(endDate));
    }
    async getEmployeeLocation(req, targetUserId) {
        const requesterId = req.user.sub || req.user.id;
        const companyId = req.user.companyId;
        return this.locationTrackingService.getEmployeeLocation(requesterId, targetUserId, companyId);
    }
    async getLocationHistory(req, targetUserId, query) {
        const requesterId = req.user.sub || req.user.id;
        const companyId = req.user.companyId;
        return this.locationTrackingService.getLocationHistory(requesterId, targetUserId, companyId, query);
    }
    async getExitEvents(req, targetUserId, dateStr) {
        const requesterId = req.user.sub || req.user.id;
        const companyId = req.user.companyId;
        const date = dateStr ? new Date(dateStr) : undefined;
        return this.locationTrackingService.getExitEvents(requesterId, targetUserId, companyId, date);
    }
};
exports.LocationTrackingController = LocationTrackingController;
__decorate([
    (0, common_1.Post)('update'),
    (0, swagger_1.ApiOperation)({ summary: 'تحديث موقع الموظف (من التطبيق)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم تحديث الموقع بنجاح' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, location_tracking_dto_1.UpdateLocationDto]),
    __metadata("design:returntype", Promise)
], LocationTrackingController.prototype, "updateLocation", null);
__decorate([
    (0, common_1.Get)('active'),
    (0, swagger_1.ApiOperation)({ summary: 'قائمة الموظفين الحاضرين (للمسؤولين)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة الموظفين النشطين' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LocationTrackingController.prototype, "getActiveEmployees", null);
__decorate([
    (0, common_1.Get)('reports/summary'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'ملخص تقارير الخروج' }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: true, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: true, type: String }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], LocationTrackingController.prototype, "getExitSummary", null);
__decorate([
    (0, common_1.Get)('reports/daily'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'التقرير اليومي للخروج' }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: true, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: true, type: String }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], LocationTrackingController.prototype, "getDailyReport", null);
__decorate([
    (0, common_1.Get)('reports/employees'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'إحصائيات جميع الموظفين' }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: true, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: true, type: String }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], LocationTrackingController.prototype, "getAllEmployeesStats", null);
__decorate([
    (0, common_1.Get)('reports/employee/:userId'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'تقرير تفصيلي لموظف' }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: true, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: true, type: String }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], LocationTrackingController.prototype, "getEmployeeReport", null);
__decorate([
    (0, common_1.Get)(':userId'),
    (0, swagger_1.ApiOperation)({ summary: 'موقع موظف معين (للمسؤولين)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'آخر موقع للموظف' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LocationTrackingController.prototype, "getEmployeeLocation", null);
__decorate([
    (0, common_1.Get)(':userId/history'),
    (0, swagger_1.ApiOperation)({ summary: 'سجل المواقع لموظف' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'سجل المواقع' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, location_tracking_dto_1.LocationHistoryQueryDto]),
    __metadata("design:returntype", Promise)
], LocationTrackingController.prototype, "getLocationHistory", null);
__decorate([
    (0, common_1.Get)(':userId/exit-events'),
    (0, swagger_1.ApiOperation)({ summary: 'أحداث الخروج من النطاق لموظف' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة أحداث الخروج' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], LocationTrackingController.prototype, "getExitEvents", null);
exports.LocationTrackingController = LocationTrackingController = __decorate([
    (0, swagger_1.ApiTags)('Location Tracking - تتبع الموقع'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('location-tracking'),
    __metadata("design:paramtypes", [location_tracking_service_1.LocationTrackingService,
        location_reports_service_1.LocationReportsService])
], LocationTrackingController);
//# sourceMappingURL=location-tracking.controller.js.map