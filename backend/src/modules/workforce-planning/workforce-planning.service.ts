import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DemandForecastingService } from './services/demand-forecasting.service';
import { AiService } from '../ai/ai.service';
import { ForecastRequestDto } from './dto/forecast.dto';
import {
    CreateScenarioRequestDto,
    ScenarioResponseDto,
    ScenarioImpactAnalysis,
    ScenarioType,
    ScenarioStatus,
} from './dto/scenario.dto';
import { ScenarioQueryDto } from './dto/scenario-query.dto';

@Injectable()
export class WorkforcePlanningService {
    private readonly logger = new Logger(WorkforcePlanningService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly demandForecastingService: DemandForecastingService,
        private readonly aiService: AiService,
    ) { }

    /**
     * Get workforce forecast
     */
    async getForecast(companyId: string, months: number): Promise<any> {
        this.logger.debug(`Generating workforce forecast for company ${companyId}, months: ${months}`);

        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + months);

        const requestDto: ForecastRequestDto = {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
        };

        return this.demandForecastingService.generateForecast(companyId, requestDto);
    }

    /**
     * Get all what-if scenarios for a company
     */
    async getScenarios(companyId: string, query: ScenarioQueryDto): Promise<ScenarioResponseDto[]> {
        this.logger.debug(`Fetching scenarios for company ${companyId} with filters: ${JSON.stringify(query)}`);

        const where: any = { companyId };

        if (query.type) {
            where.type = query.type;
        }

        if (query.status) {
            where.status = query.status;
        }

        const scenarios = await this.prisma.whatIfScenario.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        return scenarios.map((scenario) => this.mapScenarioDbToResponse(scenario));
    }

    /**
     * Map database scenario to response DTO (for list endpoints)
     */
    private mapScenarioDbToResponse(scenario: any): ScenarioResponseDto {
        const impact: ScenarioImpactAnalysis = {
            baselineCost: Number(scenario.baselineCost) || 0,
            projectedCost: Number(scenario.projectedCost) || 0,
            costDifference: Number(scenario.costDifference) || 0,
            costChangePercentage: scenario.baselineCost
                ? ((Number(scenario.costDifference) / Number(scenario.baselineCost)) * 100)
                : 0,
            baselineCoverage: Number(scenario.baselineCoverage) || 0,
            projectedCoverage: Number(scenario.projectedCoverage) || 0,
            coverageChange: (Number(scenario.projectedCoverage) || 0) - (Number(scenario.baselineCoverage) || 0),
            impactAnalysis: scenario.impactAnalysis || '',
            risks: scenario.risks ? scenario.risks.split('\n').filter((r: string) => r.trim()) : [],
            benefits: scenario.benefits ? scenario.benefits.split('\n').filter((b: string) => b.trim()) : [],
            aiInsights: scenario.aiInsights || '',
        };

        return {
            id: scenario.id,
            companyId: scenario.companyId,
            name: scenario.name,
            description: scenario.description,
            type: scenario.type as ScenarioType,
            status: scenario.status as ScenarioStatus,
            startDate: scenario.startDate.toISOString().split('T')[0],
            endDate: scenario.endDate.toISOString().split('T')[0],
            parameters: scenario.parameters as any,
            impact,
            createdAt: scenario.createdAt,
            createdBy: scenario.createdBy,
        };
    }

    /**
     * Create and analyze what-if scenario
     */
    async createScenario(
        companyId: string,
        userId: string,
        requestDto: CreateScenarioRequestDto,
    ): Promise<ScenarioResponseDto> {
        this.logger.debug(`Creating what-if scenario for company ${companyId}: ${requestDto.name}`);

        // Calculate baseline metrics
        const baseline = await this.calculateBaselineMetrics(
            companyId,
            requestDto.parameters.departmentId,
            requestDto.parameters.branchId,
        );

        // Calculate projected metrics based on scenario type
        const projected = await this.calculateProjectedMetrics(
            companyId,
            requestDto,
            baseline,
        );

        // Generate AI insights
        const aiInsights = await this.generateScenarioInsights(
            companyId,
            requestDto,
            baseline,
            projected,
        );

        // Create scenario record in database
        const scenario = await this.prisma.whatIfScenario.create({
            data: {
                companyId,
                name: requestDto.name,
                description: requestDto.description,
                type: requestDto.type,
                status: 'ANALYZING',
                parameters: requestDto.parameters,
                startDate: new Date(requestDto.startDate),
                endDate: new Date(requestDto.endDate),
                baselineCost: baseline.cost,
                projectedCost: projected.cost,
                costDifference: projected.cost - baseline.cost,
                baselineCoverage: baseline.coverage,
                projectedCoverage: projected.coverage,
                impactAnalysis: aiInsights.impactAnalysis,
                risks: aiInsights.risks.join('\n'),
                benefits: aiInsights.benefits.join('\n'),
                aiInsights: aiInsights.aiInsights,
                createdBy: userId,
            },
        });

        // Update status to completed
        await this.prisma.whatIfScenario.update({
            where: { id: scenario.id },
            data: { status: 'COMPLETED' },
        });

        return this.mapScenarioToResponse(scenario, baseline, projected, aiInsights);
    }

    /**
     * Calculate baseline workforce metrics
     */
    private async calculateBaselineMetrics(
        companyId: string,
        departmentId?: string,
        branchId?: string,
    ): Promise<{ cost: number; coverage: number; employeeCount: number }> {
        const where: any = {
            companyId,
            role: 'EMPLOYEE',
            status: 'ACTIVE',
        };

        if (departmentId) {
            where.departmentId = departmentId;
        }

        if (branchId) {
            where.branchId = branchId;
        }

        // Get active employees
        const employees = await this.prisma.user.findMany({
            where,
            select: {
                id: true,
                basicSalary: true,
            },
        });

        // Calculate total monthly cost (basic salary + estimated benefits ~30%)
        const totalSalary = employees.reduce((sum, emp) => sum + Number(emp.basicSalary || 0), 0);
        const estimatedBenefits = totalSalary * 0.3; // GOSI, insurance, etc.
        const totalCost = totalSalary + estimatedBenefits;

        // Calculate coverage (simplified - assume 100% for current staff)
        const coverage = employees.length > 0 ? 100 : 0;

        return {
            cost: totalCost,
            coverage: coverage,
            employeeCount: employees.length,
        };
    }

    /**
     * Calculate projected metrics based on scenario
     */
    private async calculateProjectedMetrics(
        companyId: string,
        scenario: CreateScenarioRequestDto,
        baseline: { cost: number; coverage: number; employeeCount: number },
    ): Promise<{ cost: number; coverage: number; employeeCount: number }> {
        let projectedCost = baseline.cost;
        let projectedCoverage = baseline.coverage;
        let projectedEmployeeCount = baseline.employeeCount;

        switch (scenario.type) {
            case ScenarioType.HIRE:
                const newEmployees = scenario.parameters.employeeCount || 0;
                const avgSalary = scenario.parameters.averageSalary || 5000;
                const hiringCost = newEmployees * avgSalary * 1.3; // Include benefits
                projectedCost += hiringCost;
                projectedEmployeeCount += newEmployees;
                projectedCoverage = Math.min(100, baseline.coverage + (newEmployees * 5)); // 5% per employee
                break;

            case ScenarioType.TERMINATE:
                const terminatedEmployees = scenario.parameters.employeeCount || 0;
                const avgTerminationSalary = baseline.cost / baseline.employeeCount;
                const savingCost = terminatedEmployees * avgTerminationSalary;
                projectedCost = Math.max(0, baseline.cost - savingCost);
                projectedEmployeeCount = Math.max(0, baseline.employeeCount - terminatedEmployees);
                projectedCoverage = Math.max(0, baseline.coverage - (terminatedEmployees * 5));
                break;

            case ScenarioType.COST_REDUCTION:
                const reductionPercentage = scenario.parameters.changePercentage || 0;
                projectedCost = baseline.cost * (1 - reductionPercentage / 100);
                projectedCoverage = baseline.coverage * 0.95; // Slight coverage reduction
                break;

            case ScenarioType.SCHEDULE_CHANGE:
                projectedCost = baseline.cost * 0.98; // 2% optimization from better scheduling
                projectedCoverage = Math.min(100, baseline.coverage * 1.05); // 5% improvement
                break;

            case ScenarioType.EXPANSION:
                const expansionPercentage = scenario.parameters.changePercentage || 20;
                projectedCost = baseline.cost * (1 + expansionPercentage / 100);
                projectedEmployeeCount = Math.ceil(baseline.employeeCount * (1 + expansionPercentage / 100));
                projectedCoverage = Math.min(100, baseline.coverage + 10);
                break;
        }

        return {
            cost: projectedCost,
            coverage: projectedCoverage,
            employeeCount: projectedEmployeeCount,
        };
    }

    /**
     * Generate AI insights for scenario
     */
    private async generateScenarioInsights(
        companyId: string,
        scenario: CreateScenarioRequestDto,
        baseline: any,
        projected: any,
    ): Promise<{
        impactAnalysis: string;
        risks: string[];
        benefits: string[];
        aiInsights: string;
    }> {
        const costDifference = projected.cost - baseline.cost;
        const costChangePercentage = ((costDifference / baseline.cost) * 100).toFixed(2);
        const coverageChange = (projected.coverage - baseline.coverage).toFixed(2);

        if (!this.aiService.isAvailable()) {
            this.logger.warn('AI service not available, using fallback insights');
            return this.generateFallbackInsights(
                scenario,
                baseline,
                projected,
                costChangePercentage,
                coverageChange,
            );
        }

        try {
            const prompt = `
Analyze this workforce planning scenario and provide detailed insights:

Scenario: ${scenario.name}
Type: ${scenario.type}
Description: ${scenario.description || 'N/A'}
Period: ${scenario.startDate} to ${scenario.endDate}

Current State:
- Employee Count: ${baseline.employeeCount}
- Monthly Cost: ${baseline.cost.toFixed(2)} SAR
- Coverage: ${baseline.coverage.toFixed(2)}%

Projected State (after ${scenario.type}):
- Employee Count: ${projected.employeeCount}
- Monthly Cost: ${projected.cost.toFixed(2)} SAR
- Coverage: ${projected.coverage.toFixed(2)}%
- Cost Change: ${costChangePercentage}%
- Coverage Change: ${coverageChange}%

Parameters: ${JSON.stringify(scenario.parameters)}

Please provide a JSON response with the following structure:
{
  "impactAnalysis": "Detailed analysis of the overall impact (2-3 sentences in Arabic)",
  "risks": ["risk1", "risk2", "risk3"] (3-5 potential risks in Arabic),
  "benefits": ["benefit1", "benefit2", "benefit3"] (3-5 expected benefits in Arabic),
  "recommendations": ["recommendation1", "recommendation2"] (2-4 actionable recommendations in Arabic)
}
`;

            const systemInstruction = 'أنت مستشار موارد بشرية متخصص في التخطيط الاستراتيجي للقوى العاملة. قدم تحليلاً دقيقاً ومهنياً باللغة العربية.';

            const aiResponse = await this.aiService.generateContent(prompt, systemInstruction);
            const parsed = this.aiService.parseJsonResponse<any>(aiResponse);

            return {
                impactAnalysis: parsed.impactAnalysis || 'تحليل غير متوفر',
                risks: parsed.risks || [],
                benefits: parsed.benefits || [],
                aiInsights: parsed.recommendations ? parsed.recommendations.join('\n') : '',
            };
        } catch (error) {
            this.logger.error(`Failed to generate AI insights: ${error.message}`);
            return this.generateFallbackInsights(
                scenario,
                baseline,
                projected,
                costChangePercentage,
                coverageChange,
            );
        }
    }

    /**
     * Generate fallback insights when AI is unavailable
     */
    private generateFallbackInsights(
        scenario: CreateScenarioRequestDto,
        baseline: any,
        projected: any,
        costChangePercentage: string,
        coverageChange: string,
    ): {
        impactAnalysis: string;
        risks: string[];
        benefits: string[];
        aiInsights: string;
    } {
        const impactAnalysis = `سيناريو ${scenario.type} من ${scenario.startDate} إلى ${scenario.endDate}. التغيير المتوقع في التكلفة: ${costChangePercentage}%، التغيير في التغطية: ${coverageChange}%.`;

        const risks = this.getDefaultRisks(scenario.type);
        const benefits = this.getDefaultBenefits(scenario.type);

        return {
            impactAnalysis,
            risks,
            benefits,
            aiInsights: 'تم إنشاء التحليل باستخدام النماذج الإحصائية الأساسية. للحصول على رؤى أكثر دقة، يُنصح بتفعيل خدمة الذكاء الاصطناعي.',
        };
    }

    private getDefaultRisks(scenarioType: ScenarioType): string[] {
        const risksMap = {
            [ScenarioType.HIRE]: [
                'قد يستغرق تأهيل الموظفين الجدد وقتاً أطول من المتوقع',
                'احتمالية عدم العثور على مرشحين مؤهلين في الوقت المحدد',
                'زيادة التكاليف الإدارية والتشغيلية',
            ],
            [ScenarioType.TERMINATE]: [
                'انخفاض الروح المعنوية للموظفين المتبقين',
                'فقدان المعرفة والخبرة المؤسسية',
                'احتمالية نقص التغطية في بعض الأقسام',
            ],
            [ScenarioType.SCHEDULE_CHANGE]: [
                'مقاومة الموظفين للتغيير في جداول العمل',
                'احتمالية حدوث فجوات في التغطية أثناء الانتقال',
                'الحاجة إلى فترة تكيف قد تؤثر على الإنتاجية',
            ],
            [ScenarioType.COST_REDUCTION]: [
                'قد يؤثر تخفيض التكاليف على جودة الخدمة',
                'احتمالية فقدان الموظفين المميزين',
                'انخفاض الرضا الوظيفي',
            ],
            [ScenarioType.EXPANSION]: [
                'تحديات في إدارة فريق أكبر',
                'زيادة كبيرة في التكاليف التشغيلية',
                'الحاجة إلى هيكل إداري أقوى',
            ],
        };

        return risksMap[scenarioType] || ['لا توجد مخاطر محددة'];
    }

    private getDefaultBenefits(scenarioType: ScenarioType): string[] {
        const benefitsMap = {
            [ScenarioType.HIRE]: [
                'تحسين التغطية وتقليل الضغط على الموظفين الحاليين',
                'زيادة القدرة الإنتاجية',
                'إضافة مهارات وخبرات جديدة للفريق',
            ],
            [ScenarioType.TERMINATE]: [
                'تخفيض كبير في التكاليف التشغيلية',
                'إمكانية إعادة هيكلة الفريق بشكل أكثر كفاءة',
                'تحرير ميزانية للاستثمار في مجالات أخرى',
            ],
            [ScenarioType.SCHEDULE_CHANGE]: [
                'تحسين الكفاءة التشغيلية',
                'تقليل ساعات العمل الإضافية',
                'تحسين توازن العمل والحياة للموظفين',
            ],
            [ScenarioType.COST_REDUCTION]: [
                'تحسين الربحية',
                'زيادة المرونة المالية',
                'إمكانية إعادة توجيه الموارد للمشاريع الاستراتيجية',
            ],
            [ScenarioType.EXPANSION]: [
                'زيادة القدرة على خدمة المزيد من العملاء',
                'تحسين التغطية في جميع المواقع',
                'فرص نمو وتطوير للموظفين',
            ],
        };

        return benefitsMap[scenarioType] || ['لا توجد فوائد محددة'];
    }

    /**
     * Map scenario database record to response DTO
     */
    private mapScenarioToResponse(
        scenario: any,
        baseline: any,
        projected: any,
        aiInsights: any,
    ): ScenarioResponseDto {
        const costDifference = projected.cost - baseline.cost;
        const costChangePercentage = ((costDifference / baseline.cost) * 100);
        const coverageChange = projected.coverage - baseline.coverage;

        const impact: ScenarioImpactAnalysis = {
            baselineCost: baseline.cost,
            projectedCost: projected.cost,
            costDifference: costDifference,
            costChangePercentage: costChangePercentage,
            baselineCoverage: baseline.coverage,
            projectedCoverage: projected.coverage,
            coverageChange: coverageChange,
            impactAnalysis: aiInsights.impactAnalysis,
            risks: aiInsights.risks,
            benefits: aiInsights.benefits,
            aiInsights: aiInsights.aiInsights,
        };

        return {
            id: scenario.id,
            companyId: scenario.companyId,
            name: scenario.name,
            description: scenario.description,
            type: scenario.type,
            status: 'COMPLETED',
            startDate: scenario.startDate.toISOString().split('T')[0],
            endDate: scenario.endDate.toISOString().split('T')[0],
            parameters: scenario.parameters,
            impact: impact,
            createdAt: scenario.createdAt,
            createdBy: scenario.createdBy,
        };
    }
}
