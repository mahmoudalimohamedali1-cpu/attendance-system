"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DynamicQueryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicQueryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let DynamicQueryService = DynamicQueryService_1 = class DynamicQueryService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(DynamicQueryService_1.name);
    }
    async executeQuery(employeeId, queryType, params, startDate, endDate) {
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
    async countDaysWorkedHoursBetween(employeeId, minHours, maxHours, startDate, endDate) {
        try {
            const records = await this.prisma.attendance.findMany({
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
            let count = 0;
            for (const record of records) {
                let hours = Number(record.workingHours) || 0;
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
        }
        catch (error) {
            this.logger.error(`Error in countDaysWorkedHoursBetween: ${error.message}`);
            return 0;
        }
    }
    async countLateArrivals(employeeId, minMinutes, startDate, endDate) {
        try {
            const count = await this.prisma.attendance.count({
                where: {
                    userId: employeeId,
                    date: { gte: startDate, lte: endDate },
                    lateMinutes: { gte: minMinutes },
                },
            });
            return count;
        }
        catch (error) {
            this.logger.error(`Error in countLateArrivals: ${error.message}`);
            return 0;
        }
    }
    async countEarlyArrivals(employeeId, minMinutes, startDate, endDate) {
        try {
            const count = await this.prisma.attendance.count({
                where: {
                    userId: employeeId,
                    date: { gte: startDate, lte: endDate },
                    earlyArrivalMinutes: { gte: minMinutes },
                },
            });
            return count;
        }
        catch (error) {
            this.logger.error(`Error in countEarlyArrivals: ${error.message}`);
            return 0;
        }
    }
    async sumOvertimeHours(employeeId, startDate, endDate) {
        try {
            const result = await this.prisma.attendance.aggregate({
                where: {
                    userId: employeeId,
                    date: { gte: startDate, lte: endDate },
                },
                _sum: {
                    overtimeHours: true,
                },
            });
            return Number(result._sum.overtimeHours) || 0;
        }
        catch (error) {
            this.logger.error(`Error in sumOvertimeHours: ${error.message}`);
            return 0;
        }
    }
    async countAbsentDays(employeeId, startDate, endDate) {
        try {
            const count = await this.prisma.attendance.count({
                where: {
                    userId: employeeId,
                    date: { gte: startDate, lte: endDate },
                    status: 'ABSENT',
                },
            });
            return count;
        }
        catch (error) {
            this.logger.error(`Error in countAbsentDays: ${error.message}`);
            return 0;
        }
    }
    async getAttendancePattern(employeeId, startDate, endDate) {
        try {
            const records = await this.prisma.attendance.findMany({
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
                if (record.status === 'LATE' || (record.lateMinutes && Number(record.lateMinutes) > 0)) {
                    consecutiveLate++;
                    maxConsecutiveLate = Math.max(maxConsecutiveLate, consecutiveLate);
                }
                else {
                    consecutiveLate = 0;
                }
                if (record.status === 'PRESENT') {
                    consecutivePresent++;
                    maxConsecutivePresent = Math.max(maxConsecutivePresent, consecutivePresent);
                }
                else {
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
        }
        catch (error) {
            this.logger.error(`Error in getAttendancePattern: ${error.message}`);
            return null;
        }
    }
    async executeCustomAggregate(employeeId, params, startDate, endDate) {
        const { table, field, operation, conditions } = params;
        try {
            const model = this.prisma[table];
            if (!model) {
                this.logger.warn(`Table ${table} not found`);
                return null;
            }
            const where = {
                userId: employeeId,
                ...conditions,
            };
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
        }
        catch (error) {
            this.logger.error(`Error in executeCustomAggregate: ${error.message}`);
            return null;
        }
    }
    async resolveDataRequirements(employeeId, policyConditions, startDate, endDate) {
        const resolvedData = {};
        for (const condition of policyConditions) {
            const field = condition.field || '';
            const queryInfo = this.parseFieldToQuery(field, condition);
            if (queryInfo) {
                const result = await this.executeQuery(employeeId, queryInfo.queryType, queryInfo.params, startDate, endDate);
                resolvedData[field] = result;
            }
        }
        return resolvedData;
    }
    parseFieldToQuery(field, condition) {
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
};
exports.DynamicQueryService = DynamicQueryService;
exports.DynamicQueryService = DynamicQueryService = DynamicQueryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DynamicQueryService);
//# sourceMappingURL=dynamic-query.service.js.map