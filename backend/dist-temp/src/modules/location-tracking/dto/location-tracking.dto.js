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
exports.LocationUpdateEventDto = exports.JoinTrackingDto = exports.LiveLocationDto = exports.ActiveEmployeeDto = exports.LocationHistoryQueryDto = exports.UpdateLocationDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class UpdateLocationDto {
}
exports.UpdateLocationDto = UpdateLocationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'خط العرض', example: 24.7136 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Min)(-90),
    (0, class_validator_1.Max)(90),
    __metadata("design:type", Number)
], UpdateLocationDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'خط الطول', example: 46.6753 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Min)(-180),
    (0, class_validator_1.Max)(180),
    __metadata("design:type", Number)
], UpdateLocationDto.prototype, "longitude", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'دقة GPS بالمتر', example: 10 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateLocationDto.prototype, "accuracy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'مستوى البطارية (0-100)', example: 85 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], UpdateLocationDto.prototype, "batteryLevel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'معلومات الجهاز' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateLocationDto.prototype, "deviceInfo", void 0);
class LocationHistoryQueryDto {
}
exports.LocationHistoryQueryDto = LocationHistoryQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'معرف الموظف (للمسؤولين)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LocationHistoryQueryDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'تاريخ البداية' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LocationHistoryQueryDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'تاريخ النهاية' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LocationHistoryQueryDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'عرض داخل النطاق فقط' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], LocationHistoryQueryDto.prototype, "insideOnly", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'الحد الأقصى للنتائج', default: 100 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Max)(500),
    __metadata("design:type", Number)
], LocationHistoryQueryDto.prototype, "limit", void 0);
class ActiveEmployeeDto {
}
exports.ActiveEmployeeDto = ActiveEmployeeDto;
class LiveLocationDto {
}
exports.LiveLocationDto = LiveLocationDto;
class JoinTrackingDto {
}
exports.JoinTrackingDto = JoinTrackingDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], JoinTrackingDto.prototype, "userId", void 0);
class LocationUpdateEventDto {
}
exports.LocationUpdateEventDto = LocationUpdateEventDto;
//# sourceMappingURL=location-tracking.dto.js.map