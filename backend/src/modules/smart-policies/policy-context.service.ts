import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * السياق المُثرى للسياسة الذكية
 * يحتوي على كل البيانات المطلوبة لتنفيذ أي سياسة معقدة
 */
export interface EnrichedPolicyContext {
    // بيانات الموظف الأساسية
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

    // بيانات العقد والراتب
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

    // بيانات الحضور (الفترة الحالية)
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

    // بيانات الإجازات
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

    // بيانات العهد
    custody: {
        active: number;
        returned: number;
        lateReturns: number;
        totalValue: number;
        avgReturnDelay: number;
    };

    // بيانات السلف
    advances: {
        active: number;
        totalAmount: number;
        remainingAmount: number;
        monthlyDeduction: number;
        hasActiveAdvance: boolean;
    };

    // السجل التأديبي
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

    // الأداء والتقييمات
    performance: {
        lastRating?: number;
        lastReviewDate?: Date;
        hasRecentReview: boolean;
    };

    // بيانات القسم/الفريق
    department: {
        id: string;
        name: string;
        totalEmployees: number;
        departmentAttendance: number;
    };

    // بيانات الفرع
    branch: {
        id: string;
        name: string;
        totalEmployees: number;
    };

    // بيانات الشركة
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

    // الفترة الحالية
    period: {
        month: number;
        year: number;
        startDate: Date;
        endDate: Date;
    };
}

@Injectable()
export class PolicyContextService {
    private readonly logger = new Logger(PolicyContextService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * إثراء السياق بكل البيانات المطلوبة
     */
    async enrichContext(
        employeeId: string,
        month: number,
        year: number
    ): Promise<EnrichedPolicyContext> {
        this.logger.log(`Enriching context for employee ${employeeId}, period ${year}-${month}`);

        // جلب بيانات الموظف الأساسية
        const user = await this.prisma.user.findUnique({
            where: { id: employeeId },
            include: {
                department: true,
                branch: true,
                jobTitle: true,
            } as any,
        });

        if (!user) {
            throw new Error(`Employee ${employeeId} not found`);
        }

        const hireDate = user.hireDate || user.createdAt;
        const tenure = this.calculateTenure(hireDate);
        const period = this.getPeriodDates(month, year);
        const workingDays = this.calculateWorkingDays(month, year);

        // جلب بيانات العقد
        const contract = await this.getContractData(employeeId);

        // جلب بيانات الحضور
        const attendance = await this.getAttendanceData(employeeId, month, year, workingDays);

        return {
            employee: {
                id: user.id,
                name: `${user.firstName} ${user.lastName}`,
                email: user.email,
                companyId: user.companyId,
                hireDate,
                tenure,
                department: (user as any).department?.nameAr || (user as any).department?.name || 'غير محدد',
                departmentId: user.departmentId || '',
                branch: (user as any).branch?.nameAr || (user as any).branch?.name || 'غير محدد',
                branchId: user.branchId || '',
                jobTitle: (user as any).jobTitle?.titleAr || (user as any).jobTitle?.name || 'غير محدد',
                jobTitleId: user.jobTitleId || '',
                nationality: user.nationality || 'غير محدد',
                isSaudi: user.nationality === 'SA' || user.nationality === 'Saudi',
            },
            contract,
            attendance,
            leaves: this.getDefaultLeaves(),
            custody: this.getDefaultCustody(),
            advances: this.getDefaultAdvances(),
            disciplinary: await this.getDisciplinaryData(employeeId),
            performance: { hasRecentReview: false },
            department: {
                id: user.departmentId || '',
                name: (user as any).department?.nameAr || (user as any).department?.name || 'غير محدد',
                totalEmployees: 0,
                departmentAttendance: 0,
            },
            branch: {
                id: user.branchId || '',
                name: (user as any).branch?.nameAr || (user as any).branch?.name || 'غير محدد',
                totalEmployees: 0,
            },
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
        } as EnrichedPolicyContext;
    }

    private async getContractData(employeeId: string) {
        try {
            const contract = await this.prisma.contract.findFirst({
                where: {
                    userId: employeeId,
                    status: 'ACTIVE',
                } as any,
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
        } catch {
            return this.getDefaultContract();
        }
    }

    private getDefaultContract() {
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

    private async getAttendanceData(employeeId: string, month: number, year: number, workingDays: number) {
        try {
            const { startDate, endDate } = this.getPeriodDates(month, year);

            const records = await this.prisma.attendance.findMany({
                where: {
                    userId: employeeId,
                    checkIn: {
                        gte: startDate,
                        lte: endDate,
                    },
                } as any,
            });

            let presentDays = 0;
            let lateDays = 0;
            let lateMinutes = 0;
            let overtimeHours = 0;

            for (const record of records) {
                const rec = record as any;
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
        } catch {
            return this.getDefaultAttendance(workingDays);
        }
    }

    private getDefaultAttendance(workingDays: number) {
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

    private getDefaultLeaves() {
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

    private getDefaultCustody() {
        return {
            active: 0,
            returned: 0,
            lateReturns: 0,
            totalValue: 0,
            avgReturnDelay: 0,
        };
    }

    private getDefaultAdvances() {
        return {
            active: 0,
            totalAmount: 0,
            remainingAmount: 0,
            monthlyDeduction: 0,
            hasActiveAdvance: false,
        };
    }

    private async getDisciplinaryData(employeeId: string) {
        try {
            const cases = await this.prisma.disciplinaryCase.findMany({
                where: { employeeId },
                orderBy: { incidentDate: 'desc' },
            });

            const totalCases = cases.length;
            const activeCases = cases.filter(c => c.status !== 'FINALIZED_APPROVED' && c.status !== 'FINALIZED_CANCELLED').length;

            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

            const activeWarnings = cases.filter(c =>
                c.decisionType &&
                ['WARNING', 'FIRST_WARNING', 'SECOND_WARNING', 'FINAL_WARNING_TERMINATION'].includes(c.decisionType) &&
                c.incidentDate > oneYearAgo
            ).length;

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
        } catch {
            return {
                totalCases: 0,
                activeCases: 0,
                activeWarnings: 0,
                penalties: [],
            };
        }
    }

    private calculateTenure(hireDate: Date): {
        years: number;
        months: number;
        days: number;
        totalMonths: number;
    } {
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

    private getPeriodDates(month: number, year: number): { startDate: Date; endDate: Date } {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        return { startDate, endDate };
    }

    private calculateWorkingDays(month: number, year: number): number {
        const daysInMonth = new Date(year, month, 0).getDate();
        const weekends = Math.floor(daysInMonth / 7) * 2;
        return daysInMonth - weekends;
    }
}
