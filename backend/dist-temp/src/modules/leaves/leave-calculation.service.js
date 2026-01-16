"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveCalculationService = void 0;
const common_1 = require("@nestjs/common");
let LeaveCalculationService = class LeaveCalculationService {
    calculateRemainingLeaveDays(hireDate, usedDays = 0) {
        const earned = this.calculateEarnedLeaveDays(hireDate);
        return Math.max(0, Math.floor(earned - usedDays));
    }
    calculateEarnedLeaveDays(hireDate, endDate = new Date()) {
        const start = new Date(hireDate);
        const end = new Date(endDate);
        if (start >= end) {
            return 0;
        }
        const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const fiveYearsInDays = 5 * 365;
        let earnedDays = 0;
        if (totalDays <= fiveYearsInDays) {
            earnedDays = (totalDays / 365) * 21;
        }
        else {
            const first5Years = 5 * 21;
            const daysAfter5Years = totalDays - fiveYearsInDays;
            const after5Years = (daysAfter5Years / 365) * 30;
            earnedDays = first5Years + after5Years;
        }
        return Math.floor(earnedDays * 100) / 100;
    }
    getYearsOfService(hireDate, endDate = new Date()) {
        const start = new Date(hireDate);
        const end = new Date(endDate);
        const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return Math.floor(totalDays / 365);
    }
    getCurrentAnnualAllowance(hireDate) {
        const years = this.getYearsOfService(hireDate);
        return years >= 5 ? 30 : 21;
    }
    calculateRemainingLeaveDaysNoCarryover(hireDate, usedDaysThisYear = 0) {
        const annualAllowance = this.getCurrentAnnualAllowance(hireDate);
        const currentYear = new Date().getFullYear();
        const hireDateObj = new Date(hireDate);
        if (hireDateObj.getFullYear() === currentYear) {
            const startOfYear = new Date(currentYear, 0, 1);
            const endOfYear = new Date(currentYear, 11, 31);
            const daysInYear = 365;
            const daysWorked = Math.floor((endOfYear.getTime() - hireDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            const proportionalAllowance = (daysWorked / daysInYear) * annualAllowance;
            return Math.max(0, Math.floor(proportionalAllowance - usedDaysThisYear));
        }
        return Math.max(0, annualAllowance - usedDaysThisYear);
    }
    getStartOfCurrentYear() {
        const now = new Date();
        return new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    }
    getEndOfCurrentYear() {
        const now = new Date();
        return new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    }
};
exports.LeaveCalculationService = LeaveCalculationService;
exports.LeaveCalculationService = LeaveCalculationService = __decorate([
    (0, common_1.Injectable)()
], LeaveCalculationService);
//# sourceMappingURL=leave-calculation.service.js.map