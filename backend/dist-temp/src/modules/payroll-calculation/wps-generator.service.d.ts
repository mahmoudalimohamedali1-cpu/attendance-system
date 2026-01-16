import { PrismaService } from '../../common/prisma/prisma.service';
export declare class WpsGeneratorService {
    private prisma;
    constructor(prisma: PrismaService);
    generateWpsExcel(runId: string, companyId: string): Promise<Buffer>;
    generateWpsCsv(runId: string, companyId: string): Promise<string>;
}
