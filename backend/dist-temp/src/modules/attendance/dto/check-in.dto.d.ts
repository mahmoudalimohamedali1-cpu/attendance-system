export declare class CheckInDto {
    companyId?: string;
    latitude: number;
    longitude: number;
    isMockLocation: boolean;
    deviceInfo?: string;
    accuracy?: number;
    faceEmbedding?: string | number[];
    faceImage?: string;
    faceConfidence?: number;
    faceVerifiedLocally?: boolean;
    deviceId?: string;
    deviceFingerprint?: string;
    integrityToken?: string;
    integrityCheckFailed?: boolean;
    integrityError?: string;
}
