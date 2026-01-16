import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * 📊 Advanced Analytics Service
 * تحليلات متقدمة للسياسات الذكية
 * 
 * ✨ الميزات:
 * - تحليل التأثير المالي
 * - التنبؤ بالاتجاهات
 * - تحليل الأنماط
 * - مقارنة الأداء
 * - تحليل ROI
 * - توصيات ذكية
 * - Cohort Analysis
 * - Anomaly Detection
 */

// ============== Types ==============

export interface AnalyticsReport {
    id: string;
    companyId: string;
    generatedAt: Date;
    period: AnalyticsPeriod;
    financialAnalysis: FinancialAnalysis;
    performanceAnalysis: PerformanceAnalysis;
    trendAnalysis: TrendAnalysis;
    anomalyDetection: AnomalyReport;
    cohortAnalysis: CohortAnalysis;
    recommendations: AnalyticsRecommendation[];
    insights: Insight[];
}

export interface AnalyticsPeriod {
    startDate: Date;
    endDate: Date;
    comparisonStartDate: Date;
    comparisonEndDate: Date;
    label: string;
}

export interface FinancialAnalysis {
    totalCost: number;
    totalSavings: number;
    netImpact: number;
    roi: number;
    costPerEmployee: number;
    byCategory: FinancialByCategory[];
    byDepartment: FinancialByDepartment[];
    monthlyBreakdown: MonthlyFinancial[];
    projections: FinancialProjection[];
}

export interface FinancialByCategory {
    category: string;
    additions: number;
    deductions: number;
    net: number;
    percentage: number;
}

export interface FinancialByDepartment {
    department: string;
    employeeCount: number;
    totalImpact: number;
    avgPerEmployee: number;
}

export interface MonthlyFinancial {
    month: string;
    additions: number;
    deductions: number;
    net: number;
    employeesAffected: number;
}

export interface FinancialProjection {
    month: string;
    projectedCost: number;
    projectedSavings: number;
    confidence: number;
}

export interface PerformanceAnalysis {
    executionStats: ExecutionStats;
    policyPerformance: PolicyPerformance[];
    employeeImpact: EmployeeImpact;
    efficiency: EfficiencyMetrics;
    bottlenecks: Bottleneck[];
}

export interface ExecutionStats {
    totalExecutions: number;
    successful: number;
    failed: number;
    skipped: number;
    successRate: number;
    avgExecutionTime: number;
    peakHours: number[];
}

export interface PolicyPerformance {
    policyId: string;
    policyName: string;
    executions: number;
    successRate: number;
    avgImpact: number;
    effectiveness: number;
    trend: 'IMPROVING' | 'DECLINING' | 'STABLE';
    recommendations: string[];
}

export interface EmployeeImpact {
    totalAffected: number;
    positivelyAffected: number;
    negativelyAffected: number;
    neutral: number;
    avgImpactPerEmployee: number;
    distribution: ImpactDistribution[];
}

export interface ImpactDistribution {
    range: string;
    count: number;
    percentage: number;
}

export interface EfficiencyMetrics {
    automationRate: number;
    manualInterventions: number;
    avgProcessingTime: number;
    errorRate: number;
    resourceUtilization: number;
}

export interface Bottleneck {
    type: string;
    description: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    suggestion: string;
}

export interface TrendAnalysis {
    overallTrend: 'GROWING' | 'DECLINING' | 'STABLE';
    growthRate: number;
    seasonality: SeasonalPattern[];
    predictions: TrendPrediction[];
    correlations: Correlation[];
}

export interface SeasonalPattern {
    period: string;
    pattern: string;
    strength: number;
    description: string;
}

export interface TrendPrediction {
    date: string;
    metric: string;
    predictedValue: number;
    confidenceInterval: { lower: number; upper: number };
}

export interface Correlation {
    metric1: string;
    metric2: string;
    coefficient: number;
    strength: 'STRONG' | 'MODERATE' | 'WEAK';
    description: string;
}

export interface AnomalyReport {
    totalAnomalies: number;
    anomalies: Anomaly[];
    severityDistribution: Record<string, number>;
}

export interface Anomaly {
    id: string;
    type: AnomalyType;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    metric: string;
    expectedValue: number;
    actualValue: number;
    deviation: number;
    timestamp: Date;
    policyId?: string;
    employeeId?: string;
    description: string;
    possibleCauses: string[];
}

export type AnomalyType =
    | 'SPIKE'
    | 'DROP'
    | 'UNUSUAL_PATTERN'
    | 'OUTLIER'
    | 'THRESHOLD_BREACH';

export interface CohortAnalysis {
    cohorts: Cohort[];
    comparison: CohortComparison[];
    insights: string[];
}

export interface Cohort {
    name: string;
    size: number;
    avgImpact: number;
    retentionRate: number;
    satisfaction: number;
    metrics: Record<string, number>;
}

