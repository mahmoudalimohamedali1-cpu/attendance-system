import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FaceComparisonService, FaceComparisonResult } from './services/face-comparison.service';
import { RegisterFaceDto } from './dto/register-face.dto';
import { VerifyFaceDto } from './dto/verify-face.dto';

@Injectable()
export class FaceRecognitionService {
  private readonly logger = new Logger(FaceRecognitionService.name);

  constructor(
    private prisma: PrismaService,
    private faceComparison: FaceComparisonService,
  ) {}

  /**
   * تسجيل وجه مستخدم جديد
   */
  async registerFace(userId: string, data: RegisterFaceDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { faceData: true },
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    // التحقق من صحة Face Embedding
    const embedding = this.parseEmbedding(data.faceEmbedding);
    
    // التحقق من جودة الصورة
    const qualityCheck = this.faceComparison.validateEmbeddingQuality(embedding);
    if (!qualityCheck.isValid) {
      throw new BadRequestException(qualityCheck.message);
    }

    // حفظ أو تحديث بيانات الوجه
    const faceData = await this.prisma.faceData.upsert({
      where: { userId },
      create: {
        userId,
        faceEmbedding: JSON.stringify(embedding),
        faceImage: data.faceImage || null,
        imageQuality: qualityCheck.quality,
        confidence: data.confidence || qualityCheck.quality,
      },
      update: {
        faceEmbedding: JSON.stringify(embedding),
        faceImage: data.faceImage || null,
        imageQuality: qualityCheck.quality,
        confidence: data.confidence || qualityCheck.quality,
        updatedAt: new Date(),
      },
    });

    // تحديث حالة تسجيل الوجه في المستخدم
    await this.prisma.user.update({
      where: { id: userId },
      data: { faceRegistered: true },
    });

    // تسجيل محاولة التسجيل
    await this.logVerificationAttempt({
      userId,
      verificationType: 'REGISTRATION',
      isSuccess: true,
      confidence: qualityCheck.quality,
      deviceInfo: data.deviceInfo,
    });

    this.logger.log(`Face registered successfully for user ${userId}`);

    return {
      success: true,
      message: 'تم تسجيل الوجه بنجاح',
      quality: qualityCheck.quality,
      registeredAt: faceData.registeredAt,
    };
  }

  /**
   * التحقق من وجه المستخدم
   */
  async verifyFace(userId: string, data: VerifyFaceDto): Promise<FaceVerificationResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { faceData: true },
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    if (!user.faceRegistered || !user.faceData) {
      return {
        success: false,
        verified: false,
        message: 'لم يتم تسجيل وجه لهذا المستخدم بعد',
        requiresRegistration: true,
      };
    }

    // تحويل Face Embeddings
    const currentEmbedding = this.parseEmbedding(data.faceEmbedding);
    const storedEmbedding = JSON.parse(user.faceData.faceEmbedding);

    // التحقق من جودة الصورة الحالية
    const qualityCheck = this.faceComparison.validateEmbeddingQuality(currentEmbedding);
    if (!qualityCheck.isValid) {
      await this.logVerificationAttempt({
        userId,
        verificationType: data.verificationType || 'VERIFICATION',
        isSuccess: false,
        confidence: 0,
        deviceInfo: data.deviceInfo,
        errorMessage: qualityCheck.message,
      });

      return {
        success: false,
        verified: false,
        message: qualityCheck.message,
        quality: qualityCheck.quality,
      };
    }

    // مقارنة الوجوه
    const threshold = data.threshold || this.faceComparison.getRecommendedThreshold();
    const comparison = this.faceComparison.compareFaces(
      storedEmbedding,
      currentEmbedding,
      threshold,
    );

    // تسجيل المحاولة
    await this.logVerificationAttempt({
      userId,
      verificationType: data.verificationType || 'VERIFICATION',
      isSuccess: comparison.isMatch,
      confidence: comparison.confidence,
      threshold: comparison.threshold,
      deviceInfo: data.deviceInfo,
      attemptImage: data.saveAttemptImage ? data.faceImage : undefined,
      errorMessage: comparison.error,
    });

    // تحديث إحصائيات التحقق
    if (comparison.isMatch) {
      await this.prisma.faceData.update({
        where: { userId },
        data: {
          lastVerifiedAt: new Date(),
          verificationCount: { increment: 1 },
        },
      });
    }

