export declare enum PaymentType {
    SALARY_DEDUCTION = "SALARY_DEDUCTION",
    MANUAL = "MANUAL",
    CASH = "CASH"
}
export declare class CreateLoanPaymentDto {
    advanceId: string;
    amount: number;
    paymentDate: string;
    paymentType?: PaymentType;
    payrollRunId?: string;
    payslipId?: string;
    notes?: string;
}
