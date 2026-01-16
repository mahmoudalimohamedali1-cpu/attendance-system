import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSalaryStructureDto } from './dto/create-salary-structure.dto';
import { UpdateSalaryStructureDto } from './dto/update-salary-structure.dto';
export declare class SalaryStructuresService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateSalaryStructureDto, companyId: string): Promise<{
        lines: ({
            component: {
                id: string;
                nameEn: string | null;
                createdAt: Date;
                updatedAt: Date;
                companyId: string | null;
                code: string;
                nameAr: string;
                type: import(".prisma/client").$Enums.SalaryComponentType;
                nature: import(".prisma/client").$Enums.SalaryComponentNature;
                description: string | null;
                gosiEligible: boolean;
                otEligible: boolean;
                eosEligible: boolean;
                isProrated: boolean;
                taxable: boolean;
                formula: string | null;
                version: number;
                effectiveDate: Date;
                endDate: Date | null;
                isActive: boolean;
                roundingMode: string;
                decimals: number;
                priority: number;
            };
        } & {
            id: string;
            priority: number;
            amount: import("@prisma/client/runtime/library").Decimal;
            componentId: string;
            structureId: string;
            percentage: import("@prisma/client/runtime/library").Decimal | null;
        })[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        description: string | null;
        version: number;
        effectiveDate: Date;
        endDate: Date | null;
        isActive: boolean;
    }>;
    findAll(companyId: string): Promise<({
        _count: {
            lines: number;
            assignments: number;
        };
        lines: ({
            component: {
                id: string;
                nameEn: string | null;
                createdAt: Date;
                updatedAt: Date;
                companyId: string | null;
                code: string;
                nameAr: string;
                type: import(".prisma/client").$Enums.SalaryComponentType;
                nature: import(".prisma/client").$Enums.SalaryComponentNature;
                description: string | null;
                gosiEligible: boolean;
                otEligible: boolean;
                eosEligible: boolean;
                isProrated: boolean;
                taxable: boolean;
                formula: string | null;
                version: number;
                effectiveDate: Date;
                endDate: Date | null;
                isActive: boolean;
                roundingMode: string;
                decimals: number;
                priority: number;
            };
        } & {
            id: string;
            priority: number;
            amount: import("@prisma/client/runtime/library").Decimal;
            componentId: string;
            structureId: string;
            percentage: import("@prisma/client/runtime/library").Decimal | null;
        })[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        description: string | null;
        version: number;
        effectiveDate: Date;
        endDate: Date | null;
        isActive: boolean;
    })[]>;
    findOne(id: string, companyId: string): Promise<{
        lines: ({
            component: {
                id: string;
                nameEn: string | null;
                createdAt: Date;
                updatedAt: Date;
                companyId: string | null;
                code: string;
                nameAr: string;
                type: import(".prisma/client").$Enums.SalaryComponentType;
                nature: import(".prisma/client").$Enums.SalaryComponentNature;
                description: string | null;
                gosiEligible: boolean;
                otEligible: boolean;
                eosEligible: boolean;
                isProrated: boolean;
                taxable: boolean;
                formula: string | null;
                version: number;
                effectiveDate: Date;
                endDate: Date | null;
                isActive: boolean;
                roundingMode: string;
                decimals: number;
                priority: number;
            };
        } & {
            id: string;
            priority: number;
            amount: import("@prisma/client/runtime/library").Decimal;
            componentId: string;
            structureId: string;
            percentage: import("@prisma/client/runtime/library").Decimal | null;
        })[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        description: string | null;
        version: number;
        effectiveDate: Date;
        endDate: Date | null;
        isActive: boolean;
    }>;
    update(id: string, companyId: string, dto: UpdateSalaryStructureDto): Promise<({
        lines: ({
            component: {
                id: string;
                nameEn: string | null;
                createdAt: Date;
                updatedAt: Date;
                companyId: string | null;
                code: string;
                nameAr: string;
                type: import(".prisma/client").$Enums.SalaryComponentType;
                nature: import(".prisma/client").$Enums.SalaryComponentNature;
                description: string | null;
                gosiEligible: boolean;
                otEligible: boolean;
                eosEligible: boolean;
                isProrated: boolean;
                taxable: boolean;
                formula: string | null;
                version: number;
                effectiveDate: Date;
                endDate: Date | null;
                isActive: boolean;
                roundingMode: string;
                decimals: number;
                priority: number;
            };
        } & {
            id: string;
            priority: number;
            amount: import("@prisma/client/runtime/library").Decimal;
            componentId: string;
            structureId: string;
            percentage: import("@prisma/client/runtime/library").Decimal | null;
        })[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        description: string | null;
        version: number;
        effectiveDate: Date;
        endDate: Date | null;
        isActive: boolean;
    }) | null>;
    remove(id: string, companyId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        description: string | null;
        version: number;
        effectiveDate: Date;
        endDate: Date | null;
        isActive: boolean;
    }>;
    private validateUniqueComponents;
}
