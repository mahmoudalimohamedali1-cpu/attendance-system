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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerifyDeviceDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class VerifyDeviceDto {
}
exports.VerifyDeviceDto = VerifyDeviceDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'معرف الجهاز الفريد',
        example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    }),
    (0, class_validator_1.IsNotEmpty)({ message: 'معرف الجهاز مطلوب' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VerifyDeviceDto.prototype, "deviceId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'بصمة الجهاز للتحقق',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VerifyDeviceDto.prototype, "deviceFingerprint", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'موديل الجهاز',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VerifyDeviceDto.prototype, "deviceModel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'نوع الإجراء',
        enum: ['CHECK_IN', 'CHECK_OUT', 'LOGIN'],
        default: 'CHECK_IN',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['CHECK_IN', 'CHECK_OUT', 'LOGIN']),
    __metadata("design:type", String)
], VerifyDeviceDto.prototype, "actionType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'إصدار التطبيق',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VerifyDeviceDto.prototype, "appVersion", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'عنوان IP',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VerifyDeviceDto.prototype, "ipAddress", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'خط العرض',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], VerifyDeviceDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'خط الطول',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], VerifyDeviceDto.prototype, "longitude", void 0);
//# sourceMappingURL=verify-device.dto.js.map