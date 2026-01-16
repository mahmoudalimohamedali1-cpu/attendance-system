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
exports.HrDecisionDto = exports.ManagerDecisionDto = exports.CreateAdvanceRequestDto = exports.AdvanceType = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
var AdvanceType;
(function (AdvanceType) {
    AdvanceType["BANK_TRANSFER"] = "BANK_TRANSFER";
    AdvanceType["CASH"] = "CASH";
})(AdvanceType || (exports.AdvanceType = AdvanceType = {}));
class CreateAdvanceRequestDto {
}
exports.CreateAdvanceRequestDto = CreateAdvanceRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: AdvanceType, description: 'نوع السلفة' }),
    (0, class_validator_1.IsEnum)(AdvanceType),
    __metadata("design:type", String)
], CreateAdvanceRequestDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'المبلغ المطلوب' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateAdvanceRequestDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'تاريخ بداية السداد' }),
    (0, class_transformer_1.Type)(() => Date),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], CreateAdvanceRequestDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'تاريخ نهاية السداد' }),
    (0, class_transformer_1.Type)(() => Date),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], CreateAdvanceRequestDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الفترة بالشهور' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateAdvanceRequestDto.prototype, "periodMonths", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الاستقطاع الشهري المقترح' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateAdvanceRequestDto.prototype, "monthlyDeduction", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ملاحظات', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAdvanceRequestDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'مرفقات', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], CreateAdvanceRequestDto.prototype, "attachments", void 0);
class ManagerDecisionDto {
}
exports.ManagerDecisionDto = ManagerDecisionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'القرار: APPROVED أو REJECTED' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ManagerDecisionDto.prototype, "decision", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ملاحظات', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ManagerDecisionDto.prototype, "notes", void 0);
class HrDecisionDto {
}
exports.HrDecisionDto = HrDecisionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'القرار: APPROVED أو REJECTED' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], HrDecisionDto.prototype, "decision", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'المبلغ المعتمد (قد يختلف عن المطلوب)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], HrDecisionDto.prototype, "approvedAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الاستقطاع الشهري المعتمد', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], HrDecisionDto.prototype, "approvedMonthlyDeduction", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ملاحظات', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], HrDecisionDto.prototype, "notes", void 0);
//# sourceMappingURL=advance-request.dto.js.map