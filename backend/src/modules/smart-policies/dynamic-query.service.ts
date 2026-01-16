import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * خدمة الاستعلامات الديناميكية
 * تسمح للـ AI بسحب أي بيانات من الـ database تلقائياً
 */
@Injectable()
export class DynamicQueryService {
    private readonly logger = new Logger(DynamicQueryService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * تنفيذ استعلام ديناميكي بناءً على متطلبات السياسة
     * الـ AI يحدد ما يحتاجه والنظام يجيبه تلقائياً
     */
    async executeQuery(
        employeeId: string,
        queryType: string,
        params: Record<string, any>,
        startDate: Date,
        endDate: Date
    ): Promise<any> {
        this.logger.log(`Executing dynamic query: ${queryType} for employee ${employeeId}`);

        switch (queryType) {
            case 'COUNT_DAYS_WORKED_HOURS_BETWEEN':
                return this.countDaysWorkedHoursBetween(employeeId, params.minHours, params.maxHours, startDate, endDate);

            case 'COUNT_LATE_ARRIVALS':
                return this.countLateArrivals(employeeId, params.minMinutes, startDate, endDate);

            case 'COUNT_EARLY_ARRIVALS':
                return this.countEarlyArrivals(employeeId, params.minMinutes, startDate, endDate);

            case 'SUM_OVERTIME_HOURS':
                return this.sumOvertimeHours(employeeId, startDate, endDate);

            case 'COUNT_ABSENT_DAYS':
                return this.countAbsentDays(employeeId, startDate, endDate);

            case 'GET_ATTENDANCE_PATTERN':
                return this.getAttendancePattern(employeeId, startDate, endDate);

            case 'CUSTOM_AGGREGATE':
                return this.executeCustomAggregate(employeeId, params, startDate, endDate);

            default:
                this.logger.warn(`Unknown query type: ${queryType}`);
                return null;
        }
    }

    /**
     * حساب عدد الأيام التي اشتغل فيها الموظف ساعات معينة
     * مثال: كم يوم اشتغل من 3 إلى 4 ساعات
     */
    private async countDaysWorkedHoursBetween(
        employeeId: string,
        minHours: number,
        maxHours: number,
        startDate: Date,
        endDate: Date
    ): Promise<number> {
        try {
            const records = await (this.prisma as any).attendance.findMany({
                where: {
                    userId: employeeId,
                    date: { gte: startDate, lte: endDate },
                    status: { in: ['PRESENT', 'LATE', 'EARLY_LEAVE'] },
                },
                select: {
                    workingHours: true,
                    checkIn: true,
                    checkOut: true,
                },
            });

            // حساب ساعات العمل لكل يوم وعد الأيام في النطاق
            let count = 0;
            for (const record of records) {
                let hours = Number(record.workingHours) || 0;

                // لو مفيش workingHours، احسبها من checkIn و checkOut
                if (hours === 0 && record.checkIn && record.checkOut) {
                    const diff = new Date(record.checkOut).getTime() - new Date(record.checkIn).getTime();
                    hours = diff / (1000 * 60 * 60);
                }

                if (hours >= minHours && hours <= maxHours) {
                    count++;
                }
            }

            this.logger.log(`Found ${count} days with ${minHours}-${maxHours} hours worked`);
            return count;
        } catch (error) {
            this.logger.error(`Error in countDaysWorkedHoursBetween: ${error.message}`);
            return 0;
        }
    }

    /**
     * حساب عدد مرات التأخير
     */
    private async countLateArrivals(
        employeeId: string,
        minMinutes: number,
        startDate: Date,
        endDate: Date
    ): Promise<number> {
        try {
            const count = await (this.prisma as any).attendance.count({
                where: {
                    userId: employeeId,
                    date: { gte: startDate, lte: endDate },
                    lateMinutes: { gte: minMinutes },
                },
            });
            return count;
        } catch (error) {
            this.logger.error(`Error in countLateArrivals: ${error.message}`);
            return 0;
        }
    }

    /**
     * حساب عدد مرات الحضور المبكر
     */
    private async countEarlyArrivals(
        employeeId: string,
        minMinutes: number,
        startDate: Date,
        endDate: Date
    ): Promise<number> {
        try {
            const count = await (this.prisma as any).attendance.count({
                where: {
                    userId: employeeId,
                    date: { gte: startDate, lte: endDate },
                    earlyArrivalMinutes: { gte: minMinutes },
                },
            });
            return count;
        } catch (error) {
            this.logger.error(`Error in countEarlyArrivals: ${error.message}`);
            return 0;
        }
    }

    /**
     * حساب إجمالي ساعات العمل الإضافي
     */
    private async sumOvertimeHours(
        employeeId: string,
        startDate: Date,
        endDate: Date
    ): Promise<number> {
        try {
            const result = await (this.prisma as any).attendance.aggregate({
                where: {
                    userId: employeeId,
                    date: { gte: startDate, lte: endDate },
                },
                _sum: {
                    overtimeHours: true,
                },
            });
            return Number(result._sum.overtimeHours) || 0;
        } catch (error) {
            this.logger.error(`Error in sumOvertimeHours: ${error.message}`);
            return 0;
        }
    }

    /**
     * حساب أيام الغياب
     */
    private async countAbsentDays(
        employeeId: string,
        startDate: Date,
        endDate: Date
    ): Promise<number> {
        try {
            const count = await (this.prisma as any).attendance.count({
                where: {
                    userId: employeeId,
                    date: { gte: startDate, lte: endDate },
                    status: 'ABSENT',
                },
            });
            return count;
        } catch (error) {
            this.logger.error(`Error in countAbsentDays: ${error.message}`);
            return 0;
        }
    }

    /**
     * تحليل نمط الحضور
     */
    private async getAttendancePattern(
        employeeId: string,
        startDate: Date,
        endDate: Date
    ): Promise<any> {
        try {
            const records = await (this.prisma as any).attendance.findMany({
                where: {
                    userId: employeeId,
                    date: { gte: startDate, lte: endDate },
                },
                orderBy: { date: 'asc' },
            });

            let consecutiveLate = 0;
            let maxConsecutiveLate = 0;
            let consecutivePresent = 0;
            let maxConsecutivePresent = 0;

            for (const record of records) {
                // حساب التأخير المتتالي
                if (record.status === 'LATE' || (record.lateMinutes && Number(record.lateMinutes) > 0)) {
                    consecutiveLate++;
                    maxConsecutiveLate = Math.max(maxConsecutiveLate, consecutiveLate);
                } else {
                    consecutiveLate = 0;
                }

                // حساب الحضور المتتالي
                if (record.status === 'PRESENT') {
                    consecutivePresent++;
                    maxConsecutivePresent = Math.max(maxConsecutivePresent, consecutivePresent);
                } else {
                    consecutivePresent = 0;
                }
            }

            return {
                totalDays: records.length,
                maxConsecutiveLate,
                maxConsecutivePresent,
                currentConsecutiveLate: consecutiveLate,
                currentConsecutivePresent: consecutivePresent,
            };
        } catch (error) {
            this.logger.error(`Error in getAttendancePattern: ${error.message}`);
            return null;
        }
    }

    /**
     * تنفيذ استعلام مخصص
     * يسمح للـ AI بتحديد أي استعلام
     */
    private async executeCustomAggregate(
        employeeId: string,
        params: Record<string, any>,
        startDate: Date,
        endDate: Date
    ): Promise<any> {
        const { table, field, operation, conditions } = params;

        try {
            // بناء الاستعلام بناءً على المعاملات
            const model = (this.prisma as any)[table];
            if (!model) {
                this.logger.warn(`Table ${table} not found`);
                return null;
            }

            const where: any = {
                userId: employeeId,
                ...conditions,
            };

            // إضافة فلتر التاريخ إذا كان الجدول يدعمه
            if (params.dateField) {
                where[params.dateField] = { gte: startDate, lte: endDate };
            }

            switch (operation) {
                case 'COUNT':
                    return await model.count({ where });
                case 'SUM':
                    const sumResult = await model.aggregate({
                        where,
                        _sum: { [field]: true },
                    });
                    return sumResult._sum[field] || 0;
                case 'AVG':
                    const avgResult = await model.aggregate({
                        where,
                        _avg: { [field]: true },
                    });
                    return avgResult._avg[field] || 0;
                case 'MAX':
                    const maxResult = await model.aggregate({
                        where,
                        _max: { [field]: true },
                    });
                    return maxResult._max[field] || 0;
                case 'MIN':
                    const minResult = await model.aggregate({
                        where,
                        _min: { [field]: true },
                    });
                    return minResult._min[field] || 0;
                default:
                    return null;
            }
        } catch (error) {
            this.logger.error(`Error in executeCustomAggregate: ${error.message}`);
            return null;
        }
    }

    /**
     * تحليل متطلبات السياسة وتنفيذ الاستعلامات المطلوبة
     * هذه الدالة تُستدعى تلقائياً عند تنفيذ أي سياسة
     */
    async resolveDataRequirements(
        employeeId: string,
        policyConditions: any[],
        startDate: Date,
        endDate: Date
    ): Promise<Record<string, any>> {
        const resolvedData: Record<string, any> = {};

        for (const condition of policyConditions) {
            const field = condition.field || '';

            // تحليل الحقل المطلوب واستنتاج الاستعلام
            const queryInfo = this.parseFieldToQuery(field, condition);

            if (queryInfo) {
                const result = await this.executeQuery(
                    employeeId,
                    queryInfo.queryType,
                    queryInfo.params,
                    startDate,
                    endDate
                );
                resolvedData[field] = result;
            }
        }

        return resolvedData;
    }

    /**
     * تحويل اسم الحقل إلى استعلام
     */
    private parseFieldToQuery(field: string, condition: any): { queryType: string; params: any } | null {
        // أمثلة على التحويل:
        // attendance.daysWorkedBetween.3.4 -> COUNT_DAYS_WORKED_HOURS_BETWEEN {minHours: 3, maxHours: 4}
        // attendance.lateArrivals.15 -> COUNT_LATE_ARRIVALS {minMinutes: 15}

        const parts = field.split('.');

        if (parts[0] === 'attendance') {
            if (parts[1] === 'daysWorkedBetween' || field.includes('partialWork') || field.includes('shortShift')) {
                const minHours = parseFloat(parts[2]) || 3;
                const maxHours = parseFloat(parts[3]) || 4;
                return { queryType: 'COUNT_DAYS_WORKED_HOURS_BETWEEN', params: { minHours, maxHours } };
            }
            if (parts[1] === 'lateArrivals' || parts[1] === 'lateDays') {
                return { queryType: 'COUNT_LATE_ARRIVALS', params: { minMinutes: parseInt(parts[2]) || 0 } };
            }
            if (parts[1] === 'earlyArrivals' || parts[1] === 'earlyDays') {
                return { queryType: 'COUNT_EARLY_ARRIVALS', params: { minMinutes: parseInt(parts[2]) || 10 } };
            }
        }

        return null;
    }
}
