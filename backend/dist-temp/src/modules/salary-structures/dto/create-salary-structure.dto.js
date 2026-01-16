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
exports.CreateSalaryStructureDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class SalaryStructureLineDto {
}
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف المكون' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SalaryStructureLineDto.prototype, "componentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'المبلغ', default: 0 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], SalaryStructureLineDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'النسبة (إن وجدت)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], SalaryStructureLineDto.prototype, "percentage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الأولوية', default: 0 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], SalaryStructureLineDto.prototype, "priority", void 0);
class CreateSalaryStructureDto {
}
exports.CreateSalaryStructureDto = CreateSalaryStructureDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'اسم الهيكل' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSalaryStructureDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الوصف', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateSalaryStructureDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'نشط؟', default: true }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateSalaryStructureDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'مكونات الهيكل', type: [SalaryStructureLineDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => SalaryStructureLineDto),
    __metadata("design:type", Array)
], CreateSalaryStructureDto.prototype, "lines", void 0);
//# sourceMappingURL=create-salary-structure.dto.js.map