import { PrismaService } from '../../common/prisma/prisma.service';
export declare class PdfService {
    private prisma;
    constructor(prisma: PrismaService);
    generatePayslipPdf(payslipId: string): Promise<Buffer>;
}
