import { Controller, Get, Post, Body, Param, Patch, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PoliciesService } from './policies.service';
import { CreatePolicyDto, PolicyType } from './dto/create-policy.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Policies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('policies')
export class PoliciesController {
    constructor(private readonly service: PoliciesService) { }

    @Post()
    @Roles('ADMIN')
    @ApiOperation({ summary: 'إنشاء سياسة جديدة' })
    create(@Body() dto: CreatePolicyDto, @CurrentUser('id') userId: string, @CurrentUser('companyId') companyId: string) {
        return this.service.create(dto, companyId, userId);
    }

    @Get()
    @ApiOperation({ summary: 'عرض جميع السياسات النشطة' })
    @ApiQuery({ name: 'type', required: false, enum: PolicyType })
    findAll(@CurrentUser('companyId') companyId: string, @Query('type') type?: PolicyType) {
        return this.service.findAll(companyId, type);
    }

    @Get(':id')
    @ApiOperation({ summary: 'تفاصيل سياسة معينة' })
    findOne(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
        return this.service.findOne(id, companyId);
    }

    @Get('resolve/:employeeId')
    @ApiOperation({ summary: 'الحصول على السياسة المطبقة لموظف' })
    resolve(
        @Param('employeeId') employeeId: string,
        @CurrentUser('companyId') companyId: string,
        @Query('type') type: PolicyType,
        @Query('date') date?: string
    ) {
        return this.service.resolvePolicy(type, employeeId, companyId, date ? new Date(date) : undefined);
    }

    @Patch(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'تحديث سياسة' })
    update(@Param('id') id: string, @CurrentUser('companyId') companyId: string, @Body() dto: Partial<CreatePolicyDto>) {
        return this.service.update(id, companyId, dto);
    }

    @Patch(':id/toggle-active')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'تفعيل/تعطيل سياسة' })
    toggleActive(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
        return this.service.toggleActive(id, companyId);
    }

    @Delete(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'حذف سياسة' })
    remove(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
        return this.service.delete(id, companyId);
    }

    @Post(':id/rules')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'إضافة قاعدة لسياسة' })
    addRule(@Param('id') id: string, @CurrentUser('companyId') companyId: string, @Body() ruleData: any) {
        return this.service.addRule(id, companyId, ruleData);
    }

    @Delete('rules/:ruleId')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'حذف قاعدة سياسة' })
    deleteRule(@Param('ruleId') ruleId: string, @CurrentUser('companyId') companyId: string) {
        return this.service.deleteRule(ruleId, companyId);
    }
}
