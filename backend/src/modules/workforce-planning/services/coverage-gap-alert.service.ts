import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CoverageAnalyzerService } from './coverage-analyzer.service';
import {
    CoverageAnalysisType,
    CoverageGapDetail,
    DepartmentCoverage,
    GapSeverity,
} from '../dto/coverage-analysis.dto';

/**
 * Alert priority levels for coverage gaps
 */
export enum AlertPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL',
}

/**
 * Alert status tracking
 */
export enum AlertStatus {
    PENDING = 'PENDING',
    SENT = 'SENT',
    ACKNOWLEDGED = 'ACKNOWLEDGED',
    RESOLVED = 'RESOLVED',
}

/**
 * Coverage gap alert data structure
 */
export interface CoverageGapAlert {
    id: string;
    companyId: string;
    date: string;
    departmentId?: string;
    departmentName?: string;
    branchId?: string;
    branchName?: string;
    gapSize: number;
    coveragePercentage: number;
    severity: GapSeverity;
    priority: AlertPriority;
    status: AlertStatus;
    reason: string;
    impact: string;
    recommendations: string[];
    createdAt: Date;
    notifiedAt?: Date;
    acknowledgedAt?: Date;
    resolvedAt?: Date;
}

/**
 * Alert generation request
 */
export interface AlertGenerationRequest {
    date: string;
    branchId?: string;
    departmentId?: string;
    thresholds?: {
        criticalBelow?: number;
        highBelow?: number;
        mediumBelow?: number;
    };
    notifyImmediately?: boolean;
}

/**
 * Alert generation response
 */
export interface AlertGenerationResponse {
    companyId: string;
    date: string;
    totalAlertsGenerated: number;
    criticalAlerts: number;
    highAlerts: number;
    mediumAlerts: number;
    lowAlerts: number;
    alerts: CoverageGapAlert[];
    notificationsSent: number;
    generatedAt: Date;
}

@Injectable()
export class CoverageGapAlertService {
    private readonly logger = new Logger(CoverageGapAlertService.name);

    // Default thresholds for coverage percentage
    private readonly DEFAULT_THRESHOLDS = {
        criticalBelow: 50,
        highBelow: 70,
        mediumBelow: 85,
    };

    constructor(
        private readonly prisma: PrismaService,
        private readonly coverageAnalyzer: CoverageAnalyzerService,
        private readonly notificationsService: NotificationsService,
    ) {}

