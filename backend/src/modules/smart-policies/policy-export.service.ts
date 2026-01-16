import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as ExcelJS from 'exceljs';

/**
 * 📁 خيارات التصدير
 */
export interface ExportOptions {
    format: 'xlsx' | 'csv';
    includeDetails: boolean;
    includeSummary: boolean;
    language: 'ar' | 'en';
}

/**
 * 📊 PolicyExportService
 * خدمة تصدير بيانات السياسات لـ Excel/CSV
 * تُسهّل على المحاسبين تصدير البيانات للمراجعة والتدقيق
 */
@Injectable()
export class PolicyExportService {
    private readonly logger = new Logger(PolicyExportService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * 📊 تصدير تقرير السياسات الشهري لـ Excel
     */
    async exportMonthlyReport(
        companyId: string,
        month: number,
        year: number,
        options?: Partial<ExportOptions>
    ): Promise<Buffer> {
        this.logger.log(`[EXPORT] Generating Excel report for ${year}-${month}`);

        const { startDate, endDate } = this.getPeriodDates(month, year);
        const workbook = new ExcelJS.Workbook();
        
        workbook.creator = 'Smart Policies System';
        workbook.created = new Date();
        workbook.modified = new Date();

        // === ورقة الملخص ===
        if (options?.includeSummary !== false) {
            await this.addSummarySheet(workbook, companyId, month, year, startDate, endDate);
        }

        // === ورقة التفاصيل ===
        if (options?.includeDetails !== false) {
            await this.addDetailsSheet(workbook, companyId, startDate, endDate);
        }

        // === ورقة حسب الموظف ===
        await this.addEmployeeSheet(workbook, companyId, startDate, endDate);

        // === ورقة حسب السياسة ===
        await this.addPolicySheet(workbook, companyId, startDate, endDate);

        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }

    /**
     * 📋 تصدير قائمة الموظفين المتأثرين
     */
    async exportAffectedEmployees(
        companyId: string,
        month: number,
        year: number
    ): Promise<Buffer> {
        const { startDate, endDate } = this.getPeriodDates(month, year);
        const workbook = new ExcelJS.Workbook();

        const sheet = workbook.addWorksheet('الموظفون المتأثرون', {
            views: [{ rightToLeft: true }],
        });

        // العنوان
        sheet.mergeCells('A1:H1');
        const titleCell = sheet.getCell('A1');
        titleCell.value = `الموظفون المتأثرون بالسياسات - ${this.getMonthName(month)} ${year}`;
        titleCell.font = { size: 16, bold: true };
        titleCell.alignment = { horizontal: 'center' };

        // الرؤوس
        sheet.addRow([]);
        const headerRow = sheet.addRow([
            'كود الموظف',
            'اسم الموظف',
            'القسم',
            'إجمالي الخصومات',
            'إجمالي المكافآت',
            'صافي التأثير',
            'عدد السياسات',
            'ملاحظات',
        ]);
        this.styleHeaderRow(headerRow);

        // جلب البيانات
        const executions = await this.prisma.smartPolicyExecution.findMany({
            where: {
                policy: { companyId },
                executedAt: { gte: startDate, lte: endDate },
            },
            include: {
                policy: { select: { originalText: true } },
            },
        });

        // تجميع حسب الموظف
        const employeeMap = new Map<string, {
            name: string;
            code: string;
            department: string;
            deductions: number;
            bonuses: number;
            policyCount: number;
        }>();

        for (const exec of executions) {
            const empId = exec.employeeId || 'unknown';
            if (!employeeMap.has(empId)) {
                employeeMap.set(empId, {
                    name: exec.employeeName || 'غير محدد',
                    code: '',
                    department: '',
                    deductions: 0,
                    bonuses: 0,
                    policyCount: 0,
                });
            }

            const emp = employeeMap.get(empId)!;
            const amount = Number(exec.actionValue || 0);
            const isDeduction = exec.actionType === 'DEDUCT_FROM_PAYROLL' || exec.actionType === 'DEDUCTION';

            if (isDeduction) {
                emp.deductions += amount;
            } else {
                emp.bonuses += amount;
            }
            emp.policyCount++;
        }

        // جلب بيانات إضافية للموظفين
        const employeeIds = Array.from(employeeMap.keys()).filter(id => id !== 'unknown');
        const employees = await this.prisma.user.findMany({
            where: { id: { in: employeeIds } },
            select: {
                id: true,
                employeeCode: true,
                department: { select: { name: true, nameEn: true } },
            },
        });

        for (const emp of employees) {
            const data = employeeMap.get(emp.id);
            if (data) {
                data.code = emp.employeeCode || '';
                data.department = emp.department?.name || emp.department?.nameEn || '';
            }
        }

        // إضافة الصفوف
        for (const [_, data] of employeeMap) {
            const net = data.bonuses - data.deductions;
            const row = sheet.addRow([
                data.code,
                data.name,
                data.department,
                data.deductions,
                data.bonuses,
                net,
                data.policyCount,
                net < 0 ? 'خصم صافي' : (net > 0 ? 'مكافأة صافية' : 'متوازن'),
            ]);

            // تلوين صافي التأثير
            const netCell = row.getCell(6);
            if (net < 0) {
                netCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };
            } else if (net > 0) {
                netCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFFCC' } };
            }
        }

        // تعيين عرض الأعمدة
        sheet.columns = [
            { width: 15 }, { width: 25 }, { width: 20 },
            { width: 15 }, { width: 15 }, { width: 15 },
            { width: 12 }, { width: 20 },
        ];

        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }

