import { BankAccountsService } from './bank-accounts.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
export declare class BankAccountsController {
    private readonly service;
    constructor(service: BankAccountsService);
    findAll(user: any): Promise<({
        user: {
            id: string;
            firstName: string;
            lastName: string;
            employeeCode: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        iban: string;
        accountHolderName: string | null;
        bankName: string;
        bankCode: string | null;
        swiftCode: string | null;
        isPrimary: boolean;
        isVerified: boolean;
        verifiedAt: Date | null;
        verifiedBy: string | null;
    })[]>;
    create(dto: CreateBankAccountDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        iban: string;
        accountHolderName: string | null;
        bankName: string;
        bankCode: string | null;
        swiftCode: string | null;
        isPrimary: boolean;
        isVerified: boolean;
        verifiedAt: Date | null;
        verifiedBy: string | null;
    }>;
    findByUser(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        iban: string;
        accountHolderName: string | null;
        bankName: string;
        bankCode: string | null;
        swiftCode: string | null;
        isPrimary: boolean;
        isVerified: boolean;
        verifiedAt: Date | null;
        verifiedBy: string | null;
    }[]>;
    setPrimary(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        iban: string;
        accountHolderName: string | null;
        bankName: string;
        bankCode: string | null;
        swiftCode: string | null;
        isPrimary: boolean;
        isVerified: boolean;
        verifiedAt: Date | null;
        verifiedBy: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        iban: string;
        accountHolderName: string | null;
        bankName: string;
        bankCode: string | null;
        swiftCode: string | null;
        isPrimary: boolean;
        isVerified: boolean;
        verifiedAt: Date | null;
        verifiedBy: string | null;
    }>;
    verify(id: string, user: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        iban: string;
        accountHolderName: string | null;
        bankName: string;
        bankCode: string | null;
        swiftCode: string | null;
        isPrimary: boolean;
        isVerified: boolean;
        verifiedAt: Date | null;
        verifiedBy: string | null;
    }>;
    unverify(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        iban: string;
        accountHolderName: string | null;
        bankName: string;
        bankCode: string | null;
        swiftCode: string | null;
        isPrimary: boolean;
        isVerified: boolean;
        verifiedAt: Date | null;
        verifiedBy: string | null;
    }>;
}
