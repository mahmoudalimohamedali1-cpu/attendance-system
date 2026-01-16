import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from '../settings.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';

/**
 * 🧪 Settings Service Unit Tests
 * 
 * Tests for:
 * - Company settings CRUD
 * - Holiday management
 * - Holiday employee assignment
 * - Leave carryover settings
 */

const mockPrismaService = {
    companySetting: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
    },
    holiday: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    holidayAssignment: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
    },
    user: {
        findUnique: jest.fn(),
    },
};

const mockAuditService = {
    log: jest.fn(),
};

describe('SettingsService', () => {
    let service: SettingsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SettingsService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: AuditService, useValue: mockAuditService },
            ],
        }).compile();

        service = module.get<SettingsService>(SettingsService);
        jest.clearAllMocks();
    });

    describe('Settings CRUD', () => {
        describe('getAllSettings', () => {
            it('should return all settings for company', async () => {
                const mockSettings = [
                    { key: 'company.name', value: 'شركة التقنية' },
                    { key: 'company.logo', value: 'logo.png' },
                ];
                mockPrismaService.companySetting.findMany.mockResolvedValue(mockSettings);

                const result = await service.getAllSettings('company-123');

                expect(result).toHaveLength(2);
            });
        });

        describe('getSetting', () => {
            it('should return specific setting', async () => {
                mockPrismaService.companySetting.findFirst.mockResolvedValue({
                    key: 'company.name',
                    value: 'شركة التقنية',
                });

                const result = await service.getSetting('company.name', 'company-123');

                expect(result?.value).toBe('شركة التقنية');
            });

            it('should return null for non-existent setting', async () => {
                mockPrismaService.companySetting.findFirst.mockResolvedValue(null);

                const result = await service.getSetting('non.existent', 'company-123');

                expect(result).toBeNull();
            });
        });

        describe('setSetting', () => {
            it('should create or update setting', async () => {
                mockPrismaService.companySetting.upsert.mockResolvedValue({
                    key: 'company.name',
                    value: 'اسم جديد',
                });

                const result = await service.setSetting(
                    'company.name',
                    'اسم جديد',
                    'company-123'
                );

                expect(result.value).toBe('اسم جديد');
            });

            it('should log audit when userId provided', async () => {
                mockPrismaService.companySetting.upsert.mockResolvedValue({
                    key: 'test.key',
                    value: 'value',
                });

                await service.setSetting('test.key', 'value', 'company-123', undefined, 'user-123');

                expect(mockAuditService.log).toHaveBeenCalled();
            });
        });

        describe('deleteSetting', () => {
            it('should delete setting', async () => {
                mockPrismaService.companySetting.delete.mockResolvedValue({
                    key: 'test.key',
                });

                await service.deleteSetting('test.key', 'company-123');

                expect(mockPrismaService.companySetting.delete).toHaveBeenCalled();
            });
        });

        describe('setMultipleSettings', () => {
            it('should update multiple settings', async () => {
                const settings = [
                    { key: 'setting.1', value: 'value1' },
                    { key: 'setting.2', value: 'value2' },
                ];
                mockPrismaService.companySetting.upsert.mockResolvedValue({});

                await service.setMultipleSettings(settings, 'company-123');

                expect(mockPrismaService.companySetting.upsert).toHaveBeenCalledTimes(2);
            });
        });
    });

    describe('Holiday Management', () => {
        describe('getHolidays', () => {
            it('should return all holidays for company', async () => {
                const mockHolidays = [
                    { id: 'h1', name: 'عيد الفطر', date: new Date('2026-03-31'), assignments: [] },
                    { id: 'h2', name: 'عيد الأضحى', date: new Date('2026-06-07'), assignments: [] },
                ];
                mockPrismaService.holiday.findMany.mockResolvedValue(mockHolidays);

                const result = await service.getHolidays('company-123');

                expect(result).toHaveLength(2);
            });

            it('should filter by year when provided', async () => {
                mockPrismaService.holiday.findMany.mockResolvedValue([]);

                await service.getHolidays('company-123', 2026);

                expect(mockPrismaService.holiday.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: expect.objectContaining({
                            date: expect.objectContaining({
                                gte: expect.any(Date),
                                lt: expect.any(Date),
                            }),
                        }),
                    })
                );
            });
        });

        describe('createHoliday', () => {
            it('should create holiday with no assignments', async () => {
                const data = {
                    name: 'يوم التأسيس',
                    date: new Date('2026-02-22'),
                    isPaid: true,
                };
                mockPrismaService.holiday.create.mockResolvedValue({
                    id: 'holiday-123',
                    ...data,
                });

                const result = await service.createHoliday(data, 'company-123');

                expect(result.id).toBe('holiday-123');
            });

            it('should create holiday with branch assignment', async () => {
                const data = {
                    name: 'عطلة الفرع',
                    date: new Date('2026-03-01'),
                    assignments: {
                        type: 'BRANCH' as const,
                        ids: ['branch-1', 'branch-2'],
                    },
                };
                mockPrismaService.holiday.create.mockResolvedValue({
                    id: 'holiday-123',
                    ...data,
                });
                mockPrismaService.holidayAssignment.createMany.mockResolvedValue({ count: 2 });

                await service.createHoliday(data, 'company-123');

                expect(mockPrismaService.holidayAssignment.createMany).toHaveBeenCalled();
            });

            it('should create recurring holiday', async () => {
                const data = {
                    name: 'اليوم الوطني',
                    date: new Date('2026-09-23'),
                    isRecurring: true,
                };
                mockPrismaService.holiday.create.mockResolvedValue({
                    id: 'holiday-123',
                    ...data,
                    isRecurring: true,
                });

                const result = await service.createHoliday(data, 'company-123');

                expect(mockPrismaService.holiday.create).toHaveBeenCalledWith({
                    data: expect.objectContaining({
                        isRecurring: true,
                    }),
                });
            });
        });

        describe('updateHoliday', () => {
            it('should update holiday details', async () => {
                mockPrismaService.holiday.update.mockResolvedValue({
                    id: 'holiday-123',
                    name: 'اسم محدث',
                });

                const result = await service.updateHoliday(
                    'holiday-123',
                    'company-123',
                    { name: 'اسم محدث' }
                );

                expect(result.name).toBe('اسم محدث');
            });

            it('should update assignments when provided', async () => {
                mockPrismaService.holidayAssignment.deleteMany.mockResolvedValue({});
                mockPrismaService.holidayAssignment.createMany.mockResolvedValue({ count: 2 });
                mockPrismaService.holiday.update.mockResolvedValue({ id: 'holiday-123' });

                await service.updateHoliday('holiday-123', 'company-123', {
                    assignments: {
                        type: 'DEPARTMENT',
                        ids: ['dept-1', 'dept-2'],
                    },
                });

                expect(mockPrismaService.holidayAssignment.deleteMany).toHaveBeenCalled();
                expect(mockPrismaService.holidayAssignment.createMany).toHaveBeenCalled();
            });
        });

        describe('deleteHoliday', () => {
            it('should delete holiday', async () => {
                mockPrismaService.holiday.delete.mockResolvedValue({ id: 'holiday-123' });

                await service.deleteHoliday('holiday-123', 'company-123');

                expect(mockPrismaService.holiday.delete).toHaveBeenCalledWith({
                    where: {
                        id: 'holiday-123',
                        companyId: 'company-123',
                    },
                });
            });
        });
    });

    describe('Holiday Checks', () => {
        describe('isHoliday', () => {
            it('should return true when date is a holiday', async () => {
                mockPrismaService.holiday.findFirst.mockResolvedValue({
                    id: 'holiday-123',
                    name: 'عيد الفطر',
                });

                const result = await service.isHoliday(new Date('2026-03-31'), 'company-123');

                expect(result).toBe(true);
            });

            it('should return false when date is not a holiday', async () => {
                mockPrismaService.holiday.findFirst.mockResolvedValue(null);

                const result = await service.isHoliday(new Date('2026-01-15'), 'company-123');

                expect(result).toBe(false);
            });
        });

        describe('getEmployeeHolidayInfo', () => {
            it('should return holiday info for dated holida', async () => {
                mockPrismaService.holiday.findMany.mockResolvedValue([
                    {
                        id: 'h1',
                        name: 'عيد الفطر',
                        isPaid: true,
                        countAsWorkDay: false,
                        overtimeMultiplier: 2.0,
                        applicationType: 'ALL',
                        assignments: [],
                    },
                ]);

                const result = await service.getEmployeeHolidayInfo(
                    new Date('2026-03-31'),
                    'emp-123',
                    'company-123'
                );

                expect(result.isHoliday).toBe(true);
                expect(result.holiday?.isPaid).toBe(true);
            });

            it('should return no holiday for regular day', async () => {
                mockPrismaService.holiday.findMany.mockResolvedValue([]);

                const result = await service.getEmployeeHolidayInfo(
                    new Date('2026-01-15'),
                    'emp-123',
                    'company-123'
                );

                expect(result.isHoliday).toBe(false);
            });
        });
    });

    describe('Leave Carryover', () => {
        describe('isLeaveCarryoverDisabled', () => {
            it('should return true when carryover is disabled', async () => {
                mockPrismaService.companySetting.findFirst.mockResolvedValue({
                    key: 'leave.carryover.disabled',
                    value: 'true',
                });

                const result = await service.isLeaveCarryoverDisabled('company-123');

                expect(result).toBe(true);
            });

            it('should return false when carryover setting is not set', async () => {
                mockPrismaService.companySetting.findFirst.mockResolvedValue(null);

                const result = await service.isLeaveCarryoverDisabled('company-123');

                expect(result).toBe(false);
            });
        });
    });
});
