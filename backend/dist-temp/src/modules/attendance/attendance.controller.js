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
exports.AttendanceController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const attendance_service_1 = require("./attendance.service");
const check_in_dto_1 = require("./dto/check-in.dto");
const check_out_dto_1 = require("./dto/check-out.dto");
const attendance_query_dto_1 = require("./dto/attendance-query.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let AttendanceController = class AttendanceController {
    constructor(attendanceService) {
        this.attendanceService = attendanceService;
    }
    async checkIn(userId, checkInDto) {
        return this.attendanceService.checkIn(userId, checkInDto);
    }
    async checkOut(userId, checkOutDto) {
        return this.attendanceService.checkOut(userId, checkOutDto);
    }
    async getTodayAttendance(userId, companyId) {
        return this.attendanceService.getTodayAttendance(userId, companyId);
    }
    async getAttendanceHistory(userId, companyId, query) {
        return this.attendanceService.getAttendanceHistory(userId, companyId, query);
    }
    async getMonthlyStats(userId, companyId, year, month) {
        return this.attendanceService.getMonthlyStats(userId, companyId, year, month);
    }
    async getAllAttendance(userId, companyId, query) {
        return this.attendanceService.getAllAttendance(userId, companyId, query);
    }
    async getDailyStats(companyId, date) {
        return this.attendanceService.getDailyStats(companyId, date ? new Date(date) : undefined);
    }
};
exports.AttendanceController = AttendanceController;
__decorate([
    (0, common_1.Post)('check-in'),
    (0, swagger_1.ApiOperation)({ summary: 'تسجيل الحضور' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'تم تسجيل الحضور بنجاح' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'خطأ في البيانات أو خارج النطاق' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'موقع وهمي مكتشف' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, check_in_dto_1.CheckInDto]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "checkIn", null);
__decorate([
    (0, common_1.Post)('check-out'),
    (0, swagger_1.ApiOperation)({ summary: 'تسجيل الانصراف' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'تم تسجيل الانصراف بنجاح' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'خطأ في البيانات' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, check_out_dto_1.CheckOutDto]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "checkOut", null);
__decorate([
    (0, common_1.Get)('today'),
    (0, swagger_1.ApiOperation)({ summary: 'الحصول على حضور اليوم' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'بيانات الحضور لليوم' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "getTodayAttendance", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, swagger_1.ApiOperation)({ summary: 'سجل الحضور والانصراف' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة سجلات الحضور' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, attendance_query_dto_1.AttendanceQueryDto]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "getAttendanceHistory", null);
__decorate([
    (0, common_1.Get)('stats/monthly/:year/:month'),
    (0, swagger_1.ApiOperation)({ summary: 'إحصائيات الحضور الشهرية' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'إحصائيات الشهر' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, common_1.Param)('year', common_1.ParseIntPipe)),
    __param(3, (0, common_1.Param)('month', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, Number]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "getMonthlyStats", null);
__decorate([
    (0, common_1.Get)('admin/all'),
    (0, swagger_1.ApiOperation)({ summary: 'جميع سجلات الحضور (حسب صلاحياتك)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة سجلات الحضور التي لديك صلاحية عليها' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, attendance_query_dto_1.AttendanceQueryDto]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "getAllAttendance", null);
__decorate([
    (0, common_1.Get)('admin/daily-stats'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'إحصائيات الحضور اليومية' }),
    (0, swagger_1.ApiQuery)({ name: 'date', required: false, description: 'تاريخ الإحصائيات' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'إحصائيات اليوم' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "getDailyStats", null);
exports.AttendanceController = AttendanceController = __decorate([
    (0, swagger_1.ApiTags)('attendance'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('attendance'),
    __metadata("design:paramtypes", [attendance_service_1.AttendanceService])
], AttendanceController);
//# sourceMappingURL=attendance.controller.js.map