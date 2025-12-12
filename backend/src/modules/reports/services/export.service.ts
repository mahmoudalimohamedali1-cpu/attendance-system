import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
// import * as PDFDocument from 'pdfkit';

@Injectable()
export class ExportService {
  async exportAttendanceToExcel(attendances: any[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('سجل الحضور');

    // Set RTL
    worksheet.views = [{ rightToLeft: true }];

    // Headers
    worksheet.columns = [
      { header: 'رقم الموظف', key: 'employeeCode', width: 15 },
      { header: 'اسم الموظف', key: 'employeeName', width: 25 },
      { header: 'التاريخ', key: 'date', width: 15 },
      { header: 'وقت الحضور', key: 'checkIn', width: 15 },
      { header: 'وقت الانصراف', key: 'checkOut', width: 15 },
      { header: 'الحالة', key: 'status', width: 15 },
      { header: 'التأخير (دقيقة)', key: 'lateMinutes', width: 15 },
      { header: 'ساعات العمل', key: 'workingHours', width: 15 },
      { header: 'القسم', key: 'department', width: 20 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4472C4' },
    };
    headerRow.font = { color: { argb: 'FFFFFF' }, bold: true };

    // Add data
    for (const att of attendances) {
      worksheet.addRow({
        employeeCode: att.user?.employeeCode || '',
        employeeName: `${att.user?.firstName || ''} ${att.user?.lastName || ''}`,
        date: new Date(att.date).toLocaleDateString('ar-SA'),
        checkIn: att.checkInTime
          ? new Date(att.checkInTime).toLocaleTimeString('ar-SA')
          : '-',
        checkOut: att.checkOutTime
          ? new Date(att.checkOutTime).toLocaleTimeString('ar-SA')
          : '-',
        status: this.getStatusArabic(att.status),
        lateMinutes: att.lateMinutes,
        workingHours: (att.workingMinutes / 60).toFixed(2),
        department: att.user?.department?.name || '',
      });
    }

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      if (column.width) {
        column.width = Math.max(column.width, 12);
      }
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async exportLateReportToExcel(lateRecords: any[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('تقرير التأخيرات');

    worksheet.views = [{ rightToLeft: true }];

    worksheet.columns = [
      { header: 'رقم الموظف', key: 'employeeCode', width: 15 },
      { header: 'اسم الموظف', key: 'employeeName', width: 25 },
      { header: 'التاريخ', key: 'date', width: 15 },
      { header: 'وقت الحضور', key: 'checkIn', width: 15 },
      { header: 'دقائق التأخير', key: 'lateMinutes', width: 15 },
      { header: 'القسم', key: 'department', width: 20 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF6B6B' },
    };
    headerRow.font = { color: { argb: 'FFFFFF' }, bold: true };

    for (const record of lateRecords) {
      worksheet.addRow({
        employeeCode: record.user?.employeeCode || '',
        employeeName: `${record.user?.firstName || ''} ${record.user?.lastName || ''}`,
        date: new Date(record.date).toLocaleDateString('ar-SA'),
        checkIn: record.checkInTime
          ? new Date(record.checkInTime).toLocaleTimeString('ar-SA')
          : '-',
        lateMinutes: record.lateMinutes,
        department: record.user?.department?.name || '',
      });
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async exportPayrollToExcel(payrollData: any[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('ملخص الرواتب');

    worksheet.views = [{ rightToLeft: true }];

    worksheet.columns = [
      { header: 'رقم الموظف', key: 'employeeCode', width: 15 },
      { header: 'اسم الموظف', key: 'employeeName', width: 25 },
      { header: 'الراتب الأساسي', key: 'baseSalary', width: 15 },
      { header: 'أيام العمل', key: 'workingDays', width: 12 },
      { header: 'ساعات العمل', key: 'workingHours', width: 12 },
      { header: 'دقائق التأخير', key: 'lateMinutes', width: 15 },
      { header: 'أيام الغياب', key: 'absentDays', width: 12 },
      { header: 'خصم التأخير', key: 'lateDeduction', width: 15 },
      { header: 'خصم الغياب', key: 'absentDeduction', width: 15 },
      { header: 'إضافي العمل', key: 'overtimeBonus', width: 15 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '2E7D32' },
    };
    headerRow.font = { color: { argb: 'FFFFFF' }, bold: true };

    for (const record of payrollData) {
      worksheet.addRow({
        employeeCode: record.employeeCode,
        employeeName: record.employeeName,
        baseSalary: record.baseSalary || 0,
        workingDays: record.workingDays,
        workingHours: record.totalWorkingHours,
        lateMinutes: record.totalLateMinutes,
        absentDays: record.absentDays,
        lateDeduction: record.lateDeduction,
        absentDeduction: record.absentDeduction,
        overtimeBonus: record.overtimeBonus,
      });
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async exportAttendanceToPdf(attendances: any[]): Promise<Buffer> {
    // Simplified PDF generation
    // For proper Arabic support, use a library like pdfmake or puppeteer
    
    const content = `
    تقرير الحضور والانصراف
    عدد السجلات: ${attendances.length}
    تاريخ التصدير: ${new Date().toLocaleDateString('ar-SA')}
    `;

    return Buffer.from(content, 'utf-8');
  }

  async exportEmployeeReportToPdf(data: any): Promise<Buffer> {
    const content = `
    تقرير الموظف
    الاسم: ${data.employee?.firstName} ${data.employee?.lastName}
    رقم الموظف: ${data.employee?.employeeCode}
    
    إحصائيات الحضور:
    - أيام الحضور: ${data.stats.presentDays}
    - أيام التأخير: ${data.stats.lateDays}
    - أيام الغياب: ${data.stats.absentDays}
    - إجمالي ساعات العمل: ${(data.stats.totalWorkingMinutes / 60).toFixed(2)}
    `;

    return Buffer.from(content, 'utf-8');
  }

  private getStatusArabic(status: string): string {
    const statuses: Record<string, string> = {
      PRESENT: 'حاضر',
      LATE: 'متأخر',
      EARLY_LEAVE: 'انصراف مبكر',
      ABSENT: 'غائب',
      ON_LEAVE: 'إجازة',
      WORK_FROM_HOME: 'عمل من المنزل',
    };
    return statuses[status] || status;
  }
}

