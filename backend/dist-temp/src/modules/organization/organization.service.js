"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let OrganizationService = class OrganizationService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getOrgStructure(companyId) {
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
                        employees: true,
                    },
                },
            },
            orderBy: [
                { role: 'asc' },
                { firstName: 'asc' },
            ],
        });
        if (employees.length === 0) {
            return null;
        }
        const employeeMap = new Map();
        employees.forEach(emp => employeeMap.set(emp.id, emp));
        const rootEmployees = employees.filter(emp => !emp.managerId || !employeeMap.has(emp.managerId));
        const buildNode = (employee) => {
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
                status: 'online',
                employeesCount: employee._count.employees,
                children: children.length > 0 ? children.map(buildNode) : undefined,
            };
        };
        if (rootEmployees.length === 1) {
            return buildNode(rootEmployees[0]);
        }
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
    async getDepartments(companyId) {
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
    async getBranches(companyId) {
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
    async getOrgStats(companyId) {
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
    getRoleLabel(role) {
        const labels = {
            ADMIN: 'مدير النظام',
            MANAGER: 'مدير',
            EMPLOYEE: 'موظف',
            HR: 'الموارد البشرية',
        };
        return labels[role] || role;
    }
};
exports.OrganizationService = OrganizationService;
exports.OrganizationService = OrganizationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OrganizationService);
//# sourceMappingURL=organization.service.js.map