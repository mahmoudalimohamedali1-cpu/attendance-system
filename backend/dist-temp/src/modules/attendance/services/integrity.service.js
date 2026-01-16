"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var IntegrityService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrityService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let IntegrityService = IntegrityService_1 = class IntegrityService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(IntegrityService_1.name);
        this.projectNumber = this.configService.get('GOOGLE_CLOUD_PROJECT_NUMBER', '');
        this.enabled = this.configService.get('PLAY_INTEGRITY_ENABLED', 'false') === 'true';
        if (this.enabled && !this.projectNumber) {
            this.logger.warn('Play Integrity enabled but GOOGLE_CLOUD_PROJECT_NUMBER not set');
        }
    }
    async verifyIntegrityToken(token) {
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
            this.logger.log(`Integrity token received (${token.length} chars) - validation pending setup`);
            return {
                isValid: true,
                riskLevel: 'LOW',
                deviceIntegrity: {
                    meetsBasicIntegrity: true,
                    meetsCtsProfileMatch: true,
                    meetsStrongIntegrity: false,
                },
                appIntegrity: {
                    recognizedApp: true,
                    packageName: 'com.example.attendance_app',
                },
            };
        }
        catch (error) {
            this.logger.error(`Integrity verification failed: ${error.message}`);
            return {
                isValid: false,
                error: error.message,
                riskLevel: 'CRITICAL',
            };
        }
    }
    calculateRiskLevel(payload) {
        const deviceIntegrity = payload.deviceIntegrity?.deviceRecognitionVerdict || [];
        if (deviceIntegrity.includes('MEETS_STRONG_INTEGRITY')) {
            return 'LOW';
        }
        if (deviceIntegrity.includes('MEETS_DEVICE_INTEGRITY')) {
            return 'LOW';
        }
        if (deviceIntegrity.includes('MEETS_BASIC_INTEGRITY')) {
            return 'MEDIUM';
        }
        return 'HIGH';
    }
    shouldBlockAttendance(verdict) {
        if (!this.enabled)
            return false;
        return verdict.riskLevel === 'CRITICAL';
    }
    shouldAlertHR(verdict) {
        return verdict.riskLevel === 'HIGH' || verdict.riskLevel === 'CRITICAL';
    }
};
exports.IntegrityService = IntegrityService;
exports.IntegrityService = IntegrityService = IntegrityService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], IntegrityService);
//# sourceMappingURL=integrity.service.js.map