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
exports.QiwaController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const permission_guard_1 = require("../auth/guards/permission.guard");
const require_permission_decorator_1 = require("../auth/decorators/require-permission.decorator");
const qiwa_service_1 = require("./qiwa.service");
let QiwaController = class QiwaController {
    constructor(qiwaService) {
        this.qiwaService = qiwaService;
    }
    getContracts(req, status) {
        return this.qiwaService.exportContracts(req.user.companyId, status);
    }
    async downloadContractsCsv(req, res, status) {
        const csv = await this.qiwaService.exportContractsCsv(req.user.companyId, status);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=qiwa-contracts.csv');
        res.send(csv);
    }
    getStats(req) {
        return this.qiwaService.getContractStats(req.user.companyId);
    }
    getActionsRequired(req) {
        return this.qiwaService.getContractsRequiringAction(req.user.companyId);
    }
};
exports.QiwaController = QiwaController;
__decorate([
    (0, common_1.Get)('contracts'),
    (0, require_permission_decorator_1.RequirePermission)('QIWA_EXPORT'),
    (0, swagger_1.ApiOperation)({ summary: 'تصدير العقود بصيغة متوافقة مع قوى' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], QiwaController.prototype, "getContracts", null);
__decorate([
    (0, common_1.Get)('contracts/csv'),
    (0, require_permission_decorator_1.RequirePermission)('QIWA_EXPORT'),
    (0, swagger_1.ApiOperation)({ summary: 'تحميل ملف CSV للعقود' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], QiwaController.prototype, "downloadContractsCsv", null);
__decorate([
    (0, common_1.Get)('contracts/stats'),
    (0, require_permission_decorator_1.RequirePermission)('QIWA_EXPORT'),
    (0, swagger_1.ApiOperation)({ summary: 'إحصائيات العقود' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], QiwaController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('contracts/actions-required'),
    (0, require_permission_decorator_1.RequirePermission)('QIWA_EXPORT'),
    (0, swagger_1.ApiOperation)({ summary: 'العقود التي تحتاج إجراء (انتهاء قريب)' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], QiwaController.prototype, "getActionsRequired", null);
exports.QiwaController = QiwaController = __decorate([
    (0, swagger_1.ApiTags)('قوى - Qiwa'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permission_guard_1.PermissionGuard),
    (0, common_1.Controller)('qiwa'),
    __metadata("design:paramtypes", [qiwa_service_1.QiwaService])
], QiwaController);
//# sourceMappingURL=qiwa.controller.js.map