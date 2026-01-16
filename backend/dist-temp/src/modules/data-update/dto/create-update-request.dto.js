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
exports.CreateUpdateRequestDto = exports.DevicePlatform = exports.UpdateRequestType = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var UpdateRequestType;
(function (UpdateRequestType) {
    UpdateRequestType["FACE_UPDATE"] = "FACE_UPDATE";
    UpdateRequestType["DEVICE_UPDATE"] = "DEVICE_UPDATE";
    UpdateRequestType["BOTH"] = "BOTH";
    UpdateRequestType["DEVICE_CHANGE"] = "DEVICE_CHANGE";
    UpdateRequestType["PROFILE_UPDATE"] = "PROFILE_UPDATE";
})(UpdateRequestType || (exports.UpdateRequestType = UpdateRequestType = {}));
var DevicePlatform;
(function (DevicePlatform) {
    DevicePlatform["ANDROID"] = "ANDROID";
    DevicePlatform["IOS"] = "IOS";
    DevicePlatform["WEB"] = "WEB";
    DevicePlatform["UNKNOWN"] = "UNKNOWN";
})(DevicePlatform || (exports.DevicePlatform = DevicePlatform = {}));
class CreateUpdateRequestDto {
}
exports.CreateUpdateRequestDto = CreateUpdateRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'نوع التحديث المطلوب',
        enum: UpdateRequestType,
        example: UpdateRequestType.BOTH,
    }),
    (0, class_validator_1.IsNotEmpty)({ message: 'نوع التحديث مطلوب' }),
    (0, class_validator_1.IsEnum)(UpdateRequestType),
    __metadata("design:type", String)
], CreateUpdateRequestDto.prototype, "requestType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'سبب طلب التحديث',
        example: 'تغيير الهاتف الجوال',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUpdateRequestDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'بيانات الوجه الجديدة (Face Embedding)',
        type: [Number],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsNumber)({}, { each: true }),
    __metadata("design:type", Array)
], CreateUpdateRequestDto.prototype, "newFaceEmbedding", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'صورة الوجه الجديدة (Base64)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUpdateRequestDto.prototype, "newFaceImage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'جودة صورة الوجه',
        minimum: 0,
        maximum: 1,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(1),
    __metadata("design:type", Number)
], CreateUpdateRequestDto.prototype, "faceImageQuality", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'معرف الجهاز الجديد',
        example: 'new-device-001',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUpdateRequestDto.prototype, "newDeviceId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'بصمة الجهاز الجديد',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUpdateRequestDto.prototype, "newDeviceFingerprint", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'اسم الجهاز الجديد',
        example: 'Samsung Galaxy S24',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUpdateRequestDto.prototype, "newDeviceName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'موديل الجهاز الجديد',
        example: 'SM-S921B',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUpdateRequestDto.prototype, "newDeviceModel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'العلامة التجارية للجهاز الجديد',
        example: 'Samsung',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUpdateRequestDto.prototype, "newDeviceBrand", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'نوع منصة الجهاز الجديد',
        enum: DevicePlatform,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(DevicePlatform),
    __metadata("design:type", String)
], CreateUpdateRequestDto.prototype, "newDevicePlatform", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'إصدار نظام التشغيل',
        example: 'Android 14',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUpdateRequestDto.prototype, "newDeviceOsVersion", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'إصدار التطبيق',
        example: '1.0.0',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUpdateRequestDto.prototype, "newDeviceAppVersion", void 0);
//# sourceMappingURL=create-update-request.dto.js.map