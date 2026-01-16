import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AttendanceService } from '../attendance.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { GeofenceService } from '../services/geofence.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { PermissionsService } from '../../permissions/permissions.service';
import { SmartPolicyTriggerService } from '../../smart-policies/smart-policy-trigger.service';
import { TimezoneService } from '../../../common/services/timezone.service';
import { SettingsService } from '../../settings/settings.service';

/**
 * 🧪 Attendance Service Unit Tests
 * 
 * Tests for:
 * - Check-in functionality
 * - Check-out functionality  
 * - Geofence validation
 * - Face recognition validation
 * - Late check-in detection
 * - Early check-out detection
 * - Daily/Monthly statistics
 * - Suspicious activity detection
 */

// Mock services
const mockPrismaService = {
    attendance: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
    },
    user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
    },
    workSchedule: {
        findFirst: jest.fn(),
    },
    branch: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
    },
    suspiciousActivity: {
        create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
};

const mockGeofenceService = {
    isWithinGeofence: jest.fn(),
    calculateDistance: jest.fn(),
};

const mockNotificationsService = {
    createNotification: jest.fn(),
};

const mockPermissionsService = {
    checkFeaturePermission: jest.fn(),
    getPermissions: jest.fn(),
};

const mockSmartPolicyTriggerService = {
    triggerPolicies: jest.fn(),
};

const mockTimezoneService = {
    getNow: jest.fn(),
    toLocal: jest.fn(),
    toUTC: jest.fn(),
};

const mockSettingsService = {
    isHoliday: jest.fn(),
    getHolidays: jest.fn(),
};

