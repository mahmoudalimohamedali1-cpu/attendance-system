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
exports.BankAccountsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const bank_accounts_service_1 = require("./bank-accounts.service");
const create_bank_account_dto_1 = require("./dto/create-bank-account.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let BankAccountsController = class BankAccountsController {
    constructor(service) {
        this.service = service;
    }
    findAll(user) {
        return this.service.findAll(user.companyId);
    }
    create(dto) {
        return this.service.create(dto);
    }
    findByUser(userId) {
        return this.service.findByUser(userId);
    }
    setPrimary(id) {
        return this.service.setPrimary(id);
    }
    remove(id) {
        return this.service.remove(id);
    }
    verify(id, user) {
        return this.service.verify(id, user.id);
    }
    unverify(id) {
        return this.service.unverify(id);
    }
};
exports.BankAccountsController = BankAccountsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'جلب كل الحسابات البنكية للموظفين' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BankAccountsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'إضافة حساب بنكي لموظف' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_bank_account_dto_1.CreateBankAccountDto]),
    __metadata("design:returntype", void 0)
], BankAccountsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('user/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'عرض الحسابات البنكية لموظف معين' }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BankAccountsController.prototype, "findByUser", null);
__decorate([
    (0, common_1.Patch)(':id/primary'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'تعيين الحساب كحساب رئيسي' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BankAccountsController.prototype, "setPrimary", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف حساب بنكي' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BankAccountsController.prototype, "remove", null);
__decorate([
    (0, common_1.Patch)(':id/verify'),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR'),
    (0, swagger_1.ApiOperation)({ summary: 'التحقق من الحساب البنكي' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BankAccountsController.prototype, "verify", null);
__decorate([
    (0, common_1.Patch)(':id/unverify'),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR'),
    (0, swagger_1.ApiOperation)({ summary: 'إلغاء التحقق من الحساب البنكي' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BankAccountsController.prototype, "unverify", null);
exports.BankAccountsController = BankAccountsController = __decorate([
    (0, swagger_1.ApiTags)('Bank Accounts'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('bank-accounts'),
    __metadata("design:paramtypes", [bank_accounts_service_1.BankAccountsService])
], BankAccountsController);
//# sourceMappingURL=bank-accounts.controller.js.map