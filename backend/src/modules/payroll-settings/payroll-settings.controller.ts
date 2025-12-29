import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PayrollSettingsService, UpdatePayrollSettingsDto } from './payroll-settings.service';

@Controller('payroll-settings')
@UseGuards(JwtAuthGuard)
export class PayrollSettingsController {
    constructor(private readonly settingsService: PayrollSettingsService) { }

    /**
     * جلب إعدادات الرواتب للشركة الحالية
     */
    @Get()
    async getSettings(@CurrentUser('companyId') companyId: string) {
        return this.settingsService.getSettings(companyId);
    }

    /**
     * تحديث إعدادات الرواتب
     */
    @Patch()
    async updateSettings(
        @CurrentUser('companyId') companyId: string,
        @Body() data: UpdatePayrollSettingsDto,
    ) {
        return this.settingsService.updateSettings(companyId, data);
    }

    /**
     * إعادة تعيين الإعدادات للافتراضي
     */
    @Post('reset')
    async resetToDefaults(@CurrentUser('companyId') companyId: string) {
        return this.settingsService.resetToDefaults(companyId);
    }
}
