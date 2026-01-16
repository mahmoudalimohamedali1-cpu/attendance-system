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
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const reports_service_1 = require("./reports.service");
const report_query_dto_1 = require("./dto/report-query.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let ReportsController = class ReportsController {
    constructor(reportsService) {
        this.reportsService = reportsService;
    }
    async getDashboardStats(req) {
        return this.reportsService.getDashboardStats(req.user.companyId, req.user.id, req.user.role);
    }
    async getWeeklySummary(req) {
        return this.reportsService.getWeeklySummary(req.user.id, req.user.role);
    }
    async getAttendanceReport(req, query) {
        return this.reportsService.getAttendanceReport(query, req.user.id);
    }
    async getEmployeeReport(req, userId, query) {
        return this.reportsService.getEmployeeReport(userId, query, req.user.id);
    }
    async getBranchReport(branchId, query) {
        return this.reportsService.getBranchReport(branchId, query);
    }
    async getLateReport(req, query) {
        return this.reportsService.getLateReport(query, req.user.id);
    }
    async getPayrollSummary(req, query) {
        return this.reportsService.getPayrollSummary(query, req.user.companyId);
    }
    async exportToExcel(req, type, query, res) {
        const buffer = await this.reportsService.exportToExcel(type, query, req.user.id);
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="report-${type}-${Date.now()}.xlsx"`,
        });
        res.send(buffer);
    }
    async exportToPdf(req, type, query, res) {
        const buffer = await this.reportsService.exportToPdf(type, query, req.user.id);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="report-${type}-${Date.now()}.pdf"`,
        });
        res.send(buffer);
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, swagger_1.ApiOperation)({ summary: 'إحصائيات لوحة التحكم' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'الإحصائيات' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getDashboardStats", null);
__decorate([
    (0, common_1.Get)('weekly-summary'),
    (0, swagger_1.ApiOperation)({ summary: 'ملخص الأسبوع' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'ملخص الأسبوع' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getWeeklySummary", null);
__decorate([
    (0, common_1.Get)('attendance'),
    (0, swagger_1.ApiOperation)({ summary: 'تقرير الحضور (حسب صلاحياتك)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تقرير الحضور' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, report_query_dto_1.ReportQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getAttendanceReport", null);
__decorate([
    (0, common_1.Get)('employee/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'تقرير موظف (حسب صلاحياتك)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تقرير الموظف' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, report_query_dto_1.ReportQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getEmployeeReport", null);
__decorate([
    (0, common_1.Get)('branch/:branchId'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'تقرير فرع (للأدمن والمدراء فقط)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تقرير الفرع' }),
    __param(0, (0, common_1.Param)('branchId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, report_query_dto_1.ReportQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getBranchReport", null);
__decorate([
    (0, common_1.Get)('late'),
    (0, swagger_1.ApiOperation)({ summary: 'تقرير التأخيرات (حسب صلاحياتك)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تقرير التأخيرات' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, report_query_dto_1.ReportQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getLateReport", null);
__decorate([
    (0, common_1.Get)('payroll'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'ملخص الرواتب (للأدمن فقط)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'ملخص الرواتب' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, report_query_dto_1.ReportQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getPayrollSummary", null);
__decorate([
    (0, common_1.Get)('export/excel/:type'),
    (0, swagger_1.ApiOperation)({ summary: 'تصدير تقرير Excel' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('type')),
    __param(2, (0, common_1.Query)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, report_query_dto_1.ReportQueryDto, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "exportToExcel", null);
__decorate([
    (0, common_1.Get)('export/pdf/:type'),
    (0, swagger_1.ApiOperation)({ summary: 'تصدير تقرير PDF' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('type')),
    __param(2, (0, common_1.Query)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, report_query_dto_1.ReportQueryDto, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "exportToPdf", null);
exports.ReportsController = ReportsController = __decorate([
    (0, swagger_1.ApiTags)('reports'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('reports'),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map