describe('AttendanceService', () => {
    let service: AttendanceService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AttendanceService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: GeofenceService, useValue: mockGeofenceService },
                { provide: NotificationsService, useValue: mockNotificationsService },
                { provide: PermissionsService, useValue: mockPermissionsService },
                { provide: SmartPolicyTriggerService, useValue: mockSmartPolicyTriggerService },
                { provide: TimezoneService, useValue: mockTimezoneService },
                { provide: SettingsService, useValue: mockSettingsService },
            ],
        }).compile();

        service = module.get<AttendanceService>(AttendanceService);
        jest.clearAllMocks();

        // Default mock implementations
        mockTimezoneService.getNow.mockReturnValue(new Date('2026-01-11T09:00:00Z'));
        mockSettingsService.isHoliday.mockResolvedValue(false);
    });

    describe('checkIn', () => {
        const userId = 'user-123';
        const validCheckInDto = {
            latitude: 24.7136,
            longitude: 46.6753,
            deviceInfo: 'iPhone 15 Pro',
        };

        const mockUser = {
            id: userId,
            companyId: 'company-123',
            branchId: 'branch-123',
            nameAr: 'أحمد محمد',
            nameEn: 'Ahmed Mohammed',
            status: 'ACTIVE',
            branch: {
                id: 'branch-123',
                latitude: 24.7136,
                longitude: 46.6753,
                radius: 100,
            },
        };

        const mockWorkSchedule = {
            id: 'schedule-1',
            startTime: '09:00',
            endTime: '17:00',
            graceMinutes: 15,
        };

        beforeEach(() => {
            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
            mockPrismaService.workSchedule.findFirst.mockResolvedValue(mockWorkSchedule);
            mockPrismaService.attendance.findFirst.mockResolvedValue(null); // No existing attendance
            mockGeofenceService.isWithinGeofence.mockReturnValue(true);
            mockGeofenceService.calculateDistance.mockReturnValue(50);
        });

        it('should create successful check-in within geofence', async () => {
            mockPrismaService.attendance.create.mockResolvedValue({
                id: 'attendance-123',
                userId,
                checkInTime: new Date(),
                status: 'PRESENT',
            });

            const result = await service.checkIn(userId, validCheckInDto);

            expect(result).toHaveProperty('id');
            expect(mockPrismaService.attendance.create).toHaveBeenCalled();
        });

        it('should reject check-in outside geofence', async () => {
            mockGeofenceService.isWithinGeofence.mockReturnValue(false);
            mockGeofenceService.calculateDistance.mockReturnValue(500);

            await expect(service.checkIn(userId, validCheckInDto))
                .rejects.toThrow(BadRequestException);
        });

        it('should detect late check-in', async () => {
            // Simulate check-in at 9:30 (30 minutes late, beyond 15 min grace period)
            mockTimezoneService.getNow.mockReturnValue(new Date('2026-01-11T09:30:00Z'));
            mockPrismaService.attendance.create.mockResolvedValue({
                id: 'attendance-123',
                userId,
                checkInTime: new Date(),
                status: 'LATE',
                lateMinutes: 15,
            });

            const result = await service.checkIn(userId, validCheckInDto);

            expect(mockNotificationsService.createNotification).toHaveBeenCalled();
        });

        it('should prevent duplicate check-in on same day', async () => {
            mockPrismaService.attendance.findFirst.mockResolvedValue({
                id: 'existing-attendance',
                checkInTime: new Date(),
                checkOutTime: null,
            });

            await expect(service.checkIn(userId, validCheckInDto))
                .rejects.toThrow(BadRequestException);
        });

        it('should allow check-in on holiday if configured', async () => {
            mockSettingsService.isHoliday.mockResolvedValue(true);
            mockPrismaService.attendance.create.mockResolvedValue({
                id: 'attendance-123',
                userId,
                checkInTime: new Date(),
                isHoliday: true,
            });

            // Should still allow check-in but mark as holiday
            const result = await service.checkIn(userId, validCheckInDto);
            expect(result).toBeDefined();
        });

        it('should log suspicious activity for location spoofing', async () => {
            // Mock user checking in from drastically different location
            mockGeofenceService.calculateDistance.mockReturnValue(10000); // 10km away
            mockGeofenceService.isWithinGeofence.mockReturnValue(false);

            await expect(service.checkIn(userId, validCheckInDto))
                .rejects.toThrow(BadRequestException);

            expect(mockPrismaService.suspiciousActivity.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        userId,
                        attemptType: expect.any(String),
                    }),
                })
            );
        });

        it('should validate face recognition if provided', async () => {
            const checkInWithFace = {
                ...validCheckInDto,
                faceEmbedding: [0.1, 0.2, 0.3, 0.4, 0.5], // Mock face embedding
            };

            mockPrismaService.user.findUnique.mockResolvedValue({
                ...mockUser,
                faceEmbedding: [0.1, 0.2, 0.3, 0.4, 0.5], // Matching embedding
            });

            mockPrismaService.attendance.create.mockResolvedValue({
                id: 'attendance-123',
                userId,
                checkInTime: new Date(),
                faceVerified: true,
            });

            const result = await service.checkIn(userId, checkInWithFace);
            expect(result).toBeDefined();
        });
    });

    describe('checkOut', () => {
        const userId = 'user-123';
        const validCheckOutDto = {
            latitude: 24.7136,
            longitude: 46.6753,
            deviceInfo: 'iPhone 15 Pro',
        };

        const mockAttendance = {
            id: 'attendance-123',
            userId,
            checkInTime: new Date('2026-01-11T09:00:00Z'),
            checkOutTime: null,
            status: 'PRESENT',
        };

        const mockUser = {
            id: userId,
            companyId: 'company-123',
            branchId: 'branch-123',
            branch: {
                id: 'branch-123',
                latitude: 24.7136,
                longitude: 46.6753,
                radius: 100,
            },
        };

        const mockWorkSchedule = {
            id: 'schedule-1',
            startTime: '09:00',
            endTime: '17:00',
        };

        beforeEach(() => {
            mockPrismaService.attendance.findFirst.mockResolvedValue(mockAttendance);
            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
            mockPrismaService.workSchedule.findFirst.mockResolvedValue(mockWorkSchedule);
            mockGeofenceService.isWithinGeofence.mockReturnValue(true);
        });

        it('should create successful check-out', async () => {
            mockTimezoneService.getNow.mockReturnValue(new Date('2026-01-11T17:00:00Z'));
            mockPrismaService.attendance.update.mockResolvedValue({
                ...mockAttendance,
                checkOutTime: new Date('2026-01-11T17:00:00Z'),
                totalHours: 8,
            });

            const result = await service.checkOut(userId, validCheckOutDto);

            expect(result).toHaveProperty('checkOutTime');
            expect(mockPrismaService.attendance.update).toHaveBeenCalled();
        });

        it('should detect early check-out', async () => {
            // Check out at 15:00 (2 hours early)
            mockTimezoneService.getNow.mockReturnValue(new Date('2026-01-11T15:00:00Z'));
            mockPrismaService.attendance.update.mockResolvedValue({
                ...mockAttendance,
                checkOutTime: new Date('2026-01-11T15:00:00Z'),
                earlyLeaveMinutes: 120,
            });

            const result = await service.checkOut(userId, validCheckOutDto);

            expect(mockNotificationsService.createNotification).toHaveBeenCalled();
        });

        it('should throw error if no check-in found', async () => {
            mockPrismaService.attendance.findFirst.mockResolvedValue(null);

            await expect(service.checkOut(userId, validCheckOutDto))
                .rejects.toThrow(BadRequestException);
        });

        it('should throw error if already checked out', async () => {
            mockPrismaService.attendance.findFirst.mockResolvedValue({
                ...mockAttendance,
                checkOutTime: new Date(),
            });

            await expect(service.checkOut(userId, validCheckOutDto))
                .rejects.toThrow(BadRequestException);
        });

        it('should calculate total working hours correctly', async () => {
            // 8 hour work day
            mockTimezoneService.getNow.mockReturnValue(new Date('2026-01-11T17:00:00Z'));
            mockPrismaService.attendance.update.mockImplementation((args) => {
                return Promise.resolve({
                    ...mockAttendance,
                    ...args.data,
                    checkOutTime: new Date('2026-01-11T17:00:00Z'),
                });
            });

            const result = await service.checkOut(userId, validCheckOutDto);

            expect(mockPrismaService.attendance.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        checkOutTime: expect.any(Date),
                    }),
                })
            );
        });
    });

    describe('getTodayAttendance', () => {
        it('should return today attendance for user', async () => {
            const mockAttendance = {
                id: 'attendance-123',
                checkInTime: new Date(),
                checkOutTime: null,
                status: 'PRESENT',
            };
            mockPrismaService.attendance.findFirst.mockResolvedValue(mockAttendance);

            const result = await service.getTodayAttendance('user-123', 'company-123');

            expect(result).toEqual(mockAttendance);
        });

        it('should return null if no attendance today', async () => {
            mockPrismaService.attendance.findFirst.mockResolvedValue(null);

            const result = await service.getTodayAttendance('user-123', 'company-123');

            expect(result).toBeNull();
        });
    });

    describe('getMonthlyStats', () => {
        it('should calculate monthly statistics correctly', async () => {
            const mockAttendances = [
                { status: 'PRESENT', lateMinutes: 0, totalHours: 8 },
                { status: 'PRESENT', lateMinutes: 10, totalHours: 8 },
                { status: 'LATE', lateMinutes: 30, totalHours: 7.5 },
                { status: 'ABSENT', lateMinutes: 0, totalHours: 0 },
                { status: 'LEAVE', lateMinutes: 0, totalHours: 0 },
            ];
            mockPrismaService.attendance.findMany.mockResolvedValue(mockAttendances);

            const result = await service.getMonthlyStats('user-123', 'company-123', 2026, 1);

            expect(result).toHaveProperty('presentDays');
            expect(result).toHaveProperty('absentDays');
            expect(result).toHaveProperty('lateDays');
            expect(result).toHaveProperty('leaveDays');
            expect(result).toHaveProperty('totalHours');
        });
    });

    describe('getAllAttendance (Admin)', () => {
        it('should return paginated attendance records', async () => {
            const mockAttendances = [
                { id: 'att-1', user: { nameAr: 'أحمد' } },
                { id: 'att-2', user: { nameAr: 'محمد' } },
            ];
            mockPrismaService.attendance.findMany.mockResolvedValue(mockAttendances);
            mockPrismaService.attendance.count.mockResolvedValue(50);

            const result = await service.getAllAttendance('admin-123', 'company-123', {
                page: 1,
                limit: 10,
            });

            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('total', 50);
        });

        it('should filter by date range', async () => {
            mockPrismaService.attendance.findMany.mockResolvedValue([]);
            mockPrismaService.attendance.count.mockResolvedValue(0);

            await service.getAllAttendance('admin-123', 'company-123', {
                startDate: new Date('2026-01-01'),
                endDate: new Date('2026-01-31'),
            });

            expect(mockPrismaService.attendance.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        date: expect.objectContaining({
                            gte: expect.any(Date),
                            lte: expect.any(Date),
                        }),
                    }),
                })
            );
        });

        it('should filter by status', async () => {
            mockPrismaService.attendance.findMany.mockResolvedValue([]);
            mockPrismaService.attendance.count.mockResolvedValue(0);

            await service.getAllAttendance('admin-123', 'company-123', {
                status: 'LATE',
            });

            expect(mockPrismaService.attendance.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        status: 'LATE',
                    }),
                })
            );
        });
    });

    describe('getDailyStats', () => {
        it('should calculate daily company statistics', async () => {
            mockPrismaService.attendance.count.mockResolvedValueOnce(85); // Present
            mockPrismaService.attendance.count.mockResolvedValueOnce(10); // Late
            mockPrismaService.attendance.count.mockResolvedValueOnce(5);  // Absent

            const result = await service.getDailyStats('company-123');

            expect(result).toHaveProperty('present');
            expect(result).toHaveProperty('late');
            expect(result).toHaveProperty('absent');
        });
    });

    describe('cosineSimilarity (Face Recognition)', () => {
        it('should calculate similarity correctly for identical vectors', () => {
            const vectorA = [1, 2, 3, 4, 5];
            const vectorB = [1, 2, 3, 4, 5];

            const similarity = service['cosineSimilarity'](vectorA, vectorB);

            expect(similarity).toBeCloseTo(1.0, 5);
        });

        it('should calculate similarity correctly for orthogonal vectors', () => {
            const vectorA = [1, 0, 0];
            const vectorB = [0, 1, 0];

            const similarity = service['cosineSimilarity'](vectorA, vectorB);

            expect(similarity).toBeCloseTo(0.0, 5);
        });

        it('should calculate similarity correctly for opposite vectors', () => {
            const vectorA = [1, 2, 3];
            const vectorB = [-1, -2, -3];

            const similarity = service['cosineSimilarity'](vectorA, vectorB);

            expect(similarity).toBeCloseTo(-1.0, 5);
        });
    });

    describe('parseTime', () => {
        it('should parse time string correctly', () => {
            const result = service['parseTime']('09:30');

            expect(result).toEqual({ hours: 9, minutes: 30 });
        });

        it('should parse midnight correctly', () => {
            const result = service['parseTime']('00:00');

            expect(result).toEqual({ hours: 0, minutes: 0 });
        });

        it('should parse evening time correctly', () => {
            const result = service['parseTime']('23:59');

            expect(result).toEqual({ hours: 23, minutes: 59 });
        });
    });
});
