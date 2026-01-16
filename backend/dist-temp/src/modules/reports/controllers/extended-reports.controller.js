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
exports.ExtendedReportsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../auth/guards/roles.guard");
const roles_decorator_1 = require("../../auth/decorators/roles.decorator");
const extended_reports_service_1 = require("../services/extended-reports.service");
const extended_report_dto_1 = require("../dto/extended-report.dto");
let ExtendedReportsController = class ExtendedReportsController {
    constructor(service) {
        this.service = service;
    }
    getCatalog() {
        return this.service.getReportsCatalog();
    }
    getDailyAttendance(req, query) {
        return this.service.getDailyAttendance(req.user.companyId, query);
    }
    getLateDetails(req, query) {
        return this.service.getLateDetailsReport(req.user.companyId, query);
    }
    getAbsence(req, query) {
        return this.service.getAbsenceReport(req.user.companyId, query);
    }
    getEarlyLeave(req, query) {
        return this.service.getEarlyLeaveReport(req.user.companyId, query);
    }
    getOvertime(req, query) {
        return this.service.getOvertimeReport(req.user.companyId, query);
    }
    getWorkFromHome(req, query) {
        return this.service.getWorkFromHomeReport(req.user.companyId, query);
    }
    getByBranch(req, query) {
        return this.service.getAttendanceByBranch(req.user.companyId, query);
    }
    getByDepartment(req, query) {
        return this.service.getAttendanceByDepartment(req.user.companyId, query);
    }
    getCompliance(req, query) {
        return this.service.getComplianceReport(req.user.companyId, query);
    }
    getSuspicious(req, query) {
        return this.service.getSuspiciousAttemptsReport(req.user.companyId, query);
    }
    getPayrollSummary(req, query) {
        return this.service.getPayrollSummary(req.user.companyId, query);
    }
    getGosi(req, query) {
        return this.service.getGosiReport(req.user.companyId, query);
    }
    getAdvances(req, query) {
        return this.service.getAdvancesReport(req.user.companyId, query);
    }
    getEmployees(req, query) {
        return this.service.getEmployeeList(req.user.companyId, query);
    }
    getContractExpiry(req, query) {
        return this.service.getContractExpiryReport(req.user.companyId, query);
    }
    getIqamaExpiry(req, query) {
        return this.service.getIqamaExpiryReport(req.user.companyId, query);
    }
    getNationalities(req) {
        return this.service.getNationalityAnalysis(req.user.companyId);
    }
    getLeaveBalance(req, query) {
        return this.service.getLeaveBalanceReport(req.user.companyId, query);
    }
    getLeaveRequests(req, query) {
        return this.service.getLeaveRequestsReport(req.user.companyId, query);
    }
    getCustodyInventory(req, query) {
        return this.service.getCustodyInventory(req.user.companyId, query);
    }
    getExecutiveDashboard(req) {
        return this.service.getExecutiveDashboard(req.user.companyId);
    }
};
exports.ExtendedReportsController = ExtendedReportsController;
__decorate([
    (0, common_1.Get)('catalog'),
    (0, swagger_1.ApiOperation)({ summary: 'قائمة جميع التقارير المتاحة' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ExtendedReportsController.prototype, "getCatalog", null);
__decorate([
    (0, common_1.Get)('attendance/daily'),
    (0, swagger_1.ApiOperation)({ summary: 'تقرير الحضور اليومي' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, extended_report_dto_1.AttendanceDetailedQueryDto]),
    __metadata("design:returntype", void 0)
], ExtendedReportsController.prototype, "getDailyAttendance", null);
__decorate([
    (0, common_1.Get)('attendance/late-detailed'),
    (0, swagger_1.ApiOperation)({ summary: 'تقرير التأخيرات التفصيلي' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, extended_report_dto_1.LateReportQueryDto]),
    __metadata("design:returntype", void 0)
], ExtendedReportsController.prototype, "getLateDetails", null);
__decorate([
    (0, common_1.Get)('attendance/absence'),
    (0, swagger_1.ApiOperation)({ summary: 'تقرير الغياب' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, extended_report_dto_1.ExtendedReportQueryDto]),
    __metadata("design:returntype", void 0)
], ExtendedReportsController.prototype, "getAbsence", null);
__decorate([
    (0, common_1.Get)('attendance/early-leave'),
    (0, swagger_1.ApiOperation)({ summary: 'تقرير الانصراف المبكر' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, extended_report_dto_1.ExtendedReportQueryDto]),
    __metadata("design:returntype", void 0)
], ExtendedReportsController.prototype, "getEarlyLeave", null);
__decorate([
    (0, common_1.Get)('attendance/overtime'),
    (0, swagger_1.ApiOperation)({ summary: 'تقرير العمل الإضافي' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, extended_report_dto_1.OvertimeReportQueryDto]),
    __metadata("design:returntype", void 0)
], ExtendedReportsController.prototype, "getOvertime", null);
__decorate([
    (0, common_1.Get)('attendance/work-from-home'),
    (0, swagger_1.ApiOperation)({ summary: 'تقرير العمل من المنزل' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, extended_report_dto_1.ExtendedReportQueryDto]),
    __metadata("design:returntype", void 0)
], ExtendedReportsController.prototype, "getWorkFromHome", null);
__decorate([
    (0, common_1.Get)('attendance/by-branch'),
    (0, swagger_1.ApiOperation)({ summary: 'ملخص الحضور حسب الفرع' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, extended_report_dto_1.ExtendedReportQueryDto]),
    __metadata("design:returntype", void 0)
], ExtendedReportsController.prototype, "getByBranch", null);
__decorate([
    (0, common_1.Get)('attendance/by-department'),
    (0, swagger_1.ApiOperation)({ summary: 'ملخص الحضور حسب القسم' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, extended_report_dto_1.ExtendedReportQueryDto]),
    __metadata("design:returntype", void 0)
], ExtendedReportsController.prototype, "getByDepartment", null);
__decorate([
    (0, common_1.Get)('attendance/compliance'),
    (0, swagger_1.ApiOperation)({ summary: 'تقرير الالتزام بالدوام' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, extended_report_dto_1.ExtendedReportQueryDto]),
    __metadata("design:returntype", void 0)
], ExtendedReportsController.prototype, "getCompliance", null);
__decorate([
    (0, common_1.Get)('attendance/suspicious'),
    (0, swagger_1.ApiOperation)({ summary: 'تقرير المحاولات المشبوهة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, extended_report_dto_1.ExtendedReportQueryDto]),
    __metadata("design:returntype", void 0)
], ExtendedReportsController.prototype, "getSuspicious", null);
__decorate([
    (0, common_1.Get)('payroll/summary'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR', 'FINANCE'),
    (0, swagger_1.ApiOperation)({ summary: 'ملخص الرواتب الشهري' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, extended_report_dto_1.PayrollReportQueryDto]),
    __metadata("design:returntype", void 0)
], ExtendedReportsController.prototype, "getPayrollSummary", null);
__decorate([
    (0, common_1.Get)('payroll/gosi'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR', 'FINANCE'),
    (0, swagger_1.ApiOperation)({ summary: 'تقرير التأمينات GOSI' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, extended_report_dto_1.PayrollReportQueryDto]),
    __metadata("design:returntype", void 0)
], ExtendedReportsController.prototype, "getGosi", null);
__decorate([
    (0, common_1.Get)('payroll/advances'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR', 'FINANCE'),
    (0, swagger_1.ApiOperation)({ summary: 'تقرير السلف والقروض' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, extended_report_dto_1.ExtendedReportQueryDto]),
    __metadata("design:returntype", void 0)
], ExtendedReportsController.prototype, "getAdvances", null);
__decorate([
    (0, common_1.Get)('hr/employees'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'سجل الموظفين' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, extended_report_dto_1.EmployeeReportQueryDto]),
    __metadata("design:returntype", void 0)
], ExtendedReportsController.prototype, "getEmployees", null);
__decorate([
    (0, common_1.Get)('hr/contract-expiry'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR'),
    (0, swagger_1.ApiOperation)({ summary: 'انتهاء العقود' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, extended_report_dto_1.ContractExpiryQueryDto]),
    __metadata("design:returntype", void 0)
], ExtendedReportsController.prototype, "getContractExpiry", null);
__decorate([
    (0, common_1.Get)('hr/iqama-expiry'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR'),
    (0, swagger_1.ApiOperation)({ summary: 'انتهاء الإقامات' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, extended_report_dto_1.ContractExpiryQueryDto]),
    __metadata("design:returntype", void 0)
], ExtendedReportsController.prototype, "getIqamaExpiry", null);
__decorate([
    (0, common_1.Get)('hr/nationalities'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR'),
    (0, swagger_1.ApiOperation)({ summary: 'تحليل الجنسيات (السعودة)' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ExtendedReportsController.prototype, "getNationalities", null);
__decorate([
    (0, common_1.Get)('leaves/balance'),
    (0, swagger_1.ApiOperation)({ summary: 'رصيد الإجازات' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, extended_report_dto_1.LeaveReportQueryDto]),
    __metadata("design:returntype", void 0)
], ExtendedReportsController.prototype, "getLeaveBalance", null);
__decorate([
    (0, common_1.Get)('leaves/requests'),
    (0, swagger_1.ApiOperation)({ summary: 'طلبات الإجازات' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, extended_report_dto_1.LeaveReportQueryDto]),
    __metadata("design:returntype", void 0)
], ExtendedReportsController.prototype, "getLeaveRequests", null);
__decorate([
    (0, common_1.Get)('custody/inventory'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'جرد العهد' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, extended_report_dto_1.CustodyReportQueryDto]),
    __metadata("design:returntype", void 0)
], ExtendedReportsController.prototype, "getCustodyInventory", null);
__decorate([
    (0, common_1.Get)('executive/dashboard'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'لوحة التحكم التنفيذية' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ExtendedReportsController.prototype, "getExecutiveDashboard", null);
exports.ExtendedReportsController = ExtendedReportsController = __decorate([
    (0, swagger_1.ApiTags)('executive-reports'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('reports'),
    __metadata("design:paramtypes", [extended_reports_service_1.ExtendedReportsService])
], ExtendedReportsController);
//# sourceMappingURL=extended-reports.controller.js.map