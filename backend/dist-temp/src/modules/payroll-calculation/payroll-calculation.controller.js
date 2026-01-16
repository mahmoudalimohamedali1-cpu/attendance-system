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
exports.PayrollCalculationController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const payroll_calculation_service_1 = require("./payroll-calculation.service");
const payroll_validation_service_1 = require("./payroll-validation.service");
const wps_generator_service_1 = require("./wps-generator.service");
const formula_engine_service_1 = require("./services/formula-engine.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const permissions_service_1 = require("../permissions/permissions.service");
const common_2 = require("@nestjs/common");
let PayrollCalculationController = class PayrollCalculationController {
    constructor(service, validationService, wpsService, formulaEngine, permissionsService) {
        this.service = service;
        this.validationService = validationService;
        this.wpsService = wpsService;
        this.formulaEngine = formulaEngine;
        this.permissionsService = permissionsService;
    }
    async previewCalculation(employeeId, year, month, userId, companyId) {
        const access = await this.permissionsService.canAccessEmployee(userId, companyId, 'PAYROLL_VIEW', employeeId);
        if (!access.hasAccess) {
            throw new common_2.ForbiddenException(`ليس لديك صلاحية للوصول لبيانات هذا الموظف: ${access.reason}`);
        }
        return this.service.previewCalculation(employeeId, companyId, parseInt(year), parseInt(month));
    }
    async validatePeriod(periodId, companyId) {
        return this.validationService.validatePeriod(periodId, companyId);
    }
    async exportWpsExcel(runId, companyId, res) {
        const buffer = await this.wpsService.generateWpsExcel(runId, companyId);
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename=WPS_${runId}.xlsx`,
            'Content-Length': buffer.length,
        });
        res.send(buffer);
    }
    async exportWpsCsv(runId, companyId, res) {
        const csv = await this.wpsService.generateWpsCsv(runId, companyId);
        res.set({
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename=WPS_${runId}.csv`,
        });
        res.send(csv);
    }
    async testFormula(dto) {
        const variables = this.formulaEngine.buildVariableContext({
            basicSalary: dto.basicSalary || 5000,
            ...dto.variables,
        });
        const result = this.formulaEngine.evaluate(dto.formula, variables);
        return {
            formula: dto.formula,
            result: result.value,
            error: result.error,
            usedVariables: Object.keys(variables).filter(k => dto.formula.toUpperCase().includes(k)).map(k => ({ name: k, value: variables[k] })),
            supportedVariables: this.formulaEngine.getSupportedVariables(),
            supportedFunctions: this.formulaEngine.getSupportedFunctions(),
        };
    }
    async getFormulaInfo() {
        return {
            supportedVariables: this.formulaEngine.getSupportedVariables(),
            supportedFunctions: this.formulaEngine.getSupportedFunctions(),
            examples: [
                { formula: 'BASIC * 0.25', description: 'بدل السكن 25% من الأساسي' },
                { formula: 'GOSI_BASE * GOSI_RATE_EMP', description: 'خصم GOSI للموظف' },
                { formula: 'OT_HOURS * HOURLY_RATE * 1.5', description: 'الوقت الإضافي' },
                { formula: 'if(DAYS_ABSENT > 0, DAILY_RATE * DAYS_ABSENT, 0)', description: 'خصم الغياب' },
                { formula: 'max(0, LATE_MINUTES - 15) * MINUTE_RATE', description: 'خصم التأخير مع فترة سماح' },
            ],
        };
    }
};
exports.PayrollCalculationController = PayrollCalculationController;
__decorate([
    (0, common_1.Get)('preview'),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR'),
    (0, swagger_1.ApiOperation)({ summary: 'معاينة حساب راتب موظف قبل التشغيل' }),
    (0, swagger_1.ApiQuery)({ name: 'employeeId', required: true }),
    (0, swagger_1.ApiQuery)({ name: 'year', required: true }),
    (0, swagger_1.ApiQuery)({ name: 'month', required: true }),
    __param(0, (0, common_1.Query)('employeeId')),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('month')),
    __param(3, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(4, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], PayrollCalculationController.prototype, "previewCalculation", null);
__decorate([
    (0, common_1.Get)('validate-period'),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR'),
    (0, swagger_1.ApiOperation)({ summary: 'التحقق من بيانات الموظفين قبل تشغيل הرواتب' }),
    (0, swagger_1.ApiQuery)({ name: 'periodId', required: true }),
    __param(0, (0, common_1.Query)('periodId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PayrollCalculationController.prototype, "validatePeriod", null);
__decorate([
    (0, common_1.Get)('export-wps-excel'),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR'),
    (0, swagger_1.ApiOperation)({ summary: 'تصدير ملف حماية الأجور (WPS) بتنسيق Excel' }),
    (0, swagger_1.ApiQuery)({ name: 'runId', required: true }),
    __param(0, (0, common_1.Query)('runId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PayrollCalculationController.prototype, "exportWpsExcel", null);
__decorate([
    (0, common_1.Get)('export-wps-csv'),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR'),
    (0, swagger_1.ApiOperation)({ summary: 'تصدير ملف حماية الأجور (WPS) بتنسيق CSV' }),
    (0, swagger_1.ApiQuery)({ name: 'runId', required: true }),
    __param(0, (0, common_1.Query)('runId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PayrollCalculationController.prototype, "exportWpsCsv", null);
__decorate([
    (0, common_1.Post)('test-formula'),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR'),
    (0, swagger_1.ApiOperation)({ summary: 'اختبار معادلة حساب الراتب' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PayrollCalculationController.prototype, "testFormula", null);
__decorate([
    (0, common_1.Get)('formula-info'),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR'),
    (0, swagger_1.ApiOperation)({ summary: 'معلومات محرك المعادلات' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PayrollCalculationController.prototype, "getFormulaInfo", null);
exports.PayrollCalculationController = PayrollCalculationController = __decorate([
    (0, swagger_1.ApiTags)('Payroll Calculation'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('payroll-calculation'),
    __metadata("design:paramtypes", [payroll_calculation_service_1.PayrollCalculationService,
        payroll_validation_service_1.PayrollValidationService,
        wps_generator_service_1.WpsGeneratorService,
        formula_engine_service_1.FormulaEngineService,
        permissions_service_1.PermissionsService])
], PayrollCalculationController);
//# sourceMappingURL=payroll-calculation.controller.js.map