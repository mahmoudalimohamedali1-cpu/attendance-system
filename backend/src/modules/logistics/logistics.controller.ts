import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    UseGuards,
    Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LogisticsService } from './logistics.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CreateTripDto } from './dto/create-trip.dto';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { CreateInventoryCountDto } from './dto/create-inventory-count.dto';

@ApiTags('Logistics')
@ApiBearerAuth()
@Controller('logistics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LogisticsController {
    constructor(private readonly logisticsService: LogisticsService) { }

    // ==================== الرحلات ====================

    @Get('trips')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'جلب جميع الرحلات' })
    async getTrips(@CurrentUser('companyId') companyId: string) {
        return this.logisticsService.getTrips(companyId);
    }

    @Post('trips')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'إضافة رحلة جديدة' })
    async createTrip(
        @CurrentUser('companyId') companyId: string,
        @Body() dto: CreateTripDto,
    ) {
        return this.logisticsService.createTrip(companyId, dto);
    }

    @Delete('trips/:id')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'حذف رحلة' })
    async deleteTrip(@Param('id') id: string) {
        return this.logisticsService.deleteTrip(id);
    }

    // ==================== التوصيلات ====================

    @Get('deliveries')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'جلب جميع التوصيلات' })
    async getDeliveries(@CurrentUser('companyId') companyId: string) {
        return this.logisticsService.getDeliveries(companyId);
    }

    @Post('deliveries')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'إضافة توصيل جديد' })
    async createDelivery(
        @CurrentUser('companyId') companyId: string,
        @Body() dto: CreateDeliveryDto,
    ) {
        return this.logisticsService.createDelivery(companyId, dto);
    }

    @Delete('deliveries/:id')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'حذف توصيل' })
    async deleteDelivery(@Param('id') id: string) {
        return this.logisticsService.deleteDelivery(id);
    }

    // ==================== الجرد ====================

    @Get('inventory')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'جلب جميع عمليات الجرد' })
    async getInventoryCounts(@CurrentUser('companyId') companyId: string) {
        return this.logisticsService.getInventoryCounts(companyId);
    }

    @Post('inventory')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'إضافة عملية جرد' })
    async createInventoryCount(
        @CurrentUser('companyId') companyId: string,
        @Body() dto: CreateInventoryCountDto,
    ) {
        return this.logisticsService.createInventoryCount(companyId, dto);
    }

    @Delete('inventory/:id')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'حذف عملية جرد' })
    async deleteInventoryCount(@Param('id') id: string) {
        return this.logisticsService.deleteInventoryCount(id);
    }

    // ==================== أداء السائقين ====================

    @Get('driver-performance')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'جلب أداء السائقين' })
    @ApiQuery({ name: 'month', required: false, type: Number })
    @ApiQuery({ name: 'year', required: false, type: Number })
    async getDriverPerformance(
        @CurrentUser('companyId') companyId: string,
        @Query('month') month?: string,
        @Query('year') year?: string,
    ) {
        const now = new Date();
        return this.logisticsService.getDriverPerformance(
            companyId,
            month ? parseInt(month) : now.getMonth() + 1,
            year ? parseInt(year) : now.getFullYear(),
        );
    }

    @Post('driver-performance/calculate')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'حساب أداء السائقين للشهر' })
    @ApiQuery({ name: 'month', required: true, type: Number })
    @ApiQuery({ name: 'year', required: true, type: Number })
    async calculateDriverPerformance(
        @CurrentUser('companyId') companyId: string,
        @Query('month') month: string,
        @Query('year') year: string,
    ) {
        return this.logisticsService.calculateDriverPerformance(
            companyId,
            parseInt(month),
            parseInt(year),
        );
    }

    // ==================== إحصائيات اللوجستيات ====================

    @Get('statistics')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'جلب إحصائيات اللوجستيات' })
    @ApiQuery({ name: 'month', required: false, type: Number })
    @ApiQuery({ name: 'year', required: false, type: Number })
    async getStatistics(
        @CurrentUser('companyId') companyId: string,
        @Query('month') month?: string,
        @Query('year') year?: string,
    ) {
        const now = new Date();
        return this.logisticsService.getStatistics(
            companyId,
            month ? parseInt(month) : now.getMonth() + 1,
            year ? parseInt(year) : now.getFullYear(),
        );
    }

    @Get('dashboard')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'لوحة تحكم اللوجستيات' })
    async getDashboard(@CurrentUser('companyId') companyId: string) {
        return this.logisticsService.getDashboard(companyId);
    }
}
