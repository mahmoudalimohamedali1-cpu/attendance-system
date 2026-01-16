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
exports.CompanyBankAccountsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const company_bank_accounts_service_1 = require("./company-bank-accounts.service");
const company_bank_account_dto_1 = require("./dto/company-bank-account.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let CompanyBankAccountsController = class CompanyBankAccountsController {
    constructor(service) {
        this.service = service;
    }
    create(dto, companyId) {
        return this.service.create(companyId, dto);
    }
    findAll(companyId) {
        return this.service.findAll(companyId);
    }
    findActive(companyId) {
        return this.service.findActive(companyId);
    }
    findPrimary(companyId) {
        return this.service.findPrimary(companyId);
    }
    getSaudiBanks() {
        return this.service.getSaudiBanks();
    }
    findOne(id, companyId) {
        return this.service.findOne(id, companyId);
    }
    update(id, dto, companyId) {
        return this.service.update(id, companyId, dto);
    }
    setPrimary(id, companyId) {
        return this.service.setPrimary(id, companyId);
    }
    toggleActive(id, companyId) {
        return this.service.toggleActive(id, companyId);
    }
    remove(id, companyId) {
        return this.service.remove(id, companyId);
    }
};
exports.CompanyBankAccountsController = CompanyBankAccountsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'إضافة حساب بنكي جديد للشركة' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [company_bank_account_dto_1.CreateCompanyBankAccountDto, String]),
    __metadata("design:returntype", void 0)
], CompanyBankAccountsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR'),
    (0, swagger_1.ApiOperation)({ summary: 'جلب كل الحسابات البنكية للشركة' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CompanyBankAccountsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('active'),
    (0, swagger_1.ApiOperation)({ summary: 'جلب الحسابات البنكية النشطة' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CompanyBankAccountsController.prototype, "findActive", null);
__decorate([
    (0, common_1.Get)('primary'),
    (0, swagger_1.ApiOperation)({ summary: 'جلب الحساب البنكي الرئيسي' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CompanyBankAccountsController.prototype, "findPrimary", null);
__decorate([
    (0, common_1.Get)('banks'),
    (0, swagger_1.ApiOperation)({ summary: 'قائمة البنوك السعودية المعتمدة' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CompanyBankAccountsController.prototype, "getSaudiBanks", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR'),
    (0, swagger_1.ApiOperation)({ summary: 'جلب تفاصيل حساب بنكي' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyBankAccountsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'تحديث حساب بنكي' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, company_bank_account_dto_1.UpdateCompanyBankAccountDto, String]),
    __metadata("design:returntype", void 0)
], CompanyBankAccountsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/primary'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'تعيين حساب كحساب رئيسي' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyBankAccountsController.prototype, "setPrimary", null);
__decorate([
    (0, common_1.Patch)(':id/toggle-active'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'تفعيل/تعطيل حساب بنكي' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyBankAccountsController.prototype, "toggleActive", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف حساب بنكي' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyBankAccountsController.prototype, "remove", null);
exports.CompanyBankAccountsController = CompanyBankAccountsController = __decorate([
    (0, swagger_1.ApiTags)('Company Bank Accounts'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('company-bank-accounts'),
    __metadata("design:paramtypes", [company_bank_accounts_service_1.CompanyBankAccountsService])
], CompanyBankAccountsController);
//# sourceMappingURL=company-bank-accounts.controller.js.map