import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PolicyContextService } from './policy-context.service';
import { SmartPolicyExecutorService } from './smart-policy-executor.service';
import { RetroApplicationStatus } from '@prisma/client';

/**
 * DTO لطلب تطبيق سياسة بأثر رجعي
 */
export interface CreateRetroApplicationDto {
    policyId: string;
    startPeriod: string; // YYYY-MM
    endPeriod: string;   // YYYY-MM
    notes?: string;
}

/**
 * نتيجة حساب لموظف واحد
 */
export interface EmployeeRetroResult {
    employeeId: string;
    employeeName: string;
    periods: {
        period: string;
        amount: number;
        type: 'ADDITION' | 'DEDUCTION';
        details: any;
    }[];
    totalAmount: number;
    netType: 'ADDITION' | 'DEDUCTION' | 'NEUTRAL';
}

/**
 * خدمة تطبيق السياسات بأثر رجعي
 * Priority 1: Retroactive Policy Application
 * 
 * تتيح هذه الخدمة:
 * - تطبيق سياسة جديدة على أشهر سابقة
 * - حساب الفروقات لكل موظف
 * - إنشاء سجلات RetroPay تلقائياً
 */
@Injectable()
export class RetroactivePolicyService {
    private readonly logger = new Logger(RetroactivePolicyService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly policyContext: PolicyContextService,
        private readonly policyExecutor: SmartPolicyExecutorService,
    ) { }

    /**
     * إنشاء طلب تطبيق بأثر رجعي
     */
    async createApplication(
        companyId: string,
        dto: CreateRetroApplicationDto,
        requestedBy: string,
        requestedByName: string,
    ) {
        // التحقق من وجود السياسة
        const policy = await this.prisma.smartPolicy.findFirst({
            where: { id: dto.policyId, companyId },
        });

        if (!policy) {
            throw new NotFoundException('السياسة غير موجودة');
        }

        // التحقق من صحة الفترات
        const periods = this.generatePeriods(dto.startPeriod, dto.endPeriod);
        if (periods.length === 0) {
            throw new BadRequestException('الفترة المحددة غير صالحة');
        }

        if (periods.length > 12) {
            throw new BadRequestException('لا يمكن تطبيق السياسة بأثر رجعي لأكثر من 12 شهر');
        }

        // إنشاء الطلب
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

        this.logger.log(
            `Retro application created: ${application.id} for policy ${dto.policyId}`,
        );

        return application;
    }

