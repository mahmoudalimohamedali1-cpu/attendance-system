import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EosService } from '../eos.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { LeaveCalculationService } from '../../leaves/leave-calculation.service';
import { EosReason } from '../dto/calculate-eos.dto';

/**
 * 🧪 End of Service (EOS) Service Unit Tests
 * 
 * Tests for:
 * - Service duration calculation
 * - EOS calculation (Saudi Labor Law)
 * - Leave payout calculation
 * - Resignation adjustments
 * - Outstanding loan deduction
 */

const mockPrismaService = {
    user: {
        findUnique: jest.fn(),
    },
};

const mockLeaveCalculationService = {
    calculateEarnedLeaveDays: jest.fn(),
};

describe('EosService', () => {
    let service: EosService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EosService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: LeaveCalculationService, useValue: mockLeaveCalculationService },
            ],
        }).compile();

        service = module.get<EosService>(EosService);
        jest.clearAllMocks();
    });

    describe('calculateServiceDuration (private)', () => {
        // Testing through calculateEos which uses this private method
        it('should calculate years correctly', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue({
                id: 'emp-123',
                firstName: 'أحمد',
                lastName: 'محمد',
                hireDate: new Date('2021-01-01'),
                salary: 10000,
                salaryAssignments: [],
                advanceRequests: [],
                leaveRequests: [],
            });
            mockLeaveCalculationService.calculateEarnedLeaveDays.mockReturnValue(105);

            const result = await service.calculateEos('emp-123', {
                lastWorkingDay: '2026-01-01',
                reason: EosReason.END_OF_CONTRACT,
            });

            expect(result.yearsOfService).toBe(5);
        });
    });

    describe('calculateEos', () => {
        const baseEmployee = {
            id: 'emp-123',
            firstName: 'أحمد',
            lastName: 'محمد',
            hireDate: new Date('2020-01-01'),
            salary: 12000,
            salaryAssignments: [{ isActive: true, baseSalary: 12000 }],
            advanceRequests: [],
            leaveRequests: [],
        };

        beforeEach(() => {
            mockPrismaService.user.findUnique.mockResolvedValue(baseEmployee);
            mockLeaveCalculationService.calculateEarnedLeaveDays.mockReturnValue(126); // ~6 years * 21 days
        });

        describe('Standard EOS calculation (Saudi Labor Law)', () => {
            it('should calculate half month per year for first 5 years', async () => {
                mockPrismaService.user.findUnique.mockResolvedValue({
                    ...baseEmployee,
                    hireDate: new Date('2023-01-01'), // 3 years
                });

                const result = await service.calculateEos('emp-123', {
                    lastWorkingDay: '2026-01-01',
                    reason: EosReason.END_OF_CONTRACT,
                });

                // 3 years * (12000 * 0.5) = 18000
                expect(result.eosForFirst5Years).toBeCloseTo(18000, -2);
                expect(result.eosForRemaining).toBe(0);
            });

            it('should calculate full month per year after 5 years', async () => {
                const result = await service.calculateEos('emp-123', {
                    lastWorkingDay: '2026-01-01', // 6 years
                    reason: EosReason.END_OF_CONTRACT,
                });

                // First 5 years: 5 * (12000 * 0.5) = 30000
                // Remaining 1 year: 1 * 12000 = 12000
                expect(result.eosForFirst5Years).toBe(30000);
                expect(result.eosForRemaining).toBeGreaterThan(0);
            });
        });

        describe('Resignation adjustments', () => {
            it('should give 0 EOS for resignation under 2 years', async () => {
                mockPrismaService.user.findUnique.mockResolvedValue({
                    ...baseEmployee,
                    hireDate: new Date('2025-01-01'), // 1 year
                });

                const result = await service.calculateEos('emp-123', {
                    lastWorkingDay: '2026-01-01',
                    reason: EosReason.RESIGNATION,
                });

                expect(result.adjustedEos).toBe(0);
                expect(result.eosAdjustmentFactor).toBe(0);
            });

            it('should give 1/3 EOS for resignation between 2-5 years', async () => {
                mockPrismaService.user.findUnique.mockResolvedValue({
                    ...baseEmployee,
                    hireDate: new Date('2023-01-01'), // 3 years
                });

                const result = await service.calculateEos('emp-123', {
                    lastWorkingDay: '2026-01-01',
                    reason: EosReason.RESIGNATION,
                });

                expect(result.eosAdjustmentFactor).toBeCloseTo(1 / 3, 2);
            });

            it('should give 2/3 EOS for resignation between 5-10 years', async () => {
                const result = await service.calculateEos('emp-123', {
                    lastWorkingDay: '2026-01-01', // 6 years
                    reason: EosReason.RESIGNATION,
                });

                expect(result.eosAdjustmentFactor).toBeCloseTo(2 / 3, 2);
            });

            it('should give full EOS for resignation after 10 years', async () => {
                mockPrismaService.user.findUnique.mockResolvedValue({
                    ...baseEmployee,
                    hireDate: new Date('2015-01-01'), // 11 years
                });

                const result = await service.calculateEos('emp-123', {
                    lastWorkingDay: '2026-01-01',
                    reason: EosReason.RESIGNATION,
                });

                expect(result.eosAdjustmentFactor).toBe(1.0);
            });
        });

        describe('Leave payout', () => {
            it('should calculate leave payout from remaining days', async () => {
                mockPrismaService.user.findUnique.mockResolvedValue({
                    ...baseEmployee,
                    leaveRequests: [
                        { requestedDays: 21, status: 'APPROVED' },
                        { requestedDays: 21, status: 'APPROVED' },
                    ],
                });
                mockLeaveCalculationService.calculateEarnedLeaveDays.mockReturnValue(126); // 6 years * 21

                const result = await service.calculateEos('emp-123', {
                    lastWorkingDay: '2026-01-01',
                    reason: EosReason.END_OF_CONTRACT,
                });

                // Remaining: 126 - 42 = 84 days
                // Daily salary: 12000 / 30 = 400
                // Leave payout: 84 * 400 = 33600
                expect(result.remainingLeaveDays).toBe(84);
                expect(result.leavePayout).toBe(33600);
            });

            it('should allow override of remaining leave days', async () => {
                const result = await service.calculateEos('emp-123', {
                    lastWorkingDay: '2026-01-01',
                    reason: EosReason.END_OF_CONTRACT,
                    overrideRemainingLeaveDays: 30,
                });

                expect(result.remainingLeaveDays).toBe(30);
                expect(result.remainingLeaveDaysOverridden).toBe(true);
                // 30 * (12000/30) = 12000
                expect(result.leavePayout).toBe(12000);
            });
        });

        describe('Outstanding loans', () => {
            it('should deduct outstanding advances', async () => {
                mockPrismaService.user.findUnique.mockResolvedValue({
                    ...baseEmployee,
                    advanceRequests: [
                        { amount: 5000, approvedAmount: 5000, status: 'APPROVED' },
                        { amount: 3000, approvedAmount: 3000, status: 'APPROVED' },
                    ],
                });

                const result = await service.calculateEos('emp-123', {
                    lastWorkingDay: '2026-01-01',
                    reason: EosReason.END_OF_CONTRACT,
                });

                expect(result.outstandingLoans).toBe(8000);
            });
        });

        describe('Override salary', () => {
            it('should use override salary when provided', async () => {
                const result = await service.calculateEos('emp-123', {
                    lastWorkingDay: '2026-01-01',
                    reason: EosReason.END_OF_CONTRACT,
                    overrideBaseSalary: 15000,
                });

                expect(result.baseSalary).toBe(15000);
            });
        });

        describe('Error handling', () => {
            it('should throw NotFoundException for non-existent employee', async () => {
                mockPrismaService.user.findUnique.mockResolvedValue(null);

                await expect(service.calculateEos('non-existent', {
                    lastWorkingDay: '2026-01-01',
                    reason: EosReason.END_OF_CONTRACT,
                })).rejects.toThrow(NotFoundException);
            });

            it('should throw NotFoundException if no hire date', async () => {
                mockPrismaService.user.findUnique.mockResolvedValue({
                    ...baseEmployee,
                    hireDate: null,
                });

                await expect(service.calculateEos('emp-123', {
                    lastWorkingDay: '2026-01-01',
                    reason: EosReason.END_OF_CONTRACT,
                })).rejects.toThrow(NotFoundException);
            });
        });

        describe('Net settlement', () => {
            it('should calculate correct net settlement', async () => {
                mockPrismaService.user.findUnique.mockResolvedValue({
                    ...baseEmployee,
                    leaveRequests: [],
                    advanceRequests: [{ amount: 5000, approvedAmount: 5000, status: 'APPROVED' }],
                });
                mockLeaveCalculationService.calculateEarnedLeaveDays.mockReturnValue(126);

                const result = await service.calculateEos('emp-123', {
                    lastWorkingDay: '2026-01-01',
                    reason: EosReason.END_OF_CONTRACT,
                });

                // Net = adjustedEos + leavePayout - outstandingLoans
                expect(result.netSettlement).toBe(
                    result.adjustedEos + result.leavePayout - result.outstandingLoans
                );
            });
        });
    });
});
