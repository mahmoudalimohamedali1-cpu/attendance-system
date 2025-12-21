import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { WpsTrackingService } from './wps-tracking.service';

@ApiTags('WPS Tracking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('wps-tracking')
export class WpsTrackingController {
    constructor(private readonly wpsTrackingService: WpsTrackingService) { }

    @Post()
    @Roles('ADMIN', 'FINANCE')
    @ApiOperation({ summary: 'إنشاء سجل تتبع WPS' })
    create(@Body() dto: any, @Request() req: any) {
        return this.wpsTrackingService.createSubmission(dto, req.user.companyId, req.user.id);
    }

    @Get()
    @Roles('ADMIN', 'FINANCE', 'HR')
    @ApiOperation({ summary: 'جلب جميع ملفات WPS' })
    findAll(@Request() req: any, @Query('status') status?: string) {
        return this.wpsTrackingService.findAll(req.user.companyId, status as any);
    }

    @Get('stats')
    @Roles('ADMIN', 'FINANCE')
    @ApiOperation({ summary: 'إحصائيات WPS' })
    getStats(@Request() req: any, @Query('year') year?: string) {
        return this.wpsTrackingService.getStats(req.user.companyId, year ? parseInt(year) : undefined);
    }

    @Get('by-run/:runId')
    @Roles('ADMIN', 'FINANCE')
    @ApiOperation({ summary: 'جلب ملفات WPS لمسيرة معينة' })
    findByRun(@Param('runId') runId: string, @Request() req: any) {
        return this.wpsTrackingService.findByPayrollRun(runId, req.user.companyId);
    }

    @Get(':id')
    @Roles('ADMIN', 'FINANCE', 'HR')
    @ApiOperation({ summary: 'جلب سجل WPS محدد' })
    findOne(@Param('id') id: string, @Request() req: any) {
        return this.wpsTrackingService.findOne(id, req.user.companyId);
    }

    @Put(':id/status')
    @Roles('ADMIN', 'FINANCE')
    @ApiOperation({ summary: 'تحديث حالة WPS' })
    updateStatus(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
        return this.wpsTrackingService.updateStatus(id, dto, req.user.companyId);
    }

    @Put(':id/downloaded')
    @Roles('ADMIN', 'FINANCE')
    @ApiOperation({ summary: 'تسجيل تحميل الملف' })
    markDownloaded(@Param('id') id: string, @Request() req: any) {
        return this.wpsTrackingService.markAsDownloaded(id, req.user.companyId);
    }
}
