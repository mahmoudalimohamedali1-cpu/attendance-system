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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LocationTrackingService } from './location-tracking.service';
import {
    UpdateLocationDto,
    LocationHistoryQueryDto,
} from './dto/location-tracking.dto';

@ApiTags('Location Tracking - تتبع الموقع')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('location-tracking')
export class LocationTrackingController {
    constructor(private readonly locationTrackingService: LocationTrackingService) { }

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
}
