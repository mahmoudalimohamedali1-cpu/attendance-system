import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { MudadService } from './mudad.service';

@ApiTags('مُدد - Mudad')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('mudad')
export class MudadController {
    constructor(private readonly mudadService: MudadService) { }

    @Post()
    @RequirePermission('MUDAD_PREPARE')
    @ApiOperation({ summary: 'إنشاء سجل تقديم لمُدد' })
    create(@Body() dto: any, @Request() req: any) {
        return this.mudadService.createSubmission(dto, req.user.companyId, req.user.id);
    }

    @Get()
    @RequirePermission('MUDAD_VIEW')
    @ApiOperation({ summary: 'جلب جميع تقديمات مُدد' })
    findAll(@Request() req: any, @Query('year') year?: string) {
        return this.mudadService.findAll(req.user.companyId, year ? parseInt(year) : undefined);
    }

    @Get('stats')
    @RequirePermission('MUDAD_VIEW')
    @ApiOperation({ summary: 'إحصائيات مُدد' })
    getStats(@Request() req: any, @Query('year') year?: string) {
        const y = year ? parseInt(year) : new Date().getFullYear();
        return this.mudadService.getStats(req.user.companyId, y);
    }

    @Get(':id')
    @RequirePermission('MUDAD_VIEW')
    @ApiOperation({ summary: 'جلب تقديم محدد' })
    findOne(@Param('id') id: string, @Request() req: any) {
        return this.mudadService.findOne(id, req.user.companyId);
    }

    @Put(':id/status')
    @RequirePermission('MUDAD_SUBMIT')
    @ApiOperation({ summary: 'تحديث حالة التقديم (تجهيز/رفع)' })
    updateStatus(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
        return this.mudadService.updateStatus(id, dto, req.user.companyId, req.user.id);
    }

    @Put(':id/accept')
    @RequirePermission('MUDAD_ACCEPT')
    @ApiOperation({ summary: 'قبول تقديم مُدد' })
    acceptSubmission(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
        return this.mudadService.updateStatus(id, { ...dto, status: 'ACCEPTED' }, req.user.companyId, req.user.id);
    }

    @Put(':id/reject')
    @RequirePermission('MUDAD_ACCEPT')
    @ApiOperation({ summary: 'رفض تقديم مُدد' })
    rejectSubmission(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
        return this.mudadService.updateStatus(id, { ...dto, status: 'REJECTED' }, req.user.companyId, req.user.id);
    }

    @Put(':id/attach-wps')
    @RequirePermission('MUDAD_PREPARE')
    @ApiOperation({ summary: 'إرفاق ملف WPS' })
    attachWpsFile(@Param('id') id: string, @Body() dto: { fileUrl: string; fileHashSha256?: string }, @Request() req: any) {
        return this.mudadService.attachWpsFile(id, dto.fileUrl, req.user.companyId, dto.fileHashSha256, req.user.id);
    }

    @Delete(':id')
    @RequirePermission('MUDAD_ACCEPT')
    @ApiOperation({ summary: 'حذف تقديم (فقط إذا كان PENDING)' })
    delete(@Param('id') id: string, @Request() req: any) {
        return this.mudadService.delete(id, req.user.companyId);
    }
}

