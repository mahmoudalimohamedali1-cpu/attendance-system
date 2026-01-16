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
exports.LoanPaymentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const loan_payments_service_1 = require("./loan-payments.service");
const create_loan_payment_dto_1 = require("./dto/create-loan-payment.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let LoanPaymentsController = class LoanPaymentsController {
    constructor(service) {
        this.service = service;
    }
    create(dto, req) {
        return this.service.create(dto, req.user.id);
    }
    findByAdvance(advanceId) {
        return this.service.findByAdvance(advanceId);
    }
    getSummary(advanceId) {
        return this.service.getAdvanceSummary(advanceId);
    }
    getActiveLoans() {
        return this.service.getActiveLoansWithBalance();
    }
    remove(id) {
        return this.service.remove(id);
    }
};
exports.LoanPaymentsController = LoanPaymentsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR'),
    (0, swagger_1.ApiOperation)({ summary: 'تسجيل دفعة سداد جديدة' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_loan_payment_dto_1.CreateLoanPaymentDto, Object]),
    __metadata("design:returntype", void 0)
], LoanPaymentsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('advance/:advanceId'),
    (0, swagger_1.ApiOperation)({ summary: 'مدفوعات سلفة معينة' }),
    __param(0, (0, common_1.Param)('advanceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LoanPaymentsController.prototype, "findByAdvance", null);
__decorate([
    (0, common_1.Get)('summary/:advanceId'),
    (0, swagger_1.ApiOperation)({ summary: 'ملخص السلفة مع المدفوعات' }),
    __param(0, (0, common_1.Param)('advanceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LoanPaymentsController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('active'),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR'),
    (0, swagger_1.ApiOperation)({ summary: 'جميع السلف النشطة مع الأرصدة' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LoanPaymentsController.prototype, "getActiveLoans", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف دفعة (تصحيح خطأ)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LoanPaymentsController.prototype, "remove", null);
exports.LoanPaymentsController = LoanPaymentsController = __decorate([
    (0, swagger_1.ApiTags)('Loan Payments'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('loan-payments'),
    __metadata("design:paramtypes", [loan_payments_service_1.LoanPaymentsService])
], LoanPaymentsController);
//# sourceMappingURL=loan-payments.controller.js.map