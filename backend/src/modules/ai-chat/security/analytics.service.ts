import { Injectable, Logger } from '@nestjs/common';

/**
 * 📊 Analytics Service
 * Implements ideas #51-75: Advanced Analytics
 * 
 * Features:
 * - #51 Turnover predictor
 * - #52 Performance forecaster
 * - #53 Salary benchmarker
 * - #60 Engagement scorer
 * - #74 Burnout early warning
 */

export interface TurnoverRisk {
    employeeId: string;
    employeeName: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number;
    factors: string[];
    recommendations: string[];
}

export interface PerformanceForecast {
    employeeId: string;
    employeeName: string;
    currentRating: number;
    predictedRating: number;
    trend: 'improving' | 'stable' | 'declining';
    factors: string[];
}

export interface EngagementScore {
    employeeId: string;
    score: number;
    category: 'highly_engaged' | 'engaged' | 'neutral' | 'disengaged' | 'at_risk';
    categoryAr: string;
    indicators: { name: string; value: number; status: 'good' | 'warning' | 'bad' }[];
}

export interface BurnoutWarning {
    employeeId: string;
    employeeName: string;
    burnoutRisk: 'low' | 'moderate' | 'high' | 'critical';
    riskScore: number;
    signals: string[];
    recommendations: string[];
}

export interface TeamAnalytics {
    teamSize: number;
    averageEngagement: number;
    turnoverRisk: number;
    topPerformers: string[];
    needsAttention: string[];
}

@Injectable()
export class AnalyticsService {
    private readonly logger = new Logger(AnalyticsService.name);

    // Risk factors for turnover prediction
    private readonly turnoverFactors = [
        { name: 'tenure_short', nameAr: 'مدة عمل قصيرة', weight: 0.2 },
        { name: 'no_promotion', nameAr: 'لم يترقى منذ فترة', weight: 0.15 },
        { name: 'salary_below_market', nameAr: 'راتب أقل من السوق', weight: 0.2 },
        { name: 'low_engagement', nameAr: 'انخراط منخفض', weight: 0.15 },
        { name: 'high_absence', nameAr: 'غياب متكرر', weight: 0.1 },
        { name: 'manager_change', nameAr: 'تغيير المدير مؤخراً', weight: 0.1 },
        { name: 'no_training', nameAr: 'لا تدريب منذ فترة', weight: 0.1 },
    ];

    // Engagement indicators
    private readonly engagementIndicators = [
        { name: 'attendance', nameAr: 'الحضور', weight: 0.2 },
        { name: 'punctuality', nameAr: 'الانضباط', weight: 0.15 },
        { name: 'task_completion', nameAr: 'إنجاز المهام', weight: 0.2 },
        { name: 'collaboration', nameAr: 'التعاون', weight: 0.15 },
        { name: 'initiative', nameAr: 'المبادرة', weight: 0.15 },
        { name: 'feedback_response', nameAr: 'الاستجابة للتغذية', weight: 0.15 },
    ];

    /**
     * 🚨 Predict turnover risk
     */
    predictTurnoverRisk(employeeData: {
        id: string;
        name: string;
        tenureMonths: number;
        lastPromotion?: number;
        salaryPercentile?: number;
        absenceRate?: number;
        engagementScore?: number;
    }): TurnoverRisk {
        let riskScore = 0;
        const factors: string[] = [];
        const recommendations: string[] = [];

        // Tenure check
        if (employeeData.tenureMonths < 12) {
            riskScore += 15;
            factors.push('مدة عمل أقل من سنة');
            recommendations.push('تعزيز الاندماج والتوجيه');
        }

        // Promotion check
        if (employeeData.lastPromotion && employeeData.lastPromotion > 24) {
            riskScore += 20;
            factors.push('لم يترقى منذ أكثر من سنتين');
            recommendations.push('مناقشة فرص التطوير الوظيفي');
        }

        // Salary check
        if (employeeData.salaryPercentile && employeeData.salaryPercentile < 40) {
            riskScore += 25;
            factors.push('راتب أقل من المتوسط');
            recommendations.push('مراجعة الراتب مقارنة بالسوق');
        }

        // Absence check
        if (employeeData.absenceRate && employeeData.absenceRate > 10) {
            riskScore += 15;
            factors.push('معدل غياب مرتفع');
            recommendations.push('التحقق من رضا الموظف');
        }

        // Engagement check
        if (employeeData.engagementScore && employeeData.engagementScore < 50) {
            riskScore += 25;
            factors.push('انخراط منخفض');
            recommendations.push('عقد جلسة فردية لفهم التحديات');
        }

        // Determine risk level
        let riskLevel: TurnoverRisk['riskLevel'];
        if (riskScore >= 70) riskLevel = 'critical';
        else if (riskScore >= 50) riskLevel = 'high';
        else if (riskScore >= 30) riskLevel = 'medium';
        else riskLevel = 'low';

        return {
            employeeId: employeeData.id,
            employeeName: employeeData.name,
            riskLevel,
            riskScore: Math.min(100, riskScore),
            factors: factors.length > 0 ? factors : ['لا توجد مؤشرات خطر واضحة'],
            recommendations: recommendations.length > 0 ? recommendations : ['استمر في المتابعة الدورية'],
        };
    }