    /**
     * 📋 تصدير سجل التدقيق
     */
    async exportAuditLog(
        companyId: string,
        startDate: Date,
        endDate: Date
    ): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('سجل التدقيق', {
            views: [{ rightToLeft: true }],
        });

        // العنوان
        sheet.mergeCells('A1:G1');
        const titleCell = sheet.getCell('A1');
        titleCell.value = `سجل تدقيق السياسات الذكية`;
        titleCell.font = { size: 16, bold: true };
        titleCell.alignment = { horizontal: 'center' };

        // الرؤوس
        sheet.addRow([]);
        const headerRow = sheet.addRow([
            'التاريخ والوقت',
            'الإجراء',
            'اسم السياسة',
            'المستخدم',
            'التفاصيل',
            'القيمة السابقة',
            'القيمة الجديدة',
        ]);
        this.styleHeaderRow(headerRow);

        // جلب سجل التدقيق
        const auditLogs = await (this.prisma as any).smartPolicyAuditLog?.findMany?.({
            where: {
                policy: { companyId },
                timestamp: { gte: startDate, lte: endDate },
            },
            orderBy: { timestamp: 'desc' },
            include: {
                policy: { select: { originalText: true } },
            },
        }) || [];

        for (const log of auditLogs) {
            sheet.addRow([
                log.timestamp,
                this.getActionLabel(log.action),
                (log.policy?.originalText || '').substring(0, 50),
                log.performedByName || '',
                log.details || '',
                log.oldValue || '',
                log.newValue || '',
            ]);
        }

