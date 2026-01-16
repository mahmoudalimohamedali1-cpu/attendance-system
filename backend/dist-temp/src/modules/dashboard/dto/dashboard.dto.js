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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_VISIBILITY = exports.RoleBasedDashboardDto = exports.DashboardTrendsDto = exports.DashboardExceptionsDto = exports.DashboardHealthDto = exports.DashboardSummaryDto = void 0;
exports.filterByRole = filterByRole;
const swagger_1 = require("@nestjs/swagger");
class DashboardSummaryDto {
}
exports.DashboardSummaryDto = DashboardSummaryDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DashboardSummaryDto.prototype, "period", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "headcount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "grossTotal", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "deductionsTotal", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "gosiTotal", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "netTotal", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "employerGosiTotal", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "ledgerDraftAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "ledgerPostedAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "eosSettlementTotal", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DashboardSummaryDto.prototype, "wpsStatus", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], DashboardSummaryDto.prototype, "isLocked", void 0);
class DashboardHealthDto {
}
exports.DashboardHealthDto = DashboardHealthDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DashboardHealthDto.prototype, "attendance", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DashboardHealthDto.prototype, "leaves", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DashboardHealthDto.prototype, "advances", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DashboardHealthDto.prototype, "policies", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DashboardHealthDto.prototype, "gosiConfig", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], DashboardHealthDto.prototype, "payrollCalculated", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], DashboardHealthDto.prototype, "payrollLocked", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", String)
], DashboardHealthDto.prototype, "mudadStatus", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Boolean)
], DashboardHealthDto.prototype, "wpsReady", void 0);
class DashboardExceptionsDto {
}
exports.DashboardExceptionsDto = DashboardExceptionsDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardExceptionsDto.prototype, "lateEmployees", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardExceptionsDto.prototype, "earlyDepartureCases", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardExceptionsDto.prototype, "absentWithoutLeave", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardExceptionsDto.prototype, "adjustedPayslips", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardExceptionsDto.prototype, "highVarianceEmployees", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Number)
], DashboardExceptionsDto.prototype, "noBankAccountCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Number)
], DashboardExceptionsDto.prototype, "gosiSkippedCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Number)
], DashboardExceptionsDto.prototype, "stuckSubmissionsCount", void 0);
class DashboardTrendsDto {
}
exports.DashboardTrendsDto = DashboardTrendsDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Array)
], DashboardTrendsDto.prototype, "periods", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Array)
], DashboardTrendsDto.prototype, "gross", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Array)
], DashboardTrendsDto.prototype, "net", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Array)
], DashboardTrendsDto.prototype, "gosi", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Array)
], DashboardTrendsDto.prototype, "otHours", void 0);
class RoleBasedDashboardDto {
}
exports.RoleBasedDashboardDto = RoleBasedDashboardDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RoleBasedDashboardDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Object)
], RoleBasedDashboardDto.prototype, "summary", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Object)
], RoleBasedDashboardDto.prototype, "health", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Object)
], RoleBasedDashboardDto.prototype, "exceptions", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Object)
], RoleBasedDashboardDto.prototype, "trends", void 0);
exports.ROLE_VISIBILITY = {
    ADMIN: {
        summary: ['period', 'headcount', 'grossTotal', 'deductionsTotal', 'gosiTotal', 'netTotal', 'employerGosiTotal', 'ledgerDraftAmount', 'ledgerPostedAmount', 'eosSettlementTotal', 'wpsStatus', 'isLocked'],
        health: ['attendance', 'leaves', 'advances', 'policies', 'gosiConfig', 'payrollCalculated', 'payrollLocked', 'mudadStatus', 'wpsReady'],
        exceptions: ['lateEmployees', 'earlyDepartureCases', 'absentWithoutLeave', 'adjustedPayslips', 'highVarianceEmployees', 'noBankAccountCount', 'gosiSkippedCount', 'stuckSubmissionsCount'],
        trends: ['periods', 'gross', 'net', 'gosi', 'otHours'],
    },
    HR: {
        summary: ['period', 'headcount', 'isLocked'],
        health: ['attendance', 'leaves', 'advances', 'payrollCalculated', 'payrollLocked', 'mudadStatus', 'wpsReady'],
        exceptions: ['lateEmployees', 'earlyDepartureCases', 'absentWithoutLeave', 'noBankAccountCount'],
        trends: ['periods', 'otHours'],
    },
    FINANCE: {
        summary: ['period', 'headcount', 'grossTotal', 'deductionsTotal', 'gosiTotal', 'netTotal', 'employerGosiTotal', 'ledgerDraftAmount', 'ledgerPostedAmount', 'eosSettlementTotal', 'wpsStatus', 'isLocked'],
        health: ['gosiConfig', 'payrollCalculated', 'payrollLocked', 'wpsReady'],
        exceptions: ['adjustedPayslips', 'highVarianceEmployees', 'noBankAccountCount', 'gosiSkippedCount'],
        trends: ['periods', 'gross', 'net', 'gosi'],
    },
    EMPLOYEE: {
        summary: [],
        health: [],
        exceptions: [],
        trends: [],
    }
};
function filterByRole(data, allowedKeys) {
    const result = {};
    for (const key of allowedKeys) {
        if (key in data) {
            result[key] = data[key];
        }
    }
    return result;
}
//# sourceMappingURL=dashboard.dto.js.map