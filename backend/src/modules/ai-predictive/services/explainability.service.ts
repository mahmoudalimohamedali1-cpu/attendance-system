import { Injectable, Logger } from '@nestjs/common';
import { RiskLevel } from '@prisma/client';

/**
 * 🔍 Explainability Service
 *
 * Generates human-readable explanations for AI predictions
 * to ensure transparency and trust in the ML model.
 *
 * Features:
 * - Feature importance ranking
 * - Human-readable explanations in Arabic
 * - Actionable recommendations
 * - Risk factor analysis
 * - Transparent prediction reasoning
 */

interface PredictionExplanation {
    summary: string;
    riskLevel: RiskLevel;
    likelihood: number;
    topFactors: FeatureImportance[];
    detailedExplanation: string;
    recommendations: string[];
}

interface FeatureImportance {
    feature: string;
    impact: 'high' | 'medium' | 'low';
    description: string;
    weight: number;
}

@Injectable()
export class ExplainabilityService {
    private readonly logger = new Logger(ExplainabilityService.name);

    // أوزان العوامل (من absence-prediction.service.ts)
    private readonly FEATURE_WEIGHTS = {
        historicalAbsenceRate: 0.35, // الأهم
        dayOfWeekRisk: 0.20,
        recentTrend: 0.20,
        leaveBalanceRisk: 0.10,
        monthlyRisk: 0.10,
        tenureRisk: 0.05,
    };

    /**
     * 📊 توليد شرح شامل للتوقع
     */
    async explainPrediction(
        employeeName: string,
        absenceLikelihood: number,
        riskLevel: RiskLevel,
        contributingFactors: string[],
        departmentComparison?: string,
    ): Promise<PredictionExplanation> {
        try {
            // 1. ترتيب العوامل حسب الأهمية
            const topFactors = this.rankFeaturesByImportance(contributingFactors);

            // 2. توليد ملخص سريع
            const summary = this.generateSummary(employeeName, absenceLikelihood, riskLevel);

            // 3. توليد شرح تفصيلي
            const detailedExplanation = this.generateDetailedExplanation(
                employeeName,
                absenceLikelihood,
                riskLevel,
                topFactors,
                departmentComparison,
            );

            // 4. توليد التوصيات
            const recommendations = this.generateRecommendations(riskLevel, topFactors);

            return {
                summary,
                riskLevel,
                likelihood: absenceLikelihood,
                topFactors,
                detailedExplanation,
                recommendations,
            };
        } catch (error) {
            this.logger.error(`Error explaining prediction for ${employeeName}:`, error);
            throw error;
        }
    }

    /**
     * 📋 ترتيب العوامل حسب الأهمية
     */
    private rankFeaturesByImportance(contributingFactors: string[]): FeatureImportance[] {
        const rankedFeatures: FeatureImportance[] = [];

        for (const factor of contributingFactors) {
            const importance = this.analyzeFeatureImportance(factor);
            rankedFeatures.push(importance);
        }

        // ترتيب حسب الوزن (الأعلى أولاً)
        return rankedFeatures.sort((a, b) => b.weight - a.weight);
    }

    /**
     * 🔍 تحليل أهمية العامل
     */
    private analyzeFeatureImportance(factor: string): FeatureImportance {
        let feature = 'unknown';
        let impact: 'high' | 'medium' | 'low' = 'low';
        let weight = 0;

        // تحديد نوع العامل وأهميته
        if (factor.includes('معدل غياب مرتفع')) {
            feature = 'historicalAbsenceRate';
            impact = 'high';
            weight = this.FEATURE_WEIGHTS.historicalAbsenceRate;
        } else if (factor.includes('يوم عالي المخاطر')) {
            feature = 'dayOfWeekRisk';
            impact = 'medium';
            weight = this.FEATURE_WEIGHTS.dayOfWeekRisk;
        } else if (factor.includes('زيادة في الغيابات الأخيرة')) {
            feature = 'recentTrend';
            impact = 'medium';
            weight = this.FEATURE_WEIGHTS.recentTrend;
        } else if (factor.includes('رصيد إجازات منخفض')) {
            feature = 'leaveBalanceRisk';
            impact = 'medium';
            weight = this.FEATURE_WEIGHTS.leaveBalanceRisk;
        } else if (factor.includes('موظف جديد')) {
            feature = 'tenureRisk';
            impact = 'low';
            weight = this.FEATURE_WEIGHTS.tenureRisk;
        } else if (factor.includes('شهر يشهد غيابات مرتفعة')) {
            feature = 'monthlyRisk';
            impact = 'medium';
            weight = this.FEATURE_WEIGHTS.monthlyRisk;
        } else if (factor.includes('سجل حضور جيد')) {
            feature = 'goodRecord';
            impact = 'low';
            weight = 0;
        }

        return {
            feature,
            impact,
            description: factor,
            weight,
        };
    }

