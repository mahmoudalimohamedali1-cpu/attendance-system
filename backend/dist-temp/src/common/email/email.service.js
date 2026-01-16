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
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer = require("nodemailer");
let EmailService = EmailService_1 = class EmailService {
    constructor() {
        this.logger = new common_1.Logger(EmailService_1.name);
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
    async sendEmail(options) {
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
        }
        catch (error) {
            this.logger.error(`Failed to send email: ${error.message}`);
            return false;
        }
    }
    async sendPayslipEmail(employeeEmail, employeeName, month, year, pdfBuffer) {
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
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], EmailService);
//# sourceMappingURL=email.service.js.map