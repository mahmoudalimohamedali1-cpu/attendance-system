import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { MlTrainingService } from './ml-training.service';
import { RiskLevel } from '@prisma/client';

/**
 * 🎯 Absence Prediction Service
 *
 * Predicts absence likelihood for individual employees using
 * ML model coefficients and employee-specific risk factors.
 *
 * Features:
 * - Per-employee absence likelihood scoring (0-100)
 * - Risk level classification (LOW/MEDIUM/HIGH)
 * - Contributing factors identification
 * - Historical pattern analysis
 * - Department comparison
 * - Prediction persistence
 */

interface EmployeePrediction {
    userId: string;
    employeeName: string;
    absenceLikelihood: number; // 0-100
    riskLevel: RiskLevel;
    contributingFactors: string[];
    departmentComparison?: string;
    predictionDate: Date;
}

@Injectable()
export class AbsencePredictionService {
    private readonly logger = new Logger(AbsencePredictionService.name);

    // فترة تحليل البيانات الأخيرة (بالأيام)
    private readonly RECENT_PERIOD_DAYS = 30;
    private readonly ANALYSIS_PERIOD_DAYS = 90;

    // حدود تصنيف المخاطر
    private readonly RISK_THRESHOLDS = {
        LOW: 30,
        MEDIUM: 60,
        HIGH: 100,
    };

    constructor(
        private readonly prisma: PrismaService,
        private readonly mlTrainingService: MlTrainingService,
    ) {}

    /**
     * 📊 توقع احتمالية الغياب لموظف واحد
     */
    async predictEmployeeAbsence(
        userId: string,
        companyId: string,
        targetDate?: Date,
    ): Promise<EmployeePrediction | null> {
        try {
            // 1. جلب بيانات الموظف
            const employee = await this.prisma.user.findFirst({
                where: {
                    id: userId,
                    companyId,
                    status: 'ACTIVE',
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    hireDate: true,
                    departmentId: true,
                    remainingLeaveDays: true,
                },
            });

            if (!employee) {
                this.logger.warn(`Employee ${userId} not found or not active`);
                return null;
            }

            // 2. الحصول على معاملات النموذج
            const modelCoefficients = await this.mlTrainingService.getModelCoefficients(companyId);
            if (!modelCoefficients) {
                this.logger.warn(`No trained model found for company ${companyId}`);
                return null;
            }

            // 3. حساب عوامل المخاطر
            const riskFactors = await this.calculateRiskFactors(
                employee,
                modelCoefficients,
                targetDate || new Date(),
            );

            // 4. حساب درجة احتمالية الغياب (0-100)
            const absenceLikelihood = this.calculateAbsenceLikelihood(riskFactors);

            // 5. تحديد مستوى المخاطر
            const riskLevel = this.classifyRiskLevel(absenceLikelihood);

            // 6. تحديد العوامل المساهمة
            const contributingFactors = this.identifyContributingFactors(riskFactors, employee);

            // 7. مقارنة مع القسم
            const departmentComparison = await this.getDepartmentComparison(
                employee.departmentId,
                absenceLikelihood,
                companyId,
            );

            const prediction: EmployeePrediction = {
                userId: employee.id,
                employeeName: `${employee.firstName} ${employee.lastName}`,
                absenceLikelihood: Math.round(absenceLikelihood),
                riskLevel,
                contributingFactors,
                departmentComparison,
                predictionDate: targetDate || new Date(),
            };

            // 8. حفظ التوقع في قاعدة البيانات
            await this.savePrediction(prediction, companyId);

            return prediction;
        } catch (error) {
            this.logger.error(`Error predicting absence for employee ${userId}:`, error);
            throw error;
        }
    }

    /**
     * 📊 توقع احتمالية الغياب لجميع الموظفين
     */
    async predictAllEmployees(
        companyId: string,
        targetDate?: Date,
    ): Promise<EmployeePrediction[]> {
        try {
            const employees = await this.prisma.user.findMany({
                where: {
                    companyId,
                    status: 'ACTIVE',
                    role: 'EMPLOYEE',
                },
                select: { id: true },
            });

            const predictions: EmployeePrediction[] = [];

            for (const employee of employees) {
                const prediction = await this.predictEmployeeAbsence(
                    employee.id,
                    companyId,
                    targetDate,
                );
                if (prediction) {
                    predictions.push(prediction);
                }
            }

            // ترتيب حسب احتمالية الغياب (الأعلى أولاً)
            return predictions.sort((a, b) => b.absenceLikelihood - a.absenceLikelihood);
        } catch (error) {
            this.logger.error(`Error predicting absences for all employees:`, error);
            throw error;
        }
    }

