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
exports.PdfService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const PDFDocument = require("pdfkit");
let PdfService = class PdfService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generatePayslipPdf(payslipId) {
        const payslip = await this.prisma.payslip.findUnique({
            where: { id: payslipId },
            include: {
                employee: true,
                period: true,
                lines: { include: { component: true } },
            },
        });
        if (!payslip)
            throw new Error('Payslip not found');
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            doc.fontSize(20).text('قسيمة الراتب', { align: 'center' });
            doc.fontSize(12).text('Payslip', { align: 'center' });
            doc.moveDown();
            const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
            doc.fontSize(14).text(`${monthNames[payslip.period.month - 1]} ${payslip.period.year}`, { align: 'center' });
            doc.moveDown(2);
            doc.rect(50, doc.y, 495, 80).stroke();
            const boxTop = doc.y + 10;
            doc.fontSize(10);
            doc.text(`الاسم: ${payslip.employee.firstName} ${payslip.employee.lastName}`, 60, boxTop);
            doc.text(`البريد: ${payslip.employee.email}`, 60, boxTop + 20);
            doc.text(`القسم: ${payslip.employee.jobTitle || 'غير محدد'}`, 60, boxTop + 40);
            doc.text(`الحالة: ${payslip.status}`, 300, boxTop + 40);
            doc.moveDown(4);
            doc.fontSize(12).text('الاستحقاقات (Earnings)', 50, doc.y);
            doc.moveDown(0.5);
            const earnings = payslip.lines.filter(l => l.sign === 'EARNING');
            let earningsTotal = 0;
            for (const line of earnings) {
                const amount = Number(line.amount);
                earningsTotal += amount;
                doc.fontSize(10).text(`${line.component.nameAr}`, 60, doc.y, { continued: true });
                doc.text(`${amount.toLocaleString('ar-SA')} ريال`, { align: 'right' });
            }
            doc.moveDown();
            doc.fontSize(11).text(`إجمالي الاستحقاقات: ${earningsTotal.toLocaleString('ar-SA')} ريال`, { align: 'right' });
            doc.moveDown(2);
            doc.fontSize(12).text('الاستقطاعات (Deductions)', 50, doc.y);
            doc.moveDown(0.5);
            const deductions = payslip.lines.filter(l => l.sign === 'DEDUCTION');
            let deductionsTotal = 0;
            for (const line of deductions) {
                const amount = Number(line.amount);
                deductionsTotal += amount;
                doc.fontSize(10).text(`${line.component.nameAr}`, 60, doc.y, { continued: true });
                doc.text(`${amount.toLocaleString('ar-SA')} ريال`, { align: 'right' });
            }
            doc.moveDown();
            doc.fontSize(11).text(`إجمالي الاستقطاعات: ${deductionsTotal.toLocaleString('ar-SA')} ريال`, { align: 'right' });
            doc.moveDown(2);
            doc.rect(50, doc.y, 495, 100).fillAndStroke('#f0f0f0', '#000');
            const summaryTop = doc.y + 10;
            doc.fillColor('#000').fontSize(12);
            doc.text(`الراتب الأساسي: ${Number(payslip.baseSalary).toLocaleString('ar-SA')} ريال`, 60, summaryTop);
            doc.text(`إجمالي الراتب: ${Number(payslip.grossSalary).toLocaleString('ar-SA')} ريال`, 60, summaryTop + 25);
            doc.text(`إجمالي الاستقطاعات: ${Number(payslip.totalDeductions).toLocaleString('ar-SA')} ريال`, 60, summaryTop + 50);
            doc.fontSize(14).fillColor('#0066cc').text(`صافي الراتب: ${Number(payslip.netSalary).toLocaleString('ar-SA')} ريال`, 60, summaryTop + 75);
            doc.fillColor('#666').fontSize(8);
            doc.text(`تم الإنشاء: ${new Date().toLocaleDateString('ar-SA')}`, 50, 750, { align: 'center' });
            doc.text('هذا المستند آلي ولا يحتاج توقيع', 50, 765, { align: 'center' });
            doc.end();
        });
    }
};
exports.PdfService = PdfService;
exports.PdfService = PdfService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PdfService);
//# sourceMappingURL=pdf.service.js.map