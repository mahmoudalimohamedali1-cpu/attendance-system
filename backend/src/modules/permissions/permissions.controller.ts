import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    UseGuards,
    Request,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PermissionsService } from './permissions.service';
import {
    AddUserPermissionDto,
    UpdatePermissionEmployeesDto,
    BulkUpdatePermissionsDto,
    UpdateManagerDto,
} from './dto/permissions.dto';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('Permissions - الصلاحيات')
@Controller('permissions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PermissionsController {
    constructor(
        private permissionsService: PermissionsService,
        private prisma: PrismaService,
    ) { }

    // ==================== الصلاحيات الأساسية ====================

    @Get()
    @ApiOperation({ summary: 'قائمة كل الصلاحيات المتاحة' })
    @ApiResponse({ status: 200, description: 'قائمة الصلاحيات' })
    async getAllPermissions() {
        return this.permissionsService.getAllPermissions();
    }

    @Get('categories')
    @ApiOperation({ summary: 'الصلاحيات مجمّعة بالتصنيف' })
    @ApiResponse({ status: 200, description: 'الصلاحيات مجمّعة' })
    async getPermissionsByCategory() {
        return this.permissionsService.getPermissionsByCategory();
    }

    // ==================== صلاحياتي ====================

    @Get('my')
    @ApiOperation({ summary: 'صلاحياتي الحالية' })
    @ApiResponse({ status: 200, description: 'صلاحيات المستخدم الحالي' })
    async getMyPermissions(@CurrentUser('companyId') companyId: string, @Request() req: any) {
        return this.permissionsService.getUserPermissions(req.user.id, companyId);
    }

    // ==================== إدارة صلاحيات المستخدمين (Admin Only) ====================

    @Get('users/:userId')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'صلاحيات مستخدم معين' })
    @ApiResponse({ status: 200, description: 'صلاحيات المستخدم' })
    async getUserPermissions(@Param('userId') userId: string, @CurrentUser('companyId') companyId: string) {
        return this.permissionsService.getUserPermissions(userId, companyId);
    }

    @Post('users/:userId')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'إضافة صلاحية لمستخدم' })
    @ApiResponse({ status: 201, description: 'تمت الإضافة' })
    async addUserPermission(
        @Param('userId') userId: string,
        @CurrentUser('companyId') companyId: string,
        @Body() dto: AddUserPermissionDto,
        @Request() req: any,
    ) {
        return this.permissionsService.addUserPermission(
            userId,
            companyId,
            dto.permissionCode,
            dto.scope,
            {
                branchId: dto.branchId,
                departmentId: dto.departmentId,
                employeeIds: dto.employeeIds,
            },
            req.user.id,  // من قام بالإجراء
        );
    }

    @Delete('users/:userId/:userPermissionId')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'حذف صلاحية من مستخدم' })
    @ApiResponse({ status: 200, description: 'تم الحذف' })
    async removeUserPermission(
        @Param('userId') userId: string,
        @Param('userPermissionId') userPermissionId: string,
        @Request() req: any,
    ) {
        return this.permissionsService.removeUserPermission(userPermissionId, req.user.id);
    }

    // ==================== سجل التدقيق ====================

    @Get('audit')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'سجل تدقيق الصلاحيات' })
    @ApiResponse({ status: 200, description: 'سجل التدقيق' })
    async getAuditLog(@CurrentUser('companyId') companyId: string) {
        return this.prisma.permissionAuditLog.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }

    @Put('users/:userId/bulk')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'تحديث كل صلاحيات مستخدم' })
    @ApiResponse({ status: 200, description: 'تم التحديث' })
    async updateUserPermissionsBulk(
        @Param('userId') userId: string,
        @CurrentUser('companyId') companyId: string,
        @Body() dto: BulkUpdatePermissionsDto,
    ) {
        return this.permissionsService.updateUserPermissionsBulk(userId, companyId, dto.permissions);
    }

    @Put('users/:userId/permissions/:userPermissionId/employees')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'تحديث الموظفين المعينين لصلاحية' })
    @ApiResponse({ status: 200, description: 'تم التحديث' })
    async updatePermissionEmployees(
        @Param('userId') userId: string,
        @Param('userPermissionId') userPermissionId: string,
        @Body() dto: UpdatePermissionEmployeesDto,
    ) {
        // Here we don't strictly need companyId for the service call, 
        // but the service itself might benefit from validation if we updated it.
        // For now, let's keep it as is or update service if needed.
        return this.permissionsService.updatePermissionEmployees(userPermissionId, dto.employeeIds);
    }

    // ==================== الهيكل الإداري ====================

    @Put('users/:userId/manager')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'تعيين المدير المباشر لموظف' })
    @ApiResponse({ status: 200, description: 'تم التعيين' })
    async updateManager(
        @Param('userId') userId: string,
        @Body() dto: UpdateManagerDto,
    ) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { managerId: dto.managerId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                managerId: true,
                manager: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
    }

    @Get('users/:userId/subordinates')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'MANAGER')
    @ApiOperation({ summary: 'المرؤوسين المباشرين لموظف' })
    @ApiResponse({ status: 200, description: 'قائمة المرؤوسين' })
    async getSubordinates(@Param('userId') userId: string, @CurrentUser('companyId') companyId: string) {
        return this.prisma.user.findMany({
            where: { managerId: userId, companyId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                jobTitle: true,
                department: { select: { name: true } },
                branch: { select: { name: true } },
            },
        });
    }

    @Get('users/:userId/org-tree')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'الشجرة الإدارية لموظف' })
    @ApiResponse({ status: 200, description: 'الشجرة الإدارية' })
    async getOrgTree(@Param('userId') userId: string, @CurrentUser('companyId') companyId: string) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                jobTitle: true,
                manager: {
                    select: { id: true, firstName: true, lastName: true, jobTitle: true },
                },
                employees: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        jobTitle: true,
                        employees: {
                            select: { id: true, firstName: true, lastName: true, jobTitle: true },
                        },
                    },
                },
            },
        });

        return user;
    }

    // ==================== التحقق من الصلاحية ====================

    @Get('check/:permissionCode/:employeeId')
    @ApiOperation({ summary: 'التحقق من صلاحية على موظف معين' })
    @ApiResponse({ status: 200, description: 'نتيجة التحقق' })
    async checkPermission(
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
        @Param('permissionCode') permissionCode: string,
        @Param('employeeId') employeeId: string,
    ) {
        return this.permissionsService.canAccessEmployee(userId, companyId, permissionCode, employeeId);
    }

    @Get('accessible-employees/:permissionCode')
    @ApiOperation({ summary: 'الموظفين الذين يمكنني الوصول إليهم بصلاحية معينة' })
    @ApiResponse({ status: 200, description: 'قائمة معرفات الموظفين' })
    async getAccessibleEmployees(
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
        @Param('permissionCode') permissionCode: string,
    ) {
        return this.permissionsService.getAccessibleEmployeeIds(userId, companyId, permissionCode);
    }
}
