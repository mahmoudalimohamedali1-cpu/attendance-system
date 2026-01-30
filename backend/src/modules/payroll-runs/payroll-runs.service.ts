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
    calculateNetSalary,
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

        // ✅ جلب خصومات الحضور والإجازات والجزاءات والعهد من صفحة الخصومات
        const attendanceDeductionsPreview = await this.adjustmentsService.getAttendanceDeductionsPreview(companyId, dto.periodId);
        const leaveDeductionsPreview = await this.adjustmentsService.getLeaveDeductionsPreview(companyId, dto.periodId);
        const disciplinaryDeductionsPreview = await this.adjustmentsService.getDisciplinaryDeductionsPreview(companyId, dto.periodId);
        const custodyDeductionsPreview = await this.adjustmentsService.getCustodyDeductionsPreview(companyId, dto.periodId);

        // بناء خرائط الخصومات لكل موظف للوصول السريع
        const attendanceDeductionsMap = new Map<string, { totalDeduction: number; details: any }>();
        for (const ded of attendanceDeductionsPreview.employees || []) {
            const current = attendanceDeductionsMap.get(ded.employeeId) || { totalDeduction: 0, details: [] };
            current.totalDeduction += ded.totalDeduction || 0;
            current.details.push(ded);
            attendanceDeductionsMap.set(ded.employeeId, current);
        }

        const leaveDeductionsMap = new Map<string, { totalDeduction: number; details: any }>();
        for (const ded of leaveDeductionsPreview.leaveDeductions || []) {
            const current = leaveDeductionsMap.get(ded.employeeId) || { totalDeduction: 0, details: [] };
            current.totalDeduction += ded.deductionAmount || 0;
            current.details.push(ded);
            leaveDeductionsMap.set(ded.employeeId, current);
        }

        const disciplinaryDeductionsMap = new Map<string, any[]>();
        for (const ded of disciplinaryDeductionsPreview) {
            const current = disciplinaryDeductionsMap.get(ded.employeeId) || [];
            current.push(ded);
            disciplinaryDeductionsMap.set(ded.employeeId, current);
        }

        const custodyDeductionsMap = new Map<string, any[]>();
        for (const ded of custodyDeductionsPreview) {
            const current = custodyDeductionsMap.get(ded.employeeId) || [];
            current.push(ded);
            custodyDeductionsMap.set(ded.employeeId, current);
        }

        this.logger.log(`📊 Loaded ${attendanceDeductionsMap.size} attendance, ${leaveDeductionsMap.size} leave, ${disciplinaryDeductionsMap.size} disciplinary, and ${custodyDeductionsMap.size} custody deductions for payroll run`);

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

                // ✅ استخراج بيانات المستحقات والخصومات للحفظ (نفس المعاينة)
                const earningsData = (calculation.policyLines || [])
                    .filter(pl => pl.sign === 'EARNING')
                    .map(pl => ({ name: pl.componentName, code: pl.componentCode, amount: pl.amount }));
                const deductionsData = (calculation.policyLines || [])
                    .filter(pl => pl.sign === 'DEDUCTION')
                    .map(pl => ({ name: pl.componentName, code: pl.componentCode, amount: pl.amount }));

                // 1. إضافة الخطوط المحسوبة (من الهيكل، السياسات، والتأمينات، والعمولات، والتسويات المسجلة)
                if (calculation.policyLines) {
                    for (const pl of calculation.policyLines) {
                        let sourceType: PayslipLineSource = PayslipLineSource.STRUCTURE;
                        let componentIdToUse = pl.componentId;

                        if (pl.componentId === 'GOSI-STATUTORY') {
                            sourceType = PayslipLineSource.STATUTORY;
                        } else if (pl.componentCode === 'SMART' || pl.componentId?.startsWith('SMART-')) {
                            sourceType = PayslipLineSource.SMART;
                            componentIdToUse = pl.sign === 'EARNING' ? adjAddId : adjDedId;
                        } else if (pl.componentCode === 'LOAN_DED' || pl.componentId?.startsWith('LOAN-')) {
                            sourceType = PayslipLineSource.POLICY; // LOAN mapped to POLICY
                            componentIdToUse = loanComp.id;
                        } else if (pl.componentCode === 'RETRO_PAY' || pl.componentCode?.startsWith('RETRO_')) {
                            sourceType = PayslipLineSource.ADJUSTMENT; // BONUS_PROGRAM mapped to ADJUSTMENT
                            componentIdToUse = pl.sign === 'EARNING' ? adjAddId : adjDedId;
                        } else if (pl.componentCode === 'DISC_ADJ' || pl.componentId?.startsWith('ADJ-') || pl.componentId?.startsWith('DISC-')) {
                            sourceType = PayslipLineSource.ADJUSTMENT;
                            componentIdToUse = pl.sign === 'EARNING' ? adjAddId : adjDedId;
                        }

                        payslipLines.push({
                            componentId: componentIdToUse,
                            amount: new Decimal(pl.amount.toFixed(2)),
                            sourceType,
                            sign: pl.sign,
                            descriptionAr: pl.descriptionAr || undefined,
                            sourceRef: pl.source ? (pl.source.policyId ? `${pl.source.policyId}:${pl.source.ruleId}` : pl.componentId) : undefined,
                            costCenterId: primaryCostCenterId,
                            units: pl.units ? new Decimal(pl.units) : null,
                            rate: pl.rate ? new Decimal(pl.rate) : null,
                        });

                        // ✅ تحديث حالة المكافأة (RetroPay) لـ PAID إذا كانت موجودة في الخطوط
                        if (pl.componentCode === 'RETRO_PAY' && pl.componentId?.startsWith('RETRO-')) {
                            const retroId = pl.componentId.replace('RETRO-', '');
                            await tx.retroPay.update({
                                where: { id: retroId },
                                data: { status: 'PAID', paidAt: new Date() }
                            });
                        }
                    }
                }

                // ✅ إضافة الخصومات الموحدة (حضور، إجازات، جزاءات، عهد)
                const empAttDed = attendanceDeductionsMap.get(employee.id);
                if (empAttDed && empAttDed.totalDeduction > 0) {
                    payslipLines.push({
                        componentId: adjDedId,
                        amount: new Decimal(empAttDed.totalDeduction.toFixed(2)),
                        sourceType: PayslipLineSource.ADJUSTMENT,
                        sign: 'DEDUCTION',
                        descriptionAr: 'خصم حضور وانصراف (معتمد)',
                        costCenterId: primaryCostCenterId,
                    });
                }

                const empLeaveDed = leaveDeductionsMap.get(employee.id);
                if (empLeaveDed && empLeaveDed.totalDeduction > 0) {
                    payslipLines.push({
                        componentId: adjDedId,
                        amount: new Decimal(empLeaveDed.totalDeduction.toFixed(2)),
                        sourceType: PayslipLineSource.ADJUSTMENT,
                        sign: 'DEDUCTION',
                        descriptionAr: 'خصم إجازات (معتمد)',
                        costCenterId: primaryCostCenterId,
                    });
                }

                const empDiscDeds = disciplinaryDeductionsMap.get(employee.id) || [];
                for (const d of empDiscDeds) {
                    const discAmount = Number(d.amount || 0);
                    if (discAmount > 0) {
                        payslipLines.push({
                            componentId: adjDedId,
                            amount: new Decimal(discAmount.toFixed(2)),
                            sourceType: PayslipLineSource.ADJUSTMENT,
                            sign: 'DEDUCTION',
                            descriptionAr: d.reason || 'جزاء تأديبي',
                            sourceRef: `DED-APP:${d.id}`,
                            costCenterId: primaryCostCenterId,
                        });
                    }
                }

                const empCustDeds = custodyDeductionsMap.get(employee.id) || [];
                for (const d of empCustDeds) {
                    const custAmount = Number(d.amount || 0);
                    if (custAmount > 0) {
                        payslipLines.push({
                            componentId: adjDedId,
                            amount: new Decimal(custAmount.toFixed(2)),
                            sourceType: PayslipLineSource.ADJUSTMENT,
                            sign: 'DEDUCTION',
                            descriptionAr: d.reason || 'خصم عهدة',
                            sourceRef: `DED-APP:${d.id}`,
                            costCenterId: primaryCostCenterId,
                        });
                    }
                }

                // ✅ إضافة التعديلات اليدوية (مكافآت/خصومات) من الـ Wizard فقط (التي لم تحفظ في الـ DB بعد)
                let wizardBonus: Decimal = ZERO;
                let wizardDeduction: Decimal = ZERO;
                const employeeAdjustments = adjustmentsMap.get(employee.id) || [];

                for (const adj of employeeAdjustments) {
                    const adjAmount = toDecimal(adj.amount);
                    if (adj.type === 'bonus') {
                        wizardBonus = add(wizardBonus, adjAmount);
                        payslipLines.push({
                            componentId: adjAddId,
                            amount: round(adjAmount),
                            sourceType: PayslipLineSource.MANUAL,
                            sign: 'EARNING',
                            descriptionAr: `مكافأة يدوية: ${adj.reason}`,
                            sourceRef: 'WIZARD_ADJUSTMENT',
                            costCenterId: primaryCostCenterId,
                        });
                        // ✅ إضافة للبيانات المحفوظة
                        earningsData.push({ name: `مكافأة يدوية: ${adj.reason}`, code: 'WIZ_ADD', amount: adj.amount });
                    } else {
                        wizardDeduction = add(wizardDeduction, adjAmount);
                        payslipLines.push({
                            componentId: adjDedId,
                            amount: round(adjAmount),
                            sourceType: PayslipLineSource.MANUAL,
                            sign: 'DEDUCTION',
                            descriptionAr: `خصم يدوي: ${adj.reason}`,
                            sourceRef: 'WIZARD_ADJUSTMENT',
                            costCenterId: primaryCostCenterId,
                        });
                        // ✅ إضافة للبيانات المحفوظة
                        deductionsData.push({ name: `خصم يدوي: ${adj.reason}`, code: 'WIZ_DED', amount: adj.amount });
                    }
                }

                // ✅ إضافة خصومات الحضور من صفحة الخصومات (تأخير، غياب، انصراف مبكر)
                const empAttendanceDeduction = attendanceDeductionsMap.get(employee.id);
                if (empAttendanceDeduction && empAttendanceDeduction.totalDeduction > 0) {
                    const attDedAmount = toDecimal(empAttendanceDeduction.totalDeduction);
                    wizardDeduction = add(wizardDeduction, attDedAmount);

                    // تفصيل الخصومات
                    const details = empAttendanceDeduction.details[0] || {};
                    let descParts: string[] = [];
                    if (details.lateDeduction > 0) descParts.push(`تأخير: ${details.lateDeduction.toFixed(2)}`);
                    if (details.absenceDeduction > 0) descParts.push(`غياب ${details.absentDays} يوم: ${details.absenceDeduction.toFixed(2)}`);
                    if (details.earlyDeduction > 0) descParts.push(`انصراف مبكر: ${details.earlyDeduction.toFixed(2)}`);

                    payslipLines.push({
                        componentId: adjDedId,
                        amount: round(attDedAmount),
                        sourceType: PayslipLineSource.ADJUSTMENT,
                        sign: 'DEDUCTION',
                        descriptionAr: `خصم حضور: ${descParts.join(' + ')}`,
                        sourceRef: 'ATTENDANCE_DEDUCTION',
                        costCenterId: primaryCostCenterId,
                    });
                    deductionsData.push({
                        name: `خصم حضور: ${descParts.join(' + ')}`,
                        code: 'ATT_DED',
                        amount: empAttendanceDeduction.totalDeduction
                    });

                    this.logger.debug(`📍 Added attendance deduction for ${employee.firstName}: ${toFixed(attDedAmount)} SAR`);
                }

                // ✅ إضافة خصومات الإجازات من صفحة الخصومات (إجازة بدون راتب، مرضية)
                const empLeaveDeduction = leaveDeductionsMap.get(employee.id);
                if (empLeaveDeduction && empLeaveDeduction.totalDeduction > 0) {
                    const leaveDedAmount = toDecimal(empLeaveDeduction.totalDeduction);
                    wizardDeduction = add(wizardDeduction, leaveDedAmount);

                    // تفصيل الخصومات
                    const leaveDetails = empLeaveDeduction.details.map((d: any) =>
                        `${d.leaveType === 'UNPAID' ? 'إجازة بدون راتب' : 'إجازة مرضية'}: ${d.totalDays} يوم`
                    ).join(' + ');

                    payslipLines.push({
                        componentId: adjDedId,
                        amount: round(leaveDedAmount),
                        sourceType: PayslipLineSource.ADJUSTMENT,
                        sign: 'DEDUCTION',
                        descriptionAr: `خصم إجازات: ${leaveDetails}`,
                        sourceRef: 'LEAVE_DEDUCTION',
                        costCenterId: primaryCostCenterId,
                    });
                    deductionsData.push({
                        name: `خصم إجازات: ${leaveDetails}`,
                        code: 'LEAVE_DED',
                        amount: empLeaveDeduction.totalDeduction
                    });

                    this.logger.debug(`🌴 Added leave deduction for ${employee.firstName}: ${toFixed(leaveDedAmount)} SAR`);
                }

                // ✅ تسجيل دفعات السلف تلقائياً (السطور موجودة بالفعل في policyLines)
                const employeeAdvances = (employee as any).advanceRequests || [];
                for (const advance of employeeAdvances) {
                    const previousPayments = await tx.loanPayment.findMany({
                        where: { advanceId: advance.id },
                        select: { amount: true }
                    });

                    const approvedAmount = (advance.approvedAmount || advance.amount).toNumber();
                    const monthlyDeduction = (advance.approvedMonthlyDeduction || advance.monthlyDeduction).toNumber();
                    const totalPaid = previousPayments.reduce((sum, p) => sum + p.amount.toNumber(), 0);
                    const remainingBalance = approvedAmount - totalPaid;

                    if (remainingBalance > 0) {
                        const deductionAmount = Math.min(monthlyDeduction, remainingBalance);
                        await tx.loanPayment.create({
                            data: {
                                advanceId: advance.id,
                                amount: deductionAmount,
                                paymentDate: new Date(),
                                paymentType: 'SALARY_DEDUCTION',
                                notes: `خصم تلقائي - فترة ${period.month}/${period.year}`,
                                createdById: userId,
                            }
                        });

                        if (remainingBalance - deductionAmount <= 0) {
                            await tx.advanceRequest.update({
                                where: { id: advance.id },
                                data: { status: 'PAID' }
                            });
                        }
                    }
                }

                // ✅ Using Decimal for final calculations
                const finalGross = round(add(toDecimal(calculation.grossSalary), wizardBonus));
                let finalDeductions = round(add(toDecimal(calculation.totalDeductions), wizardDeduction));

                // ✅ تطبيق سقف الخصومات 50% من الراتب الإجمالي (المادة 91 من نظام العمل السعودي)
                const grossCapResult = applyDeductionCap(finalGross, finalDeductions, 50);
                const cappedDeductions = grossCapResult.cappedDeductions;
                const deferredAmount = grossCapResult.excessAmount; // للترحيل للشهور التالية

                // ✅ حساب صافي الراتب بعد تطبيق السقف
                const netSalaryResult = calculateNetSalary(finalGross, cappedDeductions);
                let finalNet = netSalaryResult.netSalary;

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
                            sourceType: PayslipLineSource.ADJUSTMENT, // DEBT_REPAYMENT mapped to ADJUSTMENT
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

                    // ✅ FIX: التحقق من عدم وجود دين سابق لنفس الموظف/الفترة قبل الإنشاء
                    const existingNegativeDebt = await tx.employeeDebtLedger.findFirst({
                        where: {
                            employeeId: employee.id,
                            companyId,
                            periodId: dto.periodId, // 🔧 استخدام periodId بدلاً من run.id لمنع التكرار
                            sourceType: DebtSourceType.PAYROLL_NEGATIVE_BALANCE,
                        }
                    });

                    if (!existingNegativeDebt) {
                        // ✅ إنشاء سجل دين جديد للموظف فقط إذا لم يكن موجوداً
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
                    } else {
                        this.logger.log(`Debt already exists for employee ${employee.id} in period ${dto.periodId}, skipping creation`);
                    }
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
                const originalDeductions = validatedPayslipLines
                    .filter(l => l.sign === 'DEDUCTION')
                    .reduce((sum, l) => add(sum, toDecimal(l.amount)), ZERO);

                // ✅ Apply deduction cap (Saudi Labor Law Article 91 - max 50% of BASE SALARY)
                const maxDeductionPercent = 50; // TODO: get from settings
                // ✅ FIX: السقف يُحسب على الراتب الأساسي وليس الإجمالي
                const capResult = applyDeductionCap(toDecimal(baseSalary), originalDeductions, maxDeductionPercent);
                let linesDeductions = originalDeductions;
                let excessDeductionAmount = ZERO;

                if (capResult.wasCapped) {
                    linesDeductions = capResult.cappedDeductions;
                    excessDeductionAmount = capResult.excessAmount;

                    this.logger.warn(`⚠️ Deductions capped for employee ${employee.id}: ` +
                        `${toFixed(originalDeductions)} → ${toFixed(linesDeductions)} (excess: ${toFixed(excessDeductionAmount)})`);

                    // 🔧 Update calculation trace to show the cap was applied
                    calculation.calculationTrace.push({
                        step: 'DEDUCTION_CAP_APPLIED',
                        description: `تطبيق سقف الخصومات (المادة 91 - ${maxDeductionPercent}%)`,
                        formula: `الخصومات الأصلية ${toFixed(originalDeductions)} → بعد السقف ${toFixed(linesDeductions)}`,
                        result: toNumber(linesDeductions),
                    });

                    // ✅ Record excess deduction as employee debt for carryforward to next month
                    if (isPositive(excessDeductionAmount)) {
                        // 🔧 FIX: التحقق من عدم وجود دين سابق لنفس الموظف/الفترة قبل الإنشاء
                        const existingExcessDebt = await tx.employeeDebtLedger.findFirst({
                            where: {
                                employeeId: employee.id,
                                companyId,
                                periodId: dto.periodId,
                                reason: { contains: 'خصومات مؤجلة' },
                            }
                        });

                        if (!existingExcessDebt) {
                            await this.employeeDebtService.createDebt({
                                companyId,
                                employeeId: employee.id,
                                amount: excessDeductionAmount,
                                sourceType: DebtSourceType.OTHER, // Deduction excess carryforward
                                sourceId: run.id,
                                periodId: dto.periodId,
                                reason: `خصومات مؤجلة للشهر القادم (تجاوز سقف ${maxDeductionPercent}% من الراتب)`,
                            });

                            calculation.calculationTrace.push({
                                step: 'DEFERRED_DEDUCTION_CARRYFORWARD',
                                description: `خصم مؤجل للشهر القادم`,
                                formula: `المبلغ الزائد ${toFixed(excessDeductionAmount)} سيُخصم من الراتب القادم`,
                                result: toNumber(excessDeductionAmount),
                            });

                            this.logger.log(`💰 Created debt record for employee ${employee.id}: ${toFixed(excessDeductionAmount)} SAR (deduction excess)`);
                        } else {
                            this.logger.log(`Excess deduction debt already exists for employee ${employee.id} in period ${dto.periodId}, skipping`);
                        }
                    }
                }

                const linesNet = sub(linesGross, linesDeductions);

                // 🔧 Final trace step showing actual values
                calculation.calculationTrace.push({
                    step: 'FINAL_CALCULATION',
                    description: 'الحساب النهائي',
                    formula: `إجمالي ${toFixed(linesGross)} - خصومات ${toFixed(linesDeductions)} = صافي ${toFixed(linesNet)}`,
                    result: toNumber(linesNet),
                });

                await tx.payslip.create({
                    data: {
                        employeeId: employee.id,
                        companyId,
                        periodId: dto.periodId,
                        runId: run.id,
                        baseSalary: baseSalary,
                        grossSalary: linesGross, // ✅ From actual lines
                        totalDeductions: linesDeductions, // ✅ After cap
                        netSalary: max(ZERO, linesNet), // ✅ Recalculated, min 0
                        status: PayrollStatus.DRAFT,
                        calculationTrace: calculation.calculationTrace as any,
                        // ✅ حفظ بيانات المعاينة لعرضها في تفاصيل القسيمة
                        earningsJson: earningsData as any,
                        deductionsJson: deductionsData as any,
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
                    payslips: {
                        select: {
                            id: true,
                            grossSalary: true,
                            totalDeductions: true,
                            netSalary: true
                        }
                    },
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

        // ✅ Fetch all unified deductions from PayrollAdjustmentsService
        const attendanceDedsPreview = await this.adjustmentsService.getAttendanceDeductionsPreview(companyId, dto.periodId);
        const leaveDedsPreview = await this.adjustmentsService.getLeaveDeductionsPreview(companyId, dto.periodId);
        const disciplinaryDedsPreview = await this.adjustmentsService.getDisciplinaryDeductionsPreview(companyId, dto.periodId);
        const custodyDedsPreview = await this.adjustmentsService.getCustodyDeductionsPreview(companyId, dto.periodId);

        // Build helper maps for efficient lookup
        const attendanceMap = new Map<string, number>();
        (attendanceDedsPreview.employees || []).forEach((d: any) => attendanceMap.set(d.employeeId, (attendanceMap.get(d.employeeId) || 0) + (d.totalDeduction || 0)));

        const leaveMap = new Map<string, number>();
        (leaveDedsPreview.leaveDeductions || []).forEach((d: any) => leaveMap.set(d.employeeId, (leaveMap.get(d.employeeId) || 0) + (d.deductionAmount || 0)));

        const disciplinaryMap = new Map<string, any[]>();
        disciplinaryDedsPreview.forEach((d: any) => {
            const list = disciplinaryMap.get(d.employeeId) || [];
            list.push(d);
            disciplinaryMap.set(d.employeeId, list);
        });

        const custodyMap = new Map<string, any[]>();
        custodyDedsPreview.forEach((d: any) => {
            const list = custodyMap.get(d.employeeId) || [];
            list.push(d);
            custodyMap.set(d.employeeId, list);
        });

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

            // ✅ إضافة السلف للمعاينة - Display only, NOT added to deductions
            // ✅ ملاحظة: السلف تم حسابها بالفعل في payroll-calculation.service.ts كـ LOAN_DED
            let employeeAdvanceAmount: Decimal = ZERO;
            const advanceDetails: { id: string; amount: number }[] = [];

            // ✅ حساب مبلغ السلف للعرض فقط - البحث في policyLines
            const loanLines = (calculation.policyLines || []).filter(pl => pl.componentCode === 'LOAN_DED');
            for (const loanLine of loanLines) {
                const amount = toDecimal(loanLine.amount);
                employeeAdvanceAmount = add(employeeAdvanceAmount, amount);
                const loanId = loanLine.componentId?.replace('LOAN-', '') || '';
                advanceDetails.push({ id: loanId, amount: toNumber(amount) });
            }

            const gosiLine = (calculation.policyLines || []).find(pl => pl.componentCode === 'GOSI');
            const gosiAmount = toDecimal(gosiLine?.amount || 0);
            totalGosi = add(totalGosi, gosiAmount);

            // ✅ Add Attendance & Leave deductions (not in calculationService yet)
            const attendanceAmt = toDecimal(attendanceMap.get(employee.id) || 0);
            if (isPositive(attendanceAmt)) {
                deductionItems.push({ name: 'خصم حضور وانصراف (معتمد)', code: 'ATT_DED', amount: toNumber(attendanceAmt) });
            }

            const leaveAmt = toDecimal(leaveMap.get(employee.id) || 0);
            if (isPositive(leaveAmt)) {
                deductionItems.push({ name: 'خصم إجازات (معتمد)', code: 'LEAVE_DED', amount: toNumber(leaveAmt) });
            }

            // ✅ Add Disciplinary & Custody deductions
            const discDeds = disciplinaryMap.get(employee.id) || [];
            let totalDisc = ZERO;
            for (const d of discDeds) {
                const discAmt = Number(d.amount || 0);
                if (discAmt > 0) {
                    const amt = toDecimal(discAmt);
                    totalDisc = add(totalDisc, amt);
                    deductionItems.push({ name: d.reason || 'جزاء تأديبي', code: 'DISC_DED', amount: discAmt });
                }
            }

            const custDeds = custodyMap.get(employee.id) || [];
            let totalCust = ZERO;
            for (const d of custDeds) {
                const custAmt = Number(d.amount || 0);
                if (custAmt > 0) {
                    const amt = toDecimal(custAmt);
                    totalCust = add(totalCust, amt);
                    deductionItems.push({ name: d.reason || 'خصم عهدة', code: 'CUST_DED', amount: custAmt });
                }
            }

            // ✅ إضافة التعديلات اليدوية المكتوبة في الـ Wizard فقط (dto.adjustments)
            // ملاحظة: العمولات والمكافآت والتسويات المسجلة في الـ DB تم جلبها بالفعل في calculation.policyLines
            let wizardBonus: Decimal = ZERO;
            let wizardDeduction: Decimal = ZERO;
            const wizardEmployeeAdjustments = (dto.adjustments || []).find(a => (a as any).employeeId === employee.id)?.items || [];

            for (const adj of wizardEmployeeAdjustments) {
                const adjAmount = toDecimal(adj.amount);
                if (adj.type === 'bonus') {
                    wizardBonus = add(wizardBonus, adjAmount);
                    earnings.push({
                        name: `مكافأة يدوية: ${adj.reason}`,
                        code: 'WIZ_ADD',
                        amount: adj.amount,
                    });
                } else {
                    wizardDeduction = add(wizardDeduction, adjAmount);
                    deductionItems.push({
                        name: `خصم يدوي: ${adj.reason}`,
                        code: 'WIZ_DED',
                        amount: adj.amount,
                    });
                }
            }

            // ✅ Using Decimal for final calculations
            // الراتب الإجمالي النهائي = إجمالي المحرك + إضافات الـ Wizard
            const finalGross = add(toDecimal(calculation.grossSalary), wizardBonus);

            // إجمالي الخصومات النهائي = خصومات المحرك + الخصومات الموحدة + خصم الـ Wizard
            const finalDeductions = add(add(add(add(toDecimal(calculation.totalDeductions), wizardDeduction), attendanceAmt), leaveAmt), add(totalDisc, totalCust));

            // ✅ تطبيق سقف الخصومات 50% من الراتب الإجمالي (المادة 91 من نظام العمل السعودي)
            const capResult = applyDeductionCap(finalGross, finalDeductions, 50);
            const cappedDeductions = capResult.cappedDeductions;
            const deferredAmount = capResult.excessAmount; // الخصومات المرحلة للشهور التالية

            // ✅ حساب صافي الراتب باستخدام الخصومات المحددة بالسقف
            const netResult = calculateNetSalary(finalGross, cappedDeductions);
            const finalNet = netResult.netSalary;

            totalGross = add(totalGross, finalGross);
            totalDeductions = add(totalDeductions, cappedDeductions); // Use capped deductions for totals
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
                deductions: toNumber(cappedDeductions), // ✅ الخصومات المطبقة (بعد السقف 50%)
                deferredDeductions: toNumber(deferredAmount), // ✅ الخصومات المرحلة للشهر التالي
                originalDeductions: toNumber(finalDeductions), // ✅ الخصومات الأصلية قبل السقف
                wasCapped: capResult.wasCapped, // ✅ هل تم تطبيق السقف؟
                gosi: toNumber(gosiAmount),
                advances: toNumber(employeeAdvanceAmount),
                net: toNumber(finalNet),
                earnings,
                deductionItems,
                advanceDetails,
                adjustments: wizardEmployeeAdjustments,
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
