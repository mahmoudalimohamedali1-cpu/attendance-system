import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateUpdateRequestDto, UpdateRequestType } from './dto/create-update-request.dto';
import { UpdateRequestStatus } from '@prisma/client';
export declare class DataUpdateService {
    private prisma;
    private notificationsService;
    private readonly logger;
    constructor(prisma: PrismaService, notificationsService: NotificationsService);
    createUpdateRequest(userId: string, data: CreateUpdateRequestDto): Promise<{
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
    getMyRequests(userId: string): Promise<{
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
    cancelRequest(userId: string, requestId: string): Promise<{
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
    approveRequest(requestId: string, adminId: string, note?: string): Promise<{
        success: boolean;
        message: string;
    }>;
    rejectRequest(requestId: string, adminId: string, reason: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getAllRequests(filters?: {
        status?: UpdateRequestStatus;
        userId?: string;
        requestType?: UpdateRequestType;
        page?: number;
        limit?: number;
    }): Promise<{
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
    private validateRequestData;
    private applyUpdates;
    private notifyAdmins;
    private getRequestTypeText;
}
