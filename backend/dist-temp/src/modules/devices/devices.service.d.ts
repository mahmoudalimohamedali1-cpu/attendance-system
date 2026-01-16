import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { VerifyDeviceDto } from './dto/verify-device.dto';
import { DeviceStatus } from '@prisma/client';
export declare class DevicesService {
    private prisma;
    private notificationsService;
    private readonly logger;
    constructor(prisma: PrismaService, notificationsService: NotificationsService);
    registerDevice(userId: string, data: RegisterDeviceDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.DeviceStatus;
        userId: string;
        approvedAt: Date | null;
        approvedBy: string | null;
        deviceId: string;
        deviceFingerprint: string | null;
        deviceName: string | null;
        deviceModel: string | null;
        deviceBrand: string | null;
        platform: import(".prisma/client").$Enums.DevicePlatform;
        osVersion: string | null;
        appVersion: string | null;
        isMainDevice: boolean;
        blockedReason: string | null;
        lastUsedAt: Date | null;
        usageCount: number;
    } | {
        success: boolean;
        device: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.DeviceStatus;
            userId: string;
            approvedAt: Date | null;
            approvedBy: string | null;
            deviceId: string;
            deviceFingerprint: string | null;
            deviceName: string | null;
            deviceModel: string | null;
            deviceBrand: string | null;
            platform: import(".prisma/client").$Enums.DevicePlatform;
            osVersion: string | null;
            appVersion: string | null;
            isMainDevice: boolean;
            blockedReason: string | null;
            lastUsedAt: Date | null;
            usageCount: number;
        };
        message: string;
        requiresApproval: boolean;
    }>;
    verifyDevice(userId: string, data: VerifyDeviceDto): Promise<DeviceVerificationResult>;
    getUserDevices(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.DeviceStatus;
        userId: string;
        approvedAt: Date | null;
        approvedBy: string | null;
        deviceId: string;
        deviceFingerprint: string | null;
        deviceName: string | null;
        deviceModel: string | null;
        deviceBrand: string | null;
        platform: import(".prisma/client").$Enums.DevicePlatform;
        osVersion: string | null;
        appVersion: string | null;
        isMainDevice: boolean;
        blockedReason: string | null;
        lastUsedAt: Date | null;
        usageCount: number;
    }[]>;
    removeDevice(userId: string, deviceId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    setMainDevice(userId: string, deviceId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    approveDevice(deviceId: string, adminId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    blockDevice(deviceId: string, adminId: string, reason?: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getPendingDevices(): Promise<({
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            employeeCode: string | null;
            branch: {
                name: string;
            } | null;
            department: {
                name: string;
            } | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.DeviceStatus;
        userId: string;
        approvedAt: Date | null;
        approvedBy: string | null;
        deviceId: string;
        deviceFingerprint: string | null;
        deviceName: string | null;
        deviceModel: string | null;
        deviceBrand: string | null;
        platform: import(".prisma/client").$Enums.DevicePlatform;
        osVersion: string | null;
        appVersion: string | null;
        isMainDevice: boolean;
        blockedReason: string | null;
        lastUsedAt: Date | null;
        usageCount: number;
    })[]>;
    getAllDevices(filters?: {
        userId?: string;
        status?: DeviceStatus;
        branchId?: string;
    }): Promise<({
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            employeeCode: string | null;
            branch: {
                name: string;
            } | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.DeviceStatus;
        userId: string;
        approvedAt: Date | null;
        approvedBy: string | null;
        deviceId: string;
        deviceFingerprint: string | null;
        deviceName: string | null;
        deviceModel: string | null;
        deviceBrand: string | null;
        platform: import(".prisma/client").$Enums.DevicePlatform;
        osVersion: string | null;
        appVersion: string | null;
        isMainDevice: boolean;
        blockedReason: string | null;
        lastUsedAt: Date | null;
        usageCount: number;
    })[]>;
    getAccessLogs(filters?: {
        userId?: string;
        deviceId?: string;
        limit?: number;
    }): Promise<({
        device: {
            deviceName: string | null;
            deviceModel: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        deviceInfo: string | null;
        userId: string;
        ipAddress: string | null;
        actionType: string;
        isSuccess: boolean;
        deviceId: string | null;
        attemptedDeviceId: string;
        isKnownDevice: boolean;
        location: string | null;
        failureReason: string | null;
    })[]>;
    private generateDeviceFingerprint;
    private compareFingerprints;
    private logDeviceAccess;
    private notifyAdminNewDevice;
    private notifyAdminUnknownDevice;
    private notifyAdminFingerprintMismatch;
}
export interface DeviceVerificationResult {
    isVerified: boolean;
    deviceId?: string;
    isMainDevice?: boolean;
    isUnknownDevice?: boolean;
    isFingerprintMismatch?: boolean;
    requiresRegistration?: boolean;
    message: string;
}
