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
exports.CreateCompanyDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateCompanyDto {
}
exports.CreateCompanyDto = CreateCompanyDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'اسم الشركة' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'English Name', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "nameEn", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'رقم السجل التجاري', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "crNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الرقم الضريبي', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "taxId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Logo URL', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "logo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'العنوان', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'رقم الهاتف', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'البريد الإلكتروني', required: false }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الموقع الإلكتروني', required: false }),
    (0, class_validator_1.IsUrl)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "website", void 0);
//# sourceMappingURL=create-company.dto.js.map