import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
export declare class BranchesController {
    private readonly branchesService;
    constructor(branchesService: BranchesService);
    createBranch(createBranchDto: CreateBranchDto, companyId: string): Promise<{
        id: string;
        name: string;
        nameEn: string | null;
        address: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        isActive: boolean;
        workStartTime: string;
        workEndTime: string;
        lateGracePeriod: number;
        geofenceRadius: number;
        latitude: import("@prisma/client/runtime/library").Decimal;
        longitude: import("@prisma/client/runtime/library").Decimal;
        timezone: string;
        earlyCheckInPeriod: number;
        earlyCheckOutPeriod: number;
        workingDays: string;
    }>;
    findAllBranches(companyId: string): Promise<({
        departments: {
            id: string;
            name: string;
            nameEn: string | null;
            createdAt: Date;
            updatedAt: Date;
            companyId: string | null;
            branchId: string;
            workStartTime: string | null;
            workEndTime: string | null;
        }[];
        _count: {
            users: number;
            departments: number;
        };
    } & {
        id: string;
        name: string;
        nameEn: string | null;
        address: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        isActive: boolean;
        workStartTime: string;
        workEndTime: string;
        lateGracePeriod: number;
        geofenceRadius: number;
        latitude: import("@prisma/client/runtime/library").Decimal;
        longitude: import("@prisma/client/runtime/library").Decimal;
        timezone: string;
        earlyCheckInPeriod: number;
        earlyCheckOutPeriod: number;
        workingDays: string;
    })[]>;
    findBranchById(id: string): Promise<{
        departments: {
            id: string;
            name: string;
            nameEn: string | null;
            createdAt: Date;
            updatedAt: Date;
            companyId: string | null;
            branchId: string;
            workStartTime: string | null;
            workEndTime: string | null;
        }[];
        _count: {
            users: number;
            departments: number;
        };
        schedules: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string | null;
            branchId: string;
            workStartTime: string;
            workEndTime: string;
            dayOfWeek: number;
            isWorkingDay: boolean;
        }[];
    } & {
        id: string;
        name: string;
        nameEn: string | null;
        address: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        isActive: boolean;
        workStartTime: string;
        workEndTime: string;
        lateGracePeriod: number;
        geofenceRadius: number;
        latitude: import("@prisma/client/runtime/library").Decimal;
        longitude: import("@prisma/client/runtime/library").Decimal;
        timezone: string;
        earlyCheckInPeriod: number;
        earlyCheckOutPeriod: number;
        workingDays: string;
    }>;
    updateBranch(id: string, updateBranchDto: UpdateBranchDto, companyId: string): Promise<{
        id: string;
        name: string;
        nameEn: string | null;
        address: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        isActive: boolean;
        workStartTime: string;
        workEndTime: string;
        lateGracePeriod: number;
        geofenceRadius: number;
        latitude: import("@prisma/client/runtime/library").Decimal;
        longitude: import("@prisma/client/runtime/library").Decimal;
        timezone: string;
        earlyCheckInPeriod: number;
        earlyCheckOutPeriod: number;
        workingDays: string;
    }>;
    deleteBranch(id: string): Promise<{
        message: string;
    }>;
    toggleBranchStatus(id: string, companyId: string): Promise<{
        id: string;
        name: string;
        nameEn: string | null;
        address: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        isActive: boolean;
        workStartTime: string;
        workEndTime: string;
        lateGracePeriod: number;
        geofenceRadius: number;
        latitude: import("@prisma/client/runtime/library").Decimal;
        longitude: import("@prisma/client/runtime/library").Decimal;
        timezone: string;
        earlyCheckInPeriod: number;
        earlyCheckOutPeriod: number;
        workingDays: string;
    }>;
    getBranchSchedule(id: string, companyId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        branchId: string;
        workStartTime: string;
        workEndTime: string;
        dayOfWeek: number;
        isWorkingDay: boolean;
    }[]>;
    updateBranchSchedule(id: string, updateScheduleDto: UpdateScheduleDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        branchId: string;
        workStartTime: string;
        workEndTime: string;
        dayOfWeek: number;
        isWorkingDay: boolean;
    }[]>;
    createDepartment(createDepartmentDto: CreateDepartmentDto, companyId: string): Promise<{
        id: string;
        name: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        branchId: string;
        workStartTime: string | null;
        workEndTime: string | null;
    }>;
    findAllDepartments(companyId: string, branchId?: string): Promise<({
        _count: {
            users: number;
        };
        branch: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        name: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        branchId: string;
        workStartTime: string | null;
        workEndTime: string | null;
    })[]>;
    updateDepartment(id: string, updateData: Partial<CreateDepartmentDto>): Promise<{
        id: string;
        name: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        branchId: string;
        workStartTime: string | null;
        workEndTime: string | null;
    }>;
    deleteDepartment(id: string): Promise<{
        message: string;
    }>;
}