    /**
     * 📝 توليد ملخص سريع
     */
    private generateSummary(
        employeeName: string,
        likelihood: number,
        riskLevel: RiskLevel,
    ): string {
        const riskLevelArabic = this.translateRiskLevel(riskLevel);
        const likelihoodText = likelihood >= 70 ? 'عالية جداً' : likelihood >= 50 ? 'عالية' : likelihood >= 30 ? 'متوسطة' : 'منخفضة';

        return `${employeeName}: احتمالية غياب ${likelihoodText} (${likelihood}%) - مستوى مخاطر ${riskLevelArabic}`;
    }

    /**
     * 📄 توليد شرح تفصيلي
     */
    private generateDetailedExplanation(
        employeeName: string,
        likelihood: number,
        riskLevel: RiskLevel,
        topFactors: FeatureImportance[],
        departmentComparison?: string,
    ): string {
        const riskLevelArabic = this.translateRiskLevel(riskLevel);

        let explanation = `🎯 تحليل توقع الغياب للموظف: ${employeeName}\n\n`;
        explanation += `📊 احتمالية الغياب: ${likelihood}%\n`;
        explanation += `⚠️ مستوى المخاطر: ${riskLevelArabic}\n\n`;

        if (topFactors.length > 0 && topFactors[0].feature !== 'goodRecord') {
            explanation += `🔍 العوامل المساهمة الرئيسية:\n\n`;

            // عرض أهم 3 عوامل فقط
            const topThree = topFactors.slice(0, 3);
            topThree.forEach((factor, index) => {
                const impactEmoji = factor.impact === 'high' ? '🔴' : factor.impact === 'medium' ? '🟡' : '🟢';
                const impactText = factor.impact === 'high' ? 'تأثير عالي' : factor.impact === 'medium' ? 'تأثير متوسط' : 'تأثير منخفض';
                const weightPercent = (factor.weight * 100).toFixed(0);

                explanation += `${index + 1}. ${impactEmoji} ${factor.description}\n`;
                explanation += `   └─ ${impactText} (وزن: ${weightPercent}%)\n\n`;
            });

            // ذكر العوامل الإضافية إن وجدت
            if (topFactors.length > 3) {
                const additionalFactors = topFactors.slice(3);
                explanation += `📌 عوامل إضافية (${additionalFactors.length}): `;
                explanation += additionalFactors.map(f => f.description).join(', ') + '\n\n';
            }
        } else {
            explanation += `✅ الموظف لديه سجل حضور جيد ولا توجد عوامل مخاطرة واضحة.\n\n`;
        }

        // إضافة مقارنة القسم إن وجدت
        if (departmentComparison) {
            explanation += `📊 مقارنة مع القسم: ${departmentComparison}\n\n`;
        }

        // شرح كيفية حساب الاحتمالية
        explanation += `💡 كيفية حساب الاحتمالية:\n`;
        explanation += `يتم حساب احتمالية الغياب باستخدام نموذج إحصائي يأخذ في الاعتبار:\n`;
        explanation += `• معدل الغياب التاريخي للموظف (35% من الدرجة)\n`;
        explanation += `• نمط الغياب حسب يوم الأسبوع (20% من الدرجة)\n`;
        explanation += `• الاتجاه الأخير للغيابات (20% من الدرجة)\n`;
        explanation += `• رصيد الإجازات المتبقي (10% من الدرجة)\n`;
        explanation += `• الأنماط الموسمية والشهرية (10% من الدرجة)\n`;
        explanation += `• مدة خدمة الموظف (5% من الدرجة)\n`;

        return explanation;
    }

