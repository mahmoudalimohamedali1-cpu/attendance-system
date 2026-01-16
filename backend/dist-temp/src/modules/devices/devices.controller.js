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
exports.DevicesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const devices_service_1 = require("./devices.service");
const register_device_dto_1 = require("./dto/register-device.dto");
const verify_device_dto_1 = require("./dto/verify-device.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const client_1 = require("@prisma/client");
let DevicesController = class DevicesController {
    constructor(devicesService) {
        this.devicesService = devicesService;
    }
    async registerDevice(req, data) {
        return this.devicesService.registerDevice(req.user.id, data);
    }
    async verifyDevice(req, data) {
        return this.devicesService.verifyDevice(req.user.id, data);
    }
    async getMyDevices(req) {
        return this.devicesService.getUserDevices(req.user.id);
    }
    async removeDevice(req, deviceId) {
        return this.devicesService.removeDevice(req.user.id, deviceId);
    }
    async setMainDevice(req, deviceId) {
        return this.devicesService.setMainDevice(req.user.id, deviceId);
    }
    async getPendingDevices() {
        return this.devicesService.getPendingDevices();
    }
    async getAllDevices(userId, status, branchId) {
        return this.devicesService.getAllDevices({ userId, status, branchId });
    }
    async getUserDevices(userId) {
        return this.devicesService.getUserDevices(userId);
    }
    async approveDevice(req, deviceId) {
        return this.devicesService.approveDevice(deviceId, req.user.id);
    }
    async blockDevice(req, deviceId, reason) {
        return this.devicesService.blockDevice(deviceId, req.user.id, reason);
    }
    async getAccessLogs(userId, deviceId, limit) {
        return this.devicesService.getAccessLogs({
            userId,
            deviceId,
            limit: limit ? parseInt(limit) : 100,
        });
    }
};
exports.DevicesController = DevicesController;
__decorate([
    (0, common_1.Post)('register'),
    (0, swagger_1.ApiOperation)({ summary: 'تسجيل جهاز جديد' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'تم تسجيل الجهاز' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, register_device_dto_1.RegisterDeviceDto]),
    __metadata("design:returntype", Promise)
], DevicesController.prototype, "registerDevice", null);
__decorate([
    (0, common_1.Post)('verify'),
    (0, swagger_1.ApiOperation)({ summary: 'التحقق من الجهاز قبل تسجيل الحضور' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'نتيجة التحقق' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, verify_device_dto_1.VerifyDeviceDto]),
    __metadata("design:returntype", Promise)
], DevicesController.prototype, "verifyDevice", null);
__decorate([
    (0, common_1.Get)('my-devices'),
    (0, swagger_1.ApiOperation)({ summary: 'قائمة أجهزتي المسجلة' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة الأجهزة' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DevicesController.prototype, "getMyDevices", null);
__decorate([
    (0, common_1.Delete)(':deviceId'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف جهاز' }),
    (0, swagger_1.ApiParam)({ name: 'deviceId', description: 'معرف الجهاز' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم الحذف' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('deviceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DevicesController.prototype, "removeDevice", null);
__decorate([
    (0, common_1.Patch)(':deviceId/set-main'),
    (0, swagger_1.ApiOperation)({ summary: 'تعيين جهاز كرئيسي' }),
    (0, swagger_1.ApiParam)({ name: 'deviceId', description: 'معرف الجهاز' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم التعيين' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('deviceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DevicesController.prototype, "setMainDevice", null);
__decorate([
    (0, common_1.Get)('admin/pending'),
    (0, roles_decorator_1.Roles)('ADMIN', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'الأجهزة المعلقة في انتظار الموافقة' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة الأجهزة المعلقة' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DevicesController.prototype, "getPendingDevices", null);
__decorate([
    (0, common_1.Get)('admin/all'),
    (0, roles_decorator_1.Roles)('ADMIN', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'جميع الأجهزة المسجلة' }),
    (0, swagger_1.ApiQuery)({ name: 'userId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, enum: client_1.DeviceStatus }),
    (0, swagger_1.ApiQuery)({ name: 'branchId', required: false }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة الأجهزة' }),
    __param(0, (0, common_1.Query)('userId')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('branchId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], DevicesController.prototype, "getAllDevices", null);
__decorate([
    (0, common_1.Get)('admin/user/:userId'),
    (0, roles_decorator_1.Roles)('ADMIN', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'أجهزة موظف محدد' }),
    (0, swagger_1.ApiParam)({ name: 'userId', description: 'معرف المستخدم' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة الأجهزة' }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DevicesController.prototype, "getUserDevices", null);
__decorate([
    (0, common_1.Patch)('admin/:deviceId/approve'),
    (0, roles_decorator_1.Roles)('ADMIN', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'الموافقة على جهاز' }),
    (0, swagger_1.ApiParam)({ name: 'deviceId', description: 'معرف الجهاز' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تمت الموافقة' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('deviceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DevicesController.prototype, "approveDevice", null);
__decorate([
    (0, common_1.Patch)('admin/:deviceId/block'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'حظر جهاز' }),
    (0, swagger_1.ApiParam)({ name: 'deviceId', description: 'معرف الجهاز' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم الحظر' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('deviceId')),
    __param(2, (0, common_1.Body)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], DevicesController.prototype, "blockDevice", null);
__decorate([
    (0, common_1.Get)('admin/logs'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'سجل محاولات الوصول' }),
    (0, swagger_1.ApiQuery)({ name: 'userId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'deviceId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'سجل المحاولات' }),
    __param(0, (0, common_1.Query)('userId')),
    __param(1, (0, common_1.Query)('deviceId')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], DevicesController.prototype, "getAccessLogs", null);
exports.DevicesController = DevicesController = __decorate([
    (0, swagger_1.ApiTags)('devices'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('devices'),
    __metadata("design:paramtypes", [devices_service_1.DevicesService])
], DevicesController);
//# sourceMappingURL=devices.controller.js.map