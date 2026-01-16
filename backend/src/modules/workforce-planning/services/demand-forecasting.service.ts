import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AiService } from '../../ai/ai.service';
import {
    ForecastRequestDto,
    ForecastResponseDto,
    DemandPrediction,
    CoverageGap,
    CostOptimization,
} from '../dto/forecast.dto';

interface HistoricalData {
    date: Date;
    totalEmployees: number;
    attendance: number;
    leaves: number;
    department?: string;
}

interface AIForecastResponse {
    predictions: Array<{
        date: string;
        requiredStaff: number;
        confidence: number;
    }>;
    coverageGaps: Array<{
        startDate: string;
        endDate: string;
        department: string;
        gapSize: number;
        severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        recommendations: string[];
    }>;
    costOptimization: {
        currentCost: number;
        optimizedCost: number;
        recommendedActions: string[];
    };
    insights: string[];
}

@Injectable()
export class DemandForecastingService {
    private readonly logger = new Logger(DemandForecastingService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly aiService: AiService,
    ) {}

    /**
     * Generate workforce demand forecast using AI
     */
    async generateForecast(
        companyId: string,
        requestDto: ForecastRequestDto,
    ): Promise<ForecastResponseDto> {
        this.logger.debug(
            `Generating forecast for company ${companyId} from ${requestDto.startDate} to ${requestDto.endDate}`,
        );

        try {
            // Gather historical data
            const historicalData = await this.getHistoricalData(
                companyId,
                requestDto.branchId,
                requestDto.departmentId,
            );

            // Get current workforce info
            const workforceInfo = await this.getWorkforceInfo(
                companyId,
                requestDto.branchId,
                requestDto.departmentId,
            );

            // Use AI to generate forecast
            const aiResponse = await this.generateAIForecast(
                historicalData,
                workforceInfo,
                requestDto,
            );

            // Build final response
            const predictions = await this.buildPredictions(
                aiResponse.predictions,
                workforceInfo.currentStaffCount,
            );

            const costOptimization = this.buildCostOptimization(
                aiResponse.costOptimization,
                workforceInfo.averageSalary,
            );

            return {
                companyId,
                startDate: requestDto.startDate,
                endDate: requestDto.endDate,
                predictions,
                coverageGaps: aiResponse.coverageGaps,
                costOptimization,
                insights: aiResponse.insights,
                generatedAt: new Date(),
            };
        } catch (error) {
            this.logger.error(`Failed to generate forecast: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get historical attendance and workforce data
     */
    private async getHistoricalData(
        companyId: string,
        branchId?: string,
        departmentId?: string,
    ): Promise<HistoricalData[]> {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const whereClause: any = {
            companyId,
            date: { gte: sixMonthsAgo },
        };

        if (branchId) {
            whereClause.user = { branchId };
        }

        if (departmentId) {
            whereClause.user = { ...whereClause.user, departmentId };
        }

        const attendanceRecords = await this.prisma.attendance.groupBy({
            by: ['date'],
            where: whereClause,
            _count: {
                id: true,
            },
            orderBy: {
                date: 'asc',
            },
        });

        const leaveRecords = await this.prisma.leaveRequest.groupBy({
            by: ['startDate'],
            where: {
                companyId,
                status: 'APPROVED',
                startDate: { gte: sixMonthsAgo },
            },
            _count: {
                id: true,
            },
        });

        const leaveMap = new Map(
            leaveRecords.map((l) => [l.startDate.toISOString().split('T')[0], l._count.id]),
        );

        return attendanceRecords.map((record) => ({
            date: record.date,
            totalEmployees: record._count.id,
            attendance: record._count.id,
            leaves: leaveMap.get(record.date.toISOString().split('T')[0]) || 0,
        }));
    }

    /**
     * Get current workforce information
     */
    private async getWorkforceInfo(
        companyId: string,
        branchId?: string,
        departmentId?: string,
    ): Promise<{
        currentStaffCount: number;
        averageSalary: number;
        departments: Array<{ name: string; count: number }>;
    }> {
        const whereClause: any = {
            companyId,
            role: 'EMPLOYEE',
            status: 'ACTIVE',
        };

        if (branchId) {
            whereClause.branchId = branchId;
        }

        if (departmentId) {
            whereClause.departmentId = departmentId;
        }

        const [staffCount, salaryInfo, departmentGroups] = await Promise.all([
            this.prisma.user.count({ where: whereClause }),
            this.prisma.user.aggregate({
                where: whereClause,
                _avg: {
                    basicSalary: true,
                },
            }),
            this.prisma.user.groupBy({
                by: ['departmentId'],
                where: whereClause,
                _count: {
                    id: true,
                },
            }),
        ]);

        const departments = await Promise.all(
            departmentGroups.map(async (dept) => {
                if (!dept.departmentId) {
                    return { name: 'غير محدد', count: dept._count.id };
                }
                const department = await this.prisma.department.findUnique({
                    where: { id: dept.departmentId },
                    select: { name: true },
                });
                return {
                    name: department?.name || 'غير معروف',
                    count: dept._count.id,
                };
            }),
        );

        return {
            currentStaffCount: staffCount,
            averageSalary: Number(salaryInfo._avg.basicSalary) || 0,
            departments,
        };
    }

    /**
     * Generate AI-based forecast
     */
    private async generateAIForecast(
        historicalData: HistoricalData[],
        workforceInfo: any,
        requestDto: ForecastRequestDto,
    ): Promise<AIForecastResponse> {
        if (!this.aiService.isAvailable()) {
            this.logger.warn('AI service not available, using fallback predictions');
            return this.generateFallbackForecast(historicalData, workforceInfo, requestDto);
        }

        const prompt = this.buildForecastPrompt(historicalData, workforceInfo, requestDto);
        const systemInstruction = `أنت محلل قوى عاملة خبير. قدم توقعات دقيقة ومفصلة لاحتياجات التوظيف بناءً على البيانات التاريخية.
استجب بتنسيق JSON فقط دون أي نص إضافي.`;

        try {
            const aiResponse = await this.aiService.generateContent(prompt, systemInstruction);
            return this.aiService.parseJsonResponse<AIForecastResponse>(aiResponse);
        } catch (error) {
            this.logger.error(`AI forecast failed: ${error.message}`);
            return this.generateFallbackForecast(historicalData, workforceInfo, requestDto);
        }
    }

    /**
     * Build prompt for AI forecast
     */
    private buildForecastPrompt(
        historicalData: HistoricalData[],
        workforceInfo: any,
        requestDto: ForecastRequestDto,
    ): string {
        const startDate = new Date(requestDto.startDate);
        const endDate = new Date(requestDto.endDate);
        const forecastDays = Math.ceil(
            (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        return `
قم بتحليل البيانات التاريخية التالية وإنشاء توقع لاحتياجات القوى العاملة:

**البيانات التاريخية (آخر 6 أشهر):**
${historicalData.slice(-30).map((d) => `- ${d.date.toISOString().split('T')[0]}: ${d.attendance} حضور، ${d.leaves} إجازة`).join('\n')}

**معلومات القوى العاملة الحالية:**
- إجمالي الموظفين: ${workforceInfo.currentStaffCount}
- متوسط الراتب: ${workforceInfo.averageSalary.toFixed(2)} ريال
- الأقسام: ${workforceInfo.departments.map((d: any) => `${d.name} (${d.count})`).join(', ')}

**فترة التوقع:**
- من: ${requestDto.startDate}
- إلى: ${requestDto.endDate}
- عدد الأيام: ${forecastDays}

قدم توقعاً يتضمن:
1. توقعات يومية للموظفين المطلوبين مع مستوى الثقة
2. فجوات التغطية المحتملة مع مستوى الخطورة والتوصيات
3. تحليل تحسين التكلفة مع الإجراءات الموصى بها
4. رؤى رئيسية حول الاتجاهات والمخاطر

استخدم التنسيق التالي:
{
    "predictions": [
        {
            "date": "YYYY-MM-DD",
            "requiredStaff": number,
            "confidence": 0.0-1.0
        }
    ],
    "coverageGaps": [
        {
            "startDate": "YYYY-MM-DD",
            "endDate": "YYYY-MM-DD",
            "department": "string",
            "gapSize": number,
            "severity": "LOW|MEDIUM|HIGH|CRITICAL",
            "recommendations": ["string"]
        }
    ],
    "costOptimization": {
        "currentCost": number,
        "optimizedCost": number,
        "recommendedActions": ["string"]
    },
    "insights": ["string"]
}
`;
    }

    /**
     * Fallback forecast when AI is not available
     */
    private generateFallbackForecast(
        historicalData: HistoricalData[],
        workforceInfo: any,
        requestDto: ForecastRequestDto,
    ): AIForecastResponse {
        const avgAttendance =
            historicalData.reduce((sum, d) => sum + d.attendance, 0) / historicalData.length || 0;
        const avgLeaves =
            historicalData.reduce((sum, d) => sum + d.leaves, 0) / historicalData.length || 0;

        const startDate = new Date(requestDto.startDate);
        const endDate = new Date(requestDto.endDate);
        const predictions = [];

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            predictions.push({
                date: d.toISOString().split('T')[0],
                requiredStaff: Math.ceil(avgAttendance + avgLeaves),
                confidence: 0.7,
            });
        }

        return {
            predictions,
            coverageGaps: [],
            costOptimization: {
                currentCost: workforceInfo.currentStaffCount * workforceInfo.averageSalary,
                optimizedCost: workforceInfo.currentStaffCount * workforceInfo.averageSalary * 0.95,
                recommendedActions: ['تحسين جدولة المناوبات', 'تقليل العمل الإضافي'],
            },
            insights: [
                `متوسط الحضور اليومي: ${avgAttendance.toFixed(0)} موظف`,
                `متوسط الإجازات اليومية: ${avgLeaves.toFixed(0)} موظف`,
                'البيانات محدودة - يوصى بجمع المزيد من البيانات التاريخية',
            ],
        };
    }

    /**
     * Build predictions with gap analysis
     */
    private async buildPredictions(
        aiPredictions: Array<{ date: string; requiredStaff: number; confidence: number }>,
        currentStaffCount: number,
    ): Promise<DemandPrediction[]> {
        return aiPredictions.map((pred) => ({
            date: pred.date,
            requiredStaff: pred.requiredStaff,
            availableStaff: currentStaffCount,
            gap: currentStaffCount - pred.requiredStaff,
            confidence: pred.confidence,
        }));
    }

    /**
     * Build cost optimization data
     */
    private buildCostOptimization(
        aiOptimization: { currentCost: number; optimizedCost: number; recommendedActions: string[] },
        averageSalary: number,
    ): CostOptimization {
        const savings = aiOptimization.currentCost - aiOptimization.optimizedCost;
        const savingsPercentage =
            aiOptimization.currentCost > 0
                ? (savings / aiOptimization.currentCost) * 100
                : 0;

        return {
            currentCost: aiOptimization.currentCost,
            optimizedCost: aiOptimization.optimizedCost,
            savings,
            savingsPercentage,
            recommendedActions: aiOptimization.recommendedActions,
        };
    }
}
