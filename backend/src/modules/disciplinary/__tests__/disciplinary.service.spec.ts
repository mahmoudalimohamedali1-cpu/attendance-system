import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DisciplinaryService } from '../disciplinary.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { PermissionsService } from '../../permissions/permissions.service';
import { SmartPolicyTriggerService } from '../../smart-policies/smart-policy-trigger.service';
import { DisciplinaryStatus, DisciplinaryStage } from '@prisma/client';

/**
 * 🧪 Disciplinary Service Unit Tests
 * 
 * Tests for:
 * - Case creation
 * - HR review workflow
 * - Employee response handling
 * - Decision issuance
 * - Objection handling
 * - Case finalization
 */

const mockPrismaService = {
    disciplinaryPolicy: {
        findFirst: jest.fn(),
    },
    disciplinaryCase: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
    },
    disciplinaryCaseEvent: {
        create: jest.fn(),
    },
    disciplinaryHearing: {
        create: jest.fn(),
    },
    disciplinaryAttachment: {
        create: jest.fn(),
    },
    user: {
        findUnique: jest.fn(),
    },
    payrollAdjustment: {
        create: jest.fn(),
    },
};

const mockNotificationsService = {
    notifyHRCaseSubmitted: jest.fn(),
    notifyEmployeeDecisionIssued: jest.fn(),
    notifyHREmployeeObjected: jest.fn(),
    notifyEmployeeHearingScheduled: jest.fn(),
    notifyCaseFinalized: jest.fn(),
};

const mockPermissionsService = {
    hasPermission: jest.fn(),
};

const mockSmartPolicyTrigger = {
    triggerPolicies: jest.fn(),
};

