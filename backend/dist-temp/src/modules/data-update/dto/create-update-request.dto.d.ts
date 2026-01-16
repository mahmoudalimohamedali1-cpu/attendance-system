export declare enum UpdateRequestType {
    FACE_UPDATE = "FACE_UPDATE",
    DEVICE_UPDATE = "DEVICE_UPDATE",
    BOTH = "BOTH",
    DEVICE_CHANGE = "DEVICE_CHANGE",
    PROFILE_UPDATE = "PROFILE_UPDATE"
}
export declare enum DevicePlatform {
    ANDROID = "ANDROID",
    IOS = "IOS",
    WEB = "WEB",
    UNKNOWN = "UNKNOWN"
}
export declare class CreateUpdateRequestDto {
    requestType: UpdateRequestType;
    reason?: string;
    newFaceEmbedding?: number[];
    newFaceImage?: string;
    faceImageQuality?: number;
    newDeviceId?: string;
    newDeviceFingerprint?: string;
    newDeviceName?: string;
    newDeviceModel?: string;
    newDeviceBrand?: string;
    newDevicePlatform?: DevicePlatform;
    newDeviceOsVersion?: string;
    newDeviceAppVersion?: string;
}