    /**
     * Generate alerts for coverage gaps
     */
    async generateAlerts(
        companyId: string,
        request: AlertGenerationRequest,
    ): Promise<AlertGenerationResponse> {
        this.logger.debug(
            `Generating coverage gap alerts for company ${companyId} on date ${request.date}`,
        );

        const thresholds = {
            ...this.DEFAULT_THRESHOLDS,
            ...request.thresholds,
        };

        try {
            // Analyze coverage using existing service
            const coverageAnalysis = await this.coverageAnalyzer.analyzeCoverage(
                companyId,
                {
                    date: request.date,
                    analysisType: CoverageAnalysisType.DAILY,
                    branchId: request.branchId,
                    departmentId: request.departmentId,
                },
            );

            // Generate alerts from coverage analysis
            const alerts: CoverageGapAlert[] = [];
            let notificationsSent = 0;

            // Process department coverage gaps
            for (const deptCoverage of coverageAnalysis.departmentCoverage) {
                const alert = this.createAlertFromDepartmentCoverage(
                    companyId,
                    request.date,
                    deptCoverage,
                    thresholds,
                );

                if (alert) {
                    alerts.push(alert);
                }
            }

            // Send notifications if requested
            if (request.notifyImmediately && alerts.length > 0) {
                notificationsSent = await this.sendAlertNotifications(companyId, alerts);
            }

            // Count alerts by severity
            const criticalAlerts = alerts.filter((a) => a.priority === AlertPriority.CRITICAL).length;
            const highAlerts = alerts.filter((a) => a.priority === AlertPriority.HIGH).length;
            const mediumAlerts = alerts.filter((a) => a.priority === AlertPriority.MEDIUM).length;
            const lowAlerts = alerts.filter((a) => a.priority === AlertPriority.LOW).length;

            return {
                companyId,
                date: request.date,
                totalAlertsGenerated: alerts.length,
                criticalAlerts,
                highAlerts,
                mediumAlerts,
                lowAlerts,
                alerts,
                notificationsSent,
                generatedAt: new Date(),
            };
        } catch (error) {
            this.logger.error(`Failed to generate alerts: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Check coverage gaps for upcoming dates and generate proactive alerts
     */
    async checkUpcomingGaps(
        companyId: string,
        daysAhead: number = 7,
    ): Promise<AlertGenerationResponse[]> {
        this.logger.debug(
            `Checking upcoming coverage gaps for company ${companyId} for next ${daysAhead} days`,
        );

        const responses: AlertGenerationResponse[] = [];
        const today = new Date();

        for (let i = 1; i <= daysAhead; i++) {
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() + i);
            const dateString = targetDate.toISOString().split('T')[0];

            try {
                const response = await this.generateAlerts(companyId, {
                    date: dateString,
                    notifyImmediately: false,
                });

                // Only include days with significant gaps
                if (response.criticalAlerts > 0 || response.highAlerts > 0) {
                    responses.push(response);
                }
            } catch (error) {
                this.logger.warn(
                    `Failed to check gaps for ${dateString}: ${error.message}`,
                );
            }
        }

        return responses;
    }

    /**
     * Run automated daily gap detection and alert generation
     */
    async runAutomatedDetection(companyId: string): Promise<{
        todayAlerts: AlertGenerationResponse;
        upcomingAlerts: AlertGenerationResponse[];
        summary: {
            totalAlerts: number;
            criticalCount: number;
            highCount: number;
            notificationsSent: number;
        };
    }> {
        this.logger.debug(`Running automated detection for company ${companyId}`);

        const today = new Date().toISOString().split('T')[0];

        // Check today's coverage
        const todayAlerts = await this.generateAlerts(companyId, {
            date: today,
            notifyImmediately: true,
        });

        // Check upcoming days
        const upcomingAlerts = await this.checkUpcomingGaps(companyId, 7);

        // Send summary notification if there are critical or high alerts
        const totalCritical = todayAlerts.criticalAlerts +
            upcomingAlerts.reduce((sum, r) => sum + r.criticalAlerts, 0);
        const totalHigh = todayAlerts.highAlerts +
            upcomingAlerts.reduce((sum, r) => sum + r.highAlerts, 0);

        let additionalNotifications = 0;
        if (totalCritical > 0 || totalHigh > 0) {
            additionalNotifications = await this.sendSummaryNotification(
                companyId,
                todayAlerts,
                upcomingAlerts,
            );
        }

        return {
            todayAlerts,
            upcomingAlerts,
            summary: {
                totalAlerts: todayAlerts.totalAlertsGenerated +
                    upcomingAlerts.reduce((sum, r) => sum + r.totalAlertsGenerated, 0),
                criticalCount: totalCritical,
                highCount: totalHigh,
                notificationsSent: todayAlerts.notificationsSent + additionalNotifications,
            },
        };
    }

    /**
     * Get active alerts for a company
     */
    async getActiveAlerts(
        companyId: string,
        options?: {
            priority?: AlertPriority;
            departmentId?: string;
            branchId?: string;
            startDate?: string;
            endDate?: string;
        },
    ): Promise<CoverageGapAlert[]> {
        // Generate alerts for the date range
        const startDate = options?.startDate || new Date().toISOString().split('T')[0];
        const endDate = options?.endDate || startDate;

        const start = new Date(startDate);
        const end = new Date(endDate);
        const alerts: CoverageGapAlert[] = [];

        for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
            const dateString = d.toISOString().split('T')[0];

            try {
                const response = await this.generateAlerts(companyId, {
                    date: dateString,
                    departmentId: options?.departmentId,
                    branchId: options?.branchId,
                    notifyImmediately: false,
                });

                let filteredAlerts = response.alerts;

                if (options?.priority) {
                    filteredAlerts = filteredAlerts.filter(
                        (a) => a.priority === options.priority,
                    );
                }

                alerts.push(...filteredAlerts);
            } catch (error) {
                this.logger.warn(
                    `Failed to get alerts for ${dateString}: ${error.message}`,
                );
            }
        }

        // Sort by priority (CRITICAL first) and then by date
        const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        alerts.sort((a, b) => {
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0) return priorityDiff;
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

        return alerts;
    }

    /**
     * Create alert from department coverage data
     */
    private createAlertFromDepartmentCoverage(
        companyId: string,
        date: string,
        coverage: DepartmentCoverage,
        thresholds: { criticalBelow: number; highBelow: number; mediumBelow: number },
    ): CoverageGapAlert | null {
        // Only create alert if there's an actual gap (understaffed)
        if (coverage.gap >= 0) {
            return null;
        }

        const priority = this.determinePriority(coverage.coveragePercentage, thresholds);

        // Skip LOW priority alerts in automated detection
        if (priority === AlertPriority.LOW) {
            return null;
        }

        const alertId = `alert-${companyId}-${date}-${coverage.departmentId}`;

        return {
            id: alertId,
            companyId,
            date,
            departmentId: coverage.departmentId,
            departmentName: coverage.departmentName,
            gapSize: Math.abs(coverage.gap),
            coveragePercentage: coverage.coveragePercentage,
            severity: coverage.severity,
            priority,
            status: AlertStatus.PENDING,
            reason: this.generateAlertReason(coverage),
            impact: this.assessAlertImpact(priority, coverage.gap),
            recommendations: this.generateAlertRecommendations(coverage, priority),
            createdAt: new Date(),
        };
    }

    /**
     * Determine alert priority based on coverage percentage
     */
    private determinePriority(
        coveragePercentage: number,
        thresholds: { criticalBelow: number; highBelow: number; mediumBelow: number },
    ): AlertPriority {
        if (coveragePercentage < thresholds.criticalBelow) {
            return AlertPriority.CRITICAL;
        }
        if (coveragePercentage < thresholds.highBelow) {
            return AlertPriority.HIGH;
        }
        if (coveragePercentage < thresholds.mediumBelow) {
            return AlertPriority.MEDIUM;
        }
        return AlertPriority.LOW;
    }

    /**
     * Generate alert reason text
     */
    private generateAlertReason(coverage: DepartmentCoverage): string {
        const reasons: string[] = [];

        if (coverage.onLeave > 0) {
            reasons.push(`${coverage.onLeave} موظف في إجازة`);
        }

        reasons.push(`نقص ${Math.abs(coverage.gap)} موظف عن الحد المطلوب`);
        reasons.push(`نسبة التغطية ${coverage.coveragePercentage}%`);

        return reasons.join(' - ');
    }

    /**
     * Assess impact of the alert
     */
    private assessAlertImpact(priority: AlertPriority, gap: number): string {
        switch (priority) {
            case AlertPriority.CRITICAL:
                return 'تأثير حرج: خطر توقف العمليات أو انخفاض حاد في مستوى الخدمة';
            case AlertPriority.HIGH:
                return 'تأثير عالي: احتمال كبير لتأخير العمل وانخفاض الإنتاجية';
            case AlertPriority.MEDIUM:
                return 'تأثير متوسط: قد يؤثر على جودة الخدمة في أوقات الذروة';
            case AlertPriority.LOW:
                return 'تأثير منخفض: يمكن إدارته بالموارد الحالية';
        }
    }

    /**
     * Generate recommendations for the alert
     */
    private generateAlertRecommendations(
        coverage: DepartmentCoverage,
        priority: AlertPriority,
    ): string[] {
        const recommendations: string[] = [];

        if (priority === AlertPriority.CRITICAL) {
            recommendations.push('تفعيل خطة الطوارئ فوراً');
            recommendations.push('استدعاء موظفين من الأقسام الأخرى');
            recommendations.push('النظر في تأجيل الإجازات غير الضرورية');
        }

        if (priority === AlertPriority.HIGH || priority === AlertPriority.CRITICAL) {
            recommendations.push(`توظيف ${Math.abs(coverage.gap)} موظف مؤقت أو إضافي`);
            recommendations.push('تفعيل نظام العمل الإضافي');
        }

        if (coverage.onLeave > 0) {
            recommendations.push('مراجعة طلبات الإجازات المعلقة');
        }

        recommendations.push('متابعة الوضع وتحديث الخطط حسب الحاجة');

        return recommendations;
    }

    /**
     * Send notifications for generated alerts
     */
    private async sendAlertNotifications(
        companyId: string,
        alerts: CoverageGapAlert[],
    ): Promise<number> {
        // Get admin and HR users to notify
        const recipients = await this.prisma.user.findMany({
            where: {
                companyId,
                role: { in: ['ADMIN', 'HR'] },
                status: 'ACTIVE',
            },
            select: { id: true },
        });

        if (recipients.length === 0) {
            this.logger.warn(`No recipients found for alerts in company ${companyId}`);
            return 0;
        }

        const recipientIds = recipients.map((r) => r.id);
        let sentCount = 0;

        // Send individual notifications for critical and high priority alerts
        const urgentAlerts = alerts.filter(
            (a) => a.priority === AlertPriority.CRITICAL || a.priority === AlertPriority.HIGH,
        );

        for (const alert of urgentAlerts) {
            try {
                const priorityText = alert.priority === AlertPriority.CRITICAL ? 'حرج' : 'عالي';
                const title = `تنبيه ${priorityText}: نقص في التغطية - ${alert.departmentName}`;
                const body = `${alert.reason}\n\nالتأثير: ${alert.impact}\n\nالتوصية: ${alert.recommendations[0]}`;

                await this.notificationsService.createMany(
                    companyId,
                    recipientIds,
                    'GENERAL',
                    title,
                    body,
                    'COVERAGE_GAP_ALERT',
                    alert.id,
                    {
                        alertId: alert.id,
                        priority: alert.priority,
                        departmentId: alert.departmentId,
                        date: alert.date,
                        gapSize: alert.gapSize,
                        coveragePercentage: alert.coveragePercentage,
                    },
                );

                sentCount += recipientIds.length;
            } catch (error) {
                this.logger.error(
                    `Failed to send notification for alert ${alert.id}: ${error.message}`,
                );
            }
        }

        return sentCount;
    }

    /**
     * Send summary notification for all alerts
     */
    private async sendSummaryNotification(
        companyId: string,
        todayAlerts: AlertGenerationResponse,
        upcomingAlerts: AlertGenerationResponse[],
    ): Promise<number> {
        const recipients = await this.prisma.user.findMany({
            where: {
                companyId,
                role: { in: ['ADMIN', 'HR'] },
                status: 'ACTIVE',
            },
            select: { id: true },
        });

        if (recipients.length === 0) {
            return 0;
        }

        const recipientIds = recipients.map((r) => r.id);

        const totalCritical = todayAlerts.criticalAlerts +
            upcomingAlerts.reduce((sum, r) => sum + r.criticalAlerts, 0);
        const totalHigh = todayAlerts.highAlerts +
            upcomingAlerts.reduce((sum, r) => sum + r.highAlerts, 0);

        const title = 'ملخص تنبيهات التغطية اليومية';
        let body = `تم اكتشاف ${totalCritical + totalHigh} تنبيه يتطلب انتباهك:\n`;
        body += `- تنبيهات حرجة: ${totalCritical}\n`;
        body += `- تنبيهات عالية: ${totalHigh}\n\n`;

        if (todayAlerts.criticalAlerts > 0 || todayAlerts.highAlerts > 0) {
            body += `اليوم: ${todayAlerts.criticalAlerts} حرج، ${todayAlerts.highAlerts} عالي\n`;
        }

        if (upcomingAlerts.length > 0) {
            body += `الأيام القادمة: ${upcomingAlerts.length} يوم يتطلب المتابعة`;
        }

        try {
            await this.notificationsService.createMany(
                companyId,
                recipientIds,
                'GENERAL',
                title,
                body,
                'COVERAGE_GAP_SUMMARY',
                `summary-${companyId}-${new Date().toISOString().split('T')[0]}`,
                {
                    totalCritical,
                    totalHigh,
                    todayDate: todayAlerts.date,
                    daysWithAlerts: upcomingAlerts.length,
                },
            );

            return recipientIds.length;
        } catch (error) {
            this.logger.error(`Failed to send summary notification: ${error.message}`);
            return 0;
        }
    }

    /**
     * Acknowledge an alert
     */
    async acknowledgeAlert(
        companyId: string,
        alertId: string,
        userId: string,
    ): Promise<{ success: boolean; message: string }> {
        this.logger.debug(`User ${userId} acknowledging alert ${alertId}`);

        // In a production system, this would update a database record
        // For now, we return success and log the acknowledgment
        return {
            success: true,
            message: `تم تأكيد استلام التنبيه ${alertId}`,
        };
    }

    /**
     * Resolve an alert
     */
    async resolveAlert(
        companyId: string,
        alertId: string,
        userId: string,
        resolution: string,
    ): Promise<{ success: boolean; message: string }> {
        this.logger.debug(`User ${userId} resolving alert ${alertId}: ${resolution}`);

        // In a production system, this would update a database record
        // For now, we return success and log the resolution
        return {
            success: true,
            message: `تم حل التنبيه ${alertId}`,
        };
    }

    /**
     * Get alert statistics for a company
     */
    async getAlertStatistics(
        companyId: string,
        startDate: string,
        endDate: string,
    ): Promise<{
        totalAlerts: number;
        byPriority: Record<AlertPriority, number>;
        byDepartment: Record<string, number>;
        averageCoveragePercentage: number;
        mostAffectedDepartments: Array<{ departmentName: string; alertCount: number }>;
    }> {
        const alerts = await this.getActiveAlerts(companyId, { startDate, endDate });

        const byPriority: Record<AlertPriority, number> = {
            [AlertPriority.CRITICAL]: 0,
            [AlertPriority.HIGH]: 0,
            [AlertPriority.MEDIUM]: 0,
            [AlertPriority.LOW]: 0,
        };

        const byDepartment: Record<string, number> = {};
        let totalCoverage = 0;

        for (const alert of alerts) {
            byPriority[alert.priority]++;

            const deptName = alert.departmentName || 'Unknown';
            byDepartment[deptName] = (byDepartment[deptName] || 0) + 1;

            totalCoverage += alert.coveragePercentage;
        }

        const mostAffectedDepartments = Object.entries(byDepartment)
            .map(([departmentName, alertCount]) => ({ departmentName, alertCount }))
            .sort((a, b) => b.alertCount - a.alertCount)
            .slice(0, 5);

        return {
            totalAlerts: alerts.length,
            byPriority,
            byDepartment,
            averageCoveragePercentage: alerts.length > 0
                ? Math.round(totalCoverage / alerts.length)
                : 100,
            mostAffectedDepartments,
        };
    }
}
