export declare class ExportService {
    exportAttendanceToExcel(attendances: any[]): Promise<Buffer>;
    exportLateReportToExcel(lateRecords: any[]): Promise<Buffer>;
    exportPayrollToExcel(payrollData: any[]): Promise<Buffer>;
    exportAttendanceToPdf(attendances: any[]): Promise<Buffer>;
    exportEmployeeReportToPdf(data: any): Promise<Buffer>;
    private getStatusArabic;
}
