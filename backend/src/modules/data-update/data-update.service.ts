import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateUpdateRequestDto, UpdateRequestType } from './dto/create-update-request.dto';
import { UpdateRequestStatus, NotificationType, DeviceStatus } from '@prisma/client';

@Injectable()
export class DataUpdateService {
  private readonly logger = new Logger(DataUpdateService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * إنشاء طلب تحديث بيانات
   */
  async createUpdateRequest(userId: string, data: CreateUpdateRequestDto) {
    // التحقق من وجود المستخدم
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        registeredDevices: { where: { status: DeviceStatus.ACTIVE } },
      },
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    // التحقق من عدم وجود طلب معلق
    const pendingRequest = await this.prisma.dataUpdateRequest.findFirst({
      where: { userId, status: UpdateRequestStatus.PENDING },
    });

    if (pendingRequest) {
      throw new BadRequestException(
        'لديك طلب تحديث قيد المراجعة. يرجى الانتظار حتى تتم مراجعته.'
      );
    }

    // التحقق من البيانات المطلوبة حسب نوع التحديث
    this.validateRequestData(data);

    // الحصول على الجهاز القديم
    const mainDevice = user.registeredDevices.find(d => d.isMainDevice);

    // إنشاء الطلب
    const request = await this.prisma.dataUpdateRequest.create({
      data: {
        userId,
        requestType: data.requestType as any,
        reason: data.reason,
        
        // بيانات الوجه
        newFaceEmbedding: data.newFaceEmbedding 
          ? JSON.stringify(data.newFaceEmbedding) 
          : undefined,
        newFaceImage: data.newFaceImage,
        faceImageQuality: data.faceImageQuality,
        
        // بيانات الجهاز
        newDeviceId: data.newDeviceId,
        newDeviceFingerprint: data.newDeviceFingerprint,
        newDeviceName: data.newDeviceName,
        newDeviceModel: data.newDeviceModel,
        newDeviceBrand: data.newDeviceBrand,
        newDevicePlatform: data.newDevicePlatform as any,
        newDeviceOsVersion: data.newDeviceOsVersion,
        newDeviceAppVersion: data.newDeviceAppVersion,
        
        // الجهاز القديم للمقارنة
        oldDeviceId: mainDevice?.deviceId,
      },
    });

    // إشعار المسؤولين
    await this.notifyAdmins(user, data.requestType, request.id);

    this.logger.log(`Data update request created: ${request.id} for user ${userId}`);

    return {
      success: true,
      request,
      message: 'تم إرسال طلب التحديث بنجاح. سيتم مراجعته من قبل المسؤول.',
    };
  }

