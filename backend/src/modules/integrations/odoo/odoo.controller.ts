import { Controller, Get, Post, Delete, Body, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { OdooService } from './odoo.service';
import { ConnectOdooDto, TestOdooConnectionDto } from './dto/connect-odoo.dto';
import { SyncEmployeesDto, OdooEmployeeMappingDto } from './dto/odoo-employee.dto';
import { SyncAttendanceDto } from './dto/sync-attendance.dto';

@ApiTags('Odoo Integration')
@Controller('integrations/odoo')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OdooController {
    constructor(private readonly odooService: OdooService) { }

    // ============= CONNECTION =============

    @Get('status')
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '📊 حالة اتصال Odoo' })
    @ApiResponse({ status: 200, description: 'حالة الاتصال' })
    async getStatus(@Request() req: any) {
        return this.odooService.getStatus(req.user.companyId);
    }

    @Post('test')
    @Roles('ADMIN')
    @ApiOperation({ summary: '🧪 اختبار الاتصال بـ Odoo' })
    @ApiResponse({ status: 200, description: 'نتيجة الاختبار' })
    async testConnection(@Body() dto: TestOdooConnectionDto) {
        return this.odooService.testConnection(dto);
    }

    @Post('connect')
    @Roles('ADMIN')
    @ApiOperation({ summary: '🔗 ربط Odoo ERP' })
    @ApiResponse({ status: 200, description: 'تم الربط بنجاح' })
    async connect(@Request() req: any, @Body() dto: ConnectOdooDto) {
        return this.odooService.connect(req.user.companyId, req.user.id, dto);
    }

    @Delete('disconnect')
    @Roles('ADMIN')
    @ApiOperation({ summary: '🔌 فصل Odoo' })
    @ApiResponse({ status: 200, description: 'تم الفصل' })
    async disconnect(@Request() req: any) {
        return this.odooService.disconnect(req.user.companyId);
    }

    // ============= EMPLOYEES =============

    @Get('employees')
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '👥 جلب الموظفين من Odoo' })
    @ApiResponse({ status: 200, description: 'قائمة الموظفين' })
    async fetchEmployees(@Request() req: any, @Query() dto: SyncEmployeesDto) {
        return this.odooService.fetchEmployees(req.user.companyId, dto);
    }

    @Post('employees/sync')
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '🔄 مزامنة الموظفين من Odoo' })
    @ApiResponse({ status: 200, description: 'نتيجة المزامنة' })
    async syncEmployees(@Request() req: any, @Body() dto: SyncEmployeesDto) {
        return this.odooService.syncEmployees(req.user.companyId, dto);
    }

    @Post('employees/map')
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '🔗 ربط موظف محلي بموظف Odoo' })
    @ApiResponse({ status: 200, description: 'تم الربط' })
    async mapEmployee(@Request() req: any, @Body() dto: OdooEmployeeMappingDto) {
        return this.odooService.mapEmployee(req.user.companyId, dto.userId, dto.odooEmployeeId);
    }

    // ============= ATTENDANCE =============

    @Post('attendance/sync')
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '📤 مزامنة الحضور إلى Odoo' })
    @ApiResponse({ status: 200, description: 'نتيجة المزامنة' })
    async syncAttendance(@Request() req: any, @Body() dto: SyncAttendanceDto) {
        return this.odooService.syncAttendance(req.user.companyId, dto);
    }
}
