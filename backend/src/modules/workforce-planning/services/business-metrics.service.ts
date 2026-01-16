import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AiService } from '../../ai/ai.service';
import {
    CreateBusinessMetricDto,
    UpdateBusinessMetricDto,
    BulkCreateMetricsDto,
    BusinessMetricQueryDto,
    BusinessMetricResponseDto,
    MetricsSummaryDto,
    MetricsTrendDto,
    BusinessMetricsAnalysisDto,
    MetricType,
} from '../dto/business-metrics.dto';

interface AIMetricsAnalysisResponse {
    insights: string[];
    workforceCorrelation: Array<{
        metric: string;
        correlation: number;
        impact: 'LOW' | 'MEDIUM' | 'HIGH';
        recommendation: string;
    }>;
}

@Injectable()
export class BusinessMetricsService {
    private readonly logger = new Logger(BusinessMetricsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly aiService: AiService,
    ) {}

    /**
     * Create a new business metric
     */
    async createMetric(
        companyId: string,
        dto: CreateBusinessMetricDto,
    ): Promise<BusinessMetricResponseDto> {
        this.logger.debug(`Creating business metric for company ${companyId}: ${dto.metricName}`);

        try {
            const metric = await this.prisma.businessMetric.create({
                data: {
                    companyId,
                    branchId: dto.branchId,
                    metricType: dto.metricType,
                    metricName: dto.metricName,
                    date: new Date(dto.date),
                    value: dto.value,
                    source: dto.source,
                    metadata: dto.metadata,
                },
            });

            return this.mapToResponse(metric);
        } catch (error) {
            this.logger.error(`Failed to create business metric: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Create multiple business metrics at once
     */
    async bulkCreateMetrics(
        companyId: string,
        dto: BulkCreateMetricsDto,
    ): Promise<{ created: number; failed: number }> {
        this.logger.debug(`Bulk creating ${dto.metrics.length} metrics for company ${companyId}`);

        let created = 0;
        let failed = 0;

        for (const metricDto of dto.metrics) {
            try {
                await this.prisma.businessMetric.upsert({
                    where: {
                        companyId_branchId_metricType_date: {
                            companyId,
                            branchId: metricDto.branchId || null,
                            metricType: metricDto.metricType,
                            date: new Date(metricDto.date),
                        },
                    },
                    update: {
                        value: metricDto.value,
                        metricName: metricDto.metricName,
                        source: metricDto.source,
                        metadata: metricDto.metadata,
                    },
                    create: {
                        companyId,
                        branchId: metricDto.branchId,
                        metricType: metricDto.metricType,
                        metricName: metricDto.metricName,
                        date: new Date(metricDto.date),
                        value: metricDto.value,
                        source: metricDto.source,
                        metadata: metricDto.metadata,
                    },
                });
                created++;
            } catch (error) {
                this.logger.warn(`Failed to create metric: ${error.message}`);
                failed++;
            }
        }

        return { created, failed };
    }

    /**
     * Get a single business metric by ID
     */
    async getMetric(companyId: string, metricId: string): Promise<BusinessMetricResponseDto> {
        const metric = await this.prisma.businessMetric.findFirst({
            where: {
                id: metricId,
                companyId,
            },
        });

        if (!metric) {
            throw new NotFoundException(`Metric with ID ${metricId} not found`);
        }

        return this.mapToResponse(metric);
    }

    /**
     * Get business metrics with filtering
     */
    async getMetrics(
        companyId: string,
        query: BusinessMetricQueryDto,
    ): Promise<BusinessMetricResponseDto[]> {
        const whereClause: any = { companyId };

        if (query.metricType) {
            whereClause.metricType = query.metricType;
        }

        if (query.branchId) {
            whereClause.branchId = query.branchId;
        }

        if (query.startDate || query.endDate) {
            whereClause.date = {};
            if (query.startDate) {
                whereClause.date.gte = new Date(query.startDate);
            }
            if (query.endDate) {
                whereClause.date.lte = new Date(query.endDate);
            }
        }

        const metrics = await this.prisma.businessMetric.findMany({
            where: whereClause,
            orderBy: { date: 'desc' },
        });

        return metrics.map((m) => this.mapToResponse(m));
    }

    /**
     * Update a business metric
     */
    async updateMetric(
        companyId: string,
        metricId: string,
        dto: UpdateBusinessMetricDto,
    ): Promise<BusinessMetricResponseDto> {
        const existing = await this.prisma.businessMetric.findFirst({
            where: { id: metricId, companyId },
        });

        if (!existing) {
            throw new NotFoundException(`Metric with ID ${metricId} not found`);
        }

        const updated = await this.prisma.businessMetric.update({
            where: { id: metricId },
            data: {
                value: dto.value,
                source: dto.source,
                metadata: dto.metadata,
            },
        });

        return this.mapToResponse(updated);
    }

    /**
     * Delete a business metric
     */
    async deleteMetric(companyId: string, metricId: string): Promise<void> {
        const existing = await this.prisma.businessMetric.findFirst({
            where: { id: metricId, companyId },
        });

        if (!existing) {
            throw new NotFoundException(`Metric with ID ${metricId} not found`);
        }

        await this.prisma.businessMetric.delete({
            where: { id: metricId },
        });
    }

    /**
     * Get metrics summary for a date range
     */
    async getMetricsSummary(
        companyId: string,
        startDate: string,
        endDate: string,
        branchId?: string,
    ): Promise<MetricsSummaryDto[]> {
        const whereClause: any = {
            companyId,
            date: {
                gte: new Date(startDate),
                lte: new Date(endDate),
            },
        };

        if (branchId) {
            whereClause.branchId = branchId;
        }

        const aggregations = await this.prisma.businessMetric.groupBy({
            by: ['metricType'],
            where: whereClause,
            _sum: { value: true },
            _avg: { value: true },
            _min: { value: true },
            _max: { value: true },
            _count: { id: true },
        });

        return aggregations.map((agg) => ({
            metricType: agg.metricType as MetricType,
            total: Number(agg._sum.value) || 0,
            average: Number(agg._avg.value) || 0,
            min: Number(agg._min.value) || 0,
            max: Number(agg._max.value) || 0,
            count: agg._count.id,
        }));
    }

    /**
     * Get metrics trends over time
     */
    async getMetricsTrends(
        companyId: string,
        metricType: MetricType,
        startDate: string,
        endDate: string,
        branchId?: string,
    ): Promise<MetricsTrendDto[]> {
        const whereClause: any = {
            companyId,
            metricType,
            date: {
                gte: new Date(startDate),
                lte: new Date(endDate),
            },
        };

        if (branchId) {
            whereClause.branchId = branchId;
        }

        const metrics = await this.prisma.businessMetric.findMany({
            where: whereClause,
            orderBy: { date: 'asc' },
            select: {
                date: true,
                value: true,
            },
        });

        const trends: MetricsTrendDto[] = [];
        let previousValue = 0;

        for (let i = 0; i < metrics.length; i++) {
            const currentValue = Number(metrics[i].value);
            const changePercentage =
                i === 0 || previousValue === 0
                    ? 0
                    : ((currentValue - previousValue) / previousValue) * 100;

            trends.push({
                date: metrics[i].date.toISOString().split('T')[0],
                value: currentValue,
                changePercentage: Math.round(changePercentage * 100) / 100,
            });

            previousValue = currentValue;
        }

        return trends;
    }

    /**
     * Analyze business metrics and their correlation with workforce needs
     */
    async analyzeMetrics(
        companyId: string,
        startDate: string,
        endDate: string,
        branchId?: string,
    ): Promise<BusinessMetricsAnalysisDto> {
        this.logger.debug(
            `Analyzing business metrics for company ${companyId} from ${startDate} to ${endDate}`,
        );

        try {
            // Get summaries
            const summaries = await this.getMetricsSummary(companyId, startDate, endDate, branchId);

            // Get trends for all metric types
            const allTrends: MetricsTrendDto[] = [];
            for (const metricType of Object.values(MetricType)) {
                const trends = await this.getMetricsTrends(
                    companyId,
                    metricType,
                    startDate,
                    endDate,
                    branchId,
                );
                allTrends.push(...trends);
            }

            // Get workforce data for correlation
            const workforceData = await this.getWorkforceData(companyId, startDate, endDate, branchId);

            // Use AI to analyze correlation
            const aiAnalysis = await this.generateAIAnalysis(summaries, allTrends, workforceData);

            return {
                companyId,
                startDate,
                endDate,
                summaries,
                trends: allTrends,
                insights: aiAnalysis.insights,
                workforceCorrelation: aiAnalysis.workforceCorrelation,
                analyzedAt: new Date(),
            };
        } catch (error) {
            this.logger.error(`Failed to analyze metrics: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get workforce data for correlation analysis
     */
    private async getWorkforceData(
        companyId: string,
        startDate: string,
        endDate: string,
        branchId?: string,
    ): Promise<{ date: string; attendance: number; leaves: number }[]> {
        const whereClause: any = {
            companyId,
            date: {
                gte: new Date(startDate),
                lte: new Date(endDate),
            },
        };

        if (branchId) {
            whereClause.user = { branchId };
        }

        const attendanceRecords = await this.prisma.attendance.groupBy({
            by: ['date'],
            where: whereClause,
            _count: { id: true },
            orderBy: { date: 'asc' },
        });

        const leaveWhereClause: any = {
            companyId,
            status: 'APPROVED',
            startDate: {
                gte: new Date(startDate),
                lte: new Date(endDate),
            },
        };

        const leaveRecords = await this.prisma.leaveRequest.groupBy({
            by: ['startDate'],
            where: leaveWhereClause,
            _count: { id: true },
        });

        const leaveMap = new Map(
            leaveRecords.map((l) => [l.startDate.toISOString().split('T')[0], l._count.id]),
        );

        return attendanceRecords.map((record) => ({
            date: record.date.toISOString().split('T')[0],
            attendance: record._count.id,
            leaves: leaveMap.get(record.date.toISOString().split('T')[0]) || 0,
        }));
    }

    /**
     * Generate AI-based analysis of metrics and workforce correlation
     */
    private async generateAIAnalysis(
        summaries: MetricsSummaryDto[],
        trends: MetricsTrendDto[],
        workforceData: { date: string; attendance: number; leaves: number }[],
    ): Promise<AIMetricsAnalysisResponse> {
        if (!this.aiService.isAvailable()) {
            this.logger.warn('AI service not available, using fallback analysis');
            return this.generateFallbackAnalysis(summaries, trends);
        }

        const prompt = this.buildAnalysisPrompt(summaries, trends, workforceData);
        const systemInstruction = `أنت محلل بيانات خبير متخصص في تحليل العلاقة بين مقاييس الأعمال واحتياجات القوى العاملة.
قدم تحليلاً دقيقاً وتوصيات عملية.
استجب بتنسيق JSON فقط دون أي نص إضافي.`;

        try {
            const aiResponse = await this.aiService.generateContent(prompt, systemInstruction);
            return this.aiService.parseJsonResponse<AIMetricsAnalysisResponse>(aiResponse);
        } catch (error) {
            this.logger.error(`AI analysis failed: ${error.message}`);
            return this.generateFallbackAnalysis(summaries, trends);
        }
    }

    /**
     * Build prompt for AI analysis
     */
    private buildAnalysisPrompt(
        summaries: MetricsSummaryDto[],
        trends: MetricsTrendDto[],
        workforceData: { date: string; attendance: number; leaves: number }[],
    ): string {
        return `
قم بتحليل العلاقة بين مقاييس الأعمال واحتياجات القوى العاملة:

**ملخص المقاييس:**
${summaries.map((s) => `- ${s.metricType}: المجموع=${s.total.toFixed(2)}, المتوسط=${s.average.toFixed(2)}, الحد الأدنى=${s.min.toFixed(2)}, الحد الأقصى=${s.max.toFixed(2)}`).join('\n')}

**اتجاهات المقاييس (آخر 10 نقاط):**
${trends.slice(-10).map((t) => `- ${t.date}: ${t.value.toFixed(2)} (تغيير: ${t.changePercentage.toFixed(2)}%)`).join('\n')}

**بيانات القوى العاملة (آخر 10 نقاط):**
${workforceData.slice(-10).map((w) => `- ${w.date}: حضور=${w.attendance}, إجازات=${w.leaves}`).join('\n')}

قدم تحليلاً يتضمن:
1. رؤى حول أداء المقاييس واتجاهاتها
2. العلاقة بين كل مقياس واحتياجات القوى العاملة
3. توصيات لتحسين التخطيط

استخدم التنسيق التالي:
{
    "insights": ["رؤية 1", "رؤية 2", ...],
    "workforceCorrelation": [
        {
            "metric": "نوع المقياس",
            "correlation": 0.0-1.0,
            "impact": "LOW|MEDIUM|HIGH",
            "recommendation": "توصية محددة"
        }
    ]
}
`;
    }

    /**
     * Fallback analysis when AI is not available
     */
    private generateFallbackAnalysis(
        summaries: MetricsSummaryDto[],
        trends: MetricsTrendDto[],
    ): AIMetricsAnalysisResponse {
        const insights: string[] = [];
        const workforceCorrelation: AIMetricsAnalysisResponse['workforceCorrelation'] = [];

        for (const summary of summaries) {
            // Generate basic insights
            if (summary.count > 0) {
                insights.push(
                    `مقياس ${summary.metricType}: المتوسط ${summary.average.toFixed(2)} مع ${summary.count} سجل`,
                );
            }

            // Generate correlation estimates based on metric type
            let correlation = 0.5;
            let impact: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
            let recommendation = '';

            switch (summary.metricType) {
                case MetricType.SALES:
                    correlation = 0.8;
                    impact = 'HIGH';
                    recommendation = 'زيادة المبيعات تتطلب زيادة في طاقم خدمة العملاء والمبيعات';
                    break;
                case MetricType.PRODUCTION:
                    correlation = 0.85;
                    impact = 'HIGH';
                    recommendation = 'يجب تعديل عدد عمال الإنتاج بناءً على حجم الإنتاج المتوقع';
                    break;
                case MetricType.ORDERS:
                    correlation = 0.75;
                    impact = 'HIGH';
                    recommendation = 'زيادة الطلبات تستلزم تعزيز فريق التوصيل والمستودعات';
                    break;
                case MetricType.TRAFFIC:
                    correlation = 0.7;
                    impact = 'MEDIUM';
                    recommendation = 'حركة العملاء تؤثر على احتياجات موظفي الاستقبال والخدمة';
                    break;
                case MetricType.WORKLOAD:
                    correlation = 0.9;
                    impact = 'HIGH';
                    recommendation = 'حجم العمل يرتبط مباشرة باحتياجات التوظيف';
                    break;
                default:
                    correlation = 0.5;
                    impact = 'LOW';
                    recommendation = 'قم بتحليل العلاقة بين هذا المقياس واحتياجات القوى العاملة';
            }

            workforceCorrelation.push({
                metric: summary.metricType,
                correlation,
                impact,
                recommendation,
            });
        }

        if (insights.length === 0) {
            insights.push('لا توجد بيانات كافية للتحليل');
            insights.push('قم بإضافة المزيد من مقاييس الأعمال للحصول على رؤى أفضل');
        }

        return { insights, workforceCorrelation };
    }

    /**
     * Map database model to response DTO
     */
    private mapToResponse(metric: any): BusinessMetricResponseDto {
        return {
            id: metric.id,
            companyId: metric.companyId,
            branchId: metric.branchId,
            metricType: metric.metricType as MetricType,
            metricName: metric.metricName,
            date: metric.date,
            value: Number(metric.value),
            source: metric.source,
            metadata: metric.metadata as Record<string, any>,
            createdAt: metric.createdAt,
            updatedAt: metric.updatedAt,
        };
    }
}
