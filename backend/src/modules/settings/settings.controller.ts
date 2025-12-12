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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'جميع الإعدادات' })
  @ApiResponse({ status: 200, description: 'الإعدادات' })
  async getAllSettings() {
    return this.settingsService.getAllSettings();
  }

  @Get(':key')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'الحصول على إعداد محدد' })
  @ApiResponse({ status: 200, description: 'الإعداد' })
  async getSetting(@Param('key') key: string) {
    return this.settingsService.getSetting(key);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'تعيين إعداد' })
  @ApiResponse({ status: 201, description: 'تم تعيين الإعداد' })
  async setSetting(@Body() body: { key: string; value: string; description?: string }) {
    return this.settingsService.setSetting(body.key, body.value, body.description);
  }

  @Post('bulk')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'تعيين إعدادات متعددة' })
  @ApiResponse({ status: 201, description: 'تم تعيين الإعدادات' })
  async setMultipleSettings(
    @Body() body: { settings: Array<{ key: string; value: string; description?: string }> },
  ) {
    return this.settingsService.setMultipleSettings(body.settings);
  }

  @Delete(':key')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'حذف إعداد' })
  @ApiResponse({ status: 200, description: 'تم الحذف' })
  async deleteSetting(@Param('key') key: string) {
    return this.settingsService.deleteSetting(key);
  }

  // Holidays
  @Get('holidays/all')
  @ApiOperation({ summary: 'قائمة العطلات' })
  @ApiResponse({ status: 200, description: 'العطلات' })
  async getHolidays(@Query('year') year?: number) {
    return this.settingsService.getHolidays(year);
  }

  @Post('holidays')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'إضافة عطلة' })
  @ApiResponse({ status: 201, description: 'تمت الإضافة' })
  async createHoliday(
    @Body() body: { name: string; nameEn?: string; date: string; isRecurring?: boolean },
  ) {
    return this.settingsService.createHoliday({
      ...body,
      date: new Date(body.date),
    });
  }

  @Patch('holidays/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'تعديل عطلة' })
  @ApiResponse({ status: 200, description: 'تم التعديل' })
  async updateHoliday(
    @Param('id') id: string,
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
    
    return this.settingsService.updateHoliday(id, updateData);
  }

  @Delete('holidays/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'حذف عطلة' })
  @ApiResponse({ status: 200, description: 'تم الحذف' })
  async deleteHoliday(@Param('id') id: string) {
    return this.settingsService.deleteHoliday(id);
  }
}

