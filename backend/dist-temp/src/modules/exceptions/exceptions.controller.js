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
exports.ExceptionsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const exceptions_service_1 = require("./exceptions.service");
let ExceptionsController = class ExceptionsController {
    constructor(exceptionsService) {
        this.exceptionsService = exceptionsService;
    }
    async validateEmployees(companyId) {
        return this.exceptionsService.validateEmployeesForPayroll(companyId);
    }
    async validatePayrollRun(payrollRunId, companyId) {
        return this.exceptionsService.validatePayrollRun(payrollRunId, companyId);
    }
    async getQuickStats(companyId) {
        return this.exceptionsService.getQuickStats(companyId);
    }
};
exports.ExceptionsController = ExceptionsController;
__decorate([
    (0, common_1.Get)('validate'),
    (0, swagger_1.ApiOperation)({ summary: 'فحص شامل للموظفين قبل الرواتب' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ExceptionsController.prototype, "validateEmployees", null);
__decorate([
    (0, common_1.Get)('validate/:payrollRunId'),
    (0, swagger_1.ApiOperation)({ summary: 'فحص مسير رواتب معين' }),
    __param(0, (0, common_1.Param)('payrollRunId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ExceptionsController.prototype, "validatePayrollRun", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'إحصائيات سريعة للوحة القيادة' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ExceptionsController.prototype, "getQuickStats", null);
exports.ExceptionsController = ExceptionsController = __decorate([
    (0, swagger_1.ApiTags)('Exceptions Center'),
    (0, common_1.Controller)('exceptions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [exceptions_service_1.ExceptionsService])
], ExceptionsController);
//# sourceMappingURL=exceptions.controller.js.map