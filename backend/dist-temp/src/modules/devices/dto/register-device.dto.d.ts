export declare enum DevicePlatform {
    ANDROID = "ANDROID",
    IOS = "IOS",
    WEB = "WEB",
    UNKNOWN = "UNKNOWN"
}
export declare class RegisterDeviceDto {
    deviceId: string;
    deviceName?: string;
    deviceModel?: string;
    deviceBrand?: string;
    platform?: DevicePlatform;
    osVersion?: string;
    appVersion?: string;
    deviceFingerprint?: string;
}
