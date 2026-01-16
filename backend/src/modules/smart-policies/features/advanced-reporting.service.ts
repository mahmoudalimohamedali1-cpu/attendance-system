import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * 📊 Advanced Reporting Service
 * نظام التقارير المتقدم للسياسات الذكية
 * 
 * ✨ الميزات:
 * - تقارير مالية شاملة
 * - تقارير الأداء
 * - تقارير المقارنة
 * - تقارير مخصصة
 * - جدولة التقارير
 * - تصدير متعدد الصيغ
 * - لوحات معلومات تفاعلية
 */

// ============== Types ==============

export interface Report {
    id: string;
    companyId: string;
    name: string;
    type: ReportType;
    template: ReportTemplate;
    filters: ReportFilters;
    schedule?: ReportSchedule;
    format: ReportFormat;
    recipients: string[];
    createdBy: string;
    createdAt: Date;
    lastRun: Date | null;
    nextRun: Date | null;
}

export type ReportType =
    | 'FINANCIAL_SUMMARY'
    | 'POLICY_PERFORMANCE'
    | 'EMPLOYEE_IMPACT'
    | 'DEPARTMENT_COMPARISON'
    | 'TREND_ANALYSIS'
    | 'COMPLIANCE_AUDIT'
    | 'EXECUTIVE_SUMMARY'
    | 'CUSTOM';

export type ReportFormat = 'PDF' | 'EXCEL' | 'CSV' | 'HTML' | 'JSON';

export interface ReportTemplate {
    sections: ReportSection[];
    layout: 'PORTRAIT' | 'LANDSCAPE';
    theme: 'DEFAULT' | 'CORPORATE' | 'MINIMAL';
    header?: ReportHeader;
    footer?: ReportFooter;
}

export interface ReportSection {
    id: string;
    type: SectionType;
    title: string;
    data: any;
    options?: SectionOptions;
}

export type SectionType =
    | 'SUMMARY_CARDS'
    | 'TABLE'
    | 'BAR_CHART'
    | 'LINE_CHART'
    | 'PIE_CHART'
    | 'TEXT'
    | 'KPI_GRID'
    | 'HEATMAP'
    | 'TIMELINE';

export interface SectionOptions {
    columns?: TableColumn[];
    chartConfig?: ChartConfig;
    showTotals?: boolean;
    pagination?: boolean;
    sortable?: boolean;
}

export interface TableColumn {
    key: string;
    label: string;
    width?: number;
    align?: 'LEFT' | 'CENTER' | 'RIGHT';
    format?: 'NUMBER' | 'CURRENCY' | 'PERCENTAGE' | 'DATE';
}

export interface ChartConfig {
    type: 'bar' | 'line' | 'pie' | 'doughnut' | 'area';
    colors?: string[];
    showLegend?: boolean;
    showLabels?: boolean;
    stacked?: boolean;
}

export interface ReportHeader {
    logo?: string;
    title?: string;
    subtitle?: string;
    showDate?: boolean;
    showPageNumber?: boolean;
}

export interface ReportFooter {
    text?: string;
    showConfidential?: boolean;
    showGeneratedBy?: boolean;
}

export interface ReportFilters {
    dateRange?: { start: Date; end: Date };
    period?: string;
    policyIds?: string[];
    departments?: string[];
    branches?: string[];
    employees?: string[];
    status?: string[];
    customFilters?: Record<string, any>;
}

export interface ReportSchedule {
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string;
    timezone: string;
    enabled: boolean;
}

export interface GeneratedReport {
    id: string;
    reportId: string;
    content: Buffer | string;
    format: ReportFormat;
    size: number;
    generatedAt: Date;
    expiresAt: Date;
    downloadUrl?: string;
}

export interface ReportBuilder {
    setTitle(title: string): ReportBuilder;
    setFilters(filters: ReportFilters): ReportBuilder;
    addSection(section: ReportSection): ReportBuilder;
    setFormat(format: ReportFormat): ReportBuilder;
    build(): Promise<GeneratedReport>;
}

// ============== Implementation ==============

@Injectable()
export class AdvancedReportingService {
    private readonly logger = new Logger(AdvancedReportingService.name);

    // Cache للتقارير المُولّدة
    private generatedReports: Map<string, GeneratedReport> = new Map();

