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
var PermissionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
let PermissionsService = PermissionsService_1 = class PermissionsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(PermissionsService_1.name);
    }
    async getAllPermissions() {
        return this.prisma.permission.findMany({
            where: { isActive: true },
            orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
        });
    }
    async getPermissionsByCategory() {
        const permissions = await this.getAllPermissions();
        const grouped = {};
        for (const perm of permissions) {
            if (!grouped[perm.category]) {
                grouped[perm.category] = [];
            }
            grouped[perm.category].push(perm);
        }
        return grouped;
    }
    async getPermissionByCode(code) {
        return this.prisma.permission.findUnique({
            where: { code },
        });
    }
    async getUserPermissions(userId, companyId) {
        return this.prisma.userPermission.findMany({
            where: {
                userId,
                user: { companyId }
            },
            include: {
                permission: true,
                assignedEmployees: {
                    select: { employeeId: true },
                },
            },
        });
    }
    async getUserPermissionsByCode(userId, companyId, permissionCode) {
        return this.prisma.userPermission.findMany({
            where: {
                userId,
                permission: { code: permissionCode },
                user: { companyId }
            },
            include: {
                permission: true,
                assignedEmployees: {
                    select: { employeeId: true },
                },
            },
        });
    }
    async addUserPermission(userId, companyId, permissionCode, scope, options, performedById) {
        const permission = await this.getPermissionByCode(permissionCode);
        if (!permission) {
            throw new common_1.NotFoundException(`الصلاحية ${permissionCode} غير موجودة`);
        }
        const targetUser = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
            select: { firstName: true, lastName: true }
        });
        if (permission.requiresPermission) {
            const hasRequiredPermission = await this.hasPermission(userId, companyId, permission.requiresPermission);
            if (!hasRequiredPermission) {
                await this.addUserPermission(userId, companyId, permission.requiresPermission, scope, options, performedById);
            }
        }
        const userPermission = await this.prisma.userPermission.create({
            data: {
                userId,
                permissionId: permission.id,
                scope,
                branchId: options?.branchId,
                departmentId: options?.departmentId,
            },
        });
        if (scope === client_1.PermissionScope.CUSTOM && options?.employeeIds?.length) {
            await this.prisma.userPermissionEmployee.createMany({
                data: options.employeeIds.map(employeeId => ({
                    userPermissionId: userPermission.id,
                    employeeId,
                })),
                skipDuplicates: true,
            });
        }
        if (performedById) {
            let scopeDetails = '';
            if (scope === 'BRANCH' && options?.branchId) {
                const branch = await this.prisma.branch.findUnique({ where: { id: options.branchId }, select: { name: true } });
                scopeDetails = `فرع: ${branch?.name || options.branchId}`;
            }
            else if (scope === 'DEPARTMENT' && options?.departmentId) {
                const dept = await this.prisma.department.findUnique({ where: { id: options.departmentId }, select: { name: true } });
                scopeDetails = `قسم: ${dept?.name || options.departmentId}`;
            }
            else if (scope === 'CUSTOM' && options?.employeeIds?.length) {
                scopeDetails = `${options.employeeIds.length} موظف`;
            }
            await this.prisma.permissionAuditLog.create({
                data: {
                    companyId,
                    performedById,
                    targetUserId: userId,
                    targetUserName: `${targetUser?.firstName || ''} ${targetUser?.lastName || ''}`.trim() || 'غير معروف',
                    action: 'ADDED',
                    permissionCode,
                    permissionName: permission.name,
                    scope,
                    scopeDetails: scopeDetails || null,
                },
            });
        }
        return userPermission;
    }
    async removeUserPermission(userPermissionId, performedById) {
        const existingPermission = await this.prisma.userPermission.findUnique({
            where: { id: userPermissionId },
            include: {
                permission: true,
                user: { select: { id: true, firstName: true, lastName: true, companyId: true } },
            },
        });
        const result = await this.prisma.userPermission.delete({
            where: { id: userPermissionId },
        });
        if (performedById && existingPermission) {
            await this.prisma.permissionAuditLog.create({
                data: {
                    companyId: existingPermission.user.companyId,
                    performedById,
                    targetUserId: existingPermission.userId,
                    targetUserName: `${existingPermission.user.firstName} ${existingPermission.user.lastName}`.trim(),
                    action: 'REMOVED',
                    permissionCode: existingPermission.permission.code,
                    permissionName: existingPermission.permission.name,
                    scope: existingPermission.scope,
                },
            });
        }
        return result;
    }
    async updatePermissionEmployees(userPermissionId, employeeIds) {
        await this.prisma.userPermissionEmployee.deleteMany({
            where: { userPermissionId },
        });
        if (employeeIds.length > 0) {
            await this.prisma.userPermissionEmployee.createMany({
                data: employeeIds.map(employeeId => ({
                    userPermissionId,
                    employeeId,
                })),
            });
        }
    }
    async hasPermission(userId, companyId, permissionCode) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
            select: { isSuperAdmin: true, role: true },
        });
        if (user?.isSuperAdmin || user?.role === 'ADMIN') {
            return true;
        }
        const count = await this.prisma.userPermission.count({
            where: {
                userId,
                permission: { code: permissionCode },
                user: { companyId }
            },
        });
        return count > 0;
    }
    async canAccessEmployee(userId, companyId, permissionCode, targetEmployeeId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { isSuperAdmin: true, role: true },
        });
        if (user?.isSuperAdmin || user?.role === 'ADMIN') {
            return { hasAccess: true, reason: 'Super Admin' };
        }
        const permissions = await this.getUserPermissionsByCode(userId, companyId, permissionCode);
        if (permissions.length === 0) {
            return { hasAccess: false, reason: 'لا توجد صلاحية' };
        }
        for (const perm of permissions) {
            switch (perm.scope) {
                case client_1.PermissionScope.ALL:
                    return { hasAccess: true, reason: 'صلاحية على كل الموظفين' };
                case client_1.PermissionScope.SELF:
                    if (targetEmployeeId === userId) {
                        return { hasAccess: true, reason: 'صلاحية على نفسه' };
                    }
                    break;
                case client_1.PermissionScope.TEAM:
                    const isSubordinate = await this.isDirectSubordinate(userId, targetEmployeeId);
                    if (isSubordinate) {
                        return { hasAccess: true, reason: 'مرؤوس مباشر' };
                    }
                    break;
                case client_1.PermissionScope.BRANCH:
                    if (perm.branchId) {
                        const isInBranch = await this.isEmployeeInBranch(targetEmployeeId, perm.branchId);
                        if (isInBranch) {
                            return { hasAccess: true, reason: 'موظف في الفرع' };
                        }
                    }
                    break;
                case client_1.PermissionScope.DEPARTMENT:
                    if (perm.departmentId) {
                        const isInDept = await this.isEmployeeInDepartment(targetEmployeeId, perm.departmentId);
                        if (isInDept) {
                            return { hasAccess: true, reason: 'موظف في القسم' };
                        }
                    }
                    break;
                case client_1.PermissionScope.CUSTOM:
                    const isCustomAssigned = perm.assignedEmployees?.some(e => e.employeeId === targetEmployeeId);
                    if (isCustomAssigned) {
                        return { hasAccess: true, reason: 'موظف معين' };
                    }
                    break;
            }
        }
        return { hasAccess: false, reason: 'الموظف خارج نطاق الصلاحية' };
    }
    async getAccessibleEmployeeIds(userId, companyId, permissionCode) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { isSuperAdmin: true, role: true },
        });
        if (user?.isSuperAdmin || user?.role === 'ADMIN') {
            const allEmployees = await this.prisma.user.findMany({
                where: { companyId },
                select: { id: true },
            });
            return allEmployees.map(e => e.id);
        }
        const employeeIds = new Set();
        const directSubordinates = await this.getAllSubordinates(userId);
        directSubordinates.forEach(id => employeeIds.add(id));
        const permissions = await this.getUserPermissionsByCode(userId, companyId, permissionCode);
        for (const perm of permissions) {
            switch (perm.scope) {
                case client_1.PermissionScope.ALL:
                    const allEmployees = await this.prisma.user.findMany({
                        where: { companyId },
                        select: { id: true },
                    });
                    allEmployees.forEach(e => employeeIds.add(e.id));
                    break;
                case client_1.PermissionScope.SELF:
                    employeeIds.add(userId);
                    break;
                case client_1.PermissionScope.TEAM:
                    break;
                case client_1.PermissionScope.BRANCH:
                    if (perm.branchId) {
                        const branchEmployees = await this.getBranchEmployees(perm.branchId);
                        branchEmployees.forEach(id => employeeIds.add(id));
                    }
                    break;
                case client_1.PermissionScope.DEPARTMENT:
                    if (perm.departmentId) {
                        const deptEmployees = await this.getDepartmentEmployees(perm.departmentId);
                        deptEmployees.forEach(id => employeeIds.add(id));
                    }
                    break;
                case client_1.PermissionScope.CUSTOM:
                    perm.assignedEmployees?.forEach(e => employeeIds.add(e.employeeId));
                    break;
            }
        }
        return Array.from(employeeIds);
    }
    async getAllSubordinates(managerId) {
        const allSubordinates = [];
        const queue = [managerId];
        const visited = new Set();
        while (queue.length > 0) {
            const currentId = queue.shift();
            if (visited.has(currentId))
                continue;
            visited.add(currentId);
            const directReports = await this.prisma.user.findMany({
                where: { managerId: currentId },
                select: { id: true },
            });
            for (const report of directReports) {
                allSubordinates.push(report.id);
                queue.push(report.id);
            }
        }
        return allSubordinates;
    }
    async isDirectSubordinate(managerId, employeeId) {
        const employee = await this.prisma.user.findUnique({
            where: { id: employeeId },
            select: { managerId: true },
        });
        return employee?.managerId === managerId;
    }
    async getDirectSubordinates(managerId) {
        const subordinates = await this.prisma.user.findMany({
            where: { managerId },
            select: { id: true },
        });
        return subordinates.map(s => s.id);
    }
    async isEmployeeInBranch(employeeId, branchId) {
        const employee = await this.prisma.user.findUnique({
            where: { id: employeeId },
            select: { branchId: true },
        });
        return employee?.branchId === branchId;
    }
    async getBranchEmployees(branchId) {
        const employees = await this.prisma.user.findMany({
            where: { branchId },
            select: { id: true },
        });
        return employees.map(e => e.id);
    }
    async isEmployeeInDepartment(employeeId, departmentId) {
        const employee = await this.prisma.user.findUnique({
            where: { id: employeeId },
            select: { departmentId: true },
        });
        return employee?.departmentId === departmentId;
    }
    async getDepartmentEmployees(departmentId) {
        const employees = await this.prisma.user.findMany({
            where: { departmentId },
            select: { id: true },
        });
        return employees.map(e => e.id);
    }
    async updateUserPermissionsBulk(userId, companyId, permissions) {
        await this.prisma.userPermission.deleteMany({
            where: { userId },
        });
        for (const perm of permissions) {
            for (const scopeConfig of perm.scopes) {
                await this.addUserPermission(userId, companyId, perm.permissionCode, scopeConfig.scope, {
                    branchId: scopeConfig.branchId,
                    departmentId: scopeConfig.departmentId,
                    employeeIds: scopeConfig.employeeIds,
                });
            }
        }
        return this.getUserPermissions(userId, companyId);
    }
};
exports.PermissionsService = PermissionsService;
exports.PermissionsService = PermissionsService = PermissionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PermissionsService);
//# sourceMappingURL=permissions.service.js.map