    /**
     * 🔍 حساب عوامل المخاطر للموظف
     */
    private async calculateRiskFactors(
        employee: any,
        modelCoefficients: any,
        targetDate: Date,
    ): Promise<{
        historicalAbsenceRate: number;
        dayOfWeekRisk: number;
        recentTrend: number;
        leaveBalanceRisk: number;
        tenureRisk: number;
        monthlyRisk: number;
    }> {
        const analysisStartDate = new Date(targetDate);
        analysisStartDate.setDate(analysisStartDate.getDate() - this.ANALYSIS_PERIOD_DAYS);

        const recentStartDate = new Date(targetDate);
        recentStartDate.setDate(recentStartDate.getDate() - this.RECENT_PERIOD_DAYS);

        // جلب سجلات الحضور للموظف
        const [historicalRecords, recentRecords] = await Promise.all([
            this.prisma.attendance.findMany({
                where: {
                    userId: employee.id,
                    date: {
                        gte: analysisStartDate,
                        lt: targetDate,
                    },
                },
            }),
            this.prisma.attendance.findMany({
                where: {
                    userId: employee.id,
                    date: {
                        gte: recentStartDate,
                        lt: targetDate,
                    },
                },
            }),
        ]);

        // 1. معدل الغياب التاريخي
        const totalHistorical = historicalRecords.length;
        const absentHistorical = historicalRecords.filter((r) => r.status === 'ABSENT').length;
        const historicalAbsenceRate =
            totalHistorical > 0 ? absentHistorical / totalHistorical : modelCoefficients.globalAbsenceRate;

        // 2. مخاطر يوم الأسبوع
        const dayOfWeek = targetDate.getDay();
        const dayOfWeekRisk =
            modelCoefficients.dayOfWeekRates[dayOfWeek] || modelCoefficients.globalAbsenceRate;

        // 3. الاتجاه الأخير (هل الغيابات تزيد أم تنقص؟)
        const totalRecent = recentRecords.length;
        const absentRecent = recentRecords.filter((r) => r.status === 'ABSENT').length;
        const recentAbsenceRate = totalRecent > 0 ? absentRecent / totalRecent : historicalAbsenceRate;
        const recentTrend = recentAbsenceRate - historicalAbsenceRate; // يمكن أن تكون موجبة أو سالبة

        // 4. مخاطر رصيد الإجازات (إذا كان الرصيد منخفض، قد يغيب بدون إجازة)
        const leaveBalance = Number(employee.remainingLeaveDays || 0);
        const leaveBalanceRisk = leaveBalance < 5 ? 0.15 : leaveBalance < 10 ? 0.05 : 0;

        // 5. مخاطر الخدمة (الموظفين الجدد قد يكونوا أكثر عرضة للغياب)
        let tenureRisk = 0;
        if (employee.hireDate) {
            const monthsOfService = Math.floor(
                (targetDate.getTime() - new Date(employee.hireDate).getTime()) / (1000 * 60 * 60 * 24 * 30),
            );
            if (monthsOfService < modelCoefficients.riskFactors.newEmployeeThreshold) {
                tenureRisk = 0.1;
            }
        }

        // 6. مخاطر شهرية (الاتجاهات الموسمية)
        const month = targetDate.getMonth() + 1;
        const monthlyRisk = modelCoefficients.monthlyRates[month] || modelCoefficients.globalAbsenceRate;

        return {
            historicalAbsenceRate,
            dayOfWeekRisk,
            recentTrend,
            leaveBalanceRisk,
            tenureRisk,
            monthlyRisk,
        };
    }

    /**
     * 🎯 حساب درجة احتمالية الغياب (0-100)
     */
    private calculateAbsenceLikelihood(riskFactors: {
        historicalAbsenceRate: number;
        dayOfWeekRisk: number;
        recentTrend: number;
        leaveBalanceRisk: number;
        tenureRisk: number;
        monthlyRisk: number;
    }): number {
        // الأوزان لكل عامل (مجموعها = 1.0)
        const weights = {
            historical: 0.35, // الأهم
            dayOfWeek: 0.20,
            recent: 0.20,
            leaveBalance: 0.10,
            tenure: 0.05,
            monthly: 0.10,
        };

        // حساب الدرجة الموزونة
        const weightedScore =
            riskFactors.historicalAbsenceRate * weights.historical +
            riskFactors.dayOfWeekRisk * weights.dayOfWeek +
            Math.max(0, riskFactors.recentTrend) * weights.recent + // فقط الاتجاهات الإيجابية (الزيادة)
            riskFactors.leaveBalanceRisk * weights.leaveBalance +
            riskFactors.tenureRisk * weights.tenure +
            riskFactors.monthlyRisk * weights.monthly;

        // تحويل إلى نطاق 0-100
        const likelihood = Math.min(100, Math.max(0, weightedScore * 100));

        return likelihood;
    }

