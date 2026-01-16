import { PrismaService } from '../../common/prisma/prisma.service';
export interface EnrichedPolicyContext {
    employee: {
        id: string;
        name: string;
        email: string;
        companyId: string;
        hireDate: Date;
        tenure: {
            years: number;
            months: number;
            days: number;
            totalMonths: number;
        };
        department: string;
        departmentId: string;
        branch: string;
        branchId: string;
        jobTitle: string;
        jobTitleId: string;
        nationality: string;
        isSaudi: boolean;
    };
    contract: {
        id: string;
        basicSalary: number;
        totalSalary: number;
        housingAllowance: number;
        transportAllowance: number;
        otherAllowances: number;
        contractType: string;
        probationEndDate?: Date;
        isProbation: boolean;
        probationMonthsRemaining?: number;
    };
    attendance: {
        currentPeriod: {
            presentDays: number;
            absentDays: number;
            lateDays: number;
            lateMinutes: number;
            earlyLeaveDays: number;
            overtimeHours: number;
            weekendWorkDays: number;
            holidayWorkDays: number;
            attendancePercentage: number;
            workingDays: number;
        };
        last3Months: {
            presentDays: number;
            absentDays: number;
            lateDays: number;
            lateMinutes: number;
            overtimeHours: number;
            attendancePercentage: number;
        };
        last6Months: {
            presentDays: number;
            absentDays: number;
            lateDays: number;
            lateMinutes: number;
            overtimeHours: number;
            attendancePercentage: number;
        };
        patterns: {
            lateStreak: number;
            absenceStreak: number;
            consecutivePresent: number;
        };
    };
    leaves: {
        currentMonth: {
            sickDays: number;
            annualDays: number;
            unpaidDays: number;
            totalDays: number;
            consecutiveSickDays: number;
        };
        balance: {
            annual: number;
            sick: number;
        };
        history: Array<{
            type: string;
            days: number;
            from: Date;
            to: Date;
        }>;
    };
    custody: {
        active: number;
        returned: number;
        lateReturns: number;
        totalValue: number;
        avgReturnDelay: number;
    };
    advances: {
        active: number;
        totalAmount: number;
        remainingAmount: number;
        monthlyDeduction: number;
        hasActiveAdvance: boolean;
    };
    disciplinary: {
        totalCases: number;
        activeCases: number;
        activeWarnings: number;
        lastIncidentDate?: Date;
        daysSinceLastIncident?: number;
        penalties: Array<{
            type: string;
            amount?: number;
            date: Date;
        }>;
    };
    performance: {
        lastRating?: number;
        lastReviewDate?: Date;
        hasRecentReview: boolean;
        targetAchievement: number;
        targetAmount: number;
        actualAmount: number;
        achievementLevel: 'BELOW' | 'MET' | 'EXCEEDED' | 'OUTSTANDING';
        isAbove100: boolean;
        isAbove105: boolean;
        isAbove110: boolean;
        kpis: {
            salesCount?: number;
            dealsClosedCount?: number;
            customersAcquired?: number;
            customerSatisfaction?: number;
        };
    };
    department: {
        id: string;
        name: string;
        totalEmployees: number;
        departmentAttendance: number;
    };
    branch: {
        id: string;
        name: string;
        totalEmployees: number;
    };
    location: {
        minutesOutsideGeofence: number;
        geofenceExitCount: number;
        longestOutsideDuration: number;
        exceededAllowedTime: boolean;
        excessMinutes: number;
    };
    company: {
        id: string;
        currentPeriod: {
            month: number;
            year: number;
            workingDays: number;
        };
        policies: {
            probationPeriodMonths: number;
            weekendDays: string[];
        };
    };
    period: {
        month: number;
        year: number;
        startDate: Date;
        endDate: Date;
    };
    customFields: {
        [key: string]: any;
    };
    _availableFields: string[];
}
export declare class PolicyContextService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    enrichContext(employeeId: string, month: number, year: number): Promise<EnrichedPolicyContext>;
    private getCustomFields;
    private getSalesData;
    getAllAvailableFields(): string[];
    isFieldAvailable(fieldPath: string): boolean;
    detectMissingFields(conditions: any[], actions: any[]): string[];
    private extractFieldsFromFormula;
    private getContractData;
    private getDefaultContract;
    private getAttendanceData;
    private getDefaultAttendance;
    private getDefaultLeaves;
    private getDefaultCustody;
    private getDefaultAdvances;
    private getDisciplinaryData;
    private calculateTenure;
    private getPeriodDates;
    private calculateWorkingDays;
    private getLocationTrackingData;
    private getPerformanceData;
}
