import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationService, OrgNode } from './organization.service';

@ApiTags('Organization')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organization')
export class OrganizationController {
    constructor(private readonly organizationService: OrganizationService) { }

    @Get('structure')
    @ApiOperation({ summary: 'الحصول على الهيكل التنظيمي' })
    @ApiResponse({ status: 200, description: 'شجرة الهيكل التنظيمي' })
    async getOrgStructure(@Request() req: any): Promise<OrgNode | null> {
        return this.organizationService.getOrgStructure(req.user.companyId);
    }

    @Get('departments')
    @ApiOperation({ summary: 'الحصول على قائمة الأقسام' })
    @ApiResponse({ status: 200, description: 'قائمة الأقسام مع إحصائياتها' })
    async getDepartments(@Request() req: any) {
        return this.organizationService.getDepartments(req.user.companyId);
    }

    @Get('branches')
    @ApiOperation({ summary: 'الحصول على قائمة الفروع' })
    @ApiResponse({ status: 200, description: 'قائمة الفروع مع إحصائياتها' })
    async getBranches(@Request() req: any) {
        return this.organizationService.getBranches(req.user.companyId);
    }

    @Get('stats')
    @ApiOperation({ summary: 'الحصول على إحصائيات الهيكل التنظيمي' })
    @ApiResponse({ status: 200, description: 'ملخص إحصائيات المنظمة' })
    async getOrgStats(@Request() req: any) {
        return this.organizationService.getOrgStats(req.user.companyId);
    }
}
