import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
export declare class SettingsService {
    private prisma;
    private auditService;
    constructor(prisma: PrismaService, auditService: AuditService);
    getAllSettings(companyId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        description: string | null;
        value: string;
        key: string;
    }[]>;
    getSetting(key: string, companyId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        description: string | null;
        value: string;
        key: string;
    } | null>;
    setSetting(key: string, value: string, companyId: string, description?: string, userId?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        description: string | null;
        value: string;
        key: string;
    }>;
    deleteSetting(key: string, companyId: string, userId?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        description: string | null;
        value: string;
        key: string;
    }>;
    setMultipleSettings(settings: Array<{
        key: string;
        value: string;
        description?: string;
    }>, companyId: string): Promise<{
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
    createHoliday(data: {
        name: string;
        nameEn?: string;
        date: Date;
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
    updateHoliday(id: string, companyId: string, data: Partial<{
        name: string;
        nameEn?: string;
        date: Date;
        isRecurring?: boolean;
    }>): Promise<{
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
    isHoliday(date: Date, companyId?: string): Promise<boolean>;
    isLeaveCarryoverDisabled(companyId: string): Promise<boolean>;
}
