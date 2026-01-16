import { Request } from 'express';
import { FaceRecognitionService } from './face-recognition.service';
import { RegisterFaceDto } from './dto/register-face.dto';
import { VerifyFaceDto } from './dto/verify-face.dto';
interface AuthenticatedRequest extends Request {
    user: {
        id: string;
        email: string;
        role: string;
    };
}
export declare class FaceRecognitionController {
    private readonly faceRecognitionService;
    constructor(faceRecognitionService: FaceRecognitionService);
    registerMyFace(req: AuthenticatedRequest, data: RegisterFaceDto): Promise<{
        success: boolean;
        message: string;
        quality: number;
        registeredAt: Date;
    }>;
    verifyMyFace(req: AuthenticatedRequest, data: VerifyFaceDto): Promise<import("./face-recognition.service").FaceVerificationResult>;
    getMyFaceStatus(req: AuthenticatedRequest): Promise<{
        userId: string;
        faceRegistered: boolean;
        registeredAt: Date | null;
        lastVerifiedAt: Date | null;
        verificationCount: number;
        imageQuality: number | null;
    }>;
    deleteMyFace(req: AuthenticatedRequest): Promise<{
        success: boolean;
        message: string;
    }>;
    registerUserFace(userId: string, data: RegisterFaceDto): Promise<{
        success: boolean;
        message: string;
        quality: number;
        registeredAt: Date;
    }>;
    verifyUserFace(userId: string, data: VerifyFaceDto): Promise<import("./face-recognition.service").FaceVerificationResult>;
    getUserFaceStatus(userId: string): Promise<{
        userId: string;
        faceRegistered: boolean;
        registeredAt: Date | null;
        lastVerifiedAt: Date | null;
        verificationCount: number;
        imageQuality: number | null;
    }>;
    deleteUserFace(userId: string): Promise<{
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
    getVerificationLogs(userId?: string, limit?: string): Promise<{
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
}
export {};
