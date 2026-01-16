import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSalaryAssignmentDto } from './dto/create-salary-assignment.dto';
export declare class SalaryAssignmentsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateSalaryAssignmentDto, companyId: string): Promise<{
        structure: {
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
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        effectiveDate: Date;
        endDate: Date | null;
        isActive: boolean;
        baseSalary: import("@prisma/client/runtime/library").Decimal;
        employeeId: string;
        structureId: string;
    }>;
    findAll(companyId: string): Promise<({
        employee: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            employeeCode: string | null;
        };
        structure: {
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
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        effectiveDate: Date;
        endDate: Date | null;
        isActive: boolean;
        baseSalary: import("@prisma/client/runtime/library").Decimal;
        employeeId: string;
        structureId: string;
    })[]>;
    findByEmployee(employeeId: string, companyId: string): Promise<({
        structure: {
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
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        effectiveDate: Date;
        endDate: Date | null;
        isActive: boolean;
        baseSalary: import("@prisma/client/runtime/library").Decimal;
        employeeId: string;
        structureId: string;
    })[]>;
    findActive(employeeId: string, companyId: string): Promise<({
        structure: {
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
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        effectiveDate: Date;
        endDate: Date | null;
        isActive: boolean;
        baseSalary: import("@prisma/client/runtime/library").Decimal;
        employeeId: string;
        structureId: string;
    }) | null>;
    remove(id: string, companyId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        effectiveDate: Date;
        endDate: Date | null;
        isActive: boolean;
        baseSalary: import("@prisma/client/runtime/library").Decimal;
        employeeId: string;
        structureId: string;
    }>;
}
