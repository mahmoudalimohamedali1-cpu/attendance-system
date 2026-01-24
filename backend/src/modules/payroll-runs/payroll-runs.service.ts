import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { PayslipLineSource, AuditAction, PayrollStatus } from '@prisma/client';

import { PayrollCalculationService } from '../payroll-calculation/payroll-calculation.service';
import { PayrollLedgerService } from '../payroll-calculation/payroll-ledger.service';
import { AuditService } from '../audit/audit.service';
import { EmployeeDebtService } from '../employee-debt/employee-debt.service';
import { GosiValidationService } from '../gosi/gosi-validation.service';
import { PayrollValidationService } from './payroll-validation.service';
import { PayrollAdjustmentsService } from '../payroll-adjustments/payroll-adjustments.service';
import { DebtSourceType } from '@prisma/client';

// ✅ Decimal imports for financial calculations
import {
    toDecimal,
    toNumber,
    toFixed,
    add,
    sub,
    mul,
    isPositive,
    isNegative,
    isZero,
    abs,
    round,
    max,
    ZERO,
    applyDeductionCap,
    percent,
} from '../../common/utils/decimal.util';


@Injectable()
export class PayrollRunsService {
    private readonly logger = new Logger(PayrollRunsService.name);

    constructor(
        private prisma: PrismaService,
        private calculationService: PayrollCalculationService,
        private auditService: AuditService,
        private ledgerService: PayrollLedgerService,
        private employeeDebtService: EmployeeDebtService,
        private gosiValidationService: GosiValidationService,
        private payrollValidationService: PayrollValidationService,
        private adjustmentsService: PayrollAdjustmentsService,
    ) { }