    /**
     * 💡 توليد التوصيات
     */
    private generateRecommendations(
        riskLevel: RiskLevel,
        topFactors: FeatureImportance[],
    ): string[] {
        const recommendations: string[] = [];

        // توصيات عامة حسب مستوى المخاطر
        if (riskLevel === RiskLevel.HIGH) {
            recommendations.push('🚨 أولوية عالية: التواصل الفوري مع الموظف لمناقشة الحضور');
            recommendations.push('📞 جدولة اجتماع فردي لفهم الأسباب والتحديات');
        } else if (riskLevel === RiskLevel.MEDIUM) {
            recommendations.push('⚠️ متابعة دورية لنمط حضور الموظف');
            recommendations.push('📋 مراجعة سياسات الحضور والإجازات مع الموظف');
        } else {
            recommendations.push('✅ الاستمرار في المتابعة الروتينية');
        }

        // توصيات مخصصة حسب العوامل
        for (const factor of topFactors) {
            if (factor.feature === 'leaveBalanceRisk' && factor.weight > 0) {
                recommendations.push('📅 مراجعة رصيد الإجازات وتشجيع الموظف على أخذ إجازة مخططة');
            }
            if (factor.feature === 'tenureRisk' && factor.weight > 0) {
                recommendations.push('👋 تحسين برنامج التوجيه للموظفين الجدد');
            }
            if (factor.feature === 'dayOfWeekRisk' && factor.weight > 0) {
                recommendations.push('📊 مراجعة جدول العمل وتوزيع المهام في الأيام عالية المخاطر');
            }
            if (factor.feature === 'historicalAbsenceRate' && factor.impact === 'high') {
                recommendations.push('🔍 تحقيق شامل في أسباب الغياب المتكرر');
                recommendations.push('🤝 تقديم الدعم والموارد اللازمة للموظف');
            }
            if (factor.feature === 'recentTrend' && factor.weight > 0) {
                recommendations.push('📈 مراقبة الاتجاه المتزايد للغيابات واتخاذ إجراء وقائي');
            }
        }

        // إزالة التكرارات
        return Array.from(new Set(recommendations));
    }

    /**
     * 🌐 ترجمة مستوى المخاطر للعربية
     */
    private translateRiskLevel(riskLevel: RiskLevel): string {
        const translations = {
            [RiskLevel.LOW]: 'منخفض',
            [RiskLevel.MEDIUM]: 'متوسط',
            [RiskLevel.HIGH]: 'عالي',
        };
        return translations[riskLevel] || 'غير محدد';
    }

    /**
     * 📊 توليد شرح مبسط للتوقعات الجماعية
     */
    async explainBatchPredictions(
        predictions: Array<{
            employeeName: string;
            absenceLikelihood: number;
            riskLevel: RiskLevel;
        }>,
    ): Promise<{
        overview: string;
        highRiskCount: number;
        mediumRiskCount: number;
        lowRiskCount: number;
        insights: string[];
    }> {
        const highRiskCount = predictions.filter(p => p.riskLevel === RiskLevel.HIGH).length;
        const mediumRiskCount = predictions.filter(p => p.riskLevel === RiskLevel.MEDIUM).length;
        const lowRiskCount = predictions.filter(p => p.riskLevel === RiskLevel.LOW).length;

        const avgLikelihood = predictions.reduce((sum, p) => sum + p.absenceLikelihood, 0) / predictions.length;

        const overview = `تم تحليل ${predictions.length} موظف: ${highRiskCount} عالي المخاطر، ${mediumRiskCount} متوسط، ${lowRiskCount} منخفض. متوسط احتمالية الغياب: ${avgLikelihood.toFixed(1)}%`;

        const insights: string[] = [];

        if (highRiskCount > 0) {
            const percentage = ((highRiskCount / predictions.length) * 100).toFixed(1);
            insights.push(`⚠️ ${percentage}% من الموظفين في فئة المخاطر العالية - يتطلب اهتمام فوري`);
        }

        if (avgLikelihood > 50) {
            insights.push('📊 متوسط احتمالية الغياب مرتفع - يُنصح بمراجعة سياسات الحضور');
        }

        if (mediumRiskCount > highRiskCount * 2) {
            insights.push('📈 عدد كبير من الموظفين في فئة المخاطر المتوسطة - فرصة للتدخل الوقائي');
        }

        if (insights.length === 0) {
            insights.push('✅ معدلات الحضور المتوقعة ضمن المعدلات الطبيعية');
        }

        return {
            overview,
            highRiskCount,
            mediumRiskCount,
            lowRiskCount,
            insights,
        };
    }
}