    this.logger.log(
      `Face verification for user ${userId}: ` +
      `match=${comparison.isMatch}, confidence=${comparison.confidence.toFixed(2)}`,
    );

    return {
      success: true,
      verified: comparison.isMatch,
      confidence: comparison.confidence,
      threshold: comparison.threshold,
      message: comparison.isMatch 
        ? 'تم التحقق من الوجه بنجاح' 
        : 'فشل التحقق من الوجه - الوجه غير مطابق',
      quality: qualityCheck.quality,
    };
  }

  /**
   * الحصول على حالة تسجيل الوجه
   */
  async getFaceStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { faceData: true },
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    return {
      userId,
      faceRegistered: user.faceRegistered,
      registeredAt: user.faceData?.registeredAt || null,
      lastVerifiedAt: user.faceData?.lastVerifiedAt || null,
      verificationCount: user.faceData?.verificationCount || 0,
      imageQuality: user.faceData?.imageQuality || null,
    };
  }

  /**
   * حذف بيانات الوجه
   */
  async deleteFaceData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    // حذف بيانات الوجه
    await this.prisma.faceData.deleteMany({
      where: { userId },
    });

    // تحديث حالة المستخدم
    await this.prisma.user.update({
      where: { id: userId },
      data: { faceRegistered: false },
    });

    this.logger.log(`Face data deleted for user ${userId}`);

    return {
      success: true,
      message: 'تم حذف بيانات الوجه بنجاح',
    };
  }

  /**
   * الحصول على قائمة المستخدمين وحالة تسجيل الوجه
   */
  async getUsersFaceStatus(branchId?: string, departmentId?: string) {
    const where: any = {
      role: 'EMPLOYEE',
      status: 'ACTIVE',
    };

    if (branchId) where.branchId = branchId;
    if (departmentId) where.departmentId = departmentId;

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        employeeCode: true,
        avatar: true,
        faceRegistered: true,
        faceData: {
          select: {
            registeredAt: true,
            lastVerifiedAt: true,
            verificationCount: true,
            imageQuality: true,
          },
        },
        branch: { select: { name: true } },
        department: { select: { name: true } },
      },
      orderBy: [{ faceRegistered: 'asc' }, { firstName: 'asc' }],
    });

    const stats = {
      total: users.length,
      registered: users.filter(u => u.faceRegistered).length,
      notRegistered: users.filter(u => !u.faceRegistered).length,
    };

    return { users, stats };
  }

  /**
   * الحصول على سجل التحقق
   */
  async getVerificationLogs(userId?: string, limit = 50) {
    const where: any = {};
    if (userId) where.userId = userId;

    return this.prisma.faceVerificationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * تسجيل محاولة التحقق
   */
  private async logVerificationAttempt(data: {
    userId: string;
    verificationType: string;
    isSuccess: boolean;
    confidence?: number;
    threshold?: number;
    deviceInfo?: string;
    attemptImage?: string;
    errorMessage?: string;
  }) {
    try {
      await this.prisma.faceVerificationLog.create({
        data: {
          userId: data.userId,
          verificationType: data.verificationType,
          isSuccess: data.isSuccess,
          confidence: data.confidence,
          threshold: data.threshold,
          deviceInfo: data.deviceInfo,
          attemptImage: data.attemptImage,
          errorMessage: data.errorMessage,
        },
      });
    } catch (error) {
      this.logger.error('Failed to log verification attempt:', error);
    }
  }

  /**
   * تحويل Face Embedding من نص إلى مصفوفة
   */
  private parseEmbedding(embedding: string | number[]): number[] {
    if (Array.isArray(embedding)) {
      return embedding;
    }

    try {
      const parsed = JSON.parse(embedding);
      if (!Array.isArray(parsed)) {
        throw new BadRequestException('بيانات الوجه يجب أن تكون مصفوفة');
      }
      return parsed;
    } catch (error) {
      throw new BadRequestException('بيانات الوجه غير صالحة');
    }
  }
}

export interface FaceVerificationResult {
  success: boolean;
  verified: boolean;
  confidence?: number;
  threshold?: number;
  message: string;
  quality?: number;
  requiresRegistration?: boolean;
}