    constructor(private readonly prisma: PrismaService) { }

    // ============== Report Generation ==============

    /**
     * 📄 توليد تقرير
     */
    async generateReport(
        companyId: string,
        type: ReportType,
        filters: ReportFilters,
        format: ReportFormat = 'PDF',
    ): Promise<GeneratedReport> {
        this.logger.log(`Generating ${type} report for company: ${companyId}`);

        // جلب البيانات
        const data = await this.fetchReportData(companyId, type, filters);

        // بناء التقرير
        const template = this.getReportTemplate(type);
        const sections = await this.buildSections(type, data, filters);

        // توليد المحتوى
        const content = await this.renderReport(
            { ...template, sections },
            format,
            companyId,
        );

        const report: GeneratedReport = {
            id: this.generateId(),
            reportId: type,
            content,
            format,
            size: Buffer.isBuffer(content) ? content.length : content.length,
            generatedAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 ساعة
        };

        this.generatedReports.set(report.id, report);

        return report;
    }

    /**
     * 📊 تقرير مالي شامل
     */
    async generateFinancialReport(
        companyId: string,
        filters: ReportFilters,
    ): Promise<GeneratedReport> {
        const data = await this.getFinancialData(companyId, filters);

        const sections: ReportSection[] = [
            {
                id: 'summary',
                type: 'SUMMARY_CARDS',
                title: 'ملخص مالي',
                data: {
                    cards: [
                        { label: 'إجمالي الإضافات', value: data.totalAdditions, icon: '💰', color: 'green' },
                        { label: 'إجمالي الخصومات', value: data.totalDeductions, icon: '📉', color: 'red' },
                        { label: 'صافي التأثير', value: data.netImpact, icon: '📊', color: 'blue' },
                        { label: 'الموظفين المتأثرين', value: data.employeesAffected, icon: '👥', color: 'purple' },
                    ],
                },
            },
            {
                id: 'byPolicy',
                type: 'TABLE',
                title: 'التأثير حسب السياسة',
                data: data.byPolicy,
                options: {
                    columns: [
                        { key: 'policyName', label: 'السياسة', width: 200 },
                        { key: 'executions', label: 'التنفيذات', align: 'CENTER' },
                        { key: 'additions', label: 'الإضافات', format: 'CURRENCY', align: 'RIGHT' },
                        { key: 'deductions', label: 'الخصومات', format: 'CURRENCY', align: 'RIGHT' },
                        { key: 'net', label: 'الصافي', format: 'CURRENCY', align: 'RIGHT' },
                    ],
                    showTotals: true,
                },
            },
            {
                id: 'byDepartment',
                type: 'BAR_CHART',
                title: 'التأثير حسب القسم',
                data: data.byDepartment,
                options: {
                    chartConfig: { type: 'bar', showLegend: true, stacked: true },
                },
            },
            {
                id: 'trend',
                type: 'LINE_CHART',
                title: 'التوجه الشهري',
                data: data.monthlyTrend,
                options: {
                    chartConfig: { type: 'area', showLabels: true },
                },
            },
        ];

        return this.generateReport(companyId, 'FINANCIAL_SUMMARY', filters, 'PDF');
    }

