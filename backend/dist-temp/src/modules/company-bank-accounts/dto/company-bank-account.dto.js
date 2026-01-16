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
exports.UpdateCompanyBankAccountDto = exports.CreateCompanyBankAccountDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateCompanyBankAccountDto {
}
exports.CreateCompanyBankAccountDto = CreateCompanyBankAccountDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'اسم البنك', example: 'البنك الأهلي السعودي' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyBankAccountDto.prototype, "bankName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'رمز البنك', example: 'NCB' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(2, 10),
    __metadata("design:type", String)
], CreateCompanyBankAccountDto.prototype, "bankCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'رقم الآيبان', example: 'SA0380000000608010167519' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(24, 24, { message: 'IBAN يجب أن يكون 24 حرف' }),
    (0, class_validator_1.Matches)(/^SA[0-9A-Z]{22}$/, { message: 'صيغة IBAN غير صحيحة' }),
    __metadata("design:type", String)
], CreateCompanyBankAccountDto.prototype, "iban", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'اسم صاحب الحساب', example: 'شركة التقنية المحدودة' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyBankAccountDto.prototype, "accountName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'رمز السويفت', example: 'NCBKSAJE' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyBankAccountDto.prototype, "swiftCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'هل هو الحساب الرئيسي؟', default: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateCompanyBankAccountDto.prototype, "isPrimary", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'رقم المنشأة في وزارة العمل' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyBankAccountDto.prototype, "molId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'رقم المشارك في WPS' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyBankAccountDto.prototype, "wpsParticipant", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'نوع الحساب', default: 'CURRENT' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyBankAccountDto.prototype, "accountType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'العملة', default: 'SAR' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyBankAccountDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ملاحظات' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyBankAccountDto.prototype, "notes", void 0);
class UpdateCompanyBankAccountDto {
}
exports.UpdateCompanyBankAccountDto = UpdateCompanyBankAccountDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCompanyBankAccountDto.prototype, "bankName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCompanyBankAccountDto.prototype, "bankCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCompanyBankAccountDto.prototype, "accountName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCompanyBankAccountDto.prototype, "swiftCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateCompanyBankAccountDto.prototype, "isPrimary", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateCompanyBankAccountDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCompanyBankAccountDto.prototype, "molId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCompanyBankAccountDto.prototype, "wpsParticipant", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCompanyBankAccountDto.prototype, "notes", void 0);
//# sourceMappingURL=company-bank-account.dto.js.map