describe('DisciplinaryService', () => {
    let service: DisciplinaryService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DisciplinaryService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: NotificationsService, useValue: mockNotificationsService },
                { provide: PermissionsService, useValue: mockPermissionsService },
                { provide: SmartPolicyTriggerService, useValue: mockSmartPolicyTrigger },
            ],
        }).compile();

        service = module.get<DisciplinaryService>(DisciplinaryService);
        jest.clearAllMocks();
    });

    describe('getPolicy', () => {
        it('should return company disciplinary policy', async () => {
            const mockPolicy = {
                id: 'policy-123',
                objectionDeadlineDays: 5,
                escalationDays: 3,
            };
            mockPrismaService.disciplinaryPolicy.findFirst.mockResolvedValue(mockPolicy);

            const result = await service.getPolicy('company-123');

            expect(result).toHaveProperty('objectionDeadlineDays');
        });

        it('should return defaults if no policy configured', async () => {
            mockPrismaService.disciplinaryPolicy.findFirst.mockResolvedValue(null);

            const result = await service.getPolicy('company-123');

            // Should return default values
            expect(result).toBeDefined();
        });
    });

    describe('createCase', () => {
        const createDto = {
            employeeId: 'emp-123',
            violationType: 'TARDINESS',
            description: 'تأخر متكرر عن الدوام',
            incidentDate: '2026-01-10',
        };

        beforeEach(() => {
            mockPrismaService.user.findUnique.mockResolvedValue({
                id: 'emp-123',
                nameAr: 'أحمد محمد',
                managerId: 'manager-123',
            });
            mockPrismaService.disciplinaryCase.create.mockResolvedValue({
                id: 'case-123',
                code: 'DC-2026-001',
                ...createDto,
                status: 'DRAFT',
            });
        });

        it('should create new disciplinary case', async () => {
            const result = await service.createCase('manager-123', 'company-123', createDto);

            expect(result.id).toBe('case-123');
            expect(mockPrismaService.disciplinaryCase.create).toHaveBeenCalled();
        });

        it('should notify HR about new case', async () => {
            await service.createCase('manager-123', 'company-123', createDto);

            expect(mockNotificationsService.notifyHRCaseSubmitted).toHaveBeenCalled();
        });

        it('should log case creation event', async () => {
            await service.createCase('manager-123', 'company-123', createDto);

            expect(mockPrismaService.disciplinaryCaseEvent.create).toHaveBeenCalled();
        });
    });

    describe('hrInitialReview', () => {
        const reviewDto = {
            action: 'PROCEED_FORMAL',
            notes: 'يتطلب إجراء تحقيق رسمي',
        };

        beforeEach(() => {
            mockPrismaService.disciplinaryCase.findFirst.mockResolvedValue({
                id: 'case-123',
                status: 'SUBMITTED',
                stage: 'HR_REVIEW',
            });
            mockPrismaService.disciplinaryCase.update.mockResolvedValue({
                id: 'case-123',
                status: 'IN_PROGRESS',
            });
        });

        it('should proceed case to formal investigation', async () => {
            const result = await service.hrInitialReview('case-123', 'hr-123', 'company-123', reviewDto);

            expect(mockPrismaService.disciplinaryCase.update).toHaveBeenCalled();
        });

        it('should allow dismissal of case', async () => {
            const dismissDto = { action: 'DISMISS', notes: 'لا تستوجب إجراء' };
            mockPrismaService.disciplinaryCase.update.mockResolvedValue({
                status: 'DISMISSED',
            });

            await service.hrInitialReview('case-123', 'hr-123', 'company-123', dismissDto);

            expect(mockPrismaService.disciplinaryCase.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ status: 'DISMISSED' }),
                })
            );
        });
    });

    describe('issueDecision', () => {
        const decisionDto = {
            decisionType: 'WARNING',
            decisionDetails: 'إنذار كتابي أول',
        };

        beforeEach(() => {
            mockPrismaService.disciplinaryCase.findFirst.mockResolvedValue({
                id: 'case-123',
                employeeId: 'emp-123',
                status: 'IN_PROGRESS',
            });
            mockPrismaService.disciplinaryPolicy.findFirst.mockResolvedValue({
                objectionDeadlineDays: 5,
            });
        });

        it('should issue decision and notify employee', async () => {
            mockPrismaService.disciplinaryCase.update.mockResolvedValue({
                id: 'case-123',
                status: 'PENDING_ACCEPTANCE',
            });

            await service.issueDecision('case-123', 'hr-123', 'company-123', decisionDto);

            expect(mockNotificationsService.notifyEmployeeDecisionIssued).toHaveBeenCalled();
        });

        it('should set objection deadline', async () => {
            mockPrismaService.disciplinaryCase.update.mockResolvedValue({});

            await service.issueDecision('case-123', 'hr-123', 'company-123', decisionDto);

            expect(mockPrismaService.disciplinaryCase.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        objectionDeadline: expect.any(Date),
                    }),
                })
            );
        });

        it('should create salary deduction for financial penalty', async () => {
            const penaltyDto = {
                decisionType: 'SALARY_DEDUCTION',
                deductionDays: 3,
            };
            mockPrismaService.disciplinaryCase.update.mockResolvedValue({});

            await service.issueDecision('case-123', 'hr-123', 'company-123', penaltyDto);

            expect(mockPrismaService.payrollAdjustment.create).toHaveBeenCalled();
        });
    });

    describe('employeeDecisionResponse', () => {
        beforeEach(() => {
            mockPrismaService.disciplinaryCase.findFirst.mockResolvedValue({
                id: 'case-123',
                employeeId: 'emp-123',
                managerId: 'manager-123',
                status: 'PENDING_ACCEPTANCE',
            });
        });

        it('should accept decision and finalize case', async () => {
            mockPrismaService.disciplinaryCase.update.mockResolvedValue({
                status: 'CLOSED',
            });

            await service.employeeDecisionResponse('case-123', 'emp-123', 'company-123', {
                action: 'ACCEPT',
            });

            expect(mockPrismaService.disciplinaryCase.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ status: 'CLOSED' }),
                })
            );
        });

        it('should register objection and notify HR', async () => {
            mockPrismaService.disciplinaryCase.update.mockResolvedValue({
                status: 'OBJECTION_FILED',
            });

            await service.employeeDecisionResponse('case-123', 'emp-123', 'company-123', {
                action: 'OBJECT',
                objectionText: 'أعترض على هذا القرار لأن...',
            });

            expect(mockNotificationsService.notifyHREmployeeObjected).toHaveBeenCalled();
        });

        it('should validate employee ownership', async () => {
            await expect(service.employeeDecisionResponse('case-123', 'other-emp', 'company-123', {
                action: 'ACCEPT',
            })).rejects.toThrow(ForbiddenException);
        });
    });

    describe('scheduleHearing', () => {
        beforeEach(() => {
            mockPrismaService.disciplinaryCase.findFirst.mockResolvedValue({
                id: 'case-123',
                employeeId: 'emp-123',
                status: 'IN_PROGRESS',
            });
        });

        it('should schedule hearing and notify employee', async () => {
            mockPrismaService.disciplinaryHearing.create.mockResolvedValue({});
            mockPrismaService.disciplinaryCase.update.mockResolvedValue({});

            await service.scheduleHearing('case-123', 'hr-123', 'company-123', {
                hearingDatetime: '2026-01-15T10:00:00',
                hearingLocation: 'قاعة الاجتماعات الرئيسية',
            });

            expect(mockNotificationsService.notifyEmployeeHearingScheduled).toHaveBeenCalled();
        });
    });

    describe('getCasesForRole', () => {
        it('should return cases filed by manager', async () => {
            mockPrismaService.disciplinaryCase.findMany.mockResolvedValue([]);

            await service.getCasesForRole('manager-123', 'company-123', 'manager');

            expect(mockPrismaService.disciplinaryCase.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ managerId: 'manager-123' }),
                })
            );
        });

        it('should return all company cases for HR', async () => {
            mockPrismaService.disciplinaryCase.findMany.mockResolvedValue([]);

            await service.getCasesForRole('hr-123', 'company-123', 'hr');

            expect(mockPrismaService.disciplinaryCase.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ companyId: 'company-123' }),
                })
            );
        });

        it('should return employee own cases', async () => {
            mockPrismaService.disciplinaryCase.findMany.mockResolvedValue([]);

            await service.getCasesForRole('emp-123', 'company-123', 'employee');

            expect(mockPrismaService.disciplinaryCase.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ employeeId: 'emp-123' }),
                })
            );
        });
    });

    describe('getCaseDetail', () => {
        it('should return full case details', async () => {
            mockPrismaService.disciplinaryCase.findFirst.mockResolvedValue({
                id: 'case-123',
                code: 'DC-2026-001',
                employee: { nameAr: 'أحمد' },
                events: [],
                attachments: [],
                hearings: [],
            });

            const result = await service.getCaseDetail('case-123', 'company-123');

            expect(result).toHaveProperty('employee');
            expect(result).toHaveProperty('events');
        });

        it('should throw NotFoundException for non-existent case', async () => {
            mockPrismaService.disciplinaryCase.findFirst.mockResolvedValue(null);

            await expect(service.getCaseDetail('non-existent', 'company-123'))
                .rejects.toThrow(NotFoundException);
        });
    });
});
