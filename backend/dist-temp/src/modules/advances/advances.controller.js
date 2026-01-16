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
exports.AdvancesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const advances_service_1 = require("./advances.service");
const common_2 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_2 = require("@nestjs/swagger");
const upload_service_1 = require("../../common/upload/upload.service");
const advance_request_dto_1 = require("./dto/advance-request.dto");
let AdvancesController = class AdvancesController {
    constructor(advancesService, uploadService) {
        this.advancesService = advancesService;
        this.uploadService = uploadService;
    }
    async uploadAttachments(files) {
        const uploadedFiles = await this.uploadService.uploadAdvanceAttachments(files);
        return {
            message: 'تم رفع الملفات بنجاح',
            files: uploadedFiles,
        };
    }
    async createRequest(req, dto) {
        return this.advancesService.createAdvanceRequest(req.user.id, req['tenantId'], dto);
    }
    async getMyRequests(req) {
        return this.advancesService.getMyRequests(req.user.id, req['tenantId']);
    }
    async getManagerInbox(req) {
        return this.advancesService.getManagerInbox(req.user.id, req.user.companyId);
    }
    async managerDecision(id, req, dto) {
        return this.advancesService.managerDecision(id, req['tenantId'], req.user.id, dto);
    }
    async getHRInbox(req) {
        return this.advancesService.getHRInbox(req.user.id, req.user.companyId);
    }
    async hrDecision(id, req, dto) {
        return this.advancesService.hrDecision(id, req['tenantId'], req.user.id, dto);
    }
    async getFinanceInbox(req) {
        return this.advancesService.getFinanceInbox(req.user.id, req.user.companyId);
    }
    async financeDecision(id, req, dto) {
        return this.advancesService.financeDecision(id, req['tenantId'], req.user.id, dto);
    }
    async getCEOInbox(req) {
        return this.advancesService.getCEOInbox(req.user.id, req.user.companyId);
    }
    async ceoDecision(id, req, dto) {
        return this.advancesService.ceoDecision(id, req['tenantId'], req.user.id, dto);
    }
    async getRequestDetails(id, req) {
        return this.advancesService.getRequestDetails(id, req['tenantId']);
    }
    async getEmployeePreviousAdvances(employeeId, req) {
        return this.advancesService.getEmployeePreviousAdvances(employeeId, req['tenantId']);
    }
};
exports.AdvancesController = AdvancesController;
__decorate([
    (0, common_1.Post)('upload-attachments'),
    (0, swagger_1.ApiOperation)({ summary: 'رفع مرفقات طلب السلفة' }),
    (0, swagger_2.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'تم رفع الملفات بنجاح' }),
    (0, common_2.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files', 5, {
        limits: { fileSize: 10 * 1024 * 1024 }
    })),
    __param(0, (0, common_2.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], AdvancesController.prototype, "uploadAttachments", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'تقديم طلب سلفة جديد' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'تم إنشاء الطلب' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, advance_request_dto_1.CreateAdvanceRequestDto]),
    __metadata("design:returntype", Promise)
], AdvancesController.prototype, "createRequest", null);
__decorate([
    (0, common_1.Get)('my'),
    (0, swagger_1.ApiOperation)({ summary: 'طلبات السلف الخاصة بي' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة الطلبات' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdvancesController.prototype, "getMyRequests", null);
__decorate([
    (0, common_1.Get)('inbox/manager'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'صندوق الوارد للمدير' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة الطلبات المعلقة' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdvancesController.prototype, "getManagerInbox", null);
__decorate([
    (0, common_1.Post)(':id/manager-decision'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'قرار المدير' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم تسجيل القرار' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, advance_request_dto_1.ManagerDecisionDto]),
    __metadata("design:returntype", Promise)
], AdvancesController.prototype, "managerDecision", null);
__decorate([
    (0, common_1.Get)('inbox/hr'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'صندوق الوارد لـ HR' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة الطلبات المعلقة' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdvancesController.prototype, "getHRInbox", null);
__decorate([
    (0, common_1.Post)(':id/hr-decision'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'قرار HR' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم تسجيل القرار' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, advance_request_dto_1.HrDecisionDto]),
    __metadata("design:returntype", Promise)
], AdvancesController.prototype, "hrDecision", null);
__decorate([
    (0, common_1.Get)('inbox/finance'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'صندوق الوارد للمدير المالي' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة الطلبات المعلقة' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdvancesController.prototype, "getFinanceInbox", null);
__decorate([
    (0, common_1.Post)(':id/finance-decision'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'قرار المدير المالي' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم تسجيل القرار' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdvancesController.prototype, "financeDecision", null);
__decorate([
    (0, common_1.Get)('inbox/ceo'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'صندوق الوارد للمدير العام' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة الطلبات المعلقة' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdvancesController.prototype, "getCEOInbox", null);
__decorate([
    (0, common_1.Post)(':id/ceo-decision'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'قرار المدير العام' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم تسجيل القرار' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdvancesController.prototype, "ceoDecision", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'تفاصيل طلب سلفة' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تفاصيل الطلب' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdvancesController.prototype, "getRequestDetails", null);
__decorate([
    (0, common_1.Get)('employee/:employeeId/history'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'السلف السابقة لموظف' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة السلف السابقة' }),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdvancesController.prototype, "getEmployeePreviousAdvances", null);
exports.AdvancesController = AdvancesController = __decorate([
    (0, swagger_1.ApiTags)('Advances - السلف'),
    (0, common_1.Controller)('advances'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [advances_service_1.AdvancesService,
        upload_service_1.UploadService])
], AdvancesController);
//# sourceMappingURL=advances.controller.js.map