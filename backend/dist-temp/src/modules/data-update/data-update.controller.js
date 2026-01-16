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
exports.DataUpdateController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const data_update_service_1 = require("./data-update.service");
const create_update_request_dto_1 = require("./dto/create-update-request.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const client_1 = require("@prisma/client");
let DataUpdateController = class DataUpdateController {
    constructor(dataUpdateService) {
        this.dataUpdateService = dataUpdateService;
    }
    async createRequest(req, data) {
        return this.dataUpdateService.createUpdateRequest(req.user.id, data);
    }
    async getMyRequests(req) {
        return this.dataUpdateService.getMyRequests(req.user.id);
    }
    async cancelRequest(req, requestId) {
        return this.dataUpdateService.cancelRequest(req.user.id, requestId);
    }
    async getPendingRequests() {
        return this.dataUpdateService.getPendingRequests();
    }
    async getAllRequests(status, userId, requestType, page, limit) {
        return this.dataUpdateService.getAllRequests({
            status,
            userId,
            requestType,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
        });
    }
    async getRequestDetails(requestId) {
        return this.dataUpdateService.getRequestDetails(requestId);
    }
    async approveRequest(req, requestId, note) {
        return this.dataUpdateService.approveRequest(requestId, req.user.id, note);
    }
    async rejectRequest(req, requestId, reason) {
        return this.dataUpdateService.rejectRequest(requestId, req.user.id, reason);
    }
};
exports.DataUpdateController = DataUpdateController;
__decorate([
    (0, common_1.Post)('request'),
    (0, swagger_1.ApiOperation)({ summary: 'إنشاء طلب تحديث بيانات (وجه / جهاز / كلاهما)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'تم إرسال الطلب' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'يوجد طلب معلق سابق' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_update_request_dto_1.CreateUpdateRequestDto]),
    __metadata("design:returntype", Promise)
], DataUpdateController.prototype, "createRequest", null);
__decorate([
    (0, common_1.Get)('my-requests'),
    (0, swagger_1.ApiOperation)({ summary: 'قائمة طلباتي' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة الطلبات' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DataUpdateController.prototype, "getMyRequests", null);
__decorate([
    (0, common_1.Patch)('cancel/:requestId'),
    (0, swagger_1.ApiOperation)({ summary: 'إلغاء طلب معلق' }),
    (0, swagger_1.ApiParam)({ name: 'requestId', description: 'معرف الطلب' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم الإلغاء' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('requestId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DataUpdateController.prototype, "cancelRequest", null);
__decorate([
    (0, common_1.Get)('admin/pending'),
    (0, roles_decorator_1.Roles)('ADMIN', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'طلبات التحديث المعلقة' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة الطلبات المعلقة' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DataUpdateController.prototype, "getPendingRequests", null);
__decorate([
    (0, common_1.Get)('admin/all'),
    (0, roles_decorator_1.Roles)('ADMIN', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'جميع طلبات التحديث مع فلترة' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, enum: client_1.UpdateRequestStatus }),
    (0, swagger_1.ApiQuery)({ name: 'userId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'requestType', required: false, enum: create_update_request_dto_1.UpdateRequestType }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة الطلبات' }),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('userId')),
    __param(2, (0, common_1.Query)('requestType')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], DataUpdateController.prototype, "getAllRequests", null);
__decorate([
    (0, common_1.Get)('admin/:requestId'),
    (0, roles_decorator_1.Roles)('ADMIN', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'تفاصيل طلب تحديث مع بيانات المستخدم' }),
    (0, swagger_1.ApiParam)({ name: 'requestId', description: 'معرف الطلب' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تفاصيل الطلب' }),
    __param(0, (0, common_1.Param)('requestId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DataUpdateController.prototype, "getRequestDetails", null);
__decorate([
    (0, common_1.Patch)('admin/:requestId/approve'),
    (0, roles_decorator_1.Roles)('ADMIN', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'الموافقة على طلب التحديث' }),
    (0, swagger_1.ApiParam)({ name: 'requestId', description: 'معرف الطلب' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تمت الموافقة' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('requestId')),
    __param(2, (0, common_1.Body)('note')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], DataUpdateController.prototype, "approveRequest", null);
__decorate([
    (0, common_1.Patch)('admin/:requestId/reject'),
    (0, roles_decorator_1.Roles)('ADMIN', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'رفض طلب التحديث' }),
    (0, swagger_1.ApiParam)({ name: 'requestId', description: 'معرف الطلب' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم الرفض' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('requestId')),
    __param(2, (0, common_1.Body)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], DataUpdateController.prototype, "rejectRequest", null);
exports.DataUpdateController = DataUpdateController = __decorate([
    (0, swagger_1.ApiTags)('data-update'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('data-update'),
    __metadata("design:paramtypes", [data_update_service_1.DataUpdateService])
], DataUpdateController);
//# sourceMappingURL=data-update.controller.js.map