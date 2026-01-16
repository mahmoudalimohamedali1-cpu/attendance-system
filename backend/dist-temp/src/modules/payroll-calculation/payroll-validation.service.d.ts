import { PrismaService } from '../../common/prisma/prisma.service';
export interface ValidationIssue {
    employeeId: string;
    employeeName: string;
    employeeCode: string;
    type: 'ERROR' | 'WARNING';
    module: 'BANK' | 'CONTRACT' | 'ATTENDANCE' | 'SALARY';
    messageAr: string;
    messageEn: string;
}
export interface PayrollValidationResult {
    periodId: string;
    isValid: boolean;
    errorsCount: number;
    warningsCount: number;
    issues: ValidationIssue[];
}
export declare class PayrollValidationService {
    private prisma;
    constructor(prisma: PrismaService);
    validatePeriod(periodId: string, companyId: string, employeeIds?: string[]): Promise<PayrollValidationResult>;
}
