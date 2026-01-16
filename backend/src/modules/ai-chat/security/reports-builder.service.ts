import { Injectable, Logger } from '@nestjs/common';

/**
 * 📊 Reports Builder Service
 * Implements ideas #196-198: Smart reports
 * 
 * Features:
 * - Natural language report requests
 * - Report templates
 * - Scheduled reports
 * - Export formats
 */

export interface ReportRequest {
    id: string;
    userId: string;
    query: string;
    type: 'attendance' | 'leave' | 'payroll' | 'performance' | 'custom';
    typeAr: string;
    dateRange: { start: Date; end: Date };
    filters: Record<string, any>;
    status: 'pending' | 'generating' | 'ready' | 'failed';
    format: 'pdf' | 'excel' | 'csv' | 'json';
    createdAt: Date;
    completedAt?: Date;
}

export interface ReportTemplate {
    id: string;
    name: string;
    nameAr: string;
    type: ReportRequest['type'];
    description: string;
    columns: string[];
    defaultFilters: Record<string, any>;
    popular: boolean;
}

export interface ScheduledReport {
    id: string;
    templateId: string;
    templateName: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    frequencyAr: string;
    recipients: string[];
    format: ReportRequest['format'];
    lastRun?: Date;
    nextRun: Date;
    active: boolean;
}

export interface ReportData {
    title: string;
    generatedAt: Date;
    dateRange: { start: Date; end: Date };
    summary: Record<string, any>;
    columns: string[];
    rows: any[][];
    charts?: { type: string; data: any }[];
}

@Injectable()
export class ReportsBuilderService {
    private readonly logger = new Logger(ReportsBuilderService.name);

    // Report requests
    private requests: Map<string, ReportRequest> = new Map();

    // Report templates
    private readonly templates: ReportTemplate[] = [
        { id: '1', name: 'Monthly Attendance', nameAr: 'تقرير الحضور الشهري', type: 'attendance', description: 'ملخص الحضور والغياب الشهري', columns: ['الموظف', 'أيام الحضور', 'أيام الغياب', 'التأخيرات'], defaultFilters: {}, popular: true },
        { id: '2', name: 'Leave Balance', nameAr: 'تقرير رصيد الإجازات', type: 'leave', description: 'أرصدة الإجازات لجميع الموظفين', columns: ['الموظف', 'السنوية', 'المرضية', 'المستخدمة', 'المتبقية'], defaultFilters: {}, popular: true },
        { id: '3', name: 'Payroll Summary', nameAr: 'ملخص الرواتب', type: 'payroll', description: 'ملخص رواتب الشهر', columns: ['الموظف', 'الراتب الأساسي', 'البدلات', 'الخصومات', 'الصافي'], defaultFilters: {}, popular: true },
        { id: '4', name: 'Overtime Report', nameAr: 'تقرير العمل الإضافي', type: 'attendance', description: 'ساعات العمل الإضافي', columns: ['الموظف', 'الساعات', 'المبلغ'], defaultFilters: {}, popular: false },
        { id: '5', name: 'Late Arrivals', nameAr: 'تقرير التأخيرات', type: 'attendance', description: 'تفاصيل التأخيرات', columns: ['الموظف', 'التاريخ', 'وقت الحضور', 'مدة التأخير'], defaultFilters: {}, popular: true },
        { id: '6', name: 'Performance Review', nameAr: 'تقرير تقييم الأداء', type: 'performance', description: 'نتائج تقييم الأداء', columns: ['الموظف', 'التقييم', 'نقاط القوة', 'نقاط التحسين'], defaultFilters: {}, popular: false },
    ];

    /**
     * 📝 Parse natural language report request
     */
    parseReportRequest(query: string, userId: string): ReportRequest {
        const id = `RPT-${Date.now().toString(36).toUpperCase()}`;

        // Detect report type
        let type: ReportRequest['type'] = 'custom';
        let typeAr = 'مخصص';

        if (/حضور|attendance|غياب/i.test(query)) {
            type = 'attendance';
            typeAr = 'الحضور';
        } else if (/إجازة|leave|رصيد/i.test(query)) {
            type = 'leave';
            typeAr = 'الإجازات';
        } else if (/راتب|salary|payroll/i.test(query)) {
            type = 'payroll';
            typeAr = 'الرواتب';
        } else if (/أداء|performance/i.test(query)) {
            type = 'performance';
            typeAr = 'الأداء';
        }

        // Detect date range
        const now = new Date();
        let start = new Date(now.getFullYear(), now.getMonth(), 1);
        let end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        if (/الأسبوع|week/i.test(query)) {
            start = new Date(now);
            start.setDate(start.getDate() - 7);
            end = now;
        } else if (/السنة|year/i.test(query)) {
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31);
        }

        // Detect format
        let format: ReportRequest['format'] = 'pdf';
        if (/excel/i.test(query)) format = 'excel';
        else if (/csv/i.test(query)) format = 'csv';

        const request: ReportRequest = {
            id,
            userId,
            query,
            type,
            typeAr,
            dateRange: { start, end },
            filters: {},
            status: 'pending',
            format,
            createdAt: new Date(),
        };

        this.requests.set(id, request);
        return request;
    }

    /**
     * 📊 Generate report data
     */
    generateReport(request: ReportRequest): ReportData {
        request.status = 'generating';

        // Sample data based on type
        const data: ReportData = {
            title: `تقرير ${request.typeAr}`,
            generatedAt: new Date(),
            dateRange: request.dateRange,
            summary: {},
            columns: [],
            rows: [],
        };

        switch (request.type) {
            case 'attendance':
                data.columns = ['الموظف', 'أيام الحضور', 'أيام الغياب', 'التأخيرات'];
                data.rows = [
                    ['أحمد محمد', 22, 0, 1],
                    ['سارة عبدالله', 21, 1, 2],
                    ['خالد عمر', 20, 2, 0],
                ];
                data.summary = { totalPresent: 63, totalAbsent: 3, avgAttendance: '95%' };
                break;

            case 'leave':
                data.columns = ['الموظف', 'السنوية', 'المرضية', 'المستخدمة', 'المتبقية'];
                data.rows = [
                    ['أحمد محمد', 21, 30, 5, 16],
                    ['سارة عبدالله', 21, 30, 10, 11],
                ];
                data.summary = { totalBalance: 102, totalUsed: 15, avgBalance: 17 };
                break;

            case 'payroll':
                data.columns = ['الموظف', 'الأساسي', 'البدلات', 'الخصومات', 'الصافي'];
                data.rows = [
                    ['أحمد محمد', 10000, 3000, 975, 12025],
                    ['سارة عبدالله', 12000, 3500, 1170, 14330],
                ];
                data.summary = { totalGross: 28500, totalDeductions: 2145, totalNet: 26355 };
                break;

            default:
                data.columns = ['البند', 'القيمة'];
                data.rows = [['بيانات', 'مخصصة']];
        }

        request.status = 'ready';
        request.completedAt = new Date();

        return data;
    }

    /**
     * 📋 Get available templates
     */
    getTemplates(type?: ReportRequest['type']): ReportTemplate[] {
        if (type) {
            return this.templates.filter(t => t.type === type);
        }
        return this.templates;
    }

    /**
     * 📊 Format report request
     */
    formatReportRequest(request: ReportRequest): string {
        const statusEmoji = {
            pending: '⏳',
            generating: '🔄',
            ready: '✅',
            failed: '❌',
        }[request.status];

        const formatNames: Record<string, string> = {
            pdf: 'PDF',
            excel: 'Excel',
            csv: 'CSV',
            json: 'JSON',
        };

        let message = `${statusEmoji} **طلب تقرير #${request.id}**\n\n`;
        message += `📊 النوع: ${request.typeAr}\n`;
        message += `📅 الفترة: ${request.dateRange.start.toLocaleDateString('ar-SA')} - ${request.dateRange.end.toLocaleDateString('ar-SA')}\n`;
        message += `📄 الصيغة: ${formatNames[request.format]}\n`;

        if (request.status === 'ready') {
            message += `\n✅ التقرير جاهز للتحميل!`;
        }

        return message;
    }

    /**
     * 📊 Format report data
     */
    formatReportData(data: ReportData): string {
        let message = `📊 **${data.title}**\n\n`;
        message += `📅 ${data.dateRange.start.toLocaleDateString('ar-SA')} - ${data.dateRange.end.toLocaleDateString('ar-SA')}\n\n`;

        // Summary
        if (Object.keys(data.summary).length > 0) {
            message += `**الملخص:**\n`;
            for (const [key, value] of Object.entries(data.summary)) {
                message += `• ${key}: ${value}\n`;
            }
            message += '\n';
        }

        // Table header
        message += `| ${data.columns.join(' | ')} |\n`;
        message += `|${data.columns.map(() => '---').join('|')}|\n`;

        // Table rows
        for (const row of data.rows.slice(0, 5)) {
            message += `| ${row.join(' | ')} |\n`;
        }

        if (data.rows.length > 5) {
            message += `\n... و ${data.rows.length - 5} صفوف أخرى`;
        }

        return message;
    }

    /**
     * 📋 Format templates list
     */
    formatTemplates(): string {
        let message = '📊 **قوالب التقارير المتاحة:**\n\n';

        const popular = this.templates.filter(t => t.popular);
        const other = this.templates.filter(t => !t.popular);

        if (popular.length > 0) {
            message += '⭐ **الأكثر استخداماً:**\n';
            for (const t of popular) {
                message += `• ${t.nameAr}\n`;
            }
            message += '\n';
        }

        if (other.length > 0) {
            message += '📋 **أخرى:**\n';
            for (const t of other) {
                message += `• ${t.nameAr}\n`;
            }
        }

        message += '\n💡 قل "أريد تقرير [النوع]" لإنشاء تقرير';
        return message;
    }
}