    /**
     * 🏷️ تصنيف مستوى المخاطر
     */
    private classifyRiskLevel(absenceLikelihood: number): RiskLevel {
        if (absenceLikelihood >= this.RISK_THRESHOLDS.MEDIUM) {
            return RiskLevel.HIGH;
        } else if (absenceLikelihood >= this.RISK_THRESHOLDS.LOW) {
            return RiskLevel.MEDIUM;
        } else {
            return RiskLevel.LOW;
        }
    }

    /**
     * 📋 تحديد العوامل المساهمة في التوقع
     */
    private identifyContributingFactors(riskFactors: any, employee: any): string[] {
        const factors: string[] = [];

        // معدل غياب مرتفع
        if (riskFactors.historicalAbsenceRate > 0.2) {
            factors.push(
                `معدل غياب مرتفع: ${(riskFactors.historicalAbsenceRate * 100).toFixed(1)}%`,
            );
        }

        // يوم عالي المخاطر
        if (riskFactors.dayOfWeekRisk > 0.25) {
            const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
            const dayName = days[new Date().getDay()];
            factors.push(`${dayName} يوم عالي المخاطر للغياب`);
        }

        // اتجاه تصاعدي للغيابات
        if (riskFactors.recentTrend > 0.05) {
            factors.push('زيادة في الغيابات الأخيرة');
        }

        // رصيد إجازات منخفض
        if (riskFactors.leaveBalanceRisk > 0) {
            const leaveBalance = Number(employee.remainingLeaveDays || 0);
            factors.push(`رصيد إجازات منخفض: ${leaveBalance} يوم`);
        }

        // موظف جديد
        if (riskFactors.tenureRisk > 0) {
            factors.push('موظف جديد (أقل من 6 أشهر)');
        }

        // شهر عالي المخاطر
        if (riskFactors.monthlyRisk > 0.25) {
            factors.push('شهر يشهد غيابات مرتفعة عادة');
        }

        // إذا لم تكن هناك عوامل مخاطرة واضحة
        if (factors.length === 0) {
            factors.push('سجل حضور جيد');
        }

        return factors;
    }

    /**
     * 📊 مقارنة مع متوسط القسم
     */
    private async getDepartmentComparison(
        departmentId: string | null,
        employeeLikelihood: number,
        companyId: string,
    ): Promise<string | undefined> {
        if (!departmentId) {
            return undefined;
        }

        try {
            // جلب متوسط احتمالية الغياب للقسم
            const departmentPredictions = await this.prisma.absencePrediction.findMany({
                where: {
                    companyId,
                    user: { departmentId },
                    predictionDate: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // آخر 24 ساعة
                    },
                },
                select: { absenceLikelihood: true },
            });

            if (departmentPredictions.length === 0) {
                return undefined;
            }

            const avgLikelihood =
                departmentPredictions.reduce((sum, p) => sum + Number(p.absenceLikelihood), 0) /
                departmentPredictions.length;

            const difference = employeeLikelihood - avgLikelihood;

            if (Math.abs(difference) < 5) {
                return 'قريب من متوسط القسم';
            } else if (difference > 0) {
                return `أعلى من متوسط القسم بـ ${difference.toFixed(1)}%`;
            } else {
                return `أقل من متوسط القسم بـ ${Math.abs(difference).toFixed(1)}%`;
            }
        } catch (error) {
            this.logger.error('Error calculating department comparison:', error);
            return undefined;
        }
    }

    /**
     * 💾 حفظ التوقع في قاعدة البيانات
     */
    private async savePrediction(
        prediction: EmployeePrediction,
        companyId: string,
    ): Promise<void> {
        try {
            await this.prisma.absencePrediction.create({
                data: {
                    userId: prediction.userId,
                    companyId,
                    predictionDate: prediction.predictionDate,
                    absenceLikelihood: prediction.absenceLikelihood,
                    riskLevel: prediction.riskLevel,
                    contributingFactors: prediction.contributingFactors,
                },
            });
        } catch (error) {
            // لا نريد أن يفشل التوقع بسبب خطأ في الحفظ
            this.logger.error('Error saving prediction:', error);
        }
    }

    /**
     * 📜 الحصول على أحدث توقعات لموظف
     */
    async getEmployeePredictions(
        userId: string,
        limit: number = 10,
    ): Promise<any[]> {
        return this.prisma.absencePrediction.findMany({
            where: { userId },
            orderBy: { predictionDate: 'desc' },
            take: limit,
        });
    }

    /**
     * 📊 الحصول على توقعات الشركة الأخيرة
     */
    async getCompanyPredictions(
        companyId: string,
        limit: number = 50,
    ): Promise<any[]> {
        return this.prisma.absencePrediction.findMany({
            where: {
                companyId,
                predictionDate: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // آخر 24 ساعة
                },
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        departmentId: true,
                    },
                },
            },
            orderBy: { absenceLikelihood: 'desc' },
            take: limit,
        });
    }
}
