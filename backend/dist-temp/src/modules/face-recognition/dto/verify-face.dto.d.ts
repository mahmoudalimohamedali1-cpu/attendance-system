export declare class VerifyFaceDto {
    faceEmbedding: string | number[];
    faceImage?: string;
    verificationType?: 'CHECK_IN' | 'CHECK_OUT' | 'VERIFICATION';
    threshold?: number;
    deviceInfo?: string;
    saveAttemptImage?: boolean;
}
