import { ConfigService } from '@nestjs/config';
export declare class FcmService {
    private configService;
    private readonly logger;
    constructor(configService: ConfigService);
    private initializeFirebase;
    sendPushNotification(token: string, title: string, body: string, data?: Record<string, string>): Promise<boolean>;
    sendMultiplePushNotifications(tokens: string[], title: string, body: string, data?: Record<string, string>): Promise<{
        success: number;
        failure: number;
    }>;
    private stringifyData;
}