  /**
   * الحصول على طلبات المستخدم
   */
  async getMyRequests(userId: string) {
    return this.prisma.dataUpdateRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * إلغاء طلب معلق
   */
  async cancelRequest(userId: string, requestId: string) {
    const request = await this.prisma.dataUpdateRequest.findFirst({
      where: { id: requestId, userId, status: UpdateRequestStatus.PENDING },
    });

    if (!request) {
      throw new NotFoundException('الطلب غير موجود أو لا يمكن إلغاؤه');
    }

    await this.prisma.dataUpdateRequest.update({
      where: { id: requestId },
      data: { status: UpdateRequestStatus.CANCELLED },
    });

    return { success: true, message: 'تم إلغاء الطلب بنجاح' };
  }

  // ============ Admin Methods ============

  /**
   * قائمة الطلبات المعلقة
   */
  async getPendingRequests() {
    const requests = await this.prisma.dataUpdateRequest.findMany({
      where: { status: UpdateRequestStatus.PENDING },
      orderBy: { createdAt: 'asc' },
    });

    // جلب بيانات المستخدمين
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

  /**
   * الحصول على تفاصيل الطلب مع بيانات المستخدم
   */
  async getRequestDetails(requestId: string) {
    const request = await this.prisma.dataUpdateRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('الطلب غير موجود');
    }

    // جلب بيانات المستخدم
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
          where: { status: DeviceStatus.ACTIVE },
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

  /**
   * الموافقة على الطلب
   */
  async approveRequest(requestId: string, adminId: string, note?: string) {
    const request = await this.prisma.dataUpdateRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('الطلب غير موجود');
    }

    if (request.status !== UpdateRequestStatus.PENDING) {
      throw new BadRequestException('الطلب ليس في حالة انتظار');
    }

    // تطبيق التحديثات
    await this.applyUpdates(request);

    // تحديث حالة الطلب
    await this.prisma.dataUpdateRequest.update({
      where: { id: requestId },
      data: {
        status: UpdateRequestStatus.APPROVED,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewNote: note,
      },
    });

    // إشعار الموظف
    await this.notificationsService.sendNotification(
      request.userId,
      NotificationType.GENERAL,
      'تمت الموافقة على طلب التحديث',
      'تم تحديث بياناتك بنجاح. يمكنك الآن استخدام النظام بالبيانات الجديدة.',
    );

    this.logger.log(`Update request ${requestId} approved by ${adminId}`);

    return { success: true, message: 'تمت الموافقة وتطبيق التحديثات بنجاح' };
  }

  /**
   * رفض الطلب
   */
  async rejectRequest(requestId: string, adminId: string, reason: string) {
    const request = await this.prisma.dataUpdateRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('الطلب غير موجود');
    }

    if (request.status !== UpdateRequestStatus.PENDING) {
      throw new BadRequestException('الطلب ليس في حالة انتظار');
    }

    await this.prisma.dataUpdateRequest.update({
      where: { id: requestId },
      data: {
        status: UpdateRequestStatus.REJECTED,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
    });

    // إشعار الموظف
    await this.notificationsService.sendNotification(
      request.userId,
      NotificationType.GENERAL,
      'تم رفض طلب التحديث',
      `تم رفض طلب تحديث بياناتك. السبب: ${reason}`,
    );

    return { success: true, message: 'تم رفض الطلب' };
  }

  /**
   * قائمة جميع الطلبات مع فلترة
   */
  async getAllRequests(filters?: {
    status?: UpdateRequestStatus;
    userId?: string;
    requestType?: UpdateRequestType;
    page?: number;
    limit?: number;
  }) {
    const where: any = {};

    if (filters?.status) where.status = filters.status;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.requestType) where.requestType = filters.requestType;

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

    // جلب بيانات المستخدمين
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

  // ============ Private Methods ============

  /**
   * التحقق من صحة البيانات
   */
  private validateRequestData(data: CreateUpdateRequestDto) {
    const { requestType } = data;

    if (requestType === UpdateRequestType.FACE_UPDATE || requestType === UpdateRequestType.BOTH) {
      if (!data.newFaceEmbedding && !data.newFaceImage) {
        throw new BadRequestException('بيانات الوجه مطلوبة لهذا النوع من التحديث');
      }
    }

    if (
      requestType === UpdateRequestType.DEVICE_UPDATE ||
      requestType === UpdateRequestType.DEVICE_CHANGE ||
      requestType === UpdateRequestType.BOTH
    ) {
      if (!data.newDeviceId) {
        throw new BadRequestException('بيانات الجهاز مطلوبة لهذا النوع من التحديث');
      }
    }
  }

  /**
   * تطبيق التحديثات بعد الموافقة
   */
  private async applyUpdates(request: any) {
    const { requestType, userId } = request;

    // تحديث بيانات الوجه
    if (
      requestType === 'FACE_UPDATE' ||
      requestType === 'BOTH'
    ) {
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

        // تحديث حالة تسجيل الوجه
        await this.prisma.user.update({
          where: { id: userId },
          data: { faceRegistered: true },
        });
      }
    }

    // تحديث/إضافة جهاز جديد
    if (
      requestType === 'DEVICE_UPDATE' ||
      requestType === 'DEVICE_CHANGE' ||
      requestType === 'BOTH'
    ) {
      if (request.newDeviceId) {
        // إذا كان تغيير جهاز، نعطل الجهاز القديم
        if (requestType === 'DEVICE_CHANGE' && request.oldDeviceId) {
          await this.prisma.registeredDevice.updateMany({
            where: { userId, deviceId: request.oldDeviceId },
            data: { 
              status: DeviceStatus.INACTIVE,
              isMainDevice: false,
            },
          });
        }

        // إضافة أو تحديث الجهاز الجديد
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
            status: DeviceStatus.ACTIVE,
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
            status: DeviceStatus.ACTIVE,
            isMainDevice: true,
            approvedAt: new Date(),
          },
        });

        // تعيين بقية الأجهزة كغير رئيسية
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

  /**
   * إشعار المسؤولين
   */
  private async notifyAdmins(user: any, requestType: string, requestId: string) {
    const admins = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'MANAGER'] } },
    });

    const typeText = this.getRequestTypeText(requestType);

    for (const admin of admins) {
      await this.notificationsService.sendNotification(
        admin.id,
        NotificationType.GENERAL,
        'طلب تحديث بيانات جديد',
        `${user.firstName} ${user.lastName} يطلب ${typeText}`,
        { requestId, userId: user.id },
      );
    }
  }

  /**
   * نص نوع الطلب
   */
  private getRequestTypeText(type: string): string {
    switch (type) {
      case 'FACE_UPDATE':
        return 'تحديث بيانات الوجه';
      case 'DEVICE_UPDATE':
        return 'تحديث بيانات الجهاز';
      case 'DEVICE_CHANGE':
        return 'تغيير الجهاز (موبايل جديد)';
      case 'BOTH':
        return 'تحديث بيانات الوجه والجهاز';
      default:
        return 'تحديث بيانات';
    }
  }
}

