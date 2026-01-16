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
exports.UpdateTaskTemplateDto = exports.CreateTaskTemplateDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class CreateTaskTemplateDto {
}
exports.CreateTaskTemplateDto = CreateTaskTemplateDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'اسم القالب بالعربية', example: 'قالب مهام التوظيف' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTaskTemplateDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'اسم القالب بالإنجليزية' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTaskTemplateDto.prototype, "nameEn", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'وصف القالب' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTaskTemplateDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'معرف الفئة' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTaskTemplateDto.prototype, "categoryId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.TaskPriority, description: 'الأولوية الافتراضية' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.TaskPriority),
    __metadata("design:type", String)
], CreateTaskTemplateDto.prototype, "defaultPriority", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'عدد الأيام الافتراضية للاستحقاق' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateTaskTemplateDto.prototype, "defaultDueDays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'نوع سير العمل', example: 'ONBOARDING' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTaskTemplateDto.prototype, "workflowType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'قائمة المهام الفرعية (Checklist Template)',
        example: [{ title: 'إعداد الحاسب', items: ['تثبيت البرامج', 'إعداد البريد'] }]
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], CreateTaskTemplateDto.prototype, "checklistTemplate", void 0);
class UpdateTaskTemplateDto {
}
exports.UpdateTaskTemplateDto = UpdateTaskTemplateDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTaskTemplateDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTaskTemplateDto.prototype, "nameEn", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTaskTemplateDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTaskTemplateDto.prototype, "categoryId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.TaskPriority }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.TaskPriority),
    __metadata("design:type", String)
], UpdateTaskTemplateDto.prototype, "defaultPriority", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], UpdateTaskTemplateDto.prototype, "defaultDueDays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTaskTemplateDto.prototype, "workflowType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], UpdateTaskTemplateDto.prototype, "checklistTemplate", void 0);
//# sourceMappingURL=task-template.dto.js.map