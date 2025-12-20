import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PermissionScope, UserPermission, Permission } from '@prisma/client';

export interface UserPermissionWithDetails extends UserPermission {
    permission: Permission;
    assignedEmployees?: { employeeId: string }[];
}

export interface CanAccessResult {
    hasAccess: boolean;
    reason?: string;
}

@Injectable()
export class PermissionsService {
    private readonly logger = new Logger(PermissionsService.name);

    constructor(private prisma: PrismaService) { }

    // ==================== الصلاحيات الأساسية ====================

    /**
     * الحصول على كل الصلاحيات المتاحة
     */
    async getAllPermissions() {
        return this.prisma.permission.findMany({
            where: { isActive: true },
            orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
        });
    }

    /**
     * الصلاحيات مجمّعة بالتصنيف
     */
    async getPermissionsByCategory() {
        const permissions = await this.getAllPermissions();

        const grouped: Record<string, Permission[]> = {};
        for (const perm of permissions) {
            if (!grouped[perm.category]) {
                grouped[perm.category] = [];
            }
            grouped[perm.category].push(perm);
        }

        return grouped;
    }

    /**
     * الحصول على صلاحية بالكود
     */
    async getPermissionByCode(code: string) {
        return this.prisma.permission.findUnique({
            where: { code },
        });
    }

    // ==================== صلاحيات المستخدم ====================

