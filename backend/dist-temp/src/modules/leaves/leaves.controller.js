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
exports.LeavesController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const leaves_service_1 = require("./leaves.service");
const create_leave_request_dto_1 = require("./dto/create-leave-request.dto");
const leave_query_dto_1 = require("./dto/leave-query.dto");
const approve_leave_dto_1 = require("./dto/approve-leave.dto");
const work_from_home_dto_1 = require("./dto/work-from-home.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const upload_service_1 = require("../../common/upload/upload.service");
let LeavesController = class LeavesController {
    constructor(leavesService, uploadService) {
        this.leavesService = leavesService;
        this.uploadService = uploadService;
    }
    async uploadAttachments(files) {
        const uploadedFiles = await this.uploadService.uploadLeaveAttachments(files);
        return {
            message: 'تم رفع الملفات بنجاح',
            files: uploadedFiles,
        };
    }
    async createLeaveRequest(userId, companyId, createLeaveDto, req) {
        const rawBody = req.body;
        if (rawBody.attachments && Array.isArray(rawBody.attachments)) {
            createLeaveDto.attachments = rawBody.attachments;
        }
        return this.leavesService.createLeaveRequest(userId, companyId, createLeaveDto);
    }
    async getMyLeaveRequests(userId, companyId, query) {
        return this.leavesService.getMyLeaveRequests(userId, companyId, query);
    }
    async getLeaveRequestById(id, companyId, userId) {
        return this.leavesService.getLeaveRequestById(id, companyId, userId);
    }
    async getLeaveRequestWithEmployeeContext(id, companyId, userId) {
        return this.leavesService.getLeaveRequestWithEmployeeContext(id, companyId, userId);
    }
    async cancelLeaveRequest(id, companyId, userId) {
        return this.leavesService.cancelLeaveRequest(id, companyId, userId);
    }
    async getPendingRequests(userId, companyId, query) {
        return this.leavesService.getPendingRequests(userId, companyId, query);
    }
    async approveLeaveRequest(id, companyId, approverId, approveDto) {
        return this.leavesService.approveLeaveRequest(id, companyId, approverId, approveDto.notes);
    }
    async rejectLeaveRequest(id, companyId, approverId, approveDto) {
        return this.leavesService.rejectLeaveRequest(id, companyId, approverId, approveDto.notes);
    }
    async getManagerInbox(managerId, companyId) {
        return this.leavesService.getManagerInbox(managerId, companyId);
    }
    async getHRInbox(hrUserId, companyId) {
        return this.leavesService.getHRInbox(hrUserId, companyId);
    }
    async managerDecision(id, companyId, managerId, body) {
        return this.leavesService.managerDecision(id, companyId, managerId, body.decision, body.notes);
    }
    async hrDecision(id, companyId, hrUserId, body) {
        return this.leavesService.hrDecision(id, companyId, hrUserId, body.decision, body.notes);
    }
    async getAllLeaveRequests(companyId, query) {
        return this.leavesService.getAllLeaveRequests(companyId, query);
    }
    async enableWorkFromHome(companyId, approverId, wfhDto) {
        return this.leavesService.enableWorkFromHome(wfhDto.userId, companyId, new Date(wfhDto.date), wfhDto.reason, approverId);
    }
    async disableWorkFromHome(companyId, userId, date) {
        return this.leavesService.disableWorkFromHome(userId, companyId, new Date(date));
    }
};
exports.LeavesController = LeavesController;
__decorate([
    (0, common_1.Post)('upload-attachments'),
    (0, swagger_1.ApiOperation)({ summary: 'رفع مرفقات طلب الإجازة' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'تم رفع الملفات بنجاح' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files', 5, {
        limits: { fileSize: 10 * 1024 * 1024 }
    })),
    __param(0, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], LeavesController.prototype, "uploadAttachments", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'إنشاء طلب إجازة' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'تم إنشاء الطلب بنجاح' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, create_leave_request_dto_1.CreateLeaveRequestDto, Object]),
    __metadata("design:returntype", Promise)
], LeavesController.prototype, "createLeaveRequest", null);
__decorate([
    (0, common_1.Get)('my'),
    (0, swagger_1.ApiOperation)({ summary: 'طلبات الإجازة الخاصة بي' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة طلبات الإجازة' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, leave_query_dto_1.LeaveQueryDto]),
    __metadata("design:returntype", Promise)
], LeavesController.prototype, "getMyLeaveRequests", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'تفاصيل طلب إجازة' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تفاصيل الطلب' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], LeavesController.prototype, "getLeaveRequestById", null);
__decorate([
    (0, common_1.Get)(':id/context'),
    (0, swagger_1.ApiOperation)({ summary: 'تفاصيل طلب إجازة مع سياق الموظف (للمدير/HR)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تفاصيل الطلب مع بيانات الموظف الكاملة' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], LeavesController.prototype, "getLeaveRequestWithEmployeeContext", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'إلغاء طلب إجازة' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم الإلغاء بنجاح' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], LeavesController.prototype, "cancelLeaveRequest", null);
__decorate([
    (0, common_1.Get)('pending/all'),
    (0, swagger_1.ApiOperation)({ summary: 'الطلبات المعلقة (حسب صلاحياتك)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة الطلبات المعلقة التي لديك صلاحية عليها' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, leave_query_dto_1.LeaveQueryDto]),
    __metadata("design:returntype", Promise)
], LeavesController.prototype, "getPendingRequests", null);
__decorate([
    (0, common_1.Patch)(':id/approve'),
    (0, swagger_1.ApiOperation)({ summary: 'الموافقة على طلب إجازة (حسب صلاحياتك)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تمت الموافقة' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, approve_leave_dto_1.ApproveLeaveDto]),
    __metadata("design:returntype", Promise)
], LeavesController.prototype, "approveLeaveRequest", null);
__decorate([
    (0, common_1.Patch)(':id/reject'),
    (0, swagger_1.ApiOperation)({ summary: 'رفض طلب إجازة (حسب صلاحياتك)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم الرفض' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, approve_leave_dto_1.ApproveLeaveDto]),
    __metadata("design:returntype", Promise)
], LeavesController.prototype, "rejectLeaveRequest", null);
__decorate([
    (0, common_1.Get)('inbox/manager'),
    (0, swagger_1.ApiOperation)({ summary: 'طلبات تنتظر موافقة المدير' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة الطلبات التي تنتظر موافقتك كمدير' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LeavesController.prototype, "getManagerInbox", null);
__decorate([
    (0, common_1.Get)('inbox/hr'),
    (0, swagger_1.ApiOperation)({ summary: 'طلبات تنتظر موافقة HR' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة الطلبات التي تنتظر موافقة HR' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LeavesController.prototype, "getHRInbox", null);
__decorate([
    (0, common_1.Post)(':id/manager-decision'),
    (0, swagger_1.ApiOperation)({ summary: 'قرار المدير على طلب الإجازة (موافقة/رفض)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم تسجيل قرار المدير' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], LeavesController.prototype, "managerDecision", null);
__decorate([
    (0, common_1.Post)(':id/hr-decision'),
    (0, swagger_1.ApiOperation)({ summary: 'قرار HR على طلب الإجازة (موافقة/رفض/تأجيل)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم تسجيل قرار HR' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], LeavesController.prototype, "hrDecision", null);
__decorate([
    (0, common_1.Get)('admin/all'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'جميع طلبات الإجازة (للأدمن فقط)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة جميع الطلبات' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, leave_query_dto_1.LeaveQueryDto]),
    __metadata("design:returntype", Promise)
], LeavesController.prototype, "getAllLeaveRequests", null);
__decorate([
    (0, common_1.Post)('work-from-home'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'تفعيل العمل من المنزل لموظف' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'تم التفعيل' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, work_from_home_dto_1.WorkFromHomeDto]),
    __metadata("design:returntype", Promise)
], LeavesController.prototype, "enableWorkFromHome", null);
__decorate([
    (0, common_1.Delete)('work-from-home/:userId/:date'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'إلغاء العمل من المنزل' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم الإلغاء' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Param)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], LeavesController.prototype, "disableWorkFromHome", null);
exports.LeavesController = LeavesController = __decorate([
    (0, swagger_1.ApiTags)('leaves'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('leaves'),
    __metadata("design:paramtypes", [leaves_service_1.LeavesService,
        upload_service_1.UploadService])
], LeavesController);
//# sourceMappingURL=leaves.controller.js.map