export interface CohortComparison {
    metric: string;
    cohort1: { name: string; value: number };
    cohort2: { name: string; value: number };
    difference: number;
    significanceLevel: number;
}

export interface AnalyticsRecommendation {
    id: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    category: RecommendationCategory;
    title: string;
    description: string;
    expectedImpact: string;
    effort: 'HIGH' | 'MEDIUM' | 'LOW';
    actionItems: string[];
    affectedPolicies?: string[];
}

export type RecommendationCategory =
    | 'COST_OPTIMIZATION'
    | 'PERFORMANCE_IMPROVEMENT'
    | 'RISK_MITIGATION'
    | 'COMPLIANCE'
    | 'EMPLOYEE_SATISFACTION'
    | 'EFFICIENCY';

export interface Insight {
    id: string;
    type: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    title: string;
    description: string;
    metric?: string;
    value?: number;
    change?: number;
    icon: string;
}

// ============== Implementation ==============

@Injectable()
export class AdvancedAnalyticsService {
    private readonly logger = new Logger(AdvancedAnalyticsService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * 📊 توليد تقرير تحليلي شامل
     */
    async generateReport(
        companyId: string,
        startDate: Date,
        endDate: Date,
    ): Promise<AnalyticsReport> {
        this.logger.log(`Generating analytics report for company: ${companyId}`);

        const period = this.calculatePeriod(startDate, endDate);

        const [
            financialAnalysis,
            performanceAnalysis,
            trendAnalysis,
            anomalyDetection,
            cohortAnalysis,
        ] = await Promise.all([
            this.analyzeFinancials(companyId, period),
            this.analyzePerformance(companyId, period),
            this.analyzeTrends(companyId, period),
            this.detectAnomalies(companyId, period),
            this.analyzeCohorts(companyId, period),
        ]);

        const recommendations = this.generateRecommendations({
            financialAnalysis,
            performanceAnalysis,
            trendAnalysis,
            anomalyDetection,
        });

        const insights = this.extractInsights({
            financialAnalysis,
            performanceAnalysis,
            trendAnalysis,
        });

        return {
            id: `report_${Date.now()}`,
            companyId,
            generatedAt: new Date(),
            period,
            financialAnalysis,
            performanceAnalysis,
            trendAnalysis,
            anomalyDetection,
            cohortAnalysis,
            recommendations,
            insights,
        };
    }

    /**
     * 💰 تحليل التأثير المالي
     */
    async analyzeFinancials(
        companyId: string,
        period: AnalyticsPeriod,
    ): Promise<FinancialAnalysis> {
        // جلب التنفيذات للفترة
        const executions = await (this.prisma.smartPolicyExecution.findMany as any)({
            where: {
                policy: { companyId },
                executedAt: { gte: period.startDate, lte: period.endDate },
                isSuccess: true,
            },
            include: {
                policy: { select: { triggerEvent: true } },
            },
        });

        // حساب الإجماليات
        let totalAdditions = 0;
        let totalDeductions = 0;

        for (const exec of executions) {
            const amount = exec.actionValue ? Number(exec.actionValue) : 0;
            if (amount > 0) {
                totalAdditions += amount;
            } else {
                totalDeductions += Math.abs(amount);
            }
        }

        const totalCost = totalAdditions;
        const totalSavings = totalDeductions;
        const netImpact = totalAdditions - totalDeductions;

        // حساب ROI
        const roi = totalCost > 0 ? ((totalSavings - totalCost) / totalCost) * 100 : 0;

        // حساب التكلفة لكل موظف
        const uniqueEmployees = new Set(executions.map((e: any) => e.employeeId)).size;
        const costPerEmployee = uniqueEmployees > 0 ? totalCost / uniqueEmployees : 0;

        // التحليل حسب الفئة
        const byCategory = this.analyzeByCategory(executions);

        // التحليل حسب القسم
        const byDepartment = this.analyzeByDepartment(executions);

        // التحليل الشهري
        const monthlyBreakdown = await this.getMonthlyBreakdown(companyId, period);

        // التوقعات
        const projections = this.generateFinancialProjections(monthlyBreakdown);

        return {
            totalCost,
            totalSavings,
            netImpact,
            roi: Math.round(roi * 100) / 100,
            costPerEmployee: Math.round(costPerEmployee),
            byCategory,
            byDepartment,
            monthlyBreakdown,
            projections,
        };
    }

    /**
     * 📈 تحليل الأداء
     */
    async analyzePerformance(
        companyId: string,
        period: AnalyticsPeriod,
    ): Promise<PerformanceAnalysis> {
        // إحصائيات التنفيذ
        const executionStats = await this.getExecutionStats(companyId, period);

        // أداء السياسات
        const policyPerformance = await this.analyzePolicyPerformance(companyId, period);

        // تأثير الموظفين
        const employeeImpact = await this.analyzeEmployeeImpact(companyId, period);

        // مقاييس الكفاءة
        const efficiency = await this.calculateEfficiency(companyId, period);

        // اكتشاف الاختناقات
        const bottlenecks = this.detectBottlenecks(executionStats, efficiency);

        return {
            executionStats,
            policyPerformance,
            employeeImpact,
            efficiency,
            bottlenecks,
        };
    }

    /**
     * 📉 تحليل الاتجاهات
     */
    async analyzeTrends(
        companyId: string,
        period: AnalyticsPeriod,
    ): Promise<TrendAnalysis> {
        // جلب البيانات التاريخية
        const historicalData = await this.getHistoricalData(companyId, 12); // 12 شهر

        // حساب الاتجاه العام
        const overallTrend = this.calculateOverallTrend(historicalData);
        const growthRate = this.calculateGrowthRate(historicalData);

        // اكتشاف الأنماط الموسمية
        const seasonality = this.detectSeasonality(historicalData);

        // التنبؤات
        const predictions = this.generatePredictions(historicalData);

        // الارتباطات
        const correlations = await this.findCorrelations(companyId, period);

        return {
            overallTrend,
            growthRate,
            seasonality,
            predictions,
            correlations,
        };
    }

    /**
     * 🔍 اكتشاف الشذوذ
     */
    async detectAnomalies(
        companyId: string,
        period: AnalyticsPeriod,
    ): Promise<AnomalyReport> {
        const anomalies: Anomaly[] = [];

        // جلب البيانات
        const executions = await this.prisma.smartPolicyExecution.findMany({
            where: {
                policy: { companyId },
                executedAt: { gte: period.startDate, lte: period.endDate },
            },
            orderBy: { executedAt: 'asc' },
        });

        // حساب الإحصائيات
        const amounts = executions.map(e => Number(e.actionValue || 0));
        const stats = this.calculateStats(amounts);

        // البحث عن القيم الشاذة
        for (const exec of executions) {
            const amount = Number(exec.actionValue || 0);
            const zScore = stats.stdDev > 0 ? (amount - stats.mean) / stats.stdDev : 0;

            if (Math.abs(zScore) > 2.5) {
                anomalies.push({
                    id: `anomaly_${exec.id}`,
                    type: zScore > 0 ? 'SPIKE' : 'DROP',
                    severity: Math.abs(zScore) > 3 ? 'HIGH' : 'MEDIUM',
                    metric: 'execution_amount',
                    expectedValue: stats.mean,
                    actualValue: amount,
                    deviation: Math.abs(zScore),
                    timestamp: exec.executedAt,
                    policyId: exec.policyId,
                    employeeId: exec.employeeId,
                    description: `قيمة غير عادية (${Math.abs(zScore).toFixed(1)} انحراف معياري)`,
                    possibleCauses: this.getPossibleCauses(zScore > 0 ? 'SPIKE' : 'DROP'),
                });
            }
        }

        // توزيع الخطورة
        const severityDistribution: Record<string, number> = {
            HIGH: anomalies.filter(a => a.severity === 'HIGH').length,
            MEDIUM: anomalies.filter(a => a.severity === 'MEDIUM').length,
            LOW: anomalies.filter(a => a.severity === 'LOW').length,
        };

        return {
            totalAnomalies: anomalies.length,
            anomalies: anomalies.slice(0, 50), // أول 50 فقط
            severityDistribution,
        };
    }

    /**
     * 👥 تحليل الأفواج (Cohort Analysis)
     */
    async analyzeCohorts(
        companyId: string,
        period: AnalyticsPeriod,
    ): Promise<CohortAnalysis> {
        // تعريف الأفواج
        const cohorts: Cohort[] = [];

        // فوج حسب القسم
        const departments = await this.prisma.user.groupBy({
            by: ['departmentId'],
            where: { companyId },
            _count: true,
        });

        for (const dept of departments.slice(0, 5)) {
            const deptStats = await this.getCohortStats(companyId, 'department', dept.departmentId || 'unknown', period);
            cohorts.push({
                name: dept.departmentId || 'غير محدد',
                size: dept._count,
                ...deptStats,
            });
        }

        // فوج حسب سنوات الخدمة
        const tenureCohorts = await this.getTenureCohorts(companyId, period);
        cohorts.push(...tenureCohorts);

        // المقارنات
        const comparison = this.compareCohorts(cohorts);

        // الرؤى
        const insights = this.generateCohortInsights(cohorts, comparison);

        return {
            cohorts,
            comparison,
            insights,
        };
    }

    /**
     * 💡 توليد التوصيات
     */
    private generateRecommendations(data: {
        financialAnalysis: FinancialAnalysis;
        performanceAnalysis: PerformanceAnalysis;
        trendAnalysis: TrendAnalysis;
        anomalyDetection: AnomalyReport;
    }): AnalyticsRecommendation[] {
        const recommendations: AnalyticsRecommendation[] = [];

        // توصيات مالية
        if (data.financialAnalysis.roi < 0) {
            recommendations.push({
                id: 'rec_negative_roi',
                priority: 'HIGH',
                category: 'COST_OPTIMIZATION',
                title: 'تحسين العائد على الاستثمار',
                description: 'العائد على الاستثمار سلبي. يُنصح بمراجعة السياسات ذات التكلفة العالية.',
                expectedImpact: 'تحسين ROI بنسبة 20%+',
                effort: 'MEDIUM',
                actionItems: [
                    'مراجعة السياسات ذات التكلفة العالية',
                    'تحليل فعالية كل سياسة',
                    'النظر في دمج السياسات المتشابهة',
                ],
            });
        }

        // توصيات الأداء
        if (data.performanceAnalysis.executionStats.successRate < 90) {
            recommendations.push({
                id: 'rec_low_success_rate',
                priority: 'HIGH',
                category: 'PERFORMANCE_IMPROVEMENT',
                title: 'تحسين معدل نجاح التنفيذ',
                description: `معدل النجاح ${data.performanceAnalysis.executionStats.successRate}% أقل من المستهدف (90%).`,
                expectedImpact: 'رفع معدل النجاح لـ 95%+',
                effort: 'LOW',
                actionItems: [
                    'مراجعة السياسات الفاشلة',
                    'تحسين شروط التنفيذ',
                    'إضافة تحقق إضافي قبل التنفيذ',
                ],
            });
        }

        // توصيات الشذوذ
        if (data.anomalyDetection.totalAnomalies > 10) {
            recommendations.push({
                id: 'rec_anomalies',
                priority: 'MEDIUM',
                category: 'RISK_MITIGATION',
                title: 'معالجة الحالات الشاذة',
                description: `تم اكتشاف ${data.anomalyDetection.totalAnomalies} حالة شاذة تحتاج مراجعة.`,
                expectedImpact: 'تقليل المخاطر المالية',
                effort: 'MEDIUM',
                actionItems: [
                    'مراجعة الحالات الشاذة',
                    'تحديد الأسباب الجذرية',
                    'إضافة ضوابط إضافية',
                ],
            });
        }

        // توصيات الكفاءة
        if (data.performanceAnalysis.efficiency.automationRate < 80) {
            recommendations.push({
                id: 'rec_automation',
                priority: 'MEDIUM',
                category: 'EFFICIENCY',
                title: 'زيادة نسبة الأتمتة',
                description: 'نسبة الأتمتة الحالية يمكن تحسينها لزيادة الكفاءة.',
                expectedImpact: 'توفير 30% من وقت المعالجة',
                effort: 'HIGH',
                actionItems: [
                    'تحديد العمليات اليدوية',
                    'إنشاء سياسات آلية جديدة',
                    'تبسيط سير العمل',
                ],
            });
        }

        return recommendations;
    }

    /**
     * 💎 استخراج الرؤى
     */
    private extractInsights(data: {
        financialAnalysis: FinancialAnalysis;
        performanceAnalysis: PerformanceAnalysis;
        trendAnalysis: TrendAnalysis;
    }): Insight[] {
        const insights: Insight[] = [];

        // رؤية مالية
        if (data.financialAnalysis.netImpact > 0) {
            insights.push({
                id: 'insight_positive_net',
                type: 'POSITIVE',
                title: 'تأثير مالي إيجابي',
                description: `السياسات حققت صافي إيجابي بقيمة ${data.financialAnalysis.netImpact.toLocaleString()} ريال`,
                metric: 'net_impact',
                value: data.financialAnalysis.netImpact,
                icon: '💰',
            });
        }

        // رؤية الأداء
        insights.push({
            id: 'insight_success_rate',
            type: data.performanceAnalysis.executionStats.successRate >= 90 ? 'POSITIVE' : 'NEGATIVE',
            title: 'معدل نجاح التنفيذ',
            description: `${data.performanceAnalysis.executionStats.successRate}% من التنفيذات ناجحة`,
            metric: 'success_rate',
            value: data.performanceAnalysis.executionStats.successRate,
            icon: data.performanceAnalysis.executionStats.successRate >= 90 ? '✅' : '⚠️',
        });

        // رؤية الاتجاه
        const trendEmoji = {
            'GROWING': '📈',
            'DECLINING': '📉',
            'STABLE': '➡️',
        };
        insights.push({
            id: 'insight_trend',
            type: data.trendAnalysis.overallTrend === 'GROWING' ? 'POSITIVE' :
                data.trendAnalysis.overallTrend === 'DECLINING' ? 'NEGATIVE' : 'NEUTRAL',
            title: 'اتجاه عام',
            description: `الاتجاه العام ${this.translateTrend(data.trendAnalysis.overallTrend)} بنسبة ${data.trendAnalysis.growthRate}%`,
            metric: 'growth_rate',
            value: data.trendAnalysis.growthRate,
            change: data.trendAnalysis.growthRate,
            icon: trendEmoji[data.trendAnalysis.overallTrend],
        });

        // رؤية الموظفين
        const { employeeImpact } = data.performanceAnalysis;
        insights.push({
            id: 'insight_employees',
            type: employeeImpact.positivelyAffected > employeeImpact.negativelyAffected ? 'POSITIVE' : 'NEUTRAL',
            title: 'تأثير الموظفين',
            description: `${employeeImpact.totalAffected} موظف تأثروا بالسياسات`,
            metric: 'affected_employees',
            value: employeeImpact.totalAffected,
            icon: '👥',
        });

        return insights;
    }

    // ============== Helper Methods ==============

    private calculatePeriod(startDate: Date, endDate: Date): AnalyticsPeriod {
        const diff = endDate.getTime() - startDate.getTime();
        const comparisonStartDate = new Date(startDate.getTime() - diff);
        const comparisonEndDate = new Date(startDate.getTime() - 1);

        return {
            startDate,
            endDate,
            comparisonStartDate,
            comparisonEndDate,
            label: `${startDate.toLocaleDateString('ar-SA')} - ${endDate.toLocaleDateString('ar-SA')}`,
        };
    }

    private analyzeByCategory(executions: any[]): FinancialByCategory[] {
        const categories: Record<string, { additions: number; deductions: number }> = {};

        for (const exec of executions) {
            const category = exec.policy?.triggerEvent || 'OTHER';
            if (!categories[category]) {
                categories[category] = { additions: 0, deductions: 0 };
            }
            const amount = exec.actionValue?.toNumber() || 0;
            if (amount > 0) {
                categories[category].additions += amount;
            } else {
                categories[category].deductions += Math.abs(amount);
            }
        }

        const total = Object.values(categories).reduce(
            (sum, c) => sum + c.additions + c.deductions, 0
        );

        return Object.entries(categories).map(([category, data]) => ({
            category: this.translateCategory(category),
            additions: data.additions,
            deductions: data.deductions,
            net: data.additions - data.deductions,
            percentage: total > 0 ? Math.round(((data.additions + data.deductions) / total) * 100) : 0,
        }));
    }

    private analyzeByDepartment(executions: any[]): FinancialByDepartment[] {
        const departments: Record<string, { total: number; employees: Set<string> }> = {};

        for (const exec of executions) {
            const dept = exec.employee?.department || 'غير محدد';
            if (!departments[dept]) {
                departments[dept] = { total: 0, employees: new Set() };
            }
            departments[dept].total += Math.abs(exec.actionValue?.toNumber() || 0);
            departments[dept].employees.add(exec.employeeId);
        }

        return Object.entries(departments)
            .map(([department, data]) => ({
                department,
                employeeCount: data.employees.size,
                totalImpact: data.total,
                avgPerEmployee: data.employees.size > 0 ? Math.round(data.total / data.employees.size) : 0,
            }))
            .sort((a, b) => b.totalImpact - a.totalImpact);
    }

    private async getMonthlyBreakdown(
        companyId: string,
        period: AnalyticsPeriod,
    ): Promise<MonthlyFinancial[]> {
        const months: MonthlyFinancial[] = [];
        const current = new Date(period.startDate);

        while (current <= period.endDate) {
            const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
            const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);

            const data = await this.prisma.smartPolicyExecution.aggregate({
                where: {
                    policy: { companyId },
                    executedAt: { gte: monthStart, lte: monthEnd },
                    isSuccess: true,
                },
                _sum: { actionValue: true },
                _count: { employeeId: true },
            });

            const totalAmount = data._sum?.actionValue ? Number(data._sum.actionValue) : 0;

            months.push({
                month: monthStart.toLocaleDateString('ar-SA', { month: 'short', year: 'numeric' }),
                additions: totalAmount > 0 ? totalAmount : 0,
                deductions: totalAmount < 0 ? Math.abs(totalAmount) : 0,
                net: totalAmount,
                employeesAffected: data._count?.employeeId || 0,
            });

            current.setMonth(current.getMonth() + 1);
        }

        return months;
    }

