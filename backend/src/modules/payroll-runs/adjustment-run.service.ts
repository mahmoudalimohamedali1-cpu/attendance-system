import { Injectable, ForbiddenException, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PayslipLinesService } from '../payslips/payslip-lines.service';
import { PayslipLineSource } from '@prisma/client';

/**
 * AdjustmentRunService
 * Handles adjustment runs for locked payroll runs
 * Key rule: Original run must be locked before adjustments are allowed
 */
@Injectable()
export class AdjustmentRunService {
    private readonly logger = new Logger(AdjustmentRunService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly payslipLinesService: PayslipLinesService,
    ) { }

    /**
     * Create an adjustment run for a locked original run
     * Guard: Original must be locked
     */
    async createAdjustmentRun(
        originalRunId: string,
        companyId: string,
        reason: string,
        createdById: string,
    ): Promise<{ id: string; message: string }> {
        // 1. Validate original run exists and is locked
        const originalRun = await this.prisma.payrollRun.findFirst({
            where: { id: originalRunId, companyId },
            select: { id: true, lockedAt: true, periodId: true, isAdjustment: true }
        });

        if (!originalRun) {
            throw new NotFoundException('الـ Run الأصلي غير موجود');
        }

        if (!originalRun.lockedAt) {
            throw new ForbiddenException('لا يمكن إنشاء تعديل على Run غير مقفل. يجب قفل الـ Run الأصلي أولاً.');
        }

        if (!reason || reason.trim().length < 5) {
            throw new BadRequestException('سبب التعديل مطلوب (5 أحرف على الأقل)');
        }

        // 2. Check if adjusting an adjustment (allow chain but warn)
        if (originalRun.isAdjustment) {
            this.logger.warn(`Creating adjustment on top of adjustment run ${originalRunId}`);
        }

        // 3. Create adjustment run
        const adjustmentRun = await this.prisma.payrollRun.create({
            data: {
                companyId,
                periodId: originalRun.periodId,
                isAdjustment: true,
                originalRunId,
                adjustmentReason: reason.trim(),
                status: 'DRAFT',
                processedBy: createdById,
            }
        });

        this.logger.log(`Created adjustment run ${adjustmentRun.id} for original ${originalRunId}`);

        return {
            id: adjustmentRun.id,
            message: `تم إنشاء Run تعديل جديد: ${adjustmentRun.id}`,
        };
    }

    /**
     * Add adjustment line to a payslip in an adjustment run
     * Creates or finds payslip, adds ADJUSTMENT line
     */
    async addAdjustmentLine(
        adjustmentRunId: string,
        employeeId: string,
        companyId: string,
        adjustmentData: {
            componentId: string;
            sign: 'EARNING' | 'DEDUCTION';
            amount: number;
            reason: string;
        }
    ): Promise<{ payslipLineId: string }> {
        // 1. Validate adjustment run
        const adjustmentRun = await this.prisma.payrollRun.findFirst({
            where: { id: adjustmentRunId, companyId, isAdjustment: true },
            select: { id: true, lockedAt: true, periodId: true }
        });

        if (!adjustmentRun) {
            throw new NotFoundException('الـ Adjustment Run غير موجود');
        }

        if (adjustmentRun.lockedAt) {
            throw new ForbiddenException('الـ Adjustment Run مقفل ولا يمكن التعديل عليه');
        }

        // 2. Validate component belongs to company
        const component = await this.prisma.salaryComponent.findFirst({
            where: { id: adjustmentData.componentId, companyId }
        });

        if (!component) {
            throw new BadRequestException('مكوّن الراتب غير موجود أو لا ينتمي لهذه الشركة');
        }

        // 3. Ensure payslip exists for this adjustment run + employee
        let payslip = await this.prisma.payslip.findFirst({
            where: { runId: adjustmentRunId, employeeId }
        });

        if (!payslip) {
            // Get original payslip for base values
            const originalPayslip = await this.prisma.payslip.findFirst({
                where: {
                    run: { originalRunId: null }, // Original run's payslip
                    employeeId,
                    periodId: adjustmentRun.periodId
                },
                orderBy: { createdAt: 'desc' }
            });

            payslip = await this.prisma.payslip.create({
                data: {
                    companyId,
                    employeeId,
                    periodId: adjustmentRun.periodId,
                    runId: adjustmentRunId,
                    baseSalary: originalPayslip?.baseSalary || 0,
                    grossSalary: 0, // Will be calculated from adjustment
                    totalDeductions: 0,
                    netSalary: 0,
                    status: 'DRAFT',
                }
            });
        }

        // 4. Create adjustment line
        const normalizedAmount = this.payslipLinesService.normalizeMoney(adjustmentData.amount);

        const payslipLine = await this.prisma.payslipLine.create({
            data: {
                payslipId: payslip.id,
                componentId: adjustmentData.componentId,
                sign: adjustmentData.sign,
                amount: normalizedAmount,
                sourceType: PayslipLineSource.ADJUSTMENT,
                sourceRef: `ADJ:${adjustmentRunId}`,
                descriptionAr: adjustmentData.reason || 'تعديل يدوي',
            }
        });

        // 5. Update payslip totals
        await this.updateAdjustmentPayslipTotals(payslip.id);

        this.logger.log(`Added adjustment line ${payslipLine.id} to payslip ${payslip.id}`);

        return { payslipLineId: payslipLine.id };
    }

    /**
     * Update payslip totals after adding adjustment lines
     */
    private async updateAdjustmentPayslipTotals(payslipId: string): Promise<void> {
        const lines = await this.prisma.payslipLine.findMany({
            where: { payslipId },
            select: { sign: true, amount: true }
        });

        let earnings = 0;
        let deductions = 0;

        for (const line of lines) {
            const amount = Number(line.amount);
            if (line.sign === 'EARNING') {
                earnings += amount;
            } else {
                deductions += amount;
            }
        }

        await this.prisma.payslip.update({
            where: { id: payslipId },
            data: {
                grossSalary: this.payslipLinesService.normalizeMoney(earnings),
                totalDeductions: this.payslipLinesService.normalizeMoney(deductions),
                netSalary: this.payslipLinesService.normalizeMoney(earnings - deductions),
            }
        });
    }

    /**
     * Get all adjustment runs for an original run
     */
    async getAdjustmentRuns(originalRunId: string, companyId: string) {
        return this.prisma.payrollRun.findMany({
            where: { originalRunId, companyId },
            include: {
                payslips: {
                    include: {
                        lines: {
                            where: { sourceType: PayslipLineSource.ADJUSTMENT }
                        },
                        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Lock an adjustment run (finalize)
     */
    async lockAdjustmentRun(
        adjustmentRunId: string,
        companyId: string,
        lockedById: string
    ): Promise<{ message: string }> {
        const run = await this.prisma.payrollRun.findFirst({
            where: { id: adjustmentRunId, companyId, isAdjustment: true }
        });

        if (!run) {
            throw new NotFoundException('الـ Adjustment Run غير موجود');
        }

        if (run.lockedAt) {
            throw new BadRequestException('الـ Adjustment Run مقفل بالفعل');
        }

        await this.prisma.payrollRun.update({
            where: { id: adjustmentRunId },
            data: {
                lockedAt: new Date(),
                lockedBy: lockedById,
                status: 'LOCKED',
            }
        });

        this.logger.log(`Locked adjustment run ${adjustmentRunId} by ${lockedById}`);

        return { message: 'تم قفل الـ Adjustment Run بنجاح' };
    }
}
