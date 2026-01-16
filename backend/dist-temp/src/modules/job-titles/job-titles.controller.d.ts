import { JobTitlesService, CreateJobTitleDto, UpdateJobTitleDto } from './job-titles.service';
export declare class JobTitlesController {
    private readonly jobTitlesService;
    constructor(jobTitlesService: JobTitlesService);
    create(dto: CreateJobTitleDto, companyId: string): Promise<{
        id: string;
        name: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        isActive: boolean;
        level: import(".prisma/client").$Enums.Role;
        isDirectManager: boolean;
    }>;
    findAll(companyId: string): Promise<({
        _count: {
            users: number;
        };
    } & {
        id: string;
        name: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        isActive: boolean;
        level: import(".prisma/client").$Enums.Role;
        isDirectManager: boolean;
    })[]>;
    findDirectManagers(companyId: string): Promise<{
        id: string;
        name: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        isActive: boolean;
        level: import(".prisma/client").$Enums.Role;
        isDirectManager: boolean;
    }[]>;
    findDirectManagerUsers(companyId: string): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        jobTitle: string | null;
        jobTitleRef: {
            name: string;
            level: import(".prisma/client").$Enums.Role;
        } | null;
    }[]>;
    findOne(id: string): Promise<{
        users: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        }[];
    } & {
        id: string;
        name: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        isActive: boolean;
        level: import(".prisma/client").$Enums.Role;
        isDirectManager: boolean;
    }>;
    update(id: string, dto: UpdateJobTitleDto, companyId: string): Promise<{
        id: string;
        name: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        isActive: boolean;
        level: import(".prisma/client").$Enums.Role;
        isDirectManager: boolean;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
    getPermissions(id: string): Promise<({
        permission: {
            id: string;
            name: string;
            nameEn: string | null;
            code: string;
            category: string;
        };
    } & {
        id: string;
        createdAt: Date;
        jobTitleId: string;
        scope: import(".prisma/client").$Enums.PermissionScope;
        permissionId: string;
    })[]>;
    addPermission(id: string, body: {
        permissionId: string;
        scope?: string;
    }): Promise<{
        permission: {
            id: string;
            name: string;
            nameEn: string | null;
            createdAt: Date;
            updatedAt: Date;
            code: string;
            description: string | null;
            isActive: boolean;
            category: string;
            requiresPermission: string | null;
            sortOrder: number;
        };
    } & {
        id: string;
        createdAt: Date;
        jobTitleId: string;
        scope: import(".prisma/client").$Enums.PermissionScope;
        permissionId: string;
    }>;
    removePermission(id: string, permissionId: string): Promise<{
        message: string;
    }>;
}