    /**
     * 📈 Calculate engagement score
     */
    calculateEngagementScore(employeeData: {
        id: string;
        attendanceRate: number;
        punctualityRate: number;
        taskCompletionRate: number;
        collaborationScore: number;
        initiativeScore: number;
    }): EngagementScore {
        const indicators: EngagementScore['indicators'] = [];
        let totalScore = 0;

        // Attendance (20%)
        const attendanceScore = employeeData.attendanceRate;
        totalScore += attendanceScore * 0.2;
        indicators.push({
            name: 'الحضور',
            value: attendanceScore,
            status: attendanceScore >= 90 ? 'good' : attendanceScore >= 75 ? 'warning' : 'bad',
        });

        // Punctuality (15%)
        const punctualityScore = employeeData.punctualityRate;
        totalScore += punctualityScore * 0.15;
        indicators.push({
            name: 'الانضباط',
            value: punctualityScore,
            status: punctualityScore >= 90 ? 'good' : punctualityScore >= 75 ? 'warning' : 'bad',
        });

        // Task completion (25%)
        const taskScore = employeeData.taskCompletionRate;
        totalScore += taskScore * 0.25;
        indicators.push({
            name: 'إنجاز المهام',
            value: taskScore,
            status: taskScore >= 85 ? 'good' : taskScore >= 70 ? 'warning' : 'bad',
        });

        // Collaboration (20%)
        const collabScore = employeeData.collaborationScore;
        totalScore += collabScore * 0.2;
        indicators.push({
            name: 'التعاون',
            value: collabScore,
            status: collabScore >= 80 ? 'good' : collabScore >= 60 ? 'warning' : 'bad',
        });

        // Initiative (20%)
        const initScore = employeeData.initiativeScore;
        totalScore += initScore * 0.2;
        indicators.push({
            name: 'المبادرة',
            value: initScore,
            status: initScore >= 70 ? 'good' : initScore >= 50 ? 'warning' : 'bad',
        });

        // Determine category
        let category: EngagementScore['category'];
        let categoryAr: string;
        if (totalScore >= 85) {
            category = 'highly_engaged';
            categoryAr = 'منخرط جداً';
        } else if (totalScore >= 70) {
            category = 'engaged';
            categoryAr = 'منخرط';
        } else if (totalScore >= 55) {
            category = 'neutral';
            categoryAr = 'محايد';
        } else if (totalScore >= 40) {
            category = 'disengaged';
            categoryAr = 'غير منخرط';
        } else {
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

    /**
     * 🔥 Detect burnout risk
     */
    detectBurnoutRisk(employeeData: {
        id: string;
        name: string;
        weeklyHours: number;
        overtimeHours: number;
        vacationDaysUsed: number;
        vacationDaysAvailable: number;
        recentAbsences: number;
        projectCount: number;
    }): BurnoutWarning {
        let riskScore = 0;
        const signals: string[] = [];
        const recommendations: string[] = [];

        // Overtime check
        if (employeeData.overtimeHours > 20) {
            riskScore += 30;
            signals.push('ساعات إضافية مرتفعة جداً');
            recommendations.push('تقليل عبء العمل');
        } else if (employeeData.overtimeHours > 10) {
            riskScore += 15;
            signals.push('ساعات إضافية متوسطة');
        }

        // Weekly hours
        if (employeeData.weeklyHours > 50) {
            riskScore += 25;
            signals.push('ساعات عمل أسبوعية عالية');
            recommendations.push('مراجعة توزيع المهام');
        }

        // Vacation usage
        const vacationUsageRate = employeeData.vacationDaysUsed /
            (employeeData.vacationDaysUsed + employeeData.vacationDaysAvailable) * 100;
        if (vacationUsageRate < 30) {
            riskScore += 20;
            signals.push('لم يستخدم إجازاته');
            recommendations.push('تشجيع أخذ إجازة');
        }

        // Project overload
        if (employeeData.projectCount > 5) {
            riskScore += 20;
            signals.push('عدد مشاريع كثير');
            recommendations.push('إعادة توزيع المشاريع');
        }

        // Recent absences spike
        if (employeeData.recentAbsences > 3) {
            riskScore += 15;
            signals.push('زيادة في الغياب مؤخراً');
            recommendations.push('التحقق من صحة الموظف');
        }

        // Determine risk level
        let burnoutRisk: BurnoutWarning['burnoutRisk'];
        if (riskScore >= 70) burnoutRisk = 'critical';
        else if (riskScore >= 50) burnoutRisk = 'high';
        else if (riskScore >= 30) burnoutRisk = 'moderate';
        else burnoutRisk = 'low';

        return {
            employeeId: employeeData.id,
            employeeName: employeeData.name,
            burnoutRisk,
            riskScore: Math.min(100, riskScore),
            signals: signals.length > 0 ? signals : ['لا توجد مؤشرات واضحة'],
            recommendations: recommendations.length > 0 ? recommendations : ['استمر في المتابعة'],
        };
    }

    /**
     * 📊 Format analytics as message
     */
    formatTurnoverRisk(risk: TurnoverRisk): string {
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

    /**
     * 📊 Format engagement score as message
     */
    formatEngagementScore(score: EngagementScore): string {
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

    /**
     * 🔥 Format burnout warning as message
     */
    formatBurnoutWarning(warning: BurnoutWarning): string {
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
}
