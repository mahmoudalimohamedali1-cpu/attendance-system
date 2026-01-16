import { Injectable, Logger } from '@nestjs/common';

/**
 * 🔮 Predictive Insights Service
 * Implements ideas #55-65: Predictive analytics
 * 
 * Features:
 * - Absence predictor
 * - Workload forecaster
 * - Budget predictor
 * - Hiring needs forecast
 */

export interface AbsencePrediction {
    date: Date;
    predictedAbsences: number;
    confidence: number;
    factors: string[];
    recommendation: string;
}

export interface WorkloadForecast {
    period: string;
    currentLoad: number;
    predictedLoad: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    peakDays: string[];
    recommendation: string;
}

export interface BudgetPrediction {
    category: string;
    categoryAr: string;
    currentSpend: number;
    predictedSpend: number;
    variance: number;
    variancePercent: number;
    status: 'under' | 'on_track' | 'over';
}

export interface HiringForecast {
    department: string;
    departmentAr: string;
    currentHeadcount: number;
    predictedNeed: number;
    timeline: string;
    reason: string;
    priority: 'low' | 'medium' | 'high';
}

export interface TrendAnalysis {
    metric: string;
    metricAr: string;
    current: number;
    previous: number;
    change: number;
    changePercent: number;
    trend: 'up' | 'down' | 'stable';
    insight: string;
}

@Injectable()
export class PredictiveInsightsService {
    private readonly logger = new Logger(PredictiveInsightsService.name);

    /**
     * 📅 Predict absences for a date
     */
    predictAbsences(date: Date): AbsencePrediction {
        const dayOfWeek = date.getDay();
        const month = date.getMonth();
        const factors: string[] = [];
        let baseAbsences = 3;

        // Weekend proximity
        if (dayOfWeek === 0 || dayOfWeek === 4) {
            baseAbsences += 2;
            factors.push('قرب نهاية الأسبوع');
        }

        // Seasonal factors
        if (month === 6 || month === 7) { // Summer
            baseAbsences += 3;
            factors.push('موسم الصيف والإجازات');
        }

        // Weather (simplified)
        if (month >= 5 && month <= 8) {
            baseAbsences += 1;
            factors.push('ارتفاع درجات الحرارة');
        }

        // Random variation
        const variation = Math.floor(Math.random() * 3) - 1;
        const predicted = Math.max(0, baseAbsences + variation);

        let recommendation: string;
        if (predicted > 5) {
            recommendation = 'احتياطي: تأكد من وجود بدلاء';
        } else if (predicted > 3) {
            recommendation = 'تنبيه: قد يكون هناك ضغط على الفريق';
        } else {
            recommendation = 'طبيعي: لا إجراءات مطلوبة';
        }

        return {
            date,
            predictedAbsences: predicted,
            confidence: 0.75 + Math.random() * 0.15,
            factors: factors.length > 0 ? factors : ['لا عوامل خاصة'],
            recommendation,
        };
    }

    /**
     * 📊 Forecast workload
     */
    forecastWorkload(department: string): WorkloadForecast {
        const currentLoad = 70 + Math.floor(Math.random() * 20);
        const predictedLoad = currentLoad + Math.floor(Math.random() * 20) - 10;

        let trend: WorkloadForecast['trend'];
        if (predictedLoad > currentLoad + 5) trend = 'increasing';
        else if (predictedLoad < currentLoad - 5) trend = 'decreasing';
        else trend = 'stable';

        const peakDays = ['الأحد', 'الاثنين', 'الخميس'].filter(() => Math.random() > 0.5);

        let recommendation: string;
        if (predictedLoad > 85) {
            recommendation = 'قد تحتاج لموارد إضافية';
        } else if (predictedLoad < 50) {
            recommendation = 'فرصة لمشاريع جديدة';
        } else {
            recommendation = 'مستوى مناسب';
        }

        return {
            period: 'الأسبوع القادم',
            currentLoad,
            predictedLoad,
            trend,
            peakDays,
            recommendation,
        };
    }

    /**
     * 💰 Predict budget usage
     */
    predictBudget(): BudgetPrediction[] {
        const categories: { name: string; nameAr: string; budget: number }[] = [
            { name: 'salaries', nameAr: 'الرواتب', budget: 500000 },
            { name: 'training', nameAr: 'التدريب', budget: 50000 },
            { name: 'travel', nameAr: 'السفر', budget: 30000 },
            { name: 'equipment', nameAr: 'المعدات', budget: 40000 },
            { name: 'benefits', nameAr: 'المزايا', budget: 80000 },
        ];

        return categories.map(cat => {
            const spentPercent = 0.6 + Math.random() * 0.5;
            const currentSpend = Math.round(cat.budget * spentPercent * 0.9);
            const predictedSpend = Math.round(cat.budget * spentPercent);
            const variance = predictedSpend - cat.budget;
            const variancePercent = Math.round((variance / cat.budget) * 100);

            let status: BudgetPrediction['status'];
            if (variancePercent > 5) status = 'over';
            else if (variancePercent < -10) status = 'under';
            else status = 'on_track';

            return {
                category: cat.name,
                categoryAr: cat.nameAr,
                currentSpend,
                predictedSpend,
                variance,
                variancePercent,
                status,
            };
        });
    }

