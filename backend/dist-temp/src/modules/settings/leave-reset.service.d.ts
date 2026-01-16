import { PrismaService } from '../../common/prisma/prisma.service';
import { SettingsService } from './settings.service';
export declare class LeaveResetService {
    private prisma;
    private settingsService;
    private readonly logger;
    constructor(prisma: PrismaService, settingsService: SettingsService);
    calculateAnnualLeaveDays(hireDate: Date | null): number;
    resetAnnualLeaveBalances(): Promise<{
        message: string;
        totalResetCount: number;
    }>;
    manualResetLeaveBalances(): Promise<{
        message: string;
        totalResetCount: number;
    }>;
    updateUserLeaveDays(userId: string, companyId: string): Promise<{
        id: string;
        phone: string | null;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        password: string;
        firstName: string;
        lastName: string;
        avatar: string | null;
        employeeCode: string | null;
        jobTitle: string | null;
        role: import(".prisma/client").$Enums.Role;
        status: import(".prisma/client").$Enums.UserStatus;
        salary: import("@prisma/client/runtime/library").Decimal | null;
        hireDate: Date | null;
        nationality: string | null;
        isSaudi: boolean;
        fcmToken: string | null;
        nationalId: string | null;
        iqamaNumber: string | null;
        iqamaExpiryDate: Date | null;
        borderNumber: string | null;
        passportNumber: string | null;
        passportExpiryDate: Date | null;
        professionCode: string | null;
        profession: string | null;
        dateOfBirth: Date | null;
        gender: string | null;
        gosiNumber: string | null;
        maritalStatus: string | null;
        isSuperAdmin: boolean;
        jobTitleId: string | null;
        annualLeaveDays: number;
        usedLeaveDays: number;
        remainingLeaveDays: number;
        faceRegistered: boolean;
        companyId: string | null;
        branchId: string | null;
        departmentId: string | null;
        managerId: string | null;
        costCenterId: string | null;
        jobFamilyId: string | null;
        roleLevelId: string | null;
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
