import { api } from './api.service';

export enum MuqeemTransactionType {
    IQAMA_ISSUE = 'IQAMA_ISSUE',
    IQAMA_RENEW = 'IQAMA_RENEW',
    IQAMA_TRANSFER = 'IQAMA_TRANSFER',
    VISA_EXIT_REENTRY_ISSUE = 'VISA_EXIT_REENTRY_ISSUE',
    VISA_EXIT_REENTRY_CANCEL = 'VISA_EXIT_REENTRY_CANCEL',
    VISA_EXIT_REENTRY_EXTEND = 'VISA_EXIT_REENTRY_EXTEND',
    VISA_EXIT_REENTRY_REPRINT = 'VISA_EXIT_REENTRY_REPRINT',
    VISA_FINAL_EXIT_ISSUE = 'VISA_FINAL_EXIT_ISSUE',
    VISA_FINAL_EXIT_CANCEL = 'VISA_FINAL_EXIT_CANCEL',
    PASSPORT_EXTEND = 'PASSPORT_EXTEND',
    PASSPORT_RENEW = 'PASSPORT_RENEW',
}

export interface MuqeemTransaction {
    id: string;
    userId: string;
    type: MuqeemTransactionType;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    externalRef?: string;
    errorMessage?: string;
    fileUrl?: string;
    createdAt: string;
    user?: {
        firstName: string;
        lastName: string;
        employeeCode: string;
        nationalId: string;
    };
}

export const muqeemApi = {
    getTransactions: (params?: any) =>
        api.get<{ items: MuqeemTransaction[]; total: number }>('/integrations/muqeem/transactions', { params }),

    executeTransaction: (data: { userId: string; type: MuqeemTransactionType; payload: any }) =>
        api.post<{ success: boolean; message: string; transactionId: string }>('/integrations/muqeem/transaction/execute', data),

    getConfig: () => api.get('/integrations/muqeem/config'),

    updateConfig: (data: any) => api.post('/integrations/muqeem/config', data),
};
