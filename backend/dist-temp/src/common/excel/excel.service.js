"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExcelService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const ExcelJS = require("exceljs");
let ExcelService = class ExcelService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generatePayrollRunExcel(runId) {
        const run = await this.prisma.payrollRun.findUnique({
            where: { id: runId },
            include: {
                period: true,
                payslips: {
                    include: {
                        employee: true,
                        lines: { include: { component: true } },
                    },
                },
            },
        });
        if (!run)
            throw new Error('Payroll run not found');
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'HRMS System';
        workbook.created = new Date();
        const sheet = workbook.addWorksheet('مسير الرواتب', {
            views: [{ rightToLeft: true }]
        });
        const headerStyle = {
            font: { bold: true, color: { argb: 'FFFFFF' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '1976D2' } },
            alignment: { horizontal: 'center', vertical: 'middle' },
            border: {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            },
        };
        sheet.mergeCells('A1:H1');
        const titleCell = sheet.getCell('A1');
        titleCell.value = `مسير رواتب شهر ${run.period.month}/${run.period.year}`;
        titleCell.font = { bold: true, size: 16 };
        titleCell.alignment = { horizontal: 'center' };
        const headers = ['#', 'كود الموظف', 'اسم الموظف', 'الراتب الأساسي', 'إجمالي الاستحقاقات', 'إجمالي الاستقطاعات', 'صافي الراتب', 'الحالة'];
        const headerRow = sheet.addRow(headers);
        headerRow.height = 25;
        headerRow.eachCell((cell) => {
            Object.assign(cell, { style: headerStyle });
        });
        run.payslips.forEach((payslip, index) => {
            const row = sheet.addRow([
                index + 1,
                payslip.employee.employeeCode || '-',
                `${payslip.employee.firstName} ${payslip.employee.lastName}`,
                Number(payslip.baseSalary),
                Number(payslip.grossSalary),
                Number(payslip.totalDeductions),
                Number(payslip.netSalary),
                payslip.status === 'PAID' ? 'مدفوع' : (payslip.status === 'FINANCE_APPROVED' || payslip.status === 'LOCKED') ? 'معتمد' : 'مسودة',
            ]);
            if (index % 2 === 0) {
                row.eachCell((cell) => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F5F5F5' } };
                });
            }
            row.getCell(4).numFmt = '#,##0.00 "ريال"';
            row.getCell(5).numFmt = '#,##0.00 "ريال"';
            row.getCell(6).numFmt = '#,##0.00 "ريال"';
            row.getCell(7).numFmt = '#,##0.00 "ريال"';
        });
        const totalsRow = sheet.addRow([
            '',
            '',
            'الإجمالي',
            run.payslips.reduce((sum, p) => sum + Number(p.baseSalary), 0),
            run.payslips.reduce((sum, p) => sum + Number(p.grossSalary), 0),
            run.payslips.reduce((sum, p) => sum + Number(p.totalDeductions), 0),
            run.payslips.reduce((sum, p) => sum + Number(p.netSalary), 0),
            '',
        ]);
        totalsRow.font = { bold: true };
        totalsRow.getCell(4).numFmt = '#,##0.00 "ريال"';
        totalsRow.getCell(5).numFmt = '#,##0.00 "ريال"';
        totalsRow.getCell(6).numFmt = '#,##0.00 "ريال"';
        totalsRow.getCell(7).numFmt = '#,##0.00 "ريال"';
        sheet.columns = [
            { width: 5 },
            { width: 15 },
            { width: 25 },
            { width: 18 },
            { width: 18 },
            { width: 18 },
            { width: 18 },
            { width: 12 },
        ];
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
    async generateGosiReportExcel(month, year) {
        const employees = await this.prisma.user.findMany({
            where: {
                status: 'ACTIVE',
                isSaudi: true,
                salaryAssignments: { some: { isActive: true } },
            },
            include: {
                salaryAssignments: { where: { isActive: true }, take: 1 },
            },
        });
        const gosiConfig = await this.prisma.gosiConfig.findFirst({
            where: { isActive: true },
        });
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('تقرير GOSI', { views: [{ rightToLeft: true }] });
        const headers = ['#', 'كود الموظف', 'اسم الموظف', 'الجنسية', 'الراتب الخاضع', 'حصة الموظف', 'حصة الشركة', 'ساند', 'الإجمالي'];
        const headerRow = sheet.addRow(headers);
        headerRow.font = { bold: true };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4CAF50' } };
        employees.forEach((emp, i) => {
            const baseSalary = emp.salaryAssignments[0]?.baseSalary ? Number(emp.salaryAssignments[0].baseSalary) : 0;
            const cappedSalary = Math.min(baseSalary, gosiConfig ? Number(gosiConfig.maxCapAmount) : 45000);
            const employeeShare = cappedSalary * (gosiConfig ? Number(gosiConfig.employeeRate) / 100 : 0.09);
            const employerShare = cappedSalary * (gosiConfig ? Number(gosiConfig.employerRate) / 100 : 0.09);
            const sanedShare = cappedSalary * (gosiConfig ? Number(gosiConfig.sanedRate) / 100 : 0.0075);
            const total = employeeShare + employerShare + sanedShare;
            sheet.addRow([
                i + 1,
                emp.employeeCode || '-',
                `${emp.firstName} ${emp.lastName}`,
                emp.nationality || 'سعودي',
                cappedSalary,
                employeeShare,
                employerShare,
                sanedShare,
                total,
            ]);
        });
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
    async generateSalaryComparisonExcel(month1, year1, month2, year2) {
        const [period1, period2] = await Promise.all([
            this.prisma.payrollPeriod.findFirst({
                where: { month: month1, year: year1 },
                include: {
                    runs: {
                        where: { status: 'PAID' },
                        include: {
                            payslips: {
                                include: { employee: true }
                            }
                        }
                    }
                }
            }),
            this.prisma.payrollPeriod.findFirst({
                where: { month: month2, year: year2 },
                include: {
                    runs: {
                        where: { status: 'PAID' },
                        include: {
                            payslips: {
                                include: { employee: true }
                            }
                        }
                    }
                }
            }),
        ]);
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('مقارنة الرواتب', { views: [{ rightToLeft: true }] });
        const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        sheet.addRow([`مقارنة الرواتب: ${monthNames[month1 - 1]} ${year1} vs ${monthNames[month2 - 1]} ${year2}`]);
        sheet.addRow([]);
        const headers = ['كود الموظف', 'اسم الموظف', `صافي ${monthNames[month1 - 1]}`, `صافي ${monthNames[month2 - 1]}`, 'الفرق', 'نسبة التغيير'];
        const headerRow = sheet.addRow(headers);
        headerRow.font = { bold: true };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '3F51B5' } };
        const payslips1 = period1?.runs.flatMap(r => r.payslips) || [];
        const payslips2 = period2?.runs.flatMap(r => r.payslips) || [];
        const employeeMap = new Map();
        payslips1.forEach(p => {
            employeeMap.set(p.employeeId, {
                name: `${p.employee.firstName} ${p.employee.lastName}`,
                code: p.employee.employeeCode || '-',
                net1: Number(p.netSalary),
                net2: 0,
            });
        });
        payslips2.forEach(p => {
            const existing = employeeMap.get(p.employeeId);
            if (existing) {
                existing.net2 = Number(p.netSalary);
            }
            else {
                employeeMap.set(p.employeeId, {
                    name: `${p.employee.firstName} ${p.employee.lastName}`,
                    code: p.employee.employeeCode || '-',
                    net1: 0,
                    net2: Number(p.netSalary),
                });
            }
        });
        employeeMap.forEach((emp) => {
            const diff = emp.net2 - emp.net1;
            const pct = emp.net1 > 0 ? ((diff / emp.net1) * 100).toFixed(1) + '%' : 'جديد';
            sheet.addRow([emp.code, emp.name, emp.net1, emp.net2, diff, pct]);
        });
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
    async generateDepartmentCostExcel(month, year) {
        const period = await this.prisma.payrollPeriod.findFirst({
            where: { month, year },
            include: {
                runs: {
                    include: {
                        payslips: {
                            include: {
                                employee: {
                                    include: { department: true }
                                }
                            }
                        }
                    }
                }
            }
        });
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('تكاليف بالقسم', { views: [{ rightToLeft: true }] });
        const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        sheet.addRow([`تقرير تكاليف الرواتب بالقسم - ${monthNames[month - 1]} ${year}`]);
        sheet.addRow([]);
        const headers = ['القسم', 'عدد الموظفين', 'إجمالي الأساسي', 'إجمالي الاستقطاعات', 'إجمالي الصافي', 'متوسط الراتب'];
        const headerRow = sheet.addRow(headers);
        headerRow.font = { bold: true };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9800' } };
        const payslips = period?.runs.flatMap(r => r.payslips) || [];
        const deptMap = new Map();
        payslips.forEach(p => {
            const deptName = p.employee.department?.name || 'غير محدد';
            const existing = deptMap.get(deptName) || { name: deptName, count: 0, base: 0, ded: 0, net: 0 };
            existing.count++;
            existing.base += Number(p.baseSalary);
            existing.ded += Number(p.totalDeductions);
            existing.net += Number(p.netSalary);
            deptMap.set(deptName, existing);
        });
        deptMap.forEach((dept) => {
            sheet.addRow([
                dept.name,
                dept.count,
                dept.base,
                dept.ded,
                dept.net,
                (dept.net / dept.count).toFixed(2)
            ]);
        });
        const totalsRow = sheet.addRow([
            'الإجمالي',
            payslips.length,
            payslips.reduce((s, p) => s + Number(p.baseSalary), 0),
            payslips.reduce((s, p) => s + Number(p.totalDeductions), 0),
            payslips.reduce((s, p) => s + Number(p.netSalary), 0),
            ''
        ]);
        totalsRow.font = { bold: true };
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
    async generateLoansReportExcel() {
        const advances = await this.prisma.advanceRequest.findMany({
            where: { status: { in: ['APPROVED', 'PAID'] } },
            include: {
                user: true,
                payments: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('تقرير السلف', { views: [{ rightToLeft: true }] });
        sheet.addRow(['تقرير السلف وأرصدتها']);
        sheet.addRow([]);
        const headers = ['كود الموظف', 'اسم الموظف', 'المبلغ المعتمد', 'المدفوع', 'المتبقي', 'الحالة', 'تاريخ البداية', 'عدد الأقساط المدفوعة'];
        const headerRow = sheet.addRow(headers);
        headerRow.font = { bold: true };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E91E63' } };
        advances.forEach(adv => {
            const approved = adv.approvedAmount ? Number(adv.approvedAmount) : Number(adv.amount);
            const paid = adv.payments.reduce((s, p) => s + Number(p.amount), 0);
            sheet.addRow([
                adv.user.employeeCode || '-',
                `${adv.user.firstName} ${adv.user.lastName}`,
                approved,
                paid,
                approved - paid,
                adv.status === 'PAID' ? 'مسددة' : 'نشطة',
                adv.startDate.toLocaleDateString('ar-SA'),
                adv.payments.length,
            ]);
        });
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
};
exports.ExcelService = ExcelService;
exports.ExcelService = ExcelService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExcelService);
//# sourceMappingURL=excel.service.js.map