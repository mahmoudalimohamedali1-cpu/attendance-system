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
exports.EmployeeProfileController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const employee_profile_service_1 = require("./employee-profile.service");
const profile_dto_1 = require("./dto/profile.dto");
let EmployeeProfileController = class EmployeeProfileController {
    constructor(profileService) {
        this.profileService = profileService;
    }
    async getFullProfile(userId, user) {
        return this.profileService.getFullProfile(userId, user.companyId, user.id);
    }
    async updateProfile(userId, dto, user) {
        return this.profileService.updateProfile(userId, user.companyId, user.id, dto);
    }
    async getOverview(userId, user) {
        return this.profileService.getOverview(userId, user.companyId);
    }
    async getAttendanceStats(userId, query, user) {
        return this.profileService.getAttendanceStats(userId, user.companyId, query.startDate, query.endDate);
    }
    async getLeaveHistory(userId, user) {
        return this.profileService.getLeaveHistory(userId, user.companyId);
    }
    async getSalaryInfo(userId, user) {
        return this.profileService.getSalaryInfo(userId, user.companyId);
    }
    async getDocuments(userId, user) {
        return this.profileService.getDocuments(userId, user.companyId);
    }
    async getActivityTimeline(userId, limit, user) {
        return this.profileService.getActivityTimeline(userId, user.companyId, limit ? parseInt(limit, 10) : 20);
    }
    async uploadDocument(userId, dto, file, user) {
        if (!file) {
            throw new Error('الملف مطلوب');
        }
        const filePath = `/uploads/documents/${Date.now()}-${file.originalname}`;
        return this.profileService.uploadDocument(userId, user.companyId, user.id, {
            type: dto.type,
            title: dto.title,
            titleAr: dto.titleAr,
            description: dto.description,
            documentNumber: dto.documentNumber,
            issueDate: dto.issueDate,
            expiryDate: dto.expiryDate,
            issuingAuthority: dto.issuingAuthority,
            notes: dto.notes,
            filePath,
            fileType: file.mimetype,
            fileSize: file.size,
            originalName: file.originalname,
        });
    }
    async createRequestOnBehalf(userId, dto, user) {
        return this.profileService.createRequestOnBehalf(userId, user.companyId, user.id, dto);
    }
    async deleteDocument(userId, docId, user) {
        return this.profileService.deleteDocument(userId, docId, user.companyId);
    }
};
exports.EmployeeProfileController = EmployeeProfileController;
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "getFullProfile", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, profile_dto_1.UpdateProfileDto, Object]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Get)(':id/overview'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "getOverview", null);
__decorate([
    (0, common_1.Get)(':id/attendance'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, profile_dto_1.AttendanceQueryDto, Object]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "getAttendanceStats", null);
__decorate([
    (0, common_1.Get)(':id/leaves'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "getLeaveHistory", null);
__decorate([
    (0, common_1.Get)(':id/salary'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "getSalaryInfo", null);
__decorate([
    (0, common_1.Get)(':id/documents'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "getDocuments", null);
__decorate([
    (0, common_1.Get)(':id/timeline'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "getActivityTimeline", null);
__decorate([
    (0, common_1.Post)(':id/documents'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, profile_dto_1.UploadDocumentDto, Object, Object]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "uploadDocument", null);
__decorate([
    (0, common_1.Post)(':id/request-on-behalf'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, profile_dto_1.RequestOnBehalfDto, Object]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "createRequestOnBehalf", null);
__decorate([
    (0, common_1.Delete)(':id/documents/:docId'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('docId', common_1.ParseUUIDPipe)),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "deleteDocument", null);
exports.EmployeeProfileController = EmployeeProfileController = __decorate([
    (0, common_1.Controller)('employee-profile'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [employee_profile_service_1.EmployeeProfileService])
], EmployeeProfileController);
//# sourceMappingURL=employee-profile.controller.js.map