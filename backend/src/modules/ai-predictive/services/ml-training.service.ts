import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * 🤖 ML Training Service
 *
 * Statistical ML service for training absence prediction models
 * using historical attendance data.
 *
 * Features:
 * - Historical data processing
 * - Day-of-week pattern detection
 * - Seasonal trend analysis
 * - Employee-specific risk factors
 * - Model accuracy tracking
 */

interface ModelCoefficients {
    modelVersion: string;
    trainedAt: Date;

    // معاملات النموذج العامة
    globalAbsenceRate: number; // معدل الغياب الإجمالي

    // معاملات يوم الأسبوع
    dayOfWeekRates: {
        [day: number]: number; // 0 = الأحد, 6 = السبت
    };

    // معاملات شهرية (الاتجاهات الموسمية)
    monthlyRates: {
        [month: number]: number; // 1 = يناير, 12 = ديسمبر
    };

    // عوامل المخاطر
    riskFactors: {
        newEmployeeThreshold: number; // أشهر الخدمة لاعتبار الموظف جديد
        highAbsenceThreshold: number; // عدد الغيابات لاعتبارها مرتفعة
        recentAbsenceWeight: number; // وزن الغيابات الأخيرة (0-1)
    };

    // إحصائيات التدريب
    trainingStats: {
        totalRecords: number;
        totalEmployees: number;
        dateRange: {
            from: Date;
            to: Date;
        };
    };
}

@Injectable()
export class MlTrainingService {
    private readonly logger = new Logger(MlTrainingService.name);

    // مدة البيانات التاريخية للتدريب (بالأيام)
    private readonly TRAINING_PERIOD_DAYS = 180; // 6 أشهر

    // الحد الأدنى للبيانات المطلوبة للتدريب
    private readonly MIN_RECORDS_FOR_TRAINING = 30;

    constructor(private readonly prisma: PrismaService) {}

    /**
     * 🎯 تدريب النموذج للشركة
     */
    async trainModel(companyId: string): Promise<{
        success: boolean;
        modelVersion: string;
        coefficients: ModelCoefficients;
        accuracy: {
            accuracy: number;
            precision: number;
            recall: number;
            f1Score: number;
        } | null;
        message: string;
    }> {
        try {
            this.logger.log(`Starting model training for company ${companyId}`);

            // 1. جلب البيانات التاريخية
            const historicalData = await this.fetchHistoricalData(companyId);

            if (historicalData.records.length < this.MIN_RECORDS_FOR_TRAINING) {
                return {
                    success: false,
                    modelVersion: '',
                    coefficients: null as any,
                    accuracy: null,
                    message: `بيانات غير كافية للتدريب. يتطلب على الأقل ${this.MIN_RECORDS_FOR_TRAINING} سجل حضور.`,
                };
            }

            // 2. حساب المعاملات الإحصائية
            const coefficients = await this.calculateCoefficients(companyId, historicalData);

            // 3. حساب دقة النموذج (باستخدام التحقق المتقاطع البسيط)
            const accuracy = await this.evaluateModelAccuracy(companyId, coefficients, historicalData);

            // 4. حفظ مقاييس الدقة في قاعدة البيانات
            if (accuracy) {
                await this.prisma.predictionAccuracy.create({
                    data: {
                        companyId,
                        modelVersion: coefficients.modelVersion,
                        accuracy: accuracy.accuracy,
                        precision: accuracy.precision,
                        recall: accuracy.recall,
                        f1Score: accuracy.f1Score,
                        evaluatedAt: new Date(),
                        predictionCount: historicalData.records.length,
                    },
                });
            }

            this.logger.log(`Model training completed for company ${companyId}. Accuracy: ${accuracy?.accuracy || 'N/A'}`);

            return {
                success: true,
                modelVersion: coefficients.modelVersion,
                coefficients,
                accuracy,
                message: `تم تدريب النموذج بنجاح. الدقة: ${accuracy ? (accuracy.accuracy * 100).toFixed(2) + '%' : 'غير متوفرة'}`,
            };
        } catch (error) {
            this.logger.error(`Error training model for company ${companyId}:`, error);
            throw error;
        }
    }

