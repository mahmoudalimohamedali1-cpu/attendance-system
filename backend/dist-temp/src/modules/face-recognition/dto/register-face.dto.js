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
exports.RegisterFaceDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class RegisterFaceDto {
}
exports.RegisterFaceDto = RegisterFaceDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Face Embedding - مصفوفة من الأرقام تمثل ملامح الوجه (JSON string أو مصفوفة)',
        example: '[0.123, -0.456, 0.789, ...]',
    }),
    (0, class_validator_1.IsNotEmpty)({ message: 'بيانات الوجه مطلوبة' }),
    __metadata("design:type", Object)
], RegisterFaceDto.prototype, "faceEmbedding", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'صورة الوجه بصيغة Base64 (اختياري)',
        example: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterFaceDto.prototype, "faceImage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'نسبة الثقة في التسجيل (0-1)',
        example: 0.95,
        minimum: 0,
        maximum: 1,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(1),
    __metadata("design:type", Number)
], RegisterFaceDto.prototype, "confidence", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'معلومات الجهاز',
        example: 'iPhone 14 Pro - iOS 17.0',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterFaceDto.prototype, "deviceInfo", void 0);
//# sourceMappingURL=register-face.dto.js.map