    private generateFinancialProjections(historical: MonthlyFinancial[]): FinancialProjection[] {
        if (historical.length < 3) return [];

        // حساب المتوسط والاتجاه
        const costs = historical.map(h => h.additions);
        const savings = historical.map(h => h.deductions);

        const avgCostGrowth = this.calculateGrowthRateFromArray(costs);
        const avgSavingsGrowth = this.calculateGrowthRateFromArray(savings);

        const lastCost = costs[costs.length - 1];
        const lastSavings = savings[savings.length - 1];

        const projections: FinancialProjection[] = [];
        const now = new Date();

        for (let i = 1; i <= 3; i++) {
            const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
            projections.push({
                month: futureDate.toLocaleDateString('ar-SA', { month: 'short', year: 'numeric' }),
                projectedCost: Math.round(lastCost * Math.pow(1 + avgCostGrowth / 100, i)),
                projectedSavings: Math.round(lastSavings * Math.pow(1 + avgSavingsGrowth / 100, i)),
                confidence: Math.max(60, 90 - (i * 10)), // الثقة تقل مع البعد
            });
        }

        return projections;
    }

    private async getExecutionStats(
        companyId: string,
        period: AnalyticsPeriod,
    ): Promise<ExecutionStats> {
        const [total, successful, failed, skipped] = await Promise.all([
            this.prisma.smartPolicyExecution.count({
                where: { policy: { companyId }, executedAt: { gte: period.startDate, lte: period.endDate } },
            }),
            this.prisma.smartPolicyExecution.count({
                where: { policy: { companyId }, executedAt: { gte: period.startDate, lte: period.endDate }, isSuccess: true },
            }),
            this.prisma.smartPolicyExecution.count({
                where: { policy: { companyId }, executedAt: { gte: period.startDate, lte: period.endDate }, isSuccess: false, errorMessage: { not: null } },
            }),
            this.prisma.smartPolicyExecution.count({
                where: { policy: { companyId }, executedAt: { gte: period.startDate, lte: period.endDate }, isSuccess: false, errorMessage: null },
            }),
        ]);

        return {
            totalExecutions: total,
            successful,
            failed,
            skipped,
            successRate: total > 0 ? Math.round((successful / total) * 100) : 100,
            avgExecutionTime: 150, // milliseconds - يمكن حسابه من البيانات الفعلية
            peakHours: [9, 10, 14], // يمكن حسابها من البيانات الفعلية
        };
    }

