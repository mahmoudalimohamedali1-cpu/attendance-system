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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = require("bcryptjs");
const uuid_1 = require("uuid");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let AuthService = class AuthService {
    constructor(prisma, jwtService, configService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
    }
    async login(loginDto, deviceInfo, ipAddress) {
        const { email, password } = loginDto;
        const user = await this.prisma.user.findFirst({
            where: {
                OR: [{ email }, { phone: email }],
                status: 'ACTIVE',
            },
            include: {
                branch: true,
                department: true,
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('بيانات الدخول غير صحيحة');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('بيانات الدخول غير صحيحة');
        }
        const tokens = await this.generateTokens(user.id, user.email, user.role, user.companyId || '');
        await this.prisma.refreshToken.create({
            data: {
                token: tokens.refreshToken,
                userId: user.id,
                deviceInfo,
                ipAddress,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });
        await this.prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'LOGIN',
                entity: 'User',
                entityId: user.id,
                ipAddress,
                userAgent: deviceInfo,
            },
        });
        const { password: _, ...userWithoutPassword } = user;
        return {
            user: userWithoutPassword,
            ...tokens,
        };
    }
    async register(registerDto) {
        const { email, phone, password, ...rest } = registerDto;
        const existingUser = await this.prisma.user.findFirst({
            where: {
                OR: [{ email }, ...(phone ? [{ phone }] : [])],
            },
        });
        if (existingUser) {
            throw new common_1.ConflictException('البريد الإلكتروني أو رقم الهاتف مسجل مسبقاً');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const employeeCode = await this.generateEmployeeCode();
        const user = await this.prisma.user.create({
            data: {
                email,
                phone,
                password: hashedPassword,
                employeeCode,
                ...rest,
            },
        });
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    async refreshTokens(refreshTokenDto) {
        const { refreshToken } = refreshTokenDto;
        const storedToken = await this.prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: true },
        });
        if (!storedToken || storedToken.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Refresh token غير صالح أو منتهي الصلاحية');
        }
        await this.prisma.refreshToken.delete({
            where: { id: storedToken.id },
        });
        const tokens = await this.generateTokens(storedToken.user.id, storedToken.user.email, storedToken.user.role, storedToken.user.companyId || '');
        await this.prisma.refreshToken.create({
            data: {
                token: tokens.refreshToken,
                userId: storedToken.userId,
                deviceInfo: storedToken.deviceInfo,
                ipAddress: storedToken.ipAddress,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });
        return tokens;
    }
    async logout(userId, refreshToken) {
        if (refreshToken) {
            await this.prisma.refreshToken.deleteMany({
                where: { userId, token: refreshToken },
            });
        }
        else {
            await this.prisma.refreshToken.deleteMany({
                where: { userId },
            });
        }
        await this.prisma.auditLog.create({
            data: {
                userId,
                action: 'LOGOUT',
                entity: 'User',
                entityId: userId,
            },
        });
        return { message: 'تم تسجيل الخروج بنجاح' };
    }
    async forgotPassword(email) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return { message: 'إذا كان البريد موجودًا، سيتم إرسال رابط إعادة التعيين' };
        }
        const resetToken = (0, uuid_1.v4)();
        return {
            message: 'إذا كان البريد موجودًا، سيتم إرسال رابط إعادة التعيين',
            ...(this.configService.get('NODE_ENV') === 'development' && { resetToken }),
        };
    }
    async resetPassword(resetPasswordDto) {
        const { token, newPassword } = resetPasswordDto;
        throw new common_1.BadRequestException('هذه الميزة قيد التطوير');
    }
    async updateFcmToken(userId, fcmToken) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { fcmToken },
        });
        return { message: 'تم تحديث FCM Token بنجاح' };
    }
    async validateUser(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId, status: 'ACTIVE' },
            include: {
                branch: true,
                department: true,
            },
        });
        return user;
    }
    async generateTokens(userId, email, role, companyId) {
        const payload = { sub: userId, email, role, companyId };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: this.configService.get('JWT_SECRET'),
                expiresIn: this.configService.get('JWT_EXPIRES_IN') || '15m',
            }),
            this.jwtService.signAsync(payload, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
                expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
            }),
        ]);
        return {
            accessToken,
            refreshToken,
            expiresIn: this.configService.get('JWT_EXPIRES_IN') || '15m',
        };
    }
    async generateEmployeeCode() {
        const lastUser = await this.prisma.user.findFirst({
            orderBy: { createdAt: 'desc' },
            select: { employeeCode: true },
        });
        let nextNumber = 1;
        if (lastUser?.employeeCode) {
            const match = lastUser.employeeCode.match(/EMP(\d+)/);
            if (match) {
                nextNumber = parseInt(match[1]) + 1;
            }
        }
        return `EMP${nextNumber.toString().padStart(5, '0')}`;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map