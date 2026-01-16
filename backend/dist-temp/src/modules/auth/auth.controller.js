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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_service_1 = require("./auth.service");
const login_dto_1 = require("./dto/login.dto");
const register_dto_1 = require("./dto/register.dto");
const refresh_token_dto_1 = require("./dto/refresh-token.dto");
const forgot_password_dto_1 = require("./dto/forgot-password.dto");
const reset_password_dto_1 = require("./dto/reset-password.dto");
const update_fcm_token_dto_1 = require("./dto/update-fcm-token.dto");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const current_user_decorator_1 = require("./decorators/current-user.decorator");
let AuthController = class AuthController {
    constructor(authService) {
        this.authService = authService;
    }
    async login(loginDto, req) {
        const deviceInfo = req.headers['user-agent'];
        const ipAddress = req.ip || req.connection?.remoteAddress;
        return this.authService.login(loginDto, deviceInfo, ipAddress);
    }
    async register(registerDto) {
        return this.authService.register(registerDto);
    }
    async refreshTokens(refreshTokenDto) {
        return this.authService.refreshTokens(refreshTokenDto);
    }
    async logout(userId, refreshToken) {
        return this.authService.logout(userId, refreshToken);
    }
    async forgotPassword(forgotPasswordDto) {
        return this.authService.forgotPassword(forgotPasswordDto.email);
    }
    async resetPassword(resetPasswordDto) {
        return this.authService.resetPassword(resetPasswordDto);
    }
    async updateFcmToken(userId, updateFcmTokenDto) {
        return this.authService.updateFcmToken(userId, updateFcmTokenDto.fcmToken);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'تسجيل الدخول' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم تسجيل الدخول بنجاح' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'بيانات الدخول غير صحيحة' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('register'),
    (0, swagger_1.ApiOperation)({ summary: 'تسجيل مستخدم جديد (للأدمن فقط)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'تم إنشاء المستخدم بنجاح' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'المستخدم موجود مسبقاً' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'تجديد التوكن' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم تجديد التوكن بنجاح' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Refresh token غير صالح' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refresh_token_dto_1.RefreshTokenDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refreshTokens", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'تسجيل الخروج' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم تسجيل الخروج بنجاح' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)('refreshToken')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('forgot-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'نسيت كلمة المرور' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم إرسال رابط إعادة التعيين' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [forgot_password_dto_1.ForgotPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'إعادة تعيين كلمة المرور' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم إعادة تعيين كلمة المرور بنجاح' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reset_password_dto_1.ResetPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Post)('fcm-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'تحديث FCM Token للإشعارات' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم تحديث التوكن بنجاح' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_fcm_token_dto_1.UpdateFcmTokenDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "updateFcmToken", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map