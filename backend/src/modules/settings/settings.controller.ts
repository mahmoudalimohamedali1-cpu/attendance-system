import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { LeaveResetService } from './leave-reset.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly leaveResetService: LeaveResetService,
  ) { }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'جميع الإعدادات' })
  @ApiResponse({ status: 200, description: 'الإعدادات' })
  async getAllSettings(@CurrentUser('companyId') companyId: string) {
    return this.settingsService.getAllSettings(companyId);
  }

  // ============ Holidays Routes (MUST come before key/:key) ============
  @Get('holidays/all')
  @Roles('ADMIN', 'HR', 'MANAGER', 'EMPLOYEE')
  @ApiOperation({ summary: 'قائمة العطلات' })
  @ApiResponse({ status: 200, description: 'العطلات' })
  async getHolidays(@CurrentUser('companyId') companyId: string, @Query('year') year?: number) {
    return this.settingsService.getHolidays(companyId, year);
  }

  @Get('holidays/employee/:employeeId')
  @Roles('ADMIN', 'HR', 'MANAGER')
  @ApiOperation({ summary: 'العطلات المطبقة على موظف في فترة معينة' })
  @ApiResponse({ status: 200, description: 'العطلات' })
  async getEmployeeHolidays(
    @Param('employeeId') employeeId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.settingsService.getEmployeeHolidaysInPeriod(
      employeeId,
      new Date(startDate),
      new Date(endDate),
      companyId,
    );
  }

  @Get('holidays/check')
  @Roles('ADMIN', 'HR', 'MANAGER', 'EMPLOYEE')
  @ApiOperation({ summary: 'التحقق إذا كان التاريخ عطلة لموظف' })
  @ApiResponse({ status: 200, description: 'معلومات العطلة' })
  async checkHoliday(
    @Query('date') date: string,
    @Query('employeeId') employeeId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.settingsService.getEmployeeHolidayInfo(
      new Date(date),
      employeeId,
      companyId,
    );
  }

  @Post('holidays')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'إضافة عطلة' })
  @ApiResponse({ status: 201, description: 'تمت الإضافة' })
  async createHoliday(
    @Body() body: {
      name: string;
      nameEn?: string;
      date: string;
      isRecurring?: boolean;
      isPaid?: boolean;
      applicationType?: 'ALL' | 'BRANCH' | 'DEPARTMENT' | 'SPECIFIC_EMPLOYEES' | 'EXCLUDE_EMPLOYEES';
      countAsWorkDay?: boolean;
      overtimeMultiplier?: number;
      notes?: string;
      assignments?: {
        type: 'BRANCH' | 'DEPARTMENT' | 'EMPLOYEE';
        ids: string[];
      };
    },
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.settingsService.createHoliday({
      ...body,
      date: new Date(body.date),
      applicationType: body.applicationType as any,
    }, companyId);
  }

  @Patch('holidays/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'تعديل عطلة' })
  @ApiResponse({ status: 200, description: 'تم التعديل' })
  async updateHoliday(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() body: {
      name?: string;
      nameEn?: string;
      date?: string;
      isRecurring?: boolean;
      isPaid?: boolean;
      applicationType?: 'ALL' | 'BRANCH' | 'DEPARTMENT' | 'SPECIFIC_EMPLOYEES' | 'EXCLUDE_EMPLOYEES';
      countAsWorkDay?: boolean;
      overtimeMultiplier?: number;
      notes?: string;
      assignments?: {
        type: 'BRANCH' | 'DEPARTMENT' | 'EMPLOYEE';
        ids: string[];
      };
    },
  ) {
    const updateData: any = { ...body };
    if (body.date) {
      updateData.date = new Date(body.date);
    }
    return this.settingsService.updateHoliday(id, companyId, updateData);
  }

  @Delete('holidays/cleanup/duplicates')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'حذف العطلات المكررة' })
  @ApiResponse({ status: 200, description: 'تم حذف العطلات المكررة' })
  async removeDuplicateHolidays(@CurrentUser('companyId') companyId: string) {
    return this.settingsService.removeDuplicateHolidays(companyId);
  }

  @Delete('holidays/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'حذف عطلة' })
  @ApiResponse({ status: 200, description: 'تم الحذف' })
  async deleteHoliday(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
    return this.settingsService.deleteHoliday(id, companyId);
  }

  // ============ Dynamic Key Routes (MUST come AFTER specific routes) ============
  @Get('key/:key')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'الحصول على إعداد محدد' })
  @ApiResponse({ status: 200, description: 'الإعداد' })
  async getSetting(@Param('key') key: string, @CurrentUser('companyId') companyId: string) {
    return this.settingsService.getSetting(key, companyId);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'تعيين إعداد' })
  @ApiResponse({ status: 201, description: 'تم تعيين الإعداد' })
  async setSetting(@Body() body: { key: string; value: string; description?: string }, @CurrentUser('companyId') companyId: string) {
    return this.settingsService.setSetting(body.key, body.value, companyId, body.description);
  }

  @Post('bulk')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'تعيين إعدادات متعددة' })
  @ApiResponse({ status: 201, description: 'تم تعيين الإعدادات' })
  async setMultipleSettings(
    @Body() body: { settings: Array<{ key: string; value: string; description?: string }> },
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.settingsService.setMultipleSettings(body.settings, companyId);
  }

  @Delete('key/:key')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'حذف إعداد' })
  @ApiResponse({ status: 200, description: 'تم الحذف' })
  async deleteSetting(@Param('key') key: string, @CurrentUser('companyId') companyId: string) {
    return this.settingsService.deleteSetting(key, companyId);
  }


  // ============ سياسة ترحيل الإجازات ============

  @Get('leave-policy/carryover')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'الحصول على سياسة ترحيل الإجازات' })
  @ApiResponse({ status: 200, description: 'سياسة ترحيل الإجازات' })
  async getLeaveCarryoverPolicy(@CurrentUser('companyId') companyId: string) {
    const disabled = await this.settingsService.isLeaveCarryoverDisabled(companyId);
    return {
      disableLeaveCarryover: disabled,
      description: disabled
        ? 'الشركة لا ترحل الإجازات - يتم إعادة ضبط الرصيد في بداية كل سنة'
        : 'الشركة ترحل الإجازات - الأيام المتبقية تنتقل للسنة الجديدة',
    };
  }

  @Post('leave-policy/carryover')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'تعيين سياسة ترحيل الإجازات' })
  @ApiResponse({ status: 200, description: 'تم تعيين السياسة' })
  async setLeaveCarryoverPolicy(@Body() body: { disableCarryover: boolean }, @CurrentUser('companyId') companyId: string) {
    await this.settingsService.setSetting(
      'disableLeaveCarryover',
      body.disableCarryover.toString(),
      companyId,
      'سياسة ترحيل الإجازات - true = لا ترحيل (إعادة ضبط سنوية)',
    );

    return {
      success: true,
      disableLeaveCarryover: body.disableCarryover,
      message: body.disableCarryover
        ? 'تم تفعيل سياسة عدم ترحيل الإجازات - سيتم إعادة ضبط الرصيد في 1 يناير'
        : 'تم تفعيل سياسة ترحيل الإجازات - الأيام المتبقية ستنتقل للسنة الجديدة',
    };
  }

  @Post('leave-policy/reset-balances')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'إعادة ضبط رصيد الإجازات يدوياً' })
  @ApiResponse({ status: 200, description: 'تم إعادة ضبط الرصيد' })
  async resetLeaveBalances(@CurrentUser('companyId') companyId: string) {
    return this.leaveResetService.manualResetLeaveBalances();
  }

  @Get('leave-policy/statistics')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'إحصائيات الإجازات' })
  @ApiResponse({ status: 200, description: 'الإحصائيات' })
  async getLeaveStatistics(@CurrentUser('companyId') companyId: string) {
    return this.leaveResetService.getLeaveStatistics(companyId);
  }
}