    async create(dto: CreatePayrollRunDto, companyId: string, userId: string) {
        const period = await this.prisma.payrollPeriod.findFirst({ where: { id: dto.periodId, companyId } });
        if (!period) throw new NotFoundException('فترة الرواتب غير موجودة');
        if (period.status === 'PAID') throw new BadRequestException('لا يمكن تشغيل الرواتب لفترة مدفوعة بالفعل');

        // ✅ GOSI Validation Gate - بوابة التحقق من إعدادات التأمينات
        const gosiValidation = await this.gosiValidationService.validateForPayroll(
            companyId,
            period.startDate,
            { strictMode: false, allowExpired: false }
        );

        if (!gosiValidation.canProceed) {
            const errorMessages = gosiValidation.issues
                .filter(i => i.severity === 'ERROR')
                .map(i => i.messageAr)
                .join('، ');

            throw new BadRequestException(
                `فشل التحقق من إعدادات التأمينات الاجتماعية: ${errorMessages}. ` +
                `يرجى مراجعة إعدادات GOSI قبل تشغيل الرواتب.`
            );
        }

        // Log warnings if any
        if (gosiValidation.summary.warnings > 0) {
            const warningMessages = gosiValidation.issues
                .filter(i => i.severity === 'WARNING')
                .map(i => `${i.code}: ${i.messageAr}`)
                .join(', ');
            this.logger.warn(`GOSI Validation Warnings for payroll run: ${warningMessages}`);
        }

        // ✅ التحقق من عدم وجود تشغيل سابق لنفس الفترة (منع التشغيل المتكرر)
        const existingRun = await this.prisma.payrollRun.findFirst({
            where: {
                periodId: dto.periodId,
                companyId,
                status: { notIn: [PayrollStatus.CANCELLED, PayrollStatus.ARCHIVED] }
            }
        });

        if (existingRun) {
            throw new BadRequestException(
                `يوجد تشغيل رواتب سابق لهذه الفترة (ID: ${existingRun.id}). ` +
                `الحالة: ${existingRun.status}. ` +
                `يرجى إلغاء التشغيل السابق أو استخدام فترة جديدة.`
            );
        }

        // 1. التأكد من وجود المكونات النظامية (لخصم السلف)
        let loanComp = await this.prisma.salaryComponent.findFirst({ where: { code: 'LOAN_DED', companyId } });
        if (!loanComp) {
            loanComp = await this.prisma.salaryComponent.create({
                data: { code: 'LOAN_DED', nameAr: 'خصم سلفة', type: 'DEDUCTION', nature: 'VARIABLE', companyId } as any
            });
        }

        // تجهيز قائمة الموظفين المستثنين
        const excludedIds = new Set(dto.excludedEmployeeIds || []);

        // تجهيز خريطة التعديلات (مكافآت/خصومات)
        const adjustmentsMap = new Map<string, { type: 'bonus' | 'deduction'; amount: number; reason: string }[]>();
        if (dto.adjustments) {
            for (const adj of dto.adjustments) {
                adjustmentsMap.set(adj.employeeId, adj.items);
            }
        }

        const employees = await this.prisma.user.findMany({
            where: {
                companyId,
                id: dto.employeeIds ? { in: dto.employeeIds } : undefined,
                branchId: dto.branchId || undefined,
                status: 'ACTIVE',
                salaryAssignments: { some: { isActive: true } }
            },
            include: {
                salaryAssignments: {
                    where: { isActive: true },
                    include: {
                        structure: true
                    }
                },
                advanceRequests: {
                    where: {
                        status: 'APPROVED',
                        startDate: { lte: period.endDate },
                        endDate: { gte: period.startDate }
                    }
                },
                // جلب توزيعات مراكز التكلفة الفعالة
                costCenterAllocations: {
                    where: {
                        isActive: true,
                        OR: [
                            { effectiveTo: null },
                            { effectiveTo: { gte: new Date() } }
                        ]
                    },
                    select: {
                        costCenterId: true,
                        percentage: true
                    }
                }
            } as any
        }) as any[];

        // تطبيق فلتر الموظفين المستثنين
        const filteredEmployees = employees.filter(emp => !excludedIds.has(emp.id));

        if (filteredEmployees.length === 0) throw new BadRequestException('لا يوجد موظفين نشطين لديهم تعيينات رواتب للفلتر المختار');

        const result = await this.prisma.$transaction(async (tx) => {
            const run = await tx.payrollRun.create({
                data: {
                    companyId,
                    periodId: dto.periodId,
                    processedBy: userId,
                    status: 'DRAFT'
                }
            });

            // 🔧 Fetch or create adjustment components for manual/adjustment payslip lines
            const adjAddComponent = await tx.salaryComponent.findFirst({
                where: { companyId, code: 'ADJ_ADD' }
            });
            const adjDedComponent = await tx.salaryComponent.findFirst({
                where: { companyId, code: 'ADJ_DED' }
            });
            const adjAddId = adjAddComponent?.id || null;
            const adjDedId = adjDedComponent?.id || null;
            if (!adjAddId || !adjDedId) {
                this.logger.warn('⚠️ ADJ_ADD or ADJ_DED component not found. Payslip lines may fail.')
            }

            for (const employee of filteredEmployees) {
                // محرك الحساب المركزي (Consolidated Breakdown)
                const calculation = await this.calculationService.calculateForEmployee(
                    employee.id,
                    companyId,
                    period.startDate,
                    period.endDate,
                    period.year,
                    period.month,
                );

                const assignment = employee.salaryAssignments[0];
                const baseSalary = assignment.baseSalary;
                const payslipLines: any[] = [];

                // تحديد مركز التكلفة الافتراضي للموظف
                const employeeCostCenterId = employee.costCenterId;
                const allocations = (employee as any).costCenterAllocations || [];

                // دالة مساعدة للحصول على costCenterId من التوزيعات أو الافتراضي
                const getPrimaryCostCenterId = (): string | null => {
                    // إذا كان لديه توزيعات، نستخدم مركز التكلفة ذو النسبة الأعلى
                    if (allocations.length > 0) {
                        const primary = allocations.reduce((max: any, curr: any) =>
                            Number(curr.percentage) > Number(max.percentage) ? curr : max
                        );
                        return primary.costCenterId;
                    }
                    // وإلا نستخدم مركز التكلفة الافتراضي
                    return employeeCostCenterId || null;
                };

                const primaryCostCenterId = getPrimaryCostCenterId();

                // 1. إضافة الخطوط المحسوبة (من الهيكل، السياسات، والتأمينات)
                if (calculation.policyLines) {
                    for (const pl of calculation.policyLines) {
                        // تحديد مصدر السطر بناءً على نوع المكوّن
                        let sourceType = PayslipLineSource.STRUCTURE;
                        let componentIdToUse = pl.componentId;

                        if (pl.componentId === 'GOSI-STATUTORY') {
                            sourceType = (PayslipLineSource as any).STATUTORY || 'STATUTORY';
                        } else if (pl.componentCode === 'SMART' || pl.componentId?.startsWith('SMART-')) {
                            sourceType = (PayslipLineSource as any).SMART || 'SMART';
                            // 🔧 FIX: Use valid component IDs for SMART policies
                            componentIdToUse = pl.sign === 'EARNING' ? adjAddId : adjDedId;
                        }

                        payslipLines.push({
                            componentId: componentIdToUse,
                            amount: new Decimal(pl.amount.toFixed(2)),
                            sourceType,
                            sign: pl.sign,
                            descriptionAr: pl.descriptionAr || undefined,
                            sourceRef: pl.source ? `${pl.source.policyId}:${pl.source.ruleId}` : undefined,
                            costCenterId: primaryCostCenterId, // ربط بمركز التكلفة
                            // 🔧 إضافة الوحدات والمعدل للعرض التفصيلي
                            units: pl.units ? new Decimal(pl.units) : null,
                            rate: pl.rate ? new Decimal(pl.rate) : null,
                        });
                    }
                }


                // NOTE: السلف تم حسابها بالفعل في payroll-calculation.service.ts وهي مضمنة في policyLines
                // لا نضيفها مرة أخرى هنا لتجنب الخصم المزدوج

                // ✅ إضافة التعديلات اليدوية (مكافآت/خصومات) من الواجهة
                // Using Decimal for all financial calculations
                let adjustmentBonus: Decimal = ZERO;
                let adjustmentDeduction: Decimal = ZERO;
                const employeeAdjustments = adjustmentsMap.get(employee.id) || [];

                for (const adj of employeeAdjustments) {
                    const adjAmount = toDecimal(adj.amount);
                    if (adj.type === 'bonus') {
                        adjustmentBonus = add(adjustmentBonus, adjAmount);
                        payslipLines.push({
                            componentId: adjAddId, // تعديل إضافة
                            amount: round(adjAmount),
                            sourceType: 'MANUAL' as any,
                            sign: 'EARNING',
                            descriptionAr: `مكافأة يدوية: ${adj.reason}`,
                            sourceRef: 'WIZARD_ADJUSTMENT',
                            costCenterId: primaryCostCenterId,
                        });
                    } else {
                        adjustmentDeduction = add(adjustmentDeduction, adjAmount);
                        payslipLines.push({
                            componentId: adjDedId, // تعديل خصم
                            amount: round(adjAmount),
                            sourceType: 'MANUAL' as any,
                            sign: 'DEDUCTION',
                            descriptionAr: `خصم يدوي: ${adj.reason}`,
                            sourceRef: 'WIZARD_ADJUSTMENT',
                            costCenterId: primaryCostCenterId,
                        });
                    }
                }

                // ✅ تطبيق التسويات المعتمدة من قاعدة البيانات (PayrollAdjustments)
                // ⚡ البحث باستخدام periodId للموظف لأنها قد لا تكون مربوطة بـ runId بعد
                const approvedAdjustments = await this.adjustmentsService.getApprovedAdjustmentsTotal(
                    employee.id,
                    period.id // استخدام periodId بدلاً من runId
                );

                if (approvedAdjustments.netAdjustment !== 0) {
                    // إضافة الإضافات المعتمدة
                    if (approvedAdjustments.totalAdditions > 0) {
                        adjustmentBonus = add(adjustmentBonus, toDecimal(approvedAdjustments.totalAdditions));
                        payslipLines.push({
                            componentId: adjAddId,
                            amount: round(toDecimal(approvedAdjustments.totalAdditions)),
                            sourceType: 'ADJUSTMENT' as any,
                            sign: 'EARNING',
                            descriptionAr: `تسويات معتمدة (إلغاء خصم/إضافة يدوية)`,
                            sourceRef: 'PAYROLL_ADJUSTMENTS',
                            costCenterId: primaryCostCenterId,
                        });
                    }
                    // إضافة الخصومات المعتمدة
                    if (approvedAdjustments.totalDeductions > 0) {
                        adjustmentDeduction = add(adjustmentDeduction, toDecimal(approvedAdjustments.totalDeductions));
                        payslipLines.push({
                            componentId: adjDedId,
                            amount: round(toDecimal(approvedAdjustments.totalDeductions)),
                            sourceType: 'ADJUSTMENT' as any,
                            sign: 'DEDUCTION',
                            descriptionAr: `تسويات معتمدة (خصم يدوي)`,
                            sourceRef: 'PAYROLL_ADJUSTMENTS',
                            costCenterId: primaryCostCenterId,
                        });
                    }

                    calculation.calculationTrace.push({
                        step: 'APPROVED_ADJUSTMENTS',
                        description: 'تطبيق التسويات المعتمدة',
                        formula: `Additions: ${approvedAdjustments.totalAdditions} | Deductions: ${approvedAdjustments.totalDeductions}`,
                        result: approvedAdjustments.netAdjustment,
                    });

                    this.logger.log(`Applied adjustments for employee ${employee.id}: +${approvedAdjustments.totalAdditions} -${approvedAdjustments.totalDeductions}`);
                }

                // ✅ Using Decimal for final calculations
                const finalGross = round(add(toDecimal(calculation.grossSalary), adjustmentBonus));
                let finalDeductions = round(add(toDecimal(calculation.totalDeductions), adjustmentDeduction));
                let finalNet = sub(finalGross, finalDeductions);

                // ✅ خصم الديون السابقة من الراتب (إن وجدت)
                let debtDeductionAmount: Decimal = ZERO;
                if (isPositive(finalNet)) {
                    const debtResult = await this.employeeDebtService.deductFromSalary({
                        employeeId: employee.id,
                        companyId,
                        availableAmount: finalNet,
                        maxDeductionPercent: 50, // الحد الأقصى 50% من الراتب الصافي
                        sourceId: run.id,
                        processedBy: userId,
                    });

                    if (isPositive(debtResult.totalDeducted)) {
                        debtDeductionAmount = debtResult.totalDeducted;
                        finalDeductions = add(finalDeductions, debtDeductionAmount);
                        finalNet = sub(finalNet, debtDeductionAmount);

                        // إضافة سطر خصم الدين
                        payslipLines.push({
                            componentId: adjDedId, // سداد ديون
                            amount: round(debtDeductionAmount),
                            sourceType: 'DEBT_REPAYMENT' as any,
                            sign: 'DEDUCTION',
                            descriptionAr: `سداد ديون سابقة (${debtResult.transactions.length} دين)`,
                            sourceRef: 'DEBT_LEDGER',
                            costCenterId: primaryCostCenterId,
                        });

                        calculation.calculationTrace.push({
                            step: 'DEBT_DEDUCTION',
                            description: 'خصم سداد ديون سابقة',
                            formula: `Deducted ${toFixed(debtDeductionAmount)} SAR for ${debtResult.transactions.length} debt(s)`,
                            result: toNumber(debtDeductionAmount),
                        });

                        this.logger.log(`Deducted ${toFixed(debtDeductionAmount)} SAR from employee ${employee.id} for debt repayment`);
                    }
                }

                // ⚠️ CRITICAL: التحقق من الراتب السالب
                // ✅ Using Decimal utilities for negative balance handling
                let hasNegativeBalance = false;
                let negativeBalanceAmount: Decimal = ZERO;

                if (isNegative(finalNet)) {
                    hasNegativeBalance = true;
                    negativeBalanceAmount = abs(finalNet);

                    // تسجيل تحذير باستخدام Logger بدلاً من console.warn
                    this.logger.warn(`⚠️ Negative salary detected for employee ${employee.id}: ${toFixed(finalNet)} SAR. ` +
                        `Setting net to 0 and recording ${toFixed(negativeBalanceAmount)} SAR as employee debt.`);

                    // ✅ تطبيق الحد الأدنى صفر - لا يجوز راتب سالب
                    finalNet = ZERO;

                    // ✅ تسجيل المبلغ السالب في trace الحساب للمراجعة
                    calculation.calculationTrace.push({
                        step: 'NEGATIVE_BALANCE_CARRYFORWARD',
                        description: 'رصيد سالب مُرحَّل للشهر القادم',
                        formula: `Original Net: ${toFixed(sub(finalGross, finalDeductions))} → Adjusted to 0`,
                        result: toNumber(negativeBalanceAmount),
                    });

                    // ✅ إنشاء سجل دين جديد للموظف
                    await this.employeeDebtService.createDebt({
                        companyId,
                        employeeId: employee.id,
                        amount: negativeBalanceAmount,
                        sourceType: DebtSourceType.PAYROLL_NEGATIVE_BALANCE,
                        sourceId: run.id,
                        periodId: dto.periodId,
                        reason: `رصيد سالب من مسير الرواتب - الفترة ${period.month}/${period.year}`,
                    });

                    this.logger.log(`Created debt record for employee ${employee.id}: ${toFixed(negativeBalanceAmount)} SAR`);
                }

                // 🔧 FIX: Validate componentIds before creating payslip to prevent foreign key errors
                const validComponentIds = new Set<string>();
                const componentsInDb = await tx.salaryComponent.findMany({
                    where: { companyId },
                    select: { id: true }
                });
                for (const c of componentsInDb) {
                    validComponentIds.add(c.id);
                }

                // Filter payslipLines to only include valid componentIds (or null)
                const validatedPayslipLines = payslipLines.filter(line => {
                    if (!line.componentId) return true; // null is allowed
                    if (validComponentIds.has(line.componentId)) return true;
                    // Log and skip invalid componentIds
                    this.logger.warn(`🚫 Skipping payslip line with invalid componentId: ${line.componentId} (${line.descriptionAr})`);
                    return false;
                });

                // 🔧 FIX: Recalculate gross and deductions from ACTUAL validated lines
                // This ensures totals match the lines that are actually saved
                const linesGross = validatedPayslipLines
                    .filter(l => l.sign === 'EARNING')
                    .reduce((sum, l) => add(sum, toDecimal(l.amount)), ZERO);
                let linesDeductions = validatedPayslipLines
                    .filter(l => l.sign === 'DEDUCTION')
                    .reduce((sum, l) => add(sum, toDecimal(l.amount)), ZERO);

                // ✅ Apply deduction cap (Saudi Labor Law Article 91 - max 50%)
                const maxDeductionPercent = 50; // TODO: get from settings
                const capResult = applyDeductionCap(linesGross, linesDeductions, maxDeductionPercent);
                if (capResult.wasCapped) {
                    this.logger.warn(`⚠️ Deductions capped for employee ${employee.id}: ` +
                        `${toFixed(linesDeductions)} → ${toFixed(capResult.cappedDeductions)} (excess: ${toFixed(capResult.excessAmount)})`);
                    linesDeductions = capResult.cappedDeductions;
                }

                const linesNet = sub(linesGross, linesDeductions);

                await tx.payslip.create({
                    data: {
                        employeeId: employee.id,
                        companyId,
                        periodId: dto.periodId,
                        runId: run.id,
                        baseSalary: baseSalary,
                        grossSalary: linesGross, // ✅ From actual lines
                        totalDeductions: linesDeductions, // ✅ From actual lines
                        netSalary: max(ZERO, linesNet), // ✅ Recalculated, min 0
                        status: PayrollStatus.DRAFT,
                        calculationTrace: calculation.calculationTrace as any,
                        lines: {
                            create: validatedPayslipLines
                        }
                    }
                });
            }

            // ⚡ ربط كل التسويات المعتمدة للفترة بهذا المسيّر (لأرشفة البيانات)
            await tx.payrollAdjustment.updateMany({
                where: {
                    companyId,
                    payrollPeriodId: dto.periodId,
                    status: 'POSTED',
                    payrollRunId: null
                },
                data: {
                    payrollRunId: run.id
                }
            });

            const runWithPayslips = await tx.payrollRun.findUnique({
                where: { id: run.id },
                include: {
                    payslips: { select: { id: true } },
                    period: true
                }
            });

            return {
                ...runWithPayslips,
                payslipsCount: runWithPayslips?.payslips?.length || filteredEmployees.length,
                excludedCount: excludedIds.size,
                adjustmentsCount: adjustmentsMap.size,
            };
        }, { timeout: 60000 }); // 60 seconds timeout for payroll calculation

        // تحضير رسالة التدقيق
        let auditMessage = `إنشاء دورة رواتب جديدة لـ ${result.payslipsCount} موظف`;
        if (result.excludedCount && result.excludedCount > 0) {
            auditMessage += ` (استثناء ${result.excludedCount} موظف)`;
        }
        if (result.adjustmentsCount && result.adjustmentsCount > 0) {
            auditMessage += ` (تعديلات على ${result.adjustmentsCount} موظف)`;
        }

        await this.auditService.logPayrollChange(
            userId,
            result.id!,
            AuditAction.CREATE,
            null,
            {
                runId: result.id,
                periodId: dto.periodId,
                employeeCount: result.payslipsCount,
                excludedCount: result.excludedCount,
                adjustmentsCount: result.adjustmentsCount,
            },
            auditMessage,
        );

        return result;
    }

