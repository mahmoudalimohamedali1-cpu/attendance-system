import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { JobTitlesService, CreateJobTitleDto, UpdateJobTitleDto } from './job-titles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('job-titles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('job-titles')
export class JobTitlesController {
    constructor(private readonly jobTitlesService: JobTitlesService) { }

    @Post()
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'إنشاء درجة وظيفية جديدة' })
    @ApiResponse({ status: 201, description: 'تم إنشاء الدرجة بنجاح' })
    async create(@Body() dto: CreateJobTitleDto, @CurrentUser('companyId') companyId: string) {
        return this.jobTitlesService.create({ ...dto, companyId });
    }

    @Get()
    @ApiOperation({ summary: 'الحصول على كل الدرجات الوظيفية' })
    @ApiResponse({ status: 200, description: 'قائمة الدرجات الوظيفية' })
    async findAll(@CurrentUser('companyId') companyId: string) {
        return this.jobTitlesService.findAll(companyId);
    }

    @Get('direct-managers')
    @ApiOperation({ summary: 'الدرجات الوظيفية التي يمكن أن تكون مدير مباشر' })
    @ApiResponse({ status: 200, description: 'قائمة درجات المديرين' })
    async findDirectManagers(@CurrentUser('companyId') companyId: string) {
        return this.jobTitlesService.findDirectManagers(companyId);
    }

    @Get('direct-manager-users')
    @ApiOperation({ summary: 'المستخدمين الذين لديهم درجة مدير مباشر - لاستخدامها في dropdown' })
    @ApiResponse({ status: 200, description: 'قائمة المديرين المباشرين' })
    async findDirectManagerUsers(@CurrentUser('companyId') companyId: string) {
        return this.jobTitlesService.findDirectManagerUsers(companyId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'الحصول على درجة وظيفية بالـ ID' })
    @ApiResponse({ status: 200, description: 'تفاصيل الدرجة الوظيفية' })
    async findOne(@Param('id') id: string) {
        return this.jobTitlesService.findOne(id);
    }

    @Put(':id')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'تحديث درجة وظيفية' })
    @ApiResponse({ status: 200, description: 'تم التحديث بنجاح' })
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateJobTitleDto,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.jobTitlesService.update(id, { ...dto, companyId });
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'حذف درجة وظيفية' })
    @ApiResponse({ status: 200, description: 'تم الحذف بنجاح' })
    async remove(@Param('id') id: string) {
        return this.jobTitlesService.remove(id);
    }

    // ==================== صلاحيات الدرجة الوظيفية ====================

    @Get(':id/permissions')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'صلاحيات الدرجة الوظيفية' })
    @ApiResponse({ status: 200, description: 'قائمة الصلاحيات' })
    async getPermissions(@Param('id') id: string) {
        return this.jobTitlesService.getJobTitlePermissions(id);
    }

    @Post(':id/permissions')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'إضافة صلاحية للدرجة الوظيفية' })
    @ApiResponse({ status: 201, description: 'تم إضافة الصلاحية' })
    async addPermission(
        @Param('id') id: string,
        @Body() body: { permissionId: string; scope?: string },
    ) {
        return this.jobTitlesService.addJobTitlePermission(id, body.permissionId, body.scope);
    }

    @Delete(':id/permissions/:permissionId')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'حذف صلاحية من الدرجة الوظيفية' })
    @ApiResponse({ status: 200, description: 'تم حذف الصلاحية' })
    async removePermission(
        @Param('id') id: string,
        @Param('permissionId') permissionId: string,
    ) {
        return this.jobTitlesService.removeJobTitlePermission(id, permissionId);
    }
}
