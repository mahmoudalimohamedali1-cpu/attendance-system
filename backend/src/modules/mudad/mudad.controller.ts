import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MudadService } from './mudad.service';

@ApiTags('مُدد - Mudad')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('mudad')
export class MudadController {
    constructor(private readonly mudadService: MudadService) { }

    @Post()
    @Roles('ADMIN', 'FINANCE')
    @ApiOperation({ summary: 'إنشاء سجل تقديم لمُدد' })
    create(@Body() dto: any, @Request() req: any) {
        return this.mudadService.createSubmission(dto, req.user.companyId, req.user.id);
    }

    @Get()
    @Roles('ADMIN', 'FINANCE', 'HR')
    @ApiOperation({ summary: 'جلب جميع تقديمات مُدد' })
    findAll(@Request() req: any, @Query('year') year?: string) {
        return this.mudadService.findAll(req.user.companyId, year ? parseInt(year) : undefined);
    }

    @Get('stats')
    @Roles('ADMIN', 'FINANCE')
    @ApiOperation({ summary: 'إحصائيات مُدد' })
    getStats(@Request() req: any, @Query('year') year?: string) {
        const y = year ? parseInt(year) : new Date().getFullYear();
        return this.mudadService.getStats(req.user.companyId, y);
    }

    @Get(':id')
    @Roles('ADMIN', 'FINANCE', 'HR')
    @ApiOperation({ summary: 'جلب تقديم محدد' })
    findOne(@Param('id') id: string, @Request() req: any) {
        return this.mudadService.findOne(id, req.user.companyId);
    }

    @Put(':id/status')
    @Roles('ADMIN', 'FINANCE')
    @ApiOperation({ summary: 'تحديث حالة التقديم' })
    updateStatus(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
        return this.mudadService.updateStatus(id, dto, req.user.companyId, req.user.id);
    }

    @Put(':id/attach-wps')
    @Roles('ADMIN', 'FINANCE')
    @ApiOperation({ summary: 'إرفاق ملف WPS' })
    attachWpsFile(@Param('id') id: string, @Body() dto: { fileUrl: string }, @Request() req: any) {
        return this.mudadService.attachWpsFile(id, dto.fileUrl, req.user.companyId);
    }

    @Delete(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'حذف تقديم (فقط إذا كان PENDING)' })
    delete(@Param('id') id: string, @Request() req: any) {
        return this.mudadService.delete(id, req.user.companyId);
    }
}
