import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * 🔍 Pattern Detection Service
 *
 * Analyzes historical attendance data to detect recurring absence patterns
 * and trends that can inform predictive models and management decisions.
 *
 * Features:
 * - Monday/Friday absence detection (weekend-adjacent patterns)
 * - Post-holiday absence detection
 * - Seasonal trend analysis
 * - Department-specific patterns
 * - Repeated absence sequences
 * - Pattern confidence scoring
 */

interface DetectedPattern {
    patternType: string;
    description: string;
    affectedEmployees: string[]; // Array of employee IDs
    confidence: number; // 0.0 - 1.0
    detectedAt: Date;
    insights: string[];
}

interface DayPattern {
    dayName: string;
    dayIndex: number;
    absenceRate: number;
    absenceCount: number;
    totalCount: number;
}

interface DepartmentPattern {
    departmentId: string;
    departmentName: string;
    absenceRate: number;
    employeeCount: number;
    comparison: string;
}

@Injectable()
export class PatternDetectionService {
    private readonly logger = new Logger(PatternDetectionService.name);

    // فترة تحليل الأنماط (بالأيام)
    private readonly ANALYSIS_PERIOD_DAYS = 90;

    // حدود الثقة للأنماط
    private readonly CONFIDENCE_THRESHOLDS = {
        HIGH: 0.7, // ثقة عالية
        MEDIUM: 0.5, // ثقة متوسطة
        LOW: 0.3, // ثقة منخفضة
    };

    // الحد الأدنى لعدد الحالات لاعتبار النمط صالحاً
    private readonly MIN_PATTERN_OCCURRENCES = 5;

    // أسماء الأيام بالعربية
    private readonly DAYS_AR = [
        'الأحد',
        'الاثنين',
        'الثلاثاء',
        'الأربعاء',
        'الخميس',
        'الجمعة',
        'السبت',
    ];

    constructor(private readonly prisma: PrismaService) {}

    /**
     * 🔍 اكتشاف جميع الأنماط للشركة
     */
    async detectAllPatterns(companyId: string): Promise<DetectedPattern[]> {
        try {
            this.logger.log(`Starting pattern detection for company ${companyId}`);

            const patterns: DetectedPattern[] = [];

            // 1. اكتشاف أنماط أيام الأسبوع (الاثنين/الجمعة)
            const weekdayPatterns = await this.detectWeekdayPatterns(companyId);
            patterns.push(...weekdayPatterns);

            // 2. اكتشاف أنماط ما بعد الإجازات
            const postHolidayPatterns = await this.detectPostHolidayPatterns(companyId);
            patterns.push(...postHolidayPatterns);

            // 3. اكتشاف الاتجاهات الموسمية
            const seasonalPatterns = await this.detectSeasonalTrends(companyId);
            patterns.push(...seasonalPatterns);

            // 4. اكتشاف أنماط خاصة بالأقسام
            const departmentPatterns = await this.detectDepartmentPatterns(companyId);
            patterns.push(...departmentPatterns);

            // 5. اكتشاف تسلسلات الغياب المتكررة
            const sequencePatterns = await this.detectRepeatedSequences(companyId);
            patterns.push(...sequencePatterns);

            // 6. حفظ الأنماط في قاعدة البيانات
            await this.savePatterns(companyId, patterns);

            this.logger.log(`Detected ${patterns.length} patterns for company ${companyId}`);

            return patterns;
        } catch (error) {
            this.logger.error(`Error detecting patterns for company ${companyId}:`, error);
            throw error;
        }
    }

    /**
     * 📅 اكتشاف أنماط أيام الأسبوع (الاثنين/الجمعة)
     */
    private async detectWeekdayPatterns(companyId: string): Promise<DetectedPattern[]> {
        const patterns: DetectedPattern[] = [];

        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - this.ANALYSIS_PERIOD_DAYS);

        // جلب سجلات الحضور
        const attendanceRecords = await this.prisma.attendance.findMany({
            where: {
                user: { companyId },
                date: { gte: fromDate },
            },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });

