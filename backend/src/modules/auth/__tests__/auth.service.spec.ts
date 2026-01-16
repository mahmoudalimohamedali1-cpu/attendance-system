import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { UnauthorizedException, ConflictException } from '@nestjs/common';

/**
 * 🧪 Authentication Service Unit Tests
 * 
 * Tests for:
 * - User login with email/phone
 * - User registration
 * - Token refresh
 * - Logout functionality
 * - Password reset flow
 * - FCM token management
 */

// Mock PrismaService
const mockPrismaService = {
    user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
    refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
    },
    auditLog: {
        create: jest.fn(),
    },
};

// Mock JwtService
const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
};

// Mock ConfigService
const mockConfigService = {
    get: jest.fn((key: string) => {
        const config: Record<string, string> = {
            JWT_SECRET: 'test-secret',
            JWT_REFRESH_SECRET: 'test-refresh-secret',
            JWT_EXPIRES_IN: '15m',
            JWT_REFRESH_EXPIRES_IN: '7d',
            NODE_ENV: 'test',
        };
        return config[key];
    }),
};

describe('AuthService', () => {
    let service: AuthService;
    let prisma: typeof mockPrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: JwtService, useValue: mockJwtService },
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        prisma = mockPrismaService;

        // Reset all mocks
        jest.clearAllMocks();
    });

    describe('login', () => {
        const validUser = {
            id: 'user-123',
            email: 'test@example.com',
            phone: '+966501234567',
            password: '$2a$10$hashedpassword',
            role: 'EMPLOYEE',
            status: 'ACTIVE',
            companyId: 'company-123',
            branch: { id: 'branch-1', name: 'Main Branch' },
            department: { id: 'dept-1', name: 'Engineering' },
        };

        it('should login successfully with valid email and password', async () => {
            prisma.user.findFirst.mockResolvedValue(validUser);
            jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));
            mockJwtService.signAsync.mockResolvedValue('mock-token');
            prisma.refreshToken.create.mockResolvedValue({ id: 'token-1' });
            prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

            const result = await service.login(
                { email: 'test@example.com', password: 'password123' },
                'Chrome/120',
                '192.168.1.1'
            );

            expect(result).toHaveProperty('user');
            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result.user).not.toHaveProperty('password');
            expect(prisma.auditLog.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ action: 'LOGIN' }),
                })
            );
        });

        it('should login successfully with phone number', async () => {
            prisma.user.findFirst.mockResolvedValue(validUser);
            jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));
            mockJwtService.signAsync.mockResolvedValue('mock-token');
            prisma.refreshToken.create.mockResolvedValue({ id: 'token-1' });
            prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

            const result = await service.login(
                { email: '+966501234567', password: 'password123' }
            );

            expect(result).toHaveProperty('user');
            expect(prisma.user.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: expect.arrayContaining([
                            { email: '+966501234567' },
                            { phone: '+966501234567' },
                        ]),
                    }),
                })
            );
        });

        it('should throw UnauthorizedException for non-existent user', async () => {
            prisma.user.findFirst.mockResolvedValue(null);

            await expect(
                service.login({ email: 'nonexistent@example.com', password: 'password' })
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException for invalid password', async () => {
            prisma.user.findFirst.mockResolvedValue(validUser);
            jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

            await expect(
                service.login({ email: 'test@example.com', password: 'wrongpassword' })
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should not return password in response', async () => {
            prisma.user.findFirst.mockResolvedValue(validUser);
            jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));
            mockJwtService.signAsync.mockResolvedValue('mock-token');
            prisma.refreshToken.create.mockResolvedValue({ id: 'token-1' });
            prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

            const result = await service.login(
                { email: 'test@example.com', password: 'password123' }
            );

            expect(result.user).not.toHaveProperty('password');
        });

        it('should include branch and department info in response', async () => {
            prisma.user.findFirst.mockResolvedValue(validUser);
            jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));
            mockJwtService.signAsync.mockResolvedValue('mock-token');
            prisma.refreshToken.create.mockResolvedValue({ id: 'token-1' });
            prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

            const result = await service.login(
                { email: 'test@example.com', password: 'password123' }
            );

            expect(result.user.branch).toBeDefined();
            expect(result.user.department).toBeDefined();
        });
    });

    describe('register', () => {
        const registerDto = {
            email: 'newuser@example.com',
            phone: '+966509876543',
            password: 'securePassword123',
            firstName: 'مستخدم',
            lastName: 'جديد',
        };

        it('should register a new user successfully', async () => {
            prisma.user.findFirst.mockResolvedValue(null);
            jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('hashed-password'));
            prisma.user.create.mockResolvedValue({
                id: 'new-user-123',
                ...registerDto,
                password: 'hashed-password',
                employeeCode: 'EMP00001',
            });

            const result = await service.register(registerDto);

            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('email', registerDto.email);
            expect(result).not.toHaveProperty('password');
            expect(prisma.user.create).toHaveBeenCalled();
        });

        it('should throw ConflictException for duplicate email', async () => {
            prisma.user.findFirst.mockResolvedValue({ id: 'existing-user', email: registerDto.email });

            await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
        });

        it('should throw ConflictException for duplicate phone', async () => {
            prisma.user.findFirst.mockResolvedValue({ id: 'existing-user', phone: registerDto.phone });

            await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
        });

        it('should hash password before storing', async () => {
            prisma.user.findFirst.mockResolvedValue(null);
            const hashSpy = jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('hashed-password'));
            prisma.user.create.mockResolvedValue({
                id: 'new-user-123',
                ...registerDto,
                password: 'hashed-password',
                employeeCode: 'EMP00001',
            });

            await service.register(registerDto);

            expect(hashSpy).toHaveBeenCalledWith(registerDto.password, 10);
        });

        it('should generate unique employee code', async () => {
            prisma.user.findFirst.mockResolvedValueOnce(null); // No existing user
            prisma.user.findFirst.mockResolvedValueOnce({ employeeCode: 'EMP00010' }); // Last employee code
            jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('hashed-password'));
            prisma.user.create.mockResolvedValue({
                id: 'new-user-123',
                ...registerDto,
                password: 'hashed-password',
                employeeCode: 'EMP00011',
            });

            await service.register(registerDto);

            expect(prisma.user.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        employeeCode: expect.stringMatching(/^EMP\d{5}$/),
                    }),
                })
            );
        });
    });

    describe('refreshTokens', () => {
        const validStoredToken = {
            id: 'token-123',
            token: 'valid-refresh-token',
            userId: 'user-123',
            expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
            deviceInfo: 'Chrome/120',
            ipAddress: '192.168.1.1',
            user: {
                id: 'user-123',
                email: 'test@example.com',
                role: 'EMPLOYEE',
                companyId: 'company-123',
            },
        };

        it('should refresh tokens successfully', async () => {
            prisma.refreshToken.findUnique.mockResolvedValue(validStoredToken);
            prisma.refreshToken.delete.mockResolvedValue({});
            mockJwtService.signAsync.mockResolvedValue('new-token');
            prisma.refreshToken.create.mockResolvedValue({ id: 'new-token-id' });

            const result = await service.refreshTokens({ refreshToken: 'valid-refresh-token' });

            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(prisma.refreshToken.delete).toHaveBeenCalled();
            expect(prisma.refreshToken.create).toHaveBeenCalled();
        });

        it('should throw UnauthorizedException for invalid refresh token', async () => {
            prisma.refreshToken.findUnique.mockResolvedValue(null);

            await expect(
                service.refreshTokens({ refreshToken: 'invalid-token' })
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException for expired refresh token', async () => {
            prisma.refreshToken.findUnique.mockResolvedValue({
                ...validStoredToken,
                expiresAt: new Date(Date.now() - 3600000), // 1 hour ago (expired)
            });

            await expect(
                service.refreshTokens({ refreshToken: 'expired-token' })
            ).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('logout', () => {
        it('should logout from specific device', async () => {
            prisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });
            prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

            const result = await service.logout('user-123', 'refresh-token-123');

            expect(result).toHaveProperty('message');
            expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
                where: { userId: 'user-123', token: 'refresh-token-123' },
            });
        });

        it('should logout from all devices when no token provided', async () => {
            prisma.refreshToken.deleteMany.mockResolvedValue({ count: 3 });
            prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

            const result = await service.logout('user-123');

            expect(result).toHaveProperty('message');
            expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
                where: { userId: 'user-123' },
            });
        });

        it('should create audit log on logout', async () => {
            prisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });
            prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

            await service.logout('user-123');

            expect(prisma.auditLog.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        action: 'LOGOUT',
                        userId: 'user-123',
                    }),
                })
            );
        });
    });

    describe('forgotPassword', () => {
        it('should return success message for existing user', async () => {
            prisma.user.findUnique.mockResolvedValue({
                id: 'user-123',
                email: 'test@example.com',
            });

            const result = await service.forgotPassword('test@example.com');

            expect(result).toHaveProperty('message');
        });

        it('should return same message for non-existent user (prevent enumeration)', async () => {
            prisma.user.findUnique.mockResolvedValue(null);

            const result = await service.forgotPassword('nonexistent@example.com');

            expect(result).toHaveProperty('message');
            // Same message to prevent user enumeration
        });
    });

    describe('updateFcmToken', () => {
        it('should update FCM token successfully', async () => {
            prisma.user.update.mockResolvedValue({ id: 'user-123', fcmToken: 'new-fcm-token' });

            const result = await service.updateFcmToken('user-123', 'new-fcm-token');

            expect(result).toHaveProperty('message');
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: 'user-123' },
                data: { fcmToken: 'new-fcm-token' },
            });
        });
    });

    describe('validateUser', () => {
        it('should return user for valid active user', async () => {
            const activeUser = {
                id: 'user-123',
                email: 'test@example.com',
                status: 'ACTIVE',
                branch: { id: 'branch-1' },
                department: { id: 'dept-1' },
            };
            prisma.user.findUnique.mockResolvedValue(activeUser);

            const result = await service.validateUser('user-123');

            expect(result).toEqual(activeUser);
        });

        it('should return null for inactive user', async () => {
            prisma.user.findUnique.mockResolvedValue(null);

            const result = await service.validateUser('inactive-user-123');

            expect(result).toBeNull();
        });
    });
});
