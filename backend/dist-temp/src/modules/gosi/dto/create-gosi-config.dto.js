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
exports.CreateGosiConfigDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateGosiConfigDto {
}
exports.CreateGosiConfigDto = CreateGosiConfigDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'نسبة الموظف (%)', example: 9.00 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateGosiConfigDto.prototype, "employeeRate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'نسبة الشركة (%)', example: 9.00 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateGosiConfigDto.prototype, "employerRate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'نسبة ساند (%)', example: 0.75 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateGosiConfigDto.prototype, "sanedRate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'نسبة الأخطار المهنية (%)', example: 2.00 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateGosiConfigDto.prototype, "hazardRate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الحد الأقصى للراتب الخاضع للتأمينات', example: 45000 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateGosiConfigDto.prototype, "maxCapAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'هل ينطبق على السعوديين فقط؟', default: true }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateGosiConfigDto.prototype, "isSaudiOnly", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'هل الإعداد مفعل؟', default: true }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateGosiConfigDto.prototype, "isActive", void 0);
//# sourceMappingURL=create-gosi-config.dto.js.map