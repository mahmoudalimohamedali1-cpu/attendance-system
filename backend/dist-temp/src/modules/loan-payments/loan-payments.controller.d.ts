import { LoanPaymentsService } from './loan-payments.service';
import { CreateLoanPaymentDto } from './dto/create-loan-payment.dto';
export declare class LoanPaymentsController {
    private readonly service;
    constructor(service: LoanPaymentsService);
    create(dto: CreateLoanPaymentDto, req: any): Promise<{
        id: string;
        createdAt: Date;
        amount: import("@prisma/client/runtime/library").Decimal;
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
        amount: import("@prisma/client/runtime/library").Decimal;
        notes: string | null;
        createdById: string | null;
        payrollRunId: string | null;
        payslipId: string | null;
        advanceId: string;
        paymentDate: Date;
        paymentType: string;
    }[]>;
    getSummary(advanceId: string): Promise<{
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
    getActiveLoans(): Promise<{
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
        amount: import("@prisma/client/runtime/library").Decimal;
        notes: string | null;
        createdById: string | null;
        payrollRunId: string | null;
        payslipId: string | null;
        advanceId: string;
        paymentDate: Date;
        paymentType: string;
    }>;
}