        // تحليل الغياب حسب يوم الأسبوع
        const dayStats: { [day: number]: { total: number; absent: number; employees: Set<string> } } = {};
        for (let i = 0; i <= 6; i++) {
            dayStats[i] = { total: 0, absent: 0, employees: new Set<string>() };
        }

        for (const record of attendanceRecords) {
            const dayOfWeek = new Date(record.date).getDay();
            dayStats[dayOfWeek].total++;
            if (record.status === 'ABSENT') {
                dayStats[dayOfWeek].absent++;
                dayStats[dayOfWeek].employees.add(record.userId);
            }
        }

        // حساب معدل الغياب الإجمالي
        const totalRecords = attendanceRecords.length;
        const totalAbsences = attendanceRecords.filter((r) => r.status === 'ABSENT').length;
        const globalAbsenceRate = totalRecords > 0 ? totalAbsences / totalRecords : 0;

        // اكتشاف أيام ذات معدلات غياب مرتفعة
        for (let day = 0; day <= 6; day++) {
            const stats = dayStats[day];
            if (stats.total < this.MIN_PATTERN_OCCURRENCES) continue;

            const dayAbsenceRate = stats.absent / stats.total;

            // إذا كان معدل الغياب أعلى من المعدل الإجمالي بنسبة 30% على الأقل
            if (dayAbsenceRate > globalAbsenceRate * 1.3 && stats.absent >= this.MIN_PATTERN_OCCURRENCES) {
                const confidence = Math.min(
                    (dayAbsenceRate - globalAbsenceRate) / globalAbsenceRate,
                    1.0,
                );

                const dayName = this.DAYS_AR[day];
                const isWeekendAdjacent = day === 1 || day === 5; // الاثنين أو الجمعة

                patterns.push({
                    patternType: isWeekendAdjacent ? 'WEEKEND_ADJACENT' : 'HIGH_ABSENCE_DAY',
                    description: `معدل غياب مرتفع يوم ${dayName} (${(dayAbsenceRate * 100).toFixed(1)}%)`,
                    affectedEmployees: Array.from(stats.employees),
                    confidence,
                    detectedAt: new Date(),
                    insights: [
                        `${stats.absent} حالة غياب من أصل ${stats.total} سجل`,
                        `أعلى من المعدل العام بنسبة ${((dayAbsenceRate / globalAbsenceRate - 1) * 100).toFixed(0)}%`,
                        isWeekendAdjacent
                            ? '⚠️ يوم مجاور لعطلة نهاية الأسبوع - نمط شائع'
                            : '',
                    ].filter(Boolean),
                });
            }
        }

