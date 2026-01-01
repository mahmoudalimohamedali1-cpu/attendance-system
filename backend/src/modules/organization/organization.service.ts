import { Injectable } from '@nestjs/common';
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

@Injectable()
export class OrganizationService {
    constructor(private prisma: PrismaService) { }

    /**
     * Get the full organization structure as a hierarchical tree
     */
    async getOrgStructure(companyId: string): Promise<OrgNode | null> {
        // Get all active employees with their relations
        const employees = await this.prisma.user.findMany({
            where: {
                companyId,
                status: 'ACTIVE',
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                avatar: true,
                employeeCode: true,
                jobTitle: true,
                managerId: true,
                role: true,
                department: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                branch: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: {
                        employees: true, // Count of direct reports
                    },
                },
            },
            orderBy: [
                { role: 'asc' }, // ADMIN first, then MANAGER, then EMPLOYEE
                { firstName: 'asc' },
            ],
        });

        if (employees.length === 0) {
            return null;
        }

        // Build a map of id -> employee
        const employeeMap = new Map<string, typeof employees[0]>();
        employees.forEach(emp => employeeMap.set(emp.id, emp));

        // Find root nodes (employees without a manager or whose manager is not in the company)
        const rootEmployees = employees.filter(
            emp => !emp.managerId || !employeeMap.has(emp.managerId)
        );

        // Build tree recursively
        const buildNode = (employee: typeof employees[0]): OrgNode => {
            const children = employees.filter(emp => emp.managerId === employee.id);

            return {
                id: employee.id,
                name: `${employee.firstName} ${employee.lastName}`,
                jobTitle: employee.jobTitle || this.getRoleLabel(employee.role),
                department: employee.department?.name,
                branch: employee.branch?.name,
                avatar: employee.avatar || undefined,
                email: employee.email || undefined,
                phone: employee.phone || undefined,
                employeeCode: employee.employeeCode || undefined,
                status: 'online', // TODO: Could be based on last attendance or activity
                employeesCount: employee._count.employees,
                children: children.length > 0 ? children.map(buildNode) : undefined,
            };
        };

        // If there's only one root, return it directly
        // Otherwise, create a virtual root containing all roots
        if (rootEmployees.length === 1) {
            return buildNode(rootEmployees[0]);
        }

        // Multiple roots - create a virtual company node
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
            select: { name: true, logo: true },
        });

        return {
            id: 'company-root',
            name: company?.name || 'الشركة',
            jobTitle: 'الشركة',
            avatar: company?.logo || undefined,
            status: 'online',
            children: rootEmployees.map(buildNode),
        };
    }

    /**
     * Get departments list for filtering
     */
    async getDepartments(companyId: string) {
        return this.prisma.department.findMany({
            where: { companyId },
            select: {
                id: true,
                name: true,
                nameEn: true,
                branch: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: {
                        users: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
    }

    /**
     * Get branches list for filtering
     */
    async getBranches(companyId: string) {
        return this.prisma.branch.findMany({
            where: { companyId, isActive: true },
            select: {
                id: true,
                name: true,
                nameEn: true,
                _count: {
                    select: {
                        users: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
    }

    /**
     * Get org stats summary
     */
    async getOrgStats(companyId: string) {
        const [totalEmployees, departments, branches, managers] = await Promise.all([
            this.prisma.user.count({
                where: { companyId, status: 'ACTIVE' },
            }),
            this.prisma.department.count({
                where: { companyId },
            }),
            this.prisma.branch.count({
                where: { companyId, isActive: true },
            }),
            this.prisma.user.count({
                where: {
                    companyId,
                    status: 'ACTIVE',
                    role: { in: ['ADMIN', 'MANAGER'] },
                },
            }),
        ]);

        return {
            totalEmployees,
            departments,
            branches,
            managers,
        };
    }

    private getRoleLabel(role: string): string {
        const labels: Record<string, string> = {
            ADMIN: 'مدير النظام',
            MANAGER: 'مدير',
            EMPLOYEE: 'موظف',
            HR: 'الموارد البشرية',
        };
        return labels[role] || role;
    }
}
