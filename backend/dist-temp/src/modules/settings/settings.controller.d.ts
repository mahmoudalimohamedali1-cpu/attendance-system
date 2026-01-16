import { SettingsService } from './settings.service';
import { LeaveResetService } from './leave-reset.service';
export declare class SettingsController {
    private readonly settingsService;
    private readonly leaveResetService;
    constructor(settingsService: SettingsService, leaveResetService: LeaveResetService);
    getAllSettings(companyId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        description: string | null;
        value: string;
        key: string;
    }[]>;
    getHolidays(companyId: string, year?: number): Promise<{
        id: string;
        name: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        date: Date;
        isRecurring: boolean;
    }[]>;
    createHoliday(body: {
        name: string;
        nameEn?: string;
        date: string;
        isRecurring?: boolean;
    }, companyId: string): Promise<{
        id: string;
        name: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        date: Date;
        isRecurring: boolean;
    }>;
    updateHoliday(id: string, companyId: string, body: {
        name?: string;
        nameEn?: string;
        date?: string;
        isRecurring?: boolean;
    }): Promise<{
        id: string;
        name: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        date: Date;
        isRecurring: boolean;
    }>;
    deleteHoliday(id: string, companyId: string): Promise<{
        id: string;
        name: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        date: Date;
        isRecurring: boolean;
    }>;
    getSetting(key: string, companyId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        description: string | null;
        value: string;
        key: string;
    } | null>;
    setSetting(body: {
        key: string;
        value: string;
        description?: string;
    }, companyId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        description: string | null;
        value: string;
        key: string;
    }>;
    setMultipleSettings(body: {
        settings: Array<{
            key: string;
            value: string;
            description?: string;
        }>;
    }, companyId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        description: string | null;
        value: string;
        key: string;
    }[]>;
    deleteSetting(key: string, companyId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        description: string | null;
        value: string;
        key: string;
    }>;
    getLeaveCarryoverPolicy(companyId: string): Promise<{
        disableLeaveCarryover: boolean;
        description: string;
    }>;
    setLeaveCarryoverPolicy(body: {
        disableCarryover: boolean;
    }, companyId: string): Promise<{
        success: boolean;
        disableLeaveCarryover: boolean;
        message: string;
    }>;
    resetLeaveBalances(companyId: string): Promise<{
        message: string;
        totalResetCount: number;
    }>;
    getLeaveStatistics(companyId: string): Promise<{
        carryoverDisabled: boolean;
        totalUsers: number;
        statistics: {
            yearsOfService: number;
            expectedAnnualDays: number;
            id: string;
            firstName: string;
            lastName: string;
            hireDate: Date | null;
            annualLeaveDays: number;
            usedLeaveDays: number;
            remainingLeaveDays: number;
        }[];
    }>;
}
