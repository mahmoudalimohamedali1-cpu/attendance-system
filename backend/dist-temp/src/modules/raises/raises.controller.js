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
exports.RaisesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
const raises_service_1 = require("./raises.service");
const create_raise_request_dto_1 = require("./dto/create-raise-request.dto");
const raise_decision_dto_1 = require("./dto/raise-decision.dto");
const platform_express_1 = require("@nestjs/platform-express");
const upload_service_1 = require("../../common/upload/upload.service");
const tenant_id_decorator_1 = require("../auth/decorators/tenant-id.decorator");
let RaisesController = class RaisesController {
    constructor(raisesService, uploadService) {
        this.raisesService = raisesService;
        this.uploadService = uploadService;
    }
    async uploadAttachments(files) {
        const uploadedFiles = await this.uploadService.uploadRaiseAttachments(files);
        return {
            message: 'تم رفع الملفات بنجاح',
            files: uploadedFiles,
        };
    }
    async createRaiseRequest(userId, companyId, createRaiseDto) {
        return this.raisesService.createRaiseRequest(userId, companyId, createRaiseDto);
    }
    async getMyRaiseRequests(userId, companyId) {
        return this.raisesService.getMyRaiseRequests(userId, companyId);
    }
    async getStats(userId, companyId) {
        return this.raisesService.getRaiseStats(companyId, userId);
    }
    async getRaiseRequestById(id, userId, companyId) {
        return this.raisesService.getRaiseRequestById(id, userId, companyId);
    }
    async cancelRaiseRequest(id, userId, companyId) {
        return this.raisesService.cancelRaiseRequest(id, userId, companyId);
    }
    async getManagerInbox(managerId, companyId) {
        return this.raisesService.getManagerInbox(managerId, companyId);
    }
    async managerDecision(id, managerId, companyId, dto) {
        return this.raisesService.managerDecision(id, companyId, managerId, dto);
    }
    async getHRInbox(hrUserId, companyId) {
        return this.raisesService.getHRInbox(hrUserId, companyId);
    }
    async hrDecision(id, hrUserId, companyId, dto) {
        return this.raisesService.hrDecision(id, companyId, hrUserId, dto);
    }
    async getFinanceInbox(financeUserId, companyId) {
        return this.raisesService.getFinanceInbox(financeUserId, companyId);
    }
    async financeDecision(id, financeUserId, companyId, dto) {
        return this.raisesService.financeDecision(id, companyId, financeUserId, dto);
    }
    async getCEOInbox(ceoUserId, companyId) {
        return this.raisesService.getCEOInbox(ceoUserId, companyId);
    }
    async ceoDecision(id, ceoUserId, companyId, dto) {
        return this.raisesService.ceoDecision(id, companyId, ceoUserId, dto);
    }
    async getAllRaiseRequests(companyId, status) {
        return this.raisesService.getAllRaiseRequests(companyId, status);
    }
};
exports.RaisesController = RaisesController;
__decorate([
    (0, common_1.Post)('upload-attachments'),
    (0, swagger_1.ApiOperation)({ summary: 'رفع مرفقات طلب الزيادة' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'تم رفع الملفات بنجاح' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files', 5, {
        limits: { fileSize: 10 * 1024 * 1024 }
    })),
    __param(0, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], RaisesController.prototype, "uploadAttachments", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'إنشاء طلب زيادة' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'تم إنشاء الطلب بنجاح' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, tenant_id_decorator_1.TenantId)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, create_raise_request_dto_1.CreateRaiseRequestDto]),
    __metadata("design:returntype", Promise)
], RaisesController.prototype, "createRaiseRequest", null);
__decorate([
    (0, common_1.Get)('my'),
    (0, swagger_1.ApiOperation)({ summary: 'طلبات الزيادة الخاصة بي' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة طلبات الزيادة' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RaisesController.prototype, "getMyRaiseRequests", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'إحصائيات طلبات الزيادة' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RaisesController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'تفاصيل طلب الزيادة' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], RaisesController.prototype, "getRaiseRequestById", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, swagger_1.ApiOperation)({ summary: 'إلغاء طلب الزيادة' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], RaisesController.prototype, "cancelRaiseRequest", null);
__decorate([
    (0, common_1.Get)('inbox/manager'),
    (0, swagger_1.ApiOperation)({ summary: 'صندوق وارد المدير' }),
    (0, roles_decorator_1.Roles)(client_1.Role.MANAGER, client_1.Role.ADMIN),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RaisesController.prototype, "getManagerInbox", null);
__decorate([
    (0, common_1.Post)(':id/manager-decision'),
    (0, swagger_1.ApiOperation)({ summary: 'قرار المدير على طلب الزيادة' }),
    (0, roles_decorator_1.Roles)(client_1.Role.MANAGER, client_1.Role.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, tenant_id_decorator_1.TenantId)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, raise_decision_dto_1.ManagerDecisionDto]),
    __metadata("design:returntype", Promise)
], RaisesController.prototype, "managerDecision", null);
__decorate([
    (0, common_1.Get)('inbox/hr'),
    (0, swagger_1.ApiOperation)({ summary: 'صندوق وارد HR' }),
    (0, roles_decorator_1.Roles)(client_1.Role.MANAGER, client_1.Role.ADMIN),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RaisesController.prototype, "getHRInbox", null);
__decorate([
    (0, common_1.Post)(':id/hr-decision'),
    (0, swagger_1.ApiOperation)({ summary: 'قرار HR على طلب الزيادة' }),
    (0, roles_decorator_1.Roles)(client_1.Role.MANAGER, client_1.Role.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, tenant_id_decorator_1.TenantId)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, raise_decision_dto_1.HRDecisionDto]),
    __metadata("design:returntype", Promise)
], RaisesController.prototype, "hrDecision", null);
__decorate([
    (0, common_1.Get)('inbox/finance'),
    (0, swagger_1.ApiOperation)({ summary: 'صندوق وارد المدير المالي' }),
    (0, roles_decorator_1.Roles)(client_1.Role.MANAGER, client_1.Role.ADMIN),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RaisesController.prototype, "getFinanceInbox", null);
__decorate([
    (0, common_1.Post)(':id/finance-decision'),
    (0, swagger_1.ApiOperation)({ summary: 'قرار المدير المالي على طلب الزيادة' }),
    (0, roles_decorator_1.Roles)(client_1.Role.MANAGER, client_1.Role.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, tenant_id_decorator_1.TenantId)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], RaisesController.prototype, "financeDecision", null);
__decorate([
    (0, common_1.Get)('inbox/ceo'),
    (0, swagger_1.ApiOperation)({ summary: 'صندوق وارد المدير العام' }),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RaisesController.prototype, "getCEOInbox", null);
__decorate([
    (0, common_1.Post)(':id/ceo-decision'),
    (0, swagger_1.ApiOperation)({ summary: 'قرار المدير العام على طلب الزيادة' }),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, tenant_id_decorator_1.TenantId)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], RaisesController.prototype, "ceoDecision", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'جميع طلبات الزيادة' }),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, tenant_id_decorator_1.TenantId)()),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RaisesController.prototype, "getAllRaiseRequests", null);
exports.RaisesController = RaisesController = __decorate([
    (0, swagger_1.ApiTags)('raises'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('raises'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [raises_service_1.RaisesService,
        upload_service_1.UploadService])
], RaisesController);
//# sourceMappingURL=raises.controller.js.map