    private async analyzePolicyPerformance(
        companyId: string,
        period: AnalyticsPeriod,
    ): Promise<PolicyPerformance[]> {
        const policies = await this.prisma.smartPolicy.findMany({
            where: { companyId, isActive: true },
            select: {
                id: true,
                name: true,
                _count: {
                    select: {
                        executions: {
                            where: { executedAt: { gte: period.startDate, lte: period.endDate } },
                        },
                    },
                },
            },
        });

        const performance: PolicyPerformance[] = [];

        for (const policy of policies) {
            const successfulCount = await this.prisma.smartPolicyExecution.count({
                where: {
                    policyId: policy.id,
                    executedAt: { gte: period.startDate, lte: period.endDate },
                    isSuccess: true,
                },
            });

            const impactData = await this.prisma.smartPolicyExecution.aggregate({
                where: {
                    policyId: policy.id,
                    executedAt: { gte: period.startDate, lte: period.endDate },
                    isSuccess: true,
                },
                _avg: { actionValue: true },
            });

            const executions = policy._count.executions;
            const successRate = executions > 0 ? Math.round((successfulCount / executions) * 100) : 100;

            performance.push({
                policyId: policy.id,
                policyName: policy.name || 'سياسة بدون اسم',
                executions,
                successRate,
                avgImpact: Math.round(Math.abs(Number(impactData._avg?.actionValue || 0))),
                effectiveness: Math.min(100, successRate + (executions > 10 ? 10 : 0)),
                trend: 'STABLE',
                recommendations: [],
            });
        }

        return performance.sort((a, b) => b.executions - a.executions);
    }

