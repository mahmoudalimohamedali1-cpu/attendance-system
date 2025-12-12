import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // ============ Employee Endpoints ============

  @Post('check-in')
  @ApiOperation({ summary: 'تسجيل الحضور' })
  @ApiResponse({ status: 201, description: 'تم تسجيل الحضور بنجاح' })
  @ApiResponse({ status: 400, description: 'خطأ في البيانات أو خارج النطاق' })
  @ApiResponse({ status: 403, description: 'موقع وهمي مكتشف' })
  async checkIn(
    @CurrentUser('id') userId: string,
    @Body() checkInDto: CheckInDto,
  ) {
    return this.attendanceService.checkIn(userId, checkInDto);
  }

  @Post('check-out')
  @ApiOperation({ summary: 'تسجيل الانصراف' })
  @ApiResponse({ status: 201, description: 'تم تسجيل الانصراف بنجاح' })
  @ApiResponse({ status: 400, description: 'خطأ في البيانات' })
  async checkOut(
    @CurrentUser('id') userId: string,
    @Body() checkOutDto: CheckOutDto,
  ) {
    return this.attendanceService.checkOut(userId, checkOutDto);
  }

  @Get('today')
  @ApiOperation({ summary: 'الحصول على حضور اليوم' })
  @ApiResponse({ status: 200, description: 'بيانات الحضور لليوم' })
  async getTodayAttendance(@CurrentUser('id') userId: string) {
    return this.attendanceService.getTodayAttendance(userId);
  }

  @Get('history')
  @ApiOperation({ summary: 'سجل الحضور والانصراف' })
  @ApiResponse({ status: 200, description: 'قائمة سجلات الحضور' })
  async getAttendanceHistory(
    @CurrentUser('id') userId: string,
    @Query() query: AttendanceQueryDto,
  ) {
    return this.attendanceService.getAttendanceHistory(userId, query);
  }

  @Get('stats/monthly/:year/:month')
  @ApiOperation({ summary: 'إحصائيات الحضور الشهرية' })
  @ApiResponse({ status: 200, description: 'إحصائيات الشهر' })
  async getMonthlyStats(
    @CurrentUser('id') userId: string,
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
  ) {
    return this.attendanceService.getMonthlyStats(userId, year, month);
  }

  // ============ Admin Endpoints ============

  @Get('admin/all')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'جميع سجلات الحضور (للأدمن)' })
  @ApiResponse({ status: 200, description: 'قائمة جميع السجلات' })
  async getAllAttendance(@Query() query: AttendanceQueryDto) {
    return this.attendanceService.getAllAttendance(query);
  }

  @Get('admin/daily-stats')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'إحصائيات الحضور اليومية' })
  @ApiQuery({ name: 'date', required: false, description: 'تاريخ الإحصائيات' })
  @ApiResponse({ status: 200, description: 'إحصائيات اليوم' })
  async getDailyStats(@Query('date') date?: string) {
    return this.attendanceService.getDailyStats(date ? new Date(date) : undefined);
  }
}

