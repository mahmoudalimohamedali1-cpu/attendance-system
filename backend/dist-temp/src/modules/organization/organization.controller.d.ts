import { OrganizationService, OrgNode } from './organization.service';
export declare class OrganizationController {
    private readonly organizationService;
    constructor(organizationService: OrganizationService);
    getOrgStructure(req: any): Promise<OrgNode | null>;
    getDepartments(req: any): Promise<{
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
    getBranches(req: any): Promise<{
        id: string;
        name: string;
        nameEn: string | null;
        _count: {
            users: number;
        };
    }[]>;
    getOrgStats(req: any): Promise<{
        totalEmployees: number;
        departments: number;
        branches: number;
        managers: number;
    }>;
}