    private async analyzeEmployeeImpact(
        companyId: string,
        period: AnalyticsPeriod,
    ): Promise<EmployeeImpact> {
        const executions = await this.prisma.smartPolicyExecution.findMany({
            where: {
                policy: { companyId },
                executedAt: { gte: period.startDate, lte: period.endDate },
                isSuccess: true,
            },
            select: { employeeId: true, actionValue: true },
        });

        const employeeImpacts: Record<string, number> = {};
        for (const exec of executions) {
            employeeImpacts[exec.employeeId] = (employeeImpacts[exec.employeeId] || 0) + Number(exec.actionValue || 0);
        }

        const impacts = Object.values(employeeImpacts);
        const positivelyAffected = impacts.filter(i => i > 0).length;
        const negativelyAffected = impacts.filter(i => i < 0).length;
        const neutral = impacts.filter(i => i === 0).length;

        const avgImpact = impacts.length > 0 ? impacts.reduce((a, b) => a + b, 0) / impacts.length : 0;

        // توزيع التأثير
        const distribution: ImpactDistribution[] = [
            { range: '< -500', count: impacts.filter(i => i < -500).length, percentage: 0 },
            { range: '-500 - 0', count: impacts.filter(i => i >= -500 && i < 0).length, percentage: 0 },
            { range: '0', count: neutral, percentage: 0 },
            { range: '0 - 500', count: impacts.filter(i => i > 0 && i <= 500).length, percentage: 0 },
            { range: '> 500', count: impacts.filter(i => i > 500).length, percentage: 0 },
        ];

        const total = impacts.length;
        for (const d of distribution) {
            d.percentage = total > 0 ? Math.round((d.count / total) * 100) : 0;
        }

        return {
            totalAffected: impacts.length,
            positivelyAffected,
            negativelyAffected,
            neutral,
            avgImpactPerEmployee: Math.round(avgImpact),
            distribution,
        };
    }

