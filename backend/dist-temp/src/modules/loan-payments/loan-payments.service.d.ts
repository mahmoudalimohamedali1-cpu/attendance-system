import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateLoanPaymentDto } from './dto/create-loan-payment.dto';
import { Decimal } from '@prisma/client/runtime/library';
export declare class LoanPaymentsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateLoanPaymentDto, createdById: string): Promise<{
        id: string;
        createdAt: Date;
        amount: Decimal;
        notes: string | null;
        createdById: string | null;
        payrollRunId: string | null;
        payslipId: string | null;
        advanceId: string;
        paymentDate: Date;
        paymentType: string;
    }>;
    findByAdvance(advanceId: string): Promise<{
        id: string;
        createdAt: Date;
        amount: Decimal;
        notes: string | null;
        createdById: string | null;
        payrollRunId: string | null;
        payslipId: string | null;
        advanceId: string;
        paymentDate: Date;
        paymentType: string;
    }[]>;
    getAdvanceSummary(advanceId: string): Promise<{
        advance: {
            id: string;
            employee: {
                firstName: string;
                lastName: string;
                employeeCode: string | null;
            };
            amount: number;
            monthlyDeduction: number;
            status: string;
            startDate: Date;
            endDate: Date;
        };
        payments: {
            id: string;
            amount: number;
            date: Date;
            type: string;
        }[];
        summary: {
            totalAmount: number;
            totalPaid: number;
            remaining: number;
            paidPercentage: number;
            paymentsCount: number;
        };
    }>;
    getActiveLoansWithBalance(): Promise<{
        id: string;
        employee: {
            id: string;
            firstName: string;
            lastName: string;
            employeeCode: string | null;
        };
        amount: number;
        paid: number;
        remaining: number;
        status: string;
        monthlyDeduction: number;
    }[]>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        amount: Decimal;
        notes: string | null;
        createdById: string | null;
        payrollRunId: string | null;
        payslipId: string | null;
        advanceId: string;
        paymentDate: Date;
        paymentType: string;
    }>;
}
