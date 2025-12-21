import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PayslipLineSource } from '@prisma/client';
import { PayslipLinesService } from '../payslips/payslip-lines.service';

/**
 * GosiCalculationService
 * Handles Saudi GOSI (التأمينات الاجتماعية) calculations
 * 
 * Key rules:
 * - Employee share: employeeRate + sanedRate (if applicable)
 * - Employer share: employerRate + hazardRate
 * - Base: sum of gosiEligible components, capped by min/max
 * - Only applies to Saudi employees (if isSaudiOnly=true)
 */

export interface GosiResult {
    applies: boolean;
    reason?: string;
    base: number;
    employeeShare: number;
    employerShare: number;
    breakdown: {
        employeeRate: number;
        employerRate: number;
        sanedRate: number;
        hazardRate: number;
    };
}

export interface GosiTraceStep {
    step: string;
    description: string;
    formula: string;
    result: number;
}

@Injectable()
export class GosiCalculationService {
    private readonly logger = new Logger(GosiCalculationService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly payslipLinesService: PayslipLinesService,
    ) { }

    /**
     * Normalize money to 2 decimal places
     */
    private normalizeMoney(amount: number): number {
        return Math.round(amount * 100) / 100;
    }

    /**
     * Get active GOSI config for company
     */
    async getActiveConfig(companyId: string) {
        return this.prisma.gosiConfig.findFirst({
            where: { companyId, isActive: true },
            orderBy: { effectiveDate: 'desc' }
        });
    }

    /**
     * Check if employee is eligible for GOSI
     */
    isEmployeeEligible(employee: { isSaudi?: boolean | null }, config: { isSaudiOnly: boolean }): boolean {
        if (config.isSaudiOnly) {
            return employee.isSaudi === true;
        }
        return true; // Apply to all if isSaudiOnly is false
    }

    /**
     * Calculate GOSI base from earnings
     * Only includes components with gosiEligible=true
     */
    async calculateGosiBase(
        payslipId: string,
        baseSalary: number,
        companyId: string,
        config: {
            minBaseSalary: number;
            maxCapAmount: number;
            includeAllowances: boolean;
        }
    ): Promise<{ base: number; components: string[] }> {
        // Get payslip lines with component info
        const lines = await this.prisma.payslipLine.findMany({
            where: { payslipId },
            include: { component: true }
        });

        let base = 0;
        const components: string[] = [];

        for (const line of lines) {
            // Only include EARNING lines with gosiEligible=true
            if (line.sign === 'EARNING' && line.component.gosiEligible) {
                base += Number(line.amount);
                components.push(line.component.code);
            }
        }

        // If no gosiEligible lines found, use baseSalary as fallback
        if (base === 0) {
            base = baseSalary;
            components.push('BASIC (fallback)');
        }

        // Apply min/max caps
        const minBase = Number(config.minBaseSalary) || 0;
        const maxCap = Number(config.maxCapAmount) || 45000;

        if (base < minBase) base = minBase;
        if (base > maxCap) base = maxCap;

        return {
            base: this.normalizeMoney(base),
            components
        };
    }

    /**
     * Calculate GOSI shares for employee and employer
     */
    calculateShares(
        base: number,
        config: {
            employeeRate: number;
            employerRate: number;
            sanedRate: number;
            hazardRate: number;
        }
    ): { employeeShare: number; employerShare: number } {
        // Employee: pension rate + SANED (if applicable to employee)
        // Standard Saudi: 9% pension + 0.75% SANED from employee
        const employeeRate = Number(config.employeeRate) / 100;
        const sanedRate = Number(config.sanedRate) / 100;
        const employeeShare = this.normalizeMoney(base * (employeeRate + sanedRate));

        // Employer: pension rate + hazard rate
        // Standard Saudi: 9% pension + 2% hazard from employer
        const employerRate = Number(config.employerRate) / 100;
        const hazardRate = Number(config.hazardRate) / 100;
        const employerShare = this.normalizeMoney(base * (employerRate + hazardRate));

        return { employeeShare, employerShare };
    }

