import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { VerifyDeviceDto } from './dto/verify-device.dto';
import { DeviceStatus, DevicePlatform, NotificationType } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * تسجيل جهاز جديد
   */
  async registerDevice(userId: string, data: RegisterDeviceDto) {
    // التحقق من وجود المستخدم
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { registeredDevices: true },
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    // إنشاء بصمة الجهاز
    const deviceFingerprint = this.generateDeviceFingerprint(data);

    // التحقق من وجود الجهاز مسبقاً
    const existingDevice = await this.prisma.registeredDevice.findUnique({
      where: {
        userId_deviceId: {
          userId,
          deviceId: data.deviceId,
        },
      },
    });

    if (existingDevice) {
      // تحديث معلومات الجهاز
      return this.prisma.registeredDevice.update({
        where: { id: existingDevice.id },
        data: {
          deviceFingerprint,
          deviceName: data.deviceName,
          deviceModel: data.deviceModel,
          deviceBrand: data.deviceBrand,
          platform: data.platform || DevicePlatform.UNKNOWN,
          osVersion: data.osVersion,
          appVersion: data.appVersion,
          lastUsedAt: new Date(),
          usageCount: { increment: 1 },
        },
      });
    }

    // التحقق من عدد الأجهزة المسجلة
    const activeDevicesCount = user.registeredDevices.filter(
      d => d.status === 'ACTIVE' || d.status === 'PENDING'
    ).length;

    // الحد الأقصى للأجهزة (يمكن تعديله من الإعدادات)
    const maxDevices = 2;
    if (activeDevicesCount >= maxDevices) {
      throw new BadRequestException(
        `لقد وصلت للحد الأقصى من الأجهزة المسجلة (${maxDevices}). يرجى حذف جهاز قديم أولاً.`
      );
    }

    // تحديد إذا كان الجهاز الأول (يصبح رئيسي تلقائياً)
    const isFirstDevice = user.registeredDevices.length === 0;

    // إنشاء سجل الجهاز الجديد
    const device = await this.prisma.registeredDevice.create({
      data: {
        userId,
        deviceId: data.deviceId,
        deviceFingerprint,
        deviceName: data.deviceName,
        deviceModel: data.deviceModel,
        deviceBrand: data.deviceBrand,
        platform: data.platform || DevicePlatform.UNKNOWN,
        osVersion: data.osVersion,
        appVersion: data.appVersion,
        status: isFirstDevice ? DeviceStatus.ACTIVE : DeviceStatus.PENDING,
        isMainDevice: isFirstDevice,
        lastUsedAt: new Date(),
      },
    });

    // إشعار المدير بطلب جهاز جديد (إذا لم يكن الجهاز الأول)
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

  /**
   * التحقق من الجهاز قبل تسجيل الحضور
   */
  async verifyDevice(userId: string, data: VerifyDeviceDto): Promise<DeviceVerificationResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { 
        registeredDevices: {
          where: { status: DeviceStatus.ACTIVE },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    // البحث عن الجهاز
    const device = user.registeredDevices.find(d => d.deviceId === data.deviceId);
    
    // تسجيل محاولة الوصول
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

    // إذا لم يكن للمستخدم أي أجهزة مسجلة، نسمح بالتسجيل
    if (user.registeredDevices.length === 0) {
      return {
        isVerified: true,
        requiresRegistration: true,
        message: 'لم يتم تسجيل أي جهاز بعد. سيتم تسجيل هذا الجهاز كجهاز رئيسي.',
      };
    }

    // التحقق من وجود الجهاز في القائمة
    if (!device) {
      // إشعار المدير بمحاولة استخدام جهاز غير مسجل
      await this.notifyAdminUnknownDevice(user, data);

      return {
        isVerified: false,
        isUnknownDevice: true,
        message: 'هذا الجهاز غير مسجل. لا يمكنك تسجيل الحضور من جهاز غير معتمد.',
      };
    }

    // التحقق من بصمة الجهاز (للتأكد من عدم التلاعب)
    if (data.deviceFingerprint && device.deviceFingerprint) {
      const fingerprintMatch = this.compareFingerprints(
        device.deviceFingerprint,
        data.deviceFingerprint
      );

      if (!fingerprintMatch) {
        await this.notifyAdminFingerprintMismatch(user, device, data);
        
        return {
          isVerified: false,
          isFingerprintMismatch: true,
          message: 'تم اكتشاف تغيير في بيانات الجهاز. تم إشعار المسؤول.',
        };
      }
    }

    // تحديث آخر استخدام
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

  /**
   * الحصول على أجهزة المستخدم
   */
  async getUserDevices(userId: string) {
    return this.prisma.registeredDevice.findMany({
      where: { userId },
      orderBy: [{ isMainDevice: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * حذف جهاز
   */
  async removeDevice(userId: string, deviceId: string) {
    const device = await this.prisma.registeredDevice.findFirst({
      where: { id: deviceId, userId },
    });

    if (!device) {
      throw new NotFoundException('الجهاز غير موجود');
    }

    // لا يمكن حذف الجهاز الرئيسي إذا كان هناك أجهزة أخرى
    if (device.isMainDevice) {
      const otherDevices = await this.prisma.registeredDevice.count({
        where: { userId, id: { not: deviceId }, status: DeviceStatus.ACTIVE },
      });

      if (otherDevices > 0) {
        throw new BadRequestException(
          'لا يمكن حذف الجهاز الرئيسي. قم بتعيين جهاز آخر كرئيسي أولاً.'
        );
      }
    }

    await this.prisma.registeredDevice.delete({
      where: { id: deviceId },
    });

    return { success: true, message: 'تم حذف الجهاز بنجاح' };
  }

  /**
   * تعيين جهاز كرئيسي
   */
  async setMainDevice(userId: string, deviceId: string) {
    const device = await this.prisma.registeredDevice.findFirst({
      where: { id: deviceId, userId, status: DeviceStatus.ACTIVE },
    });

    if (!device) {
      throw new NotFoundException('الجهاز غير موجود أو غير نشط');
    }

    // إزالة الرئيسي من الجهاز الحالي
    await this.prisma.registeredDevice.updateMany({
      where: { userId, isMainDevice: true },
      data: { isMainDevice: false },
    });

    // تعيين الجهاز الجديد كرئيسي
    await this.prisma.registeredDevice.update({
      where: { id: deviceId },
      data: { isMainDevice: true },
    });

    return { success: true, message: 'تم تعيين الجهاز كجهاز رئيسي' };
  }

  // ============ Admin Methods ============

  /**
   * الموافقة على جهاز
   */
  async approveDevice(deviceId: string, adminId: string) {
    const device = await this.prisma.registeredDevice.findUnique({
      where: { id: deviceId },
      include: { user: true },
    });

    if (!device) {
      throw new NotFoundException('الجهاز غير موجود');
    }

    if (device.status !== DeviceStatus.PENDING) {
      throw new BadRequestException('الجهاز ليس في حالة انتظار');
    }

    await this.prisma.registeredDevice.update({
      where: { id: deviceId },
      data: {
        status: DeviceStatus.ACTIVE,
        approvedBy: adminId,
        approvedAt: new Date(),
      },
    });

    // إشعار الموظف
    await this.notificationsService.sendNotification(
      device.userId,
      NotificationType.GENERAL,
      'تمت الموافقة على جهازك',
      `تمت الموافقة على تسجيل جهازك "${device.deviceName || device.deviceModel}"`,
    );

    return { success: true, message: 'تمت الموافقة على الجهاز' };
  }

  /**
   * حظر جهاز
   */
  async blockDevice(deviceId: string, adminId: string, reason?: string) {
    const device = await this.prisma.registeredDevice.findUnique({
      where: { id: deviceId },
      include: { user: true },
    });

    if (!device) {
      throw new NotFoundException('الجهاز غير موجود');
    }

    await this.prisma.registeredDevice.update({
      where: { id: deviceId },
      data: {
        status: DeviceStatus.BLOCKED,
        blockedReason: reason,
        isMainDevice: false,
      },
    });

    // إشعار الموظف
    await this.notificationsService.sendNotification(
      device.userId,
      NotificationType.SUSPICIOUS_ACTIVITY,
      'تم حظر جهازك',
      `تم حظر جهازك "${device.deviceName || device.deviceModel}". السبب: ${reason || 'غير محدد'}`,
    );

    return { success: true, message: 'تم حظر الجهاز' };
  }

  /**
   * قائمة الأجهزة المعلقة
   */
  async getPendingDevices() {
    return this.prisma.registeredDevice.findMany({
      where: { status: DeviceStatus.PENDING },
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

  /**
   * قائمة جميع الأجهزة
   */
  async getAllDevices(filters?: { userId?: string; status?: DeviceStatus; branchId?: string }) {
    const where: any = {};

    if (filters?.userId) where.userId = filters.userId;
    if (filters?.status) where.status = filters.status;
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

  /**
   * سجل محاولات الوصول
   */
  async getAccessLogs(filters?: { userId?: string; deviceId?: string; limit?: number }) {
    const where: any = {};

    if (filters?.userId) where.userId = filters.userId;
    if (filters?.deviceId) where.deviceId = filters.deviceId;

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

  // ============ Private Methods ============

  /**
   * إنشاء بصمة الجهاز
   */
  private generateDeviceFingerprint(data: RegisterDeviceDto): string {
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

  /**
   * مقارنة بصمات الأجهزة
   */
  private compareFingerprints(stored: string, current: string): boolean {
    // نسمح بتطابق 80% على الأقل
    // لأن بعض المعلومات قد تتغير بتحديثات النظام
    return stored === current;
  }

  /**
   * تسجيل محاولة وصول
   */
  private async logDeviceAccess(data: {
    userId: string;
    deviceId?: string;
    attemptedDeviceId: string;
    actionType: string;
    isSuccess: boolean;
    isKnownDevice: boolean;
    deviceInfo?: string;
    ipAddress?: string;
    location?: string;
    failureReason?: string;
  }) {
    try {
      await this.prisma.deviceAccessLog.create({ data });
    } catch (error) {
      this.logger.error('Failed to log device access:', error);
    }
  }

  /**
   * إشعار المدير بجهاز جديد
   */
  private async notifyAdminNewDevice(user: any, device: any) {
    const admins = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'MANAGER'] } },
    });

    for (const admin of admins) {
      if (admin.role === 'ADMIN' || admin.id === user.managerId) {
        await this.notificationsService.sendNotification(
          admin.id,
          NotificationType.GENERAL,
          'طلب تسجيل جهاز جديد',
          `${user.firstName} ${user.lastName} يطلب تسجيل جهاز جديد: ${device.deviceName || device.deviceModel}`,
          { userId: user.id, deviceId: device.id },
        );
      }
    }
  }

  /**
   * إشعار المدير بمحاولة من جهاز غير معروف
   */
  private async notifyAdminUnknownDevice(user: any, data: VerifyDeviceDto) {
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
    });

    for (const admin of admins) {
      await this.notificationsService.sendNotification(
        admin.id,
        NotificationType.SUSPICIOUS_ACTIVITY,
        'محاولة حضور من جهاز غير مسجل',
        `${user.firstName} ${user.lastName} حاول تسجيل الحضور من جهاز غير مسجل: ${data.deviceModel || data.deviceId}`,
        { userId: user.id, deviceId: data.deviceId },
      );
    }
  }

  /**
   * إشعار المدير بعدم تطابق البصمة
   */
  private async notifyAdminFingerprintMismatch(user: any, device: any, data: VerifyDeviceDto) {
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
    });

    for (const admin of admins) {
      await this.notificationsService.sendNotification(
        admin.id,
        NotificationType.SUSPICIOUS_ACTIVITY,
        'تحذير: تغيير في بصمة الجهاز',
        `تم اكتشاف تغيير في بصمة جهاز ${user.firstName} ${user.lastName}. قد يكون هناك محاولة تلاعب.`,
        { userId: user.id, deviceId: device.id },
      );
    }
  }
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

