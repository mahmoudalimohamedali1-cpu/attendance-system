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
exports.VerifyFaceDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class VerifyFaceDto {
}
exports.VerifyFaceDto = VerifyFaceDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Face Embedding - مصفوفة من الأرقام تمثل ملامح الوجه الحالية',
        example: '[0.123, -0.456, 0.789, ...]',
    }),
    (0, class_validator_1.IsNotEmpty)({ message: 'بيانات الوجه مطلوبة' }),
    __metadata("design:type", Object)
], VerifyFaceDto.prototype, "faceEmbedding", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'صورة الوجه بصيغة Base64 (اختياري)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VerifyFaceDto.prototype, "faceImage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'نوع التحقق',
        enum: ['CHECK_IN', 'CHECK_OUT', 'VERIFICATION'],
        default: 'VERIFICATION',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['CHECK_IN', 'CHECK_OUT', 'VERIFICATION']),
    __metadata("design:type", String)
], VerifyFaceDto.prototype, "verificationType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'حد التطابق المطلوب (0-1)',
        example: 0.6,
        minimum: 0,
        maximum: 1,
        default: 0.6,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(1),
    __metadata("design:type", Number)
], VerifyFaceDto.prototype, "threshold", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'معلومات الجهاز',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VerifyFaceDto.prototype, "deviceInfo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'حفظ صورة المحاولة للتدقيق',
        default: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], VerifyFaceDto.prototype, "saveAttemptImage", void 0);
//# sourceMappingURL=verify-face.dto.js.map