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
var PolicyContextService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyContextService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let PolicyContextService = PolicyContextService_1 = class PolicyContextService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(PolicyContextService_1.name);
    }
    async enrichContext(employeeId, month, year) {
        this.logger.log(`Enriching context for employee ${employeeId}, period ${year}-${month}`);
        const user = await this.prisma.user.findUnique({
            where: { id: employeeId },
            include: {
                department: true,
                branch: true,
                jobTitleRef: true,
            },
        });
        if (!user) {
            throw new Error(`Employee ${employeeId} not found`);
        }
        const hireDate = user.hireDate || user.createdAt;
        const tenure = this.calculateTenure(hireDate);
        const period = this.getPeriodDates(month, year);
        const workingDays = this.calculateWorkingDays(month, year);
        const contract = await this.getContractData(employeeId);
        const attendance = await this.getAttendanceData(employeeId, month, year, workingDays);
        return {
            employee: {
                id: user.id,
                name: `${user.firstName} ${user.lastName}`,
                email: user.email,
                companyId: user.companyId,
                hireDate,
                tenure,
                department: user.department?.nameAr || user.department?.name || 'غير محدد',
                departmentId: user.departmentId || '',
                branch: user.branch?.nameAr || user.branch?.name || 'غير محدد',
                branchId: user.branchId || '',
                jobTitle: user.jobTitleRef?.titleAr || user.jobTitleRef?.name || user.jobTitle || 'غير محدد',
                jobTitleId: user.jobTitleId || '',
                nationality: user.nationality || 'غير محدد',
                isSaudi: user.nationality === 'SA' || user.nationality === 'Saudi',
                salary: Number(user.salary) || 0,
                basicSalary: Number(user.salary) || 0,
            },
            contract,
            attendance,
            leaves: this.getDefaultLeaves(),
            custody: this.getDefaultCustody(),
            advances: this.getDefaultAdvances(),
            disciplinary: await this.getDisciplinaryData(employeeId),
            performance: await this.getPerformanceData(employeeId, month, year),
            department: {
                id: user.departmentId || '',
                name: user.department?.nameAr || user.department?.name || 'غير محدد',
                totalEmployees: 0,
                departmentAttendance: 0,
            },
            branch: {
                id: user.branchId || '',
                name: user.branch?.nameAr || user.branch?.name || 'غير محدد',
                totalEmployees: 0,
            },
            location: await this.getLocationTrackingData(employeeId, month, year),
            company: {
                id: user.companyId,
                currentPeriod: {
                    month,
                    year,
                    workingDays,
                },
                policies: {
                    probationPeriodMonths: 3,
                    weekendDays: ['FRIDAY', 'SATURDAY'],
                },
            },
            period: {
                month,
                year,
                ...period,
            },
            customFields: await this.getCustomFields(employeeId, user.companyId || '', month, year),
            _availableFields: this.getAllAvailableFields(),
        };
    }
    async getCustomFields(employeeId, companyId, month, year) {
        try {
            const customValues = await this.prisma.customFieldValue?.findMany?.({
                where: {
                    OR: [
                        { employeeId },
                        { entityType: 'COMPANY', entityId: companyId }
                    ]
                },
                include: { field: true }
            }) || [];
            const result = {};
            for (const cv of customValues) {
                const fieldName = cv.field?.name || cv.fieldId;
                result[fieldName] = cv.value;
            }
            const salesData = await this.getSalesData(employeeId, month, year);
            if (salesData) {
                result.sales = salesData;
            }
            return result;
        }
        catch {
            return {};
        }
    }
    async getSalesData(employeeId, month, year) {
        try {
            const { startDate, endDate } = this.getPeriodDates(month, year);
            const sales = await this.prisma.sale?.findMany?.({
                where: {
                    salesPersonId: employeeId,
                    createdAt: { gte: startDate, lte: endDate }
                }
            }) || [];
            if (sales.length === 0)
                return null;
            const totalAmount = sales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
            const count = sales.length;
            return {
                count,
                totalAmount,
                averageAmount: count > 0 ? totalAmount / count : 0,
            };
        }
        catch {
            return null;
        }
    }
    getAllAvailableFields() {
        return [
            'employee.id', 'employee.name', 'employee.tenure.years', 'employee.tenure.months',
            'employee.department', 'employee.branch', 'employee.jobTitle', 'employee.isSaudi',
            'contract.basicSalary', 'contract.totalSalary', 'contract.isProbation',
            'contract.housingAllowance', 'contract.transportAllowance',
            'attendance.currentPeriod.presentDays', 'attendance.currentPeriod.absentDays',
            'attendance.currentPeriod.lateDays', 'attendance.currentPeriod.lateMinutes',
            'attendance.currentPeriod.overtimeHours', 'attendance.currentPeriod.attendancePercentage',
            'attendance.patterns.lateStreak', 'attendance.patterns.consecutivePresent',
            'leaves.currentMonth.sickDays', 'leaves.currentMonth.annualDays', 'leaves.balance.annual',
            'custody.active', 'custody.lateReturns', 'advances.hasActiveAdvance', 'advances.remainingAmount',
            'disciplinary.activeCases', 'disciplinary.activeWarnings',
            'location.minutesOutsideGeofence', 'location.excessMinutes', 'location.exceededAllowedTime',
            'performance.targetAchievement', 'performance.isAbove100', 'performance.isAbove105',
            'performance.achievementLevel', 'performance.lastRating',
            'customFields.*',
        ];
    }
    isFieldAvailable(fieldPath) {
        const availableFields = this.getAllAvailableFields();
        if (availableFields.includes(fieldPath))
            return true;
        if (fieldPath.startsWith('customFields.'))
            return true;
        return availableFields.some(f => fieldPath.startsWith(f.replace('.*', '')));
    }
    detectMissingFields(conditions, actions) {
        const missingFields = [];
        const allFields = this.getAllAvailableFields();
        for (const condition of conditions) {
            const field = condition.field || '';
            if (field && !this.isFieldAvailable(field)) {
                missingFields.push(field);
            }
        }
        for (const action of actions) {
            if (action.valueType === 'FORMULA' && action.value) {
                const formulaFields = this.extractFieldsFromFormula(action.value);
                for (const field of formulaFields) {
                    if (!this.isFieldAvailable(field)) {
                        missingFields.push(field);
                    }
                }
            }
        }
        return [...new Set(missingFields)];
    }
    extractFieldsFromFormula(formula) {
        const fieldPattern = /([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)+)/g;
        return formula.match(fieldPattern) || [];
    }
    async getContractData(employeeId) {
        try {
            const contract = await this.prisma.contract.findFirst({
                where: {
                    userId: employeeId,
                    status: 'ACTIVE',
                },
                orderBy: { startDate: 'desc' },
            });
            if (!contract) {
                return this.getDefaultContract();
            }
            const basicSalary = Number(contract.basicSalary);
            const housingAllowance = Number(contract.housingAllowance || 0);
            const transportAllowance = Number(contract.transportAllowance || 0);
            const otherAllowances = Number(contract.otherAllowances || 0);
            const totalSalary = basicSalary + housingAllowance + transportAllowance + otherAllowances;
            const now = new Date();
            const isProbation = contract.probationEndDate ? contract.probationEndDate > now : false;
            return {
                id: contract.id,
                basicSalary,
                totalSalary,
                housingAllowance,
                transportAllowance,
                otherAllowances,
                contractType: contract.type,
                probationEndDate: contract.probationEndDate || undefined,
                isProbation,
                probationMonthsRemaining: undefined,
            };
        }
        catch {
            return this.getDefaultContract();
        }
    }
    getDefaultContract() {
        return {
            id: '',
            basicSalary: 0,
            totalSalary: 0,
            housingAllowance: 0,
            transportAllowance: 0,
            otherAllowances: 0,
            contractType: 'FULL_TIME',
            isProbation: false,
        };
    }
    async getAttendanceData(employeeId, month, year, workingDays) {
        try {
            const { startDate, endDate } = this.getPeriodDates(month, year);
            const records = await this.prisma.attendance.findMany({
                where: {
                    userId: employeeId,
                    checkIn: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
            });
            let presentDays = 0;
            let lateDays = 0;
            let lateMinutes = 0;
            let overtimeHours = 0;
            for (const record of records) {
                const rec = record;
                if (rec.status === 'PRESENT' || rec.status === 'LATE') {
                    presentDays++;
                }
                if (rec.status === 'LATE') {
                    lateDays++;
                    lateMinutes += Number(rec.lateMinutes || 0);
                }
                overtimeHours += Number(rec.overtimeHours || 0);
            }
            const absentDays = Math.max(0, workingDays - presentDays);
            const attendancePercentage = workingDays > 0 ? (presentDays / workingDays) * 100 : 0;
            const currentPeriod = {
                presentDays,
                absentDays,
                lateDays,
                lateMinutes,
                earlyLeaveDays: 0,
                overtimeHours,
                weekendWorkDays: 0,
                holidayWorkDays: 0,
                attendancePercentage,
                workingDays,
            };
            return {
                currentPeriod,
                last3Months: { ...currentPeriod, attendancePercentage: 0 },
                last6Months: { ...currentPeriod, attendancePercentage: 0 },
                patterns: {
                    lateStreak: 0,
                    absenceStreak: 0,
                    consecutivePresent: 0,
                },
            };
        }
        catch {
            return this.getDefaultAttendance(workingDays);
        }
    }
    getDefaultAttendance(workingDays) {
        const defaultPeriod = {
            presentDays: 0,
            absentDays: 0,
            lateDays: 0,
            lateMinutes: 0,
            earlyLeaveDays: 0,
            overtimeHours: 0,
            weekendWorkDays: 0,
            holidayWorkDays: 0,
            attendancePercentage: 0,
            workingDays,
        };
        return {
            currentPeriod: defaultPeriod,
            last3Months: { ...defaultPeriod, attendancePercentage: 0 },
            last6Months: { ...defaultPeriod, attendancePercentage: 0 },
            patterns: {
                lateStreak: 0,
                absenceStreak: 0,
                consecutivePresent: 0,
            },
        };
    }
    getDefaultLeaves() {
        return {
            currentMonth: {
                sickDays: 0,
                annualDays: 0,
                unpaidDays: 0,
                totalDays: 0,
                consecutiveSickDays: 0,
            },
            balance: { annual: 0, sick: 0 },
            history: [],
        };
    }
    getDefaultCustody() {
        return {
            active: 0,
            returned: 0,
            lateReturns: 0,
            totalValue: 0,
            avgReturnDelay: 0,
        };
    }
    getDefaultAdvances() {
        return {
            active: 0,
            totalAmount: 0,
            remainingAmount: 0,
            monthlyDeduction: 0,
            hasActiveAdvance: false,
        };
    }
    async getDisciplinaryData(employeeId) {
        try {
            const cases = await this.prisma.disciplinaryCase.findMany({
                where: { employeeId },
                orderBy: { incidentDate: 'desc' },
            });
            const totalCases = cases.length;
            const activeCases = cases.filter(c => c.status !== 'FINALIZED_APPROVED' && c.status !== 'FINALIZED_CANCELLED').length;
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            const activeWarnings = cases.filter(c => c.decisionType &&
                ['WARNING', 'FIRST_WARNING', 'SECOND_WARNING', 'FINAL_WARNING_TERMINATION'].includes(c.decisionType) &&
                c.incidentDate > oneYearAgo).length;
            const lastIncidentDate = cases[0]?.incidentDate;
            const daysSinceLastIncident = lastIncidentDate
                ? Math.floor((Date.now() - lastIncidentDate.getTime()) / (1000 * 60 * 60 * 24))
                : undefined;
            return {
                totalCases,
                activeCases,
                activeWarnings,
                lastIncidentDate,
                daysSinceLastIncident,
                penalties: [],
            };
        }
        catch {
            return {
                totalCases: 0,
                activeCases: 0,
                activeWarnings: 0,
                penalties: [],
            };
        }
    }
    calculateTenure(hireDate) {
        const now = new Date();
        const diff = now.getTime() - hireDate.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const years = Math.floor(days / 365);
        const months = Math.floor((days % 365) / 30);
        const remainingDays = days % 30;
        const totalMonths = Math.floor(days / 30);
        return {
            years,
            months,
            days: remainingDays,
            totalMonths,
        };
    }
    getPeriodDates(month, year) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        return { startDate, endDate };
    }
    calculateWorkingDays(month, year) {
        const daysInMonth = new Date(year, month, 0).getDate();
        const weekends = Math.floor(daysInMonth / 7) * 2;
        return daysInMonth - weekends;
    }
    async getLocationTrackingData(employeeId, month, year) {
        const ALLOWED_MINUTES_OUTSIDE = 15;
        try {
            const { startDate, endDate } = this.getPeriodDates(month, year);
            const locationRecords = await this.prisma.locationLog?.findMany?.({
                where: {
                    userId: employeeId,
                    timestamp: {
                        gte: startDate,
                        lte: endDate,
                    },
                    isWithinGeofence: false,
                },
                orderBy: { timestamp: 'asc' },
            }) || [];
            let minutesOutsideGeofence = 0;
            let geofenceExitCount = 0;
            let longestOutsideDuration = 0;
            if (locationRecords.length > 0) {
                for (const record of locationRecords) {
                    const duration = Number(record.durationOutside || record.duration || 1);
                    minutesOutsideGeofence += duration;
                    geofenceExitCount++;
                    if (duration > longestOutsideDuration) {
                        longestOutsideDuration = duration;
                    }
                }
            }
            else {
                const geofenceEvents = await this.prisma.geofenceEvent?.findMany?.({
                    where: {
                        userId: employeeId,
                        eventType: 'EXIT',
                        timestamp: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                }) || [];
                for (const event of geofenceEvents) {
                    const duration = Number(event.durationMinutes || 5);
                    minutesOutsideGeofence += duration;
                    geofenceExitCount++;
                    if (duration > longestOutsideDuration) {
                        longestOutsideDuration = duration;
                    }
                }
            }
            const exceededAllowedTime = minutesOutsideGeofence > ALLOWED_MINUTES_OUTSIDE;
            const excessMinutes = Math.max(0, minutesOutsideGeofence - ALLOWED_MINUTES_OUTSIDE);
            return {
                minutesOutsideGeofence,
                geofenceExitCount,
                longestOutsideDuration,
                exceededAllowedTime,
                excessMinutes,
            };
        }
        catch (error) {
            this.logger.warn(`Error fetching location data for ${employeeId}: ${error.message}`);
            return {
                minutesOutsideGeofence: 0,
                geofenceExitCount: 0,
                longestOutsideDuration: 0,
                exceededAllowedTime: false,
                excessMinutes: 0,
            };
        }
    }
    async getPerformanceData(employeeId, month, year) {
        try {
            const { startDate, endDate } = this.getPeriodDates(month, year);
            let targetAmount = 0;
            let actualAmount = 0;
            const performanceGoal = await this.prisma.performanceGoal?.findFirst?.({
                where: {
                    userId: employeeId,
                    periodStart: { lte: endDate },
                    periodEnd: { gte: startDate },
                },
            });
            if (performanceGoal) {
                targetAmount = Number(performanceGoal.targetAmount || performanceGoal.targetValue || 0);
                actualAmount = Number(performanceGoal.actualAmount || performanceGoal.actualValue || 0);
            }
            else {
                const salesTarget = await this.prisma.salesTarget?.findFirst?.({
                    where: {
                        userId: employeeId,
                        month: month,
                        year: year,
                    },
                });
                if (salesTarget) {
                    targetAmount = Number(salesTarget.targetAmount || 0);
                    actualAmount = Number(salesTarget.achieved || salesTarget.actualAmount || 0);
                }
            }
            const targetAchievement = targetAmount > 0
                ? Math.round((actualAmount / targetAmount) * 100)
                : 0;
            let achievementLevel = 'BELOW';
            if (targetAchievement >= 110) {
                achievementLevel = 'OUTSTANDING';
            }
            else if (targetAchievement >= 105) {
                achievementLevel = 'EXCEEDED';
            }
            else if (targetAchievement >= 100) {
                achievementLevel = 'MET';
            }
            const lastReview = await this.prisma.performanceReview?.findFirst?.({
                where: { userId: employeeId },
                orderBy: { reviewDate: 'desc' },
            });
            return {
                lastRating: lastReview?.rating || undefined,
                lastReviewDate: lastReview?.reviewDate || undefined,
                hasRecentReview: !!lastReview,
                targetAchievement,
                targetAmount,
                actualAmount,
                achievementLevel,
                isAbove100: targetAchievement >= 100,
                isAbove105: targetAchievement >= 105,
                isAbove110: targetAchievement >= 110,
                kpis: {
                    salesCount: undefined,
                    dealsClosedCount: undefined,
                    customersAcquired: undefined,
                    customerSatisfaction: undefined,
                },
            };
        }
        catch (error) {
            this.logger.warn(`Error fetching performance data for ${employeeId}: ${error.message}`);
            return {
                hasRecentReview: false,
                targetAchievement: 0,
                targetAmount: 0,
                actualAmount: 0,
                achievementLevel: 'BELOW',
                isAbove100: false,
                isAbove105: false,
                isAbove110: false,
                kpis: {},
            };
        }
    }
};
exports.PolicyContextService = PolicyContextService;
exports.PolicyContextService = PolicyContextService = PolicyContextService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PolicyContextService);
//# sourceMappingURL=policy-context.service.js.map