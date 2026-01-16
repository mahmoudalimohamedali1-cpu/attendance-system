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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EosService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const calculate_eos_dto_1 = require("./dto/calculate-eos.dto");
const leave_calculation_service_1 = require("../leaves/leave-calculation.service");
let EosService = class EosService {
    constructor(prisma, leaveCalculationService) {
        this.prisma = prisma;
        this.leaveCalculationService = leaveCalculationService;
    }
    calculateServiceDuration(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        let years = end.getFullYear() - start.getFullYear();
        let months = end.getMonth() - start.getMonth();
        let days = end.getDate() - start.getDate();
        if (days < 0) {
            months--;
            const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
            days += prevMonth.getDate();
        }
        if (months < 0) {
            years--;
            months += 12;
        }
        const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return { years, months, days, totalDays };
    }
    async calculateEos(userId, dto) {
        const employee = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                salaryAssignments: { where: { isActive: true }, take: 1 },
                advanceRequests: { where: { status: 'APPROVED' } },
                leaveRequests: { where: { status: 'APPROVED' } },
            }
        });
        if (!employee)
            throw new common_1.NotFoundException('الموظف غير موجود');
        if (!employee.hireDate)
            throw new common_1.NotFoundException('لم يتم تحديد تاريخ التعيين للموظف');
        const hireDate = new Date(employee.hireDate);
        const lastWorkingDay = new Date(dto.lastWorkingDay);
        const serviceDuration = this.calculateServiceDuration(hireDate, lastWorkingDay);
        const { years, months, days, totalDays } = serviceDuration;
        const totalYears = totalDays / 365.25;
        const baseSalary = dto.overrideBaseSalary
            || (employee.salaryAssignments[0]?.baseSalary
                ? Number(employee.salaryAssignments[0].baseSalary)
                : (employee.salary ? Number(employee.salary) : 0));
        let eosForFirst5Years = 0;
        let eosForRemaining = 0;
        if (totalYears <= 5) {
            eosForFirst5Years = totalYears * (baseSalary * 0.5);
        }
        else {
            eosForFirst5Years = 5 * (baseSalary * 0.5);
            eosForRemaining = (totalYears - 5) * baseSalary;
        }
        const totalEos = eosForFirst5Years + eosForRemaining;
        let eosAdjustmentFactor = 1.0;
        if (dto.reason === calculate_eos_dto_1.EosReason.RESIGNATION) {
            if (totalYears < 2) {
                eosAdjustmentFactor = 0;
            }
            else if (totalYears < 5) {
                eosAdjustmentFactor = 1 / 3;
            }
            else if (totalYears < 10) {
                eosAdjustmentFactor = 2 / 3;
            }
            else {
                eosAdjustmentFactor = 1.0;
            }
        }
        const adjustedEos = totalEos * eosAdjustmentFactor;
        let remainingLeaveDays;
        let remainingLeaveDaysOverridden = false;
        if (dto.overrideRemainingLeaveDays !== undefined && dto.overrideRemainingLeaveDays !== null) {
            remainingLeaveDays = dto.overrideRemainingLeaveDays;
            remainingLeaveDaysOverridden = true;
        }
        else {
            const earnedLeaveDays = this.leaveCalculationService.calculateEarnedLeaveDays(hireDate, lastWorkingDay);
            let usedLeaveDays = 0;
            for (const leave of employee.leaveRequests) {
                usedLeaveDays += Number(leave.requestedDays) || 0;
            }
            remainingLeaveDays = Math.max(0, Math.floor(earnedLeaveDays - usedLeaveDays));
        }
        const dailySalary = baseSalary / 30;
        const leavePayout = remainingLeaveDays * dailySalary;
        let outstandingLoans = 0;
        for (const advance of employee.advanceRequests) {
            const approved = advance.approvedAmount || advance.amount;
            outstandingLoans += Number(approved);
        }
        const netSettlement = adjustedEos + leavePayout - outstandingLoans;
        return {
            employeeId: employee.id,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            hireDate,
            lastWorkingDay,
            yearsOfService: years,
            monthsOfService: months,
            daysOfService: days,
            totalDaysOfService: totalDays,
            baseSalary,
            reason: dto.reason,
            eosForFirst5Years: Math.round(eosForFirst5Years * 100) / 100,
            eosForRemaining: Math.round(eosForRemaining * 100) / 100,
            totalEos: Math.round(totalEos * 100) / 100,
            eosAdjustmentFactor,
            adjustedEos: Math.round(adjustedEos * 100) / 100,
            remainingLeaveDays,
            remainingLeaveDaysOverridden,
            leavePayout: Math.round(leavePayout * 100) / 100,
            outstandingLoans: Math.round(outstandingLoans * 100) / 100,
            netSettlement: Math.round(netSettlement * 100) / 100,
        };
    }
};
exports.EosService = EosService;
exports.EosService = EosService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        leave_calculation_service_1.LeaveCalculationService])
], EosService);
//# sourceMappingURL=eos.service.js.map