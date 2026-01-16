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
exports.MudadController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const permission_guard_1 = require("../auth/guards/permission.guard");
const require_permission_decorator_1 = require("../auth/decorators/require-permission.decorator");
const mudad_service_1 = require("./mudad.service");
let MudadController = class MudadController {
    constructor(mudadService) {
        this.mudadService = mudadService;
    }
    create(dto, req) {
        return this.mudadService.createSubmission(dto, req.user.companyId, req.user.id);
    }
    findAll(req, year) {
        return this.mudadService.findAll(req.user.companyId, year ? parseInt(year) : undefined);
    }
    getStats(req, year) {
        const y = year ? parseInt(year) : new Date().getFullYear();
        return this.mudadService.getStats(req.user.companyId, y);
    }
    findOne(id, req) {
        return this.mudadService.findOne(id, req.user.companyId);
    }
    updateStatus(id, dto, req) {
        return this.mudadService.updateStatus(id, dto, req.user.companyId, req.user.id);
    }
    acceptSubmission(id, dto, req) {
        return this.mudadService.updateStatus(id, { ...dto, status: 'ACCEPTED' }, req.user.companyId, req.user.id);
    }
    rejectSubmission(id, dto, req) {
        return this.mudadService.updateStatus(id, { ...dto, status: 'REJECTED' }, req.user.companyId, req.user.id);
    }
    attachWpsFile(id, dto, req) {
        return this.mudadService.attachWpsFile(id, dto.fileUrl, req.user.companyId, dto.fileHashSha256, req.user.id);
    }
    delete(id, req) {
        return this.mudadService.delete(id, req.user.companyId);
    }
};
exports.MudadController = MudadController;
__decorate([
    (0, common_1.Post)(),
    (0, require_permission_decorator_1.RequirePermission)('MUDAD_PREPARE'),
    (0, swagger_1.ApiOperation)({ summary: 'إنشاء سجل تقديم لمُدد' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MudadController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, require_permission_decorator_1.RequirePermission)('MUDAD_VIEW'),
    (0, swagger_1.ApiOperation)({ summary: 'جلب جميع تقديمات مُدد' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MudadController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, require_permission_decorator_1.RequirePermission)('MUDAD_VIEW'),
    (0, swagger_1.ApiOperation)({ summary: 'إحصائيات مُدد' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MudadController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, require_permission_decorator_1.RequirePermission)('MUDAD_VIEW'),
    (0, swagger_1.ApiOperation)({ summary: 'جلب تقديم محدد' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MudadController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id/status'),
    (0, require_permission_decorator_1.RequirePermission)('MUDAD_SUBMIT'),
    (0, swagger_1.ApiOperation)({ summary: 'تحديث حالة التقديم (تجهيز/رفع)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], MudadController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Put)(':id/accept'),
    (0, require_permission_decorator_1.RequirePermission)('MUDAD_ACCEPT'),
    (0, swagger_1.ApiOperation)({ summary: 'قبول تقديم مُدد' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], MudadController.prototype, "acceptSubmission", null);
__decorate([
    (0, common_1.Put)(':id/reject'),
    (0, require_permission_decorator_1.RequirePermission)('MUDAD_ACCEPT'),
    (0, swagger_1.ApiOperation)({ summary: 'رفض تقديم مُدد' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], MudadController.prototype, "rejectSubmission", null);
__decorate([
    (0, common_1.Put)(':id/attach-wps'),
    (0, require_permission_decorator_1.RequirePermission)('MUDAD_PREPARE'),
    (0, swagger_1.ApiOperation)({ summary: 'إرفاق ملف WPS' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], MudadController.prototype, "attachWpsFile", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, require_permission_decorator_1.RequirePermission)('MUDAD_ACCEPT'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف تقديم (فقط إذا كان PENDING)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MudadController.prototype, "delete", null);
exports.MudadController = MudadController = __decorate([
    (0, swagger_1.ApiTags)('مُدد - Mudad'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permission_guard_1.PermissionGuard),
    (0, common_1.Controller)('mudad'),
    __metadata("design:paramtypes", [mudad_service_1.MudadService])
], MudadController);
//# sourceMappingURL=mudad.controller.js.map