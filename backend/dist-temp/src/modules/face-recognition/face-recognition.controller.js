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
exports.FaceRecognitionController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const face_recognition_service_1 = require("./face-recognition.service");
const register_face_dto_1 = require("./dto/register-face.dto");
const verify_face_dto_1 = require("./dto/verify-face.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let FaceRecognitionController = class FaceRecognitionController {
    constructor(faceRecognitionService) {
        this.faceRecognitionService = faceRecognitionService;
    }
    async registerMyFace(req, data) {
        return this.faceRecognitionService.registerFace(req.user.id, data);
    }
    async verifyMyFace(req, data) {
        return this.faceRecognitionService.verifyFace(req.user.id, data);
    }
    async getMyFaceStatus(req) {
        return this.faceRecognitionService.getFaceStatus(req.user.id);
    }
    async deleteMyFace(req) {
        return this.faceRecognitionService.deleteFaceData(req.user.id);
    }
    async registerUserFace(userId, data) {
        return this.faceRecognitionService.registerFace(userId, data);
    }
    async verifyUserFace(userId, data) {
        return this.faceRecognitionService.verifyFace(userId, data);
    }
    async getUserFaceStatus(userId) {
        return this.faceRecognitionService.getFaceStatus(userId);
    }
    async deleteUserFace(userId) {
        return this.faceRecognitionService.deleteFaceData(userId);
    }
    async getUsersFaceStatus(branchId, departmentId) {
        return this.faceRecognitionService.getUsersFaceStatus(branchId, departmentId);
    }
    async getVerificationLogs(userId, limit) {
        return this.faceRecognitionService.getVerificationLogs(userId, limit ? parseInt(limit) : 50);
    }
};
exports.FaceRecognitionController = FaceRecognitionController;
__decorate([
    (0, common_1.Post)('register'),
    (0, swagger_1.ApiOperation)({ summary: 'تسجيل وجه المستخدم الحالي' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'تم تسجيل الوجه بنجاح' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'بيانات غير صالحة' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, register_face_dto_1.RegisterFaceDto]),
    __metadata("design:returntype", Promise)
], FaceRecognitionController.prototype, "registerMyFace", null);
__decorate([
    (0, common_1.Post)('verify'),
    (0, swagger_1.ApiOperation)({ summary: 'التحقق من وجه المستخدم الحالي' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'نتيجة التحقق' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, verify_face_dto_1.VerifyFaceDto]),
    __metadata("design:returntype", Promise)
], FaceRecognitionController.prototype, "verifyMyFace", null);
__decorate([
    (0, common_1.Get)('status'),
    (0, swagger_1.ApiOperation)({ summary: 'حالة تسجيل وجه المستخدم الحالي' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'حالة التسجيل' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FaceRecognitionController.prototype, "getMyFaceStatus", null);
__decorate([
    (0, common_1.Delete)('my-face'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف بيانات وجه المستخدم الحالي' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم الحذف بنجاح' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FaceRecognitionController.prototype, "deleteMyFace", null);
__decorate([
    (0, common_1.Post)('admin/register/:userId'),
    (0, roles_decorator_1.Roles)('ADMIN', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'تسجيل وجه موظف (للمسؤول)' }),
    (0, swagger_1.ApiParam)({ name: 'userId', description: 'معرف المستخدم' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'تم تسجيل الوجه بنجاح' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, register_face_dto_1.RegisterFaceDto]),
    __metadata("design:returntype", Promise)
], FaceRecognitionController.prototype, "registerUserFace", null);
__decorate([
    (0, common_1.Post)('admin/verify/:userId'),
    (0, roles_decorator_1.Roles)('ADMIN', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'التحقق من وجه موظف (للمسؤول)' }),
    (0, swagger_1.ApiParam)({ name: 'userId', description: 'معرف المستخدم' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'نتيجة التحقق' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, verify_face_dto_1.VerifyFaceDto]),
    __metadata("design:returntype", Promise)
], FaceRecognitionController.prototype, "verifyUserFace", null);
__decorate([
    (0, common_1.Get)('admin/status/:userId'),
    (0, roles_decorator_1.Roles)('ADMIN', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'حالة تسجيل وجه موظف (للمسؤول)' }),
    (0, swagger_1.ApiParam)({ name: 'userId', description: 'معرف المستخدم' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'حالة التسجيل' }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FaceRecognitionController.prototype, "getUserFaceStatus", null);
__decorate([
    (0, common_1.Delete)('admin/:userId'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف بيانات وجه موظف (للمسؤول)' }),
    (0, swagger_1.ApiParam)({ name: 'userId', description: 'معرف المستخدم' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم الحذف بنجاح' }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FaceRecognitionController.prototype, "deleteUserFace", null);
__decorate([
    (0, common_1.Get)('admin/users'),
    (0, roles_decorator_1.Roles)('ADMIN', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'قائمة الموظفين وحالة تسجيل الوجه' }),
    (0, swagger_1.ApiQuery)({ name: 'branchId', required: false, description: 'معرف الفرع' }),
    (0, swagger_1.ApiQuery)({ name: 'departmentId', required: false, description: 'معرف القسم' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة الموظفين' }),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Query)('departmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], FaceRecognitionController.prototype, "getUsersFaceStatus", null);
__decorate([
    (0, common_1.Get)('admin/logs'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'سجل محاولات التحقق' }),
    (0, swagger_1.ApiQuery)({ name: 'userId', required: false, description: 'معرف المستخدم' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, description: 'عدد السجلات' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'سجل المحاولات' }),
    __param(0, (0, common_1.Query)('userId')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], FaceRecognitionController.prototype, "getVerificationLogs", null);
exports.FaceRecognitionController = FaceRecognitionController = __decorate([
    (0, swagger_1.ApiTags)('face-recognition'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('face-recognition'),
    __metadata("design:paramtypes", [face_recognition_service_1.FaceRecognitionService])
], FaceRecognitionController);
//# sourceMappingURL=face-recognition.controller.js.map