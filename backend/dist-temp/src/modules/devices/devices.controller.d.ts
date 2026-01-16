import { Request } from 'express';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { VerifyDeviceDto } from './dto/verify-device.dto';
import { DeviceStatus } from '@prisma/client';
interface AuthenticatedRequest extends Request {
    user: {
        id: string;
        email: string;
        role: string;
    };
}
export declare class DevicesController {
    private readonly devicesService;
    constructor(devicesService: DevicesService);
    registerDevice(req: AuthenticatedRequest, data: RegisterDeviceDto): Promise<{
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
    verifyDevice(req: AuthenticatedRequest, data: VerifyDeviceDto): Promise<import("./devices.service").DeviceVerificationResult>;
    getMyDevices(req: AuthenticatedRequest): Promise<{
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
    removeDevice(req: AuthenticatedRequest, deviceId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    setMainDevice(req: AuthenticatedRequest, deviceId: string): Promise<{
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
    getAllDevices(userId?: string, status?: DeviceStatus, branchId?: string): Promise<({
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
    approveDevice(req: AuthenticatedRequest, deviceId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    blockDevice(req: AuthenticatedRequest, deviceId: string, reason?: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getAccessLogs(userId?: string, deviceId?: string, limit?: string): Promise<({
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
}
export {};
