import { PrismaService } from '../../common/prisma/prisma.service';
export interface OrgNode {
    id: string;
    name: string;
    jobTitle: string;
    department?: string;
    branch?: string;
    avatar?: string;
    email?: string;
    phone?: string;
    employeeCode?: string;
    status?: 'online' | 'offline' | 'busy' | 'away';
    employeesCount?: number;
    children?: OrgNode[];
}
export declare class OrganizationService {
    private prisma;
    constructor(prisma: PrismaService);
    getOrgStructure(companyId: string): Promise<OrgNode | null>;
    getDepartments(companyId: string): Promise<{
        id: string;
        name: string;
        nameEn: string | null;
        _count: {
            users: number;
        };
        branch: {
            id: string;
            name: string;
        };
    }[]>;
    getBranches(companyId: string): Promise<{
        id: string;
        name: string;
        nameEn: string | null;
        _count: {
            users: number;
        };
    }[]>;
    getOrgStats(companyId: string): Promise<{
        totalEmployees: number;
        departments: number;
        branches: number;
        managers: number;
    }>;
    private getRoleLabel;
}