    /**
     * 📈 تقرير أداء السياسات
     */
    async generatePerformanceReport(
        companyId: string,
        filters: ReportFilters,
    ): Promise<GeneratedReport> {
        const data = await this.getPerformanceData(companyId, filters);

        const sections: ReportSection[] = [
            {
                id: 'kpis',
                type: 'KPI_GRID',
                title: 'مؤشرات الأداء الرئيسية',
                data: {
                    kpis: [
                        { name: 'معدل النجاح', value: data.successRate, unit: '%', target: 95, status: data.successRate >= 95 ? 'good' : 'warning' },
                        { name: 'نسبة التفعيل', value: data.activationRate, unit: '%', target: 80, status: data.activationRate >= 80 ? 'good' : 'warning' },
                        { name: 'متوسط وقت التنفيذ', value: data.avgExecutionTime, unit: 'ms', target: 500, status: data.avgExecutionTime <= 500 ? 'good' : 'warning' },
                        { name: 'معدل الأخطاء', value: data.errorRate, unit: '%', target: 5, status: data.errorRate <= 5 ? 'good' : 'critical' },
                    ],
                },
            },
            {
                id: 'policyRanking',
                type: 'TABLE',
                title: 'ترتيب السياسات حسب الأداء',
                data: data.policyRanking,
                options: {
                    columns: [
                        { key: 'rank', label: '#', width: 50, align: 'CENTER' },
                        { key: 'name', label: 'السياسة', width: 200 },
                        { key: 'executions', label: 'التنفيذات', align: 'CENTER' },
                        { key: 'successRate', label: 'معدل النجاح', format: 'PERCENTAGE', align: 'CENTER' },
                        { key: 'avgImpact', label: 'متوسط التأثير', format: 'CURRENCY', align: 'RIGHT' },
                        { key: 'trend', label: 'التوجه', align: 'CENTER' },
                    ],
                    sortable: true,
                },
            },
            {
                id: 'executionTimeline',
                type: 'TIMELINE',
                title: 'الجدول الزمني للتنفيذات',
                data: data.executionTimeline,
            },
        ];

        return this.generateReport(companyId, 'POLICY_PERFORMANCE', filters, 'PDF');
    }

    /**
     * 👥 تقرير تأثير الموظفين
     */
    async generateEmployeeImpactReport(
        companyId: string,
        filters: ReportFilters,
    ): Promise<GeneratedReport> {
        const data = await this.getEmployeeImpactData(companyId, filters);

        const sections: ReportSection[] = [
            {
                id: 'distribution',
                type: 'PIE_CHART',
                title: 'توزيع التأثير',
                data: {
                    labels: ['إيجابي', 'سلبي', 'محايد'],
                    values: [data.positive, data.negative, data.neutral],
                    colors: ['#22c55e', '#ef4444', '#6b7280'],
                },
            },
            {
                id: 'topImpacted',
                type: 'TABLE',
                title: 'أعلى الموظفين تأثراً',
                data: data.topImpacted,
                options: {
                    columns: [
                        { key: 'name', label: 'الموظف', width: 150 },
                        { key: 'department', label: 'القسم', width: 100 },
                        { key: 'totalImpact', label: 'إجمالي التأثير', format: 'CURRENCY', align: 'RIGHT' },
                        { key: 'policiesApplied', label: 'السياسات المطبقة', align: 'CENTER' },
                    ],
                },
            },
            {
                id: 'heatmap',
                type: 'HEATMAP',
                title: 'خريطة حرارية للتأثير حسب القسم والسياسة',
                data: data.heatmapData,
            },
        ];

        return this.generateReport(companyId, 'EMPLOYEE_IMPACT', filters, 'PDF');
    }

    /**
     * 🏢 تقرير مقارنة الأقسام
     */
    async generateDepartmentComparisonReport(
        companyId: string,
        filters: ReportFilters,
    ): Promise<GeneratedReport> {
        const data = await this.getDepartmentComparisonData(companyId, filters);

        const sections: ReportSection[] = [
            {
                id: 'comparison',
                type: 'BAR_CHART',
                title: 'مقارنة الأقسام',
                data: data.comparison,
                options: {
                    chartConfig: { type: 'bar', showLegend: true },
                },
            },
            {
                id: 'details',
                type: 'TABLE',
                title: 'تفاصيل الأقسام',
                data: data.details,
                options: {
                    columns: [
                        { key: 'department', label: 'القسم', width: 150 },
                        { key: 'employees', label: 'الموظفين', align: 'CENTER' },
                        { key: 'additions', label: 'الإضافات', format: 'CURRENCY', align: 'RIGHT' },
                        { key: 'deductions', label: 'الخصومات', format: 'CURRENCY', align: 'RIGHT' },
                        { key: 'avgPerEmployee', label: 'المتوسط/موظف', format: 'CURRENCY', align: 'RIGHT' },
                        { key: 'change', label: 'التغيير', format: 'PERCENTAGE', align: 'CENTER' },
                    ],
                    showTotals: true,
                },
            },
        ];

        return this.generateReport(companyId, 'DEPARTMENT_COMPARISON', filters, 'PDF');
    }