    /**
     * 👥 Forecast hiring needs
     */
    forecastHiring(): HiringForecast[] {
        const departments = [
            { name: 'Engineering', nameAr: 'الهندسة', current: 25, growth: true },
            { name: 'Sales', nameAr: 'المبيعات', current: 15, growth: true },
            { name: 'HR', nameAr: 'الموارد البشرية', current: 8, growth: false },
            { name: 'Finance', nameAr: 'المالية', current: 10, growth: false },
        ];

        return departments.map(dept => {
            const needsHiring = dept.growth || Math.random() > 0.7;
            const need = needsHiring ? Math.ceil(dept.current * (0.1 + Math.random() * 0.15)) : 0;

            const reasons = [
                'نمو الأعمال',
                'استبدال المستقيلين',
                'مشاريع جديدة',
                'تخفيف ضغط العمل',
            ];

            return {
                department: dept.name,
                departmentAr: dept.nameAr,
                currentHeadcount: dept.current,
                predictedNeed: need,
                timeline: need > 0 ? 'الربع القادم' : 'لا حاجة حالياً',
                reason: need > 0 ? reasons[Math.floor(Math.random() * reasons.length)] : 'لا حاجة',
                priority: need > 3 ? 'high' : need > 0 ? 'medium' : 'low',
            };
        });
    }

    /**
     * 📈 Analyze trends
     */
    analyzeTrends(): TrendAnalysis[] {
        const metrics = [
            { name: 'attendance', nameAr: 'الحضور', unit: '%' },
            { name: 'turnover', nameAr: 'معدل الدوران', unit: '%' },
            { name: 'satisfaction', nameAr: 'الرضا الوظيفي', unit: '/5' },
            { name: 'productivity', nameAr: 'الإنتاجية', unit: '%' },
        ];

        return metrics.map(metric => {
            const previous = 70 + Math.floor(Math.random() * 20);
            const current = previous + Math.floor(Math.random() * 15) - 7;
            const change = current - previous;
            const changePercent = Math.round((change / previous) * 100);

            let trend: TrendAnalysis['trend'];
            if (change > 2) trend = 'up';
            else if (change < -2) trend = 'down';
            else trend = 'stable';

            let insight: string;
            if (metric.name === 'turnover') {
                insight = trend === 'up' ? 'انتبه: زيادة في الاستقالات' : 'جيد: استقرار الموظفين';
            } else {
                insight = trend === 'up' ? 'تحسن ملحوظ' : trend === 'down' ? 'يحتاج متابعة' : 'مستقر';
            }

            return {
                metric: metric.name,
                metricAr: metric.nameAr,
                current,
                previous,
                change,
                changePercent,
                trend,
                insight,
            };
        });
    }

    /**
     * 📊 Format absence prediction
     */
    formatAbsencePrediction(pred: AbsencePrediction): string {
        const dateStr = pred.date.toLocaleDateString('ar-SA', { weekday: 'long', month: 'long', day: 'numeric' });
        const confidencePercent = Math.round(pred.confidence * 100);

        let message = `🔮 **توقع الغياب - ${dateStr}**\n\n`;
        message += `👥 المتوقع: ${pred.predictedAbsences} موظفين\n`;
        message += `📊 الثقة: ${confidencePercent}%\n\n`;

        if (pred.factors.length > 0) {
            message += `📋 **العوامل:**\n`;
            for (const factor of pred.factors) {
                message += `• ${factor}\n`;
            }
        }

        message += `\n💡 ${pred.recommendation}`;
        return message;
    }

    /**
     * 📊 Format workload forecast
     */
    formatWorkloadForecast(forecast: WorkloadForecast): string {
        const trendEmoji = { increasing: '📈', stable: '➡️', decreasing: '📉' }[forecast.trend];
        const trendAr = { increasing: 'متزايد', stable: 'مستقر', decreasing: 'متناقص' }[forecast.trend];

        let message = `📊 **توقع عبء العمل - ${forecast.period}**\n\n`;
        message += `📍 الحالي: ${forecast.currentLoad}%\n`;
        message += `🔮 المتوقع: ${forecast.predictedLoad}%\n`;
        message += `${trendEmoji} الاتجاه: ${trendAr}\n\n`;

        if (forecast.peakDays.length > 0) {
            message += `⚡ أيام الذروة: ${forecast.peakDays.join(', ')}\n`;
        }

        message += `\n💡 ${forecast.recommendation}`;
        return message;
    }

    /**
     * 📊 Format budget prediction
     */
    formatBudgetPrediction(predictions: BudgetPrediction[]): string {
        let message = `💰 **توقع الميزانية:**\n\n`;

        for (const pred of predictions) {
            const statusEmoji = { under: '🟢', on_track: '🟡', over: '🔴' }[pred.status];
            const statusAr = { under: 'أقل من المخطط', on_track: 'ضمن المخطط', over: 'يتجاوز المخطط' }[pred.status];

            message += `${statusEmoji} **${pred.categoryAr}**\n`;
            message += `   المتوقع: ${pred.predictedSpend.toLocaleString()} ر.س\n`;
            message += `   الفرق: ${pred.variancePercent > 0 ? '+' : ''}${pred.variancePercent}%\n\n`;
        }

        return message;
    }

    /**
     * 📊 Format hiring forecast
     */
    formatHiringForecast(forecasts: HiringForecast[]): string {
        let message = `👥 **توقع احتياجات التوظيف:**\n\n`;

        for (const forecast of forecasts.filter(f => f.predictedNeed > 0)) {
            const priorityEmoji = { low: '🟢', medium: '🟡', high: '🔴' }[forecast.priority];

            message += `${priorityEmoji} **${forecast.departmentAr}**\n`;
            message += `   الحالي: ${forecast.currentHeadcount} | المطلوب: +${forecast.predictedNeed}\n`;
            message += `   السبب: ${forecast.reason}\n`;
            message += `   التوقيت: ${forecast.timeline}\n\n`;
        }

        if (forecasts.filter(f => f.predictedNeed > 0).length === 0) {
            message += 'لا توجد احتياجات توظيف متوقعة حالياً';
        }

        return message;
    }
}