    /**
     * Full GOSI calculation for an employee
     */
    async calculateForEmployee(
        employeeId: string,
        payslipId: string,
        baseSalary: number,
        companyId: string
    ): Promise<{ result: GosiResult; trace: GosiTraceStep[] }> {
        const trace: GosiTraceStep[] = [];

        // 1. Get active config
        const config = await this.getActiveConfig(companyId);
        if (!config) {
            return {
                result: {
                    applies: false,
                    reason: 'لا يوجد إعدادات GOSI نشطة للشركة',
                    base: 0,
                    employeeShare: 0,
                    employerShare: 0,
                    breakdown: { employeeRate: 0, employerRate: 0, sanedRate: 0, hazardRate: 0 }
                },
                trace
            };
        }

        // 2. Get employee info
        const employee = await this.prisma.user.findUnique({
            where: { id: employeeId },
            select: { isSaudi: true, nationality: true }
        });

        if (!employee) {
            return {
                result: {
                    applies: false,
                    reason: 'الموظف غير موجود',
                    base: 0,
                    employeeShare: 0,
                    employerShare: 0,
                    breakdown: { employeeRate: 0, employerRate: 0, sanedRate: 0, hazardRate: 0 }
                },
                trace
            };
        }

        // 3. Check eligibility
        if (!this.isEmployeeEligible(employee, config)) {
            trace.push({
                step: 'gosiEligibility',
                description: 'التحقق من الأهلية للتأمينات',
                formula: `isSaudi=${employee.isSaudi}, isSaudiOnly=${config.isSaudiOnly}`,
                result: 0
            });

            return {
                result: {
                    applies: false,
                    reason: 'الموظف غير سعودي والتأمينات للسعوديين فقط',
                    base: 0,
                    employeeShare: 0,
                    employerShare: 0,
                    breakdown: {
                        employeeRate: Number(config.employeeRate),
                        employerRate: Number(config.employerRate),
                        sanedRate: Number(config.sanedRate),
                        hazardRate: Number(config.hazardRate)
                    }
                },
                trace
            };
        }

        trace.push({
            step: 'gosiEligibility',
            description: 'التحقق من الأهلية للتأمينات',
            formula: `isSaudi=${employee.isSaudi} ✅`,
            result: 1
        });

        // 4. Calculate base
        const { base, components } = await this.calculateGosiBase(
            payslipId,
            baseSalary,
            companyId,
            {
                minBaseSalary: Number(config.minBaseSalary),
                maxCapAmount: Number(config.maxCapAmount),
                includeAllowances: config.includeAllowances
            }
        );

        trace.push({
            step: 'gosiBase',
            description: 'قاعدة حساب التأمينات',
            formula: `SUM(${components.join(', ')}) = ${base} (cap: ${config.maxCapAmount})`,
            result: base
        });

        // 5. Calculate shares
        const { employeeShare, employerShare } = this.calculateShares(base, {
            employeeRate: Number(config.employeeRate),
            employerRate: Number(config.employerRate),
            sanedRate: Number(config.sanedRate),
            hazardRate: Number(config.hazardRate)
        });

        trace.push({
            step: 'gosiEmployee',
            description: 'اشتراك الموظف',
            formula: `${base} × (${config.employeeRate}% + ${config.sanedRate}%) = ${employeeShare}`,
            result: employeeShare
        });

        trace.push({
            step: 'gosiEmployer',
            description: 'مساهمة صاحب العمل',
            formula: `${base} × (${config.employerRate}% + ${config.hazardRate}%) = ${employerShare}`,
            result: employerShare
        });

        return {
            result: {
                applies: true,
                base,
                employeeShare,
                employerShare,
                breakdown: {
                    employeeRate: Number(config.employeeRate),
                    employerRate: Number(config.employerRate),
                    sanedRate: Number(config.sanedRate),
                    hazardRate: Number(config.hazardRate)
                }
            },
            trace
        };
    }

