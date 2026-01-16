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
exports.CreateDepartmentDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateDepartmentDto {
}
exports.CreateDepartmentDto = CreateDepartmentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'اسم القسم', example: 'قسم تقنية المعلومات' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDepartmentDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'اسم القسم بالإنجليزية', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDepartmentDto.prototype, "nameEn", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف الفرع' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateDepartmentDto.prototype, "branchId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'وقت بداية الدوام للقسم (اختياري)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'صيغة الوقت غير صحيحة (HH:MM)' }),
    __metadata("design:type", String)
], CreateDepartmentDto.prototype, "workStartTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'وقت نهاية الدوام للقسم (اختياري)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'صيغة الوقت غير صحيحة (HH:MM)' }),
    __metadata("design:type", String)
], CreateDepartmentDto.prototype, "workEndTime", void 0);
//# sourceMappingURL=create-department.dto.js.map