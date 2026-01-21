import { Controller, Get, Patch, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PayrollSettingsService, UpdatePayrollSettingsDto } from './payroll-settings.service';

@Controller('payroll-settings')
@UseGuards(JwtAuthGuard)
export class PayrollSettingsController {
    private readonly logger = new Logger(PayrollSettingsController.name);

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
        this.logger.log(`📨 Received update request for company ${companyId}`);
        this.logger.log(`📦 Body keys: ${Object.keys(data).join(', ')}`);
        this.logger.log(`📦 Body: ${JSON.stringify(data).substring(0, 500)}`);
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