    /**
     * 🔥 حساب الأثر الرجعي (بدون تطبيق)
     */
    async calculate(applicationId: string): Promise<{
        summary: {
            totalEmployees: number;
            totalAdditions: number;
            totalDeductions: number;
            netAmount: number;
        };
        results: EmployeeRetroResult[];
    }> {
        const application = await this.prisma.smartPolicyRetroApplication.findUnique({
            where: { id: applicationId },
            include: { policy: true },
        });

        if (!application) {
            throw new NotFoundException('طلب التطبيق الرجعي غير موجود');
        }

        // تحديث الحالة
        await this.prisma.smartPolicyRetroApplication.update({
            where: { id: applicationId },
            data: { status: 'CALCULATING' as any },
        });

        try {
            // جلب جميع الموظفين
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

            const results: EmployeeRetroResult[] = [];
            let totalAdditions = 0;
            let totalDeductions = 0;

            for (const employee of employees) {
                const employeeResult: EmployeeRetroResult = {
                    employeeId: employee.id,
                    employeeName: `${employee.firstName} ${employee.lastName}`,
                    periods: [],
                    totalAmount: 0,
                    netType: 'NEUTRAL',
                };

                // حساب لكل فترة
                for (const period of application.periods) {
                    const [year, month] = period.split('-').map(Number);

                    // التحقق من أن الموظف كان موجوداً في تلك الفترة
                    if (employee.hireDate) {
                        const hireDate = new Date(employee.hireDate);
                        const periodDate = new Date(year, month - 1, 1);
                        if (hireDate > periodDate) {
                            continue; // الموظف لم يكن معيناً بعد
                        }
                    }

                    try {
                        // إثراء السياق للفترة
                        const context = await this.policyContext.enrichContext(
                            employee.id,
                            month,
                            year,
                        );

                        // تنفيذ السياسة
                        const executionResult = await this.policyExecutor.evaluateAdvancedPolicy(
                            application.policy,
                            context,
                        );

                        if (executionResult.success && executionResult.amount !== 0) {
                            const periodResult = {
                                period,
                                amount: Math.abs(executionResult.amount),
                                type: executionResult.amount > 0 ? 'ADDITION' : 'DEDUCTION' as 'ADDITION' | 'DEDUCTION',
                                details: executionResult,
                            };

                            employeeResult.periods.push(periodResult);
                            employeeResult.totalAmount += executionResult.amount;

                            if (periodResult.type === 'ADDITION') {
                                totalAdditions += periodResult.amount;
                            } else {
                                totalDeductions += periodResult.amount;
                            }
                        }
                    } catch (error) {
                        this.logger.warn(
                            `Error calculating retro for ${employee.id} in ${period}: ${error.message}`,
                        );
                    }
                }

                // تحديد نوع الإجمالي
                if (employeeResult.totalAmount > 0) {
                    employeeResult.netType = 'ADDITION';
                } else if (employeeResult.totalAmount < 0) {
                    employeeResult.netType = 'DEDUCTION';
                }

                // إضافة فقط إذا كان هناك تأثير
                if (employeeResult.periods.length > 0) {
                    results.push(employeeResult);
                }
            }

            // تحديث الطلب بالنتائج
            const netAmount = totalAdditions - totalDeductions;

            await this.prisma.smartPolicyRetroApplication.update({
                where: { id: applicationId },
                data: {
                    status: 'REVIEWED',
                    totalEmployeesAffected: results.length,
                    totalAdditions,
                    totalDeductions,
                    netAmount,
                    results: results as any,
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
        } catch (error) {
            // إعادة الحالة للانتظار في حالة الخطأ
            await this.prisma.smartPolicyRetroApplication.update({
                where: { id: applicationId },
                data: { status: 'PENDING' },
            });

            throw error;
        }
    }

    /**
     * الموافقة على طلب التطبيق الرجعي
     */
    async approve(
        applicationId: string,
        approvedBy: string,
        approvedByName: string,
    ) {
        const application = await this.prisma.smartPolicyRetroApplication.findUnique({
            where: { id: applicationId },
        });

        if (!application) {
            throw new NotFoundException('طلب التطبيق الرجعي غير موجود');
        }

        if (application.status !== 'REVIEWED') {
            throw new BadRequestException('يجب حساب النتائج أولاً قبل الموافقة');
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

    /**
     * 🔥 تطبيق الأثر الرجعي فعلياً (إنشاء RetroPay records)
     */
    async apply(
        applicationId: string,
        targetPayrollPeriod: string,
    ): Promise<{
        retroPayRecords: number;
        totalAmount: number;
    }> {
        const application = await this.prisma.smartPolicyRetroApplication.findUnique({
            where: { id: applicationId },
            include: { policy: true },
        });

        if (!application) {
            throw new NotFoundException('طلب التطبيق الرجعي غير موجود');
        }

        if (application.status !== 'APPROVED') {
            throw new BadRequestException('يجب الموافقة على الطلب أولاً');
        }

        const results = (application.results as any[]) || [];
        let createdRecords = 0;
        let totalAmount = 0;

        for (const result of results) {
            if (result.totalAmount === 0) continue;

            try {
                // إنشاء سجل RetroPay
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
            } catch (error) {
                this.logger.warn(
                    `Error creating RetroPay for ${result.employeeId}: ${error.message}`,
                );
            }
        }

        // تحديث حالة الطلب
        await this.prisma.smartPolicyRetroApplication.update({
            where: { id: applicationId },
            data: {
                status: 'APPLIED',
                appliedAt: new Date(),
                appliedToPayrollPeriod: targetPayrollPeriod,
            },
        });

        this.logger.log(
            `Retro application ${applicationId} applied: ${createdRecords} records, ${totalAmount} total`,
        );

        return {
            retroPayRecords: createdRecords,
            totalAmount,
        };
    }

    /**
     * إلغاء طلب التطبيق الرجعي
     */
    async cancel(applicationId: string) {
        const application = await this.prisma.smartPolicyRetroApplication.findUnique({
            where: { id: applicationId },
        });

        if (!application) {
            throw new NotFoundException('طلب التطبيق الرجعي غير موجود');
        }

        if (application.status === 'APPLIED') {
            throw new BadRequestException('لا يمكن إلغاء طلب تم تطبيقه بالفعل');
        }

        return this.prisma.smartPolicyRetroApplication.update({
            where: { id: applicationId },
            data: { status: 'CANCELLED' },
        });
    }

    /**
     * جلب طلبات التطبيق الرجعي لسياسة
     */
    async findByPolicy(policyId: string) {
        return this.prisma.smartPolicyRetroApplication.findMany({
            where: { policyId },
            orderBy: { requestedAt: 'desc' },
        });
    }

    /**
     * جلب طلبات التطبيق الرجعي للشركة
     */
    async findByCompany(
        companyId: string,
        options?: { status?: RetroApplicationStatus },
    ) {
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

    /**
     * جلب تفاصيل طلب تطبيق رجعي
     */
    async findOne(applicationId: string) {
        const application = await this.prisma.smartPolicyRetroApplication.findUnique({
            where: { id: applicationId },
            include: {
                policy: true,
            },
        });

        if (!application) {
            throw new NotFoundException('طلب التطبيق الرجعي غير موجود');
        }

        return application;
    }

    /**
     * توليد قائمة الفترات بين تاريخين
     */
    private generatePeriods(startPeriod: string, endPeriod: string): string[] {
        const periods: string[] = [];

        const [startYear, startMonth] = startPeriod.split('-').map(Number);
        const [endYear, endMonth] = endPeriod.split('-').map(Number);

        let currentYear = startYear;
        let currentMonth = startMonth;

        while (
            currentYear < endYear ||
            (currentYear === endYear && currentMonth <= endMonth)
        ) {
            periods.push(`${currentYear}-${currentMonth.toString().padStart(2, '0')}`);

            currentMonth++;
            if (currentMonth > 12) {
                currentMonth = 1;
                currentYear++;
            }
        }

        return periods;
    }
}
