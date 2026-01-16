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
var DevicesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevicesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const client_1 = require("@prisma/client");
const crypto = require("crypto");
let DevicesService = DevicesService_1 = class DevicesService {
    constructor(prisma, notificationsService) {
        this.prisma = prisma;
        this.notificationsService = notificationsService;
        this.logger = new common_1.Logger(DevicesService_1.name);
    }
    async registerDevice(userId, data) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { registeredDevices: true },
        });
        if (!user) {
            throw new common_1.NotFoundException('المستخدم غير موجود');
        }
        const deviceFingerprint = this.generateDeviceFingerprint(data);
        const existingDevice = await this.prisma.registeredDevice.findUnique({
            where: {
                userId_deviceId: {
                    userId,
                    deviceId: data.deviceId,
                },
            },
        });
        if (existingDevice) {
            return this.prisma.registeredDevice.update({
                where: { id: existingDevice.id },
                data: {
                    deviceFingerprint,
                    deviceName: data.deviceName,
                    deviceModel: data.deviceModel,
                    deviceBrand: data.deviceBrand,
                    platform: data.platform || client_1.DevicePlatform.UNKNOWN,
                    osVersion: data.osVersion,
                    appVersion: data.appVersion,
                    lastUsedAt: new Date(),
                    usageCount: { increment: 1 },
                },
            });
        }
        const activeDevicesCount = user.registeredDevices.filter(d => d.status === 'ACTIVE' || d.status === 'PENDING').length;
        const maxDevices = 2;
        if (activeDevicesCount >= maxDevices) {
            throw new common_1.BadRequestException(`لقد وصلت للحد الأقصى من الأجهزة المسجلة (${maxDevices}). يرجى حذف جهاز قديم أولاً.`);
        }
        const isFirstDevice = user.registeredDevices.length === 0;
        const device = await this.prisma.registeredDevice.create({
            data: {
                userId,
                deviceId: data.deviceId,
                deviceFingerprint,
                deviceName: data.deviceName,
                deviceModel: data.deviceModel,
                deviceBrand: data.deviceBrand,
                platform: data.platform || client_1.DevicePlatform.UNKNOWN,
                osVersion: data.osVersion,
                appVersion: data.appVersion,
                status: isFirstDevice ? client_1.DeviceStatus.ACTIVE : client_1.DeviceStatus.PENDING,
                isMainDevice: isFirstDevice,
                lastUsedAt: new Date(),
            },
        });
        if (!isFirstDevice) {
            await this.notifyAdminNewDevice(user, device);
        }
        this.logger.log(`Device registered for user ${userId}: ${data.deviceId}`);
        return {
            success: true,
            device,
            message: isFirstDevice
                ? 'تم تسجيل الجهاز بنجاح كجهاز رئيسي'
                : 'تم تسجيل الجهاز وينتظر موافقة المسؤول',
            requiresApproval: !isFirstDevice,
        };
    }
    async verifyDevice(userId, data) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                registeredDevices: {
                    where: { status: client_1.DeviceStatus.ACTIVE },
                },
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('المستخدم غير موجود');
        }
        const device = user.registeredDevices.find(d => d.deviceId === data.deviceId);
        await this.logDeviceAccess({
            userId,
            deviceId: device?.id,
            attemptedDeviceId: data.deviceId,
            actionType: data.actionType || 'CHECK_IN',
            isSuccess: !!device,
            isKnownDevice: !!device,
            deviceInfo: JSON.stringify(data),
            ipAddress: data.ipAddress,
            location: data.latitude && data.longitude ? `${data.latitude},${data.longitude}` : undefined,
            failureReason: device ? undefined : 'جهاز غير مسجل',
        });
        if (user.registeredDevices.length === 0) {
            return {
                isVerified: true,
                requiresRegistration: true,
                message: 'لم يتم تسجيل أي جهاز بعد. سيتم تسجيل هذا الجهاز كجهاز رئيسي.',
            };
        }
        if (!device) {
            await this.notifyAdminUnknownDevice(user, data);
            return {
                isVerified: false,
                isUnknownDevice: true,
                message: 'هذا الجهاز غير مسجل. لا يمكنك تسجيل الحضور من جهاز غير معتمد.',
            };
        }
        if (data.deviceFingerprint && device.deviceFingerprint) {
            const fingerprintMatch = this.compareFingerprints(device.deviceFingerprint, data.deviceFingerprint);
            if (!fingerprintMatch) {
                await this.notifyAdminFingerprintMismatch(user, device, data);
                return {
                    isVerified: false,
                    isFingerprintMismatch: true,
                    message: 'تم اكتشاف تغيير في بيانات الجهاز. تم إشعار المسؤول.',
                };
            }
        }
        await this.prisma.registeredDevice.update({
            where: { id: device.id },
            data: {
                lastUsedAt: new Date(),
                usageCount: { increment: 1 },
                appVersion: data.appVersion || device.appVersion,
            },
        });
        return {
            isVerified: true,
            deviceId: device.id,
            isMainDevice: device.isMainDevice,
            message: 'تم التحقق من الجهاز بنجاح',
        };
    }
    async getUserDevices(userId) {
        return this.prisma.registeredDevice.findMany({
            where: { userId },
            orderBy: [{ isMainDevice: 'desc' }, { createdAt: 'desc' }],
        });
    }
    async removeDevice(userId, deviceId) {
        const device = await this.prisma.registeredDevice.findFirst({
            where: { id: deviceId, userId },
        });
        if (!device) {
            throw new common_1.NotFoundException('الجهاز غير موجود');
        }
        if (device.isMainDevice) {
            const otherDevices = await this.prisma.registeredDevice.count({
                where: { userId, id: { not: deviceId }, status: client_1.DeviceStatus.ACTIVE },
            });
            if (otherDevices > 0) {
                throw new common_1.BadRequestException('لا يمكن حذف الجهاز الرئيسي. قم بتعيين جهاز آخر كرئيسي أولاً.');
            }
        }
        await this.prisma.registeredDevice.delete({
            where: { id: deviceId },
        });
        return { success: true, message: 'تم حذف الجهاز بنجاح' };
    }
    async setMainDevice(userId, deviceId) {
        const device = await this.prisma.registeredDevice.findFirst({
            where: { id: deviceId, userId, status: client_1.DeviceStatus.ACTIVE },
        });
        if (!device) {
            throw new common_1.NotFoundException('الجهاز غير موجود أو غير نشط');
        }
        await this.prisma.registeredDevice.updateMany({
            where: { userId, isMainDevice: true },
            data: { isMainDevice: false },
        });
        await this.prisma.registeredDevice.update({
            where: { id: deviceId },
            data: { isMainDevice: true },
        });
        return { success: true, message: 'تم تعيين الجهاز كجهاز رئيسي' };
    }
    async approveDevice(deviceId, adminId) {
        const device = await this.prisma.registeredDevice.findUnique({
            where: { id: deviceId },
            include: { user: true },
        });
        if (!device) {
            throw new common_1.NotFoundException('الجهاز غير موجود');
        }
        if (device.status !== client_1.DeviceStatus.PENDING) {
            throw new common_1.BadRequestException('الجهاز ليس في حالة انتظار');
        }
        await this.prisma.registeredDevice.update({
            where: { id: deviceId },
            data: {
                status: client_1.DeviceStatus.ACTIVE,
                approvedBy: adminId,
                approvedAt: new Date(),
            },
        });
        await this.notificationsService.sendNotification(device.userId, client_1.NotificationType.GENERAL, 'تمت الموافقة على جهازك', `تمت الموافقة على تسجيل جهازك "${device.deviceName || device.deviceModel}"`);
        return { success: true, message: 'تمت الموافقة على الجهاز' };
    }
    async blockDevice(deviceId, adminId, reason) {
        const device = await this.prisma.registeredDevice.findUnique({
            where: { id: deviceId },
            include: { user: true },
        });
        if (!device) {
            throw new common_1.NotFoundException('الجهاز غير موجود');
        }
        await this.prisma.registeredDevice.update({
            where: { id: deviceId },
            data: {
                status: client_1.DeviceStatus.BLOCKED,
                blockedReason: reason,
                isMainDevice: false,
            },
        });
        await this.notificationsService.sendNotification(device.userId, client_1.NotificationType.SUSPICIOUS_ACTIVITY, 'تم حظر جهازك', `تم حظر جهازك "${device.deviceName || device.deviceModel}". السبب: ${reason || 'غير محدد'}`);
        return { success: true, message: 'تم حظر الجهاز' };
    }
    async getPendingDevices() {
        return this.prisma.registeredDevice.findMany({
            where: { status: client_1.DeviceStatus.PENDING },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        employeeCode: true,
                        branch: { select: { name: true } },
                        department: { select: { name: true } },
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
    }
    async getAllDevices(filters) {
        const where = {};
        if (filters?.userId)
            where.userId = filters.userId;
        if (filters?.status)
            where.status = filters.status;
        if (filters?.branchId) {
            where.user = { branchId: filters.branchId };
        }
        return this.prisma.registeredDevice.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        employeeCode: true,
                        branch: { select: { name: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getAccessLogs(filters) {
        const where = {};
        if (filters?.userId)
            where.userId = filters.userId;
        if (filters?.deviceId)
            where.deviceId = filters.deviceId;
        return this.prisma.deviceAccessLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: filters?.limit || 100,
            include: {
                device: {
                    select: { deviceName: true, deviceModel: true },
                },
            },
        });
    }
    generateDeviceFingerprint(data) {
        const fingerprintData = [
            data.deviceId,
            data.deviceModel,
            data.deviceBrand,
            data.platform,
            data.osVersion,
        ].filter(Boolean).join('|');
        return crypto
            .createHash('sha256')
            .update(fingerprintData)
            .digest('hex');
    }
    compareFingerprints(stored, current) {
        return stored === current;
    }
    async logDeviceAccess(data) {
        try {
            await this.prisma.deviceAccessLog.create({ data });
        }
        catch (error) {
            this.logger.error('Failed to log device access:', error);
        }
    }
    async notifyAdminNewDevice(user, device) {
        const admins = await this.prisma.user.findMany({
            where: { role: { in: ['ADMIN', 'MANAGER'] } },
        });
        for (const admin of admins) {
            if (admin.role === 'ADMIN' || admin.id === user.managerId) {
                await this.notificationsService.sendNotification(admin.id, client_1.NotificationType.GENERAL, 'طلب تسجيل جهاز جديد', `${user.firstName} ${user.lastName} يطلب تسجيل جهاز جديد: ${device.deviceName || device.deviceModel}`, { userId: user.id, deviceId: device.id });
            }
        }
    }
    async notifyAdminUnknownDevice(user, data) {
        const admins = await this.prisma.user.findMany({
            where: { role: 'ADMIN' },
        });
        for (const admin of admins) {
            await this.notificationsService.sendNotification(admin.id, client_1.NotificationType.SUSPICIOUS_ACTIVITY, 'محاولة حضور من جهاز غير مسجل', `${user.firstName} ${user.lastName} حاول تسجيل الحضور من جهاز غير مسجل: ${data.deviceModel || data.deviceId}`, { userId: user.id, deviceId: data.deviceId });
        }
    }
    async notifyAdminFingerprintMismatch(user, device, data) {
        const admins = await this.prisma.user.findMany({
            where: { role: 'ADMIN' },
        });
        for (const admin of admins) {
            await this.notificationsService.sendNotification(admin.id, client_1.NotificationType.SUSPICIOUS_ACTIVITY, 'تحذير: تغيير في بصمة الجهاز', `تم اكتشاف تغيير في بصمة جهاز ${user.firstName} ${user.lastName}. قد يكون هناك محاولة تلاعب.`, { userId: user.id, deviceId: device.id });
        }
    }
};
exports.DevicesService = DevicesService;
exports.DevicesService = DevicesService = DevicesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], DevicesService);
//# sourceMappingURL=devices.service.js.map