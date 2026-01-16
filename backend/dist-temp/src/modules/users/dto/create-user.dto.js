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
exports.CreateUserDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var Role;
(function (Role) {
    Role["ADMIN"] = "ADMIN";
    Role["MANAGER"] = "MANAGER";
    Role["EMPLOYEE"] = "EMPLOYEE";
})(Role || (Role = {}));
var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "ACTIVE";
    UserStatus["INACTIVE"] = "INACTIVE";
    UserStatus["SUSPENDED"] = "SUSPENDED";
})(UserStatus || (UserStatus = {}));
var Gender;
(function (Gender) {
    Gender["MALE"] = "MALE";
    Gender["FEMALE"] = "FEMALE";
})(Gender || (Gender = {}));
var MaritalStatus;
(function (MaritalStatus) {
    MaritalStatus["SINGLE"] = "SINGLE";
    MaritalStatus["MARRIED"] = "MARRIED";
    MaritalStatus["DIVORCED"] = "DIVORCED";
    MaritalStatus["WIDOWED"] = "WIDOWED";
})(MaritalStatus || (MaritalStatus = {}));
class CreateUserDto {
}
exports.CreateUserDto = CreateUserDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'البريد الإلكتروني' }),
    (0, class_validator_1.IsEmail)({}, { message: 'البريد الإلكتروني غير صالح' }),
    __metadata("design:type", String)
], CreateUserDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'كلمة المرور', minLength: 6 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }),
    __metadata("design:type", String)
], CreateUserDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الاسم الأول' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الاسم الأخير' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'كود الموظف', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "employeeCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'رقم الهاتف', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'رقم الهوية الوطنية (للسعوديين) أو رقم الإقامة (للأجانب)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "nationalId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'رقم الإقامة (للأجانب)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "iqamaNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'تاريخ انتهاء الإقامة', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "iqamaExpiryDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'رقم الجواز', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "passportNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'تاريخ انتهاء الجواز', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "passportExpiryDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'رقم الحدود (للأجانب)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "borderNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'رقم التأمينات الاجتماعية (GOSI)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "gosiNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'تاريخ الميلاد', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "dateOfBirth", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الجنس', enum: Gender, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(Gender),
    __metadata("design:type", String)
], CreateUserDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الحالة الاجتماعية', enum: MaritalStatus, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(MaritalStatus),
    __metadata("design:type", String)
], CreateUserDto.prototype, "maritalStatus", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الجنسية', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "nationality", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'هل الموظف سعودي؟', default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateUserDto.prototype, "isSaudi", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'المسمى الوظيفي', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "jobTitle", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'كود المهنة في قوى', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "professionCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'اسم المهنة', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "profession", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الدور', enum: Role, default: Role.EMPLOYEE }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(Role),
    __metadata("design:type", String)
], CreateUserDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الحالة', enum: UserStatus, default: UserStatus.ACTIVE }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(UserStatus),
    __metadata("design:type", String)
], CreateUserDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الراتب', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateUserDto.prototype, "salary", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'تاريخ التوظيف', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "hireDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف الفرع', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "branchId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف القسم', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "departmentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف المدير المباشر', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "managerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف الدرجة الوظيفية', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "jobTitleId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'عدد أيام الإجازة السنوية', default: 21 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateUserDto.prototype, "annualLeaveDays", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف مركز التكلفة', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "costCenterId", void 0);
//# sourceMappingURL=create-user.dto.js.map