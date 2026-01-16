export declare class CreateBankAccountDto {
    userId: string;
    iban: string;
    accountHolderName?: string;
    bankName: string;
    bankCode?: string;
    swiftCode?: string;
    isPrimary?: boolean;
}
