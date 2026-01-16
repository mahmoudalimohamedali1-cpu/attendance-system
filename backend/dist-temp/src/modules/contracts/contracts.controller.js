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
exports.ContractsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const contracts_service_1 = require("./contracts.service");
const contract_dto_1 = require("./dto/contract.dto");
let ContractsController = class ContractsController {
    constructor(contractsService) {
        this.contractsService = contractsService;
    }
    findAll(companyId, status, qiwaStatus) {
        return this.contractsService.findAll(companyId, { status, qiwaStatus });
    }
    getStats(companyId) {
        return this.contractsService.getStats(companyId);
    }
    getExpiring(companyId, days) {
        return this.contractsService.getExpiring(companyId, days ? parseInt(days) : 30);
    }
    getPendingForEmployer(companyId) {
        return this.contractsService.getPendingForEmployer(companyId);
    }
    getPendingForEmployee(employeeId, companyId) {
        return this.contractsService.getPendingForEmployee(employeeId, companyId);
    }
    findByEmployee(userId, companyId) {
        return this.contractsService.findByEmployee(userId, companyId);
    }
    findOne(id, companyId) {
        return this.contractsService.findOne(id, companyId);
    }
    create(dto, companyId, userId) {
        return this.contractsService.create(dto, companyId, userId);
    }
    update(id, dto, companyId, userId) {
        return this.contractsService.update(id, dto, companyId, userId);
    }
    sendToEmployee(id, companyId, userId) {
        return this.contractsService.sendToEmployee(id, companyId, userId);
    }
    employeeSign(id, dto, companyId, employeeId) {
        return this.contractsService.employeeSign(id, companyId, employeeId, dto);
    }
    employeeReject(id, dto, companyId, employeeId) {
        return this.contractsService.employeeReject(id, companyId, employeeId, dto);
    }
    employerSign(id, dto, companyId, userId) {
        return this.contractsService.employerSign(id, companyId, userId, dto);
    }
    updateQiwaStatus(id, dto, companyId, userId) {
        return this.contractsService.updateQiwaStatus(id, companyId, dto, userId);
    }
    terminate(id, dto, companyId, userId) {
        return this.contractsService.terminate(id, dto, companyId, userId);
    }
    renew(id, dto, companyId, userId) {
        return this.contractsService.renew(id, dto, companyId, userId);
    }
    delete(id, companyId, userId) {
        return this.contractsService.delete(id, companyId, userId);
    }
};
exports.ContractsController = ContractsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'جلب كل العقود' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, description: 'فلترة حسب الحالة' }),
    (0, swagger_1.ApiQuery)({ name: 'qiwaStatus', required: false, description: 'فلترة حسب حالة قوى' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('qiwaStatus')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], ContractsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'إحصائيات العقود' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ContractsController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('expiring'),
    (0, swagger_1.ApiOperation)({ summary: 'جلب العقود المنتهية قريباً' }),
    (0, swagger_1.ApiQuery)({ name: 'days', required: false, description: 'عدد الأيام (افتراضي 30)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(1, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ContractsController.prototype, "getExpiring", null);
__decorate([
    (0, common_1.Get)('pending-employer'),
    (0, swagger_1.ApiOperation)({ summary: 'العقود بانتظار توقيع صاحب العمل' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ContractsController.prototype, "getPendingForEmployer", null);
__decorate([
    (0, common_1.Get)('pending-employee'),
    (0, swagger_1.ApiOperation)({ summary: 'العقود بانتظار توقيعي (كموظف)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ContractsController.prototype, "getPendingForEmployee", null);
__decorate([
    (0, common_1.Get)('employee/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'جلب عقود موظف معين' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ContractsController.prototype, "findByEmployee", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'جلب عقد معين' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ContractsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'إنشاء عقد جديد' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [contract_dto_1.CreateContractDto, String, String]),
    __metadata("design:returntype", void 0)
], ContractsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'تحديث عقد' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(3, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, contract_dto_1.UpdateContractDto, String, String]),
    __metadata("design:returntype", void 0)
], ContractsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/send-to-employee'),
    (0, swagger_1.ApiOperation)({ summary: 'إرسال العقد للموظف للتوقيع' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], ContractsController.prototype, "sendToEmployee", null);
__decorate([
    (0, common_1.Post)(':id/employee-sign'),
    (0, swagger_1.ApiOperation)({ summary: 'توقيع الموظف على العقد' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(3, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, contract_dto_1.SignContractDto, String, String]),
    __metadata("design:returntype", void 0)
], ContractsController.prototype, "employeeSign", null);
__decorate([
    (0, common_1.Post)(':id/employee-reject'),
    (0, swagger_1.ApiOperation)({ summary: 'رفض الموظف للعقد' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(3, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, contract_dto_1.RejectContractDto, String, String]),
    __metadata("design:returntype", void 0)
], ContractsController.prototype, "employeeReject", null);
__decorate([
    (0, common_1.Post)(':id/employer-sign'),
    (0, swagger_1.ApiOperation)({ summary: 'توقيع صاحب العمل على العقد' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(3, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, contract_dto_1.SignContractDto, String, String]),
    __metadata("design:returntype", void 0)
], ContractsController.prototype, "employerSign", null);
__decorate([
    (0, common_1.Patch)(':id/qiwa-status'),
    (0, swagger_1.ApiOperation)({ summary: 'تحديث حالة العقد في قوى' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(3, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, contract_dto_1.UpdateQiwaStatusDto, String, String]),
    __metadata("design:returntype", void 0)
], ContractsController.prototype, "updateQiwaStatus", null);
__decorate([
    (0, common_1.Post)(':id/terminate'),
    (0, swagger_1.ApiOperation)({ summary: 'إنهاء عقد' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(3, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, contract_dto_1.TerminateContractDto, String, String]),
    __metadata("design:returntype", void 0)
], ContractsController.prototype, "terminate", null);
__decorate([
    (0, common_1.Post)(':id/renew'),
    (0, swagger_1.ApiOperation)({ summary: 'تجديد عقد' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(3, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, contract_dto_1.RenewContractDto, String, String]),
    __metadata("design:returntype", void 0)
], ContractsController.prototype, "renew", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف عقد (مسودة فقط)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], ContractsController.prototype, "delete", null);
exports.ContractsController = ContractsController = __decorate([
    (0, swagger_1.ApiTags)('Contracts - العقود'),
    (0, common_1.Controller)('contracts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [contracts_service_1.ContractsService])
], ContractsController);
//# sourceMappingURL=contracts.controller.js.map