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
exports.CreateBankAccountDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateBankAccountDto {
}
exports.CreateBankAccountDto = CreateBankAccountDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف الموظف' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateBankAccountDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'رقم الـ IBAN (مثال: SA...)', example: 'SA1234567890123456789012' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateBankAccountDto.prototype, "iban", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'اسم صاحب الحساب (كما هو في البنك - مطلوب لـ WPS)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateBankAccountDto.prototype, "accountHolderName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'اسم البنك' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateBankAccountDto.prototype, "bankName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'كود البنك (مثل SABB, RJHI)', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateBankAccountDto.prototype, "bankCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'رمز SWIFT للتحويلات الدولية', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateBankAccountDto.prototype, "swiftCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'هل هو الحساب الرئيسي؟', default: true }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateBankAccountDto.prototype, "isPrimary", void 0);
//# sourceMappingURL=create-bank-account.dto.js.map