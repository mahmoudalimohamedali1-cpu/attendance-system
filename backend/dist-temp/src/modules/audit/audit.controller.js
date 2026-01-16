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
exports.AuditController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const audit_service_1 = require("./audit.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let AuditController = class AuditController {
    constructor(auditService) {
        this.auditService = auditService;
    }
    async getAuditLogs(userId, entity, entityId, action, startDate, endDate, page, limit) {
        return this.auditService.getAuditLogs({
            userId,
            entity,
            entityId,
            action,
            startDate,
            endDate,
            page,
            limit,
        });
    }
    async getSuspiciousAttempts(userId, attemptType, startDate, endDate, page, limit) {
        return this.auditService.getSuspiciousAttempts({
            userId,
            attemptType,
            startDate,
            endDate,
            page,
            limit,
        });
    }
};
exports.AuditController = AuditController;
__decorate([
    (0, common_1.Get)('logs'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'سجل التدقيق' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'سجلات التدقيق' }),
    __param(0, (0, common_1.Query)('userId')),
    __param(1, (0, common_1.Query)('entity')),
    __param(2, (0, common_1.Query)('entityId')),
    __param(3, (0, common_1.Query)('action')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('page')),
    __param(7, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, String, String, Number, Number]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "getAuditLogs", null);
__decorate([
    (0, common_1.Get)('suspicious'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'محاولات مشبوهة' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'المحاولات المشبوهة' }),
    __param(0, (0, common_1.Query)('userId')),
    __param(1, (0, common_1.Query)('attemptType')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Number, Number]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "getSuspiciousAttempts", null);
exports.AuditController = AuditController = __decorate([
    (0, swagger_1.ApiTags)('audit'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('audit'),
    __metadata("design:paramtypes", [audit_service_1.AuditService])
], AuditController);
//# sourceMappingURL=audit.controller.js.map