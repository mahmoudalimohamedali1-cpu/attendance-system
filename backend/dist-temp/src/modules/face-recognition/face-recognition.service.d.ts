import { PrismaService } from '../../common/prisma/prisma.service';
import { FaceComparisonService } from './services/face-comparison.service';
import { RegisterFaceDto } from './dto/register-face.dto';
import { VerifyFaceDto } from './dto/verify-face.dto';
export declare class FaceRecognitionService {
    private prisma;
    private faceComparison;
    private readonly logger;
    constructor(prisma: PrismaService, faceComparison: FaceComparisonService);
    registerFace(userId: string, data: RegisterFaceDto): Promise<{
        success: boolean;
        message: string;
        quality: number;
        registeredAt: Date;
    }>;
    verifyFace(userId: string, data: VerifyFaceDto): Promise<FaceVerificationResult>;
    getFaceStatus(userId: string): Promise<{
        userId: string;
        faceRegistered: boolean;
        registeredAt: Date | null;
        lastVerifiedAt: Date | null;
        verificationCount: number;
        imageQuality: number | null;
    }>;
    deleteFaceData(userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getUsersFaceStatus(branchId?: string, departmentId?: string): Promise<{
        users: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            avatar: string | null;
            employeeCode: string | null;
            faceRegistered: boolean;
            faceData: {
                registeredAt: Date;
                lastVerifiedAt: Date | null;
                verificationCount: number;
                imageQuality: number | null;
            } | null;
            branch: {
                name: string;
            } | null;
            department: {
                name: string;
            } | null;
        }[];
        stats: {
            total: number;
            registered: number;
            notRegistered: number;
        };
    }>;
    getVerificationLogs(userId?: string, limit?: number): Promise<{
        id: string;
        createdAt: Date;
        deviceInfo: string | null;
        userId: string;
        ipAddress: string | null;
        confidence: number | null;
        isSuccess: boolean;
        errorMessage: string | null;
        verificationType: string;
        threshold: number | null;
        attemptImage: string | null;
    }[]>;
    private logVerificationAttempt;
    private parseEmbedding;
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
