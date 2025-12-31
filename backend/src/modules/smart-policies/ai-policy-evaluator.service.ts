import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AiService } from "../ai/ai.service";
import { PolicyPayrollLine } from "../payroll-calculation/dto/calculation.types";

export interface EmployeePayrollContext {
    employeeId: string;
    employeeName: string;
    department?: string | null;
    jobTitle?: string | null;
    hireDate?: Date | null;
    yearsOfService: number;
    baseSalary: number;
    totalSalary: number;
    
    // Attendance stats for the month
    workingDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    lateMinutes: number;
    overtimeHours: number;
    attendancePercentage: number;
    
    // Leave stats
    leavesTaken: number;
    unpaidLeaves: number;
    
    // Disciplinary
    activePenalties: number;
    
    // Custody
    pendingCustodyReturns: number;
    returnedCustodyThisMonth: number;
    
    // Period
    month: number;
    year: number;
}

export interface AIPolicyEvaluationResult {
    policyId: string;
    policyName: string;
    applies: boolean;
    amount: number;
    type: "EARNING" | "DEDUCTION";
    reason: string;
}

const AI_EVALUATOR_PROMPT = `أنت محرك تنفيذ سياسات الرواتب الذكي. مهمتك تحديد هل سياسة معينة تنطبق على موظف بناءً على بياناته.

📋 السياسة المطلوب تقييمها:
{policyText}

👤 بيانات الموظف:
{employeeContext}

🎯 مطلوب منك:
1. افحص هل شروط السياسة تنطبق على هذا الموظف
2. لو تنطبق، احسب المبلغ (ثابت أو نسبة أو أيام)
3. أرجع الإجابة بصيغة JSON

⚠️ قواعد مهمة:
- "نسبة الحضور" = (الأيام الحاضر فيها / أيام العمل) × 100
- "سنوات الخدمة" = عدد السنين من تاريخ التعيين
- "يوم راتب" = الراتب الأساسي ÷ 30
- لو السياسة تقول "أكثر من X" يعني > وليس >=
- لو السياسة تقول "X أو أكثر" أو "على الأقل X" يعني >=

أرجع JSON فقط:
{
  "applies": true/false,
  "amount": الرقم (0 لو لا تنطبق),
  "type": "EARNING" أو "DEDUCTION",
  "reason": "سبب قصير بالعربي"
}`;

@Injectable()
export class AIPolicyEvaluatorService {
    private readonly logger = new Logger(AIPolicyEvaluatorService.name);

    constructor(
        private prisma: PrismaService,
        private aiService: AiService,
    ) {}

    /**
     * Evaluate ALL active smart policies for an employee using AI
     */
    async evaluateAllPolicies(
        companyId: string,
        context: EmployeePayrollContext
    ): Promise<PolicyPayrollLine[]> {
        const policyLines: PolicyPayrollLine[] = [];

        try {
            // Get all active smart policies
            const policies = await this.prisma.smartPolicy.findMany({
                where: { companyId, isActive: true },
            });

            this.logger.log(`Evaluating ${policies.length} policies for ${context.employeeName} using AI`);

            // Evaluate each policy with AI
            for (const policy of policies) {
                try {
                    const result = await this.evaluatePolicyWithAI(policy, context);
                    
                    if (result.applies && result.amount !== 0) {
                        policyLines.push({
                            componentId: "SMART-AI-" + policy.id.substring(0, 6),
                            componentName: policy.name || "Smart Policy",
                            componentCode: "SMART",
                            amount: Math.abs(result.amount),
                            sign: result.type,
                            descriptionAr: `سياسة ذكية: ${result.reason}`,
                            source: {
                                policyId: policy.id,
                                policyCode: "SMART-AI",
                                ruleId: "AI-EVAL",
                                ruleCode: "AI",
                            },
                        });
                        
                        this.logger.log(`✅ Policy "${policy.name}" applies: ${result.amount} SAR (${result.type})`);
                    }
                } catch (error) {
                    this.logger.error(`Error evaluating policy ${policy.id}: ${error.message}`);
                }
            }
        } catch (error) {
            this.logger.error(`Error fetching policies: ${error.message}`);
        }

        return policyLines;
    }

    /**
     * Evaluate a single policy using AI
     */
    private async evaluatePolicyWithAI(
        policy: any,
        context: EmployeePayrollContext
    ): Promise<AIPolicyEvaluationResult> {
        if (!this.aiService.isAvailable()) {
            return { policyId: policy.id, policyName: policy.name, applies: false, amount: 0, type: "EARNING", reason: "AI غير متاح" };
        }

        // Format employee context
        const contextText = `
- الاسم: ${context.employeeName}
- القسم: ${context.department || "غير محدد"}
- المسمى الوظيفي: ${context.jobTitle || "غير محدد"}
- سنوات الخدمة: ${context.yearsOfService} سنة
- الراتب الأساسي: ${context.baseSalary} ريال
- إجمالي الراتب: ${context.totalSalary} ريال
- أيام العمل بالشهر: ${context.workingDays}
- أيام الحضور: ${context.presentDays}
- أيام الغياب: ${context.absentDays}
- أيام التأخير: ${context.lateDays}
- دقائق التأخير الإجمالية: ${context.lateMinutes}
- ساعات الأوفرتايم: ${context.overtimeHours}
- نسبة الحضور: ${context.attendancePercentage}%
- إجازات هذا الشهر: ${context.leavesTaken}
- إجازات بدون راتب: ${context.unpaidLeaves}
- جزاءات نشطة: ${context.activePenalties}
- عهد مسترجعة هذا الشهر: ${context.returnedCustodyThisMonth}
- الشهر: ${context.month}/${context.year}`;

        const prompt = AI_EVALUATOR_PROMPT
            .replace("{policyText}", policy.originalText || policy.name)
            .replace("{employeeContext}", contextText);

        try {
            const response = await this.aiService.generateContent(prompt);
            const parsed = this.aiService.parseJsonResponse<{
                applies: boolean;
                amount: number;
                type: "EARNING" | "DEDUCTION";
                reason: string;
            }>(response);

            return {
                policyId: policy.id,
                policyName: policy.name,
                applies: parsed.applies,
                amount: parsed.amount || 0,
                type: parsed.type || "EARNING",
                reason: parsed.reason || "",
            };
        } catch (error) {
            this.logger.error(`AI evaluation failed for policy ${policy.name}: ${error.message}`);
            return { policyId: policy.id, policyName: policy.name, applies: false, amount: 0, type: "EARNING", reason: "فشل التقييم" };
        }
    }
}
