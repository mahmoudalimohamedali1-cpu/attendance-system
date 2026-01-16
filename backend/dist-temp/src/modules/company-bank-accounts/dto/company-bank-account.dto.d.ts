export declare class CreateCompanyBankAccountDto {
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
export declare class UpdateCompanyBankAccountDto {
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
