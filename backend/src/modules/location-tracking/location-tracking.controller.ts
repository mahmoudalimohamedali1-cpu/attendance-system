import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    Query,
    UseGuards,
    Req,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { LocationTrackingService } from './location-tracking.service';
import { LocationReportsService } from './location-reports.service';
import {
    UpdateLocationDto,
    LocationHistoryQueryDto,
} from './dto/location-tracking.dto';

@ApiTags('Location Tracking - تتبع الموقع')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('location-tracking')
export class LocationTrackingController {
    constructor(
        private readonly locationTrackingService: LocationTrackingService,
        private readonly reportsService: LocationReportsService,
    ) { }

    @Post('update')
    @ApiOperation({ summary: 'تحديث موقع الموظف (من التطبيق)' })
    @ApiResponse({ status: 200, description: 'تم تحديث الموقع بنجاح' })
    async updateLocation(@Req() req: any, @Body() dto: UpdateLocationDto) {
        const userId = req.user.sub || req.user.id;
        return this.locationTrackingService.updateLocation(userId, dto);
    }

    @Get('active')
    @ApiOperation({ summary: 'قائمة الموظفين الحاضرين (للمسؤولين)' })
    @ApiResponse({ status: 200, description: 'قائمة الموظفين النشطين' })
    async getActiveEmployees(@Req() req: any) {
        const companyId = req.user.companyId;
        return this.locationTrackingService.getActiveEmployees(companyId);
    }

    // ==================== تقارير التتبع ====================

    @Get('reports/summary')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'ملخص تقارير الخروج' })
    @ApiQuery({ name: 'startDate', required: true, type: String })
    @ApiQuery({ name: 'endDate', required: true, type: String })
    async getExitSummary(
        @Req() req: any,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        const companyId = req.user.companyId;
        return this.reportsService.getExitSummary(
            companyId,
            new Date(startDate),
            new Date(endDate),
        );
    }

    @Get('reports/daily')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'التقرير اليومي للخروج' })
    @ApiQuery({ name: 'startDate', required: true, type: String })
    @ApiQuery({ name: 'endDate', required: true, type: String })
    async getDailyReport(
        @Req() req: any,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        const companyId = req.user.companyId;
        return this.reportsService.getDailyExitReport(
            companyId,
            new Date(startDate),
            new Date(endDate),
        );
    }

    @Get('reports/employees')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'إحصائيات جميع الموظفين' })
    @ApiQuery({ name: 'startDate', required: true, type: String })
    @ApiQuery({ name: 'endDate', required: true, type: String })
    async getAllEmployeesStats(
        @Req() req: any,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        const companyId = req.user.companyId;
        return this.reportsService.getAllEmployeesExitStats(
            companyId,
            new Date(startDate),
            new Date(endDate),
        );
    }

    @Get('reports/employee/:userId')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'تقرير تفصيلي لموظف' })
    @ApiQuery({ name: 'startDate', required: true, type: String })
    @ApiQuery({ name: 'endDate', required: true, type: String })
    async getEmployeeReport(
        @Req() req: any,
        @Param('userId') userId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        const companyId = req.user.companyId;
        return this.reportsService.getEmployeeExitDetail(
            companyId,
            userId,
            new Date(startDate),
            new Date(endDate),
        );
    }

    // ==================== باقي الـ Endpoints ====================

    @Get(':userId')
    @ApiOperation({ summary: 'موقع موظف معين (للمسؤولين)' })
    @ApiResponse({ status: 200, description: 'آخر موقع للموظف' })
    async getEmployeeLocation(@Req() req: any, @Param('userId') targetUserId: string) {
        const requesterId = req.user.sub || req.user.id;
        const companyId = req.user.companyId;
        return this.locationTrackingService.getEmployeeLocation(requesterId, targetUserId, companyId);
    }

    @Get(':userId/history')
    @ApiOperation({ summary: 'سجل المواقع لموظف' })
    @ApiResponse({ status: 200, description: 'سجل المواقع' })
    async getLocationHistory(
        @Req() req: any,
        @Param('userId') targetUserId: string,
        @Query() query: LocationHistoryQueryDto,
    ) {
        const requesterId = req.user.sub || req.user.id;
        const companyId = req.user.companyId;
        return this.locationTrackingService.getLocationHistory(requesterId, targetUserId, companyId, query);
    }

    @Get(':userId/exit-events')
    @ApiOperation({ summary: 'أحداث الخروج من النطاق لموظف' })
    @ApiResponse({ status: 200, description: 'قائمة أحداث الخروج' })
    async getExitEvents(
        @Req() req: any,
        @Param('userId') targetUserId: string,
        @Query('date') dateStr?: string,
    ) {
        const requesterId = req.user.sub || req.user.id;
        const companyId = req.user.companyId;
        const date = dateStr ? new Date(dateStr) : undefined;
        return this.locationTrackingService.getExitEvents(requesterId, targetUserId, companyId, date);
    }

    // ==================== الموظفين المنقطعين (Offline Detection) ====================

    @Get('offline/current')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'الموظفين المنقطعين حالياً' })
    @ApiResponse({ status: 200, description: 'قائمة الموظفين المنقطعين' })
    async getOfflineEmployees(@Req() req: any) {
        const companyId = req.user.companyId;
        return this.locationTrackingService.getOfflineEmployees(companyId);
    }

    @Get('offline/history')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'سجل انقطاعات الموظفين' })
    @ApiQuery({ name: 'startDate', required: true, type: String })
    @ApiQuery({ name: 'endDate', required: true, type: String })
    async getOfflineHistory(
        @Req() req: any,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        const companyId = req.user.companyId;
        return this.locationTrackingService.getOfflineHistory(
            companyId,
            new Date(startDate),
            new Date(endDate),
        );
    }
}