    /**
     * Save GOSI lines to payslip (idempotent)
     * Requires GOSI_EMPLOYEE and GOSI_EMPLOYER components to exist
     */
    async saveGosiLines(
        payslipId: string,
        employeeShare: number,
        employerShare: number,
        companyId: string
    ): Promise<{ saved: boolean; error?: string }> {
        // Check if run is locked (via payslip)
        const payslip = await this.prisma.payslip.findUnique({
            where: { id: payslipId },
            include: { run: true }
        });

        if (payslip?.run?.lockedAt) {
            return { saved: false, error: 'Run is locked, cannot modify GOSI lines' };
        }

        // Delete existing STATUTORY lines (idempotency)
        await this.prisma.payslipLine.deleteMany({
            where: { payslipId, sourceType: PayslipLineSource.STATUTORY }
        });

        // Get or create GOSI components
        let employeeComponent = await this.prisma.salaryComponent.findFirst({
            where: { companyId, code: 'GOSI_EMPLOYEE' }
        });

        if (!employeeComponent) {
            employeeComponent = await this.prisma.salaryComponent.create({
                data: {
                    companyId,
                    code: 'GOSI_EMPLOYEE',
                    nameAr: 'خصم التأمينات (الموظف)',
                    nameEn: 'GOSI Employee Contribution',
                    type: 'DEDUCTION',
                    gosiEligible: false, // GOSI itself is not gosiEligible
                    isActive: true
                }
            });
        }

        let employerComponent = await this.prisma.salaryComponent.findFirst({
            where: { companyId, code: 'GOSI_EMPLOYER' }
        });

        if (!employerComponent) {
            employerComponent = await this.prisma.salaryComponent.create({
                data: {
                    companyId,
                    code: 'GOSI_EMPLOYER',
                    nameAr: 'مساهمة التأمينات (صاحب العمل)',
                    nameEn: 'GOSI Employer Contribution',
                    type: 'EARNING', // Displayed as info, not deducted from employee
                    gosiEligible: false,
                    isActive: true
                }
            });
        }

        // Create GOSI lines
        const linesToCreate = [];

        if (employeeShare > 0) {
            linesToCreate.push({
                payslipId,
                componentId: employeeComponent.id,
                sign: 'DEDUCTION',
                amount: this.normalizeMoney(employeeShare),
                sourceType: PayslipLineSource.STATUTORY,
                sourceRef: 'GOSI',
                descriptionAr: 'خصم التأمينات الاجتماعية (الموظف)',
            });
        }

        if (employerShare > 0) {
            linesToCreate.push({
                payslipId,
                componentId: employerComponent.id,
                sign: 'EARNING', // Info only, doesn't affect net
                amount: this.normalizeMoney(employerShare),
                sourceType: PayslipLineSource.STATUTORY,
                sourceRef: 'GOSI_EMPLOYER',
                descriptionAr: 'مساهمة التأمينات الاجتماعية (صاحب العمل)',
            });
        }

        if (linesToCreate.length > 0) {
            await this.prisma.payslipLine.createMany({ data: linesToCreate });
            this.logger.log(`Saved ${linesToCreate.length} GOSI lines for payslip ${payslipId}`);
        }

        return { saved: true };
    }

    /**
     * Generate GOSI report for a payroll run
     */
    async generateReport(runId: string, companyId: string) {
        const payslips = await this.prisma.payslip.findMany({
            where: { runId, companyId },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        isSaudi: true,
                        nationality: true
                    }
                },
                lines: {
                    where: { sourceType: PayslipLineSource.STATUTORY },
                    include: { component: true }
                }
            }
        });

        const report = payslips.map(payslip => {
            const employeeLine = payslip.lines.find(l => l.component.code === 'GOSI_EMPLOYEE');
            const employerLine = payslip.lines.find(l => l.component.code === 'GOSI_EMPLOYER');

            return {
                employeeId: payslip.employee.id,
                employeeCode: payslip.employee.employeeCode || '-',
                employeeName: `${payslip.employee.firstName} ${payslip.employee.lastName}`,
                isSaudi: payslip.employee.isSaudi,
                nationality: payslip.employee.nationality,
                baseSalary: Number(payslip.baseSalary),
                employeeShare: employeeLine ? Number(employeeLine.amount) : 0,
                employerShare: employerLine ? Number(employerLine.amount) : 0,
                totalContribution: (employeeLine ? Number(employeeLine.amount) : 0) +
                    (employerLine ? Number(employerLine.amount) : 0)
            };
        });

        const totals = {
            totalEmployees: report.filter(r => r.employeeShare > 0).length,
            totalEmployeeShare: report.reduce((sum, r) => sum + r.employeeShare, 0),
            totalEmployerShare: report.reduce((sum, r) => sum + r.employerShare, 0),
            grandTotal: report.reduce((sum, r) => sum + r.totalContribution, 0)
        };

        return { report, totals };
    }
}
