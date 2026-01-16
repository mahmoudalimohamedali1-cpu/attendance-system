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
exports.DisciplinaryController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const disciplinary_service_1 = require("./disciplinary.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const permission_guard_1 = require("../auth/guards/permission.guard");
const require_permission_decorator_1 = require("../auth/decorators/require-permission.decorator");
const create_case_dto_1 = require("./dto/create-case.dto");
const hr_review_dto_1 = require("./dto/hr-review.dto");
const issue_decision_dto_1 = require("./dto/issue-decision.dto");
const employee_response_dto_1 = require("./dto/employee-response.dto");
const objection_review_dto_1 = require("./dto/objection-review.dto");
let DisciplinaryController = class DisciplinaryController {
    constructor(disciplinaryService) {
        this.disciplinaryService = disciplinaryService;
    }
    async createCase(req, dto) {
        return this.disciplinaryService.createCase(req.user.id, req.user.companyId, dto);
    }
    async getCases(req, role = 'hr') {
        return this.disciplinaryService.getCasesForRole(req.user.id, req.user.companyId, role);
    }
    async getCaseDetail(id, req) {
        return this.disciplinaryService.getCaseDetail(id, req.user.companyId);
    }
    async hrInitialReview(id, req, dto) {
        return this.disciplinaryService.hrInitialReview(id, req.user.id, req.user.companyId, dto);
    }
    async employeeInformalResponse(id, req, dto) {
        return this.disciplinaryService.employeeInformalResponse(id, req.user.id, req.user.companyId, dto);
    }
    async issueDecision(id, req, dto) {
        return this.disciplinaryService.issueDecision(id, req.user.id, req.user.companyId, dto);
    }
    async finalizeCase(id, req) {
        return this.disciplinaryService.finalizeCase(id, req.user.id, req.user.companyId);
    }
    async objectionReview(id, req, dto) {
        return this.disciplinaryService.objectionReview(id, req.user.id, req.user.companyId, dto);
    }
    async scheduleHearing(id, req, dto) {
        return this.disciplinaryService.scheduleHearing(id, req.user.id, req.user.companyId, dto);
    }
    async uploadMinutes(id, req, dto) {
        return this.disciplinaryService.uploadMinutes(id, req.user.id, req.user.companyId, dto);
    }
    async employeeDecisionResponse(id, req, dto) {
        return this.disciplinaryService.employeeDecisionResponse(id, req.user.id, req.user.companyId, dto);
    }
    async uploadAttachment(id, req, dto) {
        return this.disciplinaryService.uploadAttachment(id, req.user.id, req.user.companyId, dto);
    }
    async uploadFiles(id, req, files) {
        return this.disciplinaryService.uploadFiles(id, req.user.id, req.user.companyId, files);
    }
    async toggleLegalHold(id, req, hold) {
        return this.disciplinaryService.toggleLegalHold(id, req.user.id, req.user.companyId, hold);
    }
};
exports.DisciplinaryController = DisciplinaryController;
__decorate([
    (0, common_1.Post)('cases'),
    (0, require_permission_decorator_1.RequirePermission)('DISC_MANAGER_CREATE'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_case_dto_1.CreateCaseDto]),
    __metadata("design:returntype", Promise)
], DisciplinaryController.prototype, "createCase", null);
__decorate([
    (0, common_1.Get)('cases'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DisciplinaryController.prototype, "getCases", null);
__decorate([
    (0, common_1.Get)('cases/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DisciplinaryController.prototype, "getCaseDetail", null);
__decorate([
    (0, common_1.Post)('cases/:id/hr-review'),
    (0, require_permission_decorator_1.RequirePermission)('DISC_HR_REVIEW'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, hr_review_dto_1.HRReviewDto]),
    __metadata("design:returntype", Promise)
], DisciplinaryController.prototype, "hrInitialReview", null);
__decorate([
    (0, common_1.Post)('cases/:id/employee-informal-response'),
    (0, require_permission_decorator_1.RequirePermission)('DISC_EMPLOYEE_RESPONSE'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, employee_response_dto_1.EmployeeResponseDto]),
    __metadata("design:returntype", Promise)
], DisciplinaryController.prototype, "employeeInformalResponse", null);
__decorate([
    (0, common_1.Post)('cases/:id/decision'),
    (0, require_permission_decorator_1.RequirePermission)('DISC_HR_DECISION'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, issue_decision_dto_1.IssueDecisionDto]),
    __metadata("design:returntype", Promise)
], DisciplinaryController.prototype, "issueDecision", null);
__decorate([
    (0, common_1.Post)('cases/:id/finalize'),
    (0, require_permission_decorator_1.RequirePermission)('DISC_HR_FINALIZE'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DisciplinaryController.prototype, "finalizeCase", null);
__decorate([
    (0, common_1.Post)('cases/:id/objection-review'),
    (0, require_permission_decorator_1.RequirePermission)('DISC_HR_DECISION'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, objection_review_dto_1.ObjectionReviewDto]),
    __metadata("design:returntype", Promise)
], DisciplinaryController.prototype, "objectionReview", null);
__decorate([
    (0, common_1.Post)('cases/:id/schedule-hearing'),
    (0, require_permission_decorator_1.RequirePermission)('DISC_HR_REVIEW'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DisciplinaryController.prototype, "scheduleHearing", null);
__decorate([
    (0, common_1.Post)('cases/:id/minutes'),
    (0, require_permission_decorator_1.RequirePermission)('DISC_HR_REVIEW'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DisciplinaryController.prototype, "uploadMinutes", null);
__decorate([
    (0, common_1.Post)('cases/:id/employee-decision-response'),
    (0, require_permission_decorator_1.RequirePermission)('DISC_EMPLOYEE_RESPONSE'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DisciplinaryController.prototype, "employeeDecisionResponse", null);
__decorate([
    (0, common_1.Post)('cases/:id/attachments'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DisciplinaryController.prototype, "uploadAttachment", null);
__decorate([
    (0, common_1.Post)('cases/:id/upload-files'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files', 10)),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Array]),
    __metadata("design:returntype", Promise)
], DisciplinaryController.prototype, "uploadFiles", null);
__decorate([
    (0, common_1.Post)('cases/:id/toggle-hold'),
    (0, require_permission_decorator_1.RequirePermission)('DISC_HR_DECISION'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)('hold')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Boolean]),
    __metadata("design:returntype", Promise)
], DisciplinaryController.prototype, "toggleLegalHold", null);
exports.DisciplinaryController = DisciplinaryController = __decorate([
    (0, common_1.Controller)('disciplinary'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permission_guard_1.PermissionGuard),
    __metadata("design:paramtypes", [disciplinary_service_1.DisciplinaryService])
], DisciplinaryController);
//# sourceMappingURL=disciplinary.controller.js.map