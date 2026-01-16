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
var RetroactivePolicyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetroactivePolicyService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const policy_context_service_1 = require("./policy-context.service");
const smart_policy_executor_service_1 = require("./smart-policy-executor.service");
let RetroactivePolicyService = RetroactivePolicyService_1 = class RetroactivePolicyService {
    constructor(prisma, policyContext, policyExecutor) {
        this.prisma = prisma;
        this.policyContext = policyContext;
        this.policyExecutor = policyExecutor;
        this.logger = new common_1.Logger(RetroactivePolicyService_1.name);
    }
    async createApplication(companyId, dto, requestedBy, requestedByName) {
        const policy = await this.prisma.smartPolicy.findFirst({
            where: { id: dto.policyId, companyId },
        });
        if (!policy) {
            throw new common_1.NotFoundException('السياسة غير موجودة');
        }
        const periods = this.generatePeriods(dto.startPeriod, dto.endPeriod);
        if (periods.length === 0) {
            throw new common_1.BadRequestException('الفترة المحددة غير صالحة');
        }
        if (periods.length > 12) {
            throw new common_1.BadRequestException('لا يمكن تطبيق السياسة بأثر رجعي لأكثر من 12 شهر');
        }
        const application = await this.prisma.smartPolicyRetroApplication.create({
            data: {
                policyId: dto.policyId,
                companyId,
                startPeriod: dto.startPeriod,
                endPeriod: dto.endPeriod,
                periods,
                notes: dto.notes,
                requestedBy,
                requestedByName,
                status: 'PENDING',
            },
        });
        this.logger.log(`Retro application created: ${application.id} for policy ${dto.policyId}`);
        return application;
    }
    async calculate(applicationId) {
        const application = await this.prisma.smartPolicyRetroApplication.findUnique({
            where: { id: applicationId },
            include: { policy: true },
        });
        if (!application) {
            throw new common_1.NotFoundException('طلب التطبيق الرجعي غير موجود');
        }
        await this.prisma.smartPolicyRetroApplication.update({
            where: { id: applicationId },
            data: { status: 'CALCULATING' },
        });
        try {
            const employees = await this.prisma.user.findMany({
                where: {
                    companyId: application.companyId,
                    status: 'ACTIVE',
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    departmentId: true,
                    branchId: true,
                    jobTitleId: true,
                    salary: true,
                    hireDate: true,
                },
            });
            const results = [];
            let totalAdditions = 0;
            let totalDeductions = 0;
            for (const employee of employees) {
                const employeeResult = {
                    employeeId: employee.id,
                    employeeName: `${employee.firstName} ${employee.lastName}`,
                    periods: [],
                    totalAmount: 0,
                    netType: 'NEUTRAL',
                };
                for (const period of application.periods) {
                    const [year, month] = period.split('-').map(Number);
                    if (employee.hireDate) {
                        const hireDate = new Date(employee.hireDate);
                        const periodDate = new Date(year, month - 1, 1);
                        if (hireDate > periodDate) {
                            continue;
                        }
                    }
                    try {
                        const context = await this.policyContext.enrichContext(employee.id, month, year);
                        const executionResult = await this.policyExecutor.evaluateAdvancedPolicy(application.policy, context);
                        if (executionResult.success && executionResult.amount !== 0) {
                            const periodResult = {
                                period,
                                amount: Math.abs(executionResult.amount),
                                type: executionResult.amount > 0 ? 'ADDITION' : 'DEDUCTION',
                                details: executionResult,
                            };
                            employeeResult.periods.push(periodResult);
                            employeeResult.totalAmount += executionResult.amount;
                            if (periodResult.type === 'ADDITION') {
                                totalAdditions += periodResult.amount;
                            }
                            else {
                                totalDeductions += periodResult.amount;
                            }
                        }
                    }
                    catch (error) {
                        this.logger.warn(`Error calculating retro for ${employee.id} in ${period}: ${error.message}`);
                    }
                }
                if (employeeResult.totalAmount > 0) {
                    employeeResult.netType = 'ADDITION';
                }
                else if (employeeResult.totalAmount < 0) {
                    employeeResult.netType = 'DEDUCTION';
                }
                if (employeeResult.periods.length > 0) {
                    results.push(employeeResult);
                }
            }
            const netAmount = totalAdditions - totalDeductions;
            await this.prisma.smartPolicyRetroApplication.update({
                where: { id: applicationId },
                data: {
                    status: 'REVIEWED',
                    totalEmployeesAffected: results.length,
                    totalAdditions,
                    totalDeductions,
                    netAmount,
                    results: results,
                },
            });
            return {
                summary: {
                    totalEmployees: results.length,
                    totalAdditions,
                    totalDeductions,
                    netAmount,
                },
                results,
            };
        }
        catch (error) {
            await this.prisma.smartPolicyRetroApplication.update({
                where: { id: applicationId },
                data: { status: 'PENDING' },
            });
            throw error;
        }
    }
    async approve(applicationId, approvedBy, approvedByName) {
        const application = await this.prisma.smartPolicyRetroApplication.findUnique({
            where: { id: applicationId },
        });
        if (!application) {
            throw new common_1.NotFoundException('طلب التطبيق الرجعي غير موجود');
        }
        if (application.status !== 'REVIEWED') {
            throw new common_1.BadRequestException('يجب حساب النتائج أولاً قبل الموافقة');
        }
        return this.prisma.smartPolicyRetroApplication.update({
            where: { id: applicationId },
            data: {
                status: 'APPROVED',
                approvedBy,
                approvedByName,
                approvedAt: new Date(),
            },
        });
    }
    async apply(applicationId, targetPayrollPeriod) {
        const application = await this.prisma.smartPolicyRetroApplication.findUnique({
            where: { id: applicationId },
            include: { policy: true },
        });
        if (!application) {
            throw new common_1.NotFoundException('طلب التطبيق الرجعي غير موجود');
        }
        if (application.status !== 'APPROVED') {
            throw new common_1.BadRequestException('يجب الموافقة على الطلب أولاً');
        }
        const results = application.results || [];
        let createdRecords = 0;
        let totalAmount = 0;
        for (const result of results) {
            if (result.totalAmount === 0)
                continue;
            try {
                await this.prisma.retroPay.create({
                    data: {
                        companyId: application.companyId,
                        employeeId: result.employeeId,
                        reason: `تطبيق رجعي - ${application.policy.name || 'سياسة ذكية'}`,
                        effectiveFrom: new Date(`${application.startPeriod}-01`),
                        effectiveTo: new Date(`${application.endPeriod}-28`),
                        oldAmount: 0,
                        newAmount: Math.abs(result.totalAmount),
                        difference: result.totalAmount,
                        monthsCount: result.periods.length,
                        totalAmount: result.totalAmount,
                        status: 'PENDING',
                        notes: `من الطلب: ${applicationId}`,
                    },
                });
                createdRecords++;
                totalAmount += Math.abs(result.totalAmount);
            }
            catch (error) {
                this.logger.warn(`Error creating RetroPay for ${result.employeeId}: ${error.message}`);
            }
        }
        await this.prisma.smartPolicyRetroApplication.update({
            where: { id: applicationId },
            data: {
                status: 'APPLIED',
                appliedAt: new Date(),
                appliedToPayrollPeriod: targetPayrollPeriod,
            },
        });
        this.logger.log(`Retro application ${applicationId} applied: ${createdRecords} records, ${totalAmount} total`);
        return {
            retroPayRecords: createdRecords,
            totalAmount,
        };
    }
    async cancel(applicationId) {
        const application = await this.prisma.smartPolicyRetroApplication.findUnique({
            where: { id: applicationId },
        });
        if (!application) {
            throw new common_1.NotFoundException('طلب التطبيق الرجعي غير موجود');
        }
        if (application.status === 'APPLIED') {
            throw new common_1.BadRequestException('لا يمكن إلغاء طلب تم تطبيقه بالفعل');
        }
        return this.prisma.smartPolicyRetroApplication.update({
            where: { id: applicationId },
            data: { status: 'CANCELLED' },
        });
    }
    async findByPolicy(policyId) {
        return this.prisma.smartPolicyRetroApplication.findMany({
            where: { policyId },
            orderBy: { requestedAt: 'desc' },
        });
    }
    async findByCompany(companyId, options) {
        return this.prisma.smartPolicyRetroApplication.findMany({
            where: {
                companyId,
                ...(options?.status && { status: options.status }),
            },
            include: {
                policy: {
                    select: { id: true, name: true, originalText: true },
                },
            },
            orderBy: { requestedAt: 'desc' },
        });
    }
    async findOne(applicationId) {
        const application = await this.prisma.smartPolicyRetroApplication.findUnique({
            where: { id: applicationId },
            include: {
                policy: true,
            },
        });
        if (!application) {
            throw new common_1.NotFoundException('طلب التطبيق الرجعي غير موجود');
        }
        return application;
    }
    generatePeriods(startPeriod, endPeriod) {
        const periods = [];
        const [startYear, startMonth] = startPeriod.split('-').map(Number);
        const [endYear, endMonth] = endPeriod.split('-').map(Number);
        let currentYear = startYear;
        let currentMonth = startMonth;
        while (currentYear < endYear ||
            (currentYear === endYear && currentMonth <= endMonth)) {
            periods.push(`${currentYear}-${currentMonth.toString().padStart(2, '0')}`);
            currentMonth++;
            if (currentMonth > 12) {
                currentMonth = 1;
                currentYear++;
            }
        }
        return periods;
    }
};
exports.RetroactivePolicyService = RetroactivePolicyService;
exports.RetroactivePolicyService = RetroactivePolicyService = RetroactivePolicyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        policy_context_service_1.PolicyContextService,
        smart_policy_executor_service_1.SmartPolicyExecutorService])
], RetroactivePolicyService);
//# sourceMappingURL=retroactive-policy.service.js.map