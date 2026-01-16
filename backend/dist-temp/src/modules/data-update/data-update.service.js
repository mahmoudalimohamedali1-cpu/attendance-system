"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DataUpdateService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataUpdateService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const create_update_request_dto_1 = require("./dto/create-update-request.dto");
const client_1 = require("@prisma/client");
let DataUpdateService = DataUpdateService_1 = class DataUpdateService {
    constructor(prisma, notificationsService) {
        this.prisma = prisma;
        this.notificationsService = notificationsService;
        this.logger = new common_1.Logger(DataUpdateService_1.name);
    }
    async createUpdateRequest(userId, data) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                registeredDevices: { where: { status: client_1.DeviceStatus.ACTIVE } },
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('المستخدم غير موجود');
        }
        const pendingRequest = await this.prisma.dataUpdateRequest.findFirst({
            where: { userId, status: client_1.UpdateRequestStatus.PENDING },
        });
        if (pendingRequest) {
            throw new common_1.BadRequestException('لديك طلب تحديث قيد المراجعة. يرجى الانتظار حتى تتم مراجعته.');
        }
        this.validateRequestData(data);
        const mainDevice = user.registeredDevices.find(d => d.isMainDevice);
        const request = await this.prisma.dataUpdateRequest.create({
            data: {
                userId,
                requestType: data.requestType,
                reason: data.reason,
                newFaceEmbedding: data.newFaceEmbedding
                    ? JSON.stringify(data.newFaceEmbedding)
                    : undefined,
                newFaceImage: data.newFaceImage,
                faceImageQuality: data.faceImageQuality,
                newDeviceId: data.newDeviceId,
                newDeviceFingerprint: data.newDeviceFingerprint,
                newDeviceName: data.newDeviceName,
                newDeviceModel: data.newDeviceModel,
                newDeviceBrand: data.newDeviceBrand,
                newDevicePlatform: data.newDevicePlatform,
                newDeviceOsVersion: data.newDeviceOsVersion,
                newDeviceAppVersion: data.newDeviceAppVersion,
                oldDeviceId: mainDevice?.deviceId,
            },
        });
        await this.notifyAdmins(user, data.requestType, request.id);
        this.logger.log(`Data update request created: ${request.id} for user ${userId}`);
        return {
            success: true,
            request,
            message: 'تم إرسال طلب التحديث بنجاح. سيتم مراجعته من قبل المسؤول.',
        };
    }
    async getMyRequests(userId) {
        return this.prisma.dataUpdateRequest.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async cancelRequest(userId, requestId) {
        const request = await this.prisma.dataUpdateRequest.findFirst({
            where: { id: requestId, userId, status: client_1.UpdateRequestStatus.PENDING },
        });
        if (!request) {
            throw new common_1.NotFoundException('الطلب غير موجود أو لا يمكن إلغاؤه');
        }
        await this.prisma.dataUpdateRequest.update({
            where: { id: requestId },
            data: { status: client_1.UpdateRequestStatus.CANCELLED },
        });
        return { success: true, message: 'تم إلغاء الطلب بنجاح' };
    }
    async getPendingRequests() {
        const requests = await this.prisma.dataUpdateRequest.findMany({
            where: { status: client_1.UpdateRequestStatus.PENDING },
            orderBy: { createdAt: 'asc' },
        });
        const userIds = [...new Set(requests.map(r => r.userId))];
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                employeeCode: true,
                branch: { select: { name: true } },
                department: { select: { name: true } },
            },
        });
        const usersMap = new Map(users.map(u => [u.id, u]));
        return requests.map(r => ({
            ...r,
            user: usersMap.get(r.userId),
        }));
    }
    async getRequestDetails(requestId) {
        const request = await this.prisma.dataUpdateRequest.findUnique({
            where: { id: requestId },
        });
        if (!request) {
            throw new common_1.NotFoundException('الطلب غير موجود');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: request.userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                employeeCode: true,
                avatar: true,
                branch: { select: { name: true } },
                department: { select: { name: true } },
                faceData: {
                    select: {
                        faceImage: true,
                        registeredAt: true,
                    },
                },
                registeredDevices: {
                    where: { status: client_1.DeviceStatus.ACTIVE },
                    select: {
                        deviceId: true,
                        deviceName: true,
                        deviceModel: true,
                        deviceBrand: true,
                        platform: true,
                        isMainDevice: true,
                    },
                },
            },
        });
        return { request, user };
    }
    async approveRequest(requestId, adminId, note) {
        const request = await this.prisma.dataUpdateRequest.findUnique({
            where: { id: requestId },
        });
        if (!request) {
            throw new common_1.NotFoundException('الطلب غير موجود');
        }
        if (request.status !== client_1.UpdateRequestStatus.PENDING) {
            throw new common_1.BadRequestException('الطلب ليس في حالة انتظار');
        }
        await this.applyUpdates(request);
        await this.prisma.dataUpdateRequest.update({
            where: { id: requestId },
            data: {
                status: client_1.UpdateRequestStatus.APPROVED,
                reviewedBy: adminId,
                reviewedAt: new Date(),
                reviewNote: note,
            },
        });
        await this.notificationsService.sendNotification(request.userId, client_1.NotificationType.GENERAL, 'تمت الموافقة على طلب التحديث', 'تم تحديث بياناتك بنجاح. يمكنك الآن استخدام النظام بالبيانات الجديدة.');
        this.logger.log(`Update request ${requestId} approved by ${adminId}`);
        return { success: true, message: 'تمت الموافقة وتطبيق التحديثات بنجاح' };
    }
    async rejectRequest(requestId, adminId, reason) {
        const request = await this.prisma.dataUpdateRequest.findUnique({
            where: { id: requestId },
        });
        if (!request) {
            throw new common_1.NotFoundException('الطلب غير موجود');
        }
        if (request.status !== client_1.UpdateRequestStatus.PENDING) {
            throw new common_1.BadRequestException('الطلب ليس في حالة انتظار');
        }
        await this.prisma.dataUpdateRequest.update({
            where: { id: requestId },
            data: {
                status: client_1.UpdateRequestStatus.REJECTED,
                reviewedBy: adminId,
                reviewedAt: new Date(),
                rejectionReason: reason,
            },
        });
        await this.notificationsService.sendNotification(request.userId, client_1.NotificationType.GENERAL, 'تم رفض طلب التحديث', `تم رفض طلب تحديث بياناتك. السبب: ${reason}`);
        return { success: true, message: 'تم رفض الطلب' };
    }
    async getAllRequests(filters) {
        const where = {};
        if (filters?.status)
            where.status = filters.status;
        if (filters?.userId)
            where.userId = filters.userId;
        if (filters?.requestType)
            where.requestType = filters.requestType;
        const page = filters?.page || 1;
        const limit = filters?.limit || 20;
        const [requests, total] = await Promise.all([
            this.prisma.dataUpdateRequest.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.dataUpdateRequest.count({ where }),
        ]);
        const userIds = [...new Set(requests.map(r => r.userId))];
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                employeeCode: true,
                branch: { select: { name: true } },
            },
        });
        const usersMap = new Map(users.map(u => [u.id, u]));
        const requestsWithUsers = requests.map(r => ({
            ...r,
            user: usersMap.get(r.userId),
        }));
        return {
            data: requestsWithUsers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    validateRequestData(data) {
        const { requestType } = data;
        if (requestType === create_update_request_dto_1.UpdateRequestType.FACE_UPDATE || requestType === create_update_request_dto_1.UpdateRequestType.BOTH) {
            if (!data.newFaceEmbedding && !data.newFaceImage) {
                throw new common_1.BadRequestException('بيانات الوجه مطلوبة لهذا النوع من التحديث');
            }
        }
        if (requestType === create_update_request_dto_1.UpdateRequestType.DEVICE_UPDATE ||
            requestType === create_update_request_dto_1.UpdateRequestType.DEVICE_CHANGE ||
            requestType === create_update_request_dto_1.UpdateRequestType.BOTH) {
            if (!data.newDeviceId) {
                throw new common_1.BadRequestException('بيانات الجهاز مطلوبة لهذا النوع من التحديث');
            }
        }
    }
    async applyUpdates(request) {
        const { requestType, userId } = request;
        if (requestType === 'FACE_UPDATE' ||
            requestType === 'BOTH') {
            if (request.newFaceEmbedding) {
                await this.prisma.faceData.upsert({
                    where: { userId },
                    create: {
                        userId,
                        faceEmbedding: request.newFaceEmbedding,
                        faceImage: request.newFaceImage,
                        imageQuality: request.faceImageQuality,
                    },
                    update: {
                        faceEmbedding: request.newFaceEmbedding,
                        faceImage: request.newFaceImage,
                        imageQuality: request.faceImageQuality,
                        registeredAt: new Date(),
                    },
                });
                await this.prisma.user.update({
                    where: { id: userId },
                    data: { faceRegistered: true },
                });
            }
        }
        if (requestType === 'DEVICE_UPDATE' ||
            requestType === 'DEVICE_CHANGE' ||
            requestType === 'BOTH') {
            if (request.newDeviceId) {
                if (requestType === 'DEVICE_CHANGE' && request.oldDeviceId) {
                    await this.prisma.registeredDevice.updateMany({
                        where: { userId, deviceId: request.oldDeviceId },
                        data: {
                            status: client_1.DeviceStatus.INACTIVE,
                            isMainDevice: false,
                        },
                    });
                }
                await this.prisma.registeredDevice.upsert({
                    where: {
                        userId_deviceId: {
                            userId,
                            deviceId: request.newDeviceId,
                        },
                    },
                    create: {
                        userId,
                        deviceId: request.newDeviceId,
                        deviceFingerprint: request.newDeviceFingerprint,
                        deviceName: request.newDeviceName,
                        deviceModel: request.newDeviceModel,
                        deviceBrand: request.newDeviceBrand,
                        platform: request.newDevicePlatform || 'UNKNOWN',
                        osVersion: request.newDeviceOsVersion,
                        appVersion: request.newDeviceAppVersion,
                        status: client_1.DeviceStatus.ACTIVE,
                        isMainDevice: true,
                        approvedAt: new Date(),
                    },
                    update: {
                        deviceFingerprint: request.newDeviceFingerprint,
                        deviceName: request.newDeviceName,
                        deviceModel: request.newDeviceModel,
                        deviceBrand: request.newDeviceBrand,
                        platform: request.newDevicePlatform || 'UNKNOWN',
                        osVersion: request.newDeviceOsVersion,
                        appVersion: request.newDeviceAppVersion,
                        status: client_1.DeviceStatus.ACTIVE,
                        isMainDevice: true,
                        approvedAt: new Date(),
                    },
                });
                await this.prisma.registeredDevice.updateMany({
                    where: {
                        userId,
                        deviceId: { not: request.newDeviceId },
                    },
                    data: { isMainDevice: false },
                });
            }
        }
    }
    async notifyAdmins(user, requestType, requestId) {
        const admins = await this.prisma.user.findMany({
            where: { role: { in: ['ADMIN', 'MANAGER'] } },
        });
        const typeText = this.getRequestTypeText(requestType);
        for (const admin of admins) {
            await this.notificationsService.sendNotification(admin.id, client_1.NotificationType.GENERAL, 'طلب تحديث بيانات جديد', `${user.firstName} ${user.lastName} يطلب ${typeText}`, { requestId, userId: user.id });
        }
    }
    getRequestTypeText(type) {
        switch (type) {
            case 'FACE_UPDATE':
                return 'تحديث بيانات الوجه';
            case 'DEVICE_UPDATE':
                return 'تحديث بيانات الجهاز';
            case 'DEVICE_CHANGE':
                return 'تغيير الجهاز (موبايل جديد)';
            case 'BOTH':
                return 'تحديث بيانات الوجه والجهاز';
            case 'PROFILE_UPDATE':
                return 'تحديث بيانات الملف الشخصي';
            default:
                return 'تحديث بيانات';
        }
    }
};
exports.DataUpdateService = DataUpdateService;
exports.DataUpdateService = DataUpdateService = DataUpdateService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], DataUpdateService);
//# sourceMappingURL=data-update.service.js.map