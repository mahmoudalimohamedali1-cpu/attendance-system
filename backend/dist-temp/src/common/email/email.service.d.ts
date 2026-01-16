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
export declare class EmailService {
    private transporter;
    private readonly logger;
    constructor();
    sendEmail(options: EmailOptions): Promise<boolean>;
    sendPayslipEmail(employeeEmail: string, employeeName: string, month: number, year: number, pdfBuffer: Buffer): Promise<boolean>;
}
