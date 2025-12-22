import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as PDFDocument from 'pdfkit';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class PdfService {
    constructor(private prisma: PrismaService) { }

    async generatePayslipPdf(payslipId: string): Promise<Buffer> {
        const payslip = await this.prisma.payslip.findUnique({
            where: { id: payslipId },
            include: {
                employee: true,
                period: true,
                lines: { include: { component: true } },
            },
        });

        if (!payslip) throw new Error('Payslip not found');

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const chunks: Buffer[] = [];

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Header
            doc.fontSize(20).text('قسيمة الراتب', { align: 'center' });
            doc.fontSize(12).text('Payslip', { align: 'center' });
            doc.moveDown();

            // Period info
            const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
            doc.fontSize(14).text(`${monthNames[payslip.period.month - 1]} ${payslip.period.year}`, { align: 'center' });
            doc.moveDown(2);

            // Employee info box
            doc.rect(50, doc.y, 495, 80).stroke();
            const boxTop = doc.y + 10;
            doc.fontSize(10);
            doc.text(`الاسم: ${payslip.employee.firstName} ${payslip.employee.lastName}`, 60, boxTop);
            doc.text(`البريد: ${payslip.employee.email}`, 60, boxTop + 20);
            doc.text(`القسم: ${payslip.employee.jobTitle || 'غير محدد'}`, 60, boxTop + 40);
            doc.text(`الحالة: ${payslip.status}`, 300, boxTop + 40);
            doc.moveDown(4);

            // Earnings table
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

            // Deductions table
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

            // Summary box
            doc.rect(50, doc.y, 495, 100).fillAndStroke('#f0f0f0', '#000');
            const summaryTop = doc.y + 10;
            doc.fillColor('#000').fontSize(12);
            doc.text(`الراتب الأساسي: ${Number(payslip.baseSalary).toLocaleString('ar-SA')} ريال`, 60, summaryTop);
            doc.text(`إجمالي الراتب: ${Number(payslip.grossSalary).toLocaleString('ar-SA')} ريال`, 60, summaryTop + 25);
            doc.text(`إجمالي الاستقطاعات: ${Number(payslip.totalDeductions).toLocaleString('ar-SA')} ريال`, 60, summaryTop + 50);
            doc.fontSize(14).fillColor('#0066cc').text(`صافي الراتب: ${Number(payslip.netSalary).toLocaleString('ar-SA')} ريال`, 60, summaryTop + 75);

            // Footer
            doc.fillColor('#666').fontSize(8);
            doc.text(`تم الإنشاء: ${new Date().toLocaleDateString('ar-SA')}`, 50, 750, { align: 'center' });
            doc.text('هذا المستند آلي ولا يحتاج توقيع', 50, 765, { align: 'center' });

            doc.end();
        });
    }
}
