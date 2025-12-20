import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    attachments?: Array<{
        filename: string;
        content: Buffer;
        contentType?: string;
    }>;
}

@Injectable()
export class EmailService {
    private transporter: nodemailer.Transporter;
    private readonly logger = new Logger(EmailService.name);

    constructor() {
        // Initialize with environment variables or defaults
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    async sendEmail(options: EmailOptions): Promise<boolean> {
        try {
            const info = await this.transporter.sendMail({
                from: process.env.SMTP_FROM || '"HRMS System" <noreply@example.com>',
                to: options.to,
                subject: options.subject,
                html: options.html,
                attachments: options.attachments,
            });

            this.logger.log(`Email sent: ${info.messageId}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to send email: ${error.message}`);
            return false;
        }
    }

    async sendPayslipEmail(
        employeeEmail: string,
        employeeName: string,
        month: number,
        year: number,
        pdfBuffer: Buffer,
    ): Promise<boolean> {
        const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

        const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; direction: rtl; padding: 20px; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
          h1 { color: #1976d2; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>قسيمة الراتب - ${monthNames[month - 1]} ${year}</h1>
          <p>عزيزي/عزيزتي <strong>${employeeName}</strong>،</p>
          <p>مرفق قسيمة راتبك لشهر ${monthNames[month - 1]} ${year}.</p>
          <p>يرجى الاطلاع على الملف المرفق للحصول على التفاصيل الكاملة.</p>
          <div class="footer">
            <p>هذا البريد الإلكتروني تم إرساله تلقائياً من نظام الموارد البشرية.</p>
            <p>في حال وجود أي استفسار، يرجى التواصل مع قسم الموارد البشرية.</p>
          </div>
        </div>
      </body>
      </html>
    `;

        return this.sendEmail({
            to: employeeEmail,
            subject: `قسيمة الراتب - ${monthNames[month - 1]} ${year}`,
            html,
            attachments: [
                {
                    filename: `payslip-${month}-${year}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf',
                },
            ],
        });
    }
}
