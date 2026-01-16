import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

// Export interfaces to fix TS4053 error in controller
export interface LaborLawValidation {
    isCompliant: boolean;
    violations: Array<{
        article: string;
        articleText: string;
        issue: string;
        severity: 'ERROR' | 'WARNING' | 'INFO';
    }>;
    suggestions: string[];
}

export interface OptimizationSuggestion {
    type: 'PERFORMANCE' | 'CLARITY' | 'COVERAGE' | 'FAIRNESS';
    suggestion: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface PatternAnalysis {
    patterns: Array<{
        type: string;
        description: string;
        affectedEmployees: number;
        suggestedAction: string;
    }>;
    insights: string[];
}

export interface RecommendedPolicy {
    title: string;
    description: string;
    originalText: string;
    reason: string;
    impact: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

@Injectable()
export class PolicyCoachService {
    private readonly logger = new Logger(PolicyCoachService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Validate a policy against Saudi Labor Law
     */
    async validateAgainstLaborLaw(policyText: string, parsedRule?: any): Promise<LaborLawValidation> {
        const violations: LaborLawValidation['violations'] = [];
        const suggestions: string[] = [];

        const textLower = policyText.toLowerCase();
        const parsed = parsedRule || {};

        // === Article 95: Maximum Deduction Limit (50% of salary) ===
        if (textLower.includes('خصم') || textLower.includes('يخصم')) {
            // Check for percentage-based deductions
            const percentMatch = policyText.match(/(\d+)\s*%/);
            if (percentMatch) {
                const percent = parseInt(percentMatch[1]);
                if (percent > 50) {
                    violations.push({
                        article: 'المادة 95',
                        articleText: 'لا يجوز أن يزيد مجموع الاستقطاعات على 50% من أجر العامل',
                        issue: `نسبة الخصم ${percent}% تتجاوز الحد الأقصى المسموح به (50%)`,
                        severity: 'ERROR',
                    });
                } else if (percent > 30) {
                    suggestions.push(`نسبة الخصم ${percent}% مرتفعة - تأكد من وجود سبب واضح`);
                }
            }

            // Check for excessive fixed deductions
            const amountMatch = policyText.match(/(\d+)\s*(ريال|ر\.س|SAR)/i);
            if (amountMatch) {
                const amount = parseInt(amountMatch[1]);
                if (amount > 1000) {
                    violations.push({
                        article: 'المادة 95',
                        articleText: 'يجب أن يكون الخصم متناسباً مع المخالفة',
                        issue: `مبلغ الخصم ${amount} ريال قد يكون مرتفعاً - تأكد من التناسب مع الراتب`,
                        severity: 'WARNING',
                    });
                }
            }
        }

        // === Article 66: Working Hours (8 hours/day, 48 hours/week) ===
        if (textLower.includes('ساعات') || textLower.includes('إضافي')) {
            const hoursMatch = policyText.match(/(\d+)\s*ساع/);
            if (hoursMatch) {
                const hours = parseInt(hoursMatch[1]);
                if (hours > 12) {
                    violations.push({
                        article: 'المادة 66',
                        articleText: 'لا يجوز تشغيل العامل أكثر من 8 ساعات يومياً أو 48 ساعة أسبوعياً',
                        issue: 'الساعات المذكورة تتجاوز الحد اليومي المسموح',
                        severity: 'WARNING',
                    });
                }
            }
        }

        // === Article 80: Termination notice ===
        if (textLower.includes('فصل') || textLower.includes('إنهاء')) {
            violations.push({
                article: 'المادة 80',
                articleText: 'يجب إشعار العامل قبل إنهاء العقد بـ 60 يوماً',
                issue: 'السياسة تتضمن إجراء فصل - تأكد من اتباع الإجراءات القانونية',
                severity: 'INFO',
            });
        }

        // === Article 116: Leave deductions ===
        if ((textLower.includes('غياب') || textLower.includes('إجازة')) && textLower.includes('خصم')) {
            suggestions.push('تأكد من عدم خصم أيام الإجازة المستحقة حسب المادة 116');
        }

        // === Check for tiered penalties (good practice) ===
        if (!textLower.includes('أول') && !textLower.includes('ثاني') && !textLower.includes('متدرج')) {
            if (textLower.includes('خصم') && !textLower.includes('تنبيه') && !textLower.includes('إنذار')) {
                suggestions.push('💡 يُنصح بإضافة تدرج في العقوبات (تنبيه ← إنذار ← خصم) للعدالة');
            }
        }

        // Compliance status
        const hasErrors = violations.some(v => v.severity === 'ERROR');
        const isCompliant = !hasErrors;

        if (isCompliant && violations.length === 0) {
            suggestions.unshift('✅ السياسة متوافقة مع نظام العمل السعودي');
        }

        this.logger.log(`[COACH] Validated policy: ${isCompliant ? 'COMPLIANT' : 'VIOLATIONS FOUND'}`);

        return { isCompliant, violations, suggestions };
    }

    /**
     * Suggest optimizations for a policy
     */
    async suggestOptimizations(policyId: string): Promise<OptimizationSuggestion[]> {
        const policy = await this.prisma.smartPolicy.findUnique({
            where: { id: policyId },
            include: { executions: { take: 100 } },
        });

        if (!policy) {
            return [];
        }

        const suggestions: OptimizationSuggestion[] = [];

        // Check execution success rate
        const totalExecutions = policy.executions.length;
        const successfulExecutions = policy.executions.filter((e: any) => e.isSuccess).length;
        const successRate = totalExecutions > 0 ? successfulExecutions / totalExecutions : 1;

        if (successRate < 0.8 && totalExecutions > 5) {
            suggestions.push({
                type: 'PERFORMANCE',
                suggestion: 'معدل نجاح التنفيذ منخفض - راجع شروط السياسة للتأكد من دقتها',
                priority: 'HIGH',
            });
        }

        // Check if policy is inactive for long
        if (!policy.isActive) {
            suggestions.push({
                type: 'COVERAGE',
                suggestion: 'السياسة غير نشطة - هل تريد تفعيلها؟',
                priority: 'MEDIUM',
            });
        }

        // Check for very low execution count
        if (totalExecutions < 3 && policy.isActive) {
            suggestions.push({
                type: 'COVERAGE',
                suggestion: 'السياسة لم تُنفذ كثيراً - تحقق من الشروط أو المشغلات',
                priority: 'MEDIUM',
            });
        }

        // Check for very high deductions
        const avgDeduction = totalExecutions > 0
            ? policy.executions.reduce((sum: number, e: any) => sum + Number(e.actionValue || 0), 0) / totalExecutions
            : 0;

        if (avgDeduction > 500) {
            suggestions.push({
                type: 'FAIRNESS',
                suggestion: 'متوسط الخصم مرتفع (${avgDeduction} ريال) - تأكد من العدالة',
                priority: 'MEDIUM',
            });
        }

        return suggestions;
    }

    /**
     * Analyze attendance/leave patterns and suggest policies
     */
    async analyzePatterns(companyId: string): Promise<PatternAnalysis> {
        const patterns: PatternAnalysis['patterns'] = [];
        const insights: string[] = [];

        // Get attendance summary for last 3 months
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const attendanceStats = await this.prisma.attendance.groupBy({
            by: ['status'],
            where: {
                user: { companyId },
                date: { gte: threeMonthsAgo },
            },
            _count: { id: true },
        });

        // Count late arrivals
        const lateCount = attendanceStats.find((s: any) => s.status === 'LATE')?._count.id || 0;
        const absentCount = attendanceStats.find((s: any) => s.status === 'ABSENT')?._count.id || 0;

        if (lateCount > 50) {
            patterns.push({
                type: 'HIGH_LATENESS',
                description: `${lateCount} حالة تأخير في آخر 3 أشهر`,
                affectedEmployees: Math.ceil(lateCount / 10), // Estimate
                suggestedAction: 'إنشاء سياسة خصم تأخير متدرج',
            });
        }

        if (absentCount > 20) {
            patterns.push({
                type: 'HIGH_ABSENCE',
                description: `${absentCount} حالة غياب في آخر 3 أشهر`,
                affectedEmployees: Math.ceil(absentCount / 5),
                suggestedAction: 'إنشاء سياسة خصم غياب بدون عذر',
            });
        }

        // Check for perfect attendance
        const perfectAttendance = await this.prisma.user.count({
            where: {
                companyId,
                status: 'ACTIVE',
                role: 'EMPLOYEE',
                attendances: {
                    none: {
                        status: { in: ['LATE', 'ABSENT'] },
                        date: { gte: threeMonthsAgo },
                    },
                },
            },
        });

        if (perfectAttendance > 0) {
            insights.push(`🌟 ${perfectAttendance} موظف بحضور مثالي - يستحقون مكافأة!`);
        }

        this.logger.log(`[COACH] Pattern analysis: ${patterns.length} patterns found`);

        return { patterns, insights };
    }

    /**
     * Recommend policies based on company data
     */
    async recommendPolicies(companyId: string): Promise<RecommendedPolicy[]> {
        const recommendations: RecommendedPolicy[] = [];

        // Check if company has basic policies
        const existingPolicies = await this.prisma.smartPolicy.findMany({
            where: { companyId, isActive: true },
            select: { originalText: true },
        });

        const policyTexts = existingPolicies.map((p: any) => (p.originalText || '').toLowerCase()).join(' ');

        // Recommend late deduction if not exists
        if (!policyTexts.includes('تأخير') && !policyTexts.includes('متأخر')) {
            recommendations.push({
                title: 'سياسة خصم التأخير',
                description: 'خصم متدرج على التأخر المتكرر',
                originalText: 'أول تأخير = تنبيه، ثاني = 25 ريال، ثالث = 50 ريال، رابع+ = 100 ريال',
                reason: 'لا توجد سياسة تأخير حالياً',
                impact: 'تقليل التأخر بنسبة 30-50%',
                priority: 'HIGH',
            });
        }

        // Recommend attendance bonus if not exists
        if (!policyTexts.includes('حضور كامل') && !policyTexts.includes('مكافأة حضور')) {
            recommendations.push({
                title: 'مكافأة الحضور الكامل',
                description: 'مكافأة للموظفين بدون تأخير أو غياب',
                originalText: 'الموظف الذي يحضر كل أيام الشهر بدون تأخير يحصل على 500 ريال',
                reason: 'تحفيز الموظفين على الالتزام',
                impact: 'تحسين الحضور بنسبة 20%',
                priority: 'MEDIUM',
            });
        }

        // Recommend absence deduction
        if (!policyTexts.includes('غياب بدون')) {
            recommendations.push({
                title: 'خصم الغياب بدون عذر',
                description: 'خصم عن الغياب غير المبرر',
                originalText: 'كل يوم غياب بدون عذر = خصم يوم ونصف',
                reason: 'ضمان العدالة في الخصومات',
                impact: 'تقليل الغياب غير المبرر',
                priority: 'MEDIUM',
            });
        }

        this.logger.log(`[COACH] Recommended ${recommendations.length} policies for company ${companyId}`);

        return recommendations;
    }
}
