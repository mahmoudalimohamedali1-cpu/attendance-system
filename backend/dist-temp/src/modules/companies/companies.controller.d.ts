import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
export declare class CompaniesController {
    private readonly companiesService;
    constructor(companiesService: CompaniesService);
    create(createCompanyDto: CreateCompanyDto): Promise<{
        id: string;
        name: string;
        nameEn: string | null;
        crNumber: string | null;
        taxId: string | null;
        logo: string | null;
        address: string | null;
        phone: string | null;
        email: string | null;
        website: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAll(): Promise<{
        id: string;
        name: string;
        nameEn: string | null;
        crNumber: string | null;
        taxId: string | null;
        logo: string | null;
        address: string | null;
        phone: string | null;
        email: string | null;
        website: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        name: string;
        nameEn: string | null;
        crNumber: string | null;
        taxId: string | null;
        logo: string | null;
        address: string | null;
        phone: string | null;
        email: string | null;
        website: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<{
        id: string;
        name: string;
        nameEn: string | null;
        crNumber: string | null;
        taxId: string | null;
        logo: string | null;
        address: string | null;
        phone: string | null;
        email: string | null;
        website: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        nameEn: string | null;
        crNumber: string | null;
        taxId: string | null;
        logo: string | null;
        address: string | null;
        phone: string | null;
        email: string | null;
        website: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