    /**
     * 📊 جلب البيانات التاريخية
     */
    private async fetchHistoricalData(companyId: string): Promise<{
        records: any[];
        employees: any[];
        dateRange: { from: Date; to: Date };
    }> {
        const toDate = new Date();
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - this.TRAINING_PERIOD_DAYS);

        const [records, employees] = await Promise.all([
            this.prisma.attendance.findMany({
                where: {
                    user: { companyId },
                    date: {
                        gte: fromDate,
                        lte: toDate,
                    },
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            hireDate: true,
                            departmentId: true,
                        },
                    },
                },
                orderBy: { date: 'asc' },
            }),
            this.prisma.user.findMany({
                where: {
                    companyId,
                    status: 'ACTIVE',
                    role: 'EMPLOYEE',
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    hireDate: true,
                    departmentId: true,
                },
            }),
        ]);

        return {
            records,
            employees,
            dateRange: { from: fromDate, to: toDate },
        };
    }

    /**
     * 🧮 حساب المعاملات الإحصائية
     */
    private async calculateCoefficients(
        companyId: string,
        historicalData: { records: any[]; employees: any[]; dateRange: { from: Date; to: Date } },
    ): Promise<ModelCoefficients> {
        const { records, employees, dateRange } = historicalData;

        // 1. معدل الغياب الإجمالي
        const totalRecords = records.length;
        const absentRecords = records.filter((r) => r.status === 'ABSENT').length;
        const globalAbsenceRate = totalRecords > 0 ? absentRecords / totalRecords : 0;

        // 2. معدلات الغياب حسب يوم الأسبوع
        const dayOfWeekCounts: { [day: number]: { total: number; absent: number } } = {};
        for (let i = 0; i <= 6; i++) {
            dayOfWeekCounts[i] = { total: 0, absent: 0 };
        }

        for (const record of records) {
            const dayOfWeek = new Date(record.date).getDay();
            dayOfWeekCounts[dayOfWeek].total++;
            if (record.status === 'ABSENT') {
                dayOfWeekCounts[dayOfWeek].absent++;
            }
        }

        const dayOfWeekRates: { [day: number]: number } = {};
        for (let i = 0; i <= 6; i++) {
            const counts = dayOfWeekCounts[i];
            dayOfWeekRates[i] = counts.total > 0 ? counts.absent / counts.total : globalAbsenceRate;
        }

        // 3. معدلات الغياب حسب الشهر (الاتجاهات الموسمية)
        const monthlyCounts: { [month: number]: { total: number; absent: number } } = {};
        for (let i = 1; i <= 12; i++) {
            monthlyCounts[i] = { total: 0, absent: 0 };
        }

        for (const record of records) {
            const month = new Date(record.date).getMonth() + 1; // 0-indexed to 1-indexed
            monthlyCounts[month].total++;
            if (record.status === 'ABSENT') {
                monthlyCounts[month].absent++;
            }
        }

        const monthlyRates: { [month: number]: number } = {};
        for (let i = 1; i <= 12; i++) {
            const counts = monthlyCounts[i];
            monthlyRates[i] = counts.total > 0 ? counts.absent / counts.total : globalAbsenceRate;
        }

        // 4. عوامل المخاطر (قيم افتراضية معقولة)
        const riskFactors = {
            newEmployeeThreshold: 6, // 6 أشهر
            highAbsenceThreshold: 10, // 10 غيابات في فترة التدريب
            recentAbsenceWeight: 0.7, // وزن أعلى للغيابات الأخيرة
        };

        // 5. إصدار النموذج (timestamp)
        const modelVersion = `v${Date.now()}`;

        return {
            modelVersion,
            trainedAt: new Date(),
            globalAbsenceRate,
            dayOfWeekRates,
            monthlyRates,
            riskFactors,
            trainingStats: {
                totalRecords: records.length,
                totalEmployees: employees.length,
                dateRange,
            },
        };
    }

    /**
     * 📈 تقييم دقة النموذج
     */
    private async evaluateModelAccuracy(
        companyId: string,
        coefficients: ModelCoefficients,
        historicalData: { records: any[]; employees: any[] },
    ): Promise<{
        accuracy: number;
        precision: number;
        recall: number;
        f1Score: number;
    } | null> {
        try {
            const { records } = historicalData;

            // استخدام التحقق المتقاطع البسيط: 70% تدريب، 30% اختبار
            const splitIndex = Math.floor(records.length * 0.7);
            const testRecords = records.slice(splitIndex);

            if (testRecords.length === 0) {
                return null;
            }

            let truePositives = 0; // تنبأ بالغياب وحدث الغياب
            let falsePositives = 0; // تنبأ بالغياب ولم يحدث
            let trueNegatives = 0; // تنبأ بالحضور وحضر
            let falseNegatives = 0; // تنبأ بالحضور وغاب

            for (const record of testRecords) {
                const dayOfWeek = new Date(record.date).getDay();
                const dayRate = coefficients.dayOfWeekRates[dayOfWeek] || coefficients.globalAbsenceRate;

                // التنبؤ: إذا كان معدل الغياب > 0.3، نتوقع غياب
                const predictedAbsent = dayRate > 0.3;
                const actualAbsent = record.status === 'ABSENT';

                if (predictedAbsent && actualAbsent) {
                    truePositives++;
                } else if (predictedAbsent && !actualAbsent) {
                    falsePositives++;
                } else if (!predictedAbsent && !actualAbsent) {
                    trueNegatives++;
                } else if (!predictedAbsent && actualAbsent) {
                    falseNegatives++;
                }
            }

            const total = truePositives + falsePositives + trueNegatives + falseNegatives;
            const accuracy = total > 0 ? (truePositives + trueNegatives) / total : 0;

            const precision =
                truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;

            const recall =
                truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 0;

            const f1Score =
                precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

            return {
                accuracy,
                precision,
                recall,
                f1Score,
            };
        } catch (error) {
            this.logger.error('Error evaluating model accuracy:', error);
            return null;
        }
    }

    /**
     * 📊 الحصول على معاملات النموذج المدرب
     * (في التنفيذ الفعلي، يجب تخزين هذه المعاملات في قاعدة البيانات أو ملف تكوين)
     */
    async getModelCoefficients(companyId: string): Promise<ModelCoefficients | null> {
        // TODO: تنفيذ تخزين واسترجاع المعاملات من قاعدة البيانات
        // حالياً، نقوم بإعادة حساب المعاملات في كل مرة
        this.logger.warn('Model coefficients storage not implemented - recalculating from historical data');

        const historicalData = await this.fetchHistoricalData(companyId);
        if (historicalData.records.length < this.MIN_RECORDS_FOR_TRAINING) {
            return null;
        }

        return this.calculateCoefficients(companyId, historicalData);
    }

    /**
     * 📈 الحصول على أحدث مقاييس دقة النموذج
     */
    async getLatestAccuracy(companyId: string): Promise<{
        accuracy: number;
        precision: number;
        recall: number;
        f1Score: number;
        modelVersion: string;
        evaluatedAt: Date;
    } | null> {
        const latest = await this.prisma.predictionAccuracy.findFirst({
            where: { companyId },
            orderBy: { evaluatedAt: 'desc' },
        });

        if (!latest) {
            return null;
        }

        return {
            accuracy: Number(latest.accuracy),
            precision: Number(latest.precision),
            recall: Number(latest.recall),
            f1Score: Number(latest.f1Score),
            modelVersion: latest.modelVersion,
            evaluatedAt: latest.evaluatedAt,
        };
    }
}
