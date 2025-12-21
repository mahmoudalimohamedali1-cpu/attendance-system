import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PolicyPayrollLine } from '../payroll-calculation/dto/calculation.types';
import { PayslipLineSource } from '@prisma/client';

/**
 * PayslipLinesService
 * Handles idempotent saving of payslip lines from different sources
 * Implements locking guards and merge-by-component strategy
 */
@Injectable()
export class PayslipLinesService {
    private readonly logger = new Logger(PayslipLinesService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Normalize money to 2 decimal places (halalas)
     */
    normalizeMoney(amount: number): number {
        return Math.round(amount * 100) / 100;
    }

    /**
     * Merge policy lines by componentId + sign
     * Best of both: simple payslip + detailed trace
     */
    mergeLinesByComponent(lines: PolicyPayrollLine[]): PolicyPayrollLine[] {
        if (!lines || lines.length === 0) return [];

        const map = new Map<string, PolicyPayrollLine>();

        for (const line of lines) {
            const key = `${line.componentId}:${line.sign}`;

            if (map.has(key)) {
                const existing = map.get(key)!;
                // Sum amounts
                existing.amount = this.normalizeMoney(existing.amount + line.amount);
                // Sum units if available
                if (line.units !== undefined) {
                    existing.units = (existing.units || 0) + line.units;
                }
                // Rate becomes null if different (can't avg meaningfully)
                if (existing.rate !== line.rate) {
                    existing.rate = undefined;
                }
                // Mark as merged
                existing.source = {
                    policyId: 'MERGED',
                    policyCode: 'MERGED',
                    ruleId: 'MERGED',
                    ruleCode: 'MERGED',
                };
                // Update description
                existing.descriptionAr = `${existing.componentName} - مجمّع`;
            } else {
                map.set(key, { ...line, amount: this.normalizeMoney(line.amount) });
            }
        }

        return Array.from(map.values());
    }

    /**
     * Check if payroll run is locked
     * Returns true if locked, false otherwise
     */
    async isRunLocked(runId: string): Promise<boolean> {
        const run = await this.prisma.payrollRun.findUnique({
            where: { id: runId },
            select: { lockedAt: true }
        });
        return run?.lockedAt !== null && run?.lockedAt !== undefined;
    }

    /**
     * Guard: Throws if run is locked
     */
    async guardNotLocked(runId: string | null | undefined): Promise<void> {
        if (!runId) return; // No run attached, allow

        if (await this.isRunLocked(runId)) {
            throw new ForbiddenException('لا يمكن تعديل قسيمة مرتبطة بـ Run مقفل. الـ Run مقفل ولا يسمح بالتعديلات.');
        }
    }

    /**
     * Delete existing policy lines for a payslip (idempotency)
     */
    async deletePolicyLines(payslipId: string): Promise<number> {
        const result = await this.prisma.payslipLine.deleteMany({
            where: {
                payslipId,
                sourceType: PayslipLineSource.POLICY
            }
        });
        return result.count;
    }

    /**
     * Save policy-generated payslip lines with idempotency
     * 1. Guard: Check if run is locked
     * 2. Delete existing POLICY lines
     * 3. Merge by componentId + sign
     * 4. Insert new lines
     */
    async savePolicyLines(
        payslipId: string,
        policyLines: PolicyPayrollLine[],
        companyId: string
    ): Promise<{ inserted: number; deleted: number }> {
        // 1. Get payslip with run info
        const payslip = await this.prisma.payslip.findUnique({
            where: { id: payslipId },
            select: { id: true, runId: true, companyId: true }
        });

        if (!payslip) {
            throw new ForbiddenException('القسيمة غير موجودة');
        }

        // Tenant safety check
        if (payslip.companyId && payslip.companyId !== companyId) {
            throw new ForbiddenException('لا يمكن الوصول لقسيمة شركة أخرى');
        }

        // 2. Guard: Check if run is locked
        await this.guardNotLocked(payslip.runId);

        // 3. Delete existing POLICY lines (idempotency)
        const deleted = await this.deletePolicyLines(payslipId);
        if (deleted > 0) {
            this.logger.debug(`Deleted ${deleted} existing policy lines for payslip ${payslipId}`);
        }

        // 4. Return early if no new lines
        if (!policyLines || policyLines.length === 0) {
            return { inserted: 0, deleted };
        }

        // 5. Merge by componentId + sign
        const merged = this.mergeLinesByComponent(policyLines);

        // 6. Validate all componentIds belong to same company
        const componentIds = [...new Set(merged.map(l => l.componentId).filter(Boolean))];
        if (componentIds.length > 0) {
            const validComponents = await this.prisma.salaryComponent.findMany({
                where: { id: { in: componentIds }, companyId },
                select: { id: true }
            });
            const validIds = new Set(validComponents.map(c => c.id));
            const invalid = componentIds.filter(id => !validIds.has(id));
            if (invalid.length > 0) {
                this.logger.warn(`Invalid component IDs for company ${companyId}: ${invalid.join(', ')}`);
            }
        }

        // 7. Insert new lines
        const validLines = merged.filter(l => l.componentId); // Skip lines without componentId

        if (validLines.length === 0) {
            return { inserted: 0, deleted };
        }

        await this.prisma.payslipLine.createMany({
            data: validLines.map(line => ({
                payslipId,
                componentId: line.componentId,
                sign: line.sign,
                amount: this.normalizeMoney(line.amount),
                sourceType: PayslipLineSource.POLICY,
                sourceRef: line.source.policyId === 'MERGED'
                    ? 'MERGED'
                    : `${line.source.policyId}:${line.source.ruleId}`,
                descriptionAr: line.descriptionAr || null,
                units: line.units !== undefined ? this.normalizeMoney(line.units) : null,
                rate: line.rate !== undefined ? line.rate : null,
            }))
        });

        this.logger.log(`Saved ${validLines.length} policy lines for payslip ${payslipId}`);

        return { inserted: validLines.length, deleted };
    }

    /**
     * Ensure payslip exists for employee in run
     * Creates one if not exists
     */
    async ensurePayslip(
        runId: string,
        employeeId: string,
        companyId: string,
        periodId: string,
        calculationResult: {
            baseSalary: number;
            grossSalary: number;
            totalDeductions: number;
            netSalary: number;
            calculationTrace: any[];
        }
    ): Promise<string> {
        // Guard: Check if run is locked
        await this.guardNotLocked(runId);

        // Find or create payslip
        let payslip = await this.prisma.payslip.findFirst({
            where: { runId, employeeId },
            select: { id: true }
        });

        if (payslip) {
            // Update existing payslip
            await this.prisma.payslip.update({
                where: { id: payslip.id },
                data: {
                    baseSalary: this.normalizeMoney(calculationResult.baseSalary),
                    grossSalary: this.normalizeMoney(calculationResult.grossSalary),
                    totalDeductions: this.normalizeMoney(calculationResult.totalDeductions),
                    netSalary: this.normalizeMoney(calculationResult.netSalary),
                    calculationTrace: calculationResult.calculationTrace,
                }
            });
            return payslip.id;
        }

        // Create new payslip
        const newPayslip = await this.prisma.payslip.create({
            data: {
                companyId,
                employeeId,
                periodId,
                runId,
                baseSalary: this.normalizeMoney(calculationResult.baseSalary),
                grossSalary: this.normalizeMoney(calculationResult.grossSalary),
                totalDeductions: this.normalizeMoney(calculationResult.totalDeductions),
                netSalary: this.normalizeMoney(calculationResult.netSalary),
                calculationTrace: calculationResult.calculationTrace,
                status: 'DRAFT',
            }
        });

        return newPayslip.id;
    }
}
