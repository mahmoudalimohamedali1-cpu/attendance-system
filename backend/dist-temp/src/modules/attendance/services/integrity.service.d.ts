import { ConfigService } from '@nestjs/config';
export interface IntegrityVerdict {
    isValid: boolean;
    deviceIntegrity?: {
        meetsBasicIntegrity: boolean;
        meetsCtsProfileMatch: boolean;
        meetsStrongIntegrity: boolean;
    };
    appIntegrity?: {
        recognizedApp: boolean;
        packageName: string;
    };
    accountDetails?: {
        appLicensingVerdict: string;
    };
    error?: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}
export declare class IntegrityService {
    private configService;
    private readonly logger;
    private readonly projectNumber;
    private readonly enabled;
    constructor(configService: ConfigService);
    verifyIntegrityToken(token: string): Promise<IntegrityVerdict>;
    private calculateRiskLevel;
    shouldBlockAttendance(verdict: IntegrityVerdict): boolean;
    shouldAlertHR(verdict: IntegrityVerdict): boolean;
}
