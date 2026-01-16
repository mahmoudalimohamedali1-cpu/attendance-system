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
var PolicyCoachService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyCoachService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let PolicyCoachService = PolicyCoachService_1 = class PolicyCoachService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(PolicyCoachService_1.name);
    }
    async validateAgainstLaborLaw(policyText, parsedRule) {
        const violations = [];
        const suggestions = [];
        const textLower = policyText.toLowerCase();
        const parsed = parsedRule || {};
        if (textLower.includes('خصم') || textLower.includes('يخصم')) {
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
                }
                else if (percent > 30) {
                    suggestions.push(`نسبة الخصم ${percent}% مرتفعة - تأكد من وجود سبب واضح`);
                }
            }
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
        if (textLower.includes('فصل') || textLower.includes('إنهاء')) {
            violations.push({
                article: 'المادة 80',
                articleText: 'يجب إشعار العامل قبل إنهاء العقد بـ 60 يوماً',
                issue: 'السياسة تتضمن إجراء فصل - تأكد من اتباع الإجراءات القانونية',
                severity: 'INFO',
            });
        }
        if ((textLower.includes('غياب') || textLower.includes('إجازة')) && textLower.includes('خصم')) {
            suggestions.push('تأكد من عدم خصم أيام الإجازة المستحقة حسب المادة 116');
        }
        if (!textLower.includes('أول') && !textLower.includes('ثاني') && !textLower.includes('متدرج')) {
            if (textLower.includes('خصم') && !textLower.includes('تنبيه') && !textLower.includes('إنذار')) {
                suggestions.push('💡 يُنصح بإضافة تدرج في العقوبات (تنبيه ← إنذار ← خصم) للعدالة');
            }
        }
        const hasErrors = violations.some(v => v.severity === 'ERROR');
        const isCompliant = !hasErrors;
        if (isCompliant && violations.length === 0) {
            suggestions.unshift('✅ السياسة متوافقة مع نظام العمل السعودي');
        }
        this.logger.log(`[COACH] Validated policy: ${isCompliant ? 'COMPLIANT' : 'VIOLATIONS FOUND'}`);
        return { isCompliant, violations, suggestions };
    }
    async suggestOptimizations(policyId) {
        const policy = await this.prisma.smartPolicy.findUnique({
            where: { id: policyId },
            include: { executions: { take: 100 } },
        });
        if (!policy) {
            return [];
        }
        const suggestions = [];
        const totalExecutions = policy.executions.length;
        const successfulExecutions = policy.executions.filter((e) => e.isSuccess).length;
        const successRate = totalExecutions > 0 ? successfulExecutions / totalExecutions : 1;
        if (successRate < 0.8 && totalExecutions > 5) {
            suggestions.push({
                type: 'PERFORMANCE',
                suggestion: 'معدل نجاح التنفيذ منخفض - راجع شروط السياسة للتأكد من دقتها',
                priority: 'HIGH',
            });
        }
        if (!policy.isActive) {
            suggestions.push({
                type: 'COVERAGE',
                suggestion: 'السياسة غير نشطة - هل تريد تفعيلها؟',
                priority: 'MEDIUM',
            });
        }
        if (totalExecutions < 3 && policy.isActive) {
            suggestions.push({
                type: 'COVERAGE',
                suggestion: 'السياسة لم تُنفذ كثيراً - تحقق من الشروط أو المشغلات',
                priority: 'MEDIUM',
            });
        }
        const avgDeduction = totalExecutions > 0
            ? policy.executions.reduce((sum, e) => sum + Number(e.actionValue || 0), 0) / totalExecutions
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
    async analyzePatterns(companyId) {
        const patterns = [];
        const insights = [];
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
        const lateCount = attendanceStats.find((s) => s.status === 'LATE')?._count.id || 0;
        const absentCount = attendanceStats.find((s) => s.status === 'ABSENT')?._count.id || 0;
        if (lateCount > 50) {
            patterns.push({
                type: 'HIGH_LATENESS',
                description: `${lateCount} حالة تأخير في آخر 3 أشهر`,
                affectedEmployees: Math.ceil(lateCount / 10),
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
    async recommendPolicies(companyId) {
        const recommendations = [];
        const existingPolicies = await this.prisma.smartPolicy.findMany({
            where: { companyId, isActive: true },
            select: { originalText: true },
        });
        const policyTexts = existingPolicies.map((p) => (p.originalText || '').toLowerCase()).join(' ');
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
};
exports.PolicyCoachService = PolicyCoachService;
exports.PolicyCoachService = PolicyCoachService = PolicyCoachService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PolicyCoachService);
//# sourceMappingURL=policy-coach.service.js.map