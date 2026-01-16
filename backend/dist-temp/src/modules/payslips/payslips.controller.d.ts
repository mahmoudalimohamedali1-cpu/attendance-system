import { Response } from 'express';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PdfService } from '../../common/pdf/pdf.service';
import { PermissionsService } from '../permissions/permissions.service';
export declare class PayslipsController {
    private readonly prisma;
    private readonly pdfService;
    private readonly permissionsService;
    constructor(prisma: PrismaService, pdfService: PdfService, permissionsService: PermissionsService);
    getMyPayslips(userId: string, companyId: string): Promise<{
        id: string;
        month: number;
        year: number;
        periodLabel: string;
        baseSalary: number;
        grossSalary: number;
        totalDeductions: number;
        netSalary: number;
        status: import(".prisma/client").$Enums.PayrollStatus;
        earnings: {
            name: string;
            amount: number;
            description: string | null;
        }[];
        deductions: {
            name: string;
            amount: number;
            description: string | null;
        }[];
    }[]>;
    findAll(userId: string, companyId: string, payrollRunId?: string, periodId?: string, search?: string): Promise<{
        user: {
            id: string;
            firstName: string;
            lastName: string;
            employeeCode: string | null;
            jobTitle: string | null;
            department: {
                name: string;
            } | null;
        };
        baseSalary: number;
        grossSalary: number;
        totalDeductions: number;
        netSalary: number;
        gosiEmployee: number;
        gosiEmployer: number;
        lines: {
            amount: number;
            units: number | null;
            rate: number | null;
            type: string;
            componentCode: string;
            componentName: string | null;
            component: {
                nameEn: string | null;
                code: string;
                nameAr: string;
            };
            id: string;
            createdAt: Date;
            costCenterId: string | null;
            sign: string;
            sourceType: import(".prisma/client").$Enums.PayslipLineSource;
            sourceRef: string | null;
            descriptionAr: string | null;
            componentId: string;
            payslipId: string;
        }[];
        period: {
            month: number;
            year: number;
        };
        employee: {
            id: string;
            firstName: string;
            lastName: string;
            employeeCode: string | null;
            jobTitle: string | null;
            department: {
                name: string;
            } | null;
        };
        run: {
            id: string;
            status: import(".prisma/client").$Enums.PayrollStatus;
        } | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.PayrollStatus;
        companyId: string | null;
        periodId: string;
        calculationTrace: import("@prisma/client/runtime/library").JsonValue | null;
        employeeId: string;
        runId: string | null;
    }[]>;
    findOne(id: string, companyId: string): Promise<{
        user: {
            id: string;
            firstName: string;
            lastName: string;
            employeeCode: string | null;
            jobTitle: string | null;
            department: {
                name: string;
            } | null;
        };
        baseSalary: number;
        grossSalary: number;
        totalDeductions: number;
        netSalary: number;
        gosiEmployee: number;
        gosiEmployer: number;
        lines: {
            amount: number;
            units: number | null;
            rate: number | null;
            type: string;
            componentCode: string;
            componentName: string | null;
            component: {
                nameEn: string | null;
                code: string;
                nameAr: string;
            };
            id: string;
            createdAt: Date;
            costCenterId: string | null;
            sign: string;
            sourceType: import(".prisma/client").$Enums.PayslipLineSource;
            sourceRef: string | null;
            descriptionAr: string | null;
            componentId: string;
            payslipId: string;
        }[];
        period: {
            month: number;
            year: number;
        };
        employee: {
            id: string;
            firstName: string;
            lastName: string;
            employeeCode: string | null;
            jobTitle: string | null;
            department: {
                name: string;
            } | null;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.PayrollStatus;
        companyId: string | null;
        periodId: string;
        calculationTrace: import("@prisma/client/runtime/library").JsonValue | null;
        employeeId: string;
        runId: string | null;
    } | null>;
    downloadPdf(id: string, res: Response): Promise<void>;
}
