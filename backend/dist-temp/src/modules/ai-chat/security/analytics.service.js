"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AnalyticsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
let AnalyticsService = AnalyticsService_1 = class AnalyticsService {
    constructor() {
        this.logger = new common_1.Logger(AnalyticsService_1.name);
        this.turnoverFactors = [
            { name: 'tenure_short', nameAr: 'مدة عمل قصيرة', weight: 0.2 },
            { name: 'no_promotion', nameAr: 'لم يترقى منذ فترة', weight: 0.15 },
            { name: 'salary_below_market', nameAr: 'راتب أقل من السوق', weight: 0.2 },
            { name: 'low_engagement', nameAr: 'انخراط منخفض', weight: 0.15 },
            { name: 'high_absence', nameAr: 'غياب متكرر', weight: 0.1 },
            { name: 'manager_change', nameAr: 'تغيير المدير مؤخراً', weight: 0.1 },
            { name: 'no_training', nameAr: 'لا تدريب منذ فترة', weight: 0.1 },
        ];
        this.engagementIndicators = [
            { name: 'attendance', nameAr: 'الحضور', weight: 0.2 },
            { name: 'punctuality', nameAr: 'الانضباط', weight: 0.15 },
            { name: 'task_completion', nameAr: 'إنجاز المهام', weight: 0.2 },
            { name: 'collaboration', nameAr: 'التعاون', weight: 0.15 },
            { name: 'initiative', nameAr: 'المبادرة', weight: 0.15 },
            { name: 'feedback_response', nameAr: 'الاستجابة للتغذية', weight: 0.15 },
        ];
    }
    predictTurnoverRisk(employeeData) {
        let riskScore = 0;
        const factors = [];
        const recommendations = [];
        if (employeeData.tenureMonths < 12) {
            riskScore += 15;
            factors.push('مدة عمل أقل من سنة');
            recommendations.push('تعزيز الاندماج والتوجيه');
        }
        if (employeeData.lastPromotion && employeeData.lastPromotion > 24) {
            riskScore += 20;
            factors.push('لم يترقى منذ أكثر من سنتين');
            recommendations.push('مناقشة فرص التطوير الوظيفي');
        }
        if (employeeData.salaryPercentile && employeeData.salaryPercentile < 40) {
            riskScore += 25;
            factors.push('راتب أقل من المتوسط');
            recommendations.push('مراجعة الراتب مقارنة بالسوق');
        }
        if (employeeData.absenceRate && employeeData.absenceRate > 10) {
            riskScore += 15;
            factors.push('معدل غياب مرتفع');
            recommendations.push('التحقق من رضا الموظف');
        }
        if (employeeData.engagementScore && employeeData.engagementScore < 50) {
            riskScore += 25;
            factors.push('انخراط منخفض');
            recommendations.push('عقد جلسة فردية لفهم التحديات');
        }
        let riskLevel;
        if (riskScore >= 70)
            riskLevel = 'critical';
        else if (riskScore >= 50)
            riskLevel = 'high';
        else if (riskScore >= 30)
            riskLevel = 'medium';
        else
            riskLevel = 'low';
        return {
            employeeId: employeeData.id,
            employeeName: employeeData.name,
            riskLevel,
            riskScore: Math.min(100, riskScore),
            factors: factors.length > 0 ? factors : ['لا توجد مؤشرات خطر واضحة'],
            recommendations: recommendations.length > 0 ? recommendations : ['استمر في المتابعة الدورية'],
        };
    }
    calculateEngagementScore(employeeData) {
        const indicators = [];
        let totalScore = 0;
        const attendanceScore = employeeData.attendanceRate;
        totalScore += attendanceScore * 0.2;
        indicators.push({
            name: 'الحضور',
            value: attendanceScore,
            status: attendanceScore >= 90 ? 'good' : attendanceScore >= 75 ? 'warning' : 'bad',
        });
        const punctualityScore = employeeData.punctualityRate;
        totalScore += punctualityScore * 0.15;
        indicators.push({
            name: 'الانضباط',
            value: punctualityScore,
            status: punctualityScore >= 90 ? 'good' : punctualityScore >= 75 ? 'warning' : 'bad',
        });
        const taskScore = employeeData.taskCompletionRate;
        totalScore += taskScore * 0.25;
        indicators.push({
            name: 'إنجاز المهام',
            value: taskScore,
            status: taskScore >= 85 ? 'good' : taskScore >= 70 ? 'warning' : 'bad',
        });
        const collabScore = employeeData.collaborationScore;
        totalScore += collabScore * 0.2;
        indicators.push({
            name: 'التعاون',
            value: collabScore,
            status: collabScore >= 80 ? 'good' : collabScore >= 60 ? 'warning' : 'bad',
        });
        const initScore = employeeData.initiativeScore;
        totalScore += initScore * 0.2;
        indicators.push({
            name: 'المبادرة',
            value: initScore,
            status: initScore >= 70 ? 'good' : initScore >= 50 ? 'warning' : 'bad',
        });
        let category;
        let categoryAr;
        if (totalScore >= 85) {
            category = 'highly_engaged';
            categoryAr = 'منخرط جداً';
        }
        else if (totalScore >= 70) {
            category = 'engaged';
            categoryAr = 'منخرط';
        }
        else if (totalScore >= 55) {
            category = 'neutral';
            categoryAr = 'محايد';
        }
        else if (totalScore >= 40) {
            category = 'disengaged';
            categoryAr = 'غير منخرط';
        }
        else {
            category = 'at_risk';
            categoryAr = 'في خطر';
        }
        return {
            employeeId: employeeData.id,
            score: Math.round(totalScore),
            category,
            categoryAr,
            indicators,
        };
    }
    detectBurnoutRisk(employeeData) {
        let riskScore = 0;
        const signals = [];
        const recommendations = [];
        if (employeeData.overtimeHours > 20) {
            riskScore += 30;
            signals.push('ساعات إضافية مرتفعة جداً');
            recommendations.push('تقليل عبء العمل');
        }
        else if (employeeData.overtimeHours > 10) {
            riskScore += 15;
            signals.push('ساعات إضافية متوسطة');
        }
        if (employeeData.weeklyHours > 50) {
            riskScore += 25;
            signals.push('ساعات عمل أسبوعية عالية');
            recommendations.push('مراجعة توزيع المهام');
        }
        const vacationUsageRate = employeeData.vacationDaysUsed /
            (employeeData.vacationDaysUsed + employeeData.vacationDaysAvailable) * 100;
        if (vacationUsageRate < 30) {
            riskScore += 20;
            signals.push('لم يستخدم إجازاته');
            recommendations.push('تشجيع أخذ إجازة');
        }
        if (employeeData.projectCount > 5) {
            riskScore += 20;
            signals.push('عدد مشاريع كثير');
            recommendations.push('إعادة توزيع المشاريع');
        }
        if (employeeData.recentAbsences > 3) {
            riskScore += 15;
            signals.push('زيادة في الغياب مؤخراً');
            recommendations.push('التحقق من صحة الموظف');
        }
        let burnoutRisk;
        if (riskScore >= 70)
            burnoutRisk = 'critical';
        else if (riskScore >= 50)
            burnoutRisk = 'high';
        else if (riskScore >= 30)
            burnoutRisk = 'moderate';
        else
            burnoutRisk = 'low';
        return {
            employeeId: employeeData.id,
            employeeName: employeeData.name,
            burnoutRisk,
            riskScore: Math.min(100, riskScore),
            signals: signals.length > 0 ? signals : ['لا توجد مؤشرات واضحة'],
            recommendations: recommendations.length > 0 ? recommendations : ['استمر في المتابعة'],
        };
    }
    formatTurnoverRisk(risk) {
        const riskEmoji = {
            low: '🟢',
            medium: '🟡',
            high: '🟠',
            critical: '🔴',
        }[risk.riskLevel];
        let message = `${riskEmoji} **تحليل مخاطر الاستقالة - ${risk.employeeName}**\n\n`;
        message += `📊 درجة الخطر: ${risk.riskScore}%\n`;
        message += `📍 المستوى: ${risk.riskLevel === 'critical' ? 'حرج' : risk.riskLevel === 'high' ? 'عالي' : risk.riskLevel === 'medium' ? 'متوسط' : 'منخفض'}\n\n`;
        if (risk.factors.length > 0) {
            message += `⚠️ **العوامل:**\n`;
            for (const factor of risk.factors) {
                message += `• ${factor}\n`;
            }
        }
        if (risk.recommendations.length > 0) {
            message += `\n💡 **التوصيات:**\n`;
            for (const rec of risk.recommendations) {
                message += `• ${rec}\n`;
            }
        }
        return message;
    }
    formatEngagementScore(score) {
        const categoryEmoji = {
            highly_engaged: '🌟',
            engaged: '✅',
            neutral: '😐',
            disengaged: '⚠️',
            at_risk: '🚨',
        }[score.category];
        let message = `${categoryEmoji} **مستوى الانخراط: ${score.categoryAr}**\n\n`;
        message += `📊 الدرجة: ${score.score}/100\n\n`;
        message += `**المؤشرات:**\n`;
        for (const ind of score.indicators) {
            const statusEmoji = ind.status === 'good' ? '✅' : ind.status === 'warning' ? '⚠️' : '❌';
            message += `${statusEmoji} ${ind.name}: ${ind.value}%\n`;
        }
        return message;
    }
    formatBurnoutWarning(warning) {
        const riskEmoji = {
            low: '🟢',
            moderate: '🟡',
            high: '🟠',
            critical: '🔴',
        }[warning.burnoutRisk];
        let message = `${riskEmoji} **تحذير الإرهاق - ${warning.employeeName}**\n\n`;
        message += `🔥 مستوى الخطر: ${warning.burnoutRisk === 'critical' ? 'حرج' : warning.burnoutRisk === 'high' ? 'عالي' : warning.burnoutRisk === 'moderate' ? 'متوسط' : 'منخفض'}\n`;
        message += `📊 الدرجة: ${warning.riskScore}%\n\n`;
        if (warning.signals.length > 0) {
            message += `⚠️ **الإشارات:**\n`;
            for (const signal of warning.signals) {
                message += `• ${signal}\n`;
            }
        }
        if (warning.recommendations.length > 0) {
            message += `\n💡 **التوصيات:**\n`;
            for (const rec of warning.recommendations) {
                message += `• ${rec}\n`;
            }
        }
        return message;
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = AnalyticsService_1 = __decorate([
    (0, common_1.Injectable)()
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map