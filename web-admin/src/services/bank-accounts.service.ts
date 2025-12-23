/**
 * Bank Accounts API Service
 * إدارة الحسابات البنكية للموظفين
 */

import { api } from './api.service';

export interface BankAccount {
    id: string;
    userId: string;
    user?: {
        id: string;
        firstName: string;
        lastName: string;
        employeeCode: string;
    };
    bankName: string;
    bankCode?: string;
    accountNumber?: string;
    iban: string;
    accountHolderName?: string;
    swiftCode?: string;
    isPrimary: boolean;
    isVerified: boolean;
    createdAt: string;
}

export interface CreateBankAccountDto {
    userId: string;
    bankName: string;
    bankCode?: string;
    accountNumber?: string;
    iban: string;
    accountHolderName?: string;
    swiftCode?: string;
    isPrimary?: boolean;
}

// Saudi Bank Codes
export const saudiBanks: { code: string; name: string }[] = [
    { code: '10', name: 'البنك الأهلي السعودي' },
    { code: '20', name: 'بنك الرياض' },
    { code: '30', name: 'البنك السعودي الفرنسي' },
    { code: '40', name: 'البنك السعودي البريطاني (ساب)' },
    { code: '45', name: 'البنك السعودي الاستثماري' },
    { code: '55', name: 'البنك السعودي الهولندي' },
    { code: '60', name: 'بنك الجزيرة' },
    { code: '65', name: 'البنك العربي' },
    { code: '80', name: 'مصرف الراجحي' },
    { code: '81', name: 'مصرف الإنماء' },
    { code: '90', name: 'بنك البلاد' },
];

// IBAN Validation
export function validateSaudiIBAN(iban: string): { valid: boolean; message: string } {
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();

    if (!cleanIban.startsWith('SA')) {
        return { valid: false, message: 'IBAN يجب أن يبدأ بـ SA' };
    }

    if (cleanIban.length !== 24) {
        return { valid: false, message: 'IBAN يجب أن يكون 24 حرف' };
    }

    if (!/^SA[0-9A-Z]{22}$/.test(cleanIban)) {
        return { valid: false, message: 'IBAN يحتوي على أحرف غير صحيحة' };
    }

    return { valid: true, message: 'IBAN صحيح' };
}

// Extract bank code from IBAN
export function extractBankCode(iban: string): string {
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    return cleanIban.substring(4, 6);
}

class BankAccountsService {
    private readonly basePath = '/bank-accounts';

    async getAll(): Promise<BankAccount[]> {
        const response = await api.get(this.basePath) as BankAccount[] | { data: BankAccount[] };
        return (response as any).data || response;
    }

    async getByUser(userId: string): Promise<BankAccount[]> {
        const response = await api.get(`${this.basePath}/user/${userId}`) as BankAccount[] | { data: BankAccount[] };
        return (response as any).data || response;
    }

    async create(data: CreateBankAccountDto): Promise<BankAccount> {
        const response = await api.post(this.basePath, data) as BankAccount | { data: BankAccount };
        return (response as any).data || response;
    }

    async setPrimary(id: string): Promise<BankAccount> {
        const response = await api.patch(`${this.basePath}/${id}/primary`, {}) as BankAccount | { data: BankAccount };
        return (response as any).data || response;
    }

    async delete(id: string): Promise<void> {
        await api.delete(`${this.basePath}/${id}`);
    }

    async verify(id: string): Promise<BankAccount> {
        const response = await api.patch(`${this.basePath}/${id}/verify`, {}) as BankAccount | { data: BankAccount };
        return (response as any).data || response;
    }

    async unverify(id: string): Promise<BankAccount> {
        const response = await api.patch(`${this.basePath}/${id}/unverify`, {}) as BankAccount | { data: BankAccount };
        return (response as any).data || response;
    }
}

export const bankAccountsService = new BankAccountsService();
