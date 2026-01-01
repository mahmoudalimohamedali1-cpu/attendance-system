import { Controller, Get, Query, Request, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ExtendedReportsService } from '../services/extended-reports.service';
import {
    ExtendedReportQueryDto,
    AttendanceDetailedQueryDto,
    LateReportQueryDto,
    OvertimeReportQueryDto,
    PayrollReportQueryDto,
    LeaveReportQueryDto,
    EmployeeReportQueryDto,
    ContractExpiryQueryDto,
    CustodyReportQueryDto,
} from '../dto/extended-report.dto';

@ApiTags('executive-reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ExtendedReportsController {
    constructor(private readonly service: ExtendedReportsService) { }

    // ===================== REPORTS CATALOG =====================

    @Get('catalog')
    @ApiOperation({ summary: 'قائمة جميع التقارير المتاحة' })
    getCatalog() {
        return this.service.getReportsCatalog();
    }

    // ===================== ATTENDANCE REPORTS =====================

    @Get('attendance/daily')
    @ApiOperation({ summary: 'تقرير الحضور اليومي' })
    getDailyAttendance(@Request() req: any, @Query() query: AttendanceDetailedQueryDto) {
        return this.service.getDailyAttendance(req.user.companyId, query);
    }

    @Get('attendance/late-detailed')
    @ApiOperation({ summary: 'تقرير التأخيرات التفصيلي' })
    getLateDetails(@Request() req: any, @Query() query: LateReportQueryDto) {
        return this.service.getLateDetailsReport(req.user.companyId, query);
    }

    @Get('attendance/absence')
    @ApiOperation({ summary: 'تقرير الغياب' })
    getAbsence(@Request() req: any, @Query() query: ExtendedReportQueryDto) {
        return this.service.getAbsenceReport(req.user.companyId, query);
    }

    @Get('attendance/early-leave')
    @ApiOperation({ summary: 'تقرير الانصراف المبكر' })
    getEarlyLeave(@Request() req: any, @Query() query: ExtendedReportQueryDto) {
        return this.service.getEarlyLeaveReport(req.user.companyId, query);
    }

    @Get('attendance/overtime')
    @ApiOperation({ summary: 'تقرير العمل الإضافي' })
    getOvertime(@Request() req: any, @Query() query: OvertimeReportQueryDto) {
        return this.service.getOvertimeReport(req.user.companyId, query);
    }

    @Get('attendance/work-from-home')
    @ApiOperation({ summary: 'تقرير العمل من المنزل' })
    getWorkFromHome(@Request() req: any, @Query() query: ExtendedReportQueryDto) {
        return this.service.getWorkFromHomeReport(req.user.companyId, query);
    }

    @Get('attendance/by-branch')
    @ApiOperation({ summary: 'ملخص الحضور حسب الفرع' })
    getByBranch(@Request() req: any, @Query() query: ExtendedReportQueryDto) {
        return this.service.getAttendanceByBranch(req.user.companyId, query);
    }

    @Get('attendance/by-department')
    @ApiOperation({ summary: 'ملخص الحضور حسب القسم' })
    getByDepartment(@Request() req: any, @Query() query: ExtendedReportQueryDto) {
        return this.service.getAttendanceByDepartment(req.user.companyId, query);
    }

    @Get('attendance/compliance')
    @ApiOperation({ summary: 'تقرير الالتزام بالدوام' })
    getCompliance(@Request() req: any, @Query() query: ExtendedReportQueryDto) {
        return this.service.getComplianceReport(req.user.companyId, query);
    }

    @Get('attendance/suspicious')
    @ApiOperation({ summary: 'تقرير المحاولات المشبوهة' })
    getSuspicious(@Request() req: any, @Query() query: ExtendedReportQueryDto) {
        return this.service.getSuspiciousAttemptsReport(req.user.companyId, query);
    }

    // ===================== PAYROLL REPORTS =====================

    @Get('payroll/summary')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR', 'FINANCE')
    @ApiOperation({ summary: 'ملخص الرواتب الشهري' })
    getPayrollSummary(@Request() req: any, @Query() query: PayrollReportQueryDto) {
        return this.service.getPayrollSummary(req.user.companyId, query);
    }

    @Get('payroll/gosi')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR', 'FINANCE')
    @ApiOperation({ summary: 'تقرير التأمينات GOSI' })
    getGosi(@Request() req: any, @Query() query: PayrollReportQueryDto) {
        return this.service.getGosiReport(req.user.companyId, query);
    }

    @Get('payroll/advances')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR', 'FINANCE')
    @ApiOperation({ summary: 'تقرير السلف والقروض' })
    getAdvances(@Request() req: any, @Query() query: ExtendedReportQueryDto) {
        return this.service.getAdvancesReport(req.user.companyId, query);
    }

    // ===================== HR REPORTS =====================

    @Get('hr/employees')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'سجل الموظفين' })
    getEmployees(@Request() req: any, @Query() query: EmployeeReportQueryDto) {
        return this.service.getEmployeeList(req.user.companyId, query);
    }

    @Get('hr/contract-expiry')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'انتهاء العقود' })
    getContractExpiry(@Request() req: any, @Query() query: ContractExpiryQueryDto) {
        return this.service.getContractExpiryReport(req.user.companyId, query);
    }

    @Get('hr/iqama-expiry')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'انتهاء الإقامات' })
    getIqamaExpiry(@Request() req: any, @Query() query: ContractExpiryQueryDto) {
        return this.service.getIqamaExpiryReport(req.user.companyId, query);
    }

    @Get('hr/nationalities')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'تحليل الجنسيات (السعودة)' })
    getNationalities(@Request() req: any) {
        return this.service.getNationalityAnalysis(req.user.companyId);
    }

    // ===================== LEAVE REPORTS =====================

    @Get('leaves/balance')
    @ApiOperation({ summary: 'رصيد الإجازات' })
    getLeaveBalance(@Request() req: any, @Query() query: LeaveReportQueryDto) {
        return this.service.getLeaveBalanceReport(req.user.companyId, query);
    }

    @Get('leaves/requests')
    @ApiOperation({ summary: 'طلبات الإجازات' })
    getLeaveRequests(@Request() req: any, @Query() query: LeaveReportQueryDto) {
        return this.service.getLeaveRequestsReport(req.user.companyId, query);
    }

    // ===================== CUSTODY REPORTS =====================

    @Get('custody/inventory')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'جرد العهد' })
    getCustodyInventory(@Request() req: any, @Query() query: CustodyReportQueryDto) {
        return this.service.getCustodyInventory(req.user.companyId, query);
    }

    // ===================== EXECUTIVE REPORTS =====================

    @Get('executive/dashboard')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'لوحة التحكم التنفيذية' })
    getExecutiveDashboard(@Request() req: any) {
        return this.service.getExecutiveDashboard(req.user.companyId);
    }
}