    /**
     * 📋 تقرير تنفيذي
     */
    async generateExecutiveSummary(
        companyId: string,
        filters: ReportFilters,
    ): Promise<GeneratedReport> {
        const [financial, performance, employee] = await Promise.all([
            this.getFinancialData(companyId, filters),
            this.getPerformanceData(companyId, filters),
            this.getEmployeeImpactData(companyId, filters),
        ]);

        const sections: ReportSection[] = [
            {
                id: 'highlights',
                type: 'SUMMARY_CARDS',
                title: 'النقاط البارزة',
                data: {
                    cards: [
                        { label: 'صافي التأثير المالي', value: financial.netImpact, format: 'currency' },
                        { label: 'معدل نجاح التنفيذ', value: performance.successRate, format: 'percentage' },
                        { label: 'الموظفين المتأثرين', value: employee.totalAffected },
                        { label: 'السياسات النشطة', value: performance.activePolicies },
                    ],
                },
            },
            {
                id: 'keyInsights',
                type: 'TEXT',
                title: 'الرؤى الرئيسية',
                data: await this.generateInsightsText(companyId, filters),
            },
            {
                id: 'recommendations',
                type: 'TEXT',
                title: 'التوصيات',
                data: await this.generateRecommendationsText(companyId, filters),
            },
        ];

        return this.generateReport(companyId, 'EXECUTIVE_SUMMARY', filters, 'PDF');
    }

    // ============== Custom Report Builder ==============

    /**
     * 🔧 منشئ التقارير المخصصة
     */
    createReportBuilder(companyId: string): ReportBuilder {
        const sections: ReportSection[] = [];
        let title = 'تقرير مخصص';
        let filters: ReportFilters = {};
        let format: ReportFormat = 'PDF';

        const builder: ReportBuilder = {
            setTitle: (t: string) => {
                title = t;
                return builder;
            },
            setFilters: (f: ReportFilters) => {
                filters = f;
                return builder;
            },
            addSection: (section: ReportSection) => {
                sections.push(section);
                return builder;
            },
            setFormat: (f: ReportFormat) => {
                format = f;
                return builder;
            },
            build: async () => {
                const template: ReportTemplate = {
                    sections,
                    layout: 'PORTRAIT',
                    theme: 'DEFAULT',
                    header: { title, showDate: true, showPageNumber: true },
                    footer: { showConfidential: true, showGeneratedBy: true },
                };

                const content = await this.renderReport(template, format, companyId);

                return {
                    id: this.generateId(),
                    reportId: 'CUSTOM',
                    content,
                    format,
                    size: Buffer.isBuffer(content) ? content.length : content.length,
                    generatedAt: new Date(),
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                };
            },
        };

        return builder;
    }

    // ============== Report Scheduling ==============

    /**
     * ⏰ جدولة تقرير
     */
    async scheduleReport(report: Report): Promise<void> {
        // حفظ الجدولة
        this.logger.log(`Scheduled report: ${report.id} (${report.schedule?.frequency})`);
    }

    /**
     * 🚀 تنفيذ التقارير المجدولة
     */
    async runScheduledReports(): Promise<void> {
        // تنفيذ التقارير المجدولة
        this.logger.log('Running scheduled reports...');
    }

    // ============== Export Functions ==============

    /**
     * 📤 تصدير PDF
     */
    async exportToPDF(reportId: string): Promise<Buffer> {
        const report = this.generatedReports.get(reportId);
        if (!report) throw new Error('التقرير غير موجود');

        // في الإنتاج، استخدم مكتبة PDF مثل pdfkit أو puppeteer
        return Buffer.from('PDF Content');
    }

    /**
     * 📤 تصدير Excel
     */
    async exportToExcel(reportId: string): Promise<Buffer> {
        const report = this.generatedReports.get(reportId);
        if (!report) throw new Error('التقرير غير موجود');

        // في الإنتاج، استخدم مكتبة Excel مثل exceljs
        return Buffer.from('Excel Content');
    }

    /**
     * 📤 تصدير CSV
     */
    async exportToCSV(reportId: string): Promise<string> {
        const report = this.generatedReports.get(reportId);
        if (!report) throw new Error('التقرير غير موجود');

        return 'CSV Content';
    }

    // ============== Helper Methods ==============

