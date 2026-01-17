import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
 * 
 * ملاحظة: googleapis غير مثبت بسبب حجمه الكبير (~400MB)
 * لتفعيل Play Integrity الكامل:
 * 1. npm install googleapis
 * 2. أضف البيئة: PLAY_INTEGRITY_ENABLED=true
 * 3. أعد تشغيل الخادم
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

        if (this.enabled) {
            this.logger.warn('Play Integrity is enabled but googleapis is not installed. Verification will be skipped.');
        }
    }

    /**
     * التحقق من Integrity Token
     * @param token التوكن المرسل من التطبيق
     * @returns نتيجة التحقق
     */
    async verifyIntegrityToken(token: string): Promise<IntegrityVerdict> {
        // Play Integrity غير مفعل أو googleapis غير مثبت - نسمح بالمرور
        if (!this.enabled) {
            this.logger.debug('Play Integrity verification disabled');
            return {
                isValid: true,
                riskLevel: 'LOW',
            };
        }

        // googleapis غير مثبت - نسجل تحذير ونسمح بالمرور
        this.logger.warn('Play Integrity enabled but googleapis not installed. Skipping verification.');
        return {
            isValid: true,
            riskLevel: 'LOW',
            error: 'googleapis not installed - verification skipped',
        };
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
