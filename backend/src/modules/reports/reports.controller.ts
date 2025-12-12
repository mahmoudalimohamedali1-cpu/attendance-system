import {
  Controller,
  Get,
  Query,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { ReportQueryDto } from './dto/report-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'إحصائيات لوحة التحكم' })
  @ApiResponse({ status: 200, description: 'الإحصائيات' })
  async getDashboardStats() {
    return this.reportsService.getDashboardStats();
  }

  @Get('weekly-summary')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'ملخص الأسبوع' })
  @ApiResponse({ status: 200, description: 'ملخص الأسبوع' })
  async getWeeklySummary() {
    return this.reportsService.getWeeklySummary();
  }

  @Get('attendance')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'تقرير الحضور' })
  @ApiResponse({ status: 200, description: 'تقرير الحضور' })
  async getAttendanceReport(@Query() query: ReportQueryDto) {
    return this.reportsService.getAttendanceReport(query);
  }

  @Get('employee/:userId')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'تقرير موظف' })
  @ApiResponse({ status: 200, description: 'تقرير الموظف' })
  async getEmployeeReport(
    @Param('userId') userId: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getEmployeeReport(userId, query);
  }

  @Get('branch/:branchId')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'تقرير فرع' })
  @ApiResponse({ status: 200, description: 'تقرير الفرع' })
  async getBranchReport(
    @Param('branchId') branchId: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getBranchReport(branchId, query);
  }

  @Get('late')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'تقرير التأخيرات' })
  @ApiResponse({ status: 200, description: 'تقرير التأخيرات' })
  async getLateReport(@Query() query: ReportQueryDto) {
    return this.reportsService.getLateReport(query);
  }

  @Get('payroll')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'ملخص الرواتب' })
  @ApiResponse({ status: 200, description: 'ملخص الرواتب' })
  async getPayrollSummary(@Query() query: ReportQueryDto) {
    return this.reportsService.getPayrollSummary(query);
  }

  // Export endpoints
  @Get('export/excel/:type')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'تصدير تقرير Excel' })
  async exportToExcel(
    @Param('type') type: string,
    @Query() query: ReportQueryDto,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.exportToExcel(type, query);
    
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="report-${type}-${Date.now()}.xlsx"`,
    });
    
    res.send(buffer);
  }

  @Get('export/pdf/:type')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'تصدير تقرير PDF' })
  async exportToPdf(
    @Param('type') type: string,
    @Query() query: ReportQueryDto,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.exportToPdf(type, query);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="report-${type}-${Date.now()}.pdf"`,
    });
    
    res.send(buffer);
  }
}

