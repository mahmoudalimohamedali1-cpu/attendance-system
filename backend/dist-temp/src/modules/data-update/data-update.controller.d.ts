import { Request } from 'express';
import { DataUpdateService } from './data-update.service';
import { CreateUpdateRequestDto, UpdateRequestType } from './dto/create-update-request.dto';
import { UpdateRequestStatus } from '@prisma/client';
interface AuthenticatedRequest extends Request {
    user: {
        id: string;
        email: string;
        role: string;
    };
}
export declare class DataUpdateController {
    private readonly dataUpdateService;
    constructor(dataUpdateService: DataUpdateService);
    createRequest(req: AuthenticatedRequest, data: CreateUpdateRequestDto): Promise<{
        success: boolean;
        request: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.UpdateRequestStatus;
            userId: string;
            reason: string | null;
            requestType: import(".prisma/client").$Enums.UpdateRequestType;
            reviewedAt: Date | null;
            reviewedBy: string | null;
            rejectionReason: string | null;
            newFaceEmbedding: string | null;
            newFaceImage: string | null;
            faceImageQuality: number | null;
            newDeviceId: string | null;
            newDeviceFingerprint: string | null;
            newDeviceName: string | null;
            newDeviceModel: string | null;
            newDeviceBrand: string | null;
            newDevicePlatform: import(".prisma/client").$Enums.DevicePlatform | null;
            newDeviceOsVersion: string | null;
            newDeviceAppVersion: string | null;
            reviewNote: string | null;
            newData: import("@prisma/client/runtime/library").JsonValue | null;
            oldDeviceId: string | null;
        };
        message: string;
    }>;
    getMyRequests(req: AuthenticatedRequest): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.UpdateRequestStatus;
        userId: string;
        reason: string | null;
        requestType: import(".prisma/client").$Enums.UpdateRequestType;
        reviewedAt: Date | null;
        reviewedBy: string | null;
        rejectionReason: string | null;
        newFaceEmbedding: string | null;
        newFaceImage: string | null;
        faceImageQuality: number | null;
        newDeviceId: string | null;
        newDeviceFingerprint: string | null;
        newDeviceName: string | null;
        newDeviceModel: string | null;
        newDeviceBrand: string | null;
        newDevicePlatform: import(".prisma/client").$Enums.DevicePlatform | null;
        newDeviceOsVersion: string | null;
        newDeviceAppVersion: string | null;
        reviewNote: string | null;
        newData: import("@prisma/client/runtime/library").JsonValue | null;
        oldDeviceId: string | null;
    }[]>;
    cancelRequest(req: AuthenticatedRequest, requestId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getPendingRequests(): Promise<{
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
        } | undefined;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.UpdateRequestStatus;
        userId: string;
        reason: string | null;
        requestType: import(".prisma/client").$Enums.UpdateRequestType;
        reviewedAt: Date | null;
        reviewedBy: string | null;
        rejectionReason: string | null;
        newFaceEmbedding: string | null;
        newFaceImage: string | null;
        faceImageQuality: number | null;
        newDeviceId: string | null;
        newDeviceFingerprint: string | null;
        newDeviceName: string | null;
        newDeviceModel: string | null;
        newDeviceBrand: string | null;
        newDevicePlatform: import(".prisma/client").$Enums.DevicePlatform | null;
        newDeviceOsVersion: string | null;
        newDeviceAppVersion: string | null;
        reviewNote: string | null;
        newData: import("@prisma/client/runtime/library").JsonValue | null;
        oldDeviceId: string | null;
    }[]>;
    getAllRequests(status?: UpdateRequestStatus, userId?: string, requestType?: UpdateRequestType, page?: string, limit?: string): Promise<{
        data: {
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
                employeeCode: string | null;
                branch: {
                    name: string;
                } | null;
            } | undefined;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.UpdateRequestStatus;
            userId: string;
            reason: string | null;
            requestType: import(".prisma/client").$Enums.UpdateRequestType;
            reviewedAt: Date | null;
            reviewedBy: string | null;
            rejectionReason: string | null;
            newFaceEmbedding: string | null;
            newFaceImage: string | null;
            faceImageQuality: number | null;
            newDeviceId: string | null;
            newDeviceFingerprint: string | null;
            newDeviceName: string | null;
            newDeviceModel: string | null;
            newDeviceBrand: string | null;
            newDevicePlatform: import(".prisma/client").$Enums.DevicePlatform | null;
            newDeviceOsVersion: string | null;
            newDeviceAppVersion: string | null;
            reviewNote: string | null;
            newData: import("@prisma/client/runtime/library").JsonValue | null;
            oldDeviceId: string | null;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getRequestDetails(requestId: string): Promise<{
        request: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.UpdateRequestStatus;
            userId: string;
            reason: string | null;
            requestType: import(".prisma/client").$Enums.UpdateRequestType;
            reviewedAt: Date | null;
            reviewedBy: string | null;
            rejectionReason: string | null;
            newFaceEmbedding: string | null;
            newFaceImage: string | null;
            faceImageQuality: number | null;
            newDeviceId: string | null;
            newDeviceFingerprint: string | null;
            newDeviceName: string | null;
            newDeviceModel: string | null;
            newDeviceBrand: string | null;
            newDevicePlatform: import(".prisma/client").$Enums.DevicePlatform | null;
            newDeviceOsVersion: string | null;
            newDeviceAppVersion: string | null;
            reviewNote: string | null;
            newData: import("@prisma/client/runtime/library").JsonValue | null;
            oldDeviceId: string | null;
        };
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            avatar: string | null;
            employeeCode: string | null;
            faceData: {
                faceImage: string | null;
                registeredAt: Date;
            } | null;
            branch: {
                name: string;
            } | null;
            department: {
                name: string;
            } | null;
            registeredDevices: {
                deviceId: string;
                deviceName: string | null;
                deviceModel: string | null;
                deviceBrand: string | null;
                platform: import(".prisma/client").$Enums.DevicePlatform;
                isMainDevice: boolean;
            }[];
        } | null;
    }>;
    approveRequest(req: AuthenticatedRequest, requestId: string, note?: string): Promise<{
        success: boolean;
        message: string;
    }>;
    rejectRequest(req: AuthenticatedRequest, requestId: string, reason: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
export {};
