import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AiService } from '../../ai/ai.service';
import {
    GenerateCostOptimizationDto,
    CostOptimizationQueryDto,
    UpdateOptimizationStatusDto,
    CostOptimizationRecommendationDto,
    CostOptimizationSummaryDto,
    AIOptimizationAnalysisDto,
    OptimizationType,
    OptimizationStatus,
} from '../dto/cost-optimization.dto';

interface WorkforceData {
    totalEmployees: number;
    averageSalary: number;
    totalOvertimeHours: number;
    totalOvertimeCost: number;
    departmentCosts: Array<{
        departmentId: string;
        departmentName: string;
        employeeCount: number;
        totalCost: number;
        overtimeHours: number;
    }>;
    attendanceRate: number;
    absenteeismCost: number;
}

interface AIOptimizationResponse {
    recommendations: Array<{
        title: string;
        description: string;
        optimizationType: string;
        currentCost: number;
        optimizedCost: number;
        potentialSavings: number;
        savingsPercentage: number;
        priority: number;
        recommendations: string;
        requirements?: string;
        risks?: string;
        analysisData: Record<string, any>;
    }>;
    insights: string[];
}

@Injectable()
export class CostOptimizationService {
    private readonly logger = new Logger(CostOptimizationService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly aiService: AiService,
    ) {}

