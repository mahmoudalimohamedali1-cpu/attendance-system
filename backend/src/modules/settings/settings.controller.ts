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

  @Get(':key')
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

  @Delete(':key')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'حذف إعداد' })
  @ApiResponse({ status: 200, description: 'تم الحذف' })
  async deleteSetting(@Param('key') key: string, @CurrentUser('companyId') companyId: string) {
    return this.settingsService.deleteSetting(key, companyId);
  }

  // Holidays
  @Get('holidays/all')
  @ApiOperation({ summary: 'قائمة العطلات' })
  @ApiResponse({ status: 200, description: 'العطلات' })
  async getHolidays(@CurrentUser('companyId') companyId: string, @Query('year') year?: number) {
    return this.settingsService.getHolidays(companyId, year);
  }

  @Post('holidays')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'إضافة عطلة' })
  @ApiResponse({ status: 201, description: 'تمت الإضافة' })
  async createHoliday(
    @Body() body: { name: string; nameEn?: string; date: string; isRecurring?: boolean },
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.settingsService.createHoliday({
      ...body,
      date: new Date(body.date),
    }, companyId);
  }

  @Patch('holidays/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'تعديل عطلة' })
  @ApiResponse({ status: 200, description: 'تم التعديل' })
  async updateHoliday(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() body: { name?: string; nameEn?: string; date?: string; isRecurring?: boolean },
  ) {
    const updateData: Partial<{ name: string; nameEn?: string; date: Date; isRecurring?: boolean }> = {};

    if (body.name !== undefined) {
      updateData.name = body.name;
    }
    if (body.nameEn !== undefined) {
      updateData.nameEn = body.nameEn;
    }
    if (body.date !== undefined) {
      updateData.date = new Date(body.date);
    }
    if (body.isRecurring !== undefined) {
      updateData.isRecurring = body.isRecurring;
    }

    return this.settingsService.updateHoliday(id, companyId, updateData);
  }

  @Delete('holidays/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'حذف عطلة' })
  @ApiResponse({ status: 200, description: 'تم الحذف' })
  async deleteHoliday(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
    return this.settingsService.deleteHoliday(id, companyId);
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

