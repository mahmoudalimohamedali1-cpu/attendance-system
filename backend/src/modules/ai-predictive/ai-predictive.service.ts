import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { MlTrainingService } from './services/ml-training.service';
import { AbsencePredictionService } from './services/absence-prediction.service';
import { PatternDetectionService } from './services/pattern-detection.service';
import { ExplainabilityService } from './services/explainability.service';

@Injectable()
export class AiPredictiveService {
    private readonly logger = new Logger(AiPredictiveService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly aiService: AiService,
        private readonly mlTrainingService: MlTrainingService,
        private readonly absencePredictionService: AbsencePredictionService,
        private readonly patternDetectionService: PatternDetectionService,
        private readonly explainabilityService: ExplainabilityService,
    ) { }

    /**
     * 📊 توقع الحضور المستقبلي
     */
    async forecastAttendance(companyId: string, days: number = 7): Promise<{
        period: string;
        expectedAttendanceRate: number;
        expectedAbsences: number;
        riskDays: string[];
        insights: string[];
    }> {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // جلب بيانات الحضور التاريخية
        const [employees, historicalAttendance] = await Promise.all([
            this.prisma.user.count({
                where: { companyId, status: 'ACTIVE', role: 'EMPLOYEE' },
            }),
            this.prisma.attendance.findMany({
                where: {
                    user: { companyId },
                    date: { gte: thirtyDaysAgo },
                },
            }),
        ]);

        // حساب معدل الحضور التاريخي
        const totalRecords = historicalAttendance.length || 1;
        const presentRecords = historicalAttendance.filter((a: any) =>
            a.status === 'PRESENT' || a.status === 'LATE'
        ).length;
        const historicalRate = (presentRecords / totalRecords) * 100;

        // تحليل أيام الأسبوع
        const dayAbsenceRate: Record<number, number> = {};
        for (const record of historicalAttendance) {
            const att = record as any;
            const dayOfWeek = new Date(att.date).getDay();
            if (att.status === 'ABSENT') {
                dayAbsenceRate[dayOfWeek] = (dayAbsenceRate[dayOfWeek] || 0) + 1;
            }
        }

        // تحديد أيام المخاطر
        const days_ar = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const riskDays = Object.entries(dayAbsenceRate)
            .filter(([_, count]) => count > 2)
            .map(([day]) => days_ar[parseInt(day)]);

        // التوقعات
        const expectedAttendanceRate = Math.round(historicalRate * 0.95); // تقدير متحفظ
        const expectedAbsences = Math.round(employees * (1 - expectedAttendanceRate / 100) * days);

        // الرؤى
        const insights: string[] = [];
        if (expectedAttendanceRate < 85) {
            insights.push('⚠️ توقع انخفاض في الحضور');
        }
        if (riskDays.length > 0) {
            insights.push(`📅 أيام ذات غياب مرتفع: ${riskDays.join(', ')}`);
        }

        return {
            period: `${days} أيام القادمة`,
            expectedAttendanceRate,
            expectedAbsences,
            riskDays,
            insights: insights.length > 0 ? insights : ['✅ توقعات حضور مستقرة'],
        };
    }

    /**
     * 🚪 توقع معدل الدوران (الاستقالات)
     */
    async predictTurnover(companyId: string): Promise<{
        riskLevel: 'low' | 'medium' | 'high';
        atRiskEmployees: { name: string; riskFactors: string[] }[];
        recommendations: string[];
    }> {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const employees = await this.prisma.user.findMany({
            where: { companyId, status: 'ACTIVE', role: 'EMPLOYEE' },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                hireDate: true,
                salary: true,
            },
            take: 30,
        });

        const atRiskEmployees: { name: string; riskFactors: string[] }[] = [];

