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
exports.UserQueryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
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
class UserQueryDto {
    constructor() {
        this.page = 1;
        this.limit = 20;
    }
}
exports.UserQueryDto = UserQueryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'البحث (اسم، بريد، رقم الموظف)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UserQueryDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الدور', enum: Role, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(Role),
    __metadata("design:type", String)
], UserQueryDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الحالة', enum: UserStatus, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(UserStatus),
    __metadata("design:type", String)
], UserQueryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف الفرع', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UserQueryDto.prototype, "branchId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف القسم', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UserQueryDto.prototype, "departmentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'رقم الصفحة', default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], UserQueryDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'عدد العناصر في الصفحة', default: 20 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], UserQueryDto.prototype, "limit", void 0);
//# sourceMappingURL=user-query.dto.js.map