import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
    CoverageAnalysisRequestDto,
    CoverageAnalysisResponseDto,
    CoverageAnalysisType,
    DepartmentCoverage,
    ShiftCoverage,
    CoverageGapDetail,
    GapSeverity,
} from '../dto/coverage-analysis.dto';

@Injectable()
export class CoverageAnalyzerService {
    private readonly logger = new Logger(CoverageAnalyzerService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * Analyze workforce coverage and identify gaps
     */
    async analyzeCoverage(
        companyId: string,
        requestDto: CoverageAnalysisRequestDto,
    ): Promise<CoverageAnalysisResponseDto> {
        this.logger.debug(
            `Analyzing coverage for company ${companyId} on date ${requestDto.date}`,
        );

        const analysisType = requestDto.analysisType || CoverageAnalysisType.DAILY;
        const targetDate = new Date(requestDto.date);

        try {
            // Analyze department coverage
            const departmentCoverage = await this.analyzeDepartmentCoverage(
                companyId,
                targetDate,
                requestDto.branchId,
                requestDto.departmentId,
            );

            // Analyze shift coverage
            const shiftCoverage = await this.analyzeShiftCoverage(
                companyId,
                targetDate,
                requestDto.branchId,
                requestDto.departmentId,
            );

            // Identify critical gaps
            const criticalGaps = await this.identifyCriticalGaps(
                companyId,
                targetDate,
                departmentCoverage,
                requestDto.branchId,
                requestDto.departmentId,
            );

            // Calculate overall metrics
            const totalGaps = departmentCoverage.reduce((sum, dept) => sum + Math.abs(dept.gap), 0);
            const overallCoveragePercentage = this.calculateOverallCoverage(departmentCoverage);

            // Generate recommendations
            const recommendations = this.generateRecommendations(
                departmentCoverage,
                shiftCoverage,
                criticalGaps,
            );

            // Determine overall status
            const overallStatus = this.determineOverallStatus(overallCoveragePercentage, criticalGaps);

            return {
                companyId,
                date: requestDto.date,
                analysisType,
                overallCoveragePercentage,
                totalGaps,
                departmentCoverage,
                shiftCoverage,
                criticalGaps,
                recommendations,
                overallStatus,
                generatedAt: new Date(),
            };
        } catch (error) {
            this.logger.error(`Failed to analyze coverage: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Analyze coverage by department
     */
    private async analyzeDepartmentCoverage(
        companyId: string,
        targetDate: Date,
        branchId?: string,
        departmentId?: string,
    ): Promise<DepartmentCoverage[]> {
        // Build where clause for filtering
        const whereClause: any = {
            companyId,
            role: 'EMPLOYEE',
            status: 'ACTIVE',
        };

        if (branchId) {
            whereClause.branchId = branchId;
        }

        if (departmentId) {
            whereClause.departmentId = departmentId;
        }

        // Get departments with employee counts
        const departments = await this.prisma.department.findMany({
            where: {
                companyId,
                ...(departmentId ? { id: departmentId } : {}),
            },
            include: {
                users: {
                    where: whereClause,
                },
            },
        });

        const coverageData: DepartmentCoverage[] = [];

        for (const department of departments) {
            const totalEmployees = department.users.length;

            // Get attendance data for the target date
            const attendanceData = await this.prisma.attendance.findMany({
                where: {
                    companyId,
                    date: targetDate,
                    user: {
                        departmentId: department.id,
                        ...(branchId ? { branchId } : {}),
                    },
                },
                include: {
                    user: true,
                },
            });

            // Count present employees
            const presentStaff = attendanceData.filter(
                (att) => att.status === 'PRESENT' || att.status === 'LATE',
            ).length;

            // Get leave requests for the target date
            const leaveRequests = await this.prisma.leaveRequest.count({
                where: {
                    companyId,
                    status: 'APPROVED',
                    startDate: { lte: targetDate },
                    endDate: { gte: targetDate },
                    user: {
                        departmentId: department.id,
                        ...(branchId ? { branchId } : {}),
                    },
                },
            });

            // Calculate required staff (assume 80% of total as baseline)
            const requiredStaff = Math.ceil(totalEmployees * 0.8);
            const availableStaff = totalEmployees - leaveRequests;
            const gap = availableStaff - requiredStaff;
            const coveragePercentage = requiredStaff > 0
                ? Math.round((availableStaff / requiredStaff) * 100)
                : 100;

            // Determine severity
            const severity = this.calculateSeverity(coveragePercentage, gap);

            coverageData.push({
                departmentName: department.name,
                departmentId: department.id,
                requiredStaff,
                availableStaff,
                presentStaff,
                onLeave: leaveRequests,
                gap,
                coveragePercentage,
                severity,
            });
        }

        return coverageData;
    }

    /**
     * Analyze coverage by shift
     */
    private async analyzeShiftCoverage(
        companyId: string,
        targetDate: Date,
        branchId?: string,
        departmentId?: string,
    ): Promise<ShiftCoverage[]> {
        // Get branch information for shift times
        const branches = await this.prisma.branch.findMany({
            where: {
                companyId,
                ...(branchId ? { id: branchId } : {}),
            },
        });

        const shiftCoverageData: ShiftCoverage[] = [];

        for (const branch of branches) {
            // Default shift based on branch work times
            const workStartTime = branch.workStartTime;
            const workEndTime = branch.workEndTime;

            // Count employees scheduled for this shift
            const whereClause: any = {
                companyId,
                role: 'EMPLOYEE',
                status: 'ACTIVE',
                branchId: branch.id,
            };

            if (departmentId) {
                whereClause.departmentId = departmentId;
            }

            const totalEmployees = await this.prisma.user.count({ where: whereClause });

            // Get attendance for the shift
            const attendanceCount = await this.prisma.attendance.count({
                where: {
                    companyId,
                    date: targetDate,
                    user: {
                        branchId: branch.id,
                        ...(departmentId ? { departmentId } : {}),
                    },
                    status: { in: ['PRESENT', 'LATE'] },
                },
            });

            // Calculate required staff for the shift (70% baseline)
            const requiredStaff = Math.ceil(totalEmployees * 0.7);
            const gap = attendanceCount - requiredStaff;
            const coveragePercentage = requiredStaff > 0
                ? Math.round((attendanceCount / requiredStaff) * 100)
                : 100;

            // Determine severity
            const severity = this.calculateSeverity(coveragePercentage, gap);

            shiftCoverageData.push({
                shiftName: `${branch.name} - دوام أساسي`,
                startTime: workStartTime,
                endTime: workEndTime,
                requiredStaff,
                scheduledStaff: attendanceCount,
                gap,
                coveragePercentage,
                severity,
            });
        }

        return shiftCoverageData;
    }

    /**
     * Identify critical coverage gaps
     */
    private async identifyCriticalGaps(
        companyId: string,
        targetDate: Date,
        departmentCoverage: DepartmentCoverage[],
        branchId?: string,
        departmentId?: string,
    ): Promise<CoverageGapDetail[]> {
        const criticalGaps: CoverageGapDetail[] = [];

        for (const dept of departmentCoverage) {
            // Only report gaps that are MEDIUM, HIGH, or CRITICAL
            if (dept.severity === GapSeverity.LOW) {
                continue;
            }

            const gap: CoverageGapDetail = {
                date: targetDate.toISOString().split('T')[0],
                department: dept.departmentName,
                gapSize: Math.abs(dept.gap),
                severity: dept.severity,
                reason: this.determineGapReason(dept),
                recommendations: this.generateGapRecommendations(dept),
                impact: this.assessImpact(dept.severity, dept.gap),
            };

            criticalGaps.push(gap);
        }

        // Sort by severity (CRITICAL first)
        const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        criticalGaps.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

        return criticalGaps;
    }

    /**
     * Calculate severity based on coverage percentage and gap
     */
    private calculateSeverity(coveragePercentage: number, gap: number): GapSeverity {
        // Understaffed (negative gap)
        if (gap < 0) {
            if (coveragePercentage < 50) return GapSeverity.CRITICAL;
            if (coveragePercentage < 70) return GapSeverity.HIGH;
            if (coveragePercentage < 85) return GapSeverity.MEDIUM;
            return GapSeverity.LOW;
        }

        // Overstaffed (positive gap)
        if (gap > 0) {
            if (coveragePercentage > 150) return GapSeverity.MEDIUM;
            if (coveragePercentage > 130) return GapSeverity.LOW;
        }

        return GapSeverity.LOW;
    }

    /**
     * Determine the reason for the gap
     */
    private determineGapReason(dept: DepartmentCoverage): string {
        if (dept.gap < 0) {
            if (dept.onLeave > 0) {
                return `نقص في التغطية بسبب ${dept.onLeave} إجازة مُوافق عليها`;
            }
            return 'نقص في عدد الموظفين المتاحين';
        } else {
            return 'فائض في عدد الموظفين المجدولين';
        }
    }

    /**
     * Generate recommendations for a specific gap
     */
    private generateGapRecommendations(dept: DepartmentCoverage): string[] {
        const recommendations: string[] = [];

        if (dept.gap < 0) {
            // Understaffed
            recommendations.push(`توظيف ${Math.abs(dept.gap)} موظف إضافي للقسم`);
            if (dept.onLeave > 0) {
                recommendations.push('مراجعة سياسة الموافقة على الإجازات في الفترات الحرجة');
            }
            recommendations.push('النظر في نقل موظفين مؤقتاً من أقسام أخرى');
            recommendations.push('تفعيل خطة العمل الإضافي للموظفين الحاليين');
        } else if (dept.gap > 0) {
            // Overstaffed
            recommendations.push('إعادة توزيع الموظفين على الأقسام الأخرى');
            recommendations.push('تخطيط جدول مرن أو نظام مناوبات');
            recommendations.push('النظر في تقليل ساعات العمل أو العمل عن بُعد');
        }

        return recommendations;
    }

    /**
     * Assess impact of the gap
     */
    private assessImpact(severity: GapSeverity, gap: number): string {
        if (gap < 0) {
            switch (severity) {
                case GapSeverity.CRITICAL:
                    return 'تأثير حرج على العمليات - قد يؤدي إلى توقف الخدمات';
                case GapSeverity.HIGH:
                    return 'تأثير عالي - انخفاض كبير في الإنتاجية وجودة الخدمة';
                case GapSeverity.MEDIUM:
                    return 'تأثير متوسط - قد يسبب تأخيرات في العمل';
                case GapSeverity.LOW:
                    return 'تأثير منخفض - يمكن إدارته بالموارد الحالية';
            }
        } else {
            switch (severity) {
                case GapSeverity.MEDIUM:
                    return 'هدر في الموارد - تكاليف إضافية غير ضرورية';
                case GapSeverity.LOW:
                    return 'فائض طفيف - يمكن تحسين التوزيع';
                default:
                    return 'تأثير ضئيل';
            }
        }
    }

    /**
     * Calculate overall coverage percentage
     */
    private calculateOverallCoverage(departmentCoverage: DepartmentCoverage[]): number {
        if (departmentCoverage.length === 0) return 100;

        const totalRequired = departmentCoverage.reduce((sum, dept) => sum + dept.requiredStaff, 0);
        const totalAvailable = departmentCoverage.reduce(
            (sum, dept) => sum + dept.availableStaff,
            0,
        );

        return totalRequired > 0 ? Math.round((totalAvailable / totalRequired) * 100) : 100;
    }

    /**
     * Generate overall recommendations
     */
    private generateRecommendations(
        departmentCoverage: DepartmentCoverage[],
        shiftCoverage: ShiftCoverage[],
        criticalGaps: CoverageGapDetail[],
    ): string[] {
        const recommendations: string[] = [];

        // Check for critical gaps
        const criticalCount = criticalGaps.filter((g) => g.severity === GapSeverity.CRITICAL).length;
        const highCount = criticalGaps.filter((g) => g.severity === GapSeverity.HIGH).length;

        if (criticalCount > 0) {
            recommendations.push(
                `عاجل: معالجة ${criticalCount} فجوة حرجة في التغطية فوراً`,
            );
            recommendations.push('تفعيل خطة الطوارئ للتوظيف السريع');
        }

        if (highCount > 0) {
            recommendations.push(`معالجة ${highCount} فجوة عالية الخطورة خلال 48 ساعة`);
        }

        // Check for understaffing patterns
        const understaffedDepts = departmentCoverage.filter((d) => d.gap < 0);
        if (understaffedDepts.length > departmentCoverage.length / 2) {
            recommendations.push('نقص عام في القوى العاملة - مراجعة خطة التوظيف الشاملة');
        }

        // Check for overstaffing
        const overstaffedDepts = departmentCoverage.filter(
            (d) => d.gap > 0 && d.coveragePercentage > 120,
        );
        if (overstaffedDepts.length > 0) {
            recommendations.push(
                `إعادة توزيع الموظفين من ${overstaffedDepts.length} قسم لتحسين الكفاءة`,
            );
        }

        // Shift-specific recommendations
        const understaffedShifts = shiftCoverage.filter((s) => s.gap < 0);
        if (understaffedShifts.length > 0) {
            recommendations.push('تحسين توزيع الموظفين على المناوبات المختلفة');
        }

        // Default recommendation if everything is fine
        if (recommendations.length === 0) {
            recommendations.push('التغطية جيدة - الاستمرار في المراقبة المنتظمة');
        }

        return recommendations;
    }

    /**
     * Determine overall status
     */
    private determineOverallStatus(
        overallCoveragePercentage: number,
        criticalGaps: CoverageGapDetail[],
    ): string {
        const criticalCount = criticalGaps.filter((g) => g.severity === GapSeverity.CRITICAL).length;
        const highCount = criticalGaps.filter((g) => g.severity === GapSeverity.HIGH).length;

        if (criticalCount > 0) {
            return 'حرج - يتطلب إجراءً فورياً';
        }

        if (highCount > 0 || overallCoveragePercentage < 70) {
            return 'تحذير - يتطلب انتباهاً';
        }

        if (overallCoveragePercentage >= 85 && overallCoveragePercentage <= 115) {
            return 'جيد - تغطية مثالية';
        }

        if (overallCoveragePercentage > 115) {
            return 'فائض - يمكن التحسين';
        }

        return 'مقبول - مراقبة مستمرة مطلوبة';
    }
}