        for (const emp of employees) {
            const riskFactors: string[] = [];

            // 1. موظفين جدد (أقل من 6 أشهر)
            if (emp.hireDate) {
                const monthsOfService = Math.floor(
                    (Date.now() - new Date(emp.hireDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
                );
                if (monthsOfService < 6) {
                    riskFactors.push('موظف جديد');
                }
            }

            // 2. غياب متكرر
            const absentCount = await this.prisma.attendance.count({
                where: {
                    userId: emp.id,
                    date: { gte: sixMonthsAgo },
                    status: 'ABSENT',
                },
            });

            if (absentCount >= 10) {
                riskFactors.push('غياب متكرر');
            }

            // 3. لم يحصل على إجازة
            const leaveCount = await this.prisma.leaveRequest.count({
                where: {
                    userId: emp.id,
                    status: 'APPROVED',
                    createdAt: { gte: sixMonthsAgo },
                },
            });

            if (leaveCount === 0) {
                riskFactors.push('لم يأخذ إجازة');
            }

            if (riskFactors.length >= 2) {
                atRiskEmployees.push({
                    name: `${emp.firstName} ${emp.lastName}`,
                    riskFactors,
                });
            }
        }

        // تحديد مستوى المخاطر
        const riskPercentage = (atRiskEmployees.length / employees.length) * 100;
        const riskLevel: 'low' | 'medium' | 'high' =
            riskPercentage >= 30 ? 'high' : riskPercentage >= 15 ? 'medium' : 'low';

        // التوصيات
        const recommendations: string[] = [];
        if (riskLevel !== 'low') {
            recommendations.push('🗣️ إجراء استطلاع رضا الموظفين');
            recommendations.push('💰 مراجعة سياسات التعويضات');
        }
        if (atRiskEmployees.length > 0) {
            recommendations.push('👥 اجتماعات فردية مع الموظفين المعرضين للخطر');
        }

        return {
            riskLevel,
            atRiskEmployees: atRiskEmployees.slice(0, 5),
            recommendations: recommendations.length > 0 ? recommendations : ['✅ معدل دوران منخفض'],
        };
    }

    /**
     * 💰 توقع التكاليف
     */
    async forecastCosts(companyId: string): Promise<{
        currentMonthlyPayroll: number;
        projectedNextMonth: number;
        potentialSavings: string[];
        budgetAlerts: string[];
    }> {
        const employees = await this.prisma.user.findMany({
            where: { companyId, status: 'ACTIVE' },
            select: { salary: true },
        });

        const currentMonthlyPayroll = employees.reduce((sum, e) => sum + Number(e.salary || 0), 0);

        // التوقعات (افتراض 2% زيادة)
        const projectedNextMonth = Math.round(currentMonthlyPayroll * 1.02);

        // فرص التوفير
        const potentialSavings: string[] = [];
        if (employees.length > 20) {
            potentialSavings.push('📊 مراجعة هيكل الرواتب للكفاءة');
        }

        // تنبيهات الميزانية
        const budgetAlerts: string[] = [];
        if (currentMonthlyPayroll > 500000) {
            budgetAlerts.push('💰 إجمالي الرواتب مرتفع');
        }

        return {
            currentMonthlyPayroll,
            projectedNextMonth,
            potentialSavings: potentialSavings.length > 0 ? potentialSavings : ['✅ لا توجد فرص توفير واضحة'],
            budgetAlerts: budgetAlerts.length > 0 ? budgetAlerts : ['✅ الميزانية ضمن الحدود'],
        };
    }

    /**
     * 🤖 توقعات AI شاملة
     */
    async getAiPredictions(companyId: string): Promise<string> {
        try {
            const [attendance, turnover, costs] = await Promise.all([
                this.forecastAttendance(companyId),
                this.predictTurnover(companyId),
                this.forecastCosts(companyId),
            ]);

            const prompt = `أنت محلل بيانات ذكي. بناءً على البيانات التالية، قدم 3 توقعات مختصرة للأسبوع القادم:

📊 توقعات الحضور:
- نسبة الحضور المتوقعة: ${attendance.expectedAttendanceRate}%
- الغياب المتوقع: ${attendance.expectedAbsences} يوم

🚪 معدل الدوران:
- مستوى المخاطر: ${turnover.riskLevel}
- موظفين معرضين للخطر: ${turnover.atRiskEmployees.length}

💰 التكاليف:
- راتب الشهر الحالي: ${costs.currentMonthlyPayroll.toLocaleString('ar-SA')} ريال
- المتوقع الشهر القادم: ${costs.projectedNextMonth.toLocaleString('ar-SA')} ريال

قدم توقعات عملية ومختصرة بالعربية:`;

            return await this.aiService.generateContent(prompt);
        } catch (error) {
            this.logger.error(`AI predictions error: ${error.message}`);
            return '❌ لم نتمكن من تحليل التوقعات حالياً';
        }
    }

    /**
     * 🎯 الحصول على توقعات غياب الموظفين
     */
    async getEmployeeAbsencePredictions(companyId: string, targetDate?: Date): Promise<{
        success: boolean;
        predictions: any[];
        count: number;
        generatedAt: Date;
    }> {
        try {
            this.logger.log(`Getting employee absence predictions for company: ${companyId}`);

            const predictions = await this.absencePredictionService.predictAllEmployees(
                companyId,
                targetDate || new Date(),
            );

            return {
                success: true,
                predictions,
                count: predictions.length,
                generatedAt: new Date(),
            };
        } catch (error) {
            this.logger.error(`Error getting employee predictions: ${error.message}`);
            throw error;
        }
    }

    /**
     * 🎯 الحصول على توقع غياب موظف محدد مع الشرح
     */
    async getEmployeePredictionWithExplanation(userId: string, companyId: string, targetDate?: Date): Promise<{
        success: boolean;
        prediction: any;
        explanation: any;
        generatedAt: Date;
    }> {
        try {
            this.logger.log(`Getting employee prediction with explanation for user: ${userId}`);

            // الحصول على توقع الموظف
            const prediction = await this.absencePredictionService.predictEmployeeAbsence(
                userId,
                companyId,
                targetDate || new Date(),
            );

            // توليد الشرح
            const explanation = await this.explainabilityService.explainPrediction(prediction);

            return {
                success: true,
                prediction,
                explanation,
                generatedAt: new Date(),
            };
        } catch (error) {
            this.logger.error(`Error getting employee prediction with explanation: ${error.message}`);
            throw error;
        }
    }

    /**
     * 🔍 الحصول على الأنماط المكتشفة
     */
    async getAbsencePatterns(companyId: string, patternType?: string, limit: number = 20): Promise<{
        success: boolean;
        patterns: any[];
        count: number;
        detectedAt: Date;
    }> {
        try {
            this.logger.log(`Getting absence patterns for company: ${companyId}`);

            let patterns;
            if (patternType) {
                patterns = await this.patternDetectionService.getPatternsByType(companyId, patternType);
            } else {
                patterns = await this.patternDetectionService.getStoredPatterns(companyId, limit);
            }

            // إذا لم تكن هناك أنماط محفوظة، قم بالكشف عن أنماط جديدة
            if (!patterns || patterns.length === 0) {
                this.logger.log('No stored patterns found, detecting new patterns...');
                patterns = await this.patternDetectionService.detectAllPatterns(companyId);
            }

            return {
                success: true,
                patterns,
                count: patterns.length,
                detectedAt: new Date(),
            };
        } catch (error) {
            this.logger.error(`Error getting absence patterns: ${error.message}`);
            throw error;
        }
    }

    /**
     * 🤖 تدريب نموذج التعلم الآلي
     */
    async trainModel(companyId: string) {
        try {
            this.logger.log(`Training ML model for company: ${companyId}`);

            const result = await this.mlTrainingService.trainModel(companyId);

            return {
                success: result.success,
                message: result.message,
                modelVersion: result.modelVersion,
                accuracy: result.accuracy,
                trainedAt: new Date(),
            };
        } catch (error) {
            this.logger.error(`Error training model: ${error.message}`);
            throw error;
        }
    }

    /**
     * 📊 الحصول على دقة النموذج
     */
    async getModelAccuracy(companyId: string) {
        try {
            this.logger.log(`Getting model accuracy for company: ${companyId}`);

            const accuracy = await this.mlTrainingService.getLatestAccuracy(companyId);

            if (!accuracy) {
                return {
                    success: false,
                    message: 'لم يتم تدريب النموذج بعد',
                    accuracy: null,
                };
            }

            return {
                success: true,
                accuracy: accuracy.accuracy,
                precision: accuracy.precision,
                recall: accuracy.recall,
                f1Score: accuracy.f1Score,
                modelVersion: accuracy.modelVersion,
                evaluatedAt: accuracy.evaluatedAt,
            };
        } catch (error) {
            this.logger.error(`Error getting model accuracy: ${error.message}`);
            throw error;
        }
    }

    /**
     * 💡 الحصول على التوصيات
     */
    async getRecommendations(companyId: string) {
        try {
            this.logger.log(`Getting recommendations for company: ${companyId}`);

            // الحصول على توقعات الموظفين
            const predictions = await this.absencePredictionService.predictAllEmployees(
                companyId,
                new Date(),
            );

            // توليد شرح شامل مع التوصيات
            const explanation = await this.explainabilityService.explainBatchPredictions(
                predictions,
            );

            // الحصول على الأنماط
            const patterns = await this.patternDetectionService.getStoredPatterns(companyId, 5);

            // توليد توصيات إضافية بناءً على الأنماط
            const patternRecommendations: string[] = [];
            if (patterns && patterns.length > 0) {
                for (const pattern of patterns) {
                    if (pattern.insights && pattern.insights.length > 0) {
                        patternRecommendations.push(...pattern.insights);
                    }
                }
            }

            return {
                success: true,
                overview: explanation.overview,
                insights: explanation.insights,
                recommendations: patternRecommendations.slice(0, 5),
                riskDistribution: {
                    high: explanation.highRiskCount,
                    medium: explanation.mediumRiskCount,
                    low: explanation.lowRiskCount,
                },
            };
        } catch (error) {
            this.logger.error(`Error getting recommendations: ${error.message}`);
            throw error;
        }
    }
}
