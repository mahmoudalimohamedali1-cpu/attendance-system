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
exports.RegisterDeviceDto = exports.DevicePlatform = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var DevicePlatform;
(function (DevicePlatform) {
    DevicePlatform["ANDROID"] = "ANDROID";
    DevicePlatform["IOS"] = "IOS";
    DevicePlatform["WEB"] = "WEB";
    DevicePlatform["UNKNOWN"] = "UNKNOWN";
})(DevicePlatform || (exports.DevicePlatform = DevicePlatform = {}));
class RegisterDeviceDto {
}
exports.RegisterDeviceDto = RegisterDeviceDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'معرف الجهاز الفريد',
        example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    }),
    (0, class_validator_1.IsNotEmpty)({ message: 'معرف الجهاز مطلوب' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDeviceDto.prototype, "deviceId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'اسم الجهاز',
        example: 'iPhone 14 Pro',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDeviceDto.prototype, "deviceName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'موديل الجهاز',
        example: 'iPhone14,3',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDeviceDto.prototype, "deviceModel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'العلامة التجارية',
        example: 'Apple',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDeviceDto.prototype, "deviceBrand", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'نوع المنصة',
        enum: DevicePlatform,
        example: DevicePlatform.IOS,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(DevicePlatform),
    __metadata("design:type", String)
], RegisterDeviceDto.prototype, "platform", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'إصدار نظام التشغيل',
        example: 'iOS 17.2',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDeviceDto.prototype, "osVersion", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'إصدار التطبيق',
        example: '1.0.0',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDeviceDto.prototype, "appVersion", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'بصمة الجهاز',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDeviceDto.prototype, "deviceFingerprint", void 0);
//# sourceMappingURL=register-device.dto.js.map