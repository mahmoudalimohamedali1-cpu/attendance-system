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
exports.WpsTrackingController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const permission_guard_1 = require("../auth/guards/permission.guard");
const require_permission_decorator_1 = require("../auth/decorators/require-permission.decorator");
const wps_tracking_service_1 = require("./wps-tracking.service");
let WpsTrackingController = class WpsTrackingController {
    constructor(wpsTrackingService) {
        this.wpsTrackingService = wpsTrackingService;
    }
    create(dto, req) {
        return this.wpsTrackingService.createSubmission(dto, req.user.companyId, req.user.id);
    }
    findAll(req, status) {
        return this.wpsTrackingService.findAll(req.user.companyId, status);
    }
    getStats(req, year) {
        return this.wpsTrackingService.getStats(req.user.companyId, year ? parseInt(year) : undefined);
    }
    findByRun(runId, req) {
        return this.wpsTrackingService.findByPayrollRun(runId, req.user.companyId);
    }
    findOne(id, req) {
        return this.wpsTrackingService.findOne(id, req.user.companyId);
    }
    updateStatus(id, dto, req) {
        return this.wpsTrackingService.updateStatus(id, dto, req.user.companyId, req.user.id);
    }
    approveProcessing(id, dto, req) {
        return this.wpsTrackingService.updateStatus(id, { ...dto, status: 'PROCESSED' }, req.user.companyId, req.user.id);
    }
    markDownloaded(id, req) {
        return this.wpsTrackingService.markAsDownloaded(id, req.user.companyId);
    }
};
exports.WpsTrackingController = WpsTrackingController;
__decorate([
    (0, common_1.Post)(),
    (0, require_permission_decorator_1.RequirePermission)('WPS_GENERATE'),
    (0, swagger_1.ApiOperation)({ summary: 'إنشاء سجل تتبع WPS' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], WpsTrackingController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, require_permission_decorator_1.RequirePermission)('WPS_VIEW'),
    (0, swagger_1.ApiOperation)({ summary: 'جلب جميع ملفات WPS' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], WpsTrackingController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, require_permission_decorator_1.RequirePermission)('WPS_VIEW'),
    (0, swagger_1.ApiOperation)({ summary: 'إحصائيات WPS' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], WpsTrackingController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('by-run/:runId'),
    (0, require_permission_decorator_1.RequirePermission)('WPS_VIEW'),
    (0, swagger_1.ApiOperation)({ summary: 'جلب ملفات WPS لمسيرة معينة' }),
    __param(0, (0, common_1.Param)('runId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], WpsTrackingController.prototype, "findByRun", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, require_permission_decorator_1.RequirePermission)('WPS_VIEW'),
    (0, swagger_1.ApiOperation)({ summary: 'جلب سجل WPS محدد' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], WpsTrackingController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id/status'),
    (0, require_permission_decorator_1.RequirePermission)('WPS_SUBMIT'),
    (0, swagger_1.ApiOperation)({ summary: 'تحديث حالة WPS' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], WpsTrackingController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Put)(':id/approve'),
    (0, require_permission_decorator_1.RequirePermission)('WPS_APPROVE'),
    (0, swagger_1.ApiOperation)({ summary: 'تأكيد معالجة WPS' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], WpsTrackingController.prototype, "approveProcessing", null);
__decorate([
    (0, common_1.Put)(':id/downloaded'),
    (0, require_permission_decorator_1.RequirePermission)('WPS_VIEW'),
    (0, swagger_1.ApiOperation)({ summary: 'تسجيل تحميل الملف' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], WpsTrackingController.prototype, "markDownloaded", null);
exports.WpsTrackingController = WpsTrackingController = __decorate([
    (0, swagger_1.ApiTags)('WPS Tracking'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permission_guard_1.PermissionGuard),
    (0, common_1.Controller)('wps-tracking'),
    __metadata("design:paramtypes", [wps_tracking_service_1.WpsTrackingService])
], WpsTrackingController);
//# sourceMappingURL=wps-tracking.controller.js.map