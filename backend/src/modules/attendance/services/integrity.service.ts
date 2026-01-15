import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

/**
 * نتيجة التحقق من Play Integrity
 */
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

/**
 * خدمة التحقق من Play Integrity API
 * تستخدم للتحقق من التوكن المرسل من التطبيق
 */
@Injectable()
export class IntegrityService {
    private readonly logger = new Logger(IntegrityService.name);
    private readonly projectNumber: string;
    private readonly enabled: boolean;
    private readonly packageName: string;
    private readonly serviceAccountPath: string;

    constructor(private configService: ConfigService) {
        this.projectNumber = this.configService.get('GOOGLE_CLOUD_PROJECT_NUMBER', '');
        this.enabled = this.configService.get('PLAY_INTEGRITY_ENABLED', 'false') === 'true';
        this.packageName = this.configService.get('ANDROID_PACKAGE_NAME', 'com.example.attendance_app');
        this.serviceAccountPath = this.configService.get('GOOGLE_SERVICE_ACCOUNT_PATH', '');

        if (this.enabled && !this.projectNumber) {
            this.logger.warn('Play Integrity enabled but GOOGLE_CLOUD_PROJECT_NUMBER not set');
        }

        if (this.enabled && !this.serviceAccountPath) {
            this.logger.warn('Play Integrity enabled but GOOGLE_SERVICE_ACCOUNT_PATH not set');
        }
    }

    /**
     * التحقق من Integrity Token
     * @param token التوكن المرسل من التطبيق
     * @returns نتيجة التحقق
     */
    async verifyIntegrityToken(token: string): Promise<IntegrityVerdict> {
        // إذا كان Play Integrity معطل، نسمح بالمرور
        if (!this.enabled) {
            this.logger.debug('Play Integrity verification disabled');
            return {
                isValid: true,
                riskLevel: 'LOW',
            };
        }

        if (!token) {
            this.logger.warn('Empty integrity token received');
            return {
                isValid: false,
                error: 'No integrity token provided',
                riskLevel: 'HIGH',
            };
        }

        try {
            // إعداد Play Integrity API
            const playintegrity = google.playintegrity('v1');

            // إعداد المصادقة باستخدام Service Account
            const auth = new google.auth.GoogleAuth({
                keyFile: this.serviceAccountPath,
                scopes: ['https://www.googleapis.com/auth/playintegrity'],
            });

            this.logger.debug(`Verifying integrity token for package: ${this.packageName}`);

            // استدعاء API لفك تشفير التوكن
            const response = await playintegrity.v1.decodeIntegrityToken({
                auth,
                packageName: this.packageName,
                requestBody: {
                    integrityToken: token,
                },
            });

            const tokenPayload = response.data.tokenPayloadExternal;

            if (!tokenPayload) {
                this.logger.error('Empty token payload received from Play Integrity API');
                return {
                    isValid: false,
                    error: 'Invalid token payload',
                    riskLevel: 'CRITICAL',
                };
            }

            // استخراج معلومات Device Integrity
            const deviceRecognitionVerdict = tokenPayload.deviceIntegrity?.deviceRecognitionVerdict || [];
            const deviceIntegrity = {
                meetsBasicIntegrity: deviceRecognitionVerdict.includes('MEETS_BASIC_INTEGRITY'),
                meetsCtsProfileMatch: deviceRecognitionVerdict.includes('MEETS_DEVICE_INTEGRITY'),
                meetsStrongIntegrity: deviceRecognitionVerdict.includes('MEETS_STRONG_INTEGRITY'),
            };

            // استخراج معلومات App Integrity
            const appIntegrity = {
                recognizedApp: tokenPayload.appIntegrity?.appRecognitionVerdict === 'PLAY_RECOGNIZED',
                packageName: tokenPayload.appIntegrity?.packageName || '',
            };

            // استخراج معلومات الحساب
            const accountDetails = {
                appLicensingVerdict: tokenPayload.accountDetails?.appLicensingVerdict || 'UNKNOWN',
            };

            // حساب مستوى الخطورة
            const riskLevel = this.calculateRiskLevel(tokenPayload);

            // تسجيل النتيجة
            this.logger.log(`Integrity verification completed: riskLevel=${riskLevel}, deviceIntegrity=${JSON.stringify(deviceIntegrity)}`);

            return {
                isValid: true,
                deviceIntegrity,
                appIntegrity,
                accountDetails,
                riskLevel,
            };
        } catch (error) {
            this.logger.error(`Integrity verification failed: ${error.message}`, error.stack);
            return {
                isValid: false,
                error: error.message,
                riskLevel: 'CRITICAL',
            };
        }
    }

    /**
     * حساب مستوى الخطورة بناءً على Verdict
     */
    private calculateRiskLevel(payload: any): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
        const deviceIntegrity = payload.deviceIntegrity?.deviceRecognitionVerdict || [];

        // MEETS_STRONG_INTEGRITY = أعلى مستوى أمان
        if (deviceIntegrity.includes('MEETS_STRONG_INTEGRITY')) {
            return 'LOW';
        }

        // MEETS_DEVICE_INTEGRITY = جهاز عادي
        if (deviceIntegrity.includes('MEETS_DEVICE_INTEGRITY')) {
            return 'LOW';
        }

        // MEETS_BASIC_INTEGRITY = جهاز قد يكون rooted
        if (deviceIntegrity.includes('MEETS_BASIC_INTEGRITY')) {
            return 'MEDIUM';
        }

        // لا يوجد أي integrity = مشبوه جداً
        return 'HIGH';
    }

    /**
     * هل يجب حظر الحضور بناءً على Integrity؟
     */
    shouldBlockAttendance(verdict: IntegrityVerdict): boolean {
        if (!this.enabled) return false;

        // حظر فقط في حالة CRITICAL
        return verdict.riskLevel === 'CRITICAL';
    }

    /**
     * هل يجب تنبيه HR؟
     */
    shouldAlertHR(verdict: IntegrityVerdict): boolean {
        return verdict.riskLevel === 'HIGH' || verdict.riskLevel === 'CRITICAL';
    }
}
