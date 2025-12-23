/**
 * خدمة الحسابات البنكية للشركات
 */

import { api } from './api.service';

// قائمة البنوك السعودية
export const SAUDI_BANKS = [
    { code: 'NCB', name: 'البنك الأهلي السعودي', swift: 'NCBKSAJE' },
    { code: 'RJHI', name: 'مصرف الراجحي', swift: 'RJHISARI' },
    { code: 'SABB', name: 'البنك السعودي البريطاني', swift: 'SABBSARI' },
    { code: 'RIBL', name: 'بنك الرياض', swift: 'RIBLSARI' },
    { code: 'ARNB', name: 'البنك العربي الوطني', swift: 'ARNBSARI' },
    { code: 'BSFR', name: 'بنك الفرنسي', swift: 'BSFRSARI' },
    { code: 'BJAZ', name: 'بنك الجزيرة', swift: 'BJAZSAJE' },
    { code: 'SIBC', name: 'البنك السعودي للاستثمار', swift: 'SIBCSARI' },
    { code: 'ALBI', name: 'بنك البلاد', swift: 'ALBISARI' },
    { code: 'ALIN', name: 'بنك الإنماء', swift: 'ALINSARI' },
    { code: 'GULF', name: 'بنك الخليج الدولي', swift: 'GULFSARI' },
];

export interface CompanyBankAccount {
    id: string;
    companyId: string;
    bankName: string;
    bankCode: string;
    iban: string;
    accountName: string;
    swiftCode?: string;
    isPrimary: boolean;
    isActive: boolean;
    molId?: string;
    wpsParticipant?: string;
    accountType: string;
    currency: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCompanyBankAccountDto {
    bankName: string;
    bankCode: string;
    iban: string;
    accountName: string;
    swiftCode?: string;
    isPrimary?: boolean;
    molId?: string;
    wpsParticipant?: string;
    accountType?: string;
    currency?: string;
    notes?: string;
}

export interface UpdateCompanyBankAccountDto {
    bankName?: string;
    bankCode?: string;
    accountName?: string;
    swiftCode?: string;
    isPrimary?: boolean;
    isActive?: boolean;
    molId?: string;
    wpsParticipant?: string;
    notes?: string;
}

/**
 * التحقق من صحة IBAN السعودي
 */
export function validateSaudiIBAN(iban: string): { isValid: boolean; error?: string } {
    const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();

    if (cleanIBAN.length !== 24) {
        return { isValid: false, error: 'IBAN يجب أن يكون 24 حرف' };
    }

    if (!cleanIBAN.startsWith('SA')) {
        return { isValid: false, error: 'IBAN السعودي يجب أن يبدأ بـ SA' };
    }

    if (!/^SA[0-9A-Z]{22}$/.test(cleanIBAN)) {
        return { isValid: false, error: 'IBAN يحتوي على أحرف غير صالحة' };
    }

    return { isValid: true };
}

/**
 * تنسيق IBAN للعرض
 */
export function formatIBAN(iban: string): string {
    const clean = iban.replace(/\s/g, '').toUpperCase();
    return clean.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * استخراج رمز البنك من IBAN
 */
export function extractBankCodeFromIBAN(iban: string): string {
    const clean = iban.replace(/\s/g, '').toUpperCase();
    if (clean.length >= 6) {
        // في IBAN السعودي، رمز البنك هو الأحرف 5-6
        return clean.substring(4, 6);
    }
    return '';
}

export const companyBankAccountsService = {
    /**
     * جلب كل الحسابات البنكية للشركة
     */
    async getAll(): Promise<CompanyBankAccount[]> {
        return api.get<CompanyBankAccount[]>('/company-bank-accounts');
    },

    /**
     * جلب الحسابات النشطة فقط
     */
    async getActive(): Promise<CompanyBankAccount[]> {
        return api.get<CompanyBankAccount[]>('/company-bank-accounts/active');
    },

    /**
     * جلب الحساب الرئيسي
     */
    async getPrimary(): Promise<CompanyBankAccount | null> {
        return api.get<CompanyBankAccount | null>('/company-bank-accounts/primary');
    },

    /**
     * جلب قائمة البنوك السعودية
     */
    async getBanks(): Promise<typeof SAUDI_BANKS> {
        try {
            return api.get<typeof SAUDI_BANKS>('/company-bank-accounts/banks');
        } catch {
            return SAUDI_BANKS;
        }
    },

    /**
     * جلب حساب واحد
     */
    async getById(id: string): Promise<CompanyBankAccount> {
        return api.get<CompanyBankAccount>(`/company-bank-accounts/${id}`);
    },

    /**
     * إنشاء حساب جديد
     */
    async create(data: CreateCompanyBankAccountDto): Promise<CompanyBankAccount> {
        return api.post<CompanyBankAccount>('/company-bank-accounts', data);
    },

    /**
     * تحديث حساب
     */
    async update(id: string, data: UpdateCompanyBankAccountDto): Promise<CompanyBankAccount> {
        return api.put<CompanyBankAccount>(`/company-bank-accounts/${id}`, data);
    },

    /**
     * تعيين حساب كرئيسي
     */
    async setPrimary(id: string): Promise<CompanyBankAccount> {
        return api.patch<CompanyBankAccount>(`/company-bank-accounts/${id}/primary`);
    },

    /**
     * تفعيل/تعطيل حساب
     */
    async toggleActive(id: string): Promise<CompanyBankAccount> {
        return api.patch<CompanyBankAccount>(`/company-bank-accounts/${id}/toggle-active`);
    },

    /**
     * حذف حساب
     */
    async delete(id: string): Promise<void> {
        return api.delete(`/company-bank-accounts/${id}`);
    },
};

export default companyBankAccountsService;
