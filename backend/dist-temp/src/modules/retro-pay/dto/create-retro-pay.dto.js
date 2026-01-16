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
exports.CreateRetroPayDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateRetroPayDto {
}
exports.CreateRetroPayDto = CreateRetroPayDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف الموظف' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRetroPayDto.prototype, "employeeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'سبب الفرق (زيادة راتب، تصحيح خطأ، إلخ)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRetroPayDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'تاريخ بداية الفرق' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateRetroPayDto.prototype, "effectiveFrom", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'تاريخ نهاية الفرق' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateRetroPayDto.prototype, "effectiveTo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'المبلغ القديم (الراتب السابق)' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateRetroPayDto.prototype, "oldAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'المبلغ الجديد (الراتب المحدث)' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateRetroPayDto.prototype, "newAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ملاحظات' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateRetroPayDto.prototype, "notes", void 0);
//# sourceMappingURL=create-retro-pay.dto.js.map