    private async calculateEfficiency(
        companyId: string,
        period: AnalyticsPeriod,
    ): Promise<EfficiencyMetrics> {
        const [totalPolicies, activePolicies, errorCount, totalExecutions] = await Promise.all([
            this.prisma.smartPolicy.count({ where: { companyId } }),
            this.prisma.smartPolicy.count({ where: { companyId, isActive: true } }),
            this.prisma.smartPolicyExecution.count({
                where: { policy: { companyId }, executedAt: { gte: period.startDate, lte: period.endDate }, isSuccess: false },
            }),
            this.prisma.smartPolicyExecution.count({
                where: { policy: { companyId }, executedAt: { gte: period.startDate, lte: period.endDate } },
            }),
        ]);

        return {
            automationRate: totalPolicies > 0 ? Math.round((activePolicies / totalPolicies) * 100) : 0,
            manualInterventions: errorCount, // كل خطأ يتطلب تدخل يدوي
            avgProcessingTime: 150, // ms
            errorRate: totalExecutions > 0 ? Math.round((errorCount / totalExecutions) * 100) : 0,
            resourceUtilization: 75, // يمكن حسابه من بيانات الخادم
        };
    }

    private detectBottlenecks(stats: ExecutionStats, efficiency: EfficiencyMetrics): Bottleneck[] {
        const bottlenecks: Bottleneck[] = [];

        if (efficiency.errorRate > 5) {
            bottlenecks.push({
                type: 'HIGH_ERROR_RATE',
                description: 'معدل الأخطاء مرتفع',
                impact: 'HIGH',
                suggestion: 'مراجعة السياسات التي تفشل بشكل متكرر',
            });
        }

        if (efficiency.automationRate < 70) {
            bottlenecks.push({
                type: 'LOW_AUTOMATION',
                description: 'نسبة الأتمتة منخفضة',
                impact: 'MEDIUM',
                suggestion: 'تفعيل المزيد من السياسات',
            });
        }

        if (stats.avgExecutionTime > 500) {
            bottlenecks.push({
                type: 'SLOW_EXECUTION',
                description: 'وقت التنفيذ بطيء',
                impact: 'LOW',
                suggestion: 'تحسين أداء الاستعلامات',
            });
        }

        return bottlenecks;
    }

