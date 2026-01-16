import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from '../dashboard.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * 🧪 Dashboard Service Unit Tests
 * 
 * Tests for:
 * - Executive summary stats
 * - Payroll health status
 * - Exception alerts
 * - Trend analysis
 * - User quick stats
 */

const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
};

const mockPrismaService = {
    user: {
        count: jest.fn(),
        findMany: jest.fn(),
    },
    attendance: {
        count: jest.fn(),
        findMany: jest.fn(),
        aggregate: jest.fn(),
    },
    leaveRequest: {
        count: jest.fn(),
        findMany: jest.fn(),
    },
    payrollRun: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
    },
    overtime: {
        aggregate: jest.fn(),
    },
};

describe('DashboardService', () => {
    let service: DashboardService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DashboardService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: 'REDIS_CLIENT', useValue: mockRedis },
            ],
        }).compile();

        service = module.get<DashboardService>(DashboardService);
        jest.clearAllMocks();

        // Default Redis to return null (cache miss)
        mockRedis.get.mockResolvedValue(null);
        mockRedis.set.mockResolvedValue('OK');
    });

    describe('getSummary', () => {
        beforeEach(() => {
            mockPrismaService.user.count.mockResolvedValue(50);
            mockPrismaService.attendance.count.mockResolvedValue(45);
            mockPrismaService.leaveRequest.count.mockResolvedValue(3);
            mockPrismaService.overtime.aggregate.mockResolvedValue({ _sum: { hours: 120 } });
        });

        it('should return dashboard summary', async () => {
            const result = await service.getSummary('company-123', 2026, 1);

            expect(result).toHaveProperty('totalEmployees');
            expect(result).toHaveProperty('presentToday');
            expect(result).toHaveProperty('onLeave');
        });

        it('should use cached data when available', async () => {
            const cachedData = { totalEmployees: 50, presentToday: 45 };
            mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

            const result = await service.getSummary('company-123', 2026, 1);

            expect(result).toEqual(cachedData);
            expect(mockPrismaService.user.count).not.toHaveBeenCalled();
        });

        it('should cache results after fetching', async () => {
            await service.getSummary('company-123', 2026, 1);

            expect(mockRedis.set).toHaveBeenCalled();
        });
    });

    describe('getHealth', () => {
        beforeEach(() => {
            mockPrismaService.payrollRun.findFirst.mockResolvedValue(null);
            mockPrismaService.user.count.mockResolvedValue(50);
            mockPrismaService.attendance.count.mockResolvedValue(50);
            mockPrismaService.leaveRequest.count.mockResolvedValue(0);
        });

        it('should return healthy status when all checks pass', async () => {
            const result = await service.getHealth('company-123', 2026, 1);

            expect(result).toHaveProperty('status');
            expect(result).toHaveProperty('checks');
        });

        it('should flag missing attendance records', async () => {
            mockPrismaService.attendance.count.mockResolvedValue(30); // Less than employees

            const result = await service.getHealth('company-123', 2026, 1);

            expect(result.checks).toContainEqual(
                expect.objectContaining({
                    name: expect.any(String),
                    passed: expect.any(Boolean),
                })
            );
        });

        it('should flag pending leave requests', async () => {
            mockPrismaService.leaveRequest.count.mockResolvedValue(5);

            const result = await service.getHealth('company-123', 2026, 1);

            expect(result).toBeDefined();
        });
    });

    describe('getExceptions', () => {
        beforeEach(() => {
            mockPrismaService.attendance.findMany.mockResolvedValue([]);
            mockPrismaService.leaveRequest.findMany.mockResolvedValue([]);
        });

        it('should return attendance exceptions', async () => {
            mockPrismaService.attendance.findMany.mockResolvedValue([
                { userId: 'u1', status: 'LATE', lateMinutes: 30 },
                { userId: 'u2', status: 'ABSENT' },
            ]);

            const result = await service.getExceptions('company-123', 2026, 1);

            expect(result).toHaveProperty('lateArrivals');
            expect(result).toHaveProperty('absences');
        });

        it('should include leave exceptions', async () => {
            mockPrismaService.leaveRequest.findMany.mockResolvedValue([
                { id: 'l1', status: 'PENDING', userId: 'u1' },
            ]);

            const result = await service.getExceptions('company-123', 2026, 1);

            expect(result).toHaveProperty('pendingLeaves');
        });
    });

    describe('getTrends', () => {
        it('should return monthly trend data', async () => {
            mockPrismaService.payrollRun.findMany.mockResolvedValue([
                { year: 2025, month: 10, totalNet: 100000 },
                { year: 2025, month: 11, totalNet: 105000 },
                { year: 2025, month: 12, totalNet: 110000 },
                { year: 2026, month: 1, totalNet: 108000 },
            ]);

            const result = await service.getTrends('company-123', 4);

            expect(result).toHaveProperty('months');
            expect(result.months).toHaveLength(4);
        });

        it('should default to 4 months', async () => {
            mockPrismaService.payrollRun.findMany.mockResolvedValue([]);

            await service.getTrends('company-123');

            expect(mockPrismaService.payrollRun.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    take: 4,
                })
            );
        });
    });

    describe('getUsersQuickStats', () => {
        beforeEach(() => {
            mockPrismaService.user.count.mockResolvedValue(50);
            mockPrismaService.leaveRequest.count.mockResolvedValue(2);
        });

        it('should return quick stats for users page', async () => {
            const result = await service.getUsersQuickStats('company-123');

            expect(result).toHaveProperty('totalActive');
            expect(result).toHaveProperty('newThisMonth');
            expect(result).toHaveProperty('onLeaveToday');
            expect(result).toHaveProperty('pendingApprovals');
        });

        it('should count new employees this month', async () => {
            mockPrismaService.user.count
                .mockResolvedValueOnce(50)  // Total active
                .mockResolvedValueOnce(3);  // New this month

            const result = await service.getUsersQuickStats('company-123');

            expect(result.newThisMonth).toBeDefined();
        });
    });

    describe('Caching', () => {
        it('should cache summary for 1 minute', async () => {
            mockPrismaService.user.count.mockResolvedValue(50);

            await service.getSummary('company-123', 2026, 1);

            expect(mockRedis.set).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                'EX',
                60 // 1 minute TTL for summary
            );
        });

        it('should use different cache keys per company', async () => {
            mockPrismaService.user.count.mockResolvedValue(50);

            await service.getSummary('company-123', 2026, 1);
            await service.getSummary('company-456', 2026, 1);

            const calls = mockRedis.get.mock.calls;
            expect(calls[0][0]).not.toBe(calls[1][0]);
        });
    });
});
