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
exports.CreateSalaryComponentDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var SalaryComponentType;
(function (SalaryComponentType) {
    SalaryComponentType["EARNING"] = "EARNING";
    SalaryComponentType["DEDUCTION"] = "DEDUCTION";
})(SalaryComponentType || (SalaryComponentType = {}));
var SalaryComponentNature;
(function (SalaryComponentNature) {
    SalaryComponentNature["FIXED"] = "FIXED";
    SalaryComponentNature["VARIABLE"] = "VARIABLE";
    SalaryComponentNature["FORMULA"] = "FORMULA";
})(SalaryComponentNature || (SalaryComponentNature = {}));
class CreateSalaryComponentDto {
}
exports.CreateSalaryComponentDto = CreateSalaryComponentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'كود المكون (مثال: BASIC, HRA)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateSalaryComponentDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الاسم بالعربية' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateSalaryComponentDto.prototype, "nameAr", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الاسم بالإنجليزية', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateSalaryComponentDto.prototype, "nameEn", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'النوع (استحقاق أو استقطاع)', enum: SalaryComponentType }),
    (0, class_validator_1.IsEnum)(SalaryComponentType),
    __metadata("design:type", String)
], CreateSalaryComponentDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'طبيعة المكون', enum: SalaryComponentNature, default: SalaryComponentNature.FIXED }),
    (0, class_validator_1.IsEnum)(SalaryComponentNature),
    __metadata("design:type", String)
], CreateSalaryComponentDto.prototype, "nature", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الوصف', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateSalaryComponentDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'خاضع للتأمينات؟', default: false }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateSalaryComponentDto.prototype, "gosiEligible", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'خاضع للعمل الإضافي؟', default: false }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateSalaryComponentDto.prototype, "otEligible", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'خاضع لنهاية الخدمة؟', default: false }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateSalaryComponentDto.prototype, "eosEligible", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'هل يتأثر بالغياب؟ (Pro-rata)', default: true }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateSalaryComponentDto.prototype, "isProrated", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'المعادلة (اختياري)', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateSalaryComponentDto.prototype, "formula", void 0);
//# sourceMappingURL=create-salary-component.dto.js.map