        return patterns;
    }

    /**
     * 🎉 اكتشاف أنماط ما بعد الإجازات
     */
    private async detectPostHolidayPatterns(companyId: string): Promise<DetectedPattern[]> {
        const patterns: DetectedPattern[] = [];

        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - this.ANALYSIS_PERIOD_DAYS);

        // جلب طلبات الإجازة المعتمدة
        const approvedLeaves = await this.prisma.leaveRequest.findMany({
            where: {
                user: { companyId },
                status: 'APPROVED',
                endDate: { gte: fromDate },
            },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });

        const postLeaveAbsences: { userId: string; absenceCount: number }[] = [];

        // تحليل الغياب في الأيام التالية للإجازة
        for (const leave of approvedLeaves) {
            const postLeaveStart = new Date(leave.endDate);
            postLeaveStart.setDate(postLeaveStart.getDate() + 1);

            const postLeaveEnd = new Date(postLeaveStart);
            postLeaveEnd.setDate(postLeaveEnd.getDate() + 3); // 3 أيام بعد الإجازة

            const absenceCount = await this.prisma.attendance.count({
                where: {
                    userId: leave.userId,
                    date: {
                        gte: postLeaveStart,
                        lte: postLeaveEnd,
                    },
                    status: 'ABSENT',
                },
            });

            if (absenceCount > 0) {
                postLeaveAbsences.push({ userId: leave.userId, absenceCount });
            }
        }

        // إذا كان هناك عدد كافٍ من حالات الغياب بعد الإجازات
        if (postLeaveAbsences.length >= this.MIN_PATTERN_OCCURRENCES) {
            const affectedEmployees = Array.from(new Set(postLeaveAbsences.map((p) => p.userId)));
            const totalAbsences = postLeaveAbsences.reduce((sum, p) => sum + p.absenceCount, 0);

            const confidence = Math.min(postLeaveAbsences.length / approvedLeaves.length, 1.0);

            patterns.push({
                patternType: 'POST_HOLIDAY',
                description: `غياب متكرر بعد الإجازات (${postLeaveAbsences.length} حالة)`,
                affectedEmployees,
                confidence,
                detectedAt: new Date(),
                insights: [
                    `${affectedEmployees.length} موظف يميلون للغياب بعد الإجازات`,
                    `إجمالي ${totalAbsences} حالة غياب في الأيام الثلاثة التالية للإجازات`,
                    `معدل الحدوث: ${((postLeaveAbsences.length / approvedLeaves.length) * 100).toFixed(1)}%`,
                ],
            });
        }

        return patterns;
    }

    /**
     * 🌡️ اكتشاف الاتجاهات الموسمية
     */
    private async detectSeasonalTrends(companyId: string): Promise<DetectedPattern[]> {
        const patterns: DetectedPattern[] = [];

        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - this.ANALYSIS_PERIOD_DAYS);

        const attendanceRecords = await this.prisma.attendance.findMany({
            where: {
                user: { companyId },
                date: { gte: fromDate },
            },
        });

        // تحليل الغياب حسب الشهر
        const monthlyStats: { [month: number]: { total: number; absent: number; employees: Set<string> } } =
            {};
        for (let i = 1; i <= 12; i++) {
            monthlyStats[i] = { total: 0, absent: 0, employees: new Set<string>() };
        }

        for (const record of attendanceRecords) {
            const month = new Date(record.date).getMonth() + 1;
            monthlyStats[month].total++;
            if (record.status === 'ABSENT') {
                monthlyStats[month].absent++;
                monthlyStats[month].employees.add(record.userId);
            }
        }

        // حساب معدل الغياب الإجمالي
        const totalRecords = attendanceRecords.length;
        const totalAbsences = attendanceRecords.filter((r) => r.status === 'ABSENT').length;
        const globalAbsenceRate = totalRecords > 0 ? totalAbsences / totalRecords : 0;

        // اكتشاف أشهر ذات معدلات غياب مرتفعة
        const monthNames = [
            '',
            'يناير',
            'فبراير',
            'مارس',
            'أبريل',
            'مايو',
            'يونيو',
            'يوليو',
            'أغسطس',
            'سبتمبر',
            'أكتوبر',
            'نوفمبر',
            'ديسمبر',
        ];

        for (let month = 1; month <= 12; month++) {
            const stats = monthlyStats[month];
            if (stats.total < this.MIN_PATTERN_OCCURRENCES) continue;

            const monthAbsenceRate = stats.absent / stats.total;

            // إذا كان معدل الغياب أعلى من المعدل الإجمالي بنسبة 40% على الأقل
            if (monthAbsenceRate > globalAbsenceRate * 1.4 && stats.absent >= this.MIN_PATTERN_OCCURRENCES) {
                const confidence = Math.min(
                    (monthAbsenceRate - globalAbsenceRate) / globalAbsenceRate,
                    1.0,
                );

                patterns.push({
                    patternType: 'SEASONAL',
                    description: `اتجاه موسمي: غياب مرتفع في ${monthNames[month]} (${(monthAbsenceRate * 100).toFixed(1)}%)`,
                    affectedEmployees: Array.from(stats.employees),
                    confidence,
                    detectedAt: new Date(),
                    insights: [
                        `${stats.absent} حالة غياب من أصل ${stats.total} سجل`,
                        `أعلى من المعدل السنوي بنسبة ${((monthAbsenceRate / globalAbsenceRate - 1) * 100).toFixed(0)}%`,
                        '💡 قد يكون مرتبطاً بعوامل موسمية (طقس، إجازات، أعياد)',
                    ],
                });
            }
        }

        return patterns;
    }

    /**
     * 🏢 اكتشاف أنماط خاصة بالأقسام
     */
    private async detectDepartmentPatterns(companyId: string): Promise<DetectedPattern[]> {
        const patterns: DetectedPattern[] = [];

        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - this.ANALYSIS_PERIOD_DAYS);

        // جلب الأقسام
        const departments = await this.prisma.department.findMany({
            where: { companyId },
            select: { id: true, name: true },
        });

        if (departments.length === 0) {
            return patterns;
        }

        // جلب سجلات الحضور مع معلومات القسم
        const attendanceRecords = await this.prisma.attendance.findMany({
            where: {
                user: { companyId },
                date: { gte: fromDate },
            },
            include: {
                user: {
                    select: { id: true, departmentId: true },
                },
            },
        });

        // تحليل الغياب حسب القسم
        const deptStats: {
            [deptId: string]: { total: number; absent: number; employees: Set<string>; name: string };
        } = {};

        for (const dept of departments) {
            deptStats[dept.id] = { total: 0, absent: 0, employees: new Set<string>(), name: dept.name };
        }

        for (const record of attendanceRecords) {
            const deptId = record.user.departmentId;
            if (!deptId || !deptStats[deptId]) continue;

            deptStats[deptId].total++;
            if (record.status === 'ABSENT') {
                deptStats[deptId].absent++;
                deptStats[deptId].employees.add(record.userId);
            }
        }

        // حساب معدل الغياب الإجمالي
        const totalRecords = attendanceRecords.length;
        const totalAbsences = attendanceRecords.filter((r) => r.status === 'ABSENT').length;
        const globalAbsenceRate = totalRecords > 0 ? totalAbsences / totalRecords : 0;

        // اكتشاف أقسام ذات معدلات غياب مرتفعة
        for (const [deptId, stats] of Object.entries(deptStats)) {
            if (stats.total < this.MIN_PATTERN_OCCURRENCES) continue;

            const deptAbsenceRate = stats.absent / stats.total;

            // إذا كان معدل الغياب أعلى من المعدل الإجمالي بنسبة 35% على الأقل
            if (deptAbsenceRate > globalAbsenceRate * 1.35 && stats.absent >= this.MIN_PATTERN_OCCURRENCES) {
                const confidence = Math.min((deptAbsenceRate - globalAbsenceRate) / globalAbsenceRate, 1.0);

                patterns.push({
                    patternType: 'DEPARTMENT_SPECIFIC',
                    description: `معدل غياب مرتفع في قسم ${stats.name} (${(deptAbsenceRate * 100).toFixed(1)}%)`,
                    affectedEmployees: Array.from(stats.employees),
                    confidence,
                    detectedAt: new Date(),
                    insights: [
                        `${stats.absent} حالة غياب من أصل ${stats.total} سجل`,
                        `أعلى من المعدل العام بنسبة ${((deptAbsenceRate / globalAbsenceRate - 1) * 100).toFixed(0)}%`,
                        '🔍 يُنصح بمراجعة ظروف العمل وبيئة القسم',
                    ],
                });
            }
        }

        return patterns;
    }

    /**
     * 🔄 اكتشاف تسلسلات الغياب المتكررة
     */
    private async detectRepeatedSequences(companyId: string): Promise<DetectedPattern[]> {
        const patterns: DetectedPattern[] = [];

        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - this.ANALYSIS_PERIOD_DAYS);

        // جلب الموظفين مع سجلات الغياب
        const employees = await this.prisma.user.findMany({
            where: {
                companyId,
                status: 'ACTIVE',
                role: 'EMPLOYEE',
            },
            select: { id: true, firstName: true, lastName: true },
        });

        const repeatedAbsenceEmployees: string[] = [];

        // تحليل تسلسلات الغياب لكل موظف
        for (const employee of employees) {
            const absences = await this.prisma.attendance.findMany({
                where: {
                    userId: employee.id,
                    date: { gte: fromDate },
                    status: 'ABSENT',
                },
                orderBy: { date: 'asc' },
            });

            if (absences.length < 3) continue;

            // البحث عن تسلسلات متكررة (غياب يومين أو أكثر متتاليين)
            let consecutiveCount = 0;
            let hasRepeatedSequence = false;

            for (let i = 1; i < absences.length; i++) {
                const prevDate = new Date(absences[i - 1].date);
                const currDate = new Date(absences[i].date);
                const daysDiff = Math.floor(
                    (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
                );

                if (daysDiff === 1) {
                    consecutiveCount++;
                    if (consecutiveCount >= 2) {
                        hasRepeatedSequence = true;
                        break;
                    }
                } else {
                    consecutiveCount = 0;
                }
            }

            if (hasRepeatedSequence) {
                repeatedAbsenceEmployees.push(employee.id);
            }
        }

        // إذا كان هناك عدد كافٍ من الموظفين بتسلسلات متكررة
        if (repeatedAbsenceEmployees.length >= this.MIN_PATTERN_OCCURRENCES) {
            const confidence = Math.min(repeatedAbsenceEmployees.length / employees.length, 1.0);

            patterns.push({
                patternType: 'REPEATED_SEQUENCE',
                description: `تسلسلات غياب متكررة (${repeatedAbsenceEmployees.length} موظف)`,
                affectedEmployees: repeatedAbsenceEmployees,
                confidence,
                detectedAt: new Date(),
                insights: [
                    `${repeatedAbsenceEmployees.length} موظف لديهم أنماط غياب متتالية`,
                    '⚠️ قد يشير إلى مشاكل صحية أو عمل مزمنة',
                    '💡 يُنصح بالمتابعة الفردية مع هؤلاء الموظفين',
                ],
            });
        }

        return patterns;
    }

    /**
     * 💾 حفظ الأنماط في قاعدة البيانات
     */
    private async savePatterns(companyId: string, patterns: DetectedPattern[]): Promise<void> {
        try {
            // حذف الأنماط القديمة (أكثر من 30 يوماً)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            await this.prisma.absencePattern.deleteMany({
                where: {
                    companyId,
                    detectedAt: { lt: thirtyDaysAgo },
                },
            });

            // حفظ الأنماط الجديدة
            for (const pattern of patterns) {
                await this.prisma.absencePattern.create({
                    data: {
                        companyId,
                        patternType: pattern.patternType,
                        description: pattern.description,
                        affectedEmployees: pattern.affectedEmployees,
                        confidence: pattern.confidence,
                        detectedAt: pattern.detectedAt,
                    },
                });
            }

            this.logger.log(`Saved ${patterns.length} patterns to database for company ${companyId}`);
        } catch (error) {
            this.logger.error('Error saving patterns to database:', error);
            // لا نرمي الخطأ لأن الحفظ ليس ضرورياً لعمل الكشف
        }
    }

    /**
     * 📊 الحصول على الأنماط المحفوظة
     */
    async getStoredPatterns(companyId: string, limit: number = 20): Promise<DetectedPattern[]> {
        const patterns = await this.prisma.absencePattern.findMany({
            where: { companyId },
            orderBy: { detectedAt: 'desc' },
            take: limit,
        });

        return patterns.map((p) => ({
            patternType: p.patternType,
            description: p.description,
            affectedEmployees: p.affectedEmployees as string[],
            confidence: Number(p.confidence),
            detectedAt: p.detectedAt,
            insights: [], // الرؤى لا يتم حفظها في قاعدة البيانات
        }));
    }

    /**
     * 🎯 الحصول على الأنماط حسب النوع
     */
    async getPatternsByType(companyId: string, patternType: string): Promise<DetectedPattern[]> {
        const patterns = await this.prisma.absencePattern.findMany({
            where: {
                companyId,
                patternType,
            },
            orderBy: { detectedAt: 'desc' },
            take: 10,
        });

        return patterns.map((p) => ({
            patternType: p.patternType,
            description: p.description,
            affectedEmployees: p.affectedEmployees as string[],
            confidence: Number(p.confidence),
            detectedAt: p.detectedAt,
            insights: [],
        }));
    }
}