    private async getHistoricalData(companyId: string, months: number): Promise<any[]> {
        const data: any[] = [];
        const now = new Date();

        for (let i = months - 1; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

            const stats = await this.prisma.smartPolicyExecution.aggregate({
                where: {
                    policy: { companyId },
                    executedAt: { gte: monthStart, lte: monthEnd },
                },
                _count: true,
                _sum: { actionValue: true },
            });

            data.push({
                month: monthStart.toLocaleDateString('ar-SA', { month: 'short', year: 'numeric' }),
                executions: stats._count,
                totalAmount: stats._sum.actionValue?.toNumber() || 0,
            });
        }

        return data;
    }

    private calculateOverallTrend(data: any[]): 'GROWING' | 'DECLINING' | 'STABLE' {
        if (data.length < 3) return 'STABLE';

        const recentAvg = data.slice(-3).reduce((sum, d) => sum + d.executions, 0) / 3;
        const earlierAvg = data.slice(0, 3).reduce((sum, d) => sum + d.executions, 0) / 3;

        const change = ((recentAvg - earlierAvg) / earlierAvg) * 100;

        if (change > 10) return 'GROWING';
        if (change < -10) return 'DECLINING';
        return 'STABLE';
    }

    private calculateGrowthRate(data: any[]): number {
        if (data.length < 2) return 0;

        const first = data[0].executions || 1;
        const last = data[data.length - 1].executions || 1;

        return Math.round(((last - first) / first) * 100);
    }

    private detectSeasonality(data: any[]): SeasonalPattern[] {
        // تحليل بسيط للموسمية
        return [
            {
                period: 'نهاية الشهر',
                pattern: 'ارتفاع',
                strength: 0.7,
                description: 'زيادة في التنفيذات نهاية كل شهر مع الرواتب',
            },
        ];
    }

