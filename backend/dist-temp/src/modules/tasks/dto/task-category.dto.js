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
exports.UpdateTaskCategoryDto = exports.CreateTaskCategoryDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateTaskCategoryDto {
}
exports.CreateTaskCategoryDto = CreateTaskCategoryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'اسم الفئة بالعربية', example: 'مهام الموارد البشرية' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTaskCategoryDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'اسم الفئة بالإنجليزية' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTaskCategoryDto.prototype, "nameEn", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'لون الفئة (Hex)', example: '#3B82F6' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTaskCategoryDto.prototype, "color", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'أيقونة الفئة', example: 'folder' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTaskCategoryDto.prototype, "icon", void 0);
class UpdateTaskCategoryDto {
}
exports.UpdateTaskCategoryDto = UpdateTaskCategoryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTaskCategoryDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTaskCategoryDto.prototype, "nameEn", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTaskCategoryDto.prototype, "color", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTaskCategoryDto.prototype, "icon", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTaskCategoryDto.prototype, "isActive", void 0);
//# sourceMappingURL=task-category.dto.js.map