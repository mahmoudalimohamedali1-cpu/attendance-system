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
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const dashboard_service_1 = require("./dashboard.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const dashboard_dto_1 = require("./dto/dashboard.dto");
let DashboardController = class DashboardController {
    constructor(service) {
        this.service = service;
    }
    async getDashboard(companyId, role, year, month) {
        const y = parseInt(year) || new Date().getFullYear();
        const m = parseInt(month) || new Date().getMonth() + 1;
        const visibility = dashboard_dto_1.ROLE_VISIBILITY[role] || dashboard_dto_1.ROLE_VISIBILITY.EMPLOYEE;
        const [summary, health, exceptions, trends] = await Promise.all([
            this.service.getSummary(companyId, y, m),
            this.service.getHealth(companyId, y, m),
            this.service.getExceptions(companyId, y, m),
            this.service.getTrends(companyId, 4),
        ]);
        return {
            role,
            summary: (0, dashboard_dto_1.filterByRole)(summary, visibility.summary),
            health: (0, dashboard_dto_1.filterByRole)(health, visibility.health),
            exceptions: (0, dashboard_dto_1.filterByRole)(exceptions, visibility.exceptions),
            trends: (0, dashboard_dto_1.filterByRole)(trends, visibility.trends),
        };
    }
    async getSummary(companyId, role, year, month) {
        const data = await this.service.getSummary(companyId, parseInt(year) || new Date().getFullYear(), parseInt(month) || new Date().getMonth() + 1);
        const visibility = dashboard_dto_1.ROLE_VISIBILITY[role] || dashboard_dto_1.ROLE_VISIBILITY.EMPLOYEE;
        return (0, dashboard_dto_1.filterByRole)(data, visibility.summary);
    }
    async getHealth(companyId, role, year, month) {
        const data = await this.service.getHealth(companyId, parseInt(year) || new Date().getFullYear(), parseInt(month) || new Date().getMonth() + 1);
        const visibility = dashboard_dto_1.ROLE_VISIBILITY[role] || dashboard_dto_1.ROLE_VISIBILITY.EMPLOYEE;
        return (0, dashboard_dto_1.filterByRole)(data, visibility.health);
    }
    async getExceptions(companyId, role, year, month) {
        const data = await this.service.getExceptions(companyId, parseInt(year) || new Date().getFullYear(), parseInt(month) || new Date().getMonth() + 1);
        const visibility = dashboard_dto_1.ROLE_VISIBILITY[role] || dashboard_dto_1.ROLE_VISIBILITY.EMPLOYEE;
        return (0, dashboard_dto_1.filterByRole)(data, visibility.exceptions);
    }
    async getTrends(companyId, role, months) {
        const data = await this.service.getTrends(companyId, parseInt(months || '4'));
        const visibility = dashboard_dto_1.ROLE_VISIBILITY[role] || dashboard_dto_1.ROLE_VISIBILITY.EMPLOYEE;
        return (0, dashboard_dto_1.filterByRole)(data, visibility.trends);
    }
    async getUsersStats(companyId) {
        return this.service.getUsersQuickStats(companyId);
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR', 'FINANCE'),
    (0, swagger_1.ApiOperation)({ summary: 'Role-based Dashboard - All data filtered by role' }),
    (0, swagger_1.ApiQuery)({ name: 'year', type: Number, example: 2025 }),
    (0, swagger_1.ApiQuery)({ name: 'month', type: Number, example: 1 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('role')),
    __param(2, (0, common_1.Query)('year')),
    __param(3, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR', 'FINANCE'),
    (0, swagger_1.ApiOperation)({ summary: 'Executive Summary - Main Dashboard Cards' }),
    (0, swagger_1.ApiQuery)({ name: 'year', type: Number, example: 2025 }),
    (0, swagger_1.ApiQuery)({ name: 'month', type: Number, example: 1 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('role')),
    __param(2, (0, common_1.Query)('year')),
    __param(3, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('health'),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR'),
    (0, swagger_1.ApiOperation)({ summary: 'Payroll Health Status - Can we lock?' }),
    (0, swagger_1.ApiQuery)({ name: 'year', type: Number, example: 2025 }),
    (0, swagger_1.ApiQuery)({ name: 'month', type: Number, example: 1 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('role')),
    __param(2, (0, common_1.Query)('year')),
    __param(3, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getHealth", null);
__decorate([
    (0, common_1.Get)('exceptions'),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR'),
    (0, swagger_1.ApiOperation)({ summary: 'Exceptions & Alerts' }),
    (0, swagger_1.ApiQuery)({ name: 'year', type: Number, example: 2025 }),
    (0, swagger_1.ApiQuery)({ name: 'month', type: Number, example: 1 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('role')),
    __param(2, (0, common_1.Query)('year')),
    __param(3, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getExceptions", null);
__decorate([
    (0, common_1.Get)('trends'),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR', 'FINANCE'),
    (0, swagger_1.ApiOperation)({ summary: 'Payroll Trends (Last N months)' }),
    (0, swagger_1.ApiQuery)({ name: 'months', type: Number, required: false, example: 4 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('role')),
    __param(2, (0, common_1.Query)('months')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getTrends", null);
__decorate([
    (0, common_1.Get)('users-stats'),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'Quick Users Stats for Users Page' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getUsersStats", null);
exports.DashboardController = DashboardController = __decorate([
    (0, swagger_1.ApiTags)('Dashboard'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('dashboard'),
    __metadata("design:paramtypes", [dashboard_service_1.DashboardService])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map