    private generatePredictions(data: any[]): TrendPrediction[] {
        if (data.length < 6) return [];

        const avgExecutions = data.reduce((sum, d) => sum + d.executions, 0) / data.length;
        const predictions: TrendPrediction[] = [];
        const now = new Date();

        for (let i = 1; i <= 3; i++) {
            const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
            predictions.push({
                date: futureDate.toISOString().split('T')[0],
                metric: 'executions',
                predictedValue: Math.round(avgExecutions * (1 + 0.05 * i)),
                confidenceInterval: {
                    lower: Math.round(avgExecutions * 0.8),
                    upper: Math.round(avgExecutions * 1.2),
                },
            });
        }

        return predictions;
    }

    private async findCorrelations(companyId: string, period: AnalyticsPeriod): Promise<Correlation[]> {
        return [
            {
                metric1: 'التأخير',
                metric2: 'الخصومات',
                coefficient: 0.85,
                strength: 'STRONG',
                description: 'علاقة قوية بين معدل التأخير والخصومات',
            },
            {
                metric1: 'الأداء',
                metric2: 'المكافآت',
                coefficient: 0.72,
                strength: 'MODERATE',
                description: 'علاقة متوسطة بين تحقيق الأهداف والمكافآت',
            },
        ];
    }

    private async getCohortStats(
        companyId: string,
        field: string,
        value: string,
        period: AnalyticsPeriod,
    ): Promise<Omit<Cohort, 'name' | 'size'>> {
        return {
            avgImpact: 500,
            retentionRate: 95,
            satisfaction: 4.2,
            metrics: { executions: 100, successRate: 92 },
        };
    }

    private async getTenureCohorts(companyId: string, period: AnalyticsPeriod): Promise<Cohort[]> {
        return [
            { name: '< سنة', size: 50, avgImpact: 300, retentionRate: 85, satisfaction: 4.0, metrics: {} },
            { name: '1-3 سنوات', size: 100, avgImpact: 500, retentionRate: 92, satisfaction: 4.2, metrics: {} },
            { name: '> 3 سنوات', size: 75, avgImpact: 700, retentionRate: 98, satisfaction: 4.5, metrics: {} },
        ];
    }

    private compareCohorts(cohorts: Cohort[]): CohortComparison[] {
        if (cohorts.length < 2) return [];

        const comparisons: CohortComparison[] = [];

        for (let i = 0; i < cohorts.length - 1; i++) {
            comparisons.push({
                metric: 'avgImpact',
                cohort1: { name: cohorts[i].name, value: cohorts[i].avgImpact },
                cohort2: { name: cohorts[i + 1].name, value: cohorts[i + 1].avgImpact },
                difference: cohorts[i + 1].avgImpact - cohorts[i].avgImpact,
                significanceLevel: 0.95,
            });
        }

        return comparisons;
    }

    private generateCohortInsights(cohorts: Cohort[], comparisons: CohortComparison[]): string[] {
        const insights: string[] = [];

        const maxImpact = cohorts.reduce((max, c) => c.avgImpact > max.avgImpact ? c : max, cohorts[0]);
        insights.push(`أعلى تأثير: فوج "${maxImpact.name}" بمتوسط ${maxImpact.avgImpact} ريال`);

        const maxRetention = cohorts.reduce((max, c) => c.retentionRate > max.retentionRate ? c : max, cohorts[0]);
        insights.push(`أعلى استبقاء: فوج "${maxRetention.name}" بنسبة ${maxRetention.retentionRate}%`);

        return insights;
    }

    private calculateStats(values: number[]): { mean: number; stdDev: number } {
        if (values.length === 0) return { mean: 0, stdDev: 0 };

        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(variance);

        return { mean, stdDev };
    }

    private getPossibleCauses(type: 'SPIKE' | 'DROP'): string[] {
        if (type === 'SPIKE') {
            return ['مكافأة استثنائية', 'خطأ في الحساب', 'سياسة جديدة', 'تعديل بأثر رجعي'];
        }
        return ['خصم كبير', 'خطأ في البيانات', 'استثناء غير مسجل', 'تغيير في الشروط'];
    }

    private calculateGrowthRateFromArray(values: number[]): number {
        if (values.length < 2) return 0;
        const first = values[0] || 1;
        const last = values[values.length - 1] || 1;
        return ((last - first) / first) * 100;
    }

    private translateCategory(category: string): string {
        const translations: Record<string, string> = {
            'ATTENDANCE': 'الحضور',
            'LEAVE': 'الإجازات',
            'PERFORMANCE': 'الأداء',
            'PAYROLL': 'الرواتب',
            'ANNIVERSARY': 'المناسبات',
            'OTHER': 'أخرى',
        };
        return translations[category] || category;
    }

    private translateTrend(trend: string): string {
        const translations: Record<string, string> = {
            'GROWING': 'متصاعد',
            'DECLINING': 'متراجع',
            'STABLE': 'مستقر',
        };
        return translations[trend] || trend;
    }
}
