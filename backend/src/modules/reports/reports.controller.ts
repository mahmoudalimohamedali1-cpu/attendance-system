import {
  Controller,
  Get,
  Query,
  Param,
  Res,
  UseGuards,
  Request,
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
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) { }

  @Get('dashboard')
  @ApiOperation({ summary: 'إحصائيات لوحة التحكم' })
  @ApiResponse({ status: 200, description: 'الإحصائيات' })
  async getDashboardStats(@Request() req: any) {
    return this.reportsService.getDashboardStats(req.user.companyId, req.user.id, req.user.role);
  }

  @Get('weekly-summary')
  @ApiOperation({ summary: 'ملخص الأسبوع' })
  @ApiResponse({ status: 200, description: 'ملخص الأسبوع' })
  async getWeeklySummary(@Request() req: any) {
    return this.reportsService.getWeeklySummary(req.user.id, req.user.role);
  }

  @Get('attendance')
  @ApiOperation({ summary: 'تقرير الحضور (حسب صلاحياتك)' })
  @ApiResponse({ status: 200, description: 'تقرير الحضور' })
  async getAttendanceReport(@Request() req: any, @Query() query: ReportQueryDto) {
    return this.reportsService.getAttendanceReport(query, req.user.id);
  }

  @Get('employee/:userId')
  @ApiOperation({ summary: 'تقرير موظف (حسب صلاحياتك)' })
  @ApiResponse({ status: 200, description: 'تقرير الموظف' })
  async getEmployeeReport(
    @Request() req: any,
    @Param('userId') userId: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getEmployeeReport(userId, query, req.user.id);
  }

  @Get('branch/:branchId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'تقرير فرع (للأدمن والمدراء فقط)' })
  @ApiResponse({ status: 200, description: 'تقرير الفرع' })
  async getBranchReport(
    @Param('branchId') branchId: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getBranchReport(branchId, query);
  }

  @Get('late')
  @ApiOperation({ summary: 'تقرير التأخيرات (حسب صلاحياتك)' })
  @ApiResponse({ status: 200, description: 'تقرير التأخيرات' })
  async getLateReport(@Request() req: any, @Query() query: ReportQueryDto) {
    return this.reportsService.getLateReport(query, req.user.id);
  }

  @Get('payroll')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'ملخص الرواتب (للأدمن فقط)' })
  @ApiResponse({ status: 200, description: 'ملخص الرواتب' })
  async getPayrollSummary(@Request() req: any, @Query() query: ReportQueryDto) {
    return this.reportsService.getPayrollSummary(query, req.user.companyId);
  }

  // Export endpoints
  @Get('export/excel/:type')
  @ApiOperation({ summary: 'تصدير تقرير Excel' })
  async exportToExcel(
    @Request() req: any,
    @Param('type') type: string,
    @Query() query: ReportQueryDto,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.exportToExcel(type, query, req.user.id);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="report-${type}-${Date.now()}.xlsx"`,
    });

    res.send(buffer);
  }

  @Get('export/pdf/:type')
  @ApiOperation({ summary: 'تصدير تقرير PDF' })
  async exportToPdf(
    @Request() req: any,
    @Param('type') type: string,
    @Query() query: ReportQueryDto,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.exportToPdf(type, query, req.user.id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="report-${type}-${Date.now()}.pdf"`,
    });

    res.send(buffer);
  }
}
