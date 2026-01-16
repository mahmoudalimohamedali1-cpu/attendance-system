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
var FaceRecognitionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaceRecognitionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const face_comparison_service_1 = require("./services/face-comparison.service");
let FaceRecognitionService = FaceRecognitionService_1 = class FaceRecognitionService {
    constructor(prisma, faceComparison) {
        this.prisma = prisma;
        this.faceComparison = faceComparison;
        this.logger = new common_1.Logger(FaceRecognitionService_1.name);
    }
    async registerFace(userId, data) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { faceData: true },
        });
        if (!user) {
            throw new common_1.NotFoundException('المستخدم غير موجود');
        }
        const embedding = this.parseEmbedding(data.faceEmbedding);
        const qualityCheck = this.faceComparison.validateEmbeddingQuality(embedding);
        if (!qualityCheck.isValid) {
            throw new common_1.BadRequestException(qualityCheck.message);
        }
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
        await this.prisma.user.update({
            where: { id: userId },
            data: { faceRegistered: true },
        });
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
    async verifyFace(userId, data) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { faceData: true },
        });
        if (!user) {
            throw new common_1.NotFoundException('المستخدم غير موجود');
        }
        if (!user.faceRegistered || !user.faceData) {
            return {
                success: false,
                verified: false,
                message: 'لم يتم تسجيل وجه لهذا المستخدم بعد',
                requiresRegistration: true,
            };
        }
        const currentEmbedding = this.parseEmbedding(data.faceEmbedding);
        const storedEmbedding = JSON.parse(user.faceData.faceEmbedding);
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
        const threshold = data.threshold || this.faceComparison.getRecommendedThreshold();
        const comparison = this.faceComparison.compareFaces(storedEmbedding, currentEmbedding, threshold);
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
        if (comparison.isMatch) {
            await this.prisma.faceData.update({
                where: { userId },
                data: {
                    lastVerifiedAt: new Date(),
                    verificationCount: { increment: 1 },
                },
            });
        }
        this.logger.log(`Face verification for user ${userId}: ` +
            `match=${comparison.isMatch}, confidence=${comparison.confidence.toFixed(2)}`);
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
    async getFaceStatus(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { faceData: true },
        });
        if (!user) {
            throw new common_1.NotFoundException('المستخدم غير موجود');
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
    async deleteFaceData(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('المستخدم غير موجود');
        }
        await this.prisma.faceData.deleteMany({
            where: { userId },
        });
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
    async getUsersFaceStatus(branchId, departmentId) {
        const where = {
            role: 'EMPLOYEE',
            status: 'ACTIVE',
        };
        if (branchId)
            where.branchId = branchId;
        if (departmentId)
            where.departmentId = departmentId;
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
    async getVerificationLogs(userId, limit = 50) {
        const where = {};
        if (userId)
            where.userId = userId;
        return this.prisma.faceVerificationLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
    async logVerificationAttempt(data) {
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
        }
        catch (error) {
            this.logger.error('Failed to log verification attempt:', error);
        }
    }
    parseEmbedding(embedding) {
        if (Array.isArray(embedding)) {
            return embedding;
        }
        try {
            const parsed = JSON.parse(embedding);
            if (!Array.isArray(parsed)) {
                throw new common_1.BadRequestException('بيانات الوجه يجب أن تكون مصفوفة');
            }
            return parsed;
        }
        catch (error) {
            throw new common_1.BadRequestException('بيانات الوجه غير صالحة');
        }
    }
};
exports.FaceRecognitionService = FaceRecognitionService;
exports.FaceRecognitionService = FaceRecognitionService = FaceRecognitionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        face_comparison_service_1.FaceComparisonService])
], FaceRecognitionService);
//# sourceMappingURL=face-recognition.service.js.map