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
exports.CreateTaskDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const class_transformer_1 = require("class-transformer");
class CreateTaskDto {
}
exports.CreateTaskDto = CreateTaskDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'عنوان المهمة', example: 'مراجعة طلب الإجازة' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'وصف المهمة' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.TaskPriority, default: 'MEDIUM' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.TaskPriority),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "priority", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.TaskStatus, default: 'TODO' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.TaskStatus),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'معرف الفئة' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value === '' ? undefined : value),
    (0, class_validator_1.ValidateIf)((obj) => obj.categoryId !== undefined && obj.categoryId !== null && obj.categoryId !== ''),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "categoryId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'معرف القالب' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value === '' ? undefined : value),
    (0, class_validator_1.ValidateIf)((obj) => obj.templateId !== undefined && obj.templateId !== null && obj.templateId !== ''),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "templateId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'تاريخ الاستحقاق' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "dueDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'تاريخ البداية' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'المكلف بالمهمة' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value === '' ? undefined : value),
    (0, class_validator_1.ValidateIf)((obj) => obj.assigneeId !== undefined && obj.assigneeId !== null && obj.assigneeId !== ''),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "assigneeId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'العلامات', type: [String] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateTaskDto.prototype, "tags", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'حقول مخصصة (JSON)' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateTaskDto.prototype, "customFields", void 0);
//# sourceMappingURL=create-task.dto.js.map