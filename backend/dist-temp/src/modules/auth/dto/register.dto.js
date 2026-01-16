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
exports.RegisterDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var Role;
(function (Role) {
    Role["ADMIN"] = "ADMIN";
    Role["MANAGER"] = "MANAGER";
    Role["EMPLOYEE"] = "EMPLOYEE";
})(Role || (Role = {}));
class RegisterDto {
}
exports.RegisterDto = RegisterDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'البريد الإلكتروني', example: 'user@company.com' }),
    (0, class_validator_1.IsEmail)({}, { message: 'البريد الإلكتروني غير صالح' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'كلمة المرور', example: 'password123', minLength: 6 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الاسم الأول', example: 'أحمد' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الاسم الأخير', example: 'محمد' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'رقم الهاتف', example: '+966501234567', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'المسمى الوظيفي', example: 'مطور برمجيات', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "jobTitle", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الدور', enum: Role, default: Role.EMPLOYEE }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(Role),
    __metadata("design:type", String)
], RegisterDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف الفرع', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "branchId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف القسم', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "departmentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف المدير المباشر', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "managerId", void 0);
//# sourceMappingURL=register.dto.js.map