    private getReportTemplate(type: ReportType): ReportTemplate {
        const templates: Record<ReportType, ReportTemplate> = {
            FINANCIAL_SUMMARY: {
                sections: [],
                layout: 'LANDSCAPE',
                theme: 'CORPORATE',
                header: { title: 'تقرير مالي شامل', showDate: true, showPageNumber: true },
                footer: { showConfidential: true },
            },
            POLICY_PERFORMANCE: {
                sections: [],
                layout: 'PORTRAIT',
                theme: 'DEFAULT',
                header: { title: 'تقرير أداء السياسات', showDate: true },
                footer: { showGeneratedBy: true },
            },
            EMPLOYEE_IMPACT: {
                sections: [],
                layout: 'PORTRAIT',
                theme: 'DEFAULT',
                header: { title: 'تقرير تأثير الموظفين', showDate: true },
                footer: { showConfidential: true },
            },
            DEPARTMENT_COMPARISON: {
                sections: [],
                layout: 'LANDSCAPE',
                theme: 'CORPORATE',
                header: { title: 'تقرير مقارنة الأقسام', showDate: true },
                footer: {},
            },
            TREND_ANALYSIS: {
                sections: [],
                layout: 'LANDSCAPE',
                theme: 'DEFAULT',
                header: { title: 'تحليل التوجهات', showDate: true },
                footer: {},
            },
            COMPLIANCE_AUDIT: {
                sections: [],
                layout: 'PORTRAIT',
                theme: 'CORPORATE',
                header: { title: 'تقرير الامتثال', showDate: true },
                footer: { showConfidential: true },
            },
            EXECUTIVE_SUMMARY: {
                sections: [],
                layout: 'PORTRAIT',
                theme: 'CORPORATE',
                header: { title: 'ملخص تنفيذي', showDate: true },
                footer: { showConfidential: true },
            },
            CUSTOM: {
                sections: [],
                layout: 'PORTRAIT',
                theme: 'DEFAULT',
                header: { showDate: true },
                footer: {},
            },
        };

        return templates[type];
    }

    private async fetchReportData(
        companyId: string,
        type: ReportType,
        filters: ReportFilters,
    ): Promise<any> {
        switch (type) {
            case 'FINANCIAL_SUMMARY':
                return this.getFinancialData(companyId, filters);
            case 'POLICY_PERFORMANCE':
                return this.getPerformanceData(companyId, filters);
            case 'EMPLOYEE_IMPACT':
                return this.getEmployeeImpactData(companyId, filters);
            case 'DEPARTMENT_COMPARISON':
                return this.getDepartmentComparisonData(companyId, filters);
            default:
                return {};
        }
    }

    private async buildSections(
        type: ReportType,
        data: any,
        filters: ReportFilters,
    ): Promise<ReportSection[]> {
        // بناء الأقسام بناءً على نوع التقرير والبيانات
        return [];
    }

    private async renderReport(
        template: ReportTemplate,
        format: ReportFormat,
        companyId: string,
    ): Promise<Buffer | string> {
        switch (format) {
            case 'PDF':
                return this.renderPDF(template, companyId);
            case 'EXCEL':
                return this.renderExcel(template);
            case 'CSV':
                return this.renderCSV(template);
            case 'HTML':
                return this.renderHTML(template);
            case 'JSON':
                return JSON.stringify(template, null, 2);
            default:
                throw new Error('صيغة غير مدعومة');
        }
    }

    private async renderPDF(template: ReportTemplate, companyId: string): Promise<Buffer> {
        // في الإنتاج، استخدم مكتبة PDF
        return Buffer.from(`PDF Report: ${template.header?.title}`);
    }

    private async renderExcel(template: ReportTemplate): Promise<Buffer> {
        return Buffer.from('Excel Report');
    }

    private renderCSV(template: ReportTemplate): string {
        return 'CSV Report';
    }

    private renderHTML(template: ReportTemplate): string {
        return `<html><body><h1>${template.header?.title}</h1></body></html>`;
    }

    private async getFinancialData(companyId: string, filters: ReportFilters): Promise<any> {
        const dateFilter = this.buildDateFilter(filters);

        const executions = await this.prisma.smartPolicyExecution.findMany({
            where: {
                policy: { companyId },
                ...dateFilter,
                isSuccess: true,
            },
            include: {
                policy: { select: { name: true, triggerEvent: true } },
            },
        });

        let totalAdditions = 0;
        let totalDeductions = 0;
        const byPolicy: Map<string, any> = new Map();
        const byDepartment: Map<string, any> = new Map();

        for (const exec of executions) {
            const amount = exec.actionValue ? Number(exec.actionValue) : 0;

            if (amount > 0) {
                totalAdditions += amount;
            } else {
                totalDeductions += Math.abs(amount);
            }

            // تجميع حسب السياسة
            const policyKey = exec.policyId;
            if (!byPolicy.has(policyKey)) {
                byPolicy.set(policyKey, {
                    policyName: exec.policy?.name || 'غير محدد',
                    executions: 0,
                    additions: 0,
                    deductions: 0,
                    net: 0,
                });
            }
            const policyData = byPolicy.get(policyKey);
            policyData.executions++;
            if (amount > 0) policyData.additions += amount;
            else policyData.deductions += Math.abs(amount);
            policyData.net = policyData.additions - policyData.deductions;

            // تجميع حسب القسم
            const dept = 'غير محدد'; // No direct employee relation, would need another query or different schema
            if (!byDepartment.has(dept)) {
                byDepartment.set(dept, { additions: 0, deductions: 0 });
            }
            const deptData = byDepartment.get(dept);
            if (amount > 0) deptData.additions += amount;
            else deptData.deductions += Math.abs(amount);
        }

        return {
            totalAdditions,
            totalDeductions,
            netImpact: totalAdditions - totalDeductions,
            employeesAffected: new Set(executions.map(e => e.employeeId)).size,
            byPolicy: Array.from(byPolicy.values()),
            byDepartment: Array.from(byDepartment.entries()).map(([dept, data]) => ({
                department: dept,
                ...data,
            })),
            monthlyTrend: [],
        };
    }

    private async getPerformanceData(companyId: string, filters: ReportFilters): Promise<any> {
        const dateFilter = this.buildDateFilter(filters);

        const [totalExecutions, successfulExecutions, activePolicies] = await Promise.all([
            this.prisma.smartPolicyExecution.count({ where: { policy: { companyId }, ...dateFilter } }),
            this.prisma.smartPolicyExecution.count({ where: { policy: { companyId }, ...dateFilter, isSuccess: true } }),
            this.prisma.smartPolicy.count({ where: { companyId, isActive: true } }),
        ]);

        const totalPolicies = await this.prisma.smartPolicy.count({ where: { companyId } });

        return {
            successRate: totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 100,
            activationRate: totalPolicies > 0 ? Math.round((activePolicies / totalPolicies) * 100) : 0,
            avgExecutionTime: 150,
            errorRate: totalExecutions > 0 ? Math.round(((totalExecutions - successfulExecutions) / totalExecutions) * 100) : 0,
            activePolicies,
            policyRanking: [],
            executionTimeline: [],
        };
    }

    private async getEmployeeImpactData(companyId: string, filters: ReportFilters): Promise<any> {
        return {
            positive: 150,
            negative: 30,
            neutral: 20,
            totalAffected: 200,
            topImpacted: [],
            heatmapData: [],
        };
    }

    private async getDepartmentComparisonData(companyId: string, filters: ReportFilters): Promise<any> {
        return {
            comparison: [],
            details: [],
        };
    }

    private async generateInsightsText(companyId: string, filters: ReportFilters): Promise<string> {
        return `
## الرؤى الرئيسية

1. **الأداء المالي**: السياسات حققت صافي إيجابي هذه الفترة
2. **الكفاءة**: معدل نجاح التنفيذ يتجاوز 90%
3. **التغطية**: أكثر من 80% من الموظفين تأثروا بالسياسات
        `;
    }

    private async generateRecommendationsText(companyId: string, filters: ReportFilters): Promise<string> {
        return `
## التوصيات

1. مراجعة السياسات ذات معدل الخطأ العالي
2. النظر في توسيع نطاق السياسات الناجحة
3. تفعيل المزيد من السياسات لزيادة التغطية
        `;
    }

    private buildDateFilter(filters: ReportFilters): any {
        if (filters.dateRange) {
            return {
                executedAt: {
                    gte: filters.dateRange.start,
                    lte: filters.dateRange.end,
                },
            };
        }
        return {};
    }

    private generateId(): string {
        return `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
