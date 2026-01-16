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
exports.CheckInDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CheckInDto {
}
exports.CheckInDto = CheckInDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'معرف الشركة (يُستخدم للتحقق من صلاحية الموظف)',
        example: 'company-uuid-here',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CheckInDto.prototype, "companyId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'خط العرض',
        example: 24.7136,
        minimum: -90,
        maximum: 90,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-90),
    (0, class_validator_1.Max)(90),
    __metadata("design:type", Number)
], CheckInDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'خط الطول',
        example: 46.6753,
        minimum: -180,
        maximum: 180,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-180),
    (0, class_validator_1.Max)(180),
    __metadata("design:type", Number)
], CheckInDto.prototype, "longitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'هل الموقع وهمي (Mock Location)',
        example: false,
    }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CheckInDto.prototype, "isMockLocation", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'معلومات الجهاز',
        example: 'iPhone 14 Pro - iOS 17.2',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CheckInDto.prototype, "deviceInfo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'دقة GPS بالمتر (يُرفض إذا كانت أكبر من 100 متر)',
        example: 10,
        minimum: 0,
        maximum: 100,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0, { message: 'دقة GPS يجب أن تكون قيمة موجبة' }),
    (0, class_validator_1.Max)(100, { message: 'دقة GPS ضعيفة جداً (يجب أن تكون أقل من 100 متر)' }),
    __metadata("design:type", Number)
], CheckInDto.prototype, "accuracy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Face Embedding للتحقق من الوجه',
        example: '[0.123, -0.456, 0.789, ...]',
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CheckInDto.prototype, "faceEmbedding", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'صورة الوجه بصيغة Base64',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CheckInDto.prototype, "faceImage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'نسبة الثقة من التحقق المحلي',
        minimum: 0,
        maximum: 1,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(1),
    __metadata("design:type", Number)
], CheckInDto.prototype, "faceConfidence", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'هل تم التحقق من الوجه محلياً',
        default: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CheckInDto.prototype, "faceVerifiedLocally", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'معرف الجهاز الفريد',
        example: 'a1b2c3d4e5f6',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CheckInDto.prototype, "deviceId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'بصمة الجهاز',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CheckInDto.prototype, "deviceFingerprint", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Play Integrity Token من Google',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CheckInDto.prototype, "integrityToken", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'هل فشل فحص Integrity على الجهاز',
        default: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CheckInDto.prototype, "integrityCheckFailed", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'رسالة خطأ Integrity إن وجدت',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CheckInDto.prototype, "integrityError", void 0);
//# sourceMappingURL=check-in.dto.js.map