export interface ExpenseItem {
    id: string;
    userId: string;
    userName: string;
    category: 'travel' | 'meals' | 'supplies' | 'transport' | 'accommodation' | 'other';
    categoryAr: string;
    amount: number;
    currency: string;
    description: string;
    date: Date;
    status: 'draft' | 'pending' | 'approved' | 'rejected' | 'reimbursed';
    createdAt: Date;
}
export interface ExpenseReport {
    id: string;
    userId: string;
    items: ExpenseItem[];
    totalAmount: number;
    status: 'draft' | 'submitted' | 'approved' | 'rejected';
}
export interface ReceiptParseResult {
    success: boolean;
    vendor?: string;
    amount?: number;
    date?: Date;
    category?: ExpenseItem['category'];
    confidence: number;
}
export declare class ExpenseManagementService {
    private readonly logger;
    private expenses;
    private readonly categoryMapping;
    private readonly vendorCategories;
    parseReceipt(receiptText: string): ReceiptParseResult;
    createExpense(userId: string, userName: string, message: string): {
        success: boolean;
        expense?: ExpenseItem;
        message: string;
    };
    submitExpense(expenseId: string): {
        success: boolean;
        message: string;
    };
    approveExpense(expenseId: string): {
        success: boolean;
        message: string;
    };
    getUserExpenses(userId: string): ExpenseItem[];
    getExpenseSummary(userId: string): string;
}
