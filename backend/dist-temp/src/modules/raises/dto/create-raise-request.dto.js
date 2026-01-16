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
exports.CreateRaiseRequestDto = exports.RaiseTypeDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var RaiseTypeDto;
(function (RaiseTypeDto) {
    RaiseTypeDto["SALARY_INCREASE"] = "SALARY_INCREASE";
    RaiseTypeDto["ANNUAL_LEAVE_BONUS"] = "ANNUAL_LEAVE_BONUS";
    RaiseTypeDto["BUSINESS_TRIP"] = "BUSINESS_TRIP";
    RaiseTypeDto["BONUS"] = "BONUS";
    RaiseTypeDto["ALLOWANCE"] = "ALLOWANCE";
    RaiseTypeDto["OTHER"] = "OTHER";
})(RaiseTypeDto || (exports.RaiseTypeDto = RaiseTypeDto = {}));
class CreateRaiseRequestDto {
}
exports.CreateRaiseRequestDto = CreateRaiseRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'نوع الطلب',
        enum: RaiseTypeDto,
        example: RaiseTypeDto.SALARY_INCREASE
    }),
    (0, class_validator_1.IsNotEmpty)({ message: 'نوع الطلب مطلوب' }),
    (0, class_validator_1.IsEnum)(RaiseTypeDto, { message: 'نوع الطلب غير صالح' }),
    __metadata("design:type", String)
], CreateRaiseRequestDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'المبلغ المطلوب',
        example: 500
    }),
    (0, class_validator_1.IsNotEmpty)({ message: 'المبلغ مطلوب' }),
    (0, class_validator_1.IsNumber)({}, { message: 'المبلغ يجب أن يكون رقماً' }),
    (0, class_validator_1.Min)(0, { message: 'المبلغ يجب أن يكون موجباً' }),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateRaiseRequestDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'الشهر المطلوب للزيادة',
        example: '2025-01-01'
    }),
    (0, class_validator_1.IsNotEmpty)({ message: 'الشهر المطلوب مطلوب' }),
    (0, class_validator_1.IsDateString)({}, { message: 'تاريخ الشهر غير صالح' }),
    __metadata("design:type", String)
], CreateRaiseRequestDto.prototype, "effectiveMonth", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'ملاحظات إضافية',
        maxLength: 200
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'الملاحظات يجب أن تكون نصاً' }),
    (0, class_validator_1.MaxLength)(200, { message: 'الملاحظات يجب ألا تتجاوز 200 حرف' }),
    __metadata("design:type", String)
], CreateRaiseRequestDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'المرفقات',
        type: 'array',
        items: { type: 'object' }
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], CreateRaiseRequestDto.prototype, "attachments", void 0);
//# sourceMappingURL=create-raise-request.dto.js.map