    async preview(dto: CreatePayrollRunDto, companyId: string) {
        const period = await this.prisma.payrollPeriod.findFirst({ where: { id: dto.periodId, companyId } });
        if (!period) throw new NotFoundException('فترة الرواتب غير موجودة');

        const gosiConfig = await this.prisma.gosiConfig.findFirst({
            where: { isActive: true, companyId },
            orderBy: { createdAt: 'desc' }
        });

        const excludedIds = new Set(dto.excludedEmployeeIds || []);

        const employees = await this.prisma.user.findMany({
            where: {
                companyId,
                id: dto.employeeIds ? { in: dto.employeeIds } : undefined,
                branchId: dto.branchId || undefined,
                status: 'ACTIVE',
                salaryAssignments: { some: { isActive: true } }
            } as any,
            include: {
                branch: true,
                department: true,
                jobTitleRef: true,
                salaryAssignments: {
                    where: { isActive: true },
                    include: {
                        structure: {
                            include: {
                                lines: {
                                    include: { component: true }
                                }
                            }
                        }
                    }
                },
                advanceRequests: {
                    where: {
                        status: 'APPROVED',
                        startDate: { lte: period.endDate },
                        endDate: { gte: period.startDate }
                    }
                }
            } as any
        }) as any[];

        // تطبيق فلتر الموظفين المستثنين
        const filteredEmployees = employees.filter(emp => !excludedIds.has(emp.id));

        if (filteredEmployees.length === 0) {
            return {
                period: {
                    id: period.id,
                    month: period.month,
                    year: period.year,
                    name: `${period.month}/${period.year}`,
                },
                summary: {
                    totalEmployees: 0,
                    totalBaseSalary: 0,
                    totalGross: 0,
                    totalDeductions: 0,
                    totalNet: 0,
                    totalGosi: 0,
                    totalAdvances: 0,
                },
                employees: [],
                byBranch: [],
                byDepartment: [],
                gosiEnabled: !!gosiConfig,
            };
        }

        // ✅ Using Decimal for all totals
        let totalGross: Decimal = ZERO;
        let totalDeductions: Decimal = ZERO;
        let totalNet: Decimal = ZERO;
        let totalGosi: Decimal = ZERO;
        let totalAdvances: Decimal = ZERO;
        let totalBaseSalary: Decimal = ZERO;

        const byBranch: Record<string, { count: number; gross: Decimal; net: Decimal }> = {};
        const byDepartment: Record<string, { count: number; gross: Decimal; net: Decimal }> = {};
        const employeePreviews: any[] = [];

        for (const employee of filteredEmployees) {
            const assignment = (employee as any).salaryAssignments?.[0];
            if (!assignment) continue;

            totalBaseSalary = add(totalBaseSalary, toDecimal(assignment.baseSalary));

            const calculation = await this.calculationService.calculateForEmployee(
                employee.id,
                companyId,
                period.startDate,
                period.endDate,
                period.year,
                period.month
            );

            const earnings = (calculation.policyLines || [])
                .filter(pl => pl.sign === 'EARNING')
                .map(pl => ({ name: pl.componentName, code: pl.componentCode, amount: pl.amount }));

            const deductionItems = (calculation.policyLines || [])
                .filter(pl => pl.sign === 'DEDUCTION')
                .map(pl => ({ name: pl.componentName, code: pl.componentCode, amount: pl.amount }));

            // إضافة السلف للمعاينة - Display only, NOT added to deductions
            // ✅ ملاحظة: السلف تم حسابها بالفعل في payroll-calculation.service.ts كـ LOAN_DED
            // وهي مضمنة في calculation.totalDeductions الذي تم تطبيق الحد الأقصى للخصومات (50%) عليه
            let employeeAdvanceAmount: Decimal = ZERO;
            const advanceDetails: { id: string; amount: number }[] = [];

            // ✅ حساب مبلغ السلف للعرض فقط - البحث في policyLines
            const loanLines = (calculation.policyLines || []).filter(pl => pl.componentCode === 'LOAN_DED');
            for (const loanLine of loanLines) {
                const amount = toDecimal(loanLine.amount);
                employeeAdvanceAmount = add(employeeAdvanceAmount, amount);
                // Extract loan ID from componentId (format: LOAN-{id})
                const loanId = loanLine.componentId?.replace('LOAN-', '') || '';
                advanceDetails.push({ id: loanId, amount: toNumber(amount) });
            }

            const gosiLine = (calculation.policyLines || []).find(pl => pl.componentCode === 'GOSI');
            const gosiAmount = toDecimal(gosiLine?.amount || 0);
            totalGosi = add(totalGosi, gosiAmount);

            // ✅ Using Decimal for calculations
            // ملاحظة: التسويات (adjustments) يتم إضافتها تلقائياً في `payroll-calculation.service.ts`
            // وكذلك السلف (LOAN_DED) - لذلك لا نضيفها هنا مرة أخرى لتجنب التكرار
            // calculation.totalDeductions تحتوي على كل الخصومات بعد تطبيق الحد الأقصى (50%)
            const finalGross = toDecimal(calculation.grossSalary);
            const finalDeductions = toDecimal(calculation.totalDeductions); // ✅ Already capped at 50%
            const finalNet = sub(finalGross, finalDeductions);

            totalGross = add(totalGross, finalGross);
            totalDeductions = add(totalDeductions, finalDeductions);
            totalNet = add(totalNet, finalNet);
            totalAdvances = add(totalAdvances, employeeAdvanceAmount);

            const branchName = (employee as any).branch?.name || 'غير محدد';
            const deptName = (employee as any).department?.name || 'غير محدد';

            if (!byBranch[branchName]) byBranch[branchName] = { count: 0, gross: ZERO, net: ZERO };
            byBranch[branchName].count++;
            byBranch[branchName].gross = add(byBranch[branchName].gross, finalGross);
            byBranch[branchName].net = add(byBranch[branchName].net, finalNet);

            if (!byDepartment[deptName]) byDepartment[deptName] = { count: 0, gross: ZERO, net: ZERO };
            byDepartment[deptName].count++;
            byDepartment[deptName].gross = add(byDepartment[deptName].gross, finalGross);
            byDepartment[deptName].net = add(byDepartment[deptName].net, finalNet);

            employeePreviews.push({
                id: employee.id,
                employeeCode: employee.employeeCode,
                name: `${employee.firstName} ${employee.lastName}`,
                firstName: employee.firstName,
                lastName: employee.lastName,
                branch: branchName,
                department: deptName,
                jobTitle: (employee as any).jobTitleRef?.titleAr || 'غير محدد',
                isSaudi: employee.isSaudi || false,
                baseSalary: toNumber(toDecimal(assignment.baseSalary)),
                gross: toNumber(finalGross),
                deductions: toNumber(finalDeductions),
                gosi: toNumber(gosiAmount),
                advances: toNumber(employeeAdvanceAmount),
                net: toNumber(finalNet),
                earnings,
                deductionItems,
                advanceDetails,
                adjustments: [],
                excluded: false,
            });
        }

        // Previous month comparison
        let previousMonth = null;
        try {
            const prevPeriod = await this.prisma.payrollPeriod.findFirst({
                where: {
                    companyId,
                    year: period.month === 1 ? period.year - 1 : period.year,
                    month: period.month === 1 ? 12 : period.month - 1,
                },
            });
            if (prevPeriod) {
                const prevRun = await this.prisma.payrollRun.findFirst({
                    where: { periodId: prevPeriod.id, companyId },
                    include: { payslips: true, _count: { select: { payslips: true } } },
                });
                if (prevRun) {
                    const prevTotals = prevRun.payslips.reduce((acc, p) => ({
                        gross: acc.gross + Number(p.grossSalary),
                        net: acc.net + Number(p.netSalary),
                        deductions: acc.deductions + Number(p.totalDeductions),
                    }), { gross: 0, net: 0, deductions: 0 });
                    previousMonth = {
                        headcount: prevRun._count.payslips,
                        gross: prevTotals.gross,
                        net: prevTotals.net,
                        deductions: prevTotals.deductions,
                    };
                }
            }
        } catch { }

        // ✅ Convert Decimal values to numbers for API response
        return {
            period: {
                id: period.id,
                month: period.month,
                year: period.year,
                name: `${period.month}/${period.year}`,
            },
            summary: {
                totalEmployees: filteredEmployees.length,
                totalBaseSalary: toNumber(totalBaseSalary),
                totalGross: toNumber(totalGross),
                totalDeductions: toNumber(totalDeductions),
                totalNet: toNumber(totalNet),
                totalGosi: toNumber(totalGosi),
                totalAdvances: toNumber(totalAdvances),
            },
            comparison: previousMonth ? {
                previousMonth,
                grossChange: toNumber(totalGross) - previousMonth.gross,
                grossChangePercent: previousMonth.gross > 0 ? ((toNumber(totalGross) - previousMonth.gross) / previousMonth.gross * 100) : 0,
                netChange: toNumber(totalNet) - previousMonth.net,
                netChangePercent: previousMonth.net > 0 ? ((toNumber(totalNet) - previousMonth.net) / previousMonth.net * 100) : 0,
                headcountChange: filteredEmployees.length - previousMonth.headcount,
            } : null,
            byBranch: Object.entries(byBranch).map(([name, data]) => ({
                name,
                count: data.count,
                gross: toNumber(data.gross),
                net: toNumber(data.net)
            })),
            byDepartment: Object.entries(byDepartment).map(([name, data]) => ({
                name,
                count: data.count,
                gross: toNumber(data.gross),
                net: toNumber(data.net)
            })),
            employees: employeePreviews,
            gosiEnabled: !!gosiConfig,
        };
    }

    async findAll(companyId: string) {
        return this.prisma.payrollRun.findMany({
            where: { companyId },
            include: {
                period: true,
                _count: { select: { payslips: true } }
            },
            orderBy: { runDate: 'desc' }
        });
    }

    async findOne(id: string, companyId: string) {
        return this.prisma.payrollRun.findFirst({
            where: { id, companyId },
            include: {
                period: true,
                payslips: {
                    include: {
                        employee: true,
                        lines: { include: { component: true } }
                    }
                }
            }
        });
    }

    async approve(id: string, companyId: string, skipValidation = false) {
        // ✅ التحقق من صحة المسير قبل الاعتماد
        if (!skipValidation) {
            const validation = await this.payrollValidationService.validatePayrollRun(id, companyId, {
                strictMode: false,
                skipGosiValidation: false,
            });

            if (!validation.canProceed) {
                const errors = validation.issues
                    .filter(i => i.severity === 'ERROR')
                    .map(i => i.messageAr)
                    .slice(0, 5) // أول 5 أخطاء
                    .join('، ');

                throw new BadRequestException(
                    `فشل اعتماد مسير الرواتب - يوجد ${validation.summary.errors} أخطاء: ${errors}`
                );
            }

            // تسجيل التحذيرات
            if (validation.summary.warnings > 0) {
                this.logger.warn(
                    `Approving payroll run ${id} with ${validation.summary.warnings} warnings`
                );
            }
        }

        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.payrollRun.update({
                where: { id, companyId },
                data: { status: 'FINANCE_APPROVED' },
            });

            await tx.payslip.updateMany({
                where: { runId: id, companyId },
                data: { status: 'FINANCE_APPROVED' }
            });

            // 🔥 Generate Ledger (DRAFT)
            await this.ledgerService.generateLedger(id, companyId);

            return updated;
        });
    }

    async pay(id: string, companyId: string, skipValidation = false) {
        // ✅ التحقق النهائي قبل الصرف
        if (!skipValidation) {
            const validation = await this.payrollValidationService.quickValidateBeforeClose(id, companyId);

            if (!validation.canClose) {
                throw new BadRequestException(
                    `لا يمكن صرف الرواتب - يوجد مشاكل حرجة: ${validation.criticalIssues.join('، ')}`
                );
            }
        }

        return this.prisma.$transaction(async (tx) => {
            const run = await tx.payrollRun.findFirst({
                where: { id, companyId }
            });
            if (!run) throw new NotFoundException('تشغيل الرواتب غير موجود');

            // التحقق من أن المسير معتمد
            if (run.status !== 'FINANCE_APPROVED') {
                throw new BadRequestException(
                    `يجب اعتماد المسير أولاً قبل الصرف. الحالة الحالية: ${run.status}`
                );
            }

            await tx.payrollRun.update({
                where: { id },
                data: { status: 'PAID' }
            });

            await tx.payslip.updateMany({
                where: { runId: id, companyId },
                data: { status: 'PAID' }
            });

            await tx.payrollPeriod.updateMany({
                where: { id: run.periodId, companyId },
                data: { status: 'PAID' }
            });

            // 🔥 Post Ledger (Mark as POSTED)
            await tx.payrollLedger.update({
                where: { runId: id },
                data: { status: 'POSTED' }
            });

            this.logger.log(`Payroll run ${id} marked as PAID`);

            return run;
        });
    }

    /**
     * إلغاء مسير الرواتب (يعمل فقط إذا كان DRAFT)
     */
    async cancel(id: string, companyId: string) {
        const run = await this.prisma.payrollRun.findFirst({
            where: { id, companyId },
        });

        if (!run) throw new NotFoundException('تشغيل الرواتب غير موجود');

        // التحقق من أن المسير غير معتمد
        if (run.status !== 'DRAFT') {
            throw new BadRequestException(
                `لا يمكن إلغاء مسير معتمد أو مدفوع. الحالة الحالية: ${run.status}`
            );
        }

        await this.prisma.payrollRun.update({
            where: { id },
            data: { status: 'CANCELLED' },
        });

        this.logger.log(`Payroll run ${id} cancelled`);

        return { message: 'تم إلغاء المسير بنجاح', id };
    }
}
