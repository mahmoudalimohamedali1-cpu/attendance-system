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
exports.WpsExportController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const wps_export_service_1 = require("./wps-export.service");
const wps_tracking_service_1 = require("../wps-tracking/wps-tracking.service");
const crypto = require("crypto");
let WpsExportController = class WpsExportController {
    constructor(wpsExportService, wpsTrackingService) {
        this.wpsExportService = wpsExportService;
        this.wpsTrackingService = wpsTrackingService;
    }
    async validateExport(payrollRunId, companyId) {
        return this.wpsExportService.validateExportReadiness(payrollRunId, companyId);
    }
    async exportCsv(payrollRunId, companyId, userId, res) {
        const result = await this.wpsExportService.generateWpsFile(payrollRunId, companyId);
        const fileContent = '\uFEFF' + result.content;
        const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex');
        try {
            await this.wpsTrackingService.createSubmission({
                payrollRunId,
                filename: result.filename,
                fileFormat: 'CSV',
                fileHashSha256: fileHash,
            }, companyId, userId);
        }
        catch (err) {
            console.error('Failed to create WPS tracking record:', err);
        }
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`);
        res.send(fileContent);
    }
    async exportSarie(payrollRunId, companyId, userId, res) {
        const result = await this.wpsExportService.generateSarieFile(payrollRunId, companyId);
        const fileHash = crypto.createHash('sha256').update(result.content).digest('hex');
        try {
            await this.wpsTrackingService.createSubmission({
                payrollRunId,
                filename: result.filename,
                fileFormat: 'SARIE',
                fileHashSha256: fileHash,
            }, companyId, userId);
        }
        catch (err) {
            console.error('Failed to create WPS tracking record:', err);
        }
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`);
        res.send(result.content);
    }
    async exportSummary(payrollRunId, companyId) {
        const result = await this.wpsExportService.generateWpsFile(payrollRunId, companyId);
        return {
            filename: result.filename,
            recordCount: result.recordCount,
            totalAmount: result.totalAmount,
            errors: result.errors,
        };
    }
    async getMissingBank(companyId) {
        return this.wpsExportService.getEmployeesWithoutBank(companyId);
    }
};
exports.WpsExportController = WpsExportController;
__decorate([
    (0, common_1.Get)(':payrollRunId/validate'),
    (0, swagger_1.ApiOperation)({ summary: 'التحقق من جاهزية التصدير' }),
    __param(0, (0, common_1.Param)('payrollRunId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], WpsExportController.prototype, "validateExport", null);
__decorate([
    (0, common_1.Get)(':payrollRunId/csv'),
    (0, swagger_1.ApiOperation)({ summary: 'تصدير ملف WPS بصيغة CSV' }),
    __param(0, (0, common_1.Param)('payrollRunId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], WpsExportController.prototype, "exportCsv", null);
__decorate([
    (0, common_1.Get)(':payrollRunId/sarie'),
    (0, swagger_1.ApiOperation)({ summary: 'تصدير ملف WPS بصيغة SARIE (البنك المركزي)' }),
    __param(0, (0, common_1.Param)('payrollRunId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], WpsExportController.prototype, "exportSarie", null);
__decorate([
    (0, common_1.Get)(':payrollRunId/summary'),
    (0, swagger_1.ApiOperation)({ summary: 'ملخص التصدير بدون تنزيل' }),
    __param(0, (0, common_1.Param)('payrollRunId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], WpsExportController.prototype, "exportSummary", null);
__decorate([
    (0, common_1.Get)('missing-bank'),
    (0, swagger_1.ApiOperation)({ summary: 'قائمة الموظفين بدون حساب بنكي' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WpsExportController.prototype, "getMissingBank", null);
exports.WpsExportController = WpsExportController = __decorate([
    (0, swagger_1.ApiTags)('WPS Export'),
    (0, common_1.Controller)('wps-export'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [wps_export_service_1.WpsExportService,
        wps_tracking_service_1.WpsTrackingService])
], WpsExportController);
//# sourceMappingURL=wps-export.controller.js.map