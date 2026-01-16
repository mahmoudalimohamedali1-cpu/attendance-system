import { Response } from 'express';
import { QiwaService } from './qiwa.service';
export declare class QiwaController {
    private readonly qiwaService;
    constructor(qiwaService: QiwaService);
    getContracts(req: any, status?: string): Promise<import("./qiwa.service").QiwaContractExport[]>;
    downloadContractsCsv(req: any, res: Response, status?: string): Promise<void>;
    getStats(req: any): Promise<{
        total: number;
        active: number;
        expired: number;
        terminated: number;
        draft: number;
        pendingSignatures: number;
        expiringSoon30: number;
        expiringSoon60: number;
        byType: {
            permanent: number;
            fixedTerm: number;
            partTime: number;
            probation: number;
        };
        byQiwaStatus: {
            notSubmitted: number;
            pending: number;
            authenticated: number;
            rejected: number;
        };
    }>;
    getActionsRequired(req: any): Promise<({
        user: {
            id: string;
            phone: string | null;
            email: string;
            firstName: string;
            lastName: string;
            employeeCode: string | null;
            nationalId: string | null;
            iqamaNumber: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ContractStatus;
        annualLeaveDays: number;
        type: import(".prisma/client").$Enums.ContractType;
        endDate: Date | null;
        startDate: Date;
        notes: string | null;
        userId: string;
        contractNumber: string | null;
        probationEndDate: Date | null;
        terminatedAt: Date | null;
        terminationReason: string | null;
        terminatedBy: string | null;
        renewalCount: number;
        previousContractId: string | null;
        salaryCycle: string;
        basicSalary: import("@prisma/client/runtime/library").Decimal | null;
        housingAllowance: import("@prisma/client/runtime/library").Decimal | null;
        transportAllowance: import("@prisma/client/runtime/library").Decimal | null;
        otherAllowances: import("@prisma/client/runtime/library").Decimal | null;
        totalSalary: import("@prisma/client/runtime/library").Decimal | null;
        contractJobTitle: string | null;
        workLocation: string | null;
        workingHoursPerWeek: number;
        noticePeriodDays: number;
        employeeSignature: boolean;
        employeeSignedAt: Date | null;
        employerSignature: boolean;
        employerSignedAt: Date | null;
        signedByUserId: string | null;
        qiwaContractId: string | null;
        qiwaStatus: import(".prisma/client").$Enums.QiwaAuthStatus;
        qiwaAuthDate: Date | null;
        qiwaRejectReason: string | null;
        qiwaLastSync: Date | null;
        documentUrl: string | null;
        additionalTerms: string | null;
    })[]>;
}
