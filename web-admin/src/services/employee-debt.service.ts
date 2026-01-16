import { api } from './api.service';

export interface EmployeeDebt {
    id: string;
    employeeId: string;
    companyId: string;
    type: 'SALARY_ADVANCE' | 'LOAN' | 'PENALTY' | 'OTHER';
    description: string;
    originalAmount: number;
    remainingAmount: number;
    monthlyDeduction: number;
    startDate: string;
    endDate?: string;
    status: 'ACTIVE' | 'PAID' | 'WRITTEN_OFF' | 'SUSPENDED';
    createdById: string;
    approvedById?: string;
    approvedAt?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    employee?: {
        id: string;
        firstName: string;
        lastName: string;
        employeeCode: string;
    };
    ledgerEntries?: DebtLedgerEntry[];
}

export interface DebtLedgerEntry {
    id: string;
    debtId: string;
    type: 'INITIAL' | 'DEDUCTION' | 'PAYMENT' | 'ADJUSTMENT' | 'WRITE_OFF';
    amount: number;
    balanceAfter: number;
    description?: string;
    referenceType?: string;
    referenceId?: string;
    createdAt: string;
}

export interface CreateDebtDto {
    employeeId: string;
    type: 'SALARY_ADVANCE' | 'LOAN' | 'PENALTY' | 'OTHER';
    description: string;
    originalAmount: number;
    monthlyDeduction: number;
    startDate: string;
    notes?: string;
}

export interface ManualPaymentDto {
    amount: number;
    paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';
    reference?: string;
    notes?: string;
}

export interface WriteOffDto {
    reason: string;
    approvedBy?: string;
}

export interface DebtSummary {
    totalDebts: number;
    activeDebts: number;
    totalOriginalAmount: number;
    totalRemainingAmount: number;
    totalPaid: number;
}

class EmployeeDebtService {
    // Get all debts
    async getDebts(params?: {
        status?: string;
        type?: string;
        employeeId?: string;
        page?: number;
        limit?: number;
    }) {
        const response = await api.get('/employee-debts', { params });
        return response.data;
    }

    // Get debt by ID
    async getDebtById(id: string) {
        const response = await api.get(`/employee-debts/${id}`);
        return response.data;
    }

    // Get employee debts
    async getEmployeeDebts(employeeId: string) {
        const response = await api.get(`/employee-debts/employee/${employeeId}`);
        return response.data;
    }

    // Get debt summary for employee
    async getEmployeeSummary(employeeId: string): Promise<DebtSummary> {
        const response = await api.get(`/employee-debts/employee/${employeeId}/summary`);
        return response.data;
    }

    // Get ledger entries for debt
    async getLedgerEntries(debtId: string) {
        const response = await api.get(`/employee-debts/${debtId}/ledger`);
        return response.data;
    }

    // Create new debt
    async createDebt(data: CreateDebtDto) {
        const response = await api.post('/employee-debts', data);
        return response.data;
    }

    // Approve debt
    async approveDebt(id: string) {
        const response = await api.post(`/employee-debts/${id}/approve`);
        return response.data;
    }

    // Suspend debt
    async suspendDebt(id: string, reason: string) {
        const response = await api.post(`/employee-debts/${id}/suspend`, { reason });
        return response.data;
    }

    // Resume debt
    async resumeDebt(id: string) {
        const response = await api.post(`/employee-debts/${id}/resume`);
        return response.data;
    }

    // Record manual payment
    async recordManualPayment(id: string, data: ManualPaymentDto) {
        const response = await api.post(`/employee-debts/${id}/payment`, data);
        return response.data;
    }

    // Write off debt
    async writeOffDebt(id: string, data: WriteOffDto) {
        const response = await api.post(`/employee-debts/${id}/write-off`, data);
        return response.data;
    }

    // Adjust debt amount
    async adjustDebt(id: string, data: { amount: number; reason: string }) {
        const response = await api.post(`/employee-debts/${id}/adjust`, data);
        return response.data;
    }
}

export const employeeDebtService = new EmployeeDebtService();
export default employeeDebtService;