    /**
     * الحصول على كل صلاحيات مستخدم معين
     */
    async getUserPermissions(userId: string, companyId: string): Promise<UserPermissionWithDetails[]> {
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
        }) as Promise<UserPermissionWithDetails[]>;
    }

    /**
     * الحصول على صلاحيات مستخدم لكود معين
     */
    async getUserPermissionsByCode(userId: string, companyId: string, permissionCode: string): Promise<UserPermissionWithDetails[]> {
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
        }) as Promise<UserPermissionWithDetails[]>;
    }

    /**
     * إضافة صلاحية لمستخدم
     */
    async addUserPermission(
        userId: string,
        companyId: string,
        permissionCode: string,
        scope: PermissionScope,
        options?: {
            branchId?: string;
            departmentId?: string;
            employeeIds?: string[];
        },
        performedById?: string  // من قام بالإجراء (للتدقيق)
    ) {
        // التحقق من وجود الصلاحية
        const permission = await this.getPermissionByCode(permissionCode);
        if (!permission) {
            throw new NotFoundException(`الصلاحية ${permissionCode} غير موجودة`);
        }

        // جلب بيانات المستخدم المستهدف للـ audit log
        const targetUser = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
            select: { firstName: true, lastName: true }
        });

        // التحقق من الصلاحية المطلوبة مسبقاً
        if (permission.requiresPermission) {
            const hasRequiredPermission = await this.hasPermission(userId, companyId, permission.requiresPermission);
            if (!hasRequiredPermission) {
                // إضافة الصلاحية المطلوبة تلقائياً
                await this.addUserPermission(userId, companyId, permission.requiresPermission, scope, options, performedById);
            }
        }

        // إنشاء صلاحية المستخدم
        const userPermission = await this.prisma.userPermission.create({
            data: {
                userId,
                permissionId: permission.id,
                scope,
                branchId: options?.branchId,
                departmentId: options?.departmentId,
            },
        });

        // إضافة الموظفين المحددين إذا كان النطاق CUSTOM
        if (scope === PermissionScope.CUSTOM && options?.employeeIds?.length) {
            await this.prisma.userPermissionEmployee.createMany({
                data: options.employeeIds.map(employeeId => ({
                    userPermissionId: userPermission.id,
                    employeeId,
                })),
                skipDuplicates: true,
            });
        }

        // تسجيل في سجل التدقيق
        if (performedById) {
            let scopeDetails = '';
            if (scope === 'BRANCH' && options?.branchId) {
                const branch = await this.prisma.branch.findUnique({ where: { id: options.branchId }, select: { name: true } });
                scopeDetails = `فرع: ${branch?.name || options.branchId}`;
            } else if (scope === 'DEPARTMENT' && options?.departmentId) {
                const dept = await this.prisma.department.findUnique({ where: { id: options.departmentId }, select: { name: true } });
                scopeDetails = `قسم: ${dept?.name || options.departmentId}`;
            } else if (scope === 'CUSTOM' && options?.employeeIds?.length) {
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

    /**
     * حذف صلاحية من مستخدم
     */
    async removeUserPermission(userPermissionId: string, performedById?: string) {
        // جلب تفاصيل الصلاحية قبل الحذف للـ audit log
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

        // تسجيل في سجل التدقيق
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

    /**
     * تحديث الموظفين المعينين لصلاحية
     */
    async updatePermissionEmployees(userPermissionId: string, employeeIds: string[]) {
        // حذف الموظفين الحاليين
        await this.prisma.userPermissionEmployee.deleteMany({
            where: { userPermissionId },
        });

        // إضافة الموظفين الجدد
        if (employeeIds.length > 0) {
            await this.prisma.userPermissionEmployee.createMany({
                data: employeeIds.map(employeeId => ({
                    userPermissionId,
                    employeeId,
                })),
            });
        }
    }

    // ==================== التحقق من الصلاحيات ====================

    /**
     * هل المستخدم لديه صلاحية معينة (بأي نطاق)
     */
    async hasPermission(userId: string, companyId: string, permissionCode: string): Promise<boolean> {
        // التحقق من Super Admin
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

    /**
     * هل المستخدم يمكنه الوصول لموظف معين بصلاحية معينة
     */
    async canAccessEmployee(
        userId: string,
        companyId: string,
        permissionCode: string,
        targetEmployeeId: string
    ): Promise<CanAccessResult> {
        // 1. Super Admin check
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { isSuperAdmin: true, role: true },
        });

        if (user?.isSuperAdmin || user?.role === 'ADMIN') {
            return { hasAccess: true, reason: 'Super Admin' };
        }

        // 2. الحصول على صلاحيات المستخدم
        const permissions = await this.getUserPermissionsByCode(userId, companyId, permissionCode);
        if (permissions.length === 0) {
            return { hasAccess: false, reason: 'لا توجد صلاحية' };
        }

        // 3. التحقق من كل نطاق
        for (const perm of permissions) {
            switch (perm.scope) {
                case PermissionScope.ALL:
                    return { hasAccess: true, reason: 'صلاحية على كل الموظفين' };

                case PermissionScope.SELF:
                    if (targetEmployeeId === userId) {
                        return { hasAccess: true, reason: 'صلاحية على نفسه' };
                    }
                    break;

                case PermissionScope.TEAM:
                    const isSubordinate = await this.isDirectSubordinate(userId, targetEmployeeId);
                    if (isSubordinate) {
                        return { hasAccess: true, reason: 'مرؤوس مباشر' };
                    }
                    break;

                case PermissionScope.BRANCH:
                    if (perm.branchId) {
                        const isInBranch = await this.isEmployeeInBranch(targetEmployeeId, perm.branchId);
                        if (isInBranch) {
                            return { hasAccess: true, reason: 'موظف في الفرع' };
                        }
                    }
                    break;

                case PermissionScope.DEPARTMENT:
                    if (perm.departmentId) {
                        const isInDept = await this.isEmployeeInDepartment(targetEmployeeId, perm.departmentId);
                        if (isInDept) {
                            return { hasAccess: true, reason: 'موظف في القسم' };
                        }
                    }
                    break;

                case PermissionScope.CUSTOM:
                    const isCustomAssigned = perm.assignedEmployees?.some(
                        e => e.employeeId === targetEmployeeId
                    );
                    if (isCustomAssigned) {
                        return { hasAccess: true, reason: 'موظف معين' };
                    }
                    break;
            }
        }

        return { hasAccess: false, reason: 'الموظف خارج نطاق الصلاحية' };
    }

    /**
     * الحصول على قائمة الموظفين الذين يمكن للمستخدم الوصول إليهم
     * المدير المباشر له كل الصلاحيات تلقائياً على موظفيه (من الهيكل الإداري)
     */
    async getAccessibleEmployeeIds(
        userId: string,
        companyId: string,
        permissionCode: string
    ): Promise<string[]> {
        // Super Admin check
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { isSuperAdmin: true, role: true },
        });

        if (user?.isSuperAdmin || user?.role === 'ADMIN') {
            // إرجاع كل الموظفين
            const allEmployees = await this.prisma.user.findMany({
                where: { companyId },
                select: { id: true },
            });
            return allEmployees.map(e => e.id);
        }

        const employeeIds = new Set<string>();

        // ✅ أولاً: المدير المباشر له كل الصلاحيات تلقائياً على الموظفين التابعين له
        // هذا من الهيكل الإداري - لا يحتاج صلاحيات يدوية
        const directSubordinates = await this.getAllSubordinates(userId);
        directSubordinates.forEach(id => employeeIds.add(id));

        // ✅ ثانياً: الصلاحيات الإضافية (للأشخاص غير المدير المباشر مثل HR)
        const permissions = await this.getUserPermissionsByCode(userId, companyId, permissionCode);

        for (const perm of permissions) {
            switch (perm.scope) {
                case PermissionScope.ALL:
                    const allEmployees = await this.prisma.user.findMany({
                        where: { companyId },
                        select: { id: true },
                    });
                    allEmployees.forEach(e => employeeIds.add(e.id));
                    break;

                case PermissionScope.SELF:
                    employeeIds.add(userId);
                    break;

                case PermissionScope.TEAM:
                    // تم إضافتهم تلقائياً أعلاه
                    break;

                case PermissionScope.BRANCH:
                    if (perm.branchId) {
                        const branchEmployees = await this.getBranchEmployees(perm.branchId);
                        branchEmployees.forEach(id => employeeIds.add(id));
                    }
                    break;

                case PermissionScope.DEPARTMENT:
                    if (perm.departmentId) {
                        const deptEmployees = await this.getDepartmentEmployees(perm.departmentId);
                        deptEmployees.forEach(id => employeeIds.add(id));
                    }
                    break;

                case PermissionScope.CUSTOM:
                    perm.assignedEmployees?.forEach(e => employeeIds.add(e.employeeId));
                    break;
            }
        }

        return Array.from(employeeIds);
    }

    /**
     * الحصول على كل الموظفين التابعين (المباشرين وموظفي الموظفين)
     */
    private async getAllSubordinates(managerId: string): Promise<string[]> {
        const allSubordinates: string[] = [];
        const queue = [managerId];
        const visited = new Set<string>();

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (visited.has(currentId)) continue;
            visited.add(currentId);

            const directReports = await this.prisma.user.findMany({
                where: { managerId: currentId },
                select: { id: true },
            });

            for (const report of directReports) {
                allSubordinates.push(report.id);
                queue.push(report.id); // للبحث في موظفيهم أيضاً
            }
        }

        return allSubordinates;
    }

    // ==================== Helper Methods ====================

    private async isDirectSubordinate(managerId: string, employeeId: string): Promise<boolean> {
        const employee = await this.prisma.user.findUnique({
            where: { id: employeeId },
            select: { managerId: true },
        });
        return employee?.managerId === managerId;
    }

    private async getDirectSubordinates(managerId: string): Promise<string[]> {
        const subordinates = await this.prisma.user.findMany({
            where: { managerId },
            select: { id: true },
        });
        return subordinates.map(s => s.id);
    }

    private async isEmployeeInBranch(employeeId: string, branchId: string): Promise<boolean> {
        const employee = await this.prisma.user.findUnique({
            where: { id: employeeId },
            select: { branchId: true },
        });
        return employee?.branchId === branchId;
    }

    private async getBranchEmployees(branchId: string): Promise<string[]> {
        const employees = await this.prisma.user.findMany({
            where: { branchId },
            select: { id: true },
        });
        return employees.map(e => e.id);
    }

    private async isEmployeeInDepartment(employeeId: string, departmentId: string): Promise<boolean> {
        const employee = await this.prisma.user.findUnique({
            where: { id: employeeId },
            select: { departmentId: true },
        });
        return employee?.departmentId === departmentId;
    }

    private async getDepartmentEmployees(departmentId: string): Promise<string[]> {
        const employees = await this.prisma.user.findMany({
            where: { departmentId },
            select: { id: true },
        });
        return employees.map(e => e.id);
    }

    // ==================== تحديث صلاحيات مستخدم بالكامل ====================

    /**
     * تحديث كل صلاحيات مستخدم (bulk update)
     */
    async updateUserPermissionsBulk(
        userId: string,
        companyId: string,
        permissions: Array<{
            permissionCode: string;
            scopes: Array<{
                scope: PermissionScope;
                branchId?: string;
                departmentId?: string;
                employeeIds?: string[];
            }>;
        }>
    ) {
        // حذف كل الصلاحيات الحالية
        await this.prisma.userPermission.deleteMany({
            where: { userId },
        });

        // إضافة الصلاحيات الجديدة
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
}
