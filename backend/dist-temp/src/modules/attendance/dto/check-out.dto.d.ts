export declare class CheckOutDto {
    companyId?: string;
    latitude: number;
    longitude: number;
    isMockLocation: boolean;
    deviceInfo?: string;
    notes?: string;
    faceEmbedding?: string | number[];
    faceImage?: string;
    faceConfidence?: number;
    faceVerifiedLocally?: boolean;
}
