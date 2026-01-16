import { Test, TestingModule } from '@nestjs/testing';
import { GosiValidationService, GOSI_LEGAL_RATES } from './gosi-validation.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('GosiValidationService', () => {
    let service: GosiValidationService;
    let prisma: PrismaService;

    const mockPrismaService = {
        gosiConfig: {
            findFirst: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GosiValidationService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<GosiValidationService>(GosiValidationService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getLegalRates', () => {
        it('should return the correct legal rates', () => {
            const rates = service.getLegalRates();

            expect(rates.EMPLOYEE_PENSION).toBe(9.0);
            expect(rates.EMPLOYEE_SANED).toBe(0.75);
            expect(rates.EMPLOYEE_TOTAL).toBe(9.75);
            expect(rates.EMPLOYER_PENSION).toBe(9.0);
            expect(rates.EMPLOYER_SANED).toBe(0.75);
            expect(rates.EMPLOYER_HAZARD).toBe(2.0);
            expect(rates.MAX_CAP_AMOUNT).toBe(45000);
        });
    });

    describe('getStandardConfig', () => {
        it('should return standard config with legal rates', () => {
            const config = service.getStandardConfig();

            expect(config.employeeRate).toBe(GOSI_LEGAL_RATES.EMPLOYEE_PENSION);
            expect(config.employerRate).toBe(GOSI_LEGAL_RATES.EMPLOYER_PENSION);
            expect(config.sanedRate).toBe(GOSI_LEGAL_RATES.EMPLOYEE_SANED);
            expect(config.hazardRate).toBe(GOSI_LEGAL_RATES.EMPLOYER_HAZARD);
            expect(config.maxCapAmount).toBe(GOSI_LEGAL_RATES.MAX_CAP_AMOUNT);
            expect(config.isSaudiOnly).toBe(true);
        });
    });

    describe('quickValidate', () => {
        it('should return hasConfig false when no config exists', async () => {
            mockPrismaService.gosiConfig.findFirst.mockResolvedValue(null);

            const result = await service.quickValidate('company-123');

            expect(result.hasConfig).toBe(false);
            expect(result.isValid).toBe(false);
            expect(result.issues).toContain('No active GOSI configuration');
        });

        it('should return isValid true for correct config', async () => {
            mockPrismaService.gosiConfig.findFirst.mockResolvedValue({
                id: 'config-1',
                employeeRate: 9.0,
                employerRate: 9.0,
                sanedRate: 0.75,
                hazardRate: 2.0,
                maxCapAmount: 45000,
                isActive: true,
            });

            const result = await service.quickValidate('company-123');

            expect(result.hasConfig).toBe(true);
            expect(result.isValid).toBe(true);
            expect(result.issues).toHaveLength(0);
        });

        it('should detect employee rate mismatch', async () => {
            mockPrismaService.gosiConfig.findFirst.mockResolvedValue({
                id: 'config-1',
                employeeRate: 10.0, // Wrong rate
                employerRate: 9.0,
                sanedRate: 0.75,
                hazardRate: 2.0,
                maxCapAmount: 45000,
                isActive: true,
            });

            const result = await service.quickValidate('company-123');

            expect(result.hasConfig).toBe(true);
            expect(result.isValid).toBe(false);
            expect(result.issues.length).toBeGreaterThan(0);
        });
    });

    describe('validateForPayroll', () => {
        const validConfig = {
            id: 'config-1',
            companyId: 'company-123',
            employeeRate: 9.0,
            employerRate: 9.0,
            sanedRate: 0.75,
            hazardRate: 2.0,
            maxCapAmount: 45000,
            minBaseSalary: 0,
            isSaudiOnly: true,
            isActive: true,
            effectiveDate: new Date('2024-01-01'),
            endDate: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            notes: null,
            version: 1,
            includeAllowances: false,
        };

        it('should return error when no config exists', async () => {
            mockPrismaService.gosiConfig.findFirst.mockResolvedValue(null);

            const result = await service.validateForPayroll('company-123', new Date());

            expect(result.isValid).toBe(false);
            expect(result.canProceed).toBe(false);
            expect(result.issues.some(i => i.code === 'GOSI_NO_CONFIG')).toBe(true);
        });

        it('should pass validation with correct config', async () => {
            mockPrismaService.gosiConfig.findFirst.mockResolvedValue(validConfig);

            const result = await service.validateForPayroll('company-123', new Date('2024-06-01'));

            expect(result.isValid).toBe(true);
            expect(result.canProceed).toBe(true);
            expect(result.summary.errors).toBe(0);
        });

        it('should detect invalid employee rate', async () => {
            mockPrismaService.gosiConfig.findFirst.mockResolvedValue({
                ...validConfig,
                employeeRate: -5, // Invalid
            });

            const result = await service.validateForPayroll('company-123', new Date('2024-06-01'));

            expect(result.isValid).toBe(false);
            expect(result.issues.some(i => i.code === 'GOSI_EMPLOYEE_RATE_INVALID')).toBe(true);
        });

        it('should warn on rate mismatch', async () => {
            mockPrismaService.gosiConfig.findFirst.mockResolvedValue({
                ...validConfig,
                employeeRate: 8.0, // Different from legal
            });

            const result = await service.validateForPayroll('company-123', new Date('2024-06-01'));

            expect(result.isValid).toBe(true); // Still valid, just warning
            expect(result.canProceed).toBe(true);
            expect(result.summary.warnings).toBeGreaterThan(0);
            expect(result.issues.some(i => i.code === 'GOSI_EMPLOYEE_RATE_MISMATCH')).toBe(true);
        });

        it('should detect expired config', async () => {
            mockPrismaService.gosiConfig.findFirst.mockResolvedValue({
                ...validConfig,
                endDate: new Date('2024-01-31'), // Expired
            });

            const result = await service.validateForPayroll('company-123', new Date('2024-06-01'));

            expect(result.issues.some(i => i.code === 'GOSI_CONFIG_EXPIRED')).toBe(true);
        });

        it('should block in strict mode with warnings', async () => {
            mockPrismaService.gosiConfig.findFirst.mockResolvedValue({
                ...validConfig,
                employeeRate: 8.5, // Different from legal - will cause warning
            });

            const result = await service.validateForPayroll(
                'company-123',
                new Date('2024-06-01'),
                { strictMode: true }
            );

            expect(result.canProceed).toBe(false); // Blocked due to strict mode
            expect(result.summary.warnings).toBeGreaterThan(0);
        });
    });

    describe('createConfigSnapshot', () => {
        it('should create correct snapshot from config', () => {
            const config: any = {
                id: 'config-1',
                employeeRate: 9.0,
                employerRate: 9.0,
                sanedRate: 0.75,
                hazardRate: 2.0,
                maxCapAmount: 45000,
                minBaseSalary: 1500,
                isSaudiOnly: true,
                effectiveDate: new Date('2024-01-01'),
                endDate: new Date('2024-12-31'),
            };

            const snapshot = service.createConfigSnapshot(config);

            expect(snapshot.employeeRate).toBe(9.0);
            expect(snapshot.employerRate).toBe(9.0);
            expect(snapshot.sanedRate).toBe(0.75);
            expect(snapshot.hazardRate).toBe(2.0);
            expect(snapshot.maxCapAmount).toBe(45000);
            expect(snapshot.minBaseSalary).toBe(1500);
            expect(snapshot.isSaudiOnly).toBe(true);
            expect(snapshot.effectiveDate).toEqual(new Date('2024-01-01'));
            expect(snapshot.endDate).toEqual(new Date('2024-12-31'));
        });
    });
});
