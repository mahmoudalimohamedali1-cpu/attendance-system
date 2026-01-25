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
        // 🆕 حقول جديدة لدعم السياسات
        status: string;              // ACTIVE/INACTIVE/TERMINATED
        gender: string;              // MALE/FEMALE
        religion: string;            // MUSLIM/OTHER
        yearsInCurrentRole: number;  // سنوات في المنصب الحالي
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
        // 🆕 حقول جديدة
        hourlyRate: number;           // الأجر بالساعة
        gosiEligibleSalary: number;   // الراتب الخاضع للتأمينات
        daysUntilProbationEnd?: number;
        daysUntilExpiry?: number;     // أيام حتى انتهاء العقد
        terminationType?: string;    // نوع الإنهاء
        autoRenewalEnabled: boolean;  // التجديد التلقائي
        probationResult?: string;     // نتيجة فترة التجربة
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
            // 🆕 حقول جديدة
            earlyArrivalDays: number;    // أيام الحضور المبكر
            earlyMinutes: number;        // دقائق الانصراف المبكر
            missedFingerprints: number;  // بصمات ناقصة
            onCallDays: number;          // أيام المناوبة
            dailyHours: number;          // ساعات العمل اليومية
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
        // 🆕 حقول إضافية للسياسات
        isHoliday: boolean;           // هل اليوم عطلة؟
        lastAbsenceType?: string;     // نوع آخر غياب
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
        currentYear: {
            sickDays: number;      // 🆕 إجمالي الأيام المرضية هذا العام
            annualDays: number;
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
        // 🆕 حقول جديدة لسياسات الإجازات
        hajjLeaveTaken: boolean;      // هل أخذ إجازة حج سابقاً؟
        hasMedicalReport: boolean;    // هل يوجد تقرير طبي؟
        currentLeaveType?: string;    // نوع الإجازة الحالية
        relationshipDegree?: string;  // درجة القرابة (للوفاة)
        relationshipType?: string;    // نوع العلاقة
        monthlyWfhCount: number;      // أيام العمل من المنزل هذا الشهر
        jobAllowsWfh: boolean;        // هل الوظيفة تسمح بالعمل من المنزل؟
        hasExamSchedule: boolean;     // هل لديه جدول اختبارات؟
        hasApproval: boolean;         // هل لديه موافقة؟
    };

    // بيانات العهد
    custody: {
        active: number;
        returned: number;
        lateReturns: number;
        totalValue: number;
        avgReturnDelay: number;
        // 🆕 حقول جديدة
        unreturnedValue: number;          // قيمة العهد غير المرتجعة
        itemCondition?: string;           // حالة العهدة
        daysSinceLastMaintenance: number; // أيام منذ آخر صيانة
        requiresMaintenance: boolean;     // هل تحتاج صيانة؟
        maintenanceCost: number;          // تكلفة الصيانة
        damageReason?: string;            // سبب التلف
        damageType?: string;              // نوع التلف
        lossReason?: string;              // سبب الفقدان
        itemCurrentValue: number;         // القيمة الحالية للعهدة
        daysSinceLastInventory: number;   // أيام منذ آخر جرد
        fromEmployeeStatus?: string;      // حالة الموظف المُسلِّم
        toEmployeeStatus?: string;        // حالة الموظف المُستلِم
    };

    // بيانات السلف
    advances: {
        active: number;
        totalAmount: number;
        remainingAmount: number;
        monthlyDeduction: number;
        hasActiveAdvance: boolean;
        // 🆕 حقول جديدة
        remainingInstallments: number;  // عدد الأقساط المتبقية
        requestedAmount: number;        // المبلغ المطلوب
        lastAdvanceMonthsAgo: number;   // أشهر منذ آخر سلفة
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
        // 🆕 حقول جديدة
        casesThisYear: number;            // مخالفات هذا العام
        lastViolationSeverity?: string;   // شدة آخر مخالفة
        lastAction?: string;              // آخر إجراء تأديبي
        suspensionType?: string;          // نوع الإيقاف
        suspensionDays: number;           // أيام الإيقاف
    };

    // الأداء والتقييمات والتارجت
    performance: {
        // التقييم الأخير (من 5)
        lastRating?: number;
        lastReviewDate?: Date;
        hasRecentReview: boolean;

        // نسبة تحقيق التارجت (مثلاً 105% = حقق أكتر من المطلوب)
        targetAchievement: number; // النسبة المئوية
        targetAmount: number;      // المبلغ المستهدف
        actualAmount: number;      // المبلغ المحقق

        // مستوى التحقيق للحوافز المتدرجة
        achievementLevel: 'BELOW' | 'MET' | 'EXCEEDED' | 'OUTSTANDING'; // أقل/مطابق/تجاوز/متميز
        isAbove100: boolean;       // حقق التارجت؟
        isAbove105: boolean;       // تجاوز 105%؟
        isAbove110: boolean;       // تجاوز 110%؟

        // مؤشرات الأداء الرئيسية (KPIs)
        kpis: {
            salesCount?: number;       // عدد المبيعات
            dealsClosedCount?: number; // عدد الصفقات المُغلقة
            customersAcquired?: number;// عملاء جدد
            customerSatisfaction?: number; // رضا العملاء
        };
        // 🆕 حقول جديدة
        consecutiveHighRatings: number;   // تقييمات ممتازة متتالية
        goalAchievementRate: number;      // نسبة تحقيق الأهداف
        goalValue: number;                // قيمة الهدف
        projectValue: number;             // قيمة المشروع
        completedOnTime: boolean;         // أنجز في الوقت؟
        qualityScore: number;             // معدل الجودة
        hasActivePIP: boolean;            // خطة تحسين أداء نشطة؟
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

    // بيانات تتبع الموقع (Geofencing)
    location: {
        // إجمالي الوقت خارج نطاق الشركة بالدقائق
        minutesOutsideGeofence: number;
        // عدد مرات الخروج من النطاق
        geofenceExitCount: number;
        // أطول فترة متواصلة خارج النطاق بالدقائق
        longestOutsideDuration: number;
        // هل تجاوز الحد المسموح (15 دقيقة)؟
        exceededAllowedTime: boolean;
        // الوقت الزائد عن المسموح (15 دقيقة) بالدقائق
        excessMinutes: number;
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

    // 🚛 اللوجستيات والتوصيل والمستودعات
    logistics: {
        // السائقين والرحلات
        delayMinutes: number;
        onTimeTripsPercentage: number;
        totalTrips: number;
        distanceKm: number;
        fuelConsumption: number;
        fuelEfficiency: number;
        safetyScore: number;
        violationsCount: number;

        // التوصيل
        minutesEarly: number;
        minutesLate: number;
        completedDeliveries: number;
        failedDeliveries: number;
        customerRating: number;
        delayReason?: string;
        returnRate: number;

        // المستودعات والجرد
        accuracyRate: number;
        ordersPicked: number;
        errorRate: number;
        damageValue: number;
        damageReason?: string;
        inventoryVariance: number;

        // الشحن والنقل
        loadWeight: number;
        cargoValue: number;
        tripDuration: number;
        restStops: number;
        nightDrivingHours: number;

        // السلامة والأصول
        vehicleCondition?: string;
        maintenanceScore: number;
        accidentFree: boolean;
        appUsageRate: number;
        gpsAccuracyRate: number;
    };

    // حقول مخصصة ديناميكية - للبيانات الإضافية التي لا تنتمي لفئة محددة
    // يمكن للنظام إضافة حقول جديدة هنا تلقائياً
    customFields: {
        [key: string]: any;
    };

    // قائمة الحقول المتاحة في النظام - للتحقق من صحة السياسات
    _availableFields: string[];
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
                jobTitleRef: true,
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

        this.logger.debug(`Attendance for ${employeeId}: present=${attendance.currentPeriod.presentDays}, absent=${attendance.currentPeriod.absentDays}, late=${attendance.currentPeriod.lateDays}, workingDays=${workingDays}`);

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
                jobTitle: (user as any).jobTitleRef?.titleAr || (user as any).jobTitleRef?.name || user.jobTitle || 'غير محدد',
                jobTitleId: user.jobTitleId || '',
                nationality: user.nationality || 'غير محدد',
                isSaudi: user.nationality === 'SA' || user.nationality === 'Saudi',
                // حقول الراتب - مهمة جداً للسياسات
                salary: Number(user.salary) || 0,
                basicSalary: Number(user.salary) || 0, // alias for compatibility
                // 🆕 حقول جديدة
                status: (user as any).status || 'ACTIVE',
                gender: (user as any).gender || 'UNKNOWN',
                religion: (user as any).religion || 'UNKNOWN',
                yearsInCurrentRole: this.calculateYearsInRole((user as any).roleStartDate || hireDate),
            },
            contract,
            attendance,
            leaves: await this.getLeavesData(employeeId, month, year),
            custody: await this.getCustodyData(employeeId),
            advances: await this.getAdvancesData(employeeId),
            disciplinary: await this.getDisciplinaryData(employeeId),
            performance: await this.getPerformanceData(employeeId, month, year),
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
            // 🚛 بيانات اللوجستيات
            logistics: await this.getLogisticsData(employeeId, month, year),
            // حقول مخصصة ديناميكية
            customFields: await this.getCustomFields(employeeId, user.companyId || '', month, year),
            // قائمة كل الحقول المتاحة
            _availableFields: this.getAllAvailableFields(),
        } as unknown as EnrichedPolicyContext;
    }

    /**
     * جلب الحقول المخصصة للموظف
     */
    private async getCustomFields(employeeId: string, companyId: string, month: number, year: number): Promise<Record<string, any>> {
        try {
            // جلب الحقول المخصصة من جدول CustomFieldValue
            const customValues = await (this.prisma as any).customFieldValue?.findMany?.({
                where: {
                    OR: [
                        { employeeId },
                        { entityType: 'COMPANY', entityId: companyId }
                    ]
                },
                include: { field: true }
            }) || [];

            const result: Record<string, any> = {};
            for (const cv of customValues) {
                const fieldName = cv.field?.name || cv.fieldId;
                result[fieldName] = cv.value;
            }

            // إضافة بيانات إضافية يمكن أن تكون مفيدة
            // مثل: المبيعات، الإنتاجية، إلخ
            const salesData = await this.getSalesData(employeeId, month, year);
            if (salesData) {
                result.sales = salesData;
            }

            return result;
        } catch {
            return {};
        }
    }

    /**
     * جلب بيانات المبيعات (إذا وجدت)
     */
    private async getSalesData(employeeId: string, month: number, year: number): Promise<any> {
        try {
            const { startDate, endDate } = this.getPeriodDates(month, year);

            // جرب من جدول Sales أو SalesRecord
            const sales = await (this.prisma as any).sale?.findMany?.({
                where: {
                    salesPersonId: employeeId,
                    createdAt: { gte: startDate, lte: endDate }
                }
            }) || [];

            if (sales.length === 0) return null;

            const totalAmount = sales.reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0);
            const count = sales.length;

            return {
                count,
                totalAmount,
                averageAmount: count > 0 ? totalAmount / count : 0,
            };
        } catch {
            return null;
        }
    }

    /**
     * قائمة كل الحقول المتاحة في النظام
     */
    getAllAvailableFields(): string[] {
        return [
            // الموظف
            'employee.id', 'employee.name', 'employee.tenure.years', 'employee.tenure.months',
            'employee.department', 'employee.branch', 'employee.jobTitle', 'employee.isSaudi',
            // العقد
            'contract.basicSalary', 'contract.totalSalary', 'contract.isProbation',
            'contract.housingAllowance', 'contract.transportAllowance',
            // الحضور
            'attendance.currentPeriod.presentDays', 'attendance.currentPeriod.absentDays',
            'attendance.currentPeriod.lateDays', 'attendance.currentPeriod.lateMinutes',
            'attendance.currentPeriod.overtimeHours', 'attendance.currentPeriod.attendancePercentage',
            'attendance.patterns.lateStreak', 'attendance.patterns.consecutivePresent',
            // الإجازات
            'leaves.currentMonth.sickDays', 'leaves.currentMonth.annualDays', 'leaves.balance.annual',
            // العهد والسلف
            'custody.active', 'custody.lateReturns', 'advances.hasActiveAdvance', 'advances.remainingAmount',
            // التأديب
            'disciplinary.activeCases', 'disciplinary.activeWarnings',
            // الموقع
            'location.minutesOutsideGeofence', 'location.excessMinutes', 'location.exceededAllowedTime',
            // الأداء
            'performance.targetAchievement', 'performance.isAbove100', 'performance.isAbove105',
            'performance.achievementLevel', 'performance.lastRating',
            // المخصصة
            'customFields.*',
        ];
    }

    /**
     * فحص إذا كان الحقل موجود في النظام
     */
    isFieldAvailable(fieldPath: string): boolean {
        const availableFields = this.getAllAvailableFields();
        // فحص مباشر
        if (availableFields.includes(fieldPath)) return true;
        // فحص wildcard (customFields.*)
        if (fieldPath.startsWith('customFields.')) return true;
        // فحص جزئي
        return availableFields.some(f => fieldPath.startsWith(f.replace('.*', '')));
    }

    /**
     * اقتراح الحقول المفقودة في السياسة
     */
    detectMissingFields(conditions: any[], actions: any[]): string[] {
        const missingFields: string[] = [];
        const allFields = this.getAllAvailableFields();

        // فحص الشروط
        for (const condition of conditions) {
            const field = condition.field || '';
            if (field && !this.isFieldAvailable(field)) {
                missingFields.push(field);
            }
        }

        // فحص المعادلات في الإجراءات
        for (const action of actions) {
            if (action.valueType === 'FORMULA' && action.value) {
                // استخراج الحقول من المعادلة
                const formulaFields = this.extractFieldsFromFormula(action.value);
                for (const field of formulaFields) {
                    if (!this.isFieldAvailable(field)) {
                        missingFields.push(field);
                    }
                }
            }
        }

        return [...new Set(missingFields)]; // إزالة التكرار
    }

    /**
     * استخراج أسماء الحقول من معادلة
     */
    private extractFieldsFromFormula(formula: string): string[] {
        const fieldPattern = /([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)+)/g;
        return formula.match(fieldPattern) || [];
    }

    private async getContractData(employeeId: string) {
        try {
            // 🔧 FIX: جلب بيانات الموظف كـ fallback للراتب
            const employee = await this.prisma.user.findUnique({
                where: { id: employeeId },
                select: { salary: true },
            });

            const contract = await this.prisma.contract.findFirst({
                where: {
                    userId: employeeId,
                    status: 'ACTIVE',
                } as any,
                orderBy: { startDate: 'desc' },
            });

            if (!contract) {
                // 🔧 FIX: إذا مفيش عقد، نستخدم راتب الموظف من جدول users
                const fallbackSalary = Number(employee?.salary || 0);
                return {
                    ...this.getDefaultContract(),
                    basicSalary: fallbackSalary,
                    totalSalary: fallbackSalary,
                };
            }

            // 🔧 FIX: نستخدم contract.basicSalary أو employee.salary كـ fallback
            let basicSalary = Number(contract.basicSalary || 0);
            if (basicSalary === 0 && employee?.salary) {
                basicSalary = Number(employee.salary);
                this.logger.debug(`Using employee.salary (${basicSalary}) as fallback for contract.basicSalary`);
            }

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
                    // 🔧 FIX: Use 'date' field instead of 'checkIn' - checkIn is named 'checkInTime' in schema
                    date: {
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
                // 🆕 حقول جديدة
                isHoliday: false,
                lastAbsenceType: undefined,
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
            // 🆕 حقول جديدة
            earlyArrivalDays: 0,
            earlyMinutes: 0,
            missedFingerprints: 0,
            onCallDays: 0,
            dailyHours: 8,
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
            isHoliday: false,
            lastAbsenceType: undefined,
        };
    }

    /**
     * 🆕 حساب سنوات الخدمة في المنصب الحالي
     */
    private calculateYearsInRole(roleStartDate: Date): number {
        if (!roleStartDate) return 0;
        const now = new Date();
        const diff = now.getTime() - new Date(roleStartDate).getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
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
            currentYear: {
                sickDays: 0,
                annualDays: 0,
            },
            balance: { annual: 0, sick: 0 },
            history: [],
            // 🆕 حقول جديدة
            hajjLeaveTaken: false,
            hasMedicalReport: false,
            currentLeaveType: undefined,
            relationshipDegree: undefined,
            relationshipType: undefined,
            monthlyWfhCount: 0,
            jobAllowsWfh: true,
            hasExamSchedule: false,
            hasApproval: false,
        };
    }

    /**
     * 🆕 جلب بيانات الإجازات الفعلية للموظف
     */
    private async getLeavesData(employeeId: string, month: number, year: number) {
        try {
            const { startDate, endDate } = this.getPeriodDates(month, year);
            const yearStart = new Date(year, 0, 1);
            const yearEnd = new Date(year, 11, 31, 23, 59, 59);

            // جلب إجازات الشهر الحالي
            const monthLeaves = await this.prisma.leaveRequest.findMany({
                where: {
                    userId: employeeId,
                    status: { in: ['APPROVED', 'MGR_APPROVED', 'MODIFIED'] },
                    OR: [
                        { startDate: { gte: startDate, lte: endDate } },
                        { endDate: { gte: startDate, lte: endDate } },
                    ],
                },
            });

            // جلب إجازات العام
            const yearLeaves = await this.prisma.leaveRequest.findMany({
                where: {
                    userId: employeeId,
                    status: { in: ['APPROVED', 'MGR_APPROVED', 'MODIFIED'] },
                    startDate: { gte: yearStart, lte: yearEnd },
                },
            });

            // حساب الإحصائيات للشهر
            let monthSickDays = 0, monthAnnualDays = 0, monthUnpaidDays = 0;
            for (const leave of monthLeaves) {
                const days = leave.approvedDays || leave.requestedDays || 0;
                if (leave.type === 'SICK') monthSickDays += days;
                else if (leave.type === 'ANNUAL') monthAnnualDays += days;
                else if (leave.type === 'UNPAID') monthUnpaidDays += days;
            }

            // حساب الإحصائيات للعام
            let yearSickDays = 0, yearAnnualDays = 0;
            for (const leave of yearLeaves) {
                const days = leave.approvedDays || leave.requestedDays || 0;
                if (leave.type === 'SICK') yearSickDays += days;
                else if (leave.type === 'ANNUAL') yearAnnualDays += days;
            }

            // التحقق من إجازة الحج
            const hajjLeave = await this.prisma.leaveRequest.findFirst({
                where: {
                    userId: employeeId,
                    type: 'HAJJ',
                    status: { in: ['APPROVED', 'MGR_APPROVED', 'MODIFIED'] },
                },
            });

            // جلب آخر إجازة للموظف
            const lastLeave = monthLeaves[0];

            // جلب رصيد الإجازات
            const user = await this.prisma.user.findUnique({
                where: { id: employeeId },
                select: {
                    remainingLeaveDays: true,
                    annualLeaveDays: true,
                },
            });

            return {
                currentMonth: {
                    sickDays: monthSickDays,
                    annualDays: monthAnnualDays,
                    unpaidDays: monthUnpaidDays,
                    totalDays: monthSickDays + monthAnnualDays + monthUnpaidDays,
                    consecutiveSickDays: this.calculateConsecutiveSickDays(monthLeaves),
                },
                currentYear: {
                    sickDays: yearSickDays,
                    annualDays: yearAnnualDays,
                },
                balance: {
                    annual: user?.remainingLeaveDays || 0,
                    sick: 90 - yearSickDays, // الحد الأقصى 90 يوم للمرضي حسب نظام العمل
                },
                history: monthLeaves.map(l => ({
                    type: l.type,
                    days: l.approvedDays || l.requestedDays || 0,
                    from: l.startDate,
                    to: l.endDate,
                })),
                // 🆕 حقول جديدة
                hajjLeaveTaken: !!hajjLeave,
                hasMedicalReport: monthLeaves.some(l => l.attachments !== null),
                currentLeaveType: lastLeave?.type || undefined,
                relationshipDegree: undefined, // يحتاج حقل إضافي في LeaveRequest
                relationshipType: undefined,
                monthlyWfhCount: 0, // سيُحسب من WorkFromHome
                jobAllowsWfh: true,
                hasExamSchedule: monthLeaves.some(l => l.type === 'EXAM'),
                hasApproval: monthLeaves.length > 0,
            };
        } catch (error) {
            this.logger.warn(`Error fetching leaves data for ${employeeId}: ${error.message}`);
            return this.getDefaultLeaves();
        }
    }

    /**
     * حساب الأيام المرضية المتتالية
     */
    private calculateConsecutiveSickDays(leaves: any[]): number {
        const sickLeaves = leaves.filter(l => l.type === 'SICK');
        if (sickLeaves.length === 0) return 0;
        // للتبسيط نرجع آخر إجازة مرضية
        const lastSick = sickLeaves[sickLeaves.length - 1];
        return lastSick?.approvedDays || lastSick?.requestedDays || 0;
    }

    /**
     * 🆕 جلب بيانات السلف الفعلية للموظف
     */
    private async getAdvancesData(employeeId: string) {
        try {
            // جلب السلف النشطة
            const activeAdvances = await this.prisma.advanceRequest.findMany({
                where: {
                    userId: employeeId,
                    status: { in: ['APPROVED', 'ACTIVE'] },
                },
                orderBy: { createdAt: 'desc' },
                include: {
                    payments: true,
                },
            });

            if (activeAdvances.length === 0) {
                // التحقق من آخر سلفة تم أخذها
                const lastAdvance = await this.prisma.advanceRequest.findFirst({
                    where: {
                        userId: employeeId,
                        status: { in: ['APPROVED', 'COMPLETED'] },
                    },
                    orderBy: { createdAt: 'desc' },
                });

                return {
                    active: 0,
                    totalAmount: 0,
                    remainingAmount: 0,
                    monthlyDeduction: 0,
                    hasActiveAdvance: false,
                    remainingInstallments: 0,
                    requestedAmount: 0,
                    lastAdvanceMonthsAgo: lastAdvance
                        ? Math.floor((Date.now() - lastAdvance.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30))
                        : 12,
                };
            }

            // حساب الإحصائيات
            let totalAmount = 0, remainingAmount = 0, monthlyDeduction = 0;
            let totalInstallments = 0, paidInstallments = 0;

            for (const advance of activeAdvances) {
                const approvedAmount = Number(advance.approvedAmount || advance.amount);
                const paidAmount = advance.payments?.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0) || 0;

                totalAmount += approvedAmount;
                remainingAmount += (approvedAmount - paidAmount);
                monthlyDeduction += Number(advance.approvedMonthlyDeduction || advance.monthlyDeduction) || 0;
                totalInstallments += advance.periodMonths || 0;
                paidInstallments += advance.payments?.length || 0;
            }

            return {
                active: activeAdvances.length,
                totalAmount,
                remainingAmount,
                monthlyDeduction,
                hasActiveAdvance: activeAdvances.length > 0,
                remainingInstallments: Math.max(0, totalInstallments - paidInstallments),
                requestedAmount: Number(activeAdvances[0]?.amount) || 0,
                lastAdvanceMonthsAgo: 0,
            };
        } catch (error) {
            this.logger.warn(`Error fetching advances data for ${employeeId}: ${error.message}`);
            return this.getDefaultAdvances();
        }
    }

    /**
     * 📦 جلب بيانات العهد الفعلية
     */
    private async getCustodyData(employeeId: string) {
        try {
            // جلب عناصر العهد للموظف
            const custodyItems = await (this.prisma as any).custodyItem?.findMany?.({
                where: { assignedToId: employeeId },
                include: { maintenanceRecords: true }
            }) || [];

            // حساب الإحصائيات
            const active = custodyItems.filter((c: any) => c.status === 'ASSIGNED').length;
            const returned = custodyItems.filter((c: any) => c.status === 'RETURNED').length;
            const lateReturns = custodyItems.filter((c: any) => c.returnedLate === true).length;
            const totalValue = custodyItems.reduce((sum: number, c: any) => sum + (Number(c.currentValue) || 0), 0);
            const unreturnedValue = custodyItems
                .filter((c: any) => c.status === 'ASSIGNED')
                .reduce((sum: number, c: any) => sum + (Number(c.currentValue) || 0), 0);

            // آخر عنصر تم إرجاعه
            const lastReturnedItem = custodyItems
                .filter((c: any) => c.returnDate)
                .sort((a: any, b: any) => new Date(b.returnDate).getTime() - new Date(a.returnDate).getTime())[0];

            // آخر عنصر يحتاج صيانة
            const itemNeedingMaintenance = custodyItems.find((c: any) =>
                c.maintenanceRecords?.some((m: any) => m.status === 'PENDING')
            );

            // آخر عملية جرد
            const lastInventory = custodyItems
                .filter((c: any) => c.lastInventoryDate)
                .sort((a: any, b: any) => new Date(b.lastInventoryDate).getTime() - new Date(a.lastInventoryDate).getTime())[0];

            const daysSinceLastInventory = lastInventory?.lastInventoryDate
                ? Math.floor((Date.now() - new Date(lastInventory.lastInventoryDate).getTime()) / (1000 * 60 * 60 * 24))
                : 365;

            // آخر صيانة
            const lastMaintenance = custodyItems
                .flatMap((c: any) => c.maintenanceRecords || [])
                .filter((m: any) => m.completedDate)
                .sort((a: any, b: any) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime())[0];

            const daysSinceLastMaintenance = lastMaintenance?.completedDate
                ? Math.floor((Date.now() - new Date(lastMaintenance.completedDate).getTime()) / (1000 * 60 * 60 * 24))
                : 365;

            return {
                active,
                returned,
                lateReturns,
                totalValue,
                avgReturnDelay: 0, // يتطلب حساب معقد
                unreturnedValue,
                itemCondition: custodyItems[0]?.condition,
                daysSinceLastMaintenance,
                requiresMaintenance: !!itemNeedingMaintenance,
                maintenanceCost: custodyItems.reduce((sum: number, c: any) =>
                    sum + (c.maintenanceRecords?.reduce((s: number, m: any) => s + (Number(m.cost) || 0), 0) || 0), 0),
                damageReason: custodyItems.find((c: any) => c.damageReason)?.damageReason,
                damageType: custodyItems.find((c: any) => c.damageType)?.damageType,
                lossReason: custodyItems.find((c: any) => c.lossReason)?.lossReason,
                itemCurrentValue: custodyItems[0]?.currentValue || 0,
                daysSinceLastInventory,
                fromEmployeeStatus: undefined,
                toEmployeeStatus: undefined,
            };
        } catch (error) {
            this.logger.warn(`Error fetching custody data: ${error.message}`);
            return this.getDefaultCustody();
        }
    }

    private getDefaultCustody() {
        return {
            active: 0,
            returned: 0,
            lateReturns: 0,
            totalValue: 0,
            avgReturnDelay: 0,
            unreturnedValue: 0,
            itemCondition: undefined,
            daysSinceLastMaintenance: 0,
            requiresMaintenance: false,
            maintenanceCost: 0,
            damageReason: undefined,
            damageType: undefined,
            lossReason: undefined,
            itemCurrentValue: 0,
            daysSinceLastInventory: 0,
            fromEmployeeStatus: undefined,
            toEmployeeStatus: undefined,
        };
    }

    private getDefaultAdvances() {
        return {
            active: 0,
            totalAmount: 0,
            remainingAmount: 0,
            monthlyDeduction: 0,
            hasActiveAdvance: false,
            // 🆕 حقول جديدة
            remainingInstallments: 0,
            requestedAmount: 0,
            lastAdvanceMonthsAgo: 12,
        };
    }

    /**
     * 🚛 جلب بيانات اللوجستيات الفعلية
     */
    private async getLogisticsData(employeeId: string, month: number, year: number) {
        try {
            // جلب أداء السائق للشهر الحالي
            const driverPerf = await (this.prisma as any).driverPerformance?.findFirst?.({
                where: {
                    driverId: employeeId,
                    month,
                    year
                }
            });

            // جلب آخر عملية جرد للموظف
            const lastInventory = await (this.prisma as any).inventoryCount?.findFirst?.({
                where: { conductedBy: employeeId },
                orderBy: { countDate: 'desc' }
            });

            // جلب التوصيلات الحالية للشهر
            const { startDate, endDate } = this.getPeriodDates(month, year);
            const deliveries = await (this.prisma as any).delivery?.findMany?.({
                where: {
                    driverId: employeeId,
                    deliveryDate: { gte: startDate, lte: endDate }
                }
            }) || [];

            // حساب إحصائيات التوصيل
            const completedDeliveries = deliveries.filter((d: any) => d.status === 'DELIVERED').length;
            const failedDeliveries = deliveries.filter((d: any) => d.status === 'FAILED').length;
            const avgRating = deliveries.length > 0
                ? deliveries.reduce((sum: number, d: any) => sum + (Number(d.customerRating) || 0), 0) / deliveries.filter((d: any) => d.customerRating).length || 5
                : 5;

            return {
                // السائقين والرحلات
                delayMinutes: 0,
                onTimeTripsPercentage: Number(driverPerf?.onTimePercentage) || 100,
                totalTrips: driverPerf?.totalTrips || 0,
                distanceKm: Number(driverPerf?.totalDistanceKm) || 0,
                fuelConsumption: 0,
                fuelEfficiency: Number(driverPerf?.fuelEfficiency) || 0,
                safetyScore: driverPerf?.safetyScore || 100,
                violationsCount: driverPerf?.violationsCount || 0,

                // التوصيل
                minutesEarly: 0,
                minutesLate: 0,
                completedDeliveries: driverPerf?.completedDeliveries || completedDeliveries,
                failedDeliveries: driverPerf?.failedDeliveries || failedDeliveries,
                customerRating: Number(driverPerf?.averageRating) || avgRating,
                delayReason: undefined,
                returnRate: Number(driverPerf?.returnRate) || 0,

                // المستودعات والجرد
                accuracyRate: Number(lastInventory?.accuracyRate) || 100,
                ordersPicked: 0,
                errorRate: 0,
                damageValue: Number(lastInventory?.damageValue) || 0,
                damageReason: lastInventory?.damageReason || undefined,
                inventoryVariance: lastInventory?.variance || 0,

                // الشحن والنقل
                loadWeight: 0,
                cargoValue: 0,
                tripDuration: 0,
                restStops: 0,
                nightDrivingHours: 0,

                // السلامة والأصول
                vehicleCondition: 'GOOD',
                maintenanceScore: 100,
                accidentFree: driverPerf?.accidentFree ?? true,
                appUsageRate: 100,
                gpsAccuracyRate: 100,
            };
        } catch (error) {
            this.logger.warn(`Error fetching logistics data for ${employeeId}: ${error.message}`);
            return this.getDefaultLogistics();
        }
    }

    /**
     * 🚛 بيانات اللوجستيات الافتراضية (fallback)
     */
    private getDefaultLogistics() {
        return {
            delayMinutes: 0,
            onTimeTripsPercentage: 100,
            totalTrips: 0,
            distanceKm: 0,
            fuelConsumption: 0,
            fuelEfficiency: 0,
            safetyScore: 100,
            violationsCount: 0,
            minutesEarly: 0,
            minutesLate: 0,
            completedDeliveries: 0,
            failedDeliveries: 0,
            customerRating: 5,
            delayReason: undefined,
            returnRate: 0,
            accuracyRate: 100,
            ordersPicked: 0,
            errorRate: 0,
            damageValue: 0,
            damageReason: undefined,
            inventoryVariance: 0,
            loadWeight: 0,
            cargoValue: 0,
            tripDuration: 0,
            restStops: 0,
            nightDrivingHours: 0,
            vehicleCondition: 'GOOD',
            maintenanceScore: 100,
            accidentFree: true,
            appUsageRate: 100,
            gpsAccuracyRate: 100,
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

            // 🆕 حقول جديدة
            const casesThisYear = cases.filter(c => c.incidentDate > oneYearAgo).length;
            const lastViolationSeverity = (cases[0] as any)?.severity || undefined;
            const lastAction = cases[0]?.decisionType || undefined;

            return {
                totalCases,
                activeCases,
                activeWarnings,
                lastIncidentDate,
                daysSinceLastIncident,
                penalties: [],
                // 🆕 حقول جديدة
                casesThisYear,
                lastViolationSeverity,
                lastAction,
                suspensionType: undefined,
                suspensionDays: 0,
            };
        } catch {
            return {
                totalCases: 0,
                activeCases: 0,
                activeWarnings: 0,
                penalties: [],
                // 🆕 حقول جديدة
                casesThisYear: 0,
                lastViolationSeverity: undefined,
                lastAction: undefined,
                suspensionType: undefined,
                suspensionDays: 0,
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
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0); // Last day of month
        let workingDays = 0;

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay();
            // Sunday (0) to Thursday (4) are working days as per system standard
            if (dayOfWeek >= 0 && dayOfWeek <= 4) {
                workingDays++;
            }
        }

        this.logger.debug(`Calculated working days for ${year}-${month}: ${workingDays}`);
        return workingDays;
    }

    /**
     * جلب بيانات تتبع الموقع (Geofencing)
     * يحسب الوقت الذي قضاه الموظف خارج نطاق الشركة
     */
    private async getLocationTrackingData(employeeId: string, month: number, year: number) {
        const ALLOWED_MINUTES_OUTSIDE = 15; // الوقت المسموح خارج النطاق

        try {
            const { startDate, endDate } = this.getPeriodDates(month, year);

            // جلب سجلات تتبع الموقع من قاعدة البيانات
            const locationRecords = await (this.prisma as any).locationLog?.findMany?.({
                where: {
                    userId: employeeId,
                    timestamp: {
                        gte: startDate,
                        lte: endDate,
                    },
                    isWithinGeofence: false, // خارج النطاق فقط
                },
                orderBy: { timestamp: 'asc' },
            }) || [];

            // إذا لم يوجد جدول LocationLog، جرب GeofenceEvent
            let minutesOutsideGeofence = 0;
            let geofenceExitCount = 0;
            let longestOutsideDuration = 0;

            if (locationRecords.length > 0) {
                // حساب الوقت خارج النطاق
                for (const record of locationRecords) {
                    const duration = Number(record.durationOutside || record.duration || 1);
                    minutesOutsideGeofence += duration;
                    geofenceExitCount++;
                    if (duration > longestOutsideDuration) {
                        longestOutsideDuration = duration;
                    }
                }
            } else {
                // جرب جدول GeofenceEvent أو Attendance مع حقل geofence
                const geofenceEvents = await (this.prisma as any).geofenceEvent?.findMany?.({
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
                    const duration = Number(event.durationMinutes || 5); // افتراضي 5 دقائق
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
        } catch (error) {
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

    /**
     * جلب بيانات الأداء والتارجت
     * يحسب نسبة تحقيق الهدف ومستوى الإنجاز للحوافز المتدرجة
     */
    private async getPerformanceData(employeeId: string, month: number, year: number) {
        try {
            const { startDate, endDate } = this.getPeriodDates(month, year);

            // جلب أهداف الأداء والتحقيق من قاعدة البيانات
            let targetAmount = 0;
            let actualAmount = 0;

            // جرب جلب من PerformanceGoal أو SalesTarget
            const performanceGoal = await (this.prisma as any).performanceGoal?.findFirst?.({
                where: {
                    employeeId: employeeId,
                    periodStart: { lte: endDate },
                    periodEnd: { gte: startDate },
                },
            });

            if (performanceGoal) {
                targetAmount = Number(performanceGoal.targetAmount || performanceGoal.targetValue || 0);
                actualAmount = Number(performanceGoal.actualAmount || performanceGoal.actualValue || 0);
            } else {
                // جرب من SalesTarget
                const salesTarget = await (this.prisma as any).salesTarget?.findFirst?.({
                    where: {
                        employeeId: employeeId,
                        month: month,
                        year: year,
                    },
                });

                if (salesTarget) {
                    targetAmount = Number(salesTarget.targetAmount || 0);
                    actualAmount = Number(salesTarget.achieved || salesTarget.actualAmount || 0);
                }
            }

            // حساب نسبة التحقيق
            const targetAchievement = targetAmount > 0
                ? Math.round((actualAmount / targetAmount) * 100)
                : 0;

            // تحديد مستوى التحقيق
            let achievementLevel: 'BELOW' | 'MET' | 'EXCEEDED' | 'OUTSTANDING' = 'BELOW';
            if (targetAchievement >= 110) {
                achievementLevel = 'OUTSTANDING';
            } else if (targetAchievement >= 105) {
                achievementLevel = 'EXCEEDED';
            } else if (targetAchievement >= 100) {
                achievementLevel = 'MET';
            }

            // الحصول على آخر تقييم
            const lastReview = await (this.prisma as any).performanceReview?.findFirst?.({
                where: { employeeId: employeeId },
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
                // 🆕 حقول جديدة
                consecutiveHighRatings: 0,
                goalAchievementRate: targetAchievement,
                goalValue: targetAmount,
                projectValue: 0,
                completedOnTime: true,
                qualityScore: lastReview?.rating ? lastReview.rating * 20 : 0,
                hasActivePIP: false,
            };
        } catch (error) {
            this.logger.warn(`Error fetching performance data for ${employeeId}: ${error.message}`);
            return {
                hasRecentReview: false,
                targetAchievement: 0,
                targetAmount: 0,
                actualAmount: 0,
                achievementLevel: 'BELOW' as const,
                isAbove100: false,
                isAbove105: false,
                isAbove110: false,
                kpis: {},
                // 🆕 حقول جديدة
                consecutiveHighRatings: 0,
                goalAchievementRate: 0,
                goalValue: 0,
                projectValue: 0,
                completedOnTime: true,
                qualityScore: 0,
                hasActivePIP: false,
            };
        }
    }
}