    /**
     * Generate AI-powered cost optimization recommendations
     */
    async generateOptimizations(
        companyId: string,
        dto: GenerateCostOptimizationDto,
    ): Promise<AIOptimizationAnalysisDto> {
        this.logger.debug(
            `Generating cost optimization recommendations for company ${companyId} from ${dto.startDate} to ${dto.endDate}`,
        );

        try {
            // Gather workforce data for analysis
            const workforceData = await this.getWorkforceData(
                companyId,
                dto.startDate,
                dto.endDate,
                dto.branchId,
                dto.departmentId,
            );

            // Generate AI-powered recommendations
            const aiResponse = await this.generateAIOptimizations(
                workforceData,
                dto,
            );

            // Store recommendations in database
            const savedRecommendations = await this.saveRecommendations(
                companyId,
                dto.branchId,
                dto.departmentId,
                aiResponse.recommendations,
            );

            // Calculate summary
            const summary = this.calculateSummary(savedRecommendations);

            return {
                companyId,
                startDate: dto.startDate,
                endDate: dto.endDate,
                recommendations: savedRecommendations,
                summary,
                insights: aiResponse.insights,
                analyzedAt: new Date(),
            };
        } catch (error) {
            this.logger.error(`Failed to generate optimizations: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get all cost optimization recommendations with filtering
     */
    async getRecommendations(
        companyId: string,
        query: CostOptimizationQueryDto,
    ): Promise<CostOptimizationRecommendationDto[]> {
        const whereClause: any = { companyId };

        if (query.optimizationType) {
            whereClause.optimizationType = query.optimizationType;
        }

        if (query.status) {
            whereClause.status = query.status;
        }

        if (query.branchId) {
            whereClause.branchId = query.branchId;
        }

        if (query.departmentId) {
            whereClause.departmentId = query.departmentId;
        }

        if (query.minPriority) {
            whereClause.priority = { gte: query.minPriority };
        }

        const recommendations = await this.prisma.costOptimization.findMany({
            where: whereClause,
            orderBy: [{ priority: 'desc' }, { potentialSavings: 'desc' }],
        });

        return recommendations.map((rec) => this.mapToResponse(rec));
    }

    /**
     * Get a specific recommendation by ID
     */
    async getRecommendation(
        companyId: string,
        recommendationId: string,
    ): Promise<CostOptimizationRecommendationDto> {
        const recommendation = await this.prisma.costOptimization.findFirst({
            where: {
                id: recommendationId,
                companyId,
            },
        });

        if (!recommendation) {
            throw new NotFoundException(`Recommendation with ID ${recommendationId} not found`);
        }

        return this.mapToResponse(recommendation);
    }

    /**
     * Update recommendation status
     */
    async updateStatus(
        companyId: string,
        recommendationId: string,
        dto: UpdateOptimizationStatusDto,
    ): Promise<CostOptimizationRecommendationDto> {
        const existing = await this.prisma.costOptimization.findFirst({
            where: { id: recommendationId, companyId },
        });

        if (!existing) {
            throw new NotFoundException(`Recommendation with ID ${recommendationId} not found`);
        }

        const updateData: any = { status: dto.status };

        if (dto.notes) {
            const currentAnalysisData = existing.analysisData as Record<string, any> || {};
            updateData.analysisData = {
                ...currentAnalysisData,
                statusHistory: [
                    ...(currentAnalysisData.statusHistory || []),
                    {
                        status: dto.status,
                        notes: dto.notes,
                        updatedAt: new Date().toISOString(),
                    },
                ],
            };
        }

        const updated = await this.prisma.costOptimization.update({
            where: { id: recommendationId },
            data: updateData,
        });

        return this.mapToResponse(updated);
    }

    /**
     * Delete a recommendation
     */
    async deleteRecommendation(companyId: string, recommendationId: string): Promise<void> {
        const existing = await this.prisma.costOptimization.findFirst({
            where: { id: recommendationId, companyId },
        });

        if (!existing) {
            throw new NotFoundException(`Recommendation with ID ${recommendationId} not found`);
        }

        await this.prisma.costOptimization.delete({
            where: { id: recommendationId },
        });
    }

    /**
     * Get cost optimization summary
     */
    async getSummary(
        companyId: string,
        branchId?: string,
    ): Promise<CostOptimizationSummaryDto> {
        const whereClause: any = { companyId };
        if (branchId) {
            whereClause.branchId = branchId;
        }

        const recommendations = await this.prisma.costOptimization.findMany({
            where: whereClause,
            orderBy: { priority: 'desc' },
        });

        const byType: Record<string, { count: number; potentialSavings: number }> = {};
        const byStatus: Record<string, number> = {};
        let totalPotentialSavings = 0;

        for (const rec of recommendations) {
            // By type
            if (!byType[rec.optimizationType]) {
                byType[rec.optimizationType] = { count: 0, potentialSavings: 0 };
            }
            byType[rec.optimizationType].count++;
            byType[rec.optimizationType].potentialSavings += Number(rec.potentialSavings);

            // By status
            byStatus[rec.status] = (byStatus[rec.status] || 0) + 1;

            // Total savings
            totalPotentialSavings += Number(rec.potentialSavings);
        }

        // Get top 5 priority recommendations
        const topPriorityRecommendations = recommendations
            .slice(0, 5)
            .map((rec) => this.mapToResponse(rec));

        return {
            totalRecommendations: recommendations.length,
            totalPotentialSavings,
            byType: byType as any,
            byStatus: byStatus as any,
            topPriorityRecommendations,
        };
    }

    /**
     * Get workforce data for cost analysis
     */
    private async getWorkforceData(
        companyId: string,
        startDate: string,
        endDate: string,
        branchId?: string,
        departmentId?: string,
    ): Promise<WorkforceData> {
        const userWhereClause: any = {
            companyId,
            role: 'EMPLOYEE',
            status: 'ACTIVE',
        };

        if (branchId) {
            userWhereClause.branchId = branchId;
        }

        if (departmentId) {
            userWhereClause.departmentId = departmentId;
        }

        // Get employee data
        const [staffCount, salaryInfo, departmentGroups] = await Promise.all([
            this.prisma.user.count({ where: userWhereClause }),
            this.prisma.user.aggregate({
                where: userWhereClause,
                _avg: { salary: true },
                _sum: { salary: true },
            }),
            this.prisma.user.groupBy({
                by: ['departmentId'],
                where: userWhereClause,
                _count: { id: true },
                _sum: { salary: true },
            }),
        ]);

        // Get attendance data
        const attendanceWhereClause: any = {
            companyId,
            date: {
                gte: new Date(startDate),
                lte: new Date(endDate),
            },
        };

        if (branchId) {
            attendanceWhereClause.user = { branchId };
        }

        if (departmentId) {
            attendanceWhereClause.user = { ...attendanceWhereClause.user, departmentId };
        }

        const [attendanceRecords, overtimeData] = await Promise.all([
            this.prisma.attendance.count({ where: attendanceWhereClause }),
            this.prisma.attendance.aggregate({
                where: {
                    ...attendanceWhereClause,
                    overtimeMinutes: { gt: 0 },
                },
                _sum: { overtimeMinutes: true },
            }),
        ]);

        // Calculate attendance rate
        const dateRange = Math.ceil(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24),
        );
        const expectedAttendance = staffCount * dateRange;
        const attendanceRate = expectedAttendance > 0 ? (attendanceRecords / expectedAttendance) * 100 : 0;

        // Calculate overtime
        const totalOvertimeMinutes = Number(overtimeData._sum?.overtimeMinutes) || 0;
        const totalOvertimeHours = totalOvertimeMinutes / 60;
        const avgSalary = Number(salaryInfo._avg?.salary) || 0;
        const avgHourlySalary = avgSalary / 176; // Assuming 176 working hours/month
        const overtimeRate = 1.5; // Overtime is typically 1.5x
        const totalOvertimeCost = totalOvertimeHours * avgHourlySalary * overtimeRate;

        // Calculate absenteeism cost
        const absentDays = expectedAttendance - attendanceRecords;
        const avgDailySalary = avgSalary / 22; // Assuming 22 working days/month
        const absenteeismCost = absentDays * avgDailySalary;

        // Get department costs
        const departmentCosts = await Promise.all(
            departmentGroups.map(async (dept) => {
                let departmentName = 'غير محدد';
                if (dept.departmentId) {
                    const department = await this.prisma.department.findUnique({
                        where: { id: dept.departmentId },
                        select: { name: true },
                    });
                    departmentName = department?.name || 'غير معروف';
                }

                const deptOvertimeData = await this.prisma.attendance.aggregate({
                    where: {
                        companyId,
                        user: { departmentId: dept.departmentId },
                        date: {
                            gte: new Date(startDate),
                            lte: new Date(endDate),
                        },
                        overtimeMinutes: { gt: 0 },
                    },
                    _sum: { overtimeMinutes: true },
                });

                const countValue = typeof dept._count === 'object' ? (dept._count as any).id : dept._count;
                const sumValue = typeof dept._sum === 'object' ? Number((dept._sum as any).salary) : 0;

                return {
                    departmentId: dept.departmentId || 'unassigned',
                    departmentName,
                    employeeCount: countValue || 0,
                    totalCost: sumValue || 0,
                    overtimeHours: (Number(deptOvertimeData._sum?.overtimeMinutes) || 0) / 60,
                };
            }),
        );

        return {
            totalEmployees: staffCount,
            averageSalary: avgSalary,
            totalOvertimeHours,
            totalOvertimeCost,
            departmentCosts,
            attendanceRate,
            absenteeismCost,
        };
    }

    /**
     * Generate AI-powered optimization recommendations
     */
    private async generateAIOptimizations(
        workforceData: WorkforceData,
        dto: GenerateCostOptimizationDto,
    ): Promise<AIOptimizationResponse> {
        if (!this.aiService.isAvailable()) {
            this.logger.warn('AI service not available, using fallback recommendations');
            return this.generateFallbackRecommendations(workforceData);
        }

        const prompt = this.buildOptimizationPrompt(workforceData, dto);
        const systemInstruction = `أنت محلل تكاليف قوى عاملة خبير. قدم توصيات تحسين تكاليف دقيقة ومفصلة بناءً على البيانات المقدمة.
استجب بتنسيق JSON فقط دون أي نص إضافي.`;

        try {
            const aiResponse = await this.aiService.generateContent(prompt, systemInstruction);
            return this.aiService.parseJsonResponse<AIOptimizationResponse>(aiResponse);
        } catch (error) {
            this.logger.error(`AI optimization generation failed: ${error.message}`);
            return this.generateFallbackRecommendations(workforceData);
        }
    }

    /**
     * Build prompt for AI optimization analysis
     */
    private buildOptimizationPrompt(
        workforceData: WorkforceData,
        dto: GenerateCostOptimizationDto,
    ): string {
        const optimizationTypesFilter = dto.optimizationTypes?.length
            ? `ركز على أنواع التحسين التالية: ${dto.optimizationTypes.join(', ')}`
            : 'قدم توصيات لجميع أنواع التحسين الممكنة';

        return `
قم بتحليل بيانات القوى العاملة التالية وقدم توصيات لتحسين التكاليف:

**بيانات القوى العاملة:**
- إجمالي الموظفين: ${workforceData.totalEmployees}
- متوسط الراتب: ${workforceData.averageSalary.toFixed(2)} ريال
- إجمالي ساعات العمل الإضافي: ${workforceData.totalOvertimeHours.toFixed(2)} ساعة
- تكلفة العمل الإضافي: ${workforceData.totalOvertimeCost.toFixed(2)} ريال
- معدل الحضور: ${workforceData.attendanceRate.toFixed(2)}%
- تكلفة الغياب: ${workforceData.absenteeismCost.toFixed(2)} ريال

**تكاليف الأقسام:**
${workforceData.departmentCosts.map((d) => `- ${d.departmentName}: ${d.employeeCount} موظف، تكلفة ${d.totalCost.toFixed(2)} ريال، عمل إضافي ${d.overtimeHours.toFixed(2)} ساعة`).join('\n')}

**فترة التحليل:**
- من: ${dto.startDate}
- إلى: ${dto.endDate}

**متطلبات التحليل:**
${optimizationTypesFilter}

قدم توصيات تتضمن:
1. عنوان ووصف واضح لكل توصية
2. التكلفة الحالية والتكلفة المحسنة المتوقعة
3. التوفير المحتمل ونسبته
4. الأولوية (1-4، حيث 4 هي الأعلى)
5. خطوات التنفيذ والمتطلبات
6. المخاطر المحتملة

استخدم التنسيق التالي:
{
    "recommendations": [
        {
            "title": "عنوان التوصية",
            "description": "وصف تفصيلي",
            "optimizationType": "SCHEDULE_ADJUSTMENT|HEADCOUNT_CHANGE|SHIFT_RESTRUCTURE|OVERTIME_REDUCTION|COST_SAVING",
            "currentCost": number,
            "optimizedCost": number,
            "potentialSavings": number,
            "savingsPercentage": number,
            "priority": 1-4,
            "recommendations": "خطوات التنفيذ التفصيلية",
            "requirements": "المتطلبات",
            "risks": "المخاطر المحتملة",
            "analysisData": {
                "affectedEmployees": number,
                "implementationTimeline": "string",
                "expectedROI": number
            }
        }
    ],
    "insights": ["رؤية 1", "رؤية 2", ...]
}
`;
    }

    /**
     * Fallback recommendations when AI is not available
     */
    private generateFallbackRecommendations(workforceData: WorkforceData): AIOptimizationResponse {
        const recommendations: AIOptimizationResponse['recommendations'] = [];
        const insights: string[] = [];

        // Overtime reduction recommendation
        if (workforceData.totalOvertimeHours > 100) {
            const potentialSavings = workforceData.totalOvertimeCost * 0.3;
            recommendations.push({
                title: 'تقليل ساعات العمل الإضافي',
                description: 'تحسين جدولة المناوبات لتقليل الاعتماد على العمل الإضافي',
                optimizationType: 'OVERTIME_REDUCTION',
                currentCost: workforceData.totalOvertimeCost,
                optimizedCost: workforceData.totalOvertimeCost * 0.7,
                potentialSavings,
                savingsPercentage: 30,
                priority: 3,
                recommendations: '1. مراجعة جداول المناوبات الحالية\n2. تحديد الفترات ذات العمل الإضافي العالي\n3. إعادة توزيع الأعمال على الموظفين\n4. توظيف موظفين إضافيين للفترات المزدحمة',
                requirements: 'تحليل بيانات المناوبات، موافقة الإدارة',
                risks: 'قد يتطلب توظيف إضافي مؤقت',
                analysisData: {
                    affectedEmployees: Math.ceil(workforceData.totalEmployees * 0.3),
                    implementationTimeline: '2-4 أسابيع',
                    expectedROI: potentialSavings * 12,
                },
            });
            insights.push(`ساعات العمل الإضافي مرتفعة (${workforceData.totalOvertimeHours.toFixed(0)} ساعة) - يوصى بتحسين الجدولة`);
        }

        // Attendance improvement recommendation
        if (workforceData.attendanceRate < 90) {
            const potentialSavings = workforceData.absenteeismCost * 0.4;
            recommendations.push({
                title: 'تحسين معدل الحضور',
                description: 'تنفيذ برامج لتحسين الالتزام وتقليل الغياب',
                optimizationType: 'COST_SAVING',
                currentCost: workforceData.absenteeismCost,
                optimizedCost: workforceData.absenteeismCost * 0.6,
                potentialSavings,
                savingsPercentage: 40,
                priority: 4,
                recommendations: '1. تطبيق نظام مكافآت الالتزام\n2. مراجعة سياسات الإجازات\n3. تحسين بيئة العمل\n4. متابعة أسباب الغياب المتكرر',
                requirements: 'نظام متابعة الحضور، ميزانية للمكافآت',
                risks: 'قد يحتاج وقتاً لرؤية النتائج',
                analysisData: {
                    affectedEmployees: workforceData.totalEmployees,
                    implementationTimeline: '1-3 أشهر',
                    expectedROI: potentialSavings * 12,
                },
            });
            insights.push(`معدل الحضور منخفض (${workforceData.attendanceRate.toFixed(1)}%) - يوصى ببرامج تحسين الالتزام`);
        }

        // Department optimization recommendation
        const highCostDepartments = workforceData.departmentCosts.filter(
            (d) => d.overtimeHours > workforceData.totalOvertimeHours / workforceData.departmentCosts.length,
        );

        if (highCostDepartments.length > 0) {
            const avgDeptCost = workforceData.departmentCosts.reduce((sum, d) => sum + d.totalCost, 0) / workforceData.departmentCosts.length;
            const potentialSavings = highCostDepartments.reduce((sum, d) => sum + (d.totalCost - avgDeptCost) * 0.1, 0);

            recommendations.push({
                title: 'إعادة هيكلة الأقسام ذات التكلفة العالية',
                description: 'تحسين توزيع الموارد البشرية على الأقسام',
                optimizationType: 'SHIFT_RESTRUCTURE',
                currentCost: highCostDepartments.reduce((sum, d) => sum + d.totalCost, 0),
                optimizedCost: highCostDepartments.reduce((sum, d) => sum + d.totalCost, 0) * 0.9,
                potentialSavings: Math.max(potentialSavings, 0),
                savingsPercentage: 10,
                priority: 2,
                recommendations: `1. مراجعة هيكل الأقسام: ${highCostDepartments.map((d) => d.departmentName).join(', ')}\n2. تحليل الأعمال والمهام\n3. نقل الموظفين بين الأقسام حسب الحاجة`,
                requirements: 'موافقة مدراء الأقسام، خطة إعادة التوزيع',
                risks: 'مقاومة التغيير من الموظفين',
                analysisData: {
                    affectedEmployees: highCostDepartments.reduce((sum, d) => sum + d.employeeCount, 0),
                    implementationTimeline: '1-2 شهر',
                    expectedROI: Math.max(potentialSavings, 0) * 12,
                },
            });
        }

        // General cost saving recommendation
        const totalMonthlyCost = workforceData.totalEmployees * workforceData.averageSalary;
        recommendations.push({
            title: 'تحسين كفاءة التشغيل العامة',
            description: 'تطبيق أفضل الممارسات لتحسين الكفاءة التشغيلية',
            optimizationType: 'COST_SAVING',
            currentCost: totalMonthlyCost,
            optimizedCost: totalMonthlyCost * 0.95,
            potentialSavings: totalMonthlyCost * 0.05,
            savingsPercentage: 5,
            priority: 1,
            recommendations: '1. مراجعة العمليات الحالية\n2. أتمتة المهام المتكررة\n3. تدريب الموظفين على الكفاءة\n4. تطبيق معايير الجودة',
            requirements: 'تحليل العمليات، ميزانية للتدريب',
            risks: 'يتطلب التزاماً طويل المدى',
            analysisData: {
                affectedEmployees: workforceData.totalEmployees,
                implementationTimeline: '3-6 أشهر',
                expectedROI: totalMonthlyCost * 0.05 * 12,
            },
        });

        if (insights.length === 0) {
            insights.push('تحليل أولي للتكاليف - يوصى بجمع المزيد من البيانات للحصول على توصيات أدق');
        }

        return { recommendations, insights };
    }

    /**
     * Save recommendations to database
     */
    private async saveRecommendations(
        companyId: string,
        branchId: string | undefined,
        departmentId: string | undefined,
        recommendations: AIOptimizationResponse['recommendations'],
    ): Promise<CostOptimizationRecommendationDto[]> {
        const savedRecommendations: CostOptimizationRecommendationDto[] = [];

        for (const rec of recommendations) {
            const created = await this.prisma.costOptimization.create({
                data: {
                    companyId,
                    branchId,
                    departmentId,
                    title: rec.title,
                    description: rec.description,
                    optimizationType: rec.optimizationType as any,
                    status: 'PENDING',
                    currentCost: rec.currentCost,
                    optimizedCost: rec.optimizedCost,
                    potentialSavings: rec.potentialSavings,
                    savingsPercentage: rec.savingsPercentage,
                    priority: rec.priority,
                    analysisData: rec.analysisData,
                    recommendations: rec.recommendations,
                    requirements: rec.requirements,
                    risks: rec.risks,
                },
            });

            savedRecommendations.push(this.mapToResponse(created));
        }

        return savedRecommendations;
    }

    /**
     * Calculate summary from recommendations
     */
    private calculateSummary(
        recommendations: CostOptimizationRecommendationDto[],
    ): AIOptimizationAnalysisDto['summary'] {
        let totalCurrentCost = 0;
        let totalOptimizedCost = 0;
        let totalPotentialSavings = 0;

        for (const rec of recommendations) {
            totalCurrentCost += rec.currentCost;
            totalOptimizedCost += rec.optimizedCost;
            totalPotentialSavings += rec.potentialSavings;
        }

        const overallSavingsPercentage =
            totalCurrentCost > 0 ? (totalPotentialSavings / totalCurrentCost) * 100 : 0;

        return {
            totalCurrentCost,
            totalOptimizedCost,
            totalPotentialSavings,
            overallSavingsPercentage: Math.round(overallSavingsPercentage * 100) / 100,
        };
    }

    /**
     * Map database model to response DTO
     */
    private mapToResponse(recommendation: any): CostOptimizationRecommendationDto {
        return {
            id: recommendation.id,
            companyId: recommendation.companyId,
            branchId: recommendation.branchId,
            departmentId: recommendation.departmentId,
            title: recommendation.title,
            description: recommendation.description,
            optimizationType: recommendation.optimizationType as OptimizationType,
            status: recommendation.status as OptimizationStatus,
            currentCost: Number(recommendation.currentCost),
            optimizedCost: Number(recommendation.optimizedCost),
            potentialSavings: Number(recommendation.potentialSavings),
            savingsPercentage: Number(recommendation.savingsPercentage),
            priority: recommendation.priority,
            analysisData: recommendation.analysisData as Record<string, any>,
            recommendations: recommendation.recommendations,
            requirements: recommendation.requirements,
            risks: recommendation.risks,
            createdAt: recommendation.createdAt,
            updatedAt: recommendation.updatedAt,
        };
    }
}
