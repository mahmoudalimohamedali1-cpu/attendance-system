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
exports.LettersController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const letters_service_1 = require("./letters.service");
const create_letter_request_dto_1 = require("./dto/create-letter-request.dto");
const letter_query_dto_1 = require("./dto/letter-query.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const upload_service_1 = require("../../common/upload/upload.service");
let LettersController = class LettersController {
    constructor(lettersService, uploadService) {
        this.lettersService = lettersService;
        this.uploadService = uploadService;
    }
    async uploadAttachments(files) {
        const uploadedFiles = await this.uploadService.uploadLetterAttachments(files);
        return {
            message: 'تم رفع الملفات بنجاح',
            files: uploadedFiles,
        };
    }
    async createLetterRequest(userId, createLetterDto, req) {
        const rawBody = req.body;
        if (rawBody.attachments && Array.isArray(rawBody.attachments)) {
            createLetterDto.attachments = rawBody.attachments;
        }
        return this.lettersService.createLetterRequest(userId, createLetterDto);
    }
    async getMyLetterRequests(userId, query) {
        return this.lettersService.getMyLetterRequests(userId, query);
    }
    async getLetterRequestById(id, userId) {
        return this.lettersService.getLetterRequestById(id, userId);
    }
    async cancelLetterRequest(id, userId) {
        return this.lettersService.cancelLetterRequest(id, userId);
    }
    async getPendingRequests(userId, companyId, query) {
        return this.lettersService.getPendingRequests(userId, companyId, query);
    }
    async approveLetterRequest(id, approverId, body) {
        return this.lettersService.approveLetterRequest(id, approverId, body.notes, body.attachments);
    }
    async rejectLetterRequest(id, approverId, body) {
        return this.lettersService.rejectLetterRequest(id, approverId, body.notes, body.attachments);
    }
    async getManagerInbox(managerId, companyId) {
        return this.lettersService.getManagerInbox(managerId, companyId);
    }
    async getHRInbox(hrUserId, companyId) {
        return this.lettersService.getHRInbox(hrUserId, companyId);
    }
    async managerDecision(id, managerId, body) {
        return this.lettersService.managerDecision(id, managerId, body.decision, body.notes, body.attachments);
    }
    async hrDecision(id, hrUserId, body) {
        return this.lettersService.hrDecision(id, hrUserId, body.decision, body.notes, body.attachments);
    }
};
exports.LettersController = LettersController;
__decorate([
    (0, common_1.Post)('upload-attachments'),
    (0, swagger_1.ApiOperation)({ summary: 'رفع مرفقات طلب الخطاب' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'تم رفع الملفات بنجاح' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files', 5, {
        limits: { fileSize: 10 * 1024 * 1024 }
    })),
    __param(0, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], LettersController.prototype, "uploadAttachments", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'إنشاء طلب خطاب' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'تم إنشاء الطلب بنجاح' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_letter_request_dto_1.CreateLetterRequestDto, Object]),
    __metadata("design:returntype", Promise)
], LettersController.prototype, "createLetterRequest", null);
__decorate([
    (0, common_1.Get)('my'),
    (0, swagger_1.ApiOperation)({ summary: 'طلبات الخطاب الخاصة بي' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة طلبات الخطاب' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, letter_query_dto_1.LetterQueryDto]),
    __metadata("design:returntype", Promise)
], LettersController.prototype, "getMyLetterRequests", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'تفاصيل طلب خطاب' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تفاصيل الطلب' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LettersController.prototype, "getLetterRequestById", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'إلغاء طلب خطاب' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم الإلغاء بنجاح' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LettersController.prototype, "cancelLetterRequest", null);
__decorate([
    (0, common_1.Get)('pending/all'),
    (0, swagger_1.ApiOperation)({ summary: 'الطلبات المعلقة (حسب صلاحياتك)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة الطلبات المعلقة التي لديك صلاحية عليها' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, letter_query_dto_1.LetterQueryDto]),
    __metadata("design:returntype", Promise)
], LettersController.prototype, "getPendingRequests", null);
__decorate([
    (0, common_1.Patch)(':id/approve'),
    (0, swagger_1.ApiOperation)({ summary: 'الموافقة على طلب خطاب (حسب صلاحياتك)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تمت الموافقة' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], LettersController.prototype, "approveLetterRequest", null);
__decorate([
    (0, common_1.Patch)(':id/reject'),
    (0, swagger_1.ApiOperation)({ summary: 'رفض طلب خطاب (حسب صلاحياتك)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم الرفض' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], LettersController.prototype, "rejectLetterRequest", null);
__decorate([
    (0, common_1.Get)('inbox/manager'),
    (0, swagger_1.ApiOperation)({ summary: 'طلبات تنتظر موافقة المدير' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة الطلبات التي تنتظر موافقتك كمدير' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LettersController.prototype, "getManagerInbox", null);
__decorate([
    (0, common_1.Get)('inbox/hr'),
    (0, swagger_1.ApiOperation)({ summary: 'طلبات تنتظر موافقة HR' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة الطلبات التي تنتظر موافقة HR' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LettersController.prototype, "getHRInbox", null);
__decorate([
    (0, common_1.Post)(':id/manager-decision'),
    (0, swagger_1.ApiOperation)({ summary: 'قرار المدير على طلب الخطاب (موافقة/رفض)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم تسجيل قرار المدير' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], LettersController.prototype, "managerDecision", null);
__decorate([
    (0, common_1.Post)(':id/hr-decision'),
    (0, swagger_1.ApiOperation)({ summary: 'قرار HR على طلب الخطاب (موافقة/رفض/تأجيل)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم تسجيل قرار HR' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], LettersController.prototype, "hrDecision", null);
exports.LettersController = LettersController = __decorate([
    (0, swagger_1.ApiTags)('letters'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('letters'),
    __metadata("design:paramtypes", [letters_service_1.LettersService,
        upload_service_1.UploadService])
], LettersController);
//# sourceMappingURL=letters.controller.js.map