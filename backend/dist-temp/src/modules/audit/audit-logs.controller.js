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
exports.AuditLogsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const status_log_service_1 = require("../../common/services/status-log.service");
let AuditLogsController = class AuditLogsController {
    constructor(statusLogService) {
        this.statusLogService = statusLogService;
    }
    async getEntityLogs(entityType, entityId, req) {
        return this.statusLogService.getLogsForEntity(entityType, entityId, req.user.companyId);
    }
    async getLogsByPeriod(req, startDate, endDate) {
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();
        return this.statusLogService.getLogsByPeriod(req.user.companyId, start, end);
    }
    async getLogsByUser(userId, req) {
        return this.statusLogService.getLogsByUser(req.user.companyId, userId);
    }
    async exportCsv(req, res, startDate, endDate, entityType) {
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();
        const logs = await this.statusLogService.getLogsByPeriod(req.user.companyId, start, end);
        const filteredLogs = entityType
            ? logs.filter((log) => log.entityType === entityType)
            : logs;
        const header = 'النوع,معرف الكيان,من الحالة,إلى الحالة,السبب,بواسطة,التاريخ\n';
        const rows = filteredLogs.map((log) => {
            const date = new Date(log.createdAt).toLocaleString('ar-SA');
            return `${log.entityType},${log.entityId},${log.fromStatus},${log.toStatus},${log.reason || ''},${log.changedByName || ''},${date}`;
        }).join('\n');
        const BOM = '\uFEFF';
        const csv = BOM + header + rows;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
        res.send(csv);
    }
    async getStuckStats(req) {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        return {
            message: 'Use StuckDetectionService.getStuckStats() for detailed stats',
            threshold: '3 days',
        };
    }
};
exports.AuditLogsController = AuditLogsController;
__decorate([
    (0, common_1.Get)('submissions/:entityType/:entityId/logs'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'جلب سجل تغييرات الحالة لكيان معين' }),
    (0, swagger_1.ApiParam)({ name: 'entityType', enum: ['MUDAD', 'WPS', 'QIWA'] }),
    (0, swagger_1.ApiParam)({ name: 'entityId', description: 'UUID of the entity' }),
    __param(0, (0, common_1.Param)('entityType')),
    __param(1, (0, common_1.Param)('entityId')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "getEntityLogs", null);
__decorate([
    (0, common_1.Get)('submissions/logs'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'جلب جميع سجلات التدقيق لفترة محددة' }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false, description: 'ISO date string' }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false, description: 'ISO date string' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "getLogsByPeriod", null);
__decorate([
    (0, common_1.Get)('submissions/by-user/:userId'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'جلب سجلات مستخدم معين (لمراجعة الصلاحيات)' }),
    (0, swagger_1.ApiParam)({ name: 'userId', description: 'UUID of the user' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "getLogsByUser", null);
__decorate([
    (0, common_1.Get)('submissions/export/csv'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'تصدير سجلات التدقيق بصيغة CSV' }),
    (0, swagger_1.ApiProduces)('text/csv'),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false, description: 'ISO date string' }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false, description: 'ISO date string' }),
    (0, swagger_1.ApiQuery)({ name: 'entityType', required: false, enum: ['MUDAD', 'WPS', 'QIWA'] }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __param(4, (0, common_1.Query)('entityType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, String]),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "exportCsv", null);
__decorate([
    (0, common_1.Get)('submissions/stuck-stats'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'إحصائيات التقديمات المعلقة (> 3 أيام)' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "getStuckStats", null);
exports.AuditLogsController = AuditLogsController = __decorate([
    (0, swagger_1.ApiTags)('Audit - سجل التدقيق'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('audit'),
    __metadata("design:paramtypes", [status_log_service_1.StatusLogService])
], AuditLogsController);
//# sourceMappingURL=audit-logs.controller.js.map