        sheet.columns = [
            { width: 20 }, { width: 15 }, { width: 30 },
            { width: 20 }, { width: 30 }, { width: 20 }, { width: 20 },
        ];

        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }

    /**
     * 📊 تصدير ملخص CSV بسيط
     */
    async exportSimpleCSV(
        companyId: string,
        month: number,
        year: number
    ): Promise<string> {
        const { startDate, endDate } = this.getPeriodDates(month, year);

        const executions = await this.prisma.smartPolicyExecution.findMany({
            where: {
                policy: { companyId },
                executedAt: { gte: startDate, lte: endDate },
            },
            include: {
                policy: { select: { originalText: true } },
            },
        });

        const lines: string[] = [
            'التاريخ,الموظف,السياسة,النوع,المبلغ,الوصف',
        ];

        for (const exec of executions) {
            const type = (exec.actionType === 'DEDUCT_FROM_PAYROLL' || exec.actionType === 'DEDUCTION') ? 'خصم' : 'إضافة';
            lines.push([
                exec.executedAt.toISOString().split('T')[0],
                `"${exec.employeeName || ''}"`,
                `"${((exec as any).policy?.originalText || '').substring(0, 50)}"`,
                type,
                exec.actionValue || '0',
                `"${(exec.actionResult as any)?.description || ''}"`,
            ].join(','));
        }

        return lines.join('\n');
    }

    // ======================================
    // Helper Methods
    // ======================================

    /**
     * إضافة ورقة الملخص
     */
    private async addSummarySheet(
        workbook: ExcelJS.Workbook,
        companyId: string,
        month: number,
        year: number,
        startDate: Date,
        endDate: Date
    ) {
        const sheet = workbook.addWorksheet('الملخص', {
            views: [{ rightToLeft: true }],
        });

        // جلب البيانات
        const executions = await this.prisma.smartPolicyExecution.findMany({
            where: {
                policy: { companyId },
                executedAt: { gte: startDate, lte: endDate },
            },
        });

        let totalDeductions = 0;
        let totalBonuses = 0;
        const employees = new Set<string>();

        for (const exec of executions) {
            const amount = Number(exec.actionValue || 0);
            if (exec.actionType === 'DEDUCT_FROM_PAYROLL' || exec.actionType === 'DEDUCTION') {
                totalDeductions += amount;
            } else {
                totalBonuses += amount;
            }
            if (exec.employeeId) employees.add(exec.employeeId);
        }

        // العنوان
        sheet.mergeCells('A1:C1');
        const titleCell = sheet.getCell('A1');
        titleCell.value = `ملخص السياسات الذكية - ${this.getMonthName(month)} ${year}`;
        titleCell.font = { size: 18, bold: true, color: { argb: 'FF2E7D32' } };
        titleCell.alignment = { horizontal: 'center' };

        // الإحصائيات
        const stats = [
            ['', ''],
            ['📊 الإحصائيات العامة', ''],
            ['إجمالي التنفيذات', executions.length],
            ['عدد الموظفين المتأثرين', employees.size],
            ['', ''],
            ['💰 الملخص المالي', ''],
            ['إجمالي الخصومات', `${totalDeductions.toLocaleString()} ريال`],
            ['إجمالي المكافآت', `${totalBonuses.toLocaleString()} ريال`],
            ['صافي التأثير', `${(totalBonuses - totalDeductions).toLocaleString()} ريال`],
            ['', ''],
            ['📈 المتوسطات', ''],
            ['متوسط الخصم لكل موظف', employees.size > 0 ? `${Math.round(totalDeductions / employees.size).toLocaleString()} ريال` : '0'],
            ['متوسط المكافأة لكل موظف', employees.size > 0 ? `${Math.round(totalBonuses / employees.size).toLocaleString()} ريال` : '0'],
        ];

        let rowIndex = 3;
        for (const [label, value] of stats) {
            const row = sheet.getRow(rowIndex);
            row.getCell(1).value = label;
            row.getCell(2).value = value;

            if (String(label).includes('📊') || String(label).includes('💰') || String(label).includes('📈')) {
                row.getCell(1).font = { bold: true, size: 14 };
            }

            rowIndex++;
        }

        sheet.columns = [{ width: 30 }, { width: 25 }];
    }

    /**
     * إضافة ورقة التفاصيل
     */
    private async addDetailsSheet(
        workbook: ExcelJS.Workbook,
        companyId: string,
        startDate: Date,
        endDate: Date
    ) {
        const sheet = workbook.addWorksheet('التفاصيل', {
            views: [{ rightToLeft: true }],
        });

        // الرؤوس
        const headerRow = sheet.addRow([
            'التاريخ',
            'اسم الموظف',
            'كود الموظف',
            'اسم السياسة',
            'النوع',
            'المبلغ',
            'الوصف',
        ]);
        this.styleHeaderRow(headerRow);

        // جلب البيانات
        const executions = await this.prisma.smartPolicyExecution.findMany({
            where: {
                policy: { companyId },
                executedAt: { gte: startDate, lte: endDate },
            },
            include: {
                policy: { select: { originalText: true } },
            },
            orderBy: { executedAt: 'desc' },
        });

        for (const exec of executions) {
            const type = (exec.actionType === 'DEDUCT_FROM_PAYROLL' || exec.actionType === 'DEDUCTION') ? 'خصم' : 'إضافة';
            const row = sheet.addRow([
                exec.executedAt,
                exec.employeeName || '',
                '', // سيتم تعبئته لاحقاً
                ((exec as any).policy?.originalText || '').substring(0, 50),
                type,
                Number(exec.actionValue || 0),
                (exec.actionResult as any)?.description || '',
            ]);

            // تلوين النوع
            const typeCell = row.getCell(5);
            if (type === 'خصم') {
                typeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };
            } else {
                typeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFFCC' } };
            }
        }

        sheet.columns = [
            { width: 15 }, { width: 25 }, { width: 15 },
            { width: 40 }, { width: 10 }, { width: 12 }, { width: 30 },
        ];
    }

    /**
     * إضافة ورقة حسب الموظف
     */
    private async addEmployeeSheet(
        workbook: ExcelJS.Workbook,
        companyId: string,
        startDate: Date,
        endDate: Date
    ) {
        const sheet = workbook.addWorksheet('حسب الموظف', {
            views: [{ rightToLeft: true }],
        });

        const headerRow = sheet.addRow([
            'اسم الموظف',
            'إجمالي الخصومات',
            'إجمالي المكافآت',
            'صافي التأثير',
            'عدد السياسات المطبقة',
        ]);
        this.styleHeaderRow(headerRow);

        const executions = await this.prisma.smartPolicyExecution.findMany({
            where: {
                policy: { companyId },
                executedAt: { gte: startDate, lte: endDate },
            },
        });

        const employeeMap = new Map<string, { name: string; deductions: number; bonuses: number; count: number }>();

        for (const exec of executions) {
            const empId = exec.employeeId || 'unknown';
            if (!employeeMap.has(empId)) {
                employeeMap.set(empId, { name: exec.employeeName || 'غير محدد', deductions: 0, bonuses: 0, count: 0 });
            }

            const emp = employeeMap.get(empId)!;
            const amount = Number(exec.actionValue || 0);
            const isDeduction = exec.actionType === 'DEDUCT_FROM_PAYROLL' || exec.actionType === 'DEDUCTION';

            if (isDeduction) emp.deductions += amount;
            else emp.bonuses += amount;
            emp.count++;
        }

        for (const [_, data] of employeeMap) {
            sheet.addRow([
                data.name,
                data.deductions,
                data.bonuses,
                data.bonuses - data.deductions,
                data.count,
            ]);
        }

        sheet.columns = [
            { width: 25 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 20 },
        ];
    }

    /**
     * إضافة ورقة حسب السياسة
     */
    private async addPolicySheet(
        workbook: ExcelJS.Workbook,
        companyId: string,
        startDate: Date,
        endDate: Date
    ) {
        const sheet = workbook.addWorksheet('حسب السياسة', {
            views: [{ rightToLeft: true }],
        });

        const headerRow = sheet.addRow([
            'اسم السياسة',
            'النوع',
            'إجمالي المبلغ',
            'عدد الموظفين المتأثرين',
            'عدد التنفيذات',
        ]);
        this.styleHeaderRow(headerRow);

        const policies = await this.prisma.smartPolicy.findMany({
            where: { companyId },
            include: {
                executions: {
                    where: { executedAt: { gte: startDate, lte: endDate } },
                },
            },
        });

        for (const policy of policies) {
            if (policy.executions.length === 0) continue;

            const totalAmount = policy.executions.reduce((sum: number, e: any) => sum + Number(e.actionValue || 0), 0);
            const employees = new Set(policy.executions.map((e: any) => e.employeeId).filter(Boolean));
            const isDeduction = (policy.originalText || '').includes('خصم');

            sheet.addRow([
                (policy.originalText || '').substring(0, 50),
                isDeduction ? 'خصم' : 'مكافأة',
                totalAmount,
                employees.size,
                policy.executions.length,
            ]);
        }

        sheet.columns = [
            { width: 40 }, { width: 12 }, { width: 18 }, { width: 22 }, { width: 15 },
        ];
    }

    /**
     * تنسيق صف الرؤوس
     */
    private styleHeaderRow(row: ExcelJS.Row) {
        row.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF2E7D32' },
            };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.alignment = { horizontal: 'center' };
            cell.border = {
                bottom: { style: 'thin', color: { argb: 'FF000000' } },
            };
        });
    }

    /**
     * تسمية الإجراء
     */
    private getActionLabel(action: string): string {
        const labels: Record<string, string> = {
            'CREATE': 'إنشاء',
            'UPDATE': 'تحديث',
            'DELETE': 'حذف',
            'ACTIVATE': 'تفعيل',
            'DEACTIVATE': 'إيقاف',
            'EXECUTE': 'تنفيذ',
            'APPROVE': 'موافقة',
            'REJECT': 'رفض',
        };
        return labels[action] || action;
    }

    /**
     * الحصول على تواريخ الفترة
     */
    private getPeriodDates(month: number, year: number): { startDate: Date; endDate: Date } {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        return { startDate, endDate };
    }

    /**
     * اسم الشهر بالعربية
     */
    private getMonthName(month: number): string {
        const months = [
            'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ];
        return months[month - 1] || '';
    }
}
