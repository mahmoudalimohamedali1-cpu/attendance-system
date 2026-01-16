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
exports.CustodyController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const permission_guard_1 = require("../auth/guards/permission.guard");
const require_permission_decorator_1 = require("../auth/decorators/require-permission.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const custody_service_1 = require("./custody.service");
const custody_dto_1 = require("./dto/custody.dto");
let CustodyController = class CustodyController {
    constructor(custodyService) {
        this.custodyService = custodyService;
    }
    getCategories(user) {
        return this.custodyService.getCategories(user.companyId);
    }
    createCategory(user, dto) {
        return this.custodyService.createCategory(user.companyId, user.id, dto);
    }
    updateCategory(user, id, dto) {
        return this.custodyService.updateCategory(user.companyId, id, user.id, dto);
    }
    deleteCategory(user, id) {
        return this.custodyService.deleteCategory(user.companyId, id, user.id);
    }
    getItems(user, query) {
        return this.custodyService.getItems(user.companyId, query);
    }
    getItem(user, id) {
        return this.custodyService.getItemById(user.companyId, id);
    }
    createItem(user, dto) {
        return this.custodyService.createItem(user.companyId, user.id, dto);
    }
    updateItem(user, id, dto) {
        return this.custodyService.updateItem(user.companyId, id, user.id, dto);
    }
    deleteItem(user, id) {
        return this.custodyService.deleteItem(user.companyId, id, user.id);
    }
    getMyCustody(user) {
        return this.custodyService.getMyAssignments(user.companyId, user.id);
    }
    getPendingAssignments(user) {
        return this.custodyService.getPendingAssignments(user.companyId);
    }
    assignCustody(user, dto) {
        return this.custodyService.assignCustody(user.companyId, user.id, dto);
    }
    approveAssignment(user, dto) {
        return this.custodyService.approveAssignment(user.companyId, user.id, dto);
    }
    rejectAssignment(user, dto) {
        return this.custodyService.rejectAssignment(user.companyId, user.id, dto);
    }
    signAssignment(user, dto) {
        return this.custodyService.signAssignment(user.companyId, user.id, dto);
    }
    getPendingReturns(user) {
        return this.custodyService.getPendingReturns(user.companyId);
    }
    requestReturn(user, dto) {
        return this.custodyService.requestReturn(user.companyId, user.id, dto);
    }
    reviewReturn(user, dto) {
        return this.custodyService.reviewReturn(user.companyId, user.id, dto);
    }
    getMyPendingTransfers(user) {
        return this.custodyService.getPendingTransfers(user.companyId, user.id);
    }
    getAllPendingTransfers(user) {
        return this.custodyService.getPendingTransfers(user.companyId);
    }
    requestTransfer(user, dto) {
        return this.custodyService.requestTransfer(user.companyId, user, dto);
    }
    approveTransfer(user, dto) {
        return this.custodyService.approveTransfer(user.companyId, user.id, dto);
    }
    rejectTransfer(user, dto) {
        return this.custodyService.rejectTransfer(user.companyId, user.id, dto);
    }
    getMaintenances(user, status) {
        return this.custodyService.getMaintenances(user.companyId, status);
    }
    createMaintenance(user, dto) {
        return this.custodyService.createMaintenance(user.companyId, user.id, dto);
    }
    updateMaintenance(user, id, dto) {
        return this.custodyService.updateMaintenance(user.companyId, id, user.id, dto);
    }
    getDashboard(user) {
        return this.custodyService.getDashboard(user.companyId);
    }
    getEmployeeReport(user, employeeId) {
        return this.custodyService.getEmployeeCustodyReport(user.companyId, employeeId);
    }
    getMyReport(user) {
        return this.custodyService.getEmployeeCustodyReport(user.companyId, user.id);
    }
};
exports.CustodyController = CustodyController;
__decorate([
    (0, common_1.Get)('categories'),
    (0, require_permission_decorator_1.RequirePermission)('CUSTODY_VIEW'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Post)('categories'),
    (0, require_permission_decorator_1.RequirePermission)('CUSTODY_MANAGE_CATEGORIES'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, custody_dto_1.CreateCategoryCto]),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "createCategory", null);
__decorate([
    (0, common_1.Patch)('categories/:id'),
    (0, require_permission_decorator_1.RequirePermission)('CUSTODY_MANAGE_CATEGORIES'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, custody_dto_1.UpdateCategoryCto]),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "updateCategory", null);
__decorate([
    (0, common_1.Delete)('categories/:id'),
    (0, require_permission_decorator_1.RequirePermission)('CUSTODY_MANAGE_CATEGORIES'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "deleteCategory", null);
__decorate([
    (0, common_1.Get)('items'),
    (0, require_permission_decorator_1.RequirePermission)('CUSTODY_VIEW'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, custody_dto_1.CustodyQueryDto]),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "getItems", null);
__decorate([
    (0, common_1.Get)('items/:id'),
    (0, require_permission_decorator_1.RequirePermission)('CUSTODY_VIEW'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "getItem", null);
__decorate([
    (0, common_1.Post)('items'),
    (0, require_permission_decorator_1.RequirePermission)('CUSTODY_MANAGE_ITEMS'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, custody_dto_1.CreateItemDto]),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "createItem", null);
__decorate([
    (0, common_1.Patch)('items/:id'),
    (0, require_permission_decorator_1.RequirePermission)('CUSTODY_MANAGE_ITEMS'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, custody_dto_1.UpdateItemDto]),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "updateItem", null);
__decorate([
    (0, common_1.Delete)('items/:id'),
    (0, require_permission_decorator_1.RequirePermission)('CUSTODY_DELETE'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "deleteItem", null);
__decorate([
    (0, common_1.Get)('my-custody'),
    (0, require_permission_decorator_1.RequirePermission)('CUSTODY_VIEW_SELF'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "getMyCustody", null);
__decorate([
    (0, common_1.Get)('assignments/pending'),
    (0, require_permission_decorator_1.RequirePermission)('CUSTODY_ASSIGN'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "getPendingAssignments", null);
__decorate([
    (0, common_1.Post)('assign'),
    (0, require_permission_decorator_1.RequirePermission)('CUSTODY_ASSIGN'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, custody_dto_1.AssignCustodyDto]),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "assignCustody", null);
__decorate([
    (0, common_1.Post)('assignments/approve'),
    (0, require_permission_decorator_1.RequirePermission)('CUSTODY_ASSIGN'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, custody_dto_1.ApproveAssignmentDto]),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "approveAssignment", null);
__decorate([
    (0, common_1.Post)('assignments/reject'),
    (0, require_permission_decorator_1.RequirePermission)('CUSTODY_ASSIGN'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, custody_dto_1.RejectAssignmentDto]),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "rejectAssignment", null);
__decorate([
    (0, common_1.Post)('assignments/sign'),
    (0, require_permission_decorator_1.RequirePermission)('CUSTODY_VIEW_SELF'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, custody_dto_1.SignAssignmentDto]),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "signAssignment", null);
__decorate([
    (0, common_1.Get)('returns/pending'),
    (0, require_permission_decorator_1.RequirePermission)('CUSTODY_RETURN_REVIEW'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "getPendingReturns", null);
__decorate([
    (0, common_1.Post)('return/request'),
    (0, require_permission_decorator_1.RequirePermission)('CUSTODY_RETURN_REQUEST'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, custody_dto_1.RequestReturnDto]),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "requestReturn", null);
__decorate([
    (0, common_1.Post)('return/review'),
    (0, require_permission_decorator_1.RequirePermission)('CUSTODY_RETURN_REVIEW'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, custody_dto_1.ReviewReturnDto]),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "reviewReturn", null);
__decorate([
    (0, common_1.Get)('transfers/pending'),
    (0, require_permission_decorator_1.RequirePermission)('CUSTODY_VIEW_SELF'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "getMyPendingTransfers", null);
__decorate([
    (0, common_1.Get)('transfers/all-pending'),
    (0, require_permission_decorator_1.RequirePermission)('CUSTODY_TRANSFER_APPROVE'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "getAllPendingTransfers", null);
__decorate([
    (0, common_1.Post)('transfer/request'),
    (0, require_permission_decorator_1.RequirePermission)('CUSTODY_TRANSFER_REQUEST'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, custody_dto_1.RequestTransferDto]),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "requestTransfer", null);
__decorate([
    (0, common_1.Post)('transfer/approve'),
    (0, require_permission_decorator_1.RequirePermission)('CUSTODY_VIEW_SELF'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, custody_dto_1.ApproveTransferDto]),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "approveTransfer", null);
__decorate([
    (0, common_1.Post)('transfer/reject'),
    (0, require_permission_decorator_1.RequirePermission)('CUSTODY_VIEW_SELF'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, custody_dto_1.RejectTransferDto]),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "rejectTransfer", null);
__decorate([
    (0, common_1.Get)('maintenance'),
    (0, require_permission_decorator_1.RequirePermission)('CUSTODY_MAINTENANCE'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "getMaintenances", null);
__decorate([
    (0, common_1.Post)('maintenance'),
    (0, require_permission_decorator_1.RequirePermission)('CUSTODY_MAINTENANCE'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, custody_dto_1.CreateMaintenanceDto]),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "createMaintenance", null);
__decorate([
    (0, common_1.Patch)('maintenance/:id'),
    (0, require_permission_decorator_1.RequirePermission)('CUSTODY_MAINTENANCE'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, custody_dto_1.UpdateMaintenanceDto]),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "updateMaintenance", null);
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, require_permission_decorator_1.RequirePermission)('CUSTODY_DASHBOARD'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('reports/employee/:employeeId'),
    (0, require_permission_decorator_1.RequirePermission)('CUSTODY_REPORTS'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "getEmployeeReport", null);
__decorate([
    (0, common_1.Get)('reports/my'),
    (0, require_permission_decorator_1.RequirePermission)('CUSTODY_VIEW_SELF'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "getMyReport", null);
exports.CustodyController = CustodyController = __decorate([
    (0, common_1.Controller)('custody'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permission_guard_1.PermissionGuard),
    __metadata("design:paramtypes", [custody_service_1.CustodyService])
], CustodyController);
//# sourceMappingURL=custody.controller.js.map