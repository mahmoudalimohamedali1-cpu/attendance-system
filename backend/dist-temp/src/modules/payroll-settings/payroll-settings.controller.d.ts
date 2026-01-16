import { PayrollSettingsService, UpdatePayrollSettingsDto } from './payroll-settings.service';
export declare class PayrollSettingsController {
    private readonly settingsService;
    constructor(settingsService: PayrollSettingsService);
    getSettings(companyId: string): Promise<any>;
    updateSettings(companyId: string, data: UpdatePayrollSettingsDto): Promise<any>;
    resetToDefaults(companyId: